/*
 * A Captura de tela: a tela inteira, a janela da frente ou um pedaço escolhido com o mouse,
 * na hora ou depois de alguns segundos. Toda captura já fica guardada em Meus documentos ›
 * Capturas de tela (nada se perde) e vai para a área de transferência.
 * No modo sistema, Print Screen tira a tela; Alt+Print Screen, a janela; Shift+Print Screen,
 * um pedaço.
 */
import { h, img, nomeDe, paiDe, caminhoTela } from '../util.js';
import { Janela, lista as janelas, janelaAtiva } from '../janelas.js';
import { fecharMenus } from '../menus.js';
import { registrarApp, abrir, avisar, pastaDocs, estado } from '../sistema.js';
import { caixaArquivo, erro, info } from '../dialogos.js';
import { tocar } from '../sons.js';
import { tr, marcar } from '../idioma.js';

const MODOS = [
  { id: 'tela', rotulo: marcar('Tela inteira'), icone: 'computador' },
  { id: 'janela', rotulo: marcar('Janela da frente'), icone: 'programa' },
  { id: 'regiao', rotulo: marcar('Pedaço da tela'), icone: 'selecao' },
];
const ATRASOS = [0, 3, 5, 10];

const doisQuadros = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** "Captura de tela 2026-10-15 21.30.05.png" (a data e a hora, sem caracteres proibidos). */
export function nomeCaptura(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return tr('Captura de tela {data}', { data: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}.${p(d.getMinutes())}.${p(d.getSeconds())}` }) + '.png';
}

/** O retângulo (em pontos da tela) da janela da frente, sem contar a da própria Captura. */
function retanguloDaJanela(ignorar) {
  const visiveis = janelas.filter((j) => !j.fechada && !j.minimizada && j !== ignorar && !j.dialogo);
  const ativa = janelaAtiva();
  const alvo = ativa && ativa !== ignorar && visiveis.includes(ativa)
    ? ativa
    : visiveis.sort((a, b) => (Number(b.el.style.zIndex) || 0) - (Number(a.el.style.zIndex) || 0))[0];
  if (!alvo) return null;
  const r = alvo.el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

/** Recorta a imagem inteira (em pontos de verdade) num retângulo dado em pontos da página. */
async function recortar(bitmap, ret) {
  const esc = bitmap.width / window.innerWidth;
  const x = Math.max(0, Math.round(ret.x * esc));
  const y = Math.max(0, Math.round(ret.y * esc));
  const w = Math.min(bitmap.width - x, Math.round(ret.w * esc));
  const a = Math.min(bitmap.height - y, Math.round(ret.h * esc));
  if (w < 2 || a < 2) return null;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = a;
  c.getContext('2d').drawImage(bitmap, x, y, w, a, 0, 0, w, a);
  const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
}

/** O pedaço escolhido com o mouse sobre a tela congelada (Esc desiste). */
function escolherRegiao(url) {
  return new Promise((resolve) => {
    const caixa = h('div.cap-caixa');
    const dica = h('div.cap-dica', tr('Arraste para escolher o pedaço. Esc desiste.'));
    const camada = h('div#captura-regiao', { style: { backgroundImage: `url("${url}")` } }, h('div.cap-escuro'), caixa, dica);
    document.body.append(camada);
    let ini = null;
    const fim = (ret) => {
      window.removeEventListener('keydown', tecla, true);
      camada.remove();
      resolve(ret);
    };
    const tecla = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') fim(null);
    };
    window.addEventListener('keydown', tecla, true);
    const ret = (e) => ({ x: Math.min(ini.x, e.clientX), y: Math.min(ini.y, e.clientY), w: Math.abs(e.clientX - ini.x), h: Math.abs(e.clientY - ini.y) });
    camada.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return fim(null);
      e.preventDefault();
      camada.setPointerCapture(e.pointerId);
      ini = { x: e.clientX, y: e.clientY };
      dica.hidden = true;
      Object.assign(caixa.style, { display: 'block', left: ini.x + 'px', top: ini.y + 'px', width: '0px', height: '0px', backgroundImage: `url("${url}")`, backgroundSize: `${window.innerWidth}px ${window.innerHeight}px`, backgroundPosition: `${-ini.x}px ${-ini.y}px` });
    });
    camada.addEventListener('pointermove', (e) => {
      if (!ini) return;
      const r = ret(e);
      Object.assign(caixa.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px', backgroundPosition: `${-r.x}px ${-r.y}px` });
    });
    camada.addEventListener('pointerup', (e) => {
      if (!ini) return;
      const r = ret(e);
      fim(r.w >= 4 && r.h >= 4 ? r : null);
    });
    camada.addEventListener('contextmenu', (e) => { e.preventDefault(); fim(null); });
  });
}

/**
 * Tira a captura: esconde a janela da Captura, espera o atraso, pega a tela e recorta.
 * Devolve os bytes do PNG (ou null se o usuário desistiu).
 */
async function tirar(modo, atraso = 0, propria = null) {
  fecharMenus();
  const alvoJanela = modo === 'janela' ? retanguloDaJanela(propria) : null;
  if (propria) propria.el.style.visibility = 'hidden';
  try {
    if (atraso) await esperar(atraso * 1000);
    await doisQuadros();
    const png = await retro.captura.tirar();
    if (modo === 'tela') return png;
    const blob = new Blob([png], { type: 'image/png' });
    const bitmap = await createImageBitmap(blob);
    if (modo === 'janela') {
      if (!alvoJanela) return png; // nenhuma janela aberta: a tela inteira
      return recortar(bitmap, alvoJanela);
    }
    const url = URL.createObjectURL(blob);
    try {
      const ret = await escolherRegiao(url);
      return ret ? recortar(bitmap, ret) : null;
    } finally {
      URL.revokeObjectURL(url);
    }
  } finally {
    if (propria) propria.el.style.visibility = '';
  }
}

/** Guarda em Meus documentos › Capturas de tela e põe na área de transferência. */
async function guardar(png) {
  const nomePasta = (estado.config.pastas && estado.config.pastas.capturas) || tr('Capturas de tela');
  await retro.disco.criarPasta(pastaDocs(), nomePasta).catch(() => { }); // já existe: tudo bem
  const pasta = `${pastaDocs()}/${nomePasta}`;
  const nome = await retro.disco.nomeLivre(pasta, nomeCaptura());
  const rel = `${pasta}/${nome}`;
  await retro.disco.gravar(rel, png);
  await retro.captura.copiar(png).catch(() => { });
  return rel;
}

/** A tecla Print Screen (modo sistema): captura e avisa, sem abrir janela. */
export async function capturaRapida(modo = 'tela') {
  try {
    const png = await tirar(modo);
    if (!png) return;
    const rel = await guardar(png);
    tocar('captura');
    avisar(tr('Captura de tela guardada'), tr('{nome} — também está na área de transferência. Clique para ver.', { nome: nomeDe(rel) }), {
      icone: 'captura', som: null, aoClicar: () => abrir('imagens', { arquivo: rel }),
    });
  } catch (e) {
    erro(tr('Não foi possível capturar a tela: {erro}', { erro: e.message }));
  }
}

class Captura {
  constructor() {
    const cfg = estado.config.captura || {};
    this.modo = MODOS.some((m) => m.id === cfg.modo) ? cfg.modo : 'regiao';
    this.atraso = ATRASOS.includes(cfg.atraso) ? cfg.atraso : 0;
    this.rel = null;
    this.png = null;
    this.previa = h('img.cap-previa', { alt: '', draggable: false });
    this.vazio = h('div.cap-vazio', tr('Escolha o tipo de captura e clique em Nova.'));
    this.area = h('div.cap-area', this.vazio, this.previa);
    this.btNova = h('button.ferramenta', { title: tr('Nova captura (Ctrl+N)'), on: { click: () => this.nova() } }, img('captura', 16), tr('Nova'));
    this.selModo = h('select', { title: tr('Tipo de captura'), on: { change: () => { this.modo = this.selModo.value; this.guardarOpcoes(); } } },
      ...MODOS.map((m) => h('option', { value: m.id, selected: m.id === this.modo }, tr(m.rotulo))));
    this.selAtraso = h('select', { title: tr('Atraso'), on: { change: () => { this.atraso = Number(this.selAtraso.value); this.guardarOpcoes(); } } },
      ...ATRASOS.map((s) => h('option', { value: s, selected: s === this.atraso }, s ? tr('{n} segundos', { n: s }) : tr('Sem atraso'))));
    this.btCopiar = h('button.ferramenta', { title: tr('Copiar (Ctrl+C)'), on: { click: () => this.copiar() } }, img('copiar', 16));
    this.btSalvar = h('button.ferramenta', { title: tr('Salvar como… (Ctrl+S)'), on: { click: () => this.salvarComo() } }, img('logo', 16));
    this.btPasta = h('button.ferramenta', { title: tr('Mostrar na pasta'), on: { click: () => this.mostrarNaPasta() } }, img('pasta-aberta', 16));
    this.j = new Janela({
      titulo: tr('Captura de tela'),
      icone: 'captura',
      largura: 470,
      altura: 330,
      classe: 'captura',
      menus: this.menus(),
      status: [''],
    });
    this.j.corpo.append(h('div.barra-ferramentas', this.btNova, this.selModo, this.selAtraso, h('span.sep'), this.btCopiar, this.btSalvar, this.btPasta), this.area);
    this.j.el.addEventListener('keydown', (e) => this.teclas(e));
    this.atualizar();
  }

  menus() {
    return [
      {
        rotulo: tr('&Arquivo'), itens: () => [
          { rotulo: tr('&Nova captura'), atalho: 'Ctrl+N', acao: () => this.nova() },
          { separador: true },
          { rotulo: tr('Salvar &como…'), atalho: 'Ctrl+S', desativado: !this.png, acao: () => this.salvarComo() },
          { rotulo: tr('&Mostrar na pasta'), desativado: !this.rel, acao: () => this.mostrarNaPasta() },
          { rotulo: tr('Abrir no &Visualizador de imagens'), desativado: !this.rel, acao: () => abrir('imagens', { arquivo: this.rel }) },
          { separador: true },
          { rotulo: tr('Sai&r'), acao: () => this.j.fechar() },
        ],
      },
      {
        rotulo: tr('&Editar'), itens: () => [
          { rotulo: tr('&Copiar'), atalho: 'Ctrl+C', desativado: !this.png, acao: () => this.copiar() },
        ],
      },
      {
        rotulo: tr('A&juda'), itens: [
          {
            rotulo: tr('&Sobre a Captura de tela'), acao: () => info(tr('Captura de tela') + '\n\n' + tr('Tira uma foto da tela inteira, da janela da frente ou de um pedaço escolhido com o mouse. Toda captura fica guardada em Meus documentos › Capturas de tela e vai para a área de transferência.\nNo Retro Computer como sistema do computador: Print Screen (a tela), Alt+Print Screen (a janela) e Shift+Print Screen (um pedaço).'), tr('Sobre a Captura de tela')),
          },
        ],
      },
    ];
  }

  guardarOpcoes() {
    import('../sistema.js').then((m) => m.definirConfig({ captura: { modo: this.modo, atraso: this.atraso } })).catch(() => { });
  }

  async nova() {
    try {
      this.btNova.disabled = true;
      const png = await tirar(this.modo, this.atraso, this.j);
      if (!png) return;
      this.png = png;
      this.rel = await guardar(png);
      tocar('captura');
      if (this.previa.src) URL.revokeObjectURL(this.previa.src);
      this.previa.src = URL.createObjectURL(new Blob([png], { type: 'image/png' }));
      this.j.focar();
      this.atualizar();
    } catch (e) {
      erro(tr('Não foi possível capturar a tela: {erro}', { erro: e.message }));
    } finally {
      this.btNova.disabled = false;
    }
  }

  async copiar() {
    if (!this.png) return;
    await retro.captura.copiar(this.png).catch((e) => erro(e.message));
    this.j.definirStatus([tr('Copiada para a área de transferência.')]);
  }

  async salvarComo() {
    if (!this.png) return;
    const rel = await caixaArquivo({ modo: 'salvar', pasta: this.rel ? paiDe(this.rel) : pastaDocs(), nome: this.rel ? nomeDe(this.rel) : nomeCaptura(), tipos: [{ rotulo: tr('Imagem PNG (*.png)'), exts: ['png'] }] });
    if (!rel) return;
    const final = /\.png$/i.test(rel) ? rel : rel + '.png';
    try {
      await retro.disco.gravar(final, this.png);
      this.j.definirStatus([tr('Salva em {pasta}', { pasta: caminhoTela(final) })]);
    } catch (e) {
      erro(tr('Não foi possível salvar: {erro}', { erro: e.message }));
    }
  }

  mostrarNaPasta() {
    if (this.rel) abrir('explorador', { pasta: paiDe(this.rel), selecionar: this.rel });
  }

  atualizar() {
    const tem = !!this.png;
    this.area.classList.toggle('com-imagem', tem);
    this.btCopiar.disabled = !tem;
    this.btSalvar.disabled = !tem;
    this.btPasta.disabled = !this.rel;
    this.j.definirStatus([this.rel ? tr('Guardada em {pasta}', { pasta: caminhoTela(this.rel) }) : '']);
  }

  teclas(e) {
    const ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl || e.target.closest('select')) return;
    const k = e.key.toLowerCase();
    if (k === 'n') { e.preventDefault(); this.nova(); }
    else if (k === 'c') { e.preventDefault(); this.copiar(); }
    else if (k === 's') { e.preventDefault(); this.salvarComo(); }
  }
}

let aberta = null;
function abrirCaptura() {
  if (aberta && !aberta.j.fechada) { aberta.j.focar(); return aberta; }
  aberta = new Captura();
  aberta.j.ev.on('fechada', () => { if (aberta && aberta.previa.src) URL.revokeObjectURL(aberta.previa.src); aberta = null; });
  return aberta;
}

registrarApp('captura', { nome: marcar('Captura de tela'), icone: 'captura', abrir: abrirCaptura });
