const voiceSelect = document.getElementById('voiceSelect');
const rate = document.getElementById('speechRate');
const status = document.getElementById('readerStatus');
const normalizeVoice = value => (value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function portugueseVoices() {
  return speechSynthesis.getVoices().filter(voice => voice.lang && voice.lang.toLowerCase().startsWith('pt')).sort((a, b) => {
    const aFrancisca = normalizeVoice(a.name).includes('francisca') ? 0 : 1;
    const bFrancisca = normalizeVoice(b.name).includes('francisca') ? 0 : 1;
    return aFrancisca - bFrancisca || a.name.localeCompare(b.name, 'pt');
  });
}

function loadVoices() {
  const voices = portugueseVoices();
  voiceSelect.innerHTML = voices.map((voice, index) => `<option value="${index}">${voice.name} — ${voice.lang}${normalizeVoice(voice.name).includes('francisca') ? ' — preferida' : ''}</option>`).join('');
  if (!voices.length) voiceSelect.innerHTML = '<option value="">Voz portuguesa do sistema</option>';
  voiceSelect.dataset.voices = voices.length;
}

speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

document.querySelectorAll('[data-read-story]').forEach(button => button.addEventListener('click', () => {
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(document.getElementById(button.dataset.readStory).innerText);
  const voices = portugueseVoices();
  if (voices.length) utterance.voice = voices[Number(voiceSelect.value) || 0];
  utterance.lang = utterance.voice ? utterance.voice.lang : 'pt-PT';
  utterance.rate = Number(rate.value);
  utterance.onstart = () => { status.textContent = `Leitura iniciada${utterance.voice ? ` com a voz ${utterance.voice.name}` : ''}.`; };
  utterance.onend = () => { status.textContent = 'Leitura terminada.'; };
  speechSynthesis.speak(utterance);
}));

document.getElementById('pauseSpeech').onclick = () => { speechSynthesis.pause(); status.textContent = 'Leitura em pausa.'; };
document.getElementById('resumeSpeech').onclick = () => { speechSynthesis.resume(); status.textContent = 'Leitura retomada.'; };
document.getElementById('stopSpeech').onclick = () => { speechSynthesis.cancel(); status.textContent = 'Leitura parada.'; };
