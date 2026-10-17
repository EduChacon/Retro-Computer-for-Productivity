/*
 * Reabrir ao ligar, como no Windows e no Mac de hoje: as janelas abertas (o programa, o que ele
 * mostrava e o lugar na tela) ficam guardadas nas configurações e voltam na abertura seguinte.
 * Cada programa diz o que reabrir por j.reabrir() (a pasta, o arquivo, o endereço; null = não
 * reabrir); sem isso, ele abre como no Iniciar. Os que começam algo ao abrir (o Prompt, o Claude,
 * o DOS e o Mac Plus) e as caixas de diálogo ficam de fora. Painel › Aparência › Configurações
 * desliga.
 */
import { lista, eventos as evJanelas, numAreas, garantirAreas, moverParaArea } from './janelas.js';
import { estado, definirConfig, abrir, app } from './sistema.js';

const FORA = new Set(['prompt', 'claude', 'dos', 'mac', 'ocr', 'desligar', 'executar']);
const MAX = 12;

// Até as janelas da última vez voltarem, nada é gravado por cima delas.
let congelado = true;
let ultimo = '';
let timer = null;

const ligado = () => !estado.config.semReabrir && (!estado.config.reabrir || estado.config.reabrir.ligado !== false);

/** As janelas que voltariam agora, na ordem de baixo para cima (a da frente por último). */
export function retrato() {
  const r = [];
  for (const j of lista) {
    if (j.fechada || j.dialogo || !j.programa || FORA.has(j.programa)) continue;
    if (!j.programa.startsWith('craft:') && !j.programa.startsWith('webapp:') && !app(j.programa)) continue;
    let args = {};
    try { args = j.reabrir ? j.reabrir() : {}; } catch { args = null; }
    if (args === null) continue;
    const { x, y, w, h } = j.ret;
    r.push({ p: j.programa, args, ret: { x, y, w, h }, max: !!j.maximizada, min: !!j.minimizada, area: j.area || 0 });
  }
  // A ordem da pilha: a janela da frente é a última aberta de novo.
  return r.slice(-MAX);
}

function guardar() {
  clearTimeout(timer);
  timer = null;
  if (congelado || !ligado()) return Promise.resolve();
  const janelas = retrato();
  // As áreas de trabalho também voltam, como no Windows (também as que estão vazias).
  const areas = numAreas();
  const texto = JSON.stringify([janelas, areas]);
  if (texto === ultimo) return Promise.resolve();
  ultimo = texto;
  return definirConfig({ reabrir: { janelas, areas } }).catch(() => { });
}

const agendar = () => { clearTimeout(timer); timer = setTimeout(guardar, 1500); };

/**
 * Antes de desligar, reiniciar ou fazer logoff: guarda as janelas como estão (o fechar de cada uma,
 * que vem depois, não conta). Se a saída for cancelada, desistirDeSair() volta ao normal.
 */
export function prepararParaSair() {
  congelado = false;
  const p = guardar();
  congelado = true;
  return p;
}

export function desistirDeSair() {
  congelado = false;
  agendar();
}

/**
 * Acompanha as janelas (cada uma que abre ou fecha e, de tempos em tempos, o lugar delas) e, com
 * reabrir, abre de novo as da última vez.
 */
export function iniciarReabrir({ reabrir = true } = {}) {
  evJanelas.on('mudou', agendar);
  setInterval(guardar, 30000);
  // Fechar o Retro Computer por fora (o X da janela do computador principal) guarda o que está aberto.
  window.addEventListener('beforeunload', () => { if (!congelado) guardar(); });
  if (reabrir) return reabrirJanelas().catch(() => 0);
  congelado = false;
  return Promise.resolve(0);
}

/** Abre de novo as janelas guardadas (na abertura). */
async function reabrirJanelas() {
  const salvas = (estado.config.reabrir && estado.config.reabrir.janelas) || [];
  if (!ligado() || !Array.isArray(salvas) || !salvas.length) { congelado = false; return 0; }
  congelado = true;
  let n = 0;
  garantirAreas(Number(estado.config.reabrir.areas) || 1);
  try {
    for (const s of salvas.slice(0, MAX)) {
      if (!s || typeof s.p !== 'string' || FORA.has(s.p)) continue;
      const antes = new Set(lista);
      try {
        await abrir(s.p, s.args && typeof s.args === 'object' ? s.args : {});
      } catch { continue; }
      await new Promise((r) => setTimeout(r, 120));
      const j = lista.find((x) => !antes.has(x) && !x.fechada && !x.dialogo && x.programa === s.p);
      if (!j) continue;
      n++;
      lugar(j, s);
    }
  } finally {
    congelado = false;
    agendar();
  }
  return n;
}

/** O lugar e o tamanho de antes, sem sair da área de trabalho (a tela pode ter mudado). */
function lugar(j, s) {
  const t = document.getElementById('janelas').getBoundingClientRect();
  const r = s.ret || {};
  if (j.redim && Number(r.w) > 0 && Number(r.h) > 0) {
    j.ret.w = Math.max(j.minL || 160, Math.min(Math.round(r.w), Math.floor(t.width)));
    j.ret.h = Math.max(j.minA || 80, Math.min(Math.round(r.h), Math.floor(t.height)));
  }
  if (Number.isFinite(r.x) && Number.isFinite(r.y)) {
    j.ret.x = Math.max(0, Math.min(Math.round(r.x), Math.floor(t.width - Math.min(j.ret.w, 120))));
    j.ret.y = Math.max(0, Math.min(Math.round(r.y), Math.floor(t.height - 24)));
  }
  j.aplicarRet();
  if (s.max && j.redim && !j.maximizada) j.maximizar();
  if (s.min && !j.minimizada) j.minimizar();
  // A janela volta para a área de trabalho em que estava (a tela começa na primeira).
  if (Number.isInteger(s.area) && s.area > 0 && s.area < numAreas()) moverParaArea(j, s.area);
}
