/*
 * O adaptador: entra na página de cada programa instalado (programa://<id>/),
 * antes dos scripts dela, e liga o programa ao disco C: do computador retrô.
 *
 *  - Abrir: o <input type=file> que os programas usam (o rfd do Rust, por
 *    exemplo) abre a caixa "Abrir" da área de trabalho, não a do sistema;
 *  - Salvar: window.showSaveFilePicker e os downloads por <a download>
 *    abrem a caixa "Salvar como" e gravam no disco;
 *  - Abrir um arquivo do disco no programa: a área de trabalho manda o
 *    arquivo, e o adaptador o "solta" sobre a tela do programa;
 *  - Fechar com alterações não salvas: o adaptador pergunta aos ouvintes de
 *    "beforeunload" da página.
 *
 * Tudo passa por postMessage com a área de trabalho (sistema://retro), e só ela.
 */
(function () {
  'use strict';
  if (window.parent === window || window.__retroAdaptador) return;
  window.__retroAdaptador = true;

  var ORIGEM_PAI = 'sistema://retro';
  var pedidos = new Map();
  var proximo = 1;

  function enviar(msg, transferir) {
    msg.retro = 1;
    window.parent.postMessage(msg, ORIGEM_PAI, transferir || []);
  }

  function perguntar(msg, transferir) {
    return new Promise(function (resolve) {
      var n = proximo++;
      pedidos.set(n, resolve);
      msg.pedido = n;
      enviar(msg, transferir);
    });
  }

  function erroAbortar() {
    try { return new DOMException('O usuário cancelou.', 'AbortError'); } catch (e) { var x = new Error('O usuário cancelou.'); x.name = 'AbortError'; return x; }
  }

  function paraBytes(dados) {
    if (dados == null) return Promise.resolve(new Uint8Array(0));
    if (dados instanceof Uint8Array) return Promise.resolve(dados);
    if (dados instanceof ArrayBuffer) return Promise.resolve(new Uint8Array(dados));
    if (ArrayBuffer.isView(dados)) return Promise.resolve(new Uint8Array(dados.buffer, dados.byteOffset, dados.byteLength));
    if (typeof Blob !== 'undefined' && dados instanceof Blob) return dados.arrayBuffer().then(function (b) { return new Uint8Array(b); });
    if (typeof dados === 'string') return Promise.resolve(new TextEncoder().encode(dados));
    if (typeof dados === 'object' && dados.type === 'write') return paraBytes(dados.data);
    return Promise.resolve(new TextEncoder().encode(String(dados)));
  }

  function juntar(partes) {
    var total = 0;
    partes.forEach(function (p) { total += p.length; });
    var r = new Uint8Array(total);
    var pos = 0;
    partes.forEach(function (p) { r.set(p, pos); pos += p.length; });
    return r;
  }

  function extensoesDe(tipos) {
    var exts = [];
    (tipos || []).forEach(function (t) {
      var acc = (t && t.accept) || {};
      Object.keys(acc).forEach(function (k) {
        [].concat(acc[k]).forEach(function (e) { if (e) exts.push(String(e).toLowerCase()); });
      });
    });
    return exts;
  }

  /* ---------- Salvar ---------- */

  function salvar(caminho, nome, bytes) {
    var copia = bytes.slice().buffer;
    return perguntar({ tipo: 'salvar', caminho: caminho, nome: nome, dados: copia }, [copia]);
  }

  function alcaSalvar(nomeSugerido, caminho) {
    // Uma "alça" de arquivo como a do navegador: o que for escrito vai para o disco no close().
    var alca = {
      kind: 'file',
      name: nomeSugerido,
      createWritable: function () {
        var partes = [];
        return Promise.resolve({
          write: function (dados) { return paraBytes(dados).then(function (b) { partes.push(new Uint8Array(b)); }); },
          seek: function () { return Promise.resolve(); },
          truncate: function () { partes = []; return Promise.resolve(); },
          abort: function () { partes = []; return Promise.resolve(); },
          close: function () {
            return salvar(caminho, alca.name, juntar(partes)).then(function (r) {
              if (!r || !r.ok) throw new Error((r && r.erro) || 'Não foi possível gravar.');
              alca.name = r.nome || alca.name;
            });
          },
        });
      },
      getFile: function () { return Promise.resolve(new File([], alca.name)); },
      queryPermission: function () { return Promise.resolve('granted'); },
      requestPermission: function () { return Promise.resolve('granted'); },
      isSameEntry: function (o) { return Promise.resolve(o === alca); },
    };
    return alca;
  }

  // A caixa "Salvar como" do disco: pergunta o nome e o lugar antes da escrita.
  window.showSaveFilePicker = function (opcoes) {
    opcoes = opcoes || {};
    var exts = extensoesDe(opcoes.types);
    return perguntar({ tipo: 'escolherSalvar', nome: opcoes.suggestedName || 'Documento', exts: exts }).then(function (r) {
      if (!r || !r.ok) throw erroAbortar();
      return alcaSalvar(r.nome, r.caminho);
    });
  };

  // Downloads de <a download href="blob:…"> viram "Salvar como" no disco.
  var cliqueOriginal = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    var href = this.href || '';
    if (this.hasAttribute('download') && /^(blob|data):/.test(href)) {
      var nome = this.getAttribute('download') || 'arquivo';
      fetch(href).then(function (r) { return r.arrayBuffer(); }).then(function (b) {
        return perguntar({ tipo: 'escolherSalvar', nome: nome, exts: [] }).then(function (r) {
          if (!r || !r.ok) return;
          return salvar(r.caminho, r.nome, new Uint8Array(b));
        });
      }).catch(function (e) { console.error('[retro] download', e); });
      return;
    }
    return cliqueOriginal.apply(this, arguments);
  };

  /* ---------- Abrir ---------- */

  function abrirPeloDisco(input) {
    if (input.__retroAberto) return;
    input.__retroAberto = true;
    var aceitar = String(input.accept || '').split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
    perguntar({ tipo: 'abrir', aceitar: aceitar, varios: !!input.multiple }).then(function (r) {
      input.__retroAberto = false;
      if (!r || !r.ok || !r.arquivos || !r.arquivos.length) {
        input.dispatchEvent(new Event('cancel'));
        return;
      }
      var dt = new DataTransfer();
      r.arquivos.forEach(function (a) { dt.items.add(new File([a.dados], a.nome, { lastModified: a.modificado || Date.now() })); });
      input.files = dt.files;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  var cliqueInput = HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click = function () {
    if (String(this.type).toLowerCase() === 'file') return abrirPeloDisco(this);
    return cliqueInput.apply(this, arguments);
  };
  HTMLInputElement.prototype.showPicker = function () {
    if (String(this.type).toLowerCase() === 'file') return abrirPeloDisco(this);
  };

  window.showOpenFilePicker = function (opcoes) {
    opcoes = opcoes || {};
    var exts = extensoesDe(opcoes.types);
    return perguntar({ tipo: 'abrir', aceitar: exts, varios: !!opcoes.multiple }).then(function (r) {
      if (!r || !r.ok || !r.arquivos || !r.arquivos.length) throw erroAbortar();
      return r.arquivos.map(function (a) {
        var arq = new File([a.dados], a.nome, { lastModified: a.modificado || Date.now() });
        var alca = alcaSalvar(a.nome, a.caminho);
        alca.getFile = function () { return Promise.resolve(arq); };
        return alca;
      });
    });
  };

  // O rfd mostra uma caixa própria (em inglês) quando não há gesto do usuário:
  // ela é trocada pela do disco na hora em que aparece.
  function vigiarCaixasDoRfd() {
    new MutationObserver(function (mudancas) {
      mudancas.forEach(function (m) {
        m.addedNodes.forEach(function (n) {
          if (n.nodeType !== 1 || n.id !== 'rfd-overlay') return;
          var input = n.querySelector('input[type=file]');
          if (!input) return;
          n.style.display = 'none';
          abrirPeloDisco(input);
        });
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  /* ---------- Abrir um arquivo do disco no programa (soltar) ---------- */

  function soltar(nome, dados) {
    var alvo = document.querySelector('canvas') || document.body;
    var dt = new DataTransfer();
    dt.items.add(new File([dados], nome, { lastModified: Date.now() }));
    var r = alvo.getBoundingClientRect();
    var pos = { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true, cancelable: true, dataTransfer: dt };
    ['dragenter', 'dragover', 'drop'].forEach(function (t) {
      alvo.dispatchEvent(new DragEvent(t, pos));
    });
  }

  /* ---------- Alterações não salvas ---------- */

  var aoSair = [];
  var addOriginal = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (tipo, fn) {
    if (this === window && tipo === 'beforeunload' && fn) aoSair.push(fn);
    return addOriginal.apply(this, arguments);
  };

  function temAlteracoes() {
    var sujo = false;
    var ev = {
      type: 'beforeunload',
      returnValue: '',
      defaultPrevented: false,
      preventDefault: function () { sujo = true; this.defaultPrevented = true; },
      stopPropagation: function () { },
      stopImmediatePropagation: function () { },
    };
    var fns = aoSair.slice();
    if (typeof window.onbeforeunload === 'function') fns.push(window.onbeforeunload);
    fns.forEach(function (fn) {
      try {
        var r = typeof fn === 'function' ? fn.call(window, ev) : fn.handleEvent(ev);
        if (typeof r === 'string' && r) sujo = true;
      } catch (e) { }
    });
    if (ev.returnValue) sujo = true;
    return sujo;
  }

  /* ---------- Conversa com a área de trabalho ---------- */

  window.addEventListener('message', function (e) {
    if (e.source !== window.parent || e.origin !== ORIGEM_PAI) return;
    var m = e.data;
    if (!m || m.retro !== 1) return;
    if (m.tipo === 'resposta' && pedidos.has(m.pedido)) {
      var fn = pedidos.get(m.pedido);
      pedidos.delete(m.pedido);
      fn(m);
    } else if (m.tipo === 'soltar') {
      soltar(m.nome, m.dados);
    } else if (m.tipo === 'podeFechar') {
      enviar({ tipo: 'resposta', pedido: m.pedido, sujo: temAlteracoes() });
    } else if (m.tipo === 'focar') {
      var c = document.querySelector('canvas');
      if (c) { c.setAttribute('tabindex', '0'); c.focus(); }
      window.focus();
    }
  });

  // Um clique dentro do programa traz a janela dele para a frente.
  addOriginal.call(window, 'pointerdown', function () { enviar({ tipo: 'ativo' }); }, true);
  // Digitar ou mexer o ponteiro no programa conta como uso (a proteção de tela não entra).
  var ultimaAtividade = 0;
  function atividade() {
    var agora = Date.now();
    if (agora - ultimaAtividade < 5000) return;
    ultimaAtividade = agora;
    enviar({ tipo: 'atividade' });
  }
  addOriginal.call(window, 'keydown', atividade, true);
  addOriginal.call(window, 'pointermove', atividade, true);
  addOriginal.call(window, 'wheel', atividade, true);

  // O título da página (o nome do documento, em muitos programas) vai para a barra da janela.
  function avisarTitulo() { enviar({ tipo: 'titulo', titulo: document.title || '' }); }

  // Pronto: o programa terminou de carregar (o aviso de "Loading" some).
  var avisouPronto = false;
  function avisarPronto() {
    if (avisouPronto) return;
    avisouPronto = true;
    enviar({ tipo: 'pronto' });
  }
  addOriginal.call(window, 'TrunkApplicationStarted', function () {
    var tent = 0;
    (function esperar() {
      var carregando = document.querySelector('[id$="_loading"], [id$="-loading"]');
      if (carregando && /failed|required|requires|error/i.test(carregando.textContent || '')) {
        avisouPronto = true;
        enviar({ tipo: 'falhou', texto: (carregando.textContent || '').trim().slice(0, 600) });
        return;
      }
      if (!carregando || tent++ > 600) return setTimeout(avisarPronto, 150);
      setTimeout(esperar, 100);
    })();
  });
  setTimeout(avisarPronto, 90000);

  document.addEventListener('DOMContentLoaded', function () {
    vigiarCaixasDoRfd();
    var t = document.querySelector('title');
    if (t) new MutationObserver(avisarTitulo).observe(t, { childList: true, characterData: true, subtree: true });
    avisarTitulo();
  });
})();
