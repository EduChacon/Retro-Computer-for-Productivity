/*
 * A proteção de tela: entra depois de alguns minutos sem uso e sai com
 * qualquer tecla ou movimento. Três desenhos próprios: as estrelas, as
 * linhas coloridas e o relógio.
 */
import { h } from '../util.js';
import { registrarApp, estado } from '../sistema.js';
import { localidade } from '../idioma.js';

let ultima = Date.now();
let ativa = null;

function marcarUso() {
  ultima = Date.now();
  if (ativa && Date.now() - ativa.desde > 600) sair();
}

for (const ev of ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart']) {
  window.addEventListener(ev, marcarUso, true);
}
document.addEventListener('retro-atividade', () => { ultima = Date.now(); });

setInterval(() => {
  const p = estado.config && estado.config.protecaoTela;
  if (!p || !p.ligada || ativa) return;
  if (document.getElementById('boot').classList.contains('visivel')) return;
  if (Date.now() - ultima > (p.minutos || 10) * 60000) entrar(p.tipo);
}, 5000);

function sair() {
  if (!ativa) return;
  cancelAnimationFrame(ativa.raf);
  ativa.el.remove();
  ativa = null;
  ultima = Date.now();
}

function entrar(tipo = 'estrelas') {
  if (ativa) return;
  const canvas = h('canvas');
  const el = h('div#protecao', canvas);
  document.body.append(el);
  const ctx = canvas.getContext('2d');
  const tamanho = () => {
    canvas.width = Math.floor(window.innerWidth);
    canvas.height = Math.floor(window.innerHeight);
  };
  tamanho();
  const desenhos = { estrelas, canos, relogio };
  const passo = (desenhos[tipo] || estrelas)(ctx, canvas);
  ativa = { el, desde: Date.now(), raf: 0 };
  const laco = (t) => {
    if (!ativa) return;
    if (canvas.width !== Math.floor(window.innerWidth)) tamanho();
    passo(t);
    ativa.raf = requestAnimationFrame(laco);
  };
  ativa.raf = requestAnimationFrame(laco);
}

function estrelas(ctx, c) {
  const N = 500;
  const lista = Array.from({ length: N }, () => nova(true));
  function nova(qualquer) {
    return { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: qualquer ? Math.random() * 1 + 0.05 : 1 };
  }
  let antes = 0;
  return (t) => {
    const dt = Math.min(50, t - (antes || t));
    antes = t;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, c.width, c.height);
    const cx = c.width / 2;
    const cy = c.height / 2;
    for (const s of lista) {
      s.z -= dt * 0.00025;
      if (s.z <= 0.02) Object.assign(s, nova(false));
      const x = cx + (s.x / s.z) * cx;
      const y = cy + (s.y / s.z) * cy;
      if (x < 0 || x > c.width || y < 0 || y > c.height) { Object.assign(s, nova(false)); continue; }
      const tam = Math.max(1, Math.round((1 - s.z) * 3));
      const luz = Math.round(255 * Math.min(1, (1 - s.z) * 1.4));
      ctx.fillStyle = `rgb(${luz},${luz},${luz})`;
      ctx.fillRect(Math.round(x), Math.round(y), tam, tam);
    }
  };
}

function canos(ctx, c) {
  const CORES = ['#ff5555', '#55ff55', '#5555ff', '#ffff55', '#ff55ff', '#55ffff', '#ffffff'];
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, c.width, c.height);
  const G = 24;
  let p = null;
  let passos = 0;
  const novo = () => ({ x: Math.floor(Math.random() * (c.width / G)), y: Math.floor(Math.random() * (c.height / G)), d: Math.floor(Math.random() * 4), cor: CORES[Math.floor(Math.random() * CORES.length)] });
  return () => {
    if (!p || passos > 900) {
      if (passos > 900) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, c.width, c.height); passos = 0; }
      p = novo();
    }
    for (let k = 0; k < 2; k++) {
      if (Math.random() < 0.2) p.d = (p.d + (Math.random() < 0.5 ? 1 : 3)) % 4;
      const [dx, dy] = [[1, 0], [0, 1], [-1, 0], [0, -1]][p.d];
      const nx = p.x + dx;
      const ny = p.y + dy;
      if (nx < 0 || ny < 0 || nx * G > c.width || ny * G > c.height) { p = novo(); continue; }
      ctx.strokeStyle = p.cor;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x * G, p.y * G);
      ctx.lineTo(nx * G, ny * G);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(Math.min(p.x, nx) * G - 1, Math.min(p.y, ny) * G - 3, Math.abs(nx - p.x) * G + 2, 2);
      p.x = nx;
      p.y = ny;
      passos++;
    }
  };
}

function relogio(ctx, c) {
  let x = 100;
  let y = 100;
  let vx = 1.3;
  let vy = 1.1;
  return () => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, c.width, c.height);
    const d = new Date();
    const texto = d.toLocaleTimeString(localidade(), { hour: '2-digit', minute: '2-digit' });
    ctx.font = 'bold 60px Katica';
    const w = ctx.measureText(texto).width;
    x += vx; y += vy;
    if (x < 0 || x + w > c.width) vx = -vx;
    if (y < 60 || y > c.height - 20) vy = -vy;
    ctx.fillStyle = `hsl(${(Date.now() / 60) % 360}, 80%, 60%)`;
    ctx.fillText(texto, x, y);
    ctx.font = '20px Katica';
    ctx.fillStyle = '#808080';
    ctx.fillText(d.toLocaleDateString(localidade(), { weekday: 'long', day: 'numeric', month: 'long' }), x, y + 30);
  };
}

registrarApp('protecao', { nome: 'Proteção de tela', icone: 'protecao', abrir: (o = {}) => { if (o.agora) entrar((estado.config.protecaoTela || {}).tipo); } });
