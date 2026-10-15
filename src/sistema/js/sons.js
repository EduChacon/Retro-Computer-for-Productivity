/*
 * Os sons do sistema, sintetizados na hora (nenhum arquivo de som de terceiros):
 * a abertura, o desligar, o erro, o aviso, a pergunta, a lixeira e o fim do foco.
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
  foco() {
    const t = contexto().currentTime + 0.01;
    const s = saida();
    [0, 0.45, 0.9].forEach((dt) => {
      nota(hz(88), t + dt, 0.4, { tipo: 'sine', vol: 0.18, soltura: 0.35, destino: s });
      nota(hz(93), t + dt + 0.08, 0.4, { tipo: 'sine', vol: 0.1, soltura: 0.35, destino: s });
    });
  },
};

export function tocar(nome) {
  if (!ligado || volume <= 0 || !SONS[nome]) return;
  try { SONS[nome](); } catch (e) { console.warn('som', nome, e); }
}
