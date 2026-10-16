/*
 * Os sons do sistema, sintetizados na hora (nenhum arquivo de som de terceiros):
 * a abertura, o desligar, o erro, o aviso, a pergunta, a lixeira, o obturador da Captura de
 * tela, o fim do foco e os jogos.
 */
let ctx = null;
let ligado = true;
let volume = 0.5;

function contexto() {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function configurar(o) {
  if ('sons' in o) ligado = !!o.sons;
  if ('volume' in o) volume = Number(o.volume) || 0;
}

export function estado() {
  return { ligado, volume };
}

function nota(freq, inicio, dur, { tipo = 'triangle', vol = 0.25, ataque = 0.01, soltura = 0.25, destino } = {}) {
  const c = contexto();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = tipo;
  o.frequency.setValueAtTime(freq, inicio);
  g.gain.setValueAtTime(0, inicio);
  g.gain.linearRampToValueAtTime(vol, inicio + ataque);
  g.gain.setValueAtTime(vol, inicio + Math.max(ataque, dur - soltura));
  g.gain.exponentialRampToValueAtTime(0.0001, inicio + dur);
  o.connect(g).connect(destino || saida());
  o.start(inicio);
  o.stop(inicio + dur + 0.05);
}

function saida() {
  const c = contexto();
  const g = c.createGain();
  g.gain.value = volume;
  // Um eco curto dá corpo aos bipes.
  const atraso = c.createDelay();
  atraso.delayTime.value = 0.12;
  const retorno = c.createGain();
  retorno.gain.value = 0.22;
  g.connect(c.destination);
  g.connect(atraso);
  atraso.connect(retorno).connect(c.destination);
  return g;
}

const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);

const SONS = {
  inicio() {
    const c = contexto();
    const t = c.currentTime + 0.05;
    const s = saida();
    // Um arpejo que sobe e um acorde que fica.
    [60, 64, 67, 72, 76].forEach((n, i) => nota(hz(n), t + i * 0.11, 0.5, { tipo: 'square', vol: 0.06, destino: s }));
    [48, 60, 64, 67, 71].forEach((n) => nota(hz(n), t + 0.6, 2.2, { tipo: 'sine', vol: 0.09, ataque: 0.25, soltura: 1.6, destino: s }));
    nota(hz(79), t + 0.62, 1.4, { tipo: 'triangle', vol: 0.08, soltura: 1.1, destino: s });
  },
  desligar() {
    const c = contexto();
    const t = c.currentTime + 0.05;
    const s = saida();
    [76, 72, 67, 64, 60].forEach((n, i) => nota(hz(n), t + i * 0.13, 0.55, { tipo: 'triangle', vol: 0.1, destino: s }));
    [48, 55, 60].forEach((n) => nota(hz(n), t + 0.65, 1.6, { tipo: 'sine', vol: 0.08, ataque: 0.2, soltura: 1.2, destino: s }));
  },
  erro() {
    const t = contexto().currentTime + 0.01;
    const s = saida();
    nota(hz(57), t, 0.18, { tipo: 'square', vol: 0.08, soltura: 0.1, destino: s });
    nota(hz(52), t + 0.16, 0.3, { tipo: 'square', vol: 0.08, soltura: 0.2, destino: s });
  },
  aviso() {
    const t = contexto().currentTime + 0.01;
    const s = saida();
    nota(hz(81), t, 0.5, { tipo: 'sine', vol: 0.18, soltura: 0.45, destino: s });
    nota(hz(88), t + 0.09, 0.6, { tipo: 'sine', vol: 0.12, soltura: 0.5, destino: s });
  },
  pergunta() {
    const t = contexto().currentTime + 0.01;
    const s = saida();
    nota(hz(72), t, 0.15, { tipo: 'triangle', vol: 0.15, destino: s });
    nota(hz(79), t + 0.12, 0.3, { tipo: 'triangle', vol: 0.15, destino: s });
  },
  info() {
    const t = contexto().currentTime + 0.01;
    const s = saida();
    nota(hz(84), t, 0.35, { tipo: 'sine', vol: 0.15, soltura: 0.3, destino: s });
  },
  lixeira() {
    const c = contexto();
    const t = c.currentTime + 0.01;
    const n = Math.floor(c.sampleRate * 0.35);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) {
      const env = Math.pow(1 - i / n, 2);
      d[i] = (Math.random() * 2 - 1) * env * (Math.random() < 0.3 ? 1 : 0.3);
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 2200;
    f.Q.value = 0.8;
    const g = c.createGain();
    g.gain.value = 0.5;
    src.connect(f).connect(g).connect(saida());
    src.start(t);
  },
  /** O obturador da Captura de tela: dois estalos curtos de ruído (abre e fecha). */
  captura() {
    const c = contexto();
    const t = c.currentTime + 0.01;
    const s = saidaSeca();
    [0, 0.09].forEach((dt, k) => {
      const n = Math.floor(c.sampleRate * 0.05);
      const buf = c.createBuffer(1, n, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
      const src = c.createBufferSource();
      src.buffer = buf;
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = k ? 2600 : 3800;
      f.Q.value = 1.2;
      const g = c.createGain();
      g.gain.value = 0.7;
      src.connect(f).connect(g).connect(s);
      src.start(t + dt);
    });
  },
  foco() {
    const t = contexto().currentTime + 0.01;
    const s = saida();
    [0, 0.45, 0.9].forEach((dt) => {
      nota(hz(88), t + dt, 0.4, { tipo: 'sine', vol: 0.18, soltura: 0.35, destino: s });
      nota(hz(93), t + dt + 0.08, 0.4, { tipo: 'sine', vol: 0.1, soltura: 0.35, destino: s });
    });
  },
  // Os sons dos jogos: curtos, sem eco (são frequentes).
  raquete() {
    const t = contexto().currentTime + 0.005;
    nota(hz(72), t, 0.07, { tipo: 'square', vol: 0.05, soltura: 0.05, destino: saidaSeca() });
  },
  tijolo() {
    const t = contexto().currentTime + 0.005;
    nota(hz(84), t, 0.06, { tipo: 'square', vol: 0.045, soltura: 0.04, destino: saidaSeca() });
  },
  parede() {
    const t = contexto().currentTime + 0.005;
    nota(hz(60), t, 0.05, { tipo: 'square', vol: 0.035, soltura: 0.04, destino: saidaSeca() });
  },
  carta() {
    const t = contexto().currentTime + 0.005;
    nota(hz(91), t, 0.04, { tipo: 'triangle', vol: 0.06, soltura: 0.03, destino: saidaSeca() });
  },
  perdeu() {
    const t = contexto().currentTime + 0.01;
    const s = saida();
    [67, 63, 60, 55].forEach((n, i) => nota(hz(n), t + i * 0.12, 0.2, { tipo: 'square', vol: 0.06, soltura: 0.12, destino: s }));
  },
  explosao() {
    const c = contexto();
    const t = c.currentTime + 0.01;
    const n = Math.floor(c.sampleRate * 0.6);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    const g = c.createGain();
    g.gain.value = 0.9;
    src.connect(f).connect(g).connect(saida());
    src.start(t);
  },
  vitoria() {
    const t = contexto().currentTime + 0.02;
    const s = saida();
    [60, 64, 67, 72, 67, 72, 76].forEach((n, i) => nota(hz(n), t + i * 0.1, 0.22, { tipo: 'square', vol: 0.05, soltura: 0.15, destino: s }));
    [48, 55, 60, 64].forEach((n) => nota(hz(n), t + 0.7, 1.2, { tipo: 'triangle', vol: 0.06, ataque: 0.05, soltura: 0.9, destino: s }));
  },
};

/** A saída sem eco, para os bipes rápidos dos jogos. */
function saidaSeca() {
  const c = contexto();
  const g = c.createGain();
  g.gain.value = volume;
  g.connect(c.destination);
  return g;
}

// Quem quer saber de cada som do sistema (os avisos visuais da Acessibilidade), mesmo sem som.
const ouvintes = [];
export const aoTocar = (f) => ouvintes.push(f);

export function tocar(nome) {
  if (SONS[nome]) for (const f of ouvintes) { try { f(nome); } catch { } }
  if (!ligado || volume <= 0 || !SONS[nome]) return;
  try { SONS[nome](); } catch (e) { console.warn('som', nome, e); }
}
