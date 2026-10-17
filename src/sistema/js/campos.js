/*
 * O botão direito num campo de texto, como no Windows: Desfazer, Recortar, Copiar, Colar, Excluir e
 * Selecionar tudo, com as sugestões do corretor ortográfico por cima quando a palavra está errada
 * (e "Adicionar ao dicionário"). Vale para os campos da área de trabalho e para os dos programas
 * Craft: quem avisa é o processo principal (o "context-menu" do Chromium, que traz a palavra, as
 * sugestões e o que dá para fazer); a página só o recebe quando ninguém tratou o botão direito antes.
 */
import { abrirMenu } from './menus.js';
import { zoomInterface } from './aparencia.js';
import { tr } from './idioma.js';

// O ponto e o campo do último botão direito da área de trabalho (no quadro de um programa, o
// evento não chega aqui: o ponto vem do processo principal, nos pixels da janela).
let ultimo = null;
document.addEventListener('contextmenu', (e) => { ultimo = { x: e.clientX, y: e.clientY, alvo: e.target, t: Date.now() }; }, true);

const semEComercial = (s) => String(s).replace(/&/g, '');

// O campo (ou o quadro do programa) volta a ter o foco antes: a ação do Chromium vale para o quadro
// que está com ele. No quadro, o iframe pode continuar como o elemento em foco da página com o foco
// já fora dele; o focus() da janela do quadro (permitido entre origens) o devolve.
function focar(alvo) {
  if (!alvo || !alvo.isConnected) return;
  if (document.activeElement !== alvo) alvo.focus();
  if (alvo.tagName === 'IFRAME') {
    try { alvo.contentWindow.focus(); } catch { /* o quadro saiu */ }
  }
}

function editar(alvo, acao) {
  focar(alvo);
  return retro.ortografia.editar(acao).catch(() => { });
}

/** Os itens do menu: as sugestões (se a palavra está errada) e as ações de edição. */
export function itensDoCampo(p, alvo) {
  const pode = p.pode || {};
  const itens = [];
  if (p.palavra && !p.senha) {
    if (p.sugestoes && p.sugestoes.length) {
      for (const s of p.sugestoes.slice(0, 6)) {
        itens.push({ rotulo: semEComercial(s), negrito: true, acao: () => { focar(alvo); retro.ortografia.trocar(s).catch(() => { }); } });
      }
    } else {
      itens.push({ rotulo: tr('(Nenhuma sugestão)'), desativado: true });
    }
    itens.push({ rotulo: tr('&Adicionar ao dicionário'), acao: () => retro.ortografia.adicionar(p.palavra).catch(() => { }) });
    itens.push({ separador: true });
  }
  itens.push(
    { rotulo: tr('&Desfazer'), atalho: 'Ctrl+Z', desativado: !pode.desfazer, acao: () => editar(alvo, 'desfazer') },
    { separador: true },
    { rotulo: tr('Recor&tar'), atalho: 'Ctrl+X', desativado: !pode.recortar || p.senha, acao: () => editar(alvo, 'recortar') },
    { rotulo: tr('&Copiar'), atalho: 'Ctrl+C', desativado: !pode.copiar || p.senha, acao: () => editar(alvo, 'copiar') },
    { rotulo: tr('C&olar'), atalho: 'Ctrl+V', desativado: !pode.colar, acao: () => editar(alvo, 'colar') },
    { rotulo: tr('&Excluir'), atalho: 'Del', desativado: !pode.excluir, acao: () => editar(alvo, 'excluir') },
    { separador: true },
    { rotulo: tr('&Selecionar tudo'), atalho: 'Ctrl+A', desativado: !pode.tudo, acao: () => editar(alvo, 'tudo') },
  );
  return itens;
}

retro.ortografia.aoPedirMenu((p) => {
  let x;
  let y;
  let alvo;
  if (!p.quadro && ultimo && Date.now() - ultimo.t < 1500) {
    ({ x, y, alvo } = ultimo);
  } else {
    // No quadro de um programa: o ponto vem em pixels da janela (com o zoom da interface).
    const z = zoomInterface() || 1;
    x = p.x / z;
    y = p.y / z;
    alvo = document.activeElement;
  }
  ultimo = null;
  abrirMenu(itensDoCampo(p, alvo), { x, y, classe: 'menu-campo' });
});
