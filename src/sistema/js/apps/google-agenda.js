/* A conta e o estado da sincronização, sem credenciais nem endereços de retorno na página. */
import { h } from '../util.js';
import { Janela } from '../janelas.js';
import { confirmar } from '../dialogos.js';
import { tr, localidade } from '../idioma.js';
import { carregarAgenda } from '../agenda.js';

let aberta = null;
export function abrirGoogleAgenda() {
  if (aberta && !aberta.j.fechada) { aberta.j.focar(); return aberta.j; }
  aberta = new ConexaoGoogle(); return aberta.j;
}

class ConexaoGoogle {
  constructor() {
    this.s = {}; this.calendarios = []; this.lidas = false; this.lendo = false; this.pendente = false; this.erro = '';
    this.j = new Janela({ id: 'google-agenda', titulo: tr('Google Calendar'), icone: 'calendario', largura: 560, altura: 540, minLargura: 430, minAltura: 350, classe: 'google-agenda' });
    this.corpo = h('div.google-agenda-conteudo'); this.j.corpo.append(this.corpo);
    this.parar = retro.googleAgenda.aoMudar((s) => this.atualizar(s));
    this.j.ev.on('ativada', () => retro.googleAgenda.estado().then((s) => this.atualizar(s)).catch(() => {}));
    this.j.ev.on('fechada', () => { this.parar(); aberta = null; });
    retro.googleAgenda.estado().then((s) => this.atualizar(s)).catch((e) => { this.erro = e.message; this.desenhar(); });
  }
  async acao(f) {
    if (this.pendente) return;
    this.pendente = true; this.erro = ''; this.desenhar();
    try { const s = await f(); if (s?.configurado !== undefined) this.atualizar(s); }
    catch (e) { this.erro = e.message; }
    finally { this.pendente = false; this.desenhar(); }
  }
  atualizar(s) {
    if (this.j.fechada) return;
    const mudou = this.s.conectado !== s.conectado;
    this.s = s;
    if (mudou) this.lidas = false;
    this.desenhar();
    if (s.conectado && !s.autorizando && !s.calendario && !this.lidas && !this.lendo) this.carregarLista();
  }
  async carregarLista() {
    this.lendo = true; this.erro = ''; this.desenhar();
    try { this.calendarios = await retro.googleAgenda.calendarios(); this.lidas = true; }
    catch (e) { this.erro = e.message; }
    finally { this.lendo = false; this.desenhar(); }
  }
  botao(texto, f, desativado = false, padrao = false) {
    return h('button' + (padrao ? '.padrao' : ''), { disabled: desativado || this.pendente, on: { click: () => this.acao(f) } }, texto);
  }
  async ativar(id) {
    const c = this.calendarios.find((c) => c.id === id && c.gravavel); if (!c) return;
    if (!await confirmar(tr('Sincronizar a Agenda com “{nome}”?\n\nOs eventos do Retro e do Google serão reunidos. A partir daí, alterações e exclusões serão sincronizadas nos dois sentidos. Conflitos serão mostrados para você escolher.', { nome: c.nome }), { titulo: tr('Conectar Google Calendar') })) return;
    const s = await retro.googleAgenda.selecionar(id); await carregarAgenda({ deNovo: true }); return s;
  }
  resumoEvento(e) {
    if (!e) return tr('(Excluído)');
    const repetir = e.repetir ? tr('Repetição: {regra}', { regra: ({ diaria: tr('Diária'), semanal: tr('Semanal'), mensal: tr('Mensal'), anual: tr('Anual') })[e.repetir.freq] || e.repetir.original || '' }) : '';
    return [e.titulo || tr('(Sem título)'), e.inicio + (e.fim ? ' — ' + e.fim : ''), e.diaTodo ? tr('Dia todo') : '', e.local, e.descricao, e.lembrete == null ? '' : tr('Lembrete: {n} minuto(s) antes', { n: e.lembrete }), repetir].filter(Boolean).join('\n');
  }
  desenhar() {
    if (this.j.fechada) return;
    const s = this.s;
    const anterior = this.corpo.querySelector('select')?.value;
    const detalhesAbertos = this.corpo.querySelector('details')?.open;
    this.j.el.dataset.conectado = String(!!s.conectado); this.j.el.dataset.sincronizando = String(!!s.ocupado); this.j.el.dataset.ativo = String(!!s.calendario); this.j.el.dataset.ultima = String(s.ultima || 0);
    const status = s.autorizando ? tr('Aguardando a autorização no navegador…') : s.ocupado ? tr('Sincronizando…') : !s.cofre ? tr('Aguardando o cofre de senhas') : !s.conectado ? tr('Google ainda não conectado') : s.pausado && s.calendario ? tr('Sincronização pausada') : s.calendario ? tr('Sincronização nos dois sentidos ativada') : tr('Escolha um calendário para sincronizar');
    const conteudo = [h('h3', status), h('p', tr('Use a mesma Agenda no Retro e no Google. Você pode trabalhar sem internet; as alterações são enviadas quando a conexão volta.'))];
    if (s.mensagem || this.erro) conteudo.push(h('p.google-agenda-erro', { role: 'alert' }, this.erro || s.mensagem));
    if (!s.cofre) conteudo.push(h('p', tr('O cofre de senhas do sistema precisa estar disponível para guardar a conexão do Google.')));
    const configurar = h('details', { open: detalhesAbertos ?? !s.configurado }, h('summary', tr('Configurar a conexão do Google')),
      h('p', tr('O login usa um cadastro do aplicativo no Google. Se o instalador não trouxer essa configuração, importe uma configuração pessoal. Não cole sua senha aqui.')),
      h('ol', h('li', tr('No Google Cloud, crie um projeto e ative a API Google Calendar.')), h('li', tr('Configure a tela de consentimento e, se o projeto estiver em teste, adicione sua conta como usuário de teste.')), h('li', tr('Crie um cliente OAuth do tipo Aplicativo para computador e baixe o arquivo JSON. Importe esse arquivo pelo botão abaixo.'))),
      h('div.acoes', this.botao(tr('Google Cloud Console'), () => retro.googleAgenda.guia(true)), this.botao(tr('Instruções do Google'), () => retro.googleAgenda.guia(false))),
      this.botao(tr('Importar configuração do Google…'), () => retro.googleAgenda.configurar(), s.conectado || s.autorizando || !s.cofre));
    conteudo.push(configurar);
    if (s.autorizando) conteudo.push(h('p', tr('O navegador padrão foi aberto apenas para entrar no Google. Depois de autorizar, volte a esta janela.')), h('div.acoes', this.botao(tr('Abrir login novamente'), () => retro.googleAgenda.abrirLogin()), this.botao(tr('Cancelar autorização'), () => retro.googleAgenda.cancelarLogin())));
    else conteudo.push(this.botao(s.conectado ? tr('Entrar novamente no Google') : tr('Conectar Google'), () => retro.googleAgenda.conectar(), !s.configurado || !s.cofre || s.ocupado));
    if (s.conectado && !s.calendario && !s.autorizando) {
      const seletor = h('select', { 'aria-label': tr('Calendário do Google'), disabled: this.lendo }, ...this.calendarios.map((c) => h('option', { value: c.id, disabled: !c.gravavel }, c.nome + (c.gravavel ? '' : ' · ' + tr('Somente leitura')))));
      if (this.calendarios.some((c) => c.id === anterior && c.gravavel)) seletor.value = anterior;
      else { const c = this.calendarios.find((c) => c.primario && c.gravavel) || this.calendarios.find((c) => c.gravavel); if (c) seletor.value = c.id; }
      conteudo.push(h('label.google-agenda-calendario', tr('Calendário do Google'), seletor), h('p', this.lendo ? tr('Buscando calendários…') : !this.calendarios.some((c) => c.gravavel) ? tr('Nenhum calendário com permissão de edição. Confira a conta e atualize a lista.') : tr('A assinatura .ics antiga do mesmo calendário será ocultada para evitar eventos duplicados.')),
        h('div.acoes', this.botao(tr('Ativar sincronização'), () => this.ativar(seletor.value), this.lendo || !this.calendarios.some((c) => c.gravavel), true), this.botao(tr('Atualizar lista'), () => this.carregarLista(), this.lendo)));
    }
    if (s.calendario) {
      conteudo.push(h('p', h('b', s.calendario.nome)), h('p', s.ultima ? tr('Última sincronização: {hora}', { hora: new Date(s.ultima).toLocaleString(localidade()) }) : tr('A primeira sincronização ainda não terminou.')),
        h('div.acoes', this.botao(tr('Sincronizar agora'), async () => { const r = await retro.googleAgenda.sincronizar(); await carregarAgenda({ deNovo: true }); return r; }, s.ocupado || s.pausado || s.autorizando, true), this.botao(s.pausado ? tr('Retomar sincronização') : tr('Pausar sincronização'), () => retro.googleAgenda.pausar(!s.pausado), s.ocupado)));
      conteudo.push(this.botao(tr('Mostrar cópias de recuperação'), () => retro.googleAgenda.copias()));
      for (const c of s.conflitos || []) conteudo.push(h('section.google-agenda-conflito', h('h4', tr('Escolha a versão de “{titulo}”', { titulo: c.titulo || tr('(Sem título)') })), h('div.google-agenda-versoes', h('div', h('b', tr('No Retro')), h('pre', this.resumoEvento(c.local))), h('div', h('b', tr('No Google')), h('pre', this.resumoEvento(c.google)))), h('div.acoes', this.botao(tr('Manter versão do Retro'), () => retro.googleAgenda.resolver(c.chave, 'local'), s.ocupado), this.botao(tr('Usar versão do Google'), async () => { const r = await retro.googleAgenda.resolver(c.chave, 'google'); await carregarAgenda({ deNovo: true }); return r; }, s.ocupado))));
    }
    if (s.conectado || s.calendario) conteudo.push(this.botao(tr('Desconectar Google…'), async () => {
      if (await confirmar(tr('Desconectar o Google?\n\nA sincronização será interrompida. Os eventos que já estão na Agenda ficam neste computador; os do Google continuam no Google.'), { titulo: tr('Google Calendar') })) return retro.googleAgenda.desconectar();
    }, s.ocupado));
    this.corpo.replaceChildren(...conteudo);
  }
}
