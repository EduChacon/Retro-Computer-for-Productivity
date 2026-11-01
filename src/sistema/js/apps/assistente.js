/* Chat próprio do Retro: o mesmo companheiro pode usar Claude Code ou Codex. */
import { h, caminhoTela } from '../util.js';
import { Janela } from '../janelas.js';
import { registrarApp, estado, abrir, definirConfig } from '../sistema.js';
import { erro, caixaArquivo } from '../dialogos.js';
import { tr } from '../idioma.js';
import { MASCOTES, ESTADOS, figuraMascote, mudarFigura, nomeMascote } from '../mascotes.js';
import { TIPO_ARRASTO, relsDoArrasto } from '../arquivos.js';

let atual = null;
const cfg = () => estado.config.assistente || {};

export async function arquivosDoArrasto(dt) {
  let internos;
  try { internos = JSON.parse(dt.getData(TIPO_ARRASTO) || 'null'); } catch { }
  if (Array.isArray(internos)) return internos.filter((r) => typeof r === 'string').slice(0, 8);
  const fora = [...(dt.files || [])].map((f) => retro.disco.caminhoDe(f)).filter(Boolean);
  if (!fora.length) return [];
  const relativos = await retro.disco.relDe(fora).catch(() => []);
  const daqui = relativos?.filter((r) => r != null) || [];
  if (daqui.length) { await relsDoArrasto(fora); return daqui.slice(0, 8); }
  return [];
}

class Chat {
  constructor(args = {}) {
    this.arquivos = []; this.contexto = ''; this.s = { ocupado: false, estado: 'pronto', pedidos: [], atividade: [], conversa: null };
    this.elementos = new Map(); this.pedidoAssinatura = '';
    this.j = new Janela({ titulo: tr('Assistente do Retro'), icone: 'assistente', largura: 790, altura: 590, minLargura: 470, minAltura: 360, classe: 'assistente-chat' });
    this.j.reabrir = () => ({});
    this.figura = figuraMascote(cfg().mascote);
    this.nome = h('b', nomeMascote(cfg().mascote));
    this.situacao = h('span', tr('Pronto para ajudar'));
    this.motor = h('select', { 'aria-label': tr('Motor do assistente'), on: { change: () => this.nova(this.motor.value) } }, h('option', { value: 'codex' }, 'Codex'), h('option', { value: 'claude' }, 'Claude Code'));
    this.motor.value = cfg().motor || 'codex';
    this.historico = h('div.assistente-historico', { 'aria-label': tr('Conversas') });
    this.mensagens = h('div.assistente-mensagens', { role: 'log', 'aria-label': tr('Conversa com o assistente') });
    this.vazio = h('div.assistente-vazio', h('b', tr('Como posso ajudar?')), h('p', tr('Converse, anexe um arquivo ou peça ajuda com o Retro Computer.')),
      h('div.assistente-sugestoes', ...[tr('O que você consegue fazer no Retro?'), tr('Me ajude a aprender C, sem resolver tudo por mim.'), tr('Quais são meus compromissos desta semana?')].map((t) => h('button', { on: { click: () => { this.entrada.value = t; this.entrada.focus(); } } }, t))));
    this.mensagens.append(this.vazio);
    this.confirmacoes = h('div.assistente-confirmacoes', { 'aria-live': 'polite' });
    this.anexos = h('div.assistente-anexos');
    this.entrada = h('textarea.assistente-entrada', { spellcheck: true, rows: 3, maxLength: 16000, 'aria-label': tr('Mensagem para o assistente'), placeholder: tr('Escreva sua mensagem…') });
    this.enviarBt = h('button.padrao', { on: { click: () => this.enviar() } }, tr('Enviar'));
    this.pararBt = h('button', { disabled: true, on: { click: () => retro.assistente.parar().catch((e) => erro(e.message)) } }, tr('Interromper'));
    this.atividades = h('details.assistente-atividade', h('summary', tr('Ações desta tarefa')), this.atividadeLista = h('div'));
    this.avisos = h('div.assistente-erro', { hidden: true, role: 'alert' });
    this.opcoes = h('div.assistente-opcoes', { hidden: true });
    const topo = h('div.assistente-cabecalho', this.figura, h('div', this.nome, this.situacao), this.motor,
      h('button', { on: { click: () => this.mostrarOpcoes(!this.opcoes.hidden) } }, tr('Mascotes e opções…')));
    this.conteudo = h('div.assistente-conteudo', h('aside', h('button', { on: { click: () => this.nova(this.motor.value) } }, tr('Nova conversa')), this.historico),
      h('div.assistente-conversa', this.mensagens, this.atividades, this.confirmacoes, this.avisos, this.anexos, this.entrada,
        h('div.assistente-enviar', h('button', { on: { click: () => this.anexar() } }, tr('Anexar arquivo…')), h('span', tr('Enter envia; Shift+Enter quebra a linha.')), this.pararBt, this.enviarBt)));
    this.j.corpo.append(topo, this.conteudo, this.opcoes);
    this.desouvir = retro.assistente.aoMudar((s) => this.atualizar(s));
    this.j.ev.on('fechada', () => { this.desouvir(); atual = null; });
    this.entrada.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); this.enviar(); } });
    this.j.el.addEventListener('dragover', (e) => { e.preventDefault(); });
    this.j.el.addEventListener('drop', async (e) => { e.preventDefault(); this.adicionar({ arquivos: await arquivosDoArrasto(e.dataTransfer) }); });
    this.carregar(args);
  }
  async carregar(args) {
    try { this.atualizar(await retro.assistente.estado()); await this.lista(); } catch (e) { this.mostrarErro(e.message); }
    this.adicionar(args);
    if (args.opcoes) this.mostrarOpcoes(false);
  }
  adicionar({ arquivos = [], pedido = '', contexto = '' } = {}) {
    this.arquivos = [...new Set([...this.arquivos, ...arquivos])].slice(0, 8);
    if (pedido) this.entrada.value = pedido;
    if (contexto) this.contexto = contexto;
    this.atualizarAnexos();
  }
  async nova(motor) {
    try {
      const s = await retro.assistente.nova(motor);
      await definirConfig({ assistente: { motor } });
      this.atualizar(s); this.elementos.clear(); this.mensagens.replaceChildren(this.vazio); this.entrada.value = ''; this.contexto = ''; this.arquivos = []; this.atualizarAnexos(); await this.lista();
    } catch (e) { this.motor.value = this.s.conversa?.motor || cfg().motor || 'codex'; this.mostrarErro(e.message); }
  }
  async lista() {
    const cs = await retro.assistente.lista();
    this.historico.replaceChildren(...cs.map((c) => h('button', { class: this.s.conversa?.id === c.id ? 'selecionado' : '', title: c.titulo, on: { click: async () => {
      try { this.atualizar(await retro.assistente.carregar(c.id)); await this.lista(); } catch (e) { this.mostrarErro(e.message); }
    } } }, h('span', c.titulo), h('small', c.motor === 'claude' ? 'Claude Code' : 'Codex'))));
  }
  atualizar(s) {
    const trocou = this.s.conversa?.id !== s.conversa?.id;
    const terminou = this.s.ocupado && !s.ocupado;
    this.s = s;
    this.j.el.dataset.estado = s.estado;
    this.j.el.dataset.ocupado = String(s.ocupado);
    this.j.el.dataset.motor = s.conversa?.motor || cfg().motor || 'codex';
    if (trocou) { this.elementos.clear(); this.mensagens.replaceChildren(this.vazio); }
    mudarFigura(this.figura, cfg().mascote, s.estado);
    this.nome.textContent = nomeMascote(cfg().mascote);
    this.situacao.textContent = tr(ESTADOS[s.estado] || ESTADOS.pronto);
    this.motor.value = s.conversa?.motor || cfg().motor || 'codex'; this.motor.disabled = s.ocupado;
    this.enviarBt.disabled = s.ocupado; this.pararBt.disabled = !s.ocupado;
    const perto = this.mensagens.scrollHeight - this.mensagens.scrollTop - this.mensagens.clientHeight < 80;
    const ms = s.conversa?.mensagens || [];
    this.vazio.hidden = !!ms.length;
    for (const m of ms) {
      let el = this.elementos.get(m.id);
      if (!el) {
        el = h('article.assistente-mensagem', { 'data-papel': m.papel }, h('b', m.papel === 'usuario' ? tr('Você') : nomeMascote(cfg().mascote)), h('pre'));
        this.elementos.set(m.id, el); this.mensagens.append(el);
      }
      const texto = m.texto + (m.arquivos?.length ? '\n\n' + m.arquivos.map(caminhoTela).join('\n') : '') + (m.contexto ? '\n\n' + tr('Código do laboratório anexado') : '');
      if (el.lastChild.textContent !== texto) el.lastChild.textContent = texto;
    }
    if (perto || trocou) this.mensagens.scrollTop = this.mensagens.scrollHeight;
    this.mostrarErro(s.erro || '');
    this.atividadeLista.replaceChildren(...(s.atividade || []).map((a) => h('div', h('span', a.estado === 'completed' ? '✓ ' : '› '), a.texto)));
    this.atividades.hidden = !s.atividade?.length;
    const assinatura = JSON.stringify(s.pedidos || []);
    if (this.pedidoAssinatura !== assinatura) { this.pedidoAssinatura = assinatura; this.montarConfirmacoes(s.pedidos || []); }
    if (terminou) this.lista().catch(() => { });
  }
  mostrarErro(t) { this.avisos.hidden = !t; this.avisos.textContent = t || ''; }
  atualizarAnexos() {
    this.anexos.replaceChildren(...this.arquivos.map((r) => h('button', { title: tr('Retirar anexo'), on: { click: () => { this.arquivos = this.arquivos.filter((a) => a !== r); this.atualizarAnexos(); } } }, caminhoTela(r), ' ×')),
      ...(this.contexto ? [h('button', { on: { click: () => { this.contexto = ''; this.atualizarAnexos(); } } }, tr('Código do laboratório anexado'), ' ×')] : []));
  }
  async anexar() {
    const rel = await caixaArquivo({ salvar: false, titulo: tr('Anexar arquivo ao assistente') });
    if (rel) this.adicionar({ arquivos: [rel] });
  }
  async enviar() {
    const texto = this.entrada.value.trim();
    if (!texto || this.s.ocupado) return;
    this.enviarBt.disabled = true;
    try {
      if (!this.s.conversa) this.atualizar(await retro.assistente.nova(this.motor.value));
      const pedido = { texto, arquivos: this.arquivos, contexto: this.contexto };
      this.entrada.value = ''; this.arquivos = []; this.contexto = ''; this.atualizarAnexos();
      await retro.assistente.enviar(pedido);
    } catch (e) { this.entrada.value = texto; this.mostrarErro(e.message); }
    finally { this.enviarBt.disabled = this.s.ocupado; }
  }
  montarConfirmacoes(pedidos) {
    this.confirmacoes.replaceChildren(...pedidos.map((p) => {
      const campos = new Map();
      const el = h('section.assistente-pedido', h('b', p.titulo), p.tipo === 'perguntas' ? null : h('pre', p.detalhe));
      for (const q of p.perguntas) {
        const campo = h('input', { type: 'text', maxLength: 4000, 'aria-label': q.texto }); campos.set(q.id, campo);
        el.append(h('label', h('span', q.texto), h('div.assistente-respostas', ...q.opcoes.map((o) => h('button', { on: { click: () => { campo.value = o; } } }, o))), campo));
      }
      const responder = async (permitir) => {
        try { await retro.assistente.responder(p.id, { permitir, respostas: Object.fromEntries([...campos].map(([id, c]) => [id, c.value])) }); }
        catch (e) { this.mostrarErro(e.message); }
      };
      if (p.tipo === 'indisponivel') el.append(h('p', tr('Continue esta confirmação no terminal do motor.')));
      el.append(h('div.acoes', h('button', { on: { click: () => responder(false) } }, tr('Recusar')), p.tipo === 'indisponivel' ? null : h('button.padrao', { on: { click: () => responder(true) } }, p.tipo === 'perguntas' ? tr('Responder') : tr('Permitir uma vez'))));
      return el;
    }));
  }
  mostrarOpcoes(fechar) {
    this.opcoes.hidden = fechar; this.conteudo.hidden = !fechar;
    if (fechar) return;
    const escolhido = cfg().mascote || 'monitorzinho';
    const cards = h('div.assistente-mascotes', ...MASCOTES.map((m) => h('button.mascote-escolha', { 'data-id': m.id, 'aria-pressed': String(m.id === escolhido), on: { click: async () => {
      await definirConfig({ assistente: { mascote: m.id, visivel: true } }); this.mostrarOpcoes(false); mudarFigura(this.figura, m.id, this.s.estado); this.nome.textContent = nomeMascote(m.id);
    } } }, figuraMascote(m.id, this.previa || 'pronto'), h('b', tr(m.nome)), h('span', tr(m.descricao)))));
    const previa = h('select', { 'aria-label': tr('Prévia da animação'), on: { change: () => { this.previa = previa.value; this.mostrarOpcoes(false); } } },
      ...Object.entries(ESTADOS).map(([id, texto]) => h('option', { value: id }, tr(texto))));
    previa.value = this.previa || 'pronto';
    const check = (texto, chave, padrao = true) => {
      const c = h('input', { type: 'checkbox', checked: cfg()[chave] ?? padrao, on: { change: () => definirConfig({ assistente: { [chave]: c.checked } }) } });
      return h('label', c, ' ', texto);
    };
    const tamanho = h('select', { 'aria-label': tr('Tamanho do mascote'), on: { change: () => definirConfig({ assistente: { tamanho: tamanho.value } }) } },
      h('option', { value: 'pequeno' }, tr('Pequeno')), h('option', { value: 'normal' }, tr('Normal')), h('option', { value: 'grande' }, tr('Grande')));
    tamanho.value = cfg().tamanho || 'normal';
    this.opcoes.replaceChildren(h('div.assistente-escolha-topo', h('h3', tr('Escolha seu companheiro')), h('label', tr('Prévia da animação'), ' ', previa)), cards,
      h('div.assistente-preferencias', check(tr('Mostrar o mascote na área de trabalho'), 'visivel'), check(tr('Animar o mascote'), 'animacoes'), check(tr('Permitir ajustes no Retro Computer'), 'ajustes'), h('label', tr('Tamanho do mascote'), ' ', tamanho)),
      h('p', tr('O mascote pode usar Claude Code ou Codex. A conta e os limites de uso são os do motor escolhido.')),
      h('div.acoes', h('button', { on: { click: () => abrir(this.motor.value, { configurar: true }) } }, tr('Instalação e conta…')),
        h('button', { on: { click: () => definirConfig({ assistente: { posicao: null } }) } }, tr('Reposicionar mascote')),
        h('button.padrao', { on: { click: () => this.mostrarOpcoes(true) } }, tr('Voltar à conversa'))));
  }
}

function abrirAssistente(args = {}) {
  if (atual && !atual.j.fechada) { atual.j.focar(); atual.adicionar(args); if (args.opcoes) atual.mostrarOpcoes(false); return atual.j; }
  atual = new Chat(args); return atual.j;
}
registrarApp('assistente', { nome: 'Assistente do Retro', icone: 'assistente', abrir: abrirAssistente });
