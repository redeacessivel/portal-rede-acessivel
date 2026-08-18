(function () {
  const list = document.getElementById('listaNoticias');
  const status = document.getElementById('estadoNoticias');
  if (!list || !status) return;

  const escapeHtml = value => String(value || '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
  const formatDate = value => {
    const date = new Date(`${value}T12:00:00Z`);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-PT', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
    }).format(date);
  };

  fetch('dados/noticias.json', { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error('Falha ao obter notícias.');
      return response.json();
    })
    .then(news => {
      const recent = news.filter(item => item.title && item.url && item.date && item.source)
        .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
      if (!recent.length) throw new Error('Sem notícias.');
      list.innerHTML = recent.map(item => `
        <article class="result-card">
          <p class="eyebrow">${escapeHtml(item.source)}</p>
          <h3><a href="${escapeHtml(item.url)}" rel="noopener">${escapeHtml(item.title)}</a></h3>
          <p>${escapeHtml(item.summary)}</p>
          <p><strong>Publicada em:</strong> <time datetime="${escapeHtml(item.date)}">${escapeHtml(formatDate(item.date))}</time></p>
        </article>`).join('');
      status.textContent = `${recent.length} notícias apresentadas, da mais recente para a mais antiga.`;
    })
    .catch(() => {
      status.textContent = 'Não foi possível carregar as notícias neste momento.';
      list.innerHTML = '<p><a href="https://idipd.mtsss.gov.pt/noticias" rel="noopener">Consultar notícias na fonte oficial</a></p>';
    });
}());
