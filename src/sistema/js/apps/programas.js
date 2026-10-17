/*
 * Adicionar ou remover programas: o catálogo (os Craft), com instalar,
 * atualizar, remover e abrir; a instalação a partir de um .zip baixado; e
 * a escolha de como os programas se atualizam ao abrir. No Linux, a segunda
 * aba é a loja dos programas do Linux (o Flathub, em loja.js).
 */
import { h, img, tamanho, rotulo } from '../util.js';
import { Janela, lista as janelas } from '../janelas.js';
import { registrarApp, estado, atualizarProgramas, abrir, abrirArquivo, avisar, definirConfig, instalado } from '../sistema.js';
import { confirmar, erro } from '../dialogos.js';
import { adicionarAtalho } from '../mesa.js';
import { tr, idiomaAtual } from '../idioma.js';
import { AbaLoja, nomeDaLoja } from './loja.js';

/** Um texto do catálogo no idioma atual ({ "pt-BR": …, "en": …, "es": … } ou texto simples). */
export function doCatalogo(v) {
  if (!v || typeof v === 'string') return v || '';
  return v[idiomaAtual()] || v['pt-BR'] || v.en || '';
}

class Programas {
  constructor(args = {}) {
    this.sel = null;
    this.ocupado = false;
    this.depois = args.depois || null;
    this.atualizacoes = new Map(); // id → versão nova
    this.j = new Janela({
      id: 'programas',
      titulo: tr('Adicionar ou remover programas'),
      icone: 'programas-caixa',
      largura: 580,
      altura: 540,
      minLargura: 440,
      minAltura: 380,
    });
    this.listaEl = h('div.lista-arquivos', { style: { padding: '2px', flex: '1' } });
    this.btInstalar = h('button', { on: { click: () => this.instalar() } }, tr('Instalar'));
    this.btRemover = h('button', { on: { click: () => this.remover() } }, tr('Remover'));
    this.btAbrir = h('button', { on: { click: () => this.abrirSel() } }, tr('Abrir'));
    this.chkAtalho = h('input', { type: 'checkbox', checked: true });
    this.estadoEl = h('div', { style: { minHeight: '13px' } }, '');
    this.barra = h('div.progresso', { hidden: true }, h('div'));
    this.selModo = h('select',
      h('option', { value: 'automatico' }, tr('atualizar sozinhos')),
      h('option', { value: 'perguntar' }, tr('perguntar antes de atualizar')),
      h('option', { value: 'nunca' }, tr('não procurar atualizações')));
    this.selModo.value = (estado.config && estado.config.atualizacoes) || 'automatico';
    this.selModo.addEventListener('change', () => definirConfig({ atualizacoes: this.selModo.value }));
    this.btProcurar = h('button', { on: { click: () => this.procurar(true) } }, tr('Procurar atualizações'));
    this.j.corpo.style.padding = '8px';
    const abaRetro = h('div.aba-programas');
    abaRetro.append(
      h('div', { style: { display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '8px' } },
        img('programas-caixa', 32),
        h('div', { style: { lineHeight: '14px' } },
          tr('Para instalar um programa, selecione-o e clique em Instalar. Ele é baixado do lançamento oficial (a versão para navegador) e depois funciona sem internet.'),
        )),
      this.listaEl,
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' } },
        h('label', this.chkAtalho, h('span', tr('Criar atalho na área de trabalho'))),
        h('div', { style: { flex: '1' } }),
        this.btAbrir, this.btRemover, this.btInstalar),
      h('div', { style: { marginTop: '8px' } }, this.estadoEl, this.barra),
      h('hr.sulco'),
      h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } },
        h('span', tr('Ao abrir um programa:')),
        h('div.select-caixa', { style: { flex: '1' } }, this.selModo),
        this.btProcurar),
      h('hr.sulco'),
      h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } },
        h('button', { on: { click: () => this.deArquivo() } }, tr('Instalar de um arquivo .zip…')),
        h('div', { style: { flex: '1', color: 'var(--texto-fraco)', lineHeight: '12px' } }, tr('Para instalar um pacote "nome-web-versão.zip" já baixado.')),
        h('button', { on: { click: () => this.j.fechar() } }, tr('Fechar'))),
    );
    // As abas: os programas recomendados (os Craft) e a loja do computador (o Flathub no Linux,
    // o winget no Windows, o Homebrew no Mac).
    this.linux = new AbaLoja();
    this.abasEl = h('div.abas', { hidden: true });
    this.painelEl = h('div.programas-painel', abaRetro, this.linux.el);
    let abas = [tr('Programas recomendados'), tr('Programas do computador')];
    this.mostrarAba = (i) => {
      this.aba = i;
      this.abasEl.replaceChildren(...abas.map((t, k) => {
        const el = h('div' + (k === i ? '.ativa' : ''), t);
        el.addEventListener('mousedown', () => this.mostrarAba(k));
        return el;
      }));
      abaRetro.hidden = i !== 0;
      this.linux.el.hidden = i !== 1;
      if (i === 1) this.linux.mostrar();
    };
    this.linux.el.hidden = true;
    this.j.corpo.append(this.abasEl, this.painelEl);
    retro.loja.info().then((info) => {
      if (!info.loja) return;
      abas = [tr('Programas recomendados'), nomeDaLoja(info)];
      this.abasEl.hidden = false;
      this.painelEl.classList.add('com-abas');
      this.mostrarAba(args.aba === 'loja' || args.aba === 'linux' ? 1 : 0);
    }).catch(() => { });
    this.paraDeOuvir = retro.programas.aoProgresso((id, p) => this.progresso(id, p));
    this.j.ev.on('fechada', () => { this.paraDeOuvir(); this.linux.fechar(); });
    this.carregar(args.instalar).then(() => this.procurar(false));
  }

  async carregar(selecionar) {
    await atualizarProgramas();
    const cats = new Map();
    for (const p of estado.catalogo) {
      const cat = doCatalogo(p.categoria);
      if (!cats.has(cat)) cats.set(cat, []);
      cats.get(cat).push(p);
    }
    const linhas = [];
    this.linhas = new Map();
    for (const [cat, progs] of cats) {
      linhas.push(h('div.grupo-cat', cat));
      for (const p of progs) {
        const inst = p.instalado;
        const nova = this.atualizacoes.get(p.id);
        let det;
        if (inst && nova) det = tr('Instalado: versão {versao} · atualização disponível: {nova}', { versao: inst.versao, nova });
        else if (inst) det = tr('Instalado: versão {versao}', { versao: inst.versao });
        else det = p.tamanho ? tr('Não instalado · cerca de {tamanho}', { tamanho: p.tamanho }) : tr('Não instalado');
        const detEl = h('div.det', det);
        if (nova) detEl.style.color = 'var(--sucesso)';
        const el = h('div.linha-programa', img(p.icone || 'programa', 32),
          h('div.info', h('div.nome', p.nome), h('div.desc', doCatalogo(p.descricao)), detEl));
        el.addEventListener('mousedown', () => this.selecionar(p.id));
        el.addEventListener('dblclick', () => (p.instalado ? this.abrirSel() : this.instalar()));
        this.linhas.set(p.id, el);
        linhas.push(el);
      }
    }
    // Programas instalados de arquivo que não estão no catálogo.
    const extras = estado.instalados.filter((i) => !estado.catalogo.some((c) => c.id === i.id));
    if (extras.length) {
      linhas.push(h('div.grupo-cat', tr('Instalados de arquivo')));
      for (const p of extras) {
        const el = h('div.linha-programa', img(p.icone || 'programa', 32), h('div.info', h('div.nome', p.nome), h('div.det', tr('Versão {versao}', { versao: p.versao }))));
        el.addEventListener('mousedown', () => this.selecionar(p.id));
        el.addEventListener('dblclick', () => this.abrirSel());
        this.linhas.set(p.id, el);
        linhas.push(el);
      }
    }
    this.listaEl.replaceChildren(...linhas);
    this.selecionar(selecionar || this.sel || (estado.catalogo[0] && estado.catalogo[0].id));
    if (selecionar && this.linhas.get(selecionar)) this.linhas.get(selecionar).scrollIntoView({ block: 'nearest' });
  }

  /** Procura as versões novas dos programas instalados (forçar: sem esperar as 6 horas). */
  async procurar(forcar) {
    if (!estado.instalados.length) {
      if (forcar) this.estadoEl.textContent = tr('Nenhum programa instalado.');
      return;
    }
    this.btProcurar.disabled = true;
    if (forcar) this.estadoEl.textContent = tr('Procurando atualizações…');
    try {
      const lista = await retro.programas.verificarTodos({ forcar });
      this.atualizacoes = new Map(lista.filter((v) => v.temAtualizacao).map((v) => [v.id, v.nova]));
      if (forcar) {
        this.estadoEl.textContent = this.atualizacoes.size
          ? tr('{n} atualização(ões) disponível(is).', { n: this.atualizacoes.size })
          : tr('Todos os programas estão na versão mais recente.');
      }
      await this.carregar(this.sel);
    } catch {
      if (forcar) this.estadoEl.textContent = tr('Não foi possível procurar atualizações (sem internet?).');
    } finally {
      this.btProcurar.disabled = false;
    }
  }

  info(id) {
    return estado.catalogo.find((p) => p.id === id) || estado.instalados.find((p) => p.id === id) || null;
  }

  selecionar(id) {
    this.sel = id;
    for (const [k, el] of this.linhas || []) el.classList.toggle('sel', k === id);
    const p = this.info(id);
    const inst = p && (p.instalado || estado.instalados.find((x) => x.id === id));
    this.btInstalar.textContent = inst ? tr('Atualizar') : tr('Instalar');
    this.btInstalar.disabled = this.ocupado || !p || !p.repo;
    this.btRemover.disabled = this.ocupado || !inst;
    this.btAbrir.disabled = this.ocupado || !inst;
  }

  progresso(id, p) {
    if (id !== this.instalando) return;
    const nome = (this.info(id) || {}).nome || id;
    const barra = this.barra.firstChild;
    this.barra.hidden = false;
    if (p.etapa === 'versao') { this.estadoEl.textContent = tr('Procurando a versão mais recente do {programa}…', { programa: nome }); barra.style.width = '2%'; }
    if (p.etapa === 'baixando') {
      const pct = p.total ? Math.round((p.recebido / p.total) * 100) : 0;
      this.estadoEl.textContent = p.total
        ? tr('Baixando o {programa} {versao}… {recebido} de {total}', { programa: nome, versao: p.versao, recebido: tamanho(p.recebido), total: tamanho(p.total) })
        : tr('Baixando o {programa} {versao}… {recebido}', { programa: nome, versao: p.versao, recebido: tamanho(p.recebido) });
      barra.style.width = Math.max(3, Math.min(96, pct * 0.95)) + '%';
    }
    if (p.etapa === 'instalando') { this.estadoEl.textContent = tr('Instalando o {programa} {versao}…', { programa: nome, versao: p.versao }); barra.style.width = '97%'; }
    if (p.etapa === 'pronto') { barra.style.width = '100%'; }
  }

  async instalar() {
    const p = this.info(this.sel);
    if (!p || this.ocupado) return;
    this.ocupado = true;
    this.instalando = p.id;
    this.selecionar(p.id);
    try {
      const r = await retro.programas.instalar(p.id, { atualizar: !!instalado(p.id) });
      this.estadoEl.textContent = tr('{programa} {versao} instalado.', { programa: r.nome, versao: r.versao });
      this.atualizacoes.delete(p.id);
      await atualizarProgramas();
      if (this.chkAtalho.checked) adicionarAtalho('craft:' + p.id);
      avisar(tr('Programa instalado'), tr('{programa} {versao} está em Iniciar › Programas.', { programa: r.nome, versao: r.versao }), { icone: p.icone, aoClicar: () => abrir('craft:' + p.id) });
      if (this.depois) {
        const rel = this.depois;
        this.depois = null;
        abrirArquivo(rel);
      }
    } catch (e) {
      if (e.codigo === 'sem-novidade') {
        this.estadoEl.textContent = e.message;
        this.atualizacoes.delete(p.id);
        return;
      }
      this.estadoEl.textContent = tr('A instalação não foi concluída.');
      erro(tr('Não foi possível instalar o {programa}:\n{erro}\n\nVerifique a conexão com a internet e tente de novo.', { programa: p.nome, erro: e.message }), tr('Adicionar ou remover programas'));
    } finally {
      this.ocupado = false;
      this.instalando = null;
      setTimeout(() => { this.barra.hidden = true; }, 1200);
      this.carregar(p.id);
    }
  }

  async remover() {
    const p = this.info(this.sel);
    if (!p) return;
    const ok = await confirmar(tr('Deseja remover o {programa}?\n\nOs documentos feitos com ele continuam no disco.', { programa: p.nome }), { titulo: tr('Remover programa') });
    if (!ok) return;
    // Fecha as janelas do programa antes.
    for (const j of janelas.slice()) if (j.icone === p.icone && j.titulo.includes(p.nome)) await j.fechar();
    try {
      await retro.programas.remover(p.id);
      this.estadoEl.textContent = tr('{programa} removido.', { programa: p.nome });
    } catch (e) {
      erro(e.message);
    }
    this.carregar(p.id);
  }

  abrirSel() {
    if (this.sel) abrir('craft:' + this.sel);
  }

  async deArquivo() {
    try {
      const r = await retro.programas.instalarArquivo();
      if (!r) return;
      await atualizarProgramas();
      if (this.chkAtalho.checked) adicionarAtalho('craft:' + r.id);
      this.estadoEl.textContent = tr('{programa} {versao} instalado do arquivo.', { programa: r.nome, versao: r.versao });
      this.carregar(r.id);
    } catch (e) {
      erro(tr('Não foi possível instalar: {erro}', { erro: e.message }), tr('Adicionar ou remover programas'));
    }
  }
}

function abrirProgramas(args = {}) {
  const aberta = janelas.find((j) => j.id === 'programas');
  if (aberta) {
    aberta.focar();
    if (args.instalar && aberta.programas) aberta.programas.carregar(args.instalar);
    if ((args.aba === 'loja' || args.aba === 'linux') && aberta.programas && !aberta.programas.abasEl.hidden) aberta.programas.mostrarAba(1);
    return aberta.programas;
  }
  const p = new Programas(args);
  p.j.programas = p;
  return p;
}

/**
 * Na abertura do sistema: procura as versões novas em segundo plano e, no modo
 * automático, já atualiza os programas que não estão abertos.
 */
export async function atualizarEmSegundoPlano(abertosAgora = () => []) {
  const modo = (estado.config && estado.config.atualizacoes) || 'automatico';
  if (modo === 'nunca' || !estado.instalados.length) return;
  let lista = [];
  try { lista = (await retro.programas.verificarTodos({})).filter((v) => v.temAtualizacao); } catch { return; }
  if (!lista.length) return;
  if (modo === 'perguntar') {
    avisar(tr('Atualizações disponíveis'), tr('{n} programa(s) com versão nova. Clique para ver.', { n: lista.length }), { aoClicar: () => abrir('programas'), ms: 12000 });
    return;
  }
  const feitos = [];
  for (const v of lista) {
    if (abertosAgora().includes(v.id)) continue;
    try {
      const r = await retro.programas.instalar(v.id, { atualizar: true });
      feitos.push(`${r.nome} ${r.versao}`);
    } catch { }
  }
  if (feitos.length) {
    await atualizarProgramas();
    avisar(tr('Programas atualizados'), feitos.join(', '), { som: null, ms: 9000 });
  }
}

registrarApp('programas', { nome: 'Adicionar ou remover programas', icone: 'programas-caixa', abrir: abrirProgramas });
export { rotulo };
