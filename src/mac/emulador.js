'use strict';
/*
 * O lado de dentro do Mac (mac://emulador): liga o PCE.js com a ROM e os discos que a janela
 * manda, desenha a tela de 512 × 342 sem deformar, passa as teclas e o mouse, toca o som e
 * devolve os discos que mudaram quando a janela pede. Só aceita mensagens da área de trabalho
 * (sistema://retro) e só responde a ela.
 */
(() => {
  const PAI = 'sistema://retro';
  const tela = document.getElementById('tela');
  const discos = []; // { caminho, no (o arquivo na memória do emulador), visto (a hora da última leitura) }
  const registro = [];
  let modulo = null;
  let ligado = false;
  let ligando = false;
  let volume = 0.5;
  const contextos = [];

  const enviar = (m, transferir) => parent.postMessage(m, PAI, transferir || []);
  const anotar = (t) => { registro.push(String(t)); if (registro.length > 30) registro.shift(); };
  // As últimas linhas do PCE e os discos, para os testes (o quadro é isolado: nada sai daqui sem pedido).
  window.__registroPce = registro;
  window.__discosPce = discos;

  // O som do emulador passa por um ganho nosso, para seguir o volume da área de trabalho.
  const Audio0 = window.AudioContext || window.webkitAudioContext;
  if (Audio0) {
    class ComVolume extends Audio0 {
      constructor(...a) {
        super(...a);
        this.ganhoRetro = super.createGain();
        this.ganhoRetro.gain.value = volume;
        this.ganhoRetro.connect(super.destination);
        contextos.push(this);
      }
      get destination() { return this.ganhoRetro; }
    }
    window.AudioContext = ComVolume;
    window.webkitAudioContext = ComVolume;
  }

  /** A tela do Mac do tamanho do quadro, sem deformar. */
  function ajustar() {
    const w = tela.width > 1 ? tela.width : 512;
    const h = tela.height > 1 ? tela.height : 342;
    const k = Math.min(innerWidth / w, innerHeight / h) || 1;
    document.documentElement.style.setProperty('--largura', Math.floor(w * k) + 'px');
    document.documentElement.style.setProperty('--altura', Math.floor(h * k) + 'px');
  }
  addEventListener('resize', ajustar);
  ajustar();

  /** O emulador mudou o tamanho da tela (ao ligar): avisa a janela. */
  let tamanho = '';
  function vigiarTela() {
    const t = tela.width + 'x' + tela.height;
    if (t !== tamanho && tela.width > 1) {
      tamanho = t;
      ajustar();
      if (!ligado) {
        ligado = true;
        enviar({ tipo: 'ligado', w: tela.width, h: tela.height });
        acordarMouse();
        tela.focus();
      } else enviar({ tipo: 'tamanho', w: tela.width, h: tela.height });
    }
    if (modulo) setTimeout(vigiarTela, 250);
  }

  /*
   * O PCE só passa os cliques depois de "prender" o mouse, o que acontece ao soltar o primeiro
   * botão (no navegador, prender não faz nada: o PCE põe o ponteiro do Mac onde está o nosso). Um
   * clique de mentira logo ao ligar faz isso, para o primeiro clique de verdade já valer.
   */
  function acordarMouse() {
    const r = tela.getBoundingClientRect();
    const op = { bubbles: true, cancelable: true, button: 0, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
    tela.dispatchEvent(new MouseEvent('mousedown', op));
    tela.dispatchEvent(new MouseEvent('mouseup', op));
  }

  async function ligar(m) {
    if (typeof PCEJSMacplus !== 'function') { enviar({ tipo: 'erro', erro: 'PCEJSMacplus' }); return; }
    // O pcex.rom é o do próprio PCE (a ponte dele com os disquetes), servido junto da biblioteca.
    let pcex;
    try { pcex = new Uint8Array(await (await fetch('mac://emulador/macplus-pcex.rom')).arrayBuffer()); } catch (e) {
      enviar({ tipo: 'erro', erro: String((e && e.message) || e) });
      return;
    }
    const arquivos = [
      ['pce-config.cfg', new TextEncoder().encode(String(m.conf || ''))],
      ['mac.rom', new Uint8Array(m.rom)],
      ['macplus-pcex.rom', pcex],
    ];
    const lista = (m.discos || []).map((d) => ({ caminho: String(d.caminho), interno: String(d.interno), conteudo: new Uint8Array(d.conteudo) }));
    try {
      modulo = PCEJSMacplus({
        arguments: ['-c', 'pce-config.cfg', '-r'],
        canvas: tela,
        locateFile: (p) => 'mac://emulador/' + p,
        print: anotar,
        printErr: anotar,
        // O preRun vem depois de o .wasm chegar (pela rede do quadro), com o módulo já devolvido.
        preRun: [() => {
          const M = modulo;
          for (const [nome, dados] of arquivos) M.FS_createDataFile('/', nome, dados, true, false, false);
          for (const d of lista) {
            // O disco fica com o mesmo arquivo da memória ("canOwn"): sem cópia, e as gravações do Mac vão direto nele.
            const no = M.FS_createDataFile('/', d.interno, d.conteudo, true, true, true);
            discos.push({ caminho: d.caminho, no, visto: no.timestamp });
          }
        }],
        onAbort: (e) => enviar({ tipo: 'erro', erro: String(e || ''), registro: registro.slice(-8) }),
        quit: (status, erro) => {
          const r = registro.slice(-8);
          if (ligado) enviar({ tipo: 'saiu', status, registro: r });
          else enviar({ tipo: 'erro', erro: 'status ' + status, registro: r });
          throw erro;
        },
      });
    } catch (e) {
      enviar({ tipo: 'erro', erro: String((e && e.message) || e), registro: registro.slice(-8) });
      return;
    }
    vigiarTela();
  }

  /** Os discos que o Mac mudou desde a última leitura (a hora do arquivo na memória do emulador). */
  function ler(id) {
    try {
      const mudados = [];
      for (const d of discos) {
        if (d.no.timestamp === d.visto) continue;
        d.visto = d.no.timestamp;
        mudados.push({ caminho: d.caminho, conteudo: d.no.contents.slice(0, d.no.usedBytes).buffer });
      }
      enviar({ tipo: 'discos', id, discos: mudados }, mudados.map((d) => d.conteudo));
    } catch (e) {
      enviar({ tipo: 'discos', id, erro: String((e && e.message) || e) });
    }
  }

  function desligar(id) {
    try { if (modulo && modulo.pauseMainLoop) modulo.pauseMainLoop(); } catch { }
    for (const c of contextos) { try { c.close(); } catch { } }
    modulo = null;
    enviar({ tipo: 'desligado', id });
  }

  // As teclas do próprio PCE não chegam a ele: a ScrollLock (o escape dele), a Pause (desliga),
  // o Ctrl+` (para a emulação) e a PrintScreen (uma foto dentro do emulador).
  const DO_PCE = new Set(['ScrollLock', 'Pause', 'PrintScreen']);
  const bloquear = (e) => {
    if (DO_PCE.has(e.code) || (e.code === 'Backquote' && e.ctrlKey)) { e.stopImmediatePropagation(); e.preventDefault(); }
  };
  addEventListener('keydown', bloquear, true);
  addEventListener('keyup', bloquear, true);
  addEventListener('keypress', bloquear, true);
  addEventListener('contextmenu', (e) => e.preventDefault());
  // O Tab e as teclas que o navegador usaria (a barra, o recarregar) ficam com o Mac.
  addEventListener('keydown', (e) => { if (modulo && !e.metaKey) e.preventDefault(); });
  tela.addEventListener('pointerdown', () => tela.focus());

  addEventListener('message', (e) => {
    if (e.origin !== PAI || e.source !== parent) return;
    const m = e.data || {};
    if (m.tipo === 'ligar' && !ligando) { ligando = true; ligar(m); }
    else if (m.tipo === 'ler') ler(m.id);
    else if (m.tipo === 'desligar') desligar(m.id);
    else if (m.tipo === 'volume') {
      volume = Number(m.volume) || 0;
      for (const c of contextos) { try { c.ganhoRetro.gain.value = volume; } catch { } }
    } else if (m.tipo === 'foco') { focus(); tela.focus(); }
  });
  enviar({ tipo: 'pronto' });
})();
