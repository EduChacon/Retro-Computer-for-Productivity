/*
 * A aba "Programas do Linux" de Adicionar ou remover programas: a loja do Flathub.
 * Pesquisar, ver a ficha (a descrição, a captura, o tamanho), instalar, atualizar,
 * remover e abrir. Instala só para o usuário, sem senha (src/principal/loja.js).
 */
import { h, img, tamanho } from '../util.js';
import { abrir, abrirEndereco, avisar } from '../sistema.js';
import { confirmar, erro } from '../dialogos.js';
import { noMenu, alternarNoMenu } from '../nativos.js';
import { tr, marcar, idiomaAtual } from '../idioma.js';

// O que a lista mostra: os mais usados, cada categoria do Flathub, os instalados e as atualizações.
const VISTAS = [
  { valor: '', rotulo: marcar('Os mais usados') },
  { valor: 'office', rotulo: marcar('Escritório') },
  { valor: 'network', rotulo: marcar('Internet') },
  { valor: 'graphics', rotulo: marcar('Imagens e desenho') },
  { valor: 'audiovideo', rotulo: marcar('Som e vídeo') },
  { valor: 'education', rotulo: marcar('Educação') },
  { valor: 'game', rotulo: marcar('Jogos') },
  { valor: 'development', rotulo: marcar('Programação') },
  { valor: 'utility', rotulo: marcar('Acessórios') },
  { valor: 'science', rotulo: marcar('Ciência') },
  { valor: 'system', rotulo: marcar('Sistema') },
  { valor: ':instalados', rotulo: marcar('Instalados') },
  { valor: ':atualizacoes', rotulo: marcar('Com atualização') },
];

/** Uma imagem do Flathub (pedida ao processo principal, que a entrega pronta). */
function imagemRemota(url, tam, reserva = 'programa') {
  const el = img(reserva, tam);
  el.style.imageRendering = 'auto';
  if (url) retro.loja.imagem(url).then((d) => { if (d) el.src = d; }).catch(() => { });
  return el;
}

/** O ícone de um programa da lista: o da pesquisa ou, nos instalados (o flatpak não diz qual), o da ficha. */
function iconeDoPrograma(p) {
  if (p.icone) return imagemRemota(p.icone, 32);
  const el = img('programa', 32);
  el.style.imageRendering = 'auto';
  retro.loja.detalhes(p.id, idiomaAtual()).then((f) => f.icone && retro.loja.imagem(f.icone)).then((d) => { if (d) el.src = d; }).catch(() => { });
  return el;
}

export class AbaLinux {
  constructor() {
    this.el = h('div.aba-linux');
    this.sel = null;
    this.itens = [];
    this.instalados = new Map();
    this.comAtualizacao = new Set();
    this.ocupado = null; // o id que está sendo instalado, atualizado ou removido
    this.montado = false;
  }

  /** Monta na primeira vez que a aba aparece (sem flatpak, a explicação de como instalar). */
  async mostrar() {
    if (this.montado) return;
    this.montado = true;
    this.el.replaceChildren(h('div.loja-vazia', tr('Carregando…')));
    const info = await retro.loja.info().catch(() => ({}));
    if (!info.flatpak) return this.semFlatpak();
    this.montar();
    this.paraDeOuvir = retro.loja.aoAndamento((id, a) => this.andamento(id, a));
    await this.lerInstalados();
    this.carregar();
    // A busca das atualizações pergunta ao Flathub por cada instalado: fica para depois.
    retro.loja.atualizacoes().then((l) => { this.comAtualizacao = new Set(l); this.desenharLista(); this.selecionar(this.sel); }).catch(() => { });
  }

  fechar() {
    if (this.paraDeOuvir) this.paraDeOuvir();
  }

  semFlatpak() {
    this.el.replaceChildren(h('div.loja-sem',
      img('programas-caixa', 32),
      h('div',
        h('b', tr('A loja precisa do Flatpak')),
        h('p', tr('Os programas do Linux vêm do Flathub (flathub.org) e são instalados pelo Flatpak, que ainda não está neste computador. Para instalá-lo uma vez, abra o Prompt de comando e digite a senha de administrador quando ele pedir.')),
        h('div.cxb-botoes',
          h('button', { on: { click: () => abrir('prompt', { comando: 'sudo apt install -y flatpak', titulo: tr('Instalar o Flatpak') }) } }, tr('Instalar o Flatpak…')),
          h('button', { on: { click: () => { this.montado = false; this.mostrar(); } } }, tr('Verificar de novo'))))));
  }

  montar() {
    this.campo = h('input', { type: 'search', spellcheck: false, placeholder: tr('Pesquisar programas do Linux') });
    this.campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.carregar(); });
    this.selVista = h('select', ...VISTAS.map((v) => h('option', { value: v.valor }, tr(v.rotulo))));
    this.selVista.addEventListener('change', () => { this.campo.value = ''; this.carregar(); });
    this.listaEl = h('div.loja-lista', { tabIndex: 0 });
    this.listaEl.addEventListener('keydown', (e) => {
      const i = this.itens.findIndex((x) => x.id === this.sel);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const n = this.itens[Math.max(0, Math.min(this.itens.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))];
        if (n) this.selecionar(n.id, true);
      }
    });
    this.fichaEl = h('div.loja-ficha');
    this.estadoEl = h('div.loja-estado');
    this.barra = h('div.progresso', { hidden: true }, h('div'));
    this.btSite = h('button', { disabled: true, on: { click: () => this.ficha && this.ficha.site && abrirEndereco(this.ficha.site) } }, tr('Página do programa'));
    this.btAbrir = h('button', { disabled: true, on: { click: () => retro.loja.abrir(this.sel) } }, tr('Abrir'));
    this.btRemover = h('button', { disabled: true, on: { click: () => this.remover() } }, tr('Remover'));
    this.btInstalar = h('button', { disabled: true, on: { click: () => this.instalar() } }, tr('Instalar'));
    this.btCancelar = h('button', { hidden: true, on: { click: () => retro.loja.cancelar() } }, tr('Cancelar'));
    this.el.replaceChildren(
      h('div.loja-topo',
        this.campo,
        h('button', { on: { click: () => this.carregar() } }, tr('Pesquisar')),
        h('div.select-caixa', this.selVista)),
      h('div.loja-meio', this.listaEl, this.fichaEl),
      h('div', this.estadoEl, this.barra),
      h('div.loja-botoes', this.btSite, h('div', { style: { flex: '1' } }), this.btCancelar, this.btAbrir, this.btRemover, this.btInstalar),
      h('div.loja-nota', tr('Os programas vêm do Flathub (flathub.org), a loja livre do Linux, e são instalados só para você, sem a senha de administrador. Eles aparecem em Iniciar › Programas do computador.')));
  }

  async lerInstalados() {
    const l = await retro.loja.instalados().catch(() => []);
    this.instalados = new Map(l.map((x) => [x.id, x]));
  }

  /** Busca a lista da vista escolhida (ou o que foi digitado). */
  async carregar() {
    const termo = this.campo.value.trim();
    const vista = this.selVista.value;
    this.listaEl.replaceChildren(h('div.loja-vazia', termo ? tr('Pesquisando…') : tr('Carregando…')));
    try {
      if (!termo && vista === ':instalados') {
        this.itens = [...this.instalados.values()].map((x) => ({ id: x.id, nome: x.nome, resumo: tr('Versão {versao}', { versao: x.versao }), icone: null }));
      } else if (!termo && vista === ':atualizacoes') {
        this.itens = [...this.instalados.values()].filter((x) => this.comAtualizacao.has(x.id)).map((x) => ({ id: x.id, nome: x.nome, resumo: tr('Versão {versao}', { versao: x.versao }), icone: null }));
      } else {
        this.itens = await retro.loja.buscar({ termo, categoria: vista.startsWith(':') ? '' : vista, idioma: idiomaAtual() });
      }
    } catch {
      this.itens = [];
      this.listaEl.replaceChildren(h('div.loja-vazia', tr('Não foi possível falar com o Flathub. Verifique a conexão com a internet.')));
      return;
    }
    this.desenharLista();
    this.selecionar(this.itens[0] ? this.itens[0].id : null);
  }

  desenharLista() {
    if (!this.listaEl) return;
    if (!this.itens.length) {
      this.listaEl.replaceChildren(h('div.loja-vazia', tr('Nenhum programa encontrado.')));
      return;
    }
    this.listaEl.replaceChildren(...this.itens.map((p) => {
      const inst = this.instalados.get(p.id);
      const marca = inst ? (this.comAtualizacao.has(p.id) ? tr('Atualização disponível') : tr('Instalado')) : '';
      const el = h('div.loja-item' + (p.id === this.sel ? '.sel' : ''), { dataset: { id: p.id } },
        iconeDoPrograma(p),
        h('div.info', h('div.nome', p.nome), h('div.desc', p.resumo), marca ? h('div.det' + (inst && this.comAtualizacao.has(p.id) ? '.nova' : ''), marca) : null));
      el.addEventListener('mousedown', () => this.selecionar(p.id));
      el.addEventListener('dblclick', () => (inst ? retro.loja.abrir(p.id) : this.instalar()));
      return el;
    }));
  }

  /** Escolhe um programa e mostra a ficha dele, com os botões que valem. */
  async selecionar(id, rolar) {
    this.sel = id;
    for (const el of this.listaEl.children) el.classList.toggle('sel', el.dataset.id === id);
    if (rolar) { const el = [...this.listaEl.children].find((x) => x.dataset.id === id); if (el) el.scrollIntoView({ block: 'nearest' }); }
    this.botoes();
    if (!id) { this.fichaEl.replaceChildren(); this.ficha = null; return; }
    const p = this.itens.find((x) => x.id === id) || { id, nome: id };
    this.fichaEl.replaceChildren(h('div.ficha-topo', imagemRemota(p.icone, 32), h('div', h('b', p.nome), h('div', p.resumo || ''))), h('div.loja-vazia', tr('Carregando…')));
    let f;
    try {
      f = await retro.loja.detalhes(id, idiomaAtual());
    } catch {
      if (this.sel === id) this.fichaEl.lastChild.textContent = tr('A ficha do programa não pôde ser lida.');
      return;
    }
    if (this.sel !== id) return;
    this.ficha = f;
    const dados = [
      f.desenvolvedor && tr('De: {quem}', { quem: f.desenvolvedor }),
      f.versao && tr('Versão {versao}', { versao: f.versao }),
      f.licenca && (f.livre ? tr('Licença livre: {licenca}', { licenca: f.licenca }) : tr('Licença: {licenca}', { licenca: f.licenca })),
      f.baixar && tr('Para baixar: {tamanho} · Ocupa: {ocupa}', { tamanho: tamanho(f.baixar), ocupa: tamanho(f.ocupa) }),
    ].filter(Boolean);
    this.fichaEl.replaceChildren(
      h('div.ficha-topo', imagemRemota(f.icone, 32), h('div', h('b', f.nome), h('div', f.resumo))),
      h('div.ficha-dados', ...dados.map((d) => h('div', d))),
      f.captura ? h('div.ficha-captura', imagemRemota(f.captura, 32, 'imagem')) : null,
      ...f.descricao.map((p) => h('p', p)));
    // A captura no tamanho dela (a reserva é um ícone de 32 pontos).
    const cap = this.fichaEl.querySelector('.ficha-captura img');
    if (cap) { cap.removeAttribute('width'); cap.removeAttribute('height'); }
    this.botoes();
  }

  botoes() {
    const inst = this.sel && this.instalados.get(this.sel);
    const nova = inst && this.comAtualizacao.has(this.sel);
    const ocupado = !!this.ocupado;
    this.btInstalar.textContent = nova ? tr('Atualizar') : tr('Instalar');
    this.btInstalar.disabled = ocupado || !this.sel || (inst && !nova);
    this.btRemover.disabled = ocupado || !inst;
    this.btAbrir.disabled = ocupado || !inst;
    this.btSite.disabled = !(this.ficha && this.ficha.site && this.ficha.id === this.sel);
    this.btCancelar.hidden = !ocupado;
  }

  andamento(id, a) {
    if (id !== this.ocupado) return;
    const barra = this.barra.firstChild;
    this.barra.hidden = false;
    // Sem a porcentagem, a barra anda por passo (o runtime antes, o programa depois).
    const base = a.passos ? ((a.passo - 1) / a.passos) * 100 : 0;
    const pct = a.pct != null ? base + a.pct / (a.passos || 1) : base + 5;
    barra.style.width = Math.max(3, Math.min(99, Math.round(pct))) + '%';
    if (a.passos > 1) {
      const v = { programa: this.acao.nome, n: a.passo, total: a.passos };
      this.estadoEl.textContent = this.acao.tipo === 'atualizar' ? tr('Atualizando o {programa} (parte {n} de {total})…', v)
        : this.acao.tipo === 'remover' ? tr('Removendo o {programa} (parte {n} de {total})…', v)
          : tr('Instalando o {programa} (parte {n} de {total})…', v);
    }
  }

  /** Instala (ou atualiza) o programa escolhido. */
  async instalar() {
    const id = this.sel;
    if (!id || this.ocupado) return;
    const nome = (this.ficha && this.ficha.id === id && this.ficha.nome) || (this.itens.find((x) => x.id === id) || {}).nome || id;
    const atualizar = this.instalados.has(id);
    this.ocupado = id;
    this.acao = { tipo: atualizar ? 'atualizar' : 'instalar', nome };
    this.estadoEl.textContent = atualizar ? tr('Atualizando o {programa}…', { programa: nome }) : tr('Instalando o {programa}…', { programa: nome });
    this.botoes();
    try {
      if (atualizar) await retro.loja.atualizar(id);
      else await retro.loja.instalar(id);
      await this.lerInstalados();
      this.comAtualizacao.delete(id);
      this.estadoEl.textContent = atualizar ? tr('{programa} atualizado.', { programa: nome }) : tr('{programa} instalado.', { programa: nome });
      // O programa novo entra no menu Iniciar › Programas do computador.
      const lancador = this.ficha && this.ficha.id === id && this.ficha.lancador;
      if (!atualizar && lancador && !noMenu().includes(lancador)) await alternarNoMenu(lancador, nome).catch(() => { });
      if (!atualizar) avisar(tr('Programa instalado'), tr('{programa} está em Iniciar › Programas do computador. Clique para abrir.', { programa: nome }), { icone: 'programas-caixa', aoClicar: () => retro.loja.abrir(id) });
    } catch (e) {
      this.estadoEl.textContent = e.message === 'cancelado' ? tr('Cancelado.') : tr('A instalação não foi concluída.');
      if (e.message !== 'cancelado') erro(tr('Não foi possível instalar o {programa}:\n{erro}', { programa: nome, erro: e.message }), tr('Adicionar ou remover programas'));
    } finally {
      this.ocupado = null;
      setTimeout(() => { this.barra.hidden = true; }, 1200);
      this.desenharLista();
      this.botoes();
    }
  }

  async remover() {
    const id = this.sel;
    const inst = id && this.instalados.get(id);
    if (!inst || this.ocupado) return;
    const nome = inst.nome || id;
    if (!(await confirmar(tr('Deseja remover o {programa}?\n\nOs arquivos que você fez com ele continuam onde estão.', { programa: nome }), { titulo: tr('Remover programa') }))) return;
    this.ocupado = id;
    this.acao = { tipo: 'remover', nome };
    this.estadoEl.textContent = tr('Removendo o {programa}…', { programa: nome });
    this.botoes();
    try {
      await retro.loja.remover(id);
      await this.lerInstalados();
      const lancador = this.ficha && this.ficha.id === id && this.ficha.lancador;
      if (lancador && noMenu().includes(lancador)) await alternarNoMenu(lancador, nome).catch(() => { });
      this.estadoEl.textContent = tr('{programa} removido.', { programa: nome });
      if (this.selVista.value === ':instalados') return this.carregar();
    } catch (e) {
      this.estadoEl.textContent = '';
      if (e.message !== 'cancelado') erro(tr('Não foi possível remover o {programa}:\n{erro}', { programa: nome, erro: e.message }), tr('Adicionar ou remover programas'));
    } finally {
      this.ocupado = null;
      setTimeout(() => { this.barra.hidden = true; }, 1200);
      this.desenharLista();
      this.botoes();
    }
  }
}
