'use strict';
/*
 * Entra em cada página do Navegador (isolado da página, sem acesso a ela).
 * Repassa à janela do Navegador os botões laterais do mouse (voltar e avançar),
 * o Ctrl+roda (o zoom), as teclas de atalho, que de outro modo ficariam com a
 * página, e as notificações do site (que viram o balão da barra de tarefas).
 */
const { ipcRenderer, webFrame } = require('electron');

// O login do Google: ali o Navegador se apresenta como o Firefox ou como o Chrome (login-google.js),
// e o navigator.userAgentData acompanha (o processo principal manda o que a página deve enxergar).
if (location.hostname === 'accounts.google.com') {
  try { const s = ipcRenderer.sendSync('navegador:loginGoogle'); if (s) webFrame.executeJavaScript(s); } catch { }
}

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

// O vídeo protegido (DRM): o Navegador daqui não tem o Widevine, e a página que o pede recebe a
// recusa. Na primeira recusa, a janela do Navegador oferece abrir o site no Firefox. Fica de fora do
// login do Google, que não tem vídeo e confere as funções da página.
if (location.hostname !== 'accounts.google.com') try {
  webFrame.executeJavaScript(`(() => {
    const original = Navigator.prototype.requestMediaKeySystemAccess;
    if (!original) return;
    let avisou = false;
    Navigator.prototype.requestMediaKeySystemAccess = function (sistema, opcoes) {
      return original.call(this, sistema, opcoes).catch((e) => {
        if (!avisou && /widevine|playready|fairplay|fps/i.test(String(sistema))) { avisou = true; window.postMessage({ __retroDrm: String(sistema) }, '*'); }
        throw e;
      });
    };
  })()`);
} catch { }

window.addEventListener('message', (e) => {
  if (e.source === window && e.data && e.data.__retroDrm) ipcRenderer.sendToHost('navegador', 'drm');
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
  // As abas (Navegador.acao): nova, fechar, passar, reabrir a fechada e ir para a de número N.
  if (ctrl && e.key === 'Tab') return e.shiftKey ? 'abaAnterior' : 'proximaAba';
  if (ctrl && e.shiftKey && k === 't') return 'reabrirAba';
  if (ctrl && e.shiftKey && k === 'b') return 'barraFavoritos';
  if (ctrl && e.shiftKey && k === 'p') return 'videoFlutuante';
  if (ctrl && /^[1-9]$/.test(e.key)) return 'aba:' + e.key;
  if (ctrl && k === 't') return 'novaAba';
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
