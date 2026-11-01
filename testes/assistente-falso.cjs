'use strict';
/* Provedores locais, sem conta/modelos. As capturas conectam o MCP real do perfil temporário. */
const fs = require('node:fs');
const readline = require('node:readline');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const args = process.argv.slice(2);
const codex = args.includes('app-server');
let sessao = 'teste-' + crypto.randomUUID(), turno = '', mensagem = '', permissoes = new Map(), numero = 0;
const saida = (m) => process.stdout.write(JSON.stringify(m) + '\n');
const evento = (method, params) => saida({ method, params: { threadId: sessao, ...params } });
const responder = (id, result) => saida({ id, result });
const controle = (id, response) => saida({ type: 'control_response', response: { request_id: id, subtype: 'success', response } });
const registrar = (pedido) => {
  if (process.env.RETRO_ASSISTENTE_RELATORIO) fs.appendFileSync(process.env.RETRO_ASSISTENTE_RELATORIO, JSON.stringify({ motor: codex ? 'codex' : 'claude', pedido, args, chaveClaude: !!process.env.ANTHROPIC_API_KEY, electronComoNode: !!process.env.ELECTRON_RUN_AS_NODE }) + '\n');
};
async function ferramenta() {
  if (process.env.RETRO_ASSISTENTE_SEM_MCP) return true;
  let executavel, script;
  if (codex) {
    const cfg = args.find((a) => a.startsWith('mcp_servers.retro-computer='));
    if (!cfg) return false;
    executavel = JSON.parse(cfg.match(/command=("(?:\\.|[^"\\])*")/)[1]);
    [script] = JSON.parse(cfg.match(/args=(\[(?:"(?:\\.|[^"\\])*"[,]?)*\])/)[1]);
  } else {
    const cfg = JSON.parse(fs.readFileSync(args[args.indexOf('--mcp-config') + 1], 'utf8')).mcpServers['retro-computer'];
    executavel = cfg.command; [script] = cfg.args;
  }
  return new Promise((resolve) => {
    const p = spawn(executavel, [script], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, stdio: ['pipe', 'pipe', 'pipe'] });
    const prazo = setTimeout(() => { p.kill(); resolve(false); }, 6000);
    const fim = (r) => { clearTimeout(prazo); p.kill(); resolve(r); };
    p.on('error', () => fim(false)); p.stderr.resume();
    const linhas = readline.createInterface({ input: p.stdout });
    linhas.on('line', (s) => {
      const r = JSON.parse(s);
      if (r.id === 1) p.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'mudar_configuracoes', arguments: { configuracoes: { papel: { cor: '#224466', padrao: 'nenhum' } } } } }) + '\n');
      if (r.id === 2) fim(!r.error && !r.result?.isError);
    });
    p.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'assistente-teste', version: '1' } } }) + '\n');
  });
}
async function concluir(permitido) {
  const ok = permitido && await ferramenta();
  const texto = permitido ? (ok ? 'Concluído! Alterei a aparência do Retro. Café ☕ e código C. <img src=x onerror=alert(1)>' : 'Falha ao conectar o MCP.') : 'Ação recusada; mantive os arquivos e as configurações.';
  if (codex) {
    evento('item/completed', { item: { id: 'ferramenta-' + numero, type: 'mcpToolCall', tool: 'mudar_configuracoes', status: permitido ? 'completed' : 'declined' } });
    evento('item/agentMessage/delta', { itemId: mensagem, delta: texto });
    evento('item/completed', { item: { id: mensagem, type: 'agentMessage', text: texto } });
    evento('turn/completed', { turn: { id: turno, status: 'completed' } });
  } else {
    saida({ type: 'stream_event', event: { type: 'message_start', message: { id: mensagem } } });
    // UUID diferente em cada delta: o cliente deve usar o id da mensagem, não o do evento.
    for (const pedaco of [texto.slice(0, 24), texto.slice(24)]) saida({ type: 'stream_event', uuid: crypto.randomUUID(), event: { type: 'content_block_delta', delta: { type: 'text_delta', text: pedaco } } });
    saida({ type: 'assistant', message: { id: mensagem, content: [{ type: 'text', text: texto }] } });
    saida({ type: 'result', session_id: sessao, is_error: false, result: texto });
  }
}
function comecar(pedido) {
  numero++; turno = 'turno-' + numero; mensagem = 'mensagem-' + crypto.randomUUID();
  registrar(pedido);
  if (codex) evento('turn/started', { turn: { id: turno } });
  else saida({ type: 'system', subtype: 'init', session_id: sessao });
  if (pedido.includes('demorar')) return;
  if (pedido.includes('pergunta')) {
    const id = 'pergunta-' + numero;
    permissoes.set(id, 'pergunta');
    if (codex) saida({ id, method: 'item/tool/requestUserInput', params: { threadId: sessao, turnId: turno, questions: [{ id: 'cor', question: 'Qual cor você prefere?', options: [{ label: 'Azul' }, { label: 'Verde' }] }] } });
    else saida({ type: 'control_request', request_id: id, request: { subtype: 'can_use_tool', tool_name: 'AskUserQuestion', input: { questions: [{ question: 'Qual cor você prefere?', options: [{ label: 'Azul' }, { label: 'Verde' }] }] } } });
    return;
  }
  const id = 'permissao-' + numero; permissoes.set(id, 'acao');
  if (codex) {
    evento('item/started', { item: { id: 'ferramenta-' + numero, type: 'mcpToolCall', tool: 'mudar_configuracoes', status: 'inProgress' } });
    saida({ id, method: 'item/commandExecution/requestApproval', params: { threadId: sessao, turnId: turno, command: 'teste: mudar a cor do fundo', reason: 'Mudar a aparência do Retro', availableDecisions: ['accept', 'decline', 'cancel'] } });
  } else saida({ type: 'control_request', request_id: id, request: { subtype: 'can_use_tool', tool_name: 'mcp__retro-computer__mudar_configuracoes', input: { configuracoes: { papel: { cor: '#224466' } } } } });
}
const rl = readline.createInterface({ input: process.stdin });
rl.on('line', async (s) => {
  const m = JSON.parse(s);
  if (codex) {
    if (m.method === 'initialize') responder(m.id, {});
    else if (m.method === 'thread/start' || m.method === 'thread/resume') { sessao = m.params.threadId || sessao; responder(m.id, { thread: { id: sessao } }); }
    else if (m.method === 'turn/start') { responder(m.id, { turn: { id: 'turno-' + (numero + 1) } }); comecar(m.params.input[0].text); }
    else if (m.method === 'turn/interrupt') { responder(m.id, {}); evento('turn/completed', { turn: { id: turno, status: 'interrupted' } }); }
    else if (m.id && permissoes.has(m.id)) { const p = permissoes.get(m.id); permissoes.delete(m.id); await concluir(p === 'pergunta' ? Object.values(m.result.answers).some((v) => v.answers.length) : m.result.decision === 'accept'); }
  } else {
    if (m.type === 'control_request') controle(m.request_id, {});
    if (m.type === 'user') comecar(m.message.content);
    if (m.type === 'control_response' && permissoes.has(m.response.request_id)) { permissoes.delete(m.response.request_id); await concluir(m.response.response.behavior === 'allow'); }
  }
});
