/*
 * As caixas de diálogo: mensagem, pergunta, entrada de texto, Abrir, Salvar como
 * e Propriedades. Todas devolvem promessas.
 */
import { h, img, rotulo, tipoDe, caminhoTela, caminhoInterno, juntar, paiDe, nomeDe, extensao, tamanho, dataHora } from './util.js';
import { Janela } from './janelas.js';
import { tocar } from './sons.js';
import { tr, localidade } from './idioma.js';
import { pastaDocs } from './sistema.js';

const ICONES = { erro: 'msg-erro', aviso: 'msg-aviso', info: 'msg-info', pergunta: 'msg-pergunta' };
const SONS = { erro: 'erro', aviso: 'aviso', info: 'info', pergunta: 'pergunta' };

function botoes(lista, aoEscolher) {
  const div = h('div.acoes');
  const els = lista.map((b, i) => {
    const el = h('button' + (b.padrao ? '.padrao' : ''), { type: 'button', on: { click: () => aoEscolher(b.valor) } }, rotulo(b.texto));
    if (b.desativado) el.disabled = true;
    div.append(el);
    return el;
  });
  return { div, els };
}

/**
 * Mensagem com ícone e botões.
 * @returns {Promise<any>} o valor do botão escolhido (ou null no Esc/fechar)
 */
export function mensagem({ titulo = 'Retro Computer', texto = '', tipo = 'info', botoes: bs = [{ texto: tr('OK'), valor: true, padrao: true }] } = {}) {
  return new Promise((resolve) => {
    let feito = false;
    const fim = (v) => {
      if (feito) return;
      feito = true;
      j.fechar(true);
      resolve(v);
    };
    const j = new Janela({ titulo, dialogo: true, largura: 360, altura: 140, aoFechar: () => { if (!feito) { feito = true; resolve(null); } } });
    const { div, els } = botoes(bs, fim);
    j.corpo.append(h('div.mensagem', img(ICONES[tipo] || 'msg-info', 32), h('div.texto', texto)), div);
    ajustarAoConteudo(j);
    tocar(SONS[tipo]);
    (els.find((e, i) => bs[i].padrao) || els[0]).focus();
  });
}

export const erro = (texto, titulo) => mensagem({ titulo: titulo || tr('Erro'), texto, tipo: 'erro' });
export const aviso = (texto, titulo) => mensagem({ titulo: titulo || tr('Aviso'), texto, tipo: 'aviso' });
export const info = (texto, titulo) => mensagem({ titulo, texto, tipo: 'info' });

export function confirmar(texto, { titulo = tr('Confirmar'), sim = tr('&Sim'), nao = tr('&Não'), tipo = 'pergunta' } = {}) {
  return mensagem({ titulo, texto, tipo, botoes: [{ texto: sim, valor: true, padrao: true }, { texto: nao, valor: false }] }).then((v) => v === true);
}

/**
 * Pergunta com prazo (como a troca de resolução da época): sem resposta em `segundos`,
 * vale o Não. Devolve true só com o Sim.
 */
export function confirmarComPrazo(texto, segundos, { titulo = tr('Confirmar') } = {}) {
  return new Promise((resolve) => {
    let feito = false;
    let resta = segundos;
    const j = new Janela({ titulo, dialogo: true, largura: 380, altura: 150, aoFechar: () => { if (!feito) { feito = true; clearInterval(timer); resolve(false); } } });
    const contagem = h('div', { style: { marginTop: '6px', color: '#000080' } });
    const mostrar = () => { contagem.textContent = tr('Voltando à configuração anterior em {n} segundos.', { n: resta }); };
    const fim = (v) => {
      if (feito) return;
      feito = true;
      clearInterval(timer);
      j.fechar(true);
      resolve(v === true);
    };
    const timer = setInterval(() => { resta -= 1; if (resta <= 0) fim(false); else mostrar(); }, 1000);
    mostrar();
    const { div, els } = botoes([{ texto: tr('&Sim'), valor: true, padrao: true }, { texto: tr('&Não'), valor: false }], fim);
    j.corpo.append(h('div.mensagem', img('msg-pergunta', 32), h('div.texto', texto, contagem)), div);
    ajustarAoConteudo(j);
    tocar('pergunta');
    els[0].focus();
  });
}

/** Sim / Não / Cancelar: devolve 'sim', 'nao' ou null. */
export function simNaoCancelar(texto, titulo = 'Retro Computer') {
  return mensagem({
    titulo, texto, tipo: 'aviso',
    botoes: [{ texto: tr('&Sim'), valor: 'sim', padrao: true }, { texto: tr('&Não'), valor: 'nao' }, { texto: tr('Cancelar'), valor: null }],
  });
}

/** Pede um texto. Devolve o texto ou null. */
export function entrada({ titulo = 'Retro Computer', texto = '', valor = '', tipo = 'text', icone = null, larg = 360 } = {}) {
  return new Promise((resolve) => {
    let feito = false;
    const j = new Janela({ titulo, dialogo: true, largura: larg, altura: 150, aoFechar: () => { if (!feito) { feito = true; resolve(null); } } });
    const campo = h('input', { type: tipo, value: valor, spellcheck: false });
    const fim = (ok) => {
      if (feito) return;
      feito = true;
      j.fechar(true);
      resolve(ok ? campo.value : null);
    };
    campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') fim(true); });
    const { div } = botoes([{ texto: tr('OK'), valor: true, padrao: true }, { texto: tr('Cancelar'), valor: false }], fim);
    div.classList.add('direita');
    j.corpo.append(
      h('div.mensagem', icone ? img(icone, 32) : null, h('div', { style: { flex: '1' } }, h('div.texto', { style: { paddingTop: '0', marginBottom: '8px' } }, texto), campo)),
      div,
    );
    campo.style.width = '100%';
    ajustarAoConteudo(j);
    campo.focus();
    campo.select();
  });
}

export function ajustarAoConteudo(j, { minLarg = 0, largura = 0 } = {}) {
  j.el.style.height = 'auto';
  j.el.style.width = largura ? largura + 'px' : 'auto';
  const r = j.el.getBoundingClientRect();
  const t = document.getElementById('janelas').getBoundingClientRect();
  j.ret.w = Math.max(Math.ceil(r.width), minLarg, 240);
  j.ret.h = Math.ceil(r.height);
  j.ret.x = Math.round((t.width - j.ret.w) / 2);
  j.ret.y = Math.max(0, Math.round((t.height - j.ret.h) / 2.4));
  j.aplicarRet();
  if (!j.redim) acompanharConteudo(j, [...j.corpo.children]);
}

/**
 * As janelas de tamanho fixo crescem quando o conteúdo cresce depois de abertas (uma aba mais
 * alta, um texto que chegou depois), sem passar da tela; nunca encolhem sozinhas.
 * @param {HTMLElement[]} elementos  o que observar (os conteúdos das abas, por exemplo)
 */
export function acompanharConteudo(j, elementos) {
  if (!j._acompanha) {
    j._acompanha = new ResizeObserver(() => requestAnimationFrame(() => crescer(j)));
    j.ev.on('fechada', () => j._acompanha.disconnect());
  }
  for (const el of elementos) if (el) j._acompanha.observe(el);
}

function crescer(j) {
  if (j.fechada || j.maximizada || j.minimizada) return;
  const antes = j.el.style.height;
  j.el.style.height = 'auto';
  const precisa = Math.ceil(j.el.getBoundingClientRect().height);
  j.el.style.height = antes;
  if (precisa <= j.ret.h) return;
  const t = document.getElementById('janelas').getBoundingClientRect();
  j.ret.h = Math.min(precisa, Math.floor(t.height) - 8);
  if (j.ret.y + j.ret.h > t.height) j.ret.y = Math.max(0, Math.floor(t.height) - j.ret.h);
  j.aplicarRet();
}

/* ---------- Abrir e Salvar como ---------- */

/**
 * A caixa de arquivos do disco.
 * @param {object} o
 * @param {'abrir'|'salvar'} o.modo
 * @param {string} [o.pasta]   pasta inicial (caminho interno)
 * @param {string} [o.nome]    nome sugerido (salvar)
 * @param {Array<{rotulo:string, exts:string[]}>} [o.tipos]
 * @param {boolean} [o.varios] permite escolher vários (abrir)
 * @returns {Promise<string|string[]|null>} o caminho interno escolhido
 */
export function caixaArquivo(o) {
  const salvar = o.modo === 'salvar';
  const tipos = (o.tipos && o.tipos.length ? o.tipos : []).concat([{ rotulo: tr('Todos os arquivos (*.*)'), exts: [] }]);
  return new Promise((resolve) => {
    let feito = false;
    let pasta = o.pasta || pastaDocs();
    let itens = [];
    let selecionados = new Set();
    let tipoAtual = 0;
    const j = new Janela({
      titulo: o.titulo || (salvar ? tr('Salvar como') : tr('Abrir')),
      dialogo: true,
      largura: 440,
      altura: 300,
      aoFechar: () => { if (!feito) { feito = true; resolve(null); } },
    });
    const fim = (v) => {
      if (feito) return;
      feito = true;
      j.fechar(true);
      resolve(v);
    };

    const seletorPasta = h('select');
    const btSubir = h('button.pequeno', { title: tr('Subir um nível'), style: { width: '24px', height: '22px', marginLeft: '4px' } }, img('pasta-aberta', 16));
    const btNova = h('button.pequeno', { title: tr('Criar nova pasta'), style: { width: '24px', height: '22px', marginLeft: '2px' } }, img('pasta', 16));
    const listaEl = h('div.lista-arquivos.vista-lista', { tabIndex: 0, style: { height: '150px' } });
    const campoNome = h('input', { type: 'text', value: o.nome || '', spellcheck: false });
    const seletorTipo = h('select', tipos.map((t, i) => h('option', { value: String(i) }, tr(t.rotulo))));
    const btOk = h('button.padrao', { type: 'button' }, salvar ? rotulo(tr('&Salvar')) : rotulo(tr('&Abrir')));
    const btCancelar = h('button', { type: 'button', on: { click: () => fim(null) } }, tr('Cancelar'));

    const linhaPasta = h('div.linha', h('span', salvar ? tr('Salvar em:') : tr('Examinar:')), h('div.select-caixa', { style: { flex: '1' } }, seletorPasta), btSubir, btNova);
    const grade = h('div', { style: { display: 'grid', gridTemplateColumns: 'auto 1fr 82px', gap: '6px 8px', alignItems: 'center', marginTop: '8px' } },
      h('span', rotulo(tr('&Nome do arquivo:'))), campoNome, btOk,
      h('span', rotulo(salvar ? tr('Salvar como &tipo:') : tr('Arquivos do &tipo:'))), h('div.select-caixa', seletorTipo), btCancelar,
    );
    btOk.style.minWidth = '0';
    btCancelar.style.minWidth = '0';
    j.corpo.append(linhaPasta, listaEl, grade);
    j.corpo.style.padding = '8px 10px 10px';

    function caminhosDaPasta() {
      const partes = pasta.split('/').filter(Boolean);
      const ops = [h('option', { value: '' }, 'C:\\')];
      partes.forEach((p, i) => {
        ops.push(h('option', { value: partes.slice(0, i + 1).join('/') }, '\u00a0'.repeat((i + 1) * 3) + p));
      });
      seletorPasta.replaceChildren(...ops);
      seletorPasta.value = pasta;
    }

    function passaFiltro(it) {
      if (it.pasta) return true;
      const exts = tipos[tipoAtual].exts;
      return !exts.length || exts.includes(extensao(it.nome));
    }

    async function carregar() {
      caminhosDaPasta();
      try {
        itens = (await retro.disco.listar(pasta)).filter(passaFiltro);
      } catch (e) {
        itens = [];
      }
      selecionados = new Set();
      listaEl.replaceChildren(...itens.map((it, i) => {
        const t = tipoDe(it.nome, it.pasta);
        const el = h('div.item', { dataset: { i } },
          h('div.icone', { style: { '--ico': `url(icones/16/${t.icone}.png)` } }, img(t.icone, 16)),
          h('div.rotulo', it.nome));
        el.addEventListener('mousedown', (e) => {
          if (o.varios && (e.ctrlKey || e.metaKey)) {
            if (selecionados.has(i)) selecionados.delete(i); else selecionados.add(i);
          } else {
            selecionados = new Set([i]);
          }
          marcar();
          if (!it.pasta) campoNome.value = [...selecionados].map((k) => itens[k]).filter((x) => !x.pasta).map((x) => x.nome).join(' ; ') || it.nome;
        });
        el.addEventListener('dblclick', () => {
          if (it.pasta) { pasta = it.rel; carregar(); } else confirmar(it.rel);
        });
        return el;
      }));
    }

    function marcar() {
      [...listaEl.children].forEach((el, i) => el.classList.toggle('sel', selecionados.has(i)));
    }

    async function confirmar(relDireto) {
      if (relDireto) return fim(o.varios ? [relDireto] : relDireto);
      const sel = [...selecionados].map((k) => itens[k]);
      if (!salvar && sel.length && sel.every((x) => !x.pasta)) {
        const rels = sel.map((x) => x.rel);
        return fim(o.varios ? rels : rels[0]);
      }
      let nome = campoNome.value.trim();
      if (!nome) {
        if (sel.length === 1 && sel[0].pasta) { pasta = sel[0].rel; campoNome.value = ''; return carregar(); }
        return;
      }
      // Um caminho digitado (C:\pasta\arquivo ou pasta\arquivo).
      let rel = /[\\/]/.test(nome) ? caminhoInterno(nome) : juntar(pasta, nome);
      const alvo = itens.find((x) => x.rel === rel);
      if (alvo && alvo.pasta) { pasta = rel; campoNome.value = ''; return carregar(); }
      if (salvar) {
        const exts = tipos[tipoAtual].exts;
        if (exts.length && !extensao(rel)) rel += '.' + exts[0];
        if (await retro.disco.existe(rel)) {
          const ok = await mensagem({
            titulo: tr('Salvar como'), tipo: 'aviso',
            texto: tr('{caminho} já existe.\nDeseja substituí-lo?\n\n(A versão atual fica guardada em Versões anteriores.)', { caminho: caminhoTela(rel) }),
            botoes: [{ texto: tr('&Sim'), valor: true }, { texto: tr('&Não'), valor: false, padrao: true }],
          });
          if (!ok) return;
        }
        return fim(rel);
      }
      if (!(await retro.disco.existe(rel))) {
        await erro(tr('{caminho}\nArquivo não encontrado.\nVerifique o nome e tente novamente.', { caminho: caminhoTela(rel) }), j.titulo);
        return;
      }
      fim(o.varios ? [rel] : rel);
    }

    btOk.addEventListener('click', () => confirmar());
    campoNome.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); confirmar(); } });
    listaEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); const i = [...selecionados][0]; if (i != null && itens[i].pasta) { pasta = itens[i].rel; carregar(); } else confirmar(); }
      if (e.key === 'Backspace') { e.preventDefault(); btSubir.click(); }
    });
    seletorPasta.addEventListener('change', () => { pasta = seletorPasta.value; carregar(); });
    seletorTipo.addEventListener('change', () => { tipoAtual = Number(seletorTipo.value); carregar(); });
    btSubir.addEventListener('click', () => { if (pasta) { pasta = paiDe(pasta); carregar(); } });
    btNova.addEventListener('click', async () => {
      const nome = await retro.disco.nomeLivre(pasta, tr('Nova pasta'));
      try {
        await retro.disco.criarPasta(pasta, nome);
        carregar();
      } catch (e) { erro(e.message); }
    });

    if (salvar && o.nome) {
      const ext = extensao(o.nome);
      const i = tipos.findIndex((t) => t.exts.includes(ext));
      if (i >= 0) { tipoAtual = i; seletorTipo.value = String(i); }
    }
    carregar().then(() => {
      campoNome.focus();
      const ponto = campoNome.value.lastIndexOf('.');
      campoNome.setSelectionRange(0, ponto > 0 ? ponto : campoNome.value.length);
    });
  });
}

/* ---------- Propriedades ---------- */

export async function propriedades(rel) {
  const info = await retro.disco.info(rel);
  const t = tipoDe(info.nome, info.pasta);
  const j = new Janela({ titulo: tr('Propriedades de {nome}', { nome: info.nome || 'C:' }), dialogo: true, largura: 330, altura: 340 });
  let conteudo = '';
  if (info.pasta) {
    try {
      const filhos = await retro.disco.listar(rel);
      conteudo = tr('{a} arquivo(s), {p} pasta(s)', { a: filhos.filter((f) => !f.pasta).length, p: filhos.filter((f) => f.pasta).length });
    } catch { }
  }
  const linha = (a, b) => h('div', { style: { display: 'grid', gridTemplateColumns: '84px 1fr', margin: '6px 0' } }, h('span', a), h('span', { style: { userSelect: 'text', overflowWrap: 'anywhere' } }, b));
  j.corpo.append(
    h('div.abas', h('div.ativa', tr('Geral'))),
    h('div.painel-aba',
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '10px' } }, img(t.icone, 32), h('input', { type: 'text', value: info.nome || 'C:', readOnly: true, style: { flex: '1' } })),
      h('hr.sulco'),
      linha(tr('Tipo:'), t.descricao),
      linha(tr('Local:'), caminhoTela(paiDe(rel))),
      linha(tr('Tamanho:'), info.pasta ? conteudo : `${tamanho(info.tamanho)} (${tr('{n} bytes', { n: info.tamanho.toLocaleString(localidade()) })})`),
      h('hr.sulco'),
      linha(tr('Criado em:'), dataHora(info.criado)),
      linha(tr('Modificado em:'), dataHora(info.modificado)),
    ),
    h('div.acoes.direita', h('button.padrao', { on: { click: () => j.fechar() } }, tr('OK'))),
  );
  ajustarAoConteudo(j, { minLarg: 330 });
}

export { nomeDe };
