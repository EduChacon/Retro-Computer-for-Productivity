/*
 * As áreas de trabalho (as janelas de cada uma ficam em janelas.js): a Visão das tarefas, como a do
 * Windows de hoje no visual da época (uma coluna por área, com as janelas dela; clicar numa janela
 * vai até ela, arrastá-la para outra coluna a leva para lá), e o aviso no meio da tela ao trocar de área.
 */
import { h, img, rotulo } from './util.js';
import { lista, eventos as evJanelas, areaAtual, numAreas, irParaArea, novaArea, fecharArea, moverParaArea, MAX_AREAS } from './janelas.js';
import { abrirMenu } from './menus.js';
import { nomeArea, itensMoverPara } from './barra.js';
import { tr } from './idioma.js';

let visao = null; // { el, parar }

const janelasDa = (n) => lista.filter((j) => !j.dialogo && !j.fechada && (j.area || 0) === n);

function desenhar() {
  if (!visao) return;
  const agora = areaAtual();
  const colunas = Array.from({ length: numAreas() }, (_, n) => {
    const js = janelasDa(n);
    const itens = js.length
      ? js.map((j) => {
        const b = h('button.vt-item' + (j.minimizada ? '.minimizada' : ''), { type: 'button', title: j.titulo, draggable: true },
          img(j.icone || 'programa', 16), h('span', j.titulo));
        b.addEventListener('click', () => { fecharVisao(); j.focar(); });
        b.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/x-retro-janela', String(lista.indexOf(j))); e.dataTransfer.effectAllowed = 'move'; });
        b.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          abrirMenu([
            { rotulo: tr('&Ir para a janela'), negrito: true, acao: () => { fecharVisao(); j.focar(); } },
            { rotulo: tr('Mo&ver para'), sub: () => itensMoverPara(j) },
            { separador: true },
            { rotulo: tr('&Fechar a janela'), acao: () => j.fechar() },
          ], { x: e.clientX, y: e.clientY });
        });
        return b;
      })
      : [h('div.vt-vazia', tr('Nenhuma janela'))];
    const fechar = numAreas() > 1
      ? h('button.vt-fechar', { type: 'button', title: tr('Fechar esta área de trabalho (as janelas vão para a área ao lado)'), on: { click: (e) => { e.stopPropagation(); fecharArea(n); } } }, '×')
      : null;
    const cab = h('button.vt-cab' + (n === agora ? '.atual' : ''), { type: 'button', on: { click: () => { fecharVisao(); irParaArea(n); } } }, nomeArea(n));
    const col = h('div.vt-area' + (n === agora ? '.atual' : ''), h('div.vt-topo', cab, fechar), h('div.vt-lista', ...itens));
    // Soltar uma janela numa coluna a leva para essa área.
    col.addEventListener('dragenter', (e) => { if (e.dataTransfer.types.includes('text/x-retro-janela')) { e.preventDefault(); col.classList.add('sobre'); } });
    col.addEventListener('dragover', (e) => { if (e.dataTransfer.types.includes('text/x-retro-janela')) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } });
    col.addEventListener('dragleave', (e) => { if (!col.contains(e.relatedTarget)) col.classList.remove('sobre'); });
    col.addEventListener('drop', (e) => {
      col.classList.remove('sobre');
      const j = lista[Number(e.dataTransfer.getData('text/x-retro-janela'))];
      if (!j) return;
      e.preventDefault();
      moverParaArea(j, n);
    });
    return col;
  });
  const nova = h('button.vt-nova', { type: 'button', disabled: numAreas() >= MAX_AREAS, on: { click: () => novaArea({ ir: false }) } },
    h('span.vt-mais', '+'), h('span', rotulo(tr('&Nova área de trabalho'))));
  visao.areas.replaceChildren(...colunas, nova);
}

/** Abre a Visão das tarefas (Logotipo+Tab, ou o botão direito na barra). */
export function abrirVisao() {
  if (visao) return;
  const areas = h('div.vt-areas');
  // Com a classe das caixas de diálogo, o título fica o de uma caixa da frente nos dois temas.
  const caixa = h('div.vt-caixa.dialogo', { role: 'dialog', 'aria-label': tr('Visão das tarefas') },
    h('div.titulo', h('span.texto', tr('Visão das tarefas')), h('div.botoes', h('button.b-fechar', { title: tr('Fechar'), tabIndex: -1, on: { click: () => fecharVisao() } }))),
    areas,
    h('div.vt-dica', tr('Clique numa janela para ir até ela, ou arraste-a para outra área de trabalho. Logotipo+Ctrl+← e → trocam de área; Logotipo+Ctrl+D cria uma nova.')));
  const el = h('div#visao-tarefas', caixa);
  el.addEventListener('mousedown', (e) => { if (e.target === el) fecharVisao(); });
  const tecla = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fecharVisao(); } };
  document.addEventListener('keydown', tecla, true);
  const parar = [evJanelas.on('mudou', desenhar), () => document.removeEventListener('keydown', tecla, true)];
  document.getElementById('tela').append(el);
  visao = { el, areas, parar };
  desenhar();
  const atual = areas.querySelector('.vt-area.atual .vt-item') || areas.querySelector('.vt-cab.atual');
  if (atual) atual.focus();
}

export function fecharVisao() {
  if (!visao) return;
  for (const p of visao.parar) p();
  visao.el.remove();
  visao = null;
}

export const alternarVisao = () => (visao ? fecharVisao() : abrirVisao());

/* ---------- O aviso ao trocar de área ---------- */

let aviso = null;
let timer = null;
evJanelas.on('area', (n) => {
  if (visao || numAreas() < 2) return;
  if (!aviso) aviso = h('div.aviso-area', { role: 'status' });
  aviso.textContent = nomeArea(n);
  if (!aviso.isConnected) document.getElementById('tela').append(aviso);
  clearTimeout(timer);
  timer = setTimeout(() => { if (aviso) aviso.remove(); }, 900);
});
