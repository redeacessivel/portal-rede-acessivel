#!/usr/bin/env python3
"""Atualiza notícias usando exclusivamente fontes oficiais autorizadas."""

from __future__ import annotations

import json
import re
from datetime import date, datetime
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "dados" / "noticias.json"
HEADERS = {"User-Agent": "PortalRedeAcessivel/1.0 (+https://redeacessivel.github.io/portal-rede-acessivel/)"}
SOURCES = (
    {
        "name": "gov.pt",
        "listing": "https://www.gov.pt/noticias",
        "host": "www.gov.pt",
        "path": "/noticias/",
    },
    {
        "name": "IDiPD, I.P.",
        "listing": "https://idipd.mtsss.gov.pt/noticias",
        "host": "idipd.mtsss.gov.pt",
        "path": "/noticias/-/journal_content/",
    },
)
KEYWORDS = (
    "acessibilidade", "acessível", "deficiência", "incapacidade", "inclusão",
    "braille", "língua gestual", "mobilidade reduzida", "vida independente",
    "tecnologia de apoio", "direitos das pessoas com deficiência", "cuidador"
)
MAX_NEWS = 10
TIMEOUT = 25


def get_soup(url: str) -> BeautifulSoup:
    response = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
    response.raise_for_status()
    return BeautifulSoup(response.text, "html.parser")


def clean(value: str | None) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def meta(soup: BeautifulSoup, *names: str) -> str:
    for name in names:
        tag = soup.find("meta", attrs={"property": name}) or soup.find("meta", attrs={"name": name})
        if tag and tag.get("content"):
            return clean(tag["content"])
    return ""


def parse_date(soup: BeautifulSoup) -> str | None:
    candidates = [
        meta(soup, "article:published_time", "date", "datePublished", "DC.date"),
        *(tag.get("datetime", "") for tag in soup.find_all("time")),
    ]
    text = clean(soup.get_text(" "))
    candidates.extend(re.findall(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b", text)[:4])
    for value in candidates:
        value = clean(value)[:10]
        for pattern in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
            try:
                parsed = datetime.strptime(value, pattern).date()
                if parsed <= date.today():
                    return parsed.isoformat()
            except ValueError:
                pass
    return None


def relevant(title: str, summary: str) -> bool:
    haystack = f"{title} {summary}".casefold()
    return any(keyword.casefold() in haystack for keyword in KEYWORDS)


def valid_official_url(url: str, source: dict[str, str]) -> bool:
    parsed = urlparse(url)
    return parsed.scheme == "https" and parsed.hostname == source["host"] and source["path"] in parsed.path


def collect_links(source: dict[str, str]) -> list[str]:
    soup = get_soup(source["listing"])
    links: list[str] = []
    for anchor in soup.find_all("a", href=True):
        url = urljoin(source["listing"], anchor["href"]).split("#", 1)[0]
        if valid_official_url(url, source) and url not in links:
            links.append(url)
    return links[:30]


def read_article(url: str, source: dict[str, str]) -> dict[str, str] | None:
    soup = get_soup(url)
    title = meta(soup, "og:title", "twitter:title")
    if not title and soup.find("h1"):
        title = clean(soup.find("h1").get_text(" "))
    summary = meta(soup, "description", "og:description", "twitter:description")
    published = parse_date(soup)
    if not title or not summary or not published or not relevant(title, summary):
        return None
    return {
        "title": title,
        "summary": summary[:360].rstrip(),
        "source": source["name"],
        "date": published,
        "url": url,
    }


def existing_news() -> list[dict[str, str]]:
    try:
        data = json.loads(OUTPUT.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except (OSError, json.JSONDecodeError):
        return []


def main() -> None:
    news = {item.get("url"): item for item in existing_news() if item.get("url")}
    errors: list[str] = []
    for source in SOURCES:
        try:
            for url in collect_links(source):
                if url in news:
                    continue
                try:
                    article = read_article(url, source)
                    if article:
                        news[url] = article
                except requests.RequestException as error:
                    errors.append(f"{url}: {error}")
        except requests.RequestException as error:
            errors.append(f"{source['listing']}: {error}")

    ordered = sorted(news.values(), key=lambda item: item.get("date", ""), reverse=True)[:MAX_NEWS]
    OUTPUT.write_text(json.dumps(ordered, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Notícias guardadas: {len(ordered)}")
    if errors:
        print(f"Avisos de fontes indisponíveis: {len(errors)}")


if __name__ == "__main__":
    main()
