'use strict';
/*
 * Entra em cada página do Navegador (isolado da página, sem acesso a ela).
 * Repassa à janela do Navegador os botões laterais do mouse (voltar e avançar),
 * o Ctrl+roda (o zoom), as teclas de atalho, que de outro modo ficariam com a
 * página, e as notificações do site (que viram o balão da barra de tarefas).
 */
const { ipcRenderer, webFrame } = require('electron');

// As notificações (window.Notification) do site: a página pede como sempre, e o aviso vai para a
// área de trabalho, se o usuário permitiu as notificações desse site.
try {
  webFrame.executeJavaScript(`(() => {
    const Original = window.Notification;
    if (!Original) return;
    class Notificacao extends EventTarget {
      constructor(titulo, opcoes = {}) {
        super();
        Object.assign(this, { title: String(titulo), body: String(opcoes.body || ''), tag: opcoes.tag || '', data: opcoes.data, onclick: null, onclose: null, onshow: null, onerror: null });
        const disparar = (tipo) => setTimeout(() => { const ev = new Event(tipo); this.dispatchEvent(ev); if (this['on' + tipo]) this['on' + tipo](ev); });
        if (Original.permission !== 'granted') { disparar('error'); return; }
        window.postMessage({ __retroNotificacao: { titulo: this.title, corpo: this.body } }, '*');
        disparar('show');
      }
      close() { }
      static get permission() { return Original.permission; }
      static requestPermission(f) { return Original.requestPermission(f); }
      static get maxActions() { return 0; }
    }
    window.Notification = Notificacao;
  })()`);
} catch { }

window.addEventListener('message', (e) => {
  const n = e.source === window && e.data && e.data.__retroNotificacao;
  if (n && Notification.permission === 'granted') ipcRenderer.sendToHost('navegador', 'notificacao', String(n.titulo).slice(0, 200), String(n.corpo).slice(0, 500));
});

const avisar = (acao) => ipcRenderer.sendToHost('navegador', acao);

// Só as teclas e os cliques de verdade (uma página não dispara os atalhos com eventos inventados).
window.addEventListener('mouseup', (e) => {
  if (!e.isTrusted) return;
  if (e.button === 3) { e.preventDefault(); avisar('voltar'); }
  else if (e.button === 4) { e.preventDefault(); avisar('avancar'); }
}, true);

function atalho(e) {
  const ctrl = e.ctrlKey || e.metaKey;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (e.key === 'F5' || (ctrl && k === 'r')) return 'atualizar';
  if (e.key === 'F6' || (ctrl && k === 'l')) return 'endereco';
  if (e.altKey && e.key === 'ArrowLeft') return 'voltar';
  if (e.altKey && e.key === 'ArrowRight') return 'avancar';
  if (e.altKey && e.key === 'Home') return 'inicio';
  if (ctrl && k === 'f') return 'localizar';
  if (e.key === 'F3') return 'proxima';
  if (ctrl && k === 'n') return 'nova';
  if (ctrl && k === 'w') return 'fechar';
  if (ctrl && k === 'd') return 'favorito';
  if (ctrl && k === 'p') return 'imprimir';
  if (ctrl && (k === '+' || k === '=')) return 'aumentar';
  if (ctrl && k === '-') return 'diminuir';
  if (ctrl && k === '0') return 'zoom100';
  if (e.key === 'F11') return 'telaCheia';
  if (ctrl && e.key === 'Escape') return 'iniciar';
  return null;
}

// Ctrl+roda do mouse (e o pinçar do touchpad) muda o zoom da página, como nos navegadores.
window.addEventListener('wheel', (e) => {
  if (!e.isTrusted || !e.ctrlKey || !e.deltaY) return;
  e.preventDefault();
  avisar(e.deltaY < 0 ? 'aumentar' : 'diminuir');
}, { passive: false, capture: true });

window.addEventListener('keydown', (e) => {
  if (!e.isTrusted) return;
  const a = atalho(e);
  if (!a) return;
  e.preventDefault();
  e.stopPropagation();
  avisar(a);
}, true);
