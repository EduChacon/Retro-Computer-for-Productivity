'use strict';
/*
 * O lado de dentro do DOS (dos://emulador): liga o DOSBox com os arquivos que a janela manda,
 * desenha a tela em 4:3, passa as teclas e o mouse, toca o som e devolve os arquivos quando a
 * janela pede. Só aceita mensagens da área de trabalho (sistema://retro) e só responde a ela.
 */
(() => {
  const PAI = 'sistema://retro';
  const tela = document.getElementById('tela');
  const ctx = tela.getContext('2d');
  let ci = null;
  let img = null;
  let som = null;
  let volume = 0.5;
  const apertadas = new Set();

  const enviar = (m, transferir) => parent.postMessage(m, PAI, transferir || []);

  // As teclas do js-dos são as do GLFW (pelo lugar da tecla, como num teclado americano).
  const TECLAS = {
    Space: 32, Quote: 39, Comma: 44, Minus: 45, Period: 46, Slash: 47, Semicolon: 59, Equal: 61,
    BracketLeft: 91, Backslash: 92, BracketRight: 93, Backquote: 96, IntlBackslash: 92,
    Escape: 256, Enter: 257, Tab: 258, Backspace: 259, Insert: 260, Delete: 261,
    ArrowRight: 262, ArrowLeft: 263, ArrowDown: 264, ArrowUp: 265, PageUp: 266, PageDown: 267, Home: 268, End: 269,
    CapsLock: 280, ScrollLock: 281, NumLock: 282, PrintScreen: 283, Pause: 284,
    NumpadDecimal: 330, NumpadDivide: 331, NumpadMultiply: 332, NumpadSubtract: 333, NumpadAdd: 334, NumpadEnter: 335, NumpadEqual: 336,
    ShiftLeft: 340, ControlLeft: 341, AltLeft: 342, ShiftRight: 344, ControlRight: 345, AltRight: 346,
  };
  for (let i = 0; i < 10; i++) { TECLAS['Digit' + i] = 48 + i; TECLAS['Numpad' + i] = 320 + i; }
  for (let i = 0; i < 26; i++) TECLAS['Key' + String.fromCharCode(65 + i)] = 65 + i;
  for (let i = 1; i <= 12; i++) TECLAS['F' + i] = 289 + i;

  /** O som: as amostras chegam aos poucos e tocam numa fila curta (para não atrasar). */
  function criarSom(freq) {
    const s = { fila: [], tam: 0, max: Math.round(freq * 0.25) };
    try {
      s.ctx = new AudioContext({ sampleRate: freq });
      s.no = s.ctx.createScriptProcessor(2048, 0, 1);
      s.ganho = s.ctx.createGain();
      s.ganho.gain.value = volume;
      s.no.onaudioprocess = (e) => {
        const saida = e.outputBuffer.getChannelData(0);
        let i = 0;
        while (i < saida.length && s.fila.length) {
          const a = s.fila[0];
          const n = Math.min(a.length, saida.length - i);
          saida.set(a.subarray(0, n), i);
          i += n;
          if (n === a.length) s.fila.shift(); else s.fila[0] = a.subarray(n);
          s.tam -= n;
        }
        saida.fill(0, i);
      };
      s.no.connect(s.ganho).connect(s.ctx.destination);
    } catch { s.ctx = null; }
    s.empurrar = (a) => {
      if (!s.ctx) return;
      if (s.ctx.state === 'suspended') s.ctx.resume().catch(() => { });
      s.fila.push(a);
      s.tam += a.length;
      while (s.tam > s.max && s.fila.length > 1) s.tam -= s.fila.shift().length;
    };
    s.fechar = () => { try { s.no.disconnect(); s.ctx.close(); } catch { } };
    return s;
  }

  /** A tela sempre em 4:3 (o 640 × 400 ganha a altura de 480; o 320 × 200 dobra), do tamanho do quadro. */
  function ajustar() {
    const k = Math.min(innerWidth / 4, innerHeight / 3);
    tela.style.width = Math.floor(k * 4) + 'px';
    tela.style.height = Math.floor(k * 3) + 'px';
  }
  addEventListener('resize', ajustar);
  ajustar();

  function quadro(rgb, rgba) {
    const w = tela.width;
    const h = tela.height;
    if (!img || img.width !== w || img.height !== h) img = ctx.createImageData(w, h);
    const d = img.data;
    if (rgba) d.set(rgba.subarray(0, w * h * 4));
    else if (rgb) for (let i = 0, j = 0, n = w * h; i < n; i++) { d[j++] = rgb[i * 3]; d[j++] = rgb[i * 3 + 1]; d[j++] = rgb[i * 3 + 2]; d[j++] = 255; }
    ctx.putImageData(img, 0, 0);
  }

  async function ligar(m) {
    try {
      emulators.pathPrefix = 'dos://emulador/';
      ci = await emulators.dosboxWorker([
        { dosboxConf: String(m.conf || ''), jsdosConf: { version: '8' } },
        ...(m.arquivos || []).map((a) => ({ path: String(a.caminho), contents: new Uint8Array(a.conteudo) })),
      ]);
    } catch (e) {
      enviar({ tipo: 'erro', erro: String((e && e.message) || e) });
      return;
    }
    const ev = ci.events();
    ev.onFrameSize((w, h) => { tela.width = w; tela.height = h; enviar({ tipo: 'tamanho', w, h }); });
    ev.onFrame(quadro);
    som = criarSom(ci.soundFrequency() || 44100);
    ev.onSoundPush((a) => som.empurrar(a));
    ev.onExit(() => enviar({ tipo: 'saiu' }));
    enviar({ tipo: 'ligado', w: ci.width(), h: ci.height() });
    tela.focus();
  }

  /** Os arquivos do DOS agora (sem a pasta de configuração do js-dos) e as pastas. */
  async function ler(id) {
    if (!ci) { enviar({ tipo: 'arquivos', id, arquivos: [], pastas: [] }); return; }
    try {
      const arquivos = [];
      const pastas = [];
      const andar = async (no, rel) => {
        for (const f of no.nodes || []) {
          const r = rel ? rel + '/' + f.name : f.name;
          if (!rel && /^\.jsdos$/i.test(f.name)) continue;
          if (f.nodes) { pastas.push(r); await andar(f, r); } else arquivos.push({ caminho: r, conteudo: new Uint8Array(await ci.fsReadFile(r)).buffer });
        }
      };
      await andar(await ci.fsTree(), '');
      enviar({ tipo: 'arquivos', id, arquivos, pastas }, arquivos.map((a) => a.conteudo));
    } catch (e) {
      enviar({ tipo: 'arquivos', id, erro: String((e && e.message) || e) });
    }
  }

  async function desligar(id) {
    soltarTudo();
    if (ci) { try { await ci.exit(); } catch { } }
    ci = null;
    if (som) som.fechar();
    enviar({ tipo: 'desligado', id });
  }

  function soltarTudo() {
    if (!ci) return;
    for (const k of apertadas) ci.sendKeyEvent(k, false);
    apertadas.clear();
  }

  const tecla = (e, apertada) => {
    const k = TECLAS[e.code];
    if (k == null) return;
    e.preventDefault();
    if (!ci) return;
    if (apertada) { if (apertadas.has(k)) ci.sendKeyEvent(k, false); apertadas.add(k); } else apertadas.delete(k);
    ci.sendKeyEvent(k, apertada);
  };
  addEventListener('keydown', (e) => tecla(e, true));
  addEventListener('keyup', (e) => tecla(e, false));
  addEventListener('blur', soltarTudo);
  addEventListener('contextmenu', (e) => e.preventDefault());
  tela.addEventListener('pointermove', (e) => {
    if (!ci) return;
    const r = tela.getBoundingClientRect();
    ci.sendMouseMotion(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)));
  });
  // No DOSBox, 0 é o botão esquerdo, 1 o direito e 2 o do meio.
  const botao = (e, apertado) => { const b = { 0: 0, 2: 1, 1: 2 }[e.button]; if (ci && b != null) ci.sendMouseButton(b, apertado); };
  tela.addEventListener('pointerdown', (e) => { tela.focus(); botao(e, true); });
  tela.addEventListener('pointerup', (e) => botao(e, false));

  addEventListener('message', (e) => {
    if (e.origin !== PAI || e.source !== parent) return;
    const m = e.data || {};
    if (m.tipo === 'ligar' && !ci) ligar(m);
    else if (m.tipo === 'ler') ler(m.id);
    else if (m.tipo === 'desligar') desligar(m.id);
    else if (m.tipo === 'volume') { volume = Number(m.volume) || 0; if (som && som.ganho) som.ganho.gain.value = volume; }
    else if (m.tipo === 'foco') tela.focus();
  });
  enviar({ tipo: 'pronto' });
})();
