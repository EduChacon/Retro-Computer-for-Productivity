/*
 * A janela "Programas do computador": os programas instalados no computador
 * principal, para abrir, pôr na área de trabalho ou no menu Iniciar.
 */
import { h, img } from '../util.js';
import { Janela } from '../janelas.js';
import { VistaIcones } from '../vista.js';
import { abrirMenu } from '../menus.js';
import { registrarApp, eventos } from '../sistema.js';
import { adicionarAtalho } from '../mesa.js';
import { abrirNativo, iconeNativo, iconeNativoJa, lembrarNome, alternarNoMenu, noMenu, integradoPorPadrao, alternarIntegrado, configurarWeb } from '../nativos.js';
import { tr } from '../idioma.js';

class ProgramasDoComputador {
  constructor() {
    this.j = new Janela({ id: 'nativos', titulo: tr('Programas do computador'), icone: 'computador', largura: 560, altura: 380, status: [''] });
    this.filtro = h('input', { type: 'search', spellcheck: false, placeholder: tr('Procurar um programa'), style: { flex: '1' } });
    this.filtro.addEventListener('input', () => this.desenhar());
    this.integrar = h('button.ferramenta', { disabled: true, on: { click: () => this.selecionado && abrirNativo(this.selecionado.idNativo, { modo: 'integrado' }) } }, tr('Abrir integrado…'));
    const barra = h('div.barra-ferramentas', { style: { gap: '6px', padding: '3px 4px' } },
      img('localizar', 16), this.filtro,
      this.integrar,
      h('button.ferramenta', { on: { click: () => this.carregar(true) } }, img('atualizar', 16), tr('Atualizar a lista')));
    const area = h('div.lista-arquivos', { style: { flex: '1' } });
    this.j.corpo.append(h('div.texto-ajuda', { style: { padding: '4px 6px 6px' } }, tr('Selecione um programa e use Abrir integrado. O Windows pode usar a moldura do Retro; o Mac oferece controles da janela original. Pelo botão direito, associe uma versão web ou escolha como abrir por padrão.')), barra, area);
    this.vista = new VistaIcones(area, {
      modo: 'icones',
      aoAbrir: (it) => abrirNativo(it.idNativo),
      aoMenu: (sel, e) => this.menu(sel, e),
      aoSelecionar: (sel) => { this.selecionado = sel[0] || null; this.integrar.disabled = !this.selecionado; this.j.definirStatus([sel.length === 1 ? sel[0].rotulo : this.contagem()]); },
    });
    this.j.ev.on('ativada', () => setTimeout(() => this.filtro.focus(), 0));
    this.carregar(false);
  }

  contagem() {
    return tr('{n} programa(s)', { n: (this.lista || []).length });
  }

  async carregar(atualizar) {
    this.j.definirStatus([tr('Procurando os programas…')]);
    try {
      this.lista = await retro.nativos.listar(atualizar);
    } catch {
      this.lista = [];
    }
    this.desenhar();
    this.j.definirStatus([this.lista.length ? this.contagem() : tr('Nenhum programa encontrado neste computador.')]);
    // Os ícones chegam aos poucos; a vista é redesenhada no fim.
    await Promise.all(this.lista.map((p) => iconeNativo(p.id)));
    if (!this.j.fechada) this.desenhar();
  }

  desenhar() {
    const termo = this.filtro.value.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const itens = (this.lista || [])
      .filter((p) => !termo || p.nome.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').includes(termo))
      .map((p) => ({ chave: 'nativo:' + p.id, idNativo: p.id, rotulo: p.nome, icone: p.terminal ? 'prompt' : 'programa', iconeUrl: iconeNativoJa(p.id), arrastavel: false, dica: p.terminal ? tr('Abre no Prompt de comando') : '' }));
    this.vista.desenhar(itens);
  }

  menu(sel, e) {
    if (!sel.length) return;
    const it = sel[0];
    const noMenuIniciar = noMenu().includes(it.idNativo);
    abrirMenu([
      { rotulo: tr('&Abrir'), negrito: true, acao: () => abrirNativo(it.idNativo) },
      { rotulo: tr('Abrir integrado ao Retro…'), acao: () => abrirNativo(it.idNativo, { modo: 'integrado' }) },
      { rotulo: tr('Abrir no computador'), acao: () => abrirNativo(it.idNativo, { modo: 'externo' }) },
      { rotulo: tr('Usar integração por padrão'), marcado: integradoPorPadrao(it.idNativo), acao: () => alternarIntegrado(it.idNativo) },
      { rotulo: tr('Associar versão web…'), acao: () => configurarWeb(it.idNativo) },
      { separador: true },
      { rotulo: tr('Criar atalho na área de &trabalho'), acao: async () => { await lembrarNome(it.idNativo, it.rotulo); adicionarAtalho('nativo:' + it.idNativo); } },
      { rotulo: noMenuIniciar ? tr('Tirar do menu &Iniciar') : tr('Pôr no menu &Iniciar'), acao: () => alternarNoMenu(it.idNativo, it.rotulo).then(() => eventos.emit('programas')) },
    ], { x: e.clientX, y: e.clientY });
  }
}

let aberta = null;

registrarApp('nativos', {
  nome: 'Programas do computador', icone: 'computador',
  abrir: () => {
    if (aberta && !aberta.j.fechada) { aberta.j.focar(); return aberta; }
    aberta = new ProgramasDoComputador();
    return aberta;
  },
});
