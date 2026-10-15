/*
 * As janelas de pasta (o explorador do disco), Meu computador e a Lixeira.
 *   pasta '::computador'  Meu computador (o disco C:, o Painel de controle, a Lixeira)
 *   pasta '::lixeira'     a Lixeira
 *   qualquer outra        uma pasta do disco ('' é a raiz C:\)
 */
import { h, img, tipoDe, caminhoTela, caminhoInterno, nomeDe, paiDe, tamanho, dataHora, rotulo } from '../util.js';
import { Janela, lista as janelas } from '../janelas.js';
import { VistaIcones } from '../vista.js';
import { abrirMenu } from '../menus.js';
import { registrarApp, abrir, abrirArquivo, estado, definirConfig } from '../sistema.js';
import { menuDeItens, menuDoFundo, editarRotulo, renomear, excluir, novaPasta, novoTexto, copiarItens, colar, transferencia } from '../arquivos.js';
import { erro, confirmar, propriedades, mensagem } from '../dialogos.js';
import { esvaziarLixeira } from '../mesa.js';
import { tocar } from '../sons.js';

const ESPECIAIS = {
  '::computador': { titulo: 'Meu computador', icone: 'computador' },
  '::lixeira': { titulo: 'Lixeira', icone: 'lixeira' },
};

function tituloDe(pasta) {
  if (ESPECIAIS[pasta]) return ESPECIAIS[pasta].titulo;
  if (!pasta) return 'C:\\';
  return nomeDe(pasta);
}

function iconeDe(pasta, cheia) {
  if (pasta === '::lixeira') return cheia ? 'lixeira-cheia' : 'lixeira';
  if (ESPECIAIS[pasta]) return ESPECIAIS[pasta].icone;
  if (!pasta) return 'disco';
  if (pasta === 'Meus documentos') return 'documentos';
  return 'pasta-aberta';
}

class Explorador {
  constructor({ pasta = '::computador', selecionar } = {}) {
    this.pasta = pasta;
    this.historico = [];
    this.adiante = [];
    this.ordem = 'nome';
    const c = estado.config || {};
    this.modo = (c.explorador && c.explorador.modo) || 'icones';
    this.j = new Janela({
      id: 'explorador',
      titulo: tituloDe(pasta),
      icone: iconeDe(pasta),
      largura: 520,
      altura: 340,
      status: [{ texto: '', largura: 160, fixo: true }, ''],
      menus: this.menus(),
    });
    this.endereco = h('input', { type: 'text', spellcheck: false, style: { flex: '1' } });
    this.endereco.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this.irPara(this.endereco.value); }
    });
    this.btVoltar = h('button.ferramenta', { title: 'Voltar (Backspace)', on: { click: () => this.voltar() } }, img('pasta-aberta', 16), 'Voltar');
    this.btAcima = h('button.ferramenta', { title: 'Subir um nível', on: { click: () => this.subir() } }, h('span', { style: { fontWeight: 'bold' } }, '↑'), 'Acima');
    const btVista = h('button.ferramenta', { title: 'Exibir', dataset: { abreMenu: '1' } }, img('imagens', 16), 'Exibir');
    btVista.addEventListener('click', () => {
      const r = btVista.getBoundingClientRect();
      abrirMenu(this.itensExibir(), { x: r.left, y: r.bottom });
    });
    const ferramentas = h('div.barra-ferramentas',
      this.btVoltar, this.btAcima, h('div.sep'),
      h('span', 'Endereço'), this.endereco, h('div.sep'), btVista);
    this.area = h('div.lista-arquivos', { style: { flex: '1' } });
    this.j.corpo.append(ferramentas, this.area);
    this.vista = new VistaIcones(this.area, {
      modo: this.modo,
      colunas: ['Nome', 'Tamanho', 'Tipo', 'Modificado'],
      aoAbrir: (it) => this.abrirItem(it),
      aoMenu: (sel, e) => this.menu(sel, e),
      aoRenomear: (it) => this.renomearItem(it),
      aoExcluir: (itens) => this.excluirItens(itens),
      aoSelecionar: () => this.atualizarStatus(),
    });
    this.area.addEventListener('keydown', (e) => this.atalhos(e));
    this.paraDeOuvir = retro.disco.aoMudar((pastas) => {
      if (pastas.includes(this.pasta) || (this.pasta === '::lixeira' && pastas.includes('::lixeira')) || this.pasta === '::computador') this.carregar();
    });
    this.j.ev.on('fechada', () => this.paraDeOuvir());
    this.j.ev.on('ativada', () => setTimeout(() => { if (!this.j.el.contains(document.activeElement)) this.vista.focoNoRaiz(); }, 0));
    this.carregar(selecionar);
  }

  menus() {
    return [
      {
        rotulo: '&Arquivo', itens: () => {
          const sel = this.vista ? this.vista.selecionados() : [];
          const doDisco = !this.pasta.startsWith('::');
          const itens = [];
          if (this.pasta === '::lixeira') {
            itens.push({ rotulo: '&Restaurar', desativado: !sel.length, acao: () => this.restaurar(sel) });
            itens.push({ rotulo: '&Esvaziar Lixeira', acao: esvaziarLixeira });
            itens.push({ separador: true });
          } else if (doDisco) {
            if (sel.length) itens.push(...menuDeItens(sel.filter((s) => s.rel), { aoRenomear: (it) => this.renomearItem(it) }), { separador: true });
            itens.push({ rotulo: '&Novo', sub: [
              { rotulo: '&Pasta', icone: 'pasta', acao: () => this.criar('pasta') },
              { separador: true },
              { rotulo: '&Documento de texto', icone: 'texto', acao: () => this.criar('texto') },
            ] });
            itens.push({ rotulo: '&Trazer do computador principal…', acao: () => retro.disco.importarEscolhendo(this.pasta).catch((e) => erro(e.message)) });
            itens.push({ separador: true });
          }
          itens.push({ rotulo: '&Fechar', acao: () => this.j.fechar() });
          return itens;
        },
      },
      {
        rotulo: '&Editar', itens: () => {
          const sel = this.vista ? this.vista.selecionados().filter((s) => s.rel) : [];
          const doDisco = !this.pasta.startsWith('::');
          return [
            { rotulo: 'Recor&tar', atalho: 'Ctrl+X', desativado: !doDisco || !sel.length, acao: () => copiarItens(sel.map((s) => s.rel), true) },
            { rotulo: '&Copiar', atalho: 'Ctrl+C', desativado: !doDisco || !sel.length, acao: () => copiarItens(sel.map((s) => s.rel), false) },
            { rotulo: 'C&olar', atalho: 'Ctrl+V', desativado: !doDisco || !transferencia.rels.length, acao: () => colar(this.pasta) },
            { separador: true },
            { rotulo: 'Selecionar &tudo', atalho: 'Ctrl+A', acao: () => this.vista.selecionar(this.vista.itens.map((_, i) => i)) },
            { rotulo: '&Inverter seleção', acao: () => this.vista.selecionar(this.vista.itens.map((_, i) => i).filter((i) => !this.vista.sel.has(i))) },
          ];
        },
      },
      { rotulo: '&Exibir', itens: () => this.itensExibir() },
      {
        rotulo: '&Ir', itens: () => [
          { rotulo: '&Voltar', atalho: 'Backspace', desativado: !this.historico.length, acao: () => this.voltar() },
          { rotulo: '&Avançar', desativado: !this.adiante.length, acao: () => this.avancar() },
          { rotulo: 'A&cima', desativado: this.pasta === '::computador', acao: () => this.subir() },
          { separador: true },
          { rotulo: '&Meu computador', icone: 'computador', acao: () => this.navegar('::computador') },
          { rotulo: '&Disco C:', icone: 'disco', acao: () => this.navegar('') },
          { rotulo: 'Meus &documentos', icone: 'documentos', acao: () => this.navegar('Meus documentos') },
          { rotulo: 'Á&rea de trabalho', icone: 'pasta', acao: () => this.navegar('Área de trabalho') },
          { rotulo: '&Lixeira', icone: 'lixeira', acao: () => this.navegar('::lixeira') },
        ],
      },
      {
        rotulo: 'A&juda', itens: () => [
          { rotulo: '&Tópicos da Ajuda', icone: 'ajuda', acao: () => abrir('ajuda', { topico: 'arquivos' }) },
        ],
      },
    ];
  }

  itensExibir() {
    const m = (modo, r) => ({ rotulo: r, radio: true, marcado: this.modo === modo, acao: () => this.definirModo(modo) });
    const o = (ordem, r) => ({ rotulo: r, radio: true, marcado: this.ordem === ordem, acao: () => { this.ordem = ordem; this.carregar(); } });
    return [
      m('icones', 'Ícones &grandes'), m('lista', '&Lista'), m('detalhes', '&Detalhes'),
      { separador: true },
      { rotulo: '&Organizar ícones', sub: () => [o('nome', 'Por &nome'), o('tipo', 'Por &tipo'), o('tamanho', 'Por &tamanho'), o('data', 'Por &data')] },
      { separador: true },
      { rotulo: '&Atualizar', atalho: 'F5', acao: () => this.carregar() },
      { separador: true },
      { rotulo: 'Mostrar no &computador principal', desativado: this.pasta.startsWith('::'), acao: () => retro.disco.mostrar(this.pasta) },
    ];
  }

  definirModo(modo) {
    this.modo = modo;
    this.vista.definirModo(modo);
    definirConfig({ explorador: { modo } }).catch(() => { });
  }

  /* ---------- Navegação ---------- */

  navegar(pasta, selecionar) {
    if (pasta === this.pasta) return this.carregar(selecionar);
    this.historico.push(this.pasta);
    this.adiante = [];
    this.pasta = pasta;
    this.carregar(selecionar);
  }

  voltar() {
    if (!this.historico.length) return;
    this.adiante.push(this.pasta);
    const de = this.pasta;
    this.pasta = this.historico.pop();
    this.carregar('arq:' + de);
  }

  avancar() {
    if (!this.adiante.length) return;
    this.historico.push(this.pasta);
    this.pasta = this.adiante.pop();
    this.carregar();
  }

  subir() {
    if (this.pasta === '::computador') return;
    const de = this.pasta;
    if (this.pasta === '' || this.pasta === '::lixeira') return this.navegar('::computador', de === '' ? 'disco' : 'lixeira');
    this.navegar(paiDe(this.pasta), 'arq:' + de);
  }

  async irPara(texto) {
    const t = texto.trim();
    if (/^meu computador$/i.test(t)) return this.navegar('::computador');
    if (/^lixeira$/i.test(t)) return this.navegar('::lixeira');
    const rel = caminhoInterno(t);
    try {
      const info = await retro.disco.info(rel);
      if (info.pasta) this.navegar(rel);
      else abrirArquivo(rel);
    } catch {
      erro(`Não foi possível encontrar "${t}". Verifique a ortografia e tente novamente.`, tituloDe(this.pasta));
    }
  }

  async carregar(selecionar) {
    const pasta = this.pasta;
    this.j.definirTitulo(tituloDe(pasta));
    this.endereco.value = ESPECIAIS[pasta] ? ESPECIAIS[pasta].titulo : caminhoTela(pasta);
    this.btVoltar.disabled = !this.historico.length;
    this.btAcima.disabled = pasta === '::computador';
    let itens = [];
    try {
      if (pasta === '::computador') itens = await this.itensComputador();
      else if (pasta === '::lixeira') itens = await this.itensLixeira();
      else itens = await this.itensPasta(pasta);
    } catch (e) {
      if (pasta !== this.pasta) return;
      await erro(`${caminhoTela(pasta)} não está acessível.\n\n${e.message}`, 'Meu computador');
      if (this.historico.length) this.voltar(); else this.navegar('::computador');
      return;
    }
    if (pasta !== this.pasta) return;
    this.j.definirIcone(iconeDe(pasta, pasta === '::lixeira' && itens.length > 0));
    this.vista.o.pastaSoltar = pasta.startsWith('::') ? (pasta === '::lixeira' ? '::lixeira' : null) : pasta;
    this.vista.desenhar(itens, { selecionarChaves: selecionar ? [selecionar] : undefined });
    if (selecionar) this.vista.selecionarChave(selecionar);
    this.atualizarStatus();
  }

  async itensComputador() {
    const esp = await retro.disco.espaco().catch(() => ({ livre: 0, total: 0 }));
    return [
      { chave: 'disco', rotulo: 'Disco local (C:)', icone: 'disco', alvo: '', especial: () => this.navegar(''), dica: `Espaço livre: ${tamanho(esp.livre)}\nCapacidade: ${tamanho(esp.total)}`, colunas: ['', 'Disco local', ''] },
      { chave: 'documentos', rotulo: 'Meus documentos', icone: 'documentos', alvo: 'Meus documentos', especial: () => this.navegar('Meus documentos'), colunas: ['', 'Pasta de arquivos', ''] },
      { chave: 'painel', rotulo: 'Painel de controle', icone: 'painel', especial: () => abrir('painel'), arrastavel: false, colunas: ['', 'Pasta do sistema', ''] },
      { chave: 'programas', rotulo: 'Adicionar ou remover programas', icone: 'programas-caixa', especial: () => abrir('programas'), arrastavel: false, colunas: ['', 'Programa do sistema', ''] },
      { chave: 'lixeira', rotulo: 'Lixeira', icone: 'lixeira', alvo: '::lixeira', especial: () => this.navegar('::lixeira'), arrastavel: false, colunas: ['', 'Lixeira', ''] },
    ];
  }

  async itensLixeira() {
    const lixo = await retro.disco.lixeira();
    return lixo.map((m) => {
      const t = tipoDe(m.nome, m.pasta);
      return {
        chave: 'lixo:' + m.id, rotulo: m.nome, icone: t.icone, lixo: m, arrastavel: false,
        dica: `Local original: ${caminhoTela(paiDe(m.origem))}\nExcluído em: ${dataHora(m.apagadoEm)}`,
        colunas: [m.pasta ? '' : tamanho(m.tamanho), caminhoTela(paiDe(m.origem)), dataHora(m.apagadoEm)],
      };
    });
  }

  async itensPasta(pasta) {
    const lista = await retro.disco.listar(pasta);
    const ord = {
      nome: (a, b) => (b.pasta - a.pasta) || a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true, sensitivity: 'base' }),
      tipo: (a, b) => (b.pasta - a.pasta) || tipoDe(a.nome).descricao.localeCompare(tipoDe(b.nome).descricao) || a.nome.localeCompare(b.nome, 'pt-BR'),
      tamanho: (a, b) => (b.pasta - a.pasta) || a.tamanho - b.tamanho,
      data: (a, b) => b.modificado - a.modificado,
    }[this.ordem];
    lista.sort(ord);
    const recortados = new Set(transferencia.recortar ? transferencia.rels : []);
    return lista.map((f) => {
      const t = tipoDe(f.nome, f.pasta);
      return {
        chave: 'arq:' + f.rel, rotulo: f.nome, icone: t.icone, rel: f.rel, nome: f.nome, pasta: f.pasta,
        alvo: f.pasta ? f.rel : null, recortado: recortados.has(f.rel),
        dica: f.pasta ? '' : `Tipo: ${t.descricao}\nTamanho: ${tamanho(f.tamanho)}\nModificado em: ${dataHora(f.modificado)}`,
        colunas: [f.pasta ? '' : tamanho(f.tamanho), t.descricao, dataHora(f.modificado)],
        tamanho: f.tamanho,
      };
    });
  }

  atualizarStatus() {
    const itens = this.vista.itens;
    const sel = this.vista.selecionados();
    const soma = (lst) => lst.reduce((s, x) => s + (x.tamanho || 0), 0);
    let a;
    let b;
    if (this.pasta === '::computador') {
      a = `${itens.length} objeto(s)`;
      b = sel.length === 1 && sel[0].dica ? sel[0].dica.split('\n')[0] : '';
    } else if (sel.length) {
      a = `${sel.length} objeto(s) selecionado(s)`;
      b = tamanho(soma(sel));
    } else {
      a = `${itens.length} objeto(s)`;
      b = tamanho(soma(itens));
    }
    this.j.definirStatus([{ texto: a, largura: 160, fixo: true }, b]);
  }

  /* ---------- Ações ---------- */

  abrirItem(it) {
    if (it.especial) return it.especial();
    if (it.lixo) return propriedadesLixo(it.lixo);
    if (it.pasta) return this.navegar(it.rel);
    return abrirArquivo(it.rel);
  }

  menu(sel, e) {
    const pos = { x: e.clientX, y: e.clientY };
    if (this.pasta === '::lixeira') {
      if (!sel.length) return abrirMenu([{ rotulo: '&Esvaziar Lixeira', acao: esvaziarLixeira }, { rotulo: '&Atualizar', acao: () => this.carregar() }], pos);
      return abrirMenu([
        { rotulo: '&Restaurar', negrito: true, acao: () => this.restaurar(sel) },
        { separador: true },
        { rotulo: 'E&xcluir definitivamente', acao: () => this.apagarDeVez(sel) },
        { separador: true },
        { rotulo: 'P&ropriedades', desativado: sel.length !== 1, acao: () => propriedadesLixo(sel[0].lixo) },
      ], pos);
    }
    if (this.pasta === '::computador') {
      if (!sel.length) return abrirMenu(this.itensExibir(), pos);
      const it = sel[0];
      const itens = [{ rotulo: '&Abrir', negrito: true, acao: () => this.abrirItem(it) }];
      if (it.chave === 'disco' || it.chave === 'documentos') {
        itens.push({ rotulo: '&Mostrar no computador principal', acao: () => retro.disco.mostrar(it.chave === 'disco' ? '' : 'Meus documentos') });
        itens.push({ separador: true }, { rotulo: 'P&ropriedades', acao: () => (it.chave === 'disco' ? abrir('painel', { secao: 'disco' }) : propriedades('Meus documentos')) });
      }
      if (it.chave === 'lixeira') itens.push({ rotulo: '&Esvaziar Lixeira', acao: esvaziarLixeira });
      return abrirMenu(itens, pos);
    }
    if (!sel.length) {
      return abrirMenu(menuDoFundo(this.pasta, {
        vista: () => this.itensExibir().slice(0, 3),
        organizar: () => this.itensExibir()[4].sub(),
        atualizar: () => this.carregar(),
        aoNovo: (rel) => this.depoisDeCriar(rel),
      }), pos);
    }
    return abrirMenu(menuDeItens(sel, { aoRenomear: (it) => this.renomearItem(it), abrirPasta: (rel) => this.navegar(rel) }), pos);
  }

  atalhos(e) {
    const doDisco = !this.pasta.startsWith('::');
    const sel = () => this.vista.selecionados().filter((s) => s.rel).map((s) => s.rel);
    if (e.key === 'Backspace') { e.preventDefault(); this.subir(); return; }
    if (e.key === 'F5') { e.preventDefault(); this.carregar(); return; }
    if (!(e.ctrlKey || e.metaKey) || !doDisco) return;
    const k = e.key.toLowerCase();
    if (k === 'c') { e.preventDefault(); copiarItens(sel(), false); }
    if (k === 'x') { e.preventDefault(); copiarItens(sel(), true); this.carregar(); }
    if (k === 'v') { e.preventDefault(); colar(this.pasta); }
  }

  async criar(tipo) {
    try {
      const rel = tipo === 'pasta' ? await novaPasta(this.pasta) : await novoTexto(this.pasta);
      this.depoisDeCriar(rel);
    } catch (e) {
      erro(e.message);
    }
  }

  async depoisDeCriar(rel) {
    await this.carregar('arq:' + rel);
    const it = this.vista.itens.find((x) => x.rel === rel);
    if (it) this.renomearItem(it);
  }

  async renomearItem(it) {
    if (!it.rel) return;
    const i = this.vista.itens.indexOf(it);
    if (i < 0) return;
    const novo = await editarRotulo(this.vista.els[i].itemEl, it.rotulo, { semExtensao: !it.pasta });
    if (!novo) return;
    const rel = await renomear(it.rel, novo);
    if (rel) this.carregar('arq:' + rel);
  }

  excluirItens(itens) {
    if (this.pasta === '::lixeira') return this.apagarDeVez(itens);
    const rels = itens.filter((i) => i.rel).map((i) => i.rel);
    if (rels.length) excluir(rels);
  }

  async restaurar(sel) {
    for (const it of sel) {
      try { await retro.disco.restaurar(it.lixo.id); } catch (e) { await erro(e.message); }
    }
    this.carregar();
  }

  async apagarDeVez(sel) {
    const ok = await confirmar(sel.length === 1 ? `Deseja mesmo apagar definitivamente "${sel[0].rotulo}"?\n\nEle não poderá ser recuperado.` : `Deseja mesmo apagar definitivamente estes ${sel.length} itens?\n\nEles não poderão ser recuperados.`, { titulo: 'Confirmar exclusão', tipo: 'aviso' });
    if (!ok) return;
    for (const it of sel) await retro.disco.apagarDaLixeira(it.lixo.id).catch(() => { });
    tocar('lixeira');
    this.carregar();
  }
}

function propriedadesLixo(m) {
  mensagem({
    titulo: `Propriedades de ${m.nome}`,
    tipo: 'info',
    texto: `${m.nome}\n\nLocal original: ${caminhoTela(paiDe(m.origem))}\nExcluído em: ${dataHora(m.apagadoEm)}\nTamanho: ${m.pasta ? 'pasta' : tamanho(m.tamanho)}\n\nPara usar este item, restaure-o (botão direito › Restaurar).`,
  });
}

function abrirExplorador(args = {}) {
  let pasta = args.pasta != null ? args.pasta : '::computador';
  // Como na época: a mesma pasta não abre duas janelas.
  const aberta = janelas.find((j) => j.explorador && j.explorador.pasta === pasta);
  if (aberta) {
    aberta.focar();
    if (args.selecionar) aberta.explorador.carregar('arq:' + args.selecionar);
    return aberta.explorador;
  }
  const ex = new Explorador({ pasta, selecionar: args.selecionar ? 'arq:' + args.selecionar : undefined });
  ex.j.explorador = ex;
  return ex;
}

registrarApp('explorador', { nome: 'Explorador', icone: 'computador', abrir: abrirExplorador });
registrarApp('lixeira', { nome: 'Lixeira', icone: 'lixeira', abrir: () => abrirExplorador({ pasta: '::lixeira' }) });

export { rotulo };
