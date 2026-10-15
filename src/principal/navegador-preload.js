'use strict';
/*
 * Entra em cada página do Navegador (isolado da página, sem acesso a ela).
 * Só repassa à janela do Navegador os botões laterais do mouse (voltar e
 * avançar) e as teclas de atalho, que de outro modo ficariam com a página.
 */
const { ipcRenderer } = require('electron');

const avisar = (acao) => ipcRenderer.sendToHost('navegador', acao);

window.addEventListener('mouseup', (e) => {
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

window.addEventListener('keydown', (e) => {
  const a = atalho(e);
  if (!a) return;
  e.preventDefault();
  e.stopPropagation();
  avisar(a);
}, true);
