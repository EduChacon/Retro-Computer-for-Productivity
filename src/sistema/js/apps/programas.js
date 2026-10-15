/*
 * Adicionar ou remover programas: o catálogo (os Craft), com instalar,
 * atualizar, remover e abrir; e a instalação a partir de um .zip baixado.
 */
import { h, img, tamanho } from '../util.js';
import { Janela, lista as janelas } from '../janelas.js';
import { registrarApp, estado, atualizarProgramas, abrir, abrirArquivo, avisar } from '../sistema.js';
import { confirmar, erro } from '../dialogos.js';
import { adicionarAtalho } from '../mesa.js';

class Programas {
  constructor(args = {}) {
    this.sel = null;
    this.ocupado = false;
    this.depois = args.depois || null;
    this.j = new Janela({
      id: 'programas',
      titulo: 'Adicionar ou remover programas',
      icone: 'programas-caixa',
      largura: 560,
      altura: 500,
      minLargura: 420,
      minAltura: 360,
    });
    this.listaEl = h('div.lista-arquivos', { style: { padding: '2px', flex: '1' } });
    this.btInstalar = h('button', { on: { click: () => this.instalar() } }, 'Instalar');
    this.btRemover = h('button', { on: { click: () => this.remover() } }, 'Remover');
    this.btAbrir = h('button', { on: { click: () => this.abrirSel() } }, 'Abrir');
    this.chkAtalho = h('input', { type: 'checkbox', checked: true });
    this.estadoEl = h('div', { style: { minHeight: '13px' } }, '');
    this.barra = h('div.progresso', { hidden: true }, h('div'));
    this.j.corpo.style.padding = '8px';
    this.j.corpo.append(
      h('div', { style: { display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '8px' } },
        img('programas-caixa', 32),
        h('div', { style: { lineHeight: '14px' } },
          'Para instalar um programa, selecione-o e clique em Instalar. Ele é baixado do lançamento oficial (a versão para navegador) e depois funciona sem internet.',
        )),
      this.listaEl,
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' } },
        h('label', this.chkAtalho, h('span', 'Criar atalho na área de trabalho')),
        h('div', { style: { flex: '1' } }),
        this.btAbrir, this.btRemover, this.btInstalar),
      h('div', { style: { marginTop: '8px' } }, this.estadoEl, this.barra),
      h('hr.sulco'),
      h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } },
        h('button', { on: { click: () => this.deArquivo() } }, 'Instalar de um arquivo .zip…'),
        h('div', { style: { flex: '1', color: '#808080', lineHeight: '12px' } }, 'Use para instalar um pacote "nome-web-versão.zip" já baixado.'),
        h('button', { on: { click: () => this.j.fechar() } }, 'Fechar')),
    );
    this.paraDeOuvir = retro.programas.aoProgresso((id, p) => this.progresso(id, p));
    this.j.ev.on('fechada', () => this.paraDeOuvir());
    this.carregar(args.instalar);
  }

  async carregar(selecionar) {
    await atualizarProgramas();
    const cats = new Map();
    for (const p of estado.catalogo) {
      if (!cats.has(p.categoria)) cats.set(p.categoria, []);
      cats.get(p.categoria).push(p);
    }
    const linhas = [];
    this.linhas = new Map();
    for (const [cat, progs] of cats) {
      linhas.push(h('div.grupo-cat', cat));
      for (const p of progs) {
        const inst = p.instalado;
        const det = inst ? `Instalado: versão ${inst.versao}` : `Não instalado${p.tamanho ? ` · cerca de ${p.tamanho}` : ''}`;
        const el = h('div.linha-programa', img(p.icone || 'programa', 32),
          h('div.info', h('div.nome', p.nome), h('div.desc', p.descricao), h('div.det', det)));
        el.addEventListener('mousedown', () => this.selecionar(p.id));
        el.addEventListener('dblclick', () => (p.instalado ? this.abrirSel() : this.instalar()));
        this.linhas.set(p.id, el);
        linhas.push(el);
      }
    }
    // Programas instalados de arquivo que não estão no catálogo.
    const extras = estado.instalados.filter((i) => !estado.catalogo.some((c) => c.id === i.id));
    if (extras.length) {
      linhas.push(h('div.grupo-cat', 'Instalados de arquivo'));
      for (const p of extras) {
        const el = h('div.linha-programa', img(p.icone || 'programa', 32), h('div.info', h('div.nome', p.nome), h('div.det', `Versão ${p.versao}`)));
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

  info(id) {
    return estado.catalogo.find((p) => p.id === id) || estado.instalados.find((p) => p.id === id) || null;
  }

  selecionar(id) {
    this.sel = id;
    for (const [k, el] of this.linhas || []) el.classList.toggle('sel', k === id);
    const p = this.info(id);
    const inst = p && (p.instalado || estado.instalados.find((x) => x.id === id));
    this.btInstalar.textContent = inst ? 'Atualizar' : 'Instalar';
    this.btInstalar.disabled = this.ocupado || !p || !p.repo;
    this.btRemover.disabled = this.ocupado || !inst;
    this.btAbrir.disabled = this.ocupado || !inst;
  }

  progresso(id, p) {
    if (id !== this.instalando) return;
    const nome = (this.info(id) || {}).nome || id;
    const barra = this.barra.firstChild;
    this.barra.hidden = false;
    if (p.etapa === 'versao') { this.estadoEl.textContent = `Procurando a versão mais recente do ${nome}…`; barra.style.width = '2%'; }
    if (p.etapa === 'baixando') {
      const pct = p.total ? Math.round((p.recebido / p.total) * 100) : 0;
      this.estadoEl.textContent = `Baixando o ${nome} ${p.versao}… ${tamanho(p.recebido)}${p.total ? ` de ${tamanho(p.total)}` : ''}`;
      barra.style.width = Math.max(3, Math.min(96, pct * 0.95)) + '%';
    }
    if (p.etapa === 'instalando') { this.estadoEl.textContent = `Instalando o ${nome} ${p.versao}…`; barra.style.width = '97%'; }
    if (p.etapa === 'pronto') { barra.style.width = '100%'; }
  }

  async instalar() {
    const p = this.info(this.sel);
    if (!p || this.ocupado) return;
    this.ocupado = true;
    this.instalando = p.id;
    this.selecionar(p.id);
    try {
      const r = await retro.programas.instalar(p.id);
      this.estadoEl.textContent = `${r.nome} ${r.versao} instalado.`;
      await atualizarProgramas();
      if (this.chkAtalho.checked) adicionarAtalho('craft:' + p.id);
      avisar('Programa instalado', `${r.nome} ${r.versao} está em Iniciar › Programas.`, { icone: p.icone, aoClicar: () => abrir('craft:' + p.id) });
      if (this.depois) {
        const rel = this.depois;
        this.depois = null;
        abrirArquivo(rel);
      }
    } catch (e) {
      this.estadoEl.textContent = 'A instalação não foi concluída.';
      erro(`Não foi possível instalar o ${p.nome}:\n${e.message}\n\nVerifique a conexão com a internet e tente de novo.`, 'Adicionar ou remover programas');
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
    const ok = await confirmar(`Deseja remover o ${p.nome}?\n\nOs documentos feitos com ele continuam no disco.`, { titulo: 'Remover programa' });
    if (!ok) return;
    // Fecha as janelas do programa antes.
    for (const j of janelas.slice()) if (j.icone === p.icone && j.titulo.includes(p.nome)) await j.fechar();
    try {
      await retro.programas.remover(p.id);
      this.estadoEl.textContent = `${p.nome} removido.`;
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
      this.estadoEl.textContent = `${r.nome} ${r.versao} instalado do arquivo.`;
      this.carregar(r.id);
    } catch (e) {
      erro(`Não foi possível instalar: ${e.message}`, 'Adicionar ou remover programas');
    }
  }
}

function abrirProgramas(args = {}) {
  const aberta = janelas.find((j) => j.id === 'programas');
  if (aberta) {
    aberta.focar();
    if (args.instalar && aberta.programas) aberta.programas.carregar(args.instalar);
    return aberta.programas;
  }
  const p = new Programas(args);
  p.j.programas = p;
  return p;
}

registrarApp('programas', { nome: 'Adicionar ou remover programas', icone: 'programas-caixa', abrir: abrirProgramas });
