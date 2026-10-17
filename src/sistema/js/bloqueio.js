/*
 * A tela de bloqueio: cobre tudo e pede a senha (a do Retro Computer ou, no Linux, a de
 * entrada). Bloqueia pelo Iniciar, pela tecla do logotipo + L (modo sistema), antes de o
 * computador suspender, ao fechar a tampa e, se escolhido, ao abrir e ao sair da proteção de
 * tela. No modo sistema, sem a senha do Retro Computer, vale a de entrada do Linux (se a conta
 * tiver uma): o computador bloqueia como qualquer outro.
 * Quem confere a senha é o processo principal (bloqueio.js de lá).
 */
import { h, img } from './util.js';
import { estado } from './sistema.js';
import { fecharMenus } from './menus.js';
import { tocar } from './sons.js';
import { tr, localidade } from './idioma.js';
import { minimizarNativas } from './janelas-nativas.js';

let tela = null;

export const estaBloqueado = () => !!tela;
export const temSenha = () => !!(estado.config && estado.config.bloqueio && estado.config.bloqueio.temSenha);
/** A senha de entrada do Linux basta para bloquear (o modo sistema, com a conta com senha). */
export const senhaLinux = () => !!(estado.config && estado.config.bloqueio && estado.config.bloqueio.senhaLinux);
export const podeBloquear = () => temSenha() || senhaLinux();
const opcao = (k, padrao) => { const b = (estado.config && estado.config.bloqueio) || {}; return k in b ? !!b[k] : padrao; };
/** Pedir a senha ao sair da proteção de tela: no modo sistema, sim, a não ser que se tenha escolhido outra coisa. */
export const pedirNaProtecao = () => opcao('naProtecao', !!(estado.config && estado.config.modoSistema));

/** Bloqueia (só com uma senha que desbloqueie). */
export function bloquear() {
  if (tela || !podeBloquear()) return false;
  fecharMenus();
  // As janelas dos programas do Linux saem da frente (senão ficariam por cima da tela de bloqueio).
  minimizarNativas();
  // O foco sai de onde estava (uma página do Navegador, um programa): o teclado vem para a senha.
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  const campo = h('input', { type: 'password', autocomplete: 'off', spellcheck: false, 'aria-label': tr('Senha:') });
  const aviso = h('div.bloq-aviso');
  const ok = h('button.padrao', { type: 'button' }, tr('OK'));
  const hora = h('div.bloq-hora');
  const data = h('div.bloq-data');
  const caixa = h('div.bloq-caixa',
    h('div.titulo', h('span.texto', tr('Computador bloqueado'))),
    h('div.bloq-corpo',
      img('chave', 32),
      h('div',
        h('div.bloq-texto', temSenha() ? tr('Este computador está bloqueado. Digite a senha para continuar.') : tr('Este computador está bloqueado. Digite a senha de entrada do Linux para continuar.')),
        h('div.bloq-linha', h('span', tr('Senha:')), campo),
        aviso,
        h('div.acoes.direita', ok))));
  tela = h('div#bloqueio', h('div.bloq-relogio', hora, data), caixa);
  document.body.append(tela);

  const relogio = () => {
    const d = new Date();
    hora.textContent = d.toLocaleTimeString(localidade(), { hour: '2-digit', minute: '2-digit' });
    data.textContent = d.toLocaleDateString(localidade(), { weekday: 'long', day: 'numeric', month: 'long' });
  };
  relogio();
  const t = setInterval(relogio, 1000);

  let conferindo = false;
  const desbloquear = async () => {
    if (conferindo) return;
    conferindo = true;
    ok.disabled = true;
    campo.disabled = true;
    aviso.textContent = tr('Conferindo…');
    const certo = await retro.bloqueio.conferir(campo.value).catch(() => false);
    conferindo = false;
    ok.disabled = false;
    campo.disabled = false;
    if (certo) {
      clearInterval(t);
      window.removeEventListener('keydown', prender, true);
      tela.remove();
      tela = null;
      return;
    }
    tocar('erro');
    aviso.textContent = tr('A senha não está certa. Tente de novo.');
    campo.value = '';
    campo.focus();
  };
  ok.addEventListener('click', desbloquear);
  // Nenhuma tecla passa para o que está atrás (nem os atalhos do Retro Computer).
  const prender = (e) => {
    if (!tela) return;
    if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); desbloquear(); return; }
    // A AltGr escreve (o @ do teclado espanhol, os acentos do EUA internacional): no Windows ela chega
    // como Ctrl+Alt e, no Linux, como AltGraph. Ela não é um atalho.
    const altGr = (e.getModifierState && e.getModifierState('AltGraph')) || (e.ctrlKey && e.altKey);
    if (e.target === campo && ((!e.ctrlKey && !e.altKey && !e.metaKey) || (altGr && e.key.length === 1))) { e.stopPropagation(); return; }
    if (e.target === campo && e.ctrlKey && ['a', 'v', 'x', 'c', 'z'].includes(e.key.toLowerCase())) { e.stopPropagation(); return; }
    e.preventDefault();
    e.stopPropagation();
    campo.focus();
  };
  window.addEventListener('keydown', prender, true);
  tela.addEventListener('pointerdown', (e) => { if (e.target !== ok) setTimeout(() => campo.focus(), 0); });
  setTimeout(() => campo.focus(), 0);
  return true;
}

/* Os momentos de bloquear. */
// Antes de suspender: depois de a tela de bloqueio aparecer de fato (dois quadros), o computador pode dormir.
retro.bloqueio.aoBloquear(() => {
  bloquear();
  requestAnimationFrame(() => requestAnimationFrame(() => retro.bloqueio.pronto().catch(() => { })));
});
document.addEventListener('retro-protecao-saiu', () => { if (pedirNaProtecao()) bloquear(); });

/**
 * Na abertura: com "pedir a senha ao abrir" (o padrão desde a 1.1), já começa bloqueado. Só com a
 * senha do Retro Computer: a do Linux acabou de ser pedida na tela de entrada.
 */
export function bloquearAoAbrir() {
  if (temSenha() && opcao('aoAbrir', true)) bloquear();
}
