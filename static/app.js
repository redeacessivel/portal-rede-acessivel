(() => {
  "use strict";

  const body = document.body;
  const root = document.documentElement;
  const status = document.getElementById("preferencesStatus");
  const speechStatus = document.getElementById("speechStatus");
  const menuButton = document.getElementById("menuButton");
  const mainNav = document.getElementById("mainNav");
  const voiceSelect = document.getElementById("voiceSelect");
  const rateSelect = document.getElementById("rateSelect");

  let scale = Number(localStorage.getItem("ra-scale")) || 1;
  let contrast = localStorage.getItem("ra-contrast") === "true";
  let voices = [];
  let currentUtterance = null;

  function announce(message) {
    if (speechStatus) speechStatus.textContent = message;
  }

  function apply(message = "") {
    root.style.setProperty("--font-scale", scale.toFixed(2));
    body.classList.toggle("high-contrast", contrast);
    document.getElementById("toggleContrast")?.setAttribute("aria-pressed", String(contrast));
    localStorage.setItem("ra-scale", String(scale));
    localStorage.setItem("ra-contrast", String(contrast));
    if (status) status.textContent = message;
  }
  apply();

  document.getElementById("increaseText")?.addEventListener("click", () => {
    scale = Math.min(1.6, scale + 0.1);
    apply(`Texto aumentado para ${Math.round(scale * 100)} por cento.`);
  });

  document.getElementById("decreaseText")?.addEventListener("click", () => {
    scale = Math.max(0.9, scale - 0.1);
    apply(`Texto ajustado para ${Math.round(scale * 100)} por cento.`);
  });

  document.getElementById("toggleContrast")?.addEventListener("click", () => {
    contrast = !contrast;
    apply(contrast ? "Alto contraste ativado." : "Alto contraste desativado.");
  });

  menuButton?.addEventListener("click", () => {
    const open = mainNav.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.textContent = open ? "Fechar menu" : "Abrir menu";
  });

  function voiceRank(v) {
    const name = `${v.name} ${v.voiceURI}`.toLowerCase();
    const lang = (v.lang || "").toLowerCase();
    let score = 0;
    if (name.includes("raquel")) score += 1000;
    if (name.includes("antónio") || name.includes("antonio")) score += 900;
    if (lang === "pt-pt") score += 500;
    if (lang.startsWith("pt")) score += 200;
    if (v.localService) score += 20;
    if (v.default) score += 10;
    return score;
  }

  function loadVoices() {
    if (!("speechSynthesis" in window)) {
      announce("Este navegador não suporta leitura em voz alta.");
      document.querySelectorAll("[data-speech-control]").forEach(el => el.disabled = true);
      return;
    }
    voices = speechSynthesis.getVoices().slice().sort((a, b) => voiceRank(b) - voiceRank(a));
    if (!voiceSelect || voices.length === 0) return;

    const saved = localStorage.getItem("ra-voice");
    voiceSelect.innerHTML = "";
    voices.filter(v => (v.lang || "").toLowerCase().startsWith("pt")).forEach((voice) => {
      const option = document.createElement("option");
      option.value = voice.voiceURI;
      option.textContent = `${voice.name} — ${voice.lang}${voice.localService ? " — sistema" : ""}`;
      voiceSelect.appendChild(option);
    });

    if (!voiceSelect.options.length) {
      voices.forEach((voice) => {
        const option = document.createElement("option");
        option.value = voice.voiceURI;
        option.textContent = `${voice.name} — ${voice.lang}`;
        voiceSelect.appendChild(option);
      });
    }

    const preferred = voices.find(v => saved && v.voiceURI === saved)
      || voices.find(v => v.name.toLowerCase().includes("raquel"))
      || voices.find(v => /ant[oó]nio/i.test(v.name))
      || voices.find(v => (v.lang || "").toLowerCase() === "pt-pt")
      || voices.find(v => (v.lang || "").toLowerCase().startsWith("pt"));
    if (preferred) voiceSelect.value = preferred.voiceURI;
  }

  function selectedVoice() {
    return voices.find(v => v.voiceURI === voiceSelect?.value)
      || voices.find(v => v.name.toLowerCase().includes("raquel"))
      || voices.find(v => /ant[oó]nio/i.test(v.name))
      || voices.find(v => (v.lang || "").toLowerCase() === "pt-pt")
      || voices.find(v => (v.lang || "").toLowerCase().startsWith("pt"))
      || null;
  }

  function cleanText(element) {
    if (!element) return "";
    const clone = element.cloneNode(true);
    clone.querySelectorAll("button, select, label, script, style, nav, .speech-controls, .no-speech").forEach(el => el.remove());
    return clone.innerText.replace(/\s+/g, " ").trim();
  }

  function speakElement(element, label = "conteúdo") {
    if (!("speechSynthesis" in window)) {
      announce("Este navegador não suporta leitura em voz alta.");
      return;
    }
    const text = cleanText(element);
    if (!text) {
      announce("Não encontrei texto para ler.");
      return;
    }
    speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "pt-PT";
    speech.voice = selectedVoice();
    speech.rate = Number(rateSelect?.value || localStorage.getItem("ra-rate") || 1);
    speech.pitch = 1;
    speech.volume = 1;
    speech.onstart = () => announce(`Leitura de ${label} iniciada com ${speech.voice?.name || "a voz disponível"}.`);
    speech.onpause = () => announce("Leitura em pausa.");
    speech.onresume = () => announce("Leitura retomada.");
    speech.onend = () => { currentUtterance = null; announce("Leitura terminada."); };
    speech.onerror = (event) => {
      currentUtterance = null;
      if (event.error !== "canceled" && event.error !== "interrupted") announce("A leitura falhou neste navegador.");
    };
    currentUtterance = speech;
    speechSynthesis.speak(speech);
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-speak-target]");
    if (!button) return;
    const selector = button.getAttribute("data-speak-target");
    speakElement(document.querySelector(selector), button.getAttribute("data-speak-label") || "conteúdo");
  });

  document.getElementById("pauseListenButton")?.addEventListener("click", () => {
    if (speechSynthesis.speaking && !speechSynthesis.paused) speechSynthesis.pause();
    else if (speechSynthesis.paused) speechSynthesis.resume();
    else announce("Não existe leitura em curso.");
  });

  document.getElementById("stopListenButton")?.addEventListener("click", () => {
    speechSynthesis?.cancel();
    currentUtterance = null;
    announce("Leitura parada.");
  });

  voiceSelect?.addEventListener("change", () => {
    localStorage.setItem("ra-voice", voiceSelect.value);
    const voice = selectedVoice();
    announce(`Voz escolhida: ${voice?.name || "voz do sistema"}.`);
  });

  rateSelect?.addEventListener("change", () => {
    localStorage.setItem("ra-rate", rateSelect.value);
    announce(`Velocidade escolhida: ${rateSelect.options[rateSelect.selectedIndex].text}.`);
  });

  if (rateSelect) rateSelect.value = localStorage.getItem("ra-rate") || "1";
  loadVoices();
  if ("speechSynthesis" in window) speechSynthesis.onvoiceschanged = loadVoices;
  window.addEventListener("beforeunload", () => speechSynthesis?.cancel());
})();
