/*
 * As janelas de pasta (o explorador do disco), Meu computador e a Lixeira.
 *   pasta '::computador'  Meu computador (o disco C:, o Painel de controle, a Lixeira)
 *   pasta '::lixeira'     a Lixeira
 *   pasta '::unidade:…'   um pendrive ou cartão (unidades.js): ver, trazer para o C:, levar do C:
 *   pasta '::zip:…'       por dentro de uma pasta compactada (compactados.js): ver e extrair
 *   qualquer outra        uma pasta do disco ('' é a raiz C:\)
 */
import { h, img, tipoDe, caminhoTela, caminhoInterno, nomeDe, paiDe, tamanho, dataHora, rotulo, extensao, urlMiniatura } from '../util.js';
import { Janela, lista as janelas } from '../janelas.js';
import { VistaIcones } from '../vista.js';
import { abrirMenu } from '../menus.js';
import { registrarApp, abrir, abrirArquivo, estado, definirConfig, pastaDocs, pastaMesa } from '../sistema.js';
import { menuDeItens, menuDoFundo, editarRotulo, renomear, excluir, novaPasta, novoTexto, copiarItens, colar, transferencia } from '../arquivos.js';
import { erro, confirmar, propriedades, mensagem } from '../dialogos.js';
import { esvaziarLixeira } from '../mesa.js';
import { tocar } from '../sons.js';
import { tr, marcar } from '../idioma.js';
import { nomeUnidade, pastaDaUnidade, lerPastaUnidade, unidadeConhecida, listarUnidades, levarParaUnidade, trazerDaUnidade, abrirDaUnidade, ejetarUnidade, avisarTrazidos } from '../unidades.js';
import { pastaDoZip, lerPastaZip, itensDoZip, extrairEMostrar, abrirDoZip } from '../compactados.js';
import { Arvore } from '../arvore.js';

// As fotos com miniatura (as que o Electron ou o sistema sabem encolher).
const COM_MINIATURA = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'svg', 'avif', 'tif', 'tiff', 'heic']);

const ESPECIAIS = {
  '::computador': { titulo: marcar('Meu computador'), icone: 'computador' },
  '::lixeira': { titulo: marcar('Lixeira'), icone: 'lixeira' },
};

function tituloDe(pasta) {
  if (ESPECIAIS[pasta]) return tr(ESPECIAIS[pasta].titulo);
  const un = lerPastaUnidade(pasta);
  if (un) return un.rel ? nomeDe(un.rel) : nomeUnidade(unidadeConhecida(un.id));
  const zip = lerPastaZip(pasta);
  if (zip) return nomeDe(zip.dentro || zip.rel);
  if (!pasta) return 'C:\\';
  return nomeDe(pasta);
}

function iconeDe(pasta, cheia) {
  if (pasta === '::lixeira') return cheia ? 'lixeira-cheia' : 'lixeira';
  if (lerPastaUnidade(pasta)) return lerPastaUnidade(pasta).rel ? 'pasta-aberta' : 'removivel';
  if (lerPastaZip(pasta)) return lerPastaZip(pasta).dentro ? 'pasta-aberta' : 'compactado';
  if (ESPECIAIS[pasta]) return ESPECIAIS[pasta].icone;
  if (!pasta) return 'disco';
  if (pasta === pastaDocs()) return 'documentos';
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
    // Os botões laterais do mouse: voltar e avançar.
    this.j.el.addEventListener('mouseup', (e) => {
      if (e.button === 3) { e.preventDefault(); this.voltar(); }
      else if (e.button === 4) { e.preventDefault(); this.avancar(); }
    });
    // O endereço: os pedaços do caminho para clicar; um clique no espaço vazio (ou Alt+D) vira o campo de texto.
    this.endereco = h('input.exp-endereco-texto', { type: 'text', spellcheck: false, hidden: true });
    this.migalhas = h('div.migalhas', { title: tr('Clique num nome para ir até ele; clique no espaço vazio para digitar um endereço.') });
    this.migalhas.addEventListener('mousedown', (e) => { if (!e.target.closest('button')) { e.preventDefault(); this.editarEndereco(); } });
    this.endereco.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this.fecharEndereco(); this.irPara(this.endereco.value); }
      if (e.key === 'Escape') { e.preventDefault(); this.fecharEndereco(); this.vista.focoNoRaiz(); }
    });
    this.endereco.addEventListener('blur', () => this.fecharEndereco());
    this.caixaEndereco = h('div.exp-endereco', this.migalhas, this.endereco);
    this.btVoltar = h('button.ferramenta', { title: tr('Voltar (Backspace)'), on: { click: () => this.voltar() } }, img('pasta-aberta', 16), tr('Voltar'));
    this.btAcima = h('button.ferramenta', { title: tr('Subir um nível'), on: { click: () => this.subir() } }, h('span', { style: { fontWeight: 'bold' } }, '↑'), tr('Acima'));
    const btVista = h('button.ferramenta', { title: tr('Exibir'), dataset: { abreMenu: '1' } }, img('imagens', 16), tr('Exibir'));
    btVista.addEventListener('click', () => {
      const r = btVista.getBoundingClientRect();
      abrirMenu(this.itensExibir(), { x: r.left, y: r.bottom });
    });
    this.btPastas = h('button.ferramenta', { title: tr('Mostrar ou esconder a barra de pastas'), on: { click: () => this.alternarArvore() } }, img('pasta', 16), tr('Pastas'));
    const ferramentas = h('div.barra-ferramentas',
      this.btVoltar, this.btAcima, this.btPastas, h('div.sep'),
      h('span', tr('Endereço')), this.caixaEndereco, h('div.sep'), btVista);
    this.area = h('div.lista-arquivos', { style: { flex: '1' } });
    // A barra de pastas à esquerda (a árvore), com a divisória para arrastar.
    this.arvore = new Arvore({ aoEscolher: (p) => this.navegar(p) });
    this.painelArvore = h('div.exp-arvore', { style: { width: ((c.explorador && c.explorador.largArvore) || 170) + 'px' } }, this.arvore.el);
    const divisoria = h('div.exp-divisoria');
    divisoria.addEventListener('pointerdown', (e) => this.arrastarDivisoria(e));
    this.comArvore = !(c.explorador && c.explorador.arvore === false);
    this.corpo = h('div.exp-corpo', this.painelArvore, divisoria, this.area);
    this.j.corpo.append(ferramentas, this.corpo);
    this.aplicarArvore();
    this.vista = new VistaIcones(this.area, {
      modo: this.modo,
      colunas: [tr('Nome'), tr('Tamanho'), tr('Tipo'), tr('Modificado')],
      aoAbrir: (it) => this.abrirItem(it),
      aoMenu: (sel, e) => this.menu(sel, e),
      aoRenomear: (it) => this.renomearItem(it),
      aoExcluir: (itens) => this.excluirItens(itens),
      aoSelecionar: () => this.atualizarStatus(),
    });
    this.area.addEventListener('keydown', (e) => this.atalhos(e));
    this.paraDeOuvir = retro.disco.aoMudar((pastas) => {
      if (pastas.includes(this.pasta) || (this.pasta === '::lixeira' && pastas.includes('::lixeira')) || this.pasta === '::computador') this.carregar();
      if (this.comArvore) for (const p of pastas) this.arvore.recarregar(p);
    });
    // Um pendrive que chega ou sai: o Meu computador se atualiza; a janela do que saiu volta para ele.
    const aoMudarUnidades = (e) => {
      const un = lerPastaUnidade(this.pasta);
      if (this.pasta === '::computador') this.carregar();
      else if (un && !e.detail.some((u) => u.id === un.id)) this.navegar('::computador');
      if (this.comArvore) this.arvore.recarregar('::computador');
    };
    document.addEventListener('retro-unidades', aoMudarUnidades);
    this.j.ev.on('fechada', () => { this.paraDeOuvir(); document.removeEventListener('retro-unidades', aoMudarUnidades); });
    this.j.ev.on('ativada', () => setTimeout(() => { if (!this.j.el.contains(document.activeElement)) this.vista.focoNoRaiz(); }, 0));
    this.carregar(selecionar);
  }

  menus() {
    return [
      {
        rotulo: tr('&Arquivo'), itens: () => {
          const sel = this.vista ? this.vista.selecionados() : [];
          const doDisco = !this.pasta.startsWith('::');
          const itens = [];
          if (this.pasta === '::lixeira') {
            itens.push({ rotulo: tr('&Restaurar'), desativado: !sel.length, acao: () => this.restaurar(sel) });
            itens.push({ rotulo: tr('&Esvaziar Lixeira'), acao: esvaziarLixeira });
            itens.push({ separador: true });
          } else if (lerPastaZip(this.pasta)) {
            itens.push({ rotulo: tr('Extra&ir tudo…'), acao: () => extrairEMostrar(lerPastaZip(this.pasta).rel) });
            itens.push({ separador: true });
          } else if (doDisco) {
            if (sel.length) itens.push(...menuDeItens(sel.filter((s) => s.rel), { aoRenomear: (it) => this.renomearItem(it) }), { separador: true });
            itens.push({ rotulo: tr('&Novo'), sub: [
              { rotulo: tr('&Pasta'), icone: 'pasta', acao: () => this.criar('pasta') },
              { separador: true },
              { rotulo: tr('&Documento de texto'), icone: 'texto', acao: () => this.criar('texto') },
            ] });
            itens.push({ rotulo: tr('&Trazer do computador principal…'), acao: () => retro.disco.importarEscolhendo(this.pasta).catch((e) => erro(e.message)) });
            itens.push({ separador: true });
          }
          itens.push({ rotulo: tr('&Fechar'), acao: () => this.j.fechar() });
          return itens;
        },
      },
      {
        rotulo: tr('&Editar'), itens: () => {
          const sel = this.vista ? this.vista.selecionados().filter((s) => s.rel) : [];
          const doDisco = !this.pasta.startsWith('::');
          return [
            { rotulo: tr('Recor&tar'), atalho: 'Ctrl+X', desativado: !doDisco || !sel.length, acao: () => copiarItens(sel.map((s) => s.rel), true) },
            { rotulo: tr('&Copiar'), atalho: 'Ctrl+C', desativado: !doDisco || !sel.length, acao: () => copiarItens(sel.map((s) => s.rel), false) },
            { rotulo: tr('C&olar'), atalho: 'Ctrl+V', desativado: !doDisco || !transferencia.rels.length, acao: () => colar(this.pasta) },
            { separador: true },
            { rotulo: tr('Selecionar &tudo'), atalho: 'Ctrl+A', acao: () => this.vista.selecionar(this.vista.itens.map((_, i) => i)) },
            { rotulo: tr('&Inverter seleção'), acao: () => this.vista.selecionar(this.vista.itens.map((_, i) => i).filter((i) => !this.vista.sel.has(i))) },
          ];
        },
      },
      { rotulo: tr('E&xibir'), itens: () => this.itensExibir() },
      {
        rotulo: tr('&Ir'), itens: () => [
          { rotulo: tr('&Voltar'), atalho: 'Backspace', desativado: !this.historico.length, acao: () => this.voltar() },
          { rotulo: tr('&Avançar'), desativado: !this.adiante.length, acao: () => this.avancar() },
          { rotulo: tr('A&cima'), desativado: this.pasta === '::computador', acao: () => this.subir() },
          { separador: true },
          { rotulo: tr('&Meu computador'), icone: 'computador', acao: () => this.navegar('::computador') },
          { rotulo: tr('&Disco C:'), icone: 'disco', acao: () => this.navegar('') },
          { rotulo: tr('Meus &documentos'), icone: 'documentos', acao: () => this.navegar(pastaDocs()) },
          { rotulo: tr('Á&rea de trabalho'), icone: 'pasta', acao: () => this.navegar(pastaMesa()) },
          { rotulo: tr('&Lixeira'), icone: 'lixeira', acao: () => this.navegar('::lixeira') },
        ],
      },
      {
        rotulo: tr('A&juda'), itens: () => [
          { rotulo: tr('&Tópicos da Ajuda'), icone: 'ajuda', acao: () => abrir('ajuda', { topico: 'arquivos' }) },
        ],
      },
    ];
  }

  itensModos() {
    const m = (modo, r) => ({ rotulo: r, radio: true, marcado: this.modo === modo, acao: () => this.definirModo(modo) });
    return [m('icones', tr('Ícones &grandes')), m('miniaturas', tr('&Miniaturas')), m('lista', tr('&Lista')), m('detalhes', tr('&Detalhes'))];
  }

  itensOrganizar() {
    const o = (ordem, r) => ({ rotulo: r, radio: true, marcado: this.ordem === ordem, acao: () => { this.ordem = ordem; this.carregar(); } });
    return [o('nome', 'Por &nome'), o('tipo', 'Por &tipo'), o('tamanho', 'Por &tamanho'), o('data', 'Por &data')];
  }

  itensExibir() {
    return [
      ...this.itensModos(),
      { separador: true },
      { rotulo: tr('Barra de &pastas'), marcado: this.comArvore, acao: () => this.alternarArvore() },
      { separador: true },
      { rotulo: tr('&Organizar ícones'), sub: () => this.itensOrganizar() },
      { separador: true },
      { rotulo: tr('&Atualizar'), atalho: 'F5', acao: () => this.carregar() },
      { separador: true },
      { rotulo: tr('Mostrar no &computador principal'), desativado: this.pasta.startsWith('::'), acao: () => retro.disco.mostrar(this.pasta) },
    ];
  }

  definirModo(modo) {
    const antes = this.modo;
    this.modo = modo;
    // As miniaturas entram nos itens ao carregar: trocar de ou para elas lê a pasta de novo.
    if ((antes === 'miniaturas') !== (modo === 'miniaturas')) { this.vista.modo = modo; this.carregar(); }
    else this.vista.definirModo(modo);
    definirConfig({ explorador: { modo } }).catch(() => { });
  }

  /* ---------- A barra de pastas e o endereço ---------- */

  aplicarArvore() {
    this.painelArvore.hidden = !this.comArvore;
    this.corpo.classList.toggle('com-arvore', this.comArvore);
    this.btPastas.classList.toggle('apertado', this.comArvore);
    if (this.comArvore) this.arvore.revelar(this.pasta);
  }

  alternarArvore() {
    this.comArvore = !this.comArvore;
    this.aplicarArvore();
    definirConfig({ explorador: { arvore: this.comArvore } }).catch(() => { });
  }

  arrastarDivisoria(e) {
    e.preventDefault();
    const ini = { x: e.clientX, w: this.painelArvore.offsetWidth };
    const alvo = e.currentTarget;
    alvo.setPointerCapture(e.pointerId);
    const mover = (ev) => { this.painelArvore.style.width = Math.max(100, Math.min(this.corpo.clientWidth - 120, ini.w + ev.clientX - ini.x)) + 'px'; };
    const soltar = () => {
      alvo.removeEventListener('pointermove', mover);
      alvo.removeEventListener('pointerup', soltar);
      definirConfig({ explorador: { largArvore: this.painelArvore.offsetWidth } }).catch(() => { });
    };
    alvo.addEventListener('pointermove', mover);
    alvo.addEventListener('pointerup', soltar);
  }

  /** Os pedaços do caminho da pasta: [{ rotulo, pasta, icone }]. */
  segmentos(pasta) {
    const pc = { rotulo: tr('Meu computador'), pasta: '::computador', icone: 'computador' };
    if (pasta === '::computador') return [pc];
    if (pasta === '::lixeira') return [{ rotulo: tr('Lixeira'), pasta, icone: 'lixeira' }];
    const disco = (rel) => {
      const partes = String(rel || '').split('/').filter(Boolean);
      return [pc, { rotulo: 'C:', pasta: '', icone: 'disco' }, ...partes.map((p, i) => ({ rotulo: p, pasta: partes.slice(0, i + 1).join('/') }))];
    };
    const un = lerPastaUnidade(pasta);
    if (un) {
      const partes = un.rel ? un.rel.split('/') : [];
      return [pc, { rotulo: nomeUnidade(unidadeConhecida(un.id)), pasta: pastaDaUnidade(un.id), icone: 'removivel' },
        ...partes.map((p, i) => ({ rotulo: p, pasta: pastaDaUnidade(un.id, partes.slice(0, i + 1).join('/')) }))];
    }
    const zip = lerPastaZip(pasta);
    if (zip) {
      const partes = zip.dentro ? zip.dentro.split('/') : [];
      return [...disco(paiDe(zip.rel)), { rotulo: nomeDe(zip.rel), pasta: pastaDoZip(zip.rel), icone: 'compactado' },
        ...partes.map((p, i) => ({ rotulo: p, pasta: pastaDoZip(zip.rel, partes.slice(0, i + 1).join('/')) }))];
    }
    return disco(pasta);
  }

  desenharMigalhas() {
    const segs = this.segmentos(this.pasta);
    this.migalhas.replaceChildren(...segs.flatMap((s, i) => {
      const bt = h('button.migalha', { type: 'button', tabIndex: -1, title: s.rotulo, on: { click: () => this.navegar(s.pasta) } }, s.icone && i === 0 ? img(s.icone, 16) : null, h('span', s.rotulo));
      return i ? [h('span.migalha-sep', '›'), bt] : [bt];
    }));
    // O fim do caminho fica sempre à vista.
    requestAnimationFrame(() => { this.migalhas.scrollLeft = this.migalhas.scrollWidth; });
  }

  editarEndereco() {
    this.migalhas.hidden = true;
    this.endereco.hidden = false;
    this.endereco.focus();
    this.endereco.select();
  }

  fecharEndereco() {
    if (this.endereco.hidden) return;
    this.endereco.hidden = true;
    this.migalhas.hidden = false;
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
    const un = lerPastaUnidade(this.pasta);
    if (un) return un.rel ? this.navegar(pastaDaUnidade(un.id, paiDe(un.rel)), 'un:' + un.rel) : this.navegar('::computador', 'unidade:' + un.id);
    const zip = lerPastaZip(this.pasta);
    if (zip) return zip.dentro ? this.navegar(pastaDoZip(zip.rel, paiDe(zip.dentro)), 'zip:' + zip.dentro) : this.navegar(paiDe(zip.rel), 'arq:' + zip.rel);
    this.navegar(paiDe(this.pasta), 'arq:' + de);
  }

  async irPara(texto) {
    const t = texto.trim();
    if (t.toLowerCase() === tr('Meu computador').toLowerCase()) return this.navegar('::computador');
    if (t.toLowerCase() === tr('Lixeira').toLowerCase()) return this.navegar('::lixeira');
    const rel = caminhoInterno(t);
    try {
      const info = await retro.disco.info(rel);
      if (info.pasta) this.navegar(rel);
      else abrirArquivo(rel);
    } catch {
      erro(tr('Não foi possível encontrar "{nome}". Verifique a ortografia e tente novamente.', { nome: t }), tituloDe(this.pasta));
    }
  }

  async carregar(selecionar) {
    const pasta = this.pasta;
    this.j.definirTitulo(tituloDe(pasta));
    const un = lerPastaUnidade(pasta);
    const zip = lerPastaZip(pasta);
    this.endereco.value = ESPECIAIS[pasta] ? tr(ESPECIAIS[pasta].titulo)
      : un ? nomeUnidade(unidadeConhecida(un.id)) + (un.rel ? '\\' + un.rel.replace(/\//g, '\\') : '')
        : zip ? caminhoTela(zip.rel) + (zip.dentro ? '\\' + zip.dentro.replace(/\//g, '\\') : '')
          : caminhoTela(pasta);
    this.desenharMigalhas();
    if (this.comArvore) this.arvore.revelar(pasta);
    this.btVoltar.disabled = !this.historico.length;
    this.btAcima.disabled = pasta === '::computador';
    let itens = [];
    try {
      if (pasta === '::computador') itens = await this.itensComputador();
      else if (pasta === '::lixeira') itens = await this.itensLixeira();
      else if (un) itens = await this.itensUnidade(un.id, un.rel);
      else if (zip) itens = await this.itensZip(zip.rel, zip.dentro);
      else itens = await this.itensPasta(pasta);
    } catch (e) {
      if (pasta !== this.pasta) return;
      await erro(tr('{pasta} não está acessível.', { pasta: caminhoTela(pasta) }) + '\n\n' + e.message, tr('Meu computador'));
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
      { chave: 'disco', rotulo: tr('Disco local (C:)'), icone: 'disco', alvo: '', especial: () => this.navegar(''), dica: tr('Espaço livre: {livre}\nCapacidade: {total}', { livre: tamanho(esp.livre), total: tamanho(esp.total) }), colunas: ['', tr('Disco local'), ''] },
      { chave: 'documentos', rotulo: tr('Meus documentos'), icone: 'documentos', alvo: pastaDocs(), especial: () => this.navegar(pastaDocs()), colunas: ['', tr('Pasta de arquivos'), ''] },
      { chave: 'painel', rotulo: tr('Painel de controle'), icone: 'painel', especial: () => abrir('painel'), arrastavel: false, colunas: ['', tr('Pasta do sistema'), ''] },
      { chave: 'programas', rotulo: tr('Adicionar ou remover programas'), icone: 'programas-caixa', especial: () => abrir('programas'), arrastavel: false, colunas: ['', tr('Programa do sistema'), ''] },
      { chave: 'lixeira', rotulo: tr('Lixeira'), icone: 'lixeira', alvo: '::lixeira', especial: () => this.navegar('::lixeira'), arrastavel: false, colunas: ['', tr('Lixeira'), ''] },
      // Os pendrives e cartões ligados agora.
      ...(await listarUnidades()).map((u) => ({
        chave: 'unidade:' + u.id, rotulo: nomeUnidade(u), icone: 'removivel', unidadeRaiz: u, arrastavel: false,
        especial: () => this.navegar(pastaDaUnidade(u.id)),
        dica: u.total ? tr('Espaço livre: {livre}\nCapacidade: {total}', { livre: tamanho(u.livre), total: tamanho(u.total) }) : tr('Disco removível'),
        colunas: ['', tr('Disco removível'), ''],
      })),
    ];
  }

  /** O conteúdo de um pendrive (só para ver e copiar: nada é apagado nem renomeado nele por aqui). */
  async itensUnidade(id, rel) {
    const lista = await retro.unidades.pasta(id, rel);
    lista.sort((a, b) => (b.pasta - a.pasta) || a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true, sensitivity: 'base' }));
    return lista.map((f) => {
      const t = tipoDe(f.nome, f.pasta);
      return {
        chave: 'un:' + f.rel, rotulo: f.nome, icone: t.icone, nome: f.nome, pasta: f.pasta, arrastavel: false,
        unidade: { id, rel: f.rel },
        dica: f.pasta ? '' : tr('Tipo: {tipo}\nTamanho: {tamanho}\nModificado em: {data}', { tipo: t.descricao, tamanho: tamanho(f.tamanho), data: dataHora(f.modificado) }),
        colunas: [f.pasta ? '' : tamanho(f.tamanho), t.descricao, dataHora(f.modificado)],
        tamanho: f.tamanho,
      };
    });
  }

  /** Por dentro de uma pasta compactada (só para ver: abrir um arquivo extrai o pacote antes). */
  async itensZip(rel, dentro) {
    const lista = await itensDoZip(rel, dentro);
    lista.sort((a, b) => (b.pasta - a.pasta) || a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true, sensitivity: 'base' }));
    return lista.map((f) => {
      const nome = nomeDe(f.nome);
      const t = tipoDe(nome, f.pasta);
      return {
        chave: 'zip:' + f.nome, rotulo: nome, icone: t.icone, nome, pasta: f.pasta, arrastavel: false,
        zip: { rel, nome: f.nome, pasta: f.pasta },
        dica: f.pasta ? '' : tr('Tipo: {tipo}\nTamanho: {tamanho}\nCompactado: {compactado}', { tipo: t.descricao, tamanho: tamanho(f.tamanho), compactado: tamanho(f.compactado) }),
        colunas: [f.pasta ? '' : tamanho(f.tamanho), t.descricao, f.modificado ? dataHora(f.modificado) : ''],
        tamanho: f.tamanho,
      };
    });
  }

  async itensLixeira() {
    const lixo = await retro.disco.lixeira();
    return lixo.map((m) => {
      const t = tipoDe(m.nome, m.pasta);
      return {
        chave: 'lixo:' + m.id, rotulo: m.nome, icone: t.icone, lixo: m, arrastavel: false,
        dica: tr('Local original: {local}\nExcluído em: {data}', { local: caminhoTela(paiDe(m.origem)), data: dataHora(m.apagadoEm) }),
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
        dica: f.pasta ? '' : tr('Tipo: {tipo}\nTamanho: {tamanho}\nModificado em: {data}', { tipo: t.descricao, tamanho: tamanho(f.tamanho), data: dataHora(f.modificado) }),
        colunas: [f.pasta ? '' : tamanho(f.tamanho), t.descricao, dataHora(f.modificado)],
        tamanho: f.tamanho,
        miniatura: this.modo === 'miniaturas' && !f.pasta && COM_MINIATURA.has(extensao(f.nome)) ? urlMiniatura(f.rel, f.modificado) : null,
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
      a = tr('{n} objeto(s)', { n: itens.length });
      b = sel.length === 1 && sel[0].dica ? sel[0].dica.split('\n')[0] : '';
    } else if (sel.length) {
      a = tr('{n} objeto(s) selecionado(s)', { n: sel.length });
      b = tamanho(soma(sel));
    } else {
      a = tr('{n} objeto(s)', { n: itens.length });
      b = tamanho(soma(itens));
    }
    this.j.definirStatus([{ texto: a, largura: 160, fixo: true }, b]);
  }

  /* ---------- Ações ---------- */

  abrirItem(it) {
    if (it.especial) return it.especial();
    if (it.unidade) return it.pasta ? this.navegar(pastaDaUnidade(it.unidade.id, it.unidade.rel)) : abrirDaUnidade(it.unidade.id, it.unidade.rel);
    if (it.zip) return it.pasta ? this.navegar(pastaDoZip(it.zip.rel, it.zip.nome)) : abrirDoZip(it.zip.rel, it.zip.nome);
    if (it.lixo) return propriedadesLixo(it.lixo);
    if (it.pasta) return this.navegar(it.rel);
    return abrirArquivo(it.rel);
  }

  menu(sel, e) {
    const pos = { x: e.clientX, y: e.clientY };
    if (this.pasta === '::lixeira') {
      if (!sel.length) return abrirMenu([{ rotulo: tr('&Esvaziar Lixeira'), acao: esvaziarLixeira }, { rotulo: tr('&Atualizar'), acao: () => this.carregar() }], pos);
      return abrirMenu([
        { rotulo: tr('&Restaurar'), negrito: true, acao: () => this.restaurar(sel) },
        { separador: true },
        { rotulo: tr('E&xcluir definitivamente'), acao: () => this.apagarDeVez(sel) },
        { separador: true },
        { rotulo: tr('P&ropriedades'), desativado: sel.length !== 1, acao: () => propriedadesLixo(sel[0].lixo) },
      ], pos);
    }
    if (this.pasta === '::computador') {
      if (!sel.length) return abrirMenu(this.itensExibir(), pos);
      const it = sel[0];
      const itens = [{ rotulo: tr('&Abrir'), negrito: true, acao: () => this.abrirItem(it) }];
      if (it.chave === 'disco' || it.chave === 'documentos') {
        itens.push({ rotulo: tr('&Mostrar no computador principal'), acao: () => retro.disco.mostrar(it.chave === 'disco' ? '' : pastaDocs()) });
        itens.push({ separador: true }, { rotulo: tr('P&ropriedades'), acao: () => (it.chave === 'disco' ? abrir('painel', { secao: 'disco' }) : propriedades(pastaDocs())) });
      }
      if (it.chave === 'lixeira') itens.push({ rotulo: tr('&Esvaziar Lixeira'), acao: esvaziarLixeira });
      if (it.unidadeRaiz) itens.push({ separador: true }, { rotulo: tr('Remover com &segurança'), acao: () => ejetarUnidade(it.unidadeRaiz) });
      return abrirMenu(itens, pos);
    }
    const zip = lerPastaZip(this.pasta);
    if (zip) {
      const extrair = { rotulo: tr('Extra&ir tudo…'), acao: () => extrairEMostrar(zip.rel) };
      if (!sel.length) return abrirMenu([extrair, { rotulo: tr('&Atualizar'), acao: () => this.carregar() }], pos);
      return abrirMenu([{ rotulo: tr('&Abrir'), negrito: true, desativado: sel.length !== 1, acao: () => this.abrirItem(sel[0]) }, { separador: true }, extrair], pos);
    }
    const un = lerPastaUnidade(this.pasta);
    if (un) {
      const u = unidadeConhecida(un.id);
      if (!sel.length) {
        return abrirMenu([
          { rotulo: tr('C&olar aqui (copiar do disco C:)'), desativado: !transferencia.rels.length, acao: () => levarParaUnidade(u, transferencia.rels, un.rel).then(() => this.carregar()) },
          { rotulo: tr('&Atualizar'), acao: () => this.carregar() },
          { separador: true },
          { rotulo: tr('Remover com &segurança'), acao: () => ejetarUnidade(u) },
        ], pos);
      }
      const rels = sel.map((s) => s.unidade.rel);
      return abrirMenu([
        { rotulo: tr('&Abrir'), negrito: true, desativado: sel.length !== 1, acao: () => this.abrirItem(sel[0]) },
        { separador: true },
        { rotulo: tr('Copiar para Meus &documentos'), acao: () => trazerDaUnidade(un.id, rels, pastaDocs()).then((f) => avisarTrazidos(f, pastaDocs())) },
        { rotulo: tr('Copiar para a Área de &trabalho'), acao: () => trazerDaUnidade(un.id, rels, pastaMesa()).then((f) => avisarTrazidos(f, pastaMesa())) },
      ], pos);
    }
    if (!sel.length) {
      return abrirMenu(menuDoFundo(this.pasta, {
        vista: () => this.itensModos(),
        organizar: () => this.itensOrganizar(),
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
    if ((e.altKey && e.key.toLowerCase() === 'd') || e.key === 'F4') { e.preventDefault(); this.editarEndereco(); return; }
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
    const texto = sel.length === 1 ? tr('Deseja mesmo apagar definitivamente "{nome}"?', { nome: sel[0].rotulo }) : tr('Deseja mesmo apagar definitivamente estes {n} itens?', { n: sel.length });
    const ok = await confirmar(texto + '\n\n' + tr('Depois de apagados, eles não podem ser recuperados.'), { titulo: tr('Confirmar exclusão'), tipo: 'aviso' });
    if (!ok) return;
    for (const it of sel) await retro.disco.apagarDaLixeira(it.lixo.id).catch(() => { });
    tocar('lixeira');
    this.carregar();
  }
}

function propriedadesLixo(m) {
  mensagem({
    titulo: tr('Propriedades de {nome}', { nome: m.nome }),
    tipo: 'info',
    texto: `${m.nome}\n\n` + tr('Local original: {local}\nExcluído em: {data}', { local: caminhoTela(paiDe(m.origem)), data: dataHora(m.apagadoEm) }) + `\n${tr('Tamanho:')} ${m.pasta ? tr('pasta') : tamanho(m.tamanho)}\n\n` + tr('Para usar este item, restaure-o (botão direito › Restaurar).'),
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
