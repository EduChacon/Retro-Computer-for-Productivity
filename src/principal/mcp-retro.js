'use strict';
/*
 * O servidor MCP do Retro Computer, que o Claude Code roda (pelo Electron como Node, com
 * ELECTRON_RUN_AS_NODE=1): fala o JSON-RPC 2.0 do MCP pela entrada e pela saída padrão, uma
 * mensagem por linha, e repassa as ferramentas ao Retro Computer aberto pelo soquete local
 * (RETRO_MCP_ENDERECO), com o código da abertura (RETRO_MCP_TOKEN). As ferramentas e as regras
 * ficam no processo principal (mcp.js); este arquivo só leva e traz. Sem dependências.
 */
const net = require('node:net');
const readline = require('node:readline');

const ENDERECO = process.env.RETRO_MCP_ENDERECO || '';
const TOKEN = process.env.RETRO_MCP_TOKEN || '';
const VERSAO_PROTOCOLO = '2025-06-18';

let n = 0;
/** Um pedido ao Retro Computer (uma conexão por pedido: simples, e o Retro Computer pode ter reiniciado). */
function chamar(nome, args) {
  return new Promise((resolve, reject) => {
    const id = ++n;
    const s = net.connect(ENDERECO);
    let resto = '';
    const fim = setTimeout(() => { s.destroy(); reject(new Error('O Retro Computer não respondeu.')); }, 120000);
    s.setEncoding('utf8');
    s.on('connect', () => s.write(JSON.stringify({ id, token: TOKEN, nome, args }) + '\n'));
    s.on('data', (d) => {
      resto += d;
      const i = resto.indexOf('\n');
      if (i < 0) return;
      clearTimeout(fim);
      s.end();
      let r;
      try { r = JSON.parse(resto.slice(0, i)); } catch { reject(new Error('resposta inválida')); return; }
      if (r.ok) resolve(r.valor); else reject(new Error(r.erro || 'erro'));
    });
    s.on('error', () => { clearTimeout(fim); reject(new Error('O Retro Computer não está aberto (ou foi reiniciado): abra o Claude de novo pelo Prompt de comando.')); });
  });
}

const enviar = (m) => process.stdout.write(JSON.stringify(m) + '\n');
const responder = (id, result) => enviar({ jsonrpc: '2.0', id, result });
const falhar = (id, code, message) => enviar({ jsonrpc: '2.0', id, error: { code, message } });

async function tratar(m) {
  const { id, method, params } = m;
  const comId = id !== undefined && id !== null;
  try {
    if (method === 'initialize') {
      return responder(id, {
        protocolVersion: (params && params.protocolVersion) || VERSAO_PROTOCOLO,
        capabilities: { tools: {} },
        serverInfo: { name: 'retro-computer', version: '1.0.0' },
      });
    }
    if (method === 'ping') return responder(id, {});
    if (method === 'tools/list') return responder(id, { tools: await chamar('listar', {}) });
    if (method === 'tools/call') {
      try {
        const valor = await chamar(String(params && params.name), (params && params.arguments) || {});
        return responder(id, { content: [{ type: 'text', text: typeof valor === 'string' ? valor : JSON.stringify(valor, null, 1) }] });
      } catch (e) {
        // O erro da ferramenta vai para o Claude ler (não é erro do protocolo).
        return responder(id, { content: [{ type: 'text', text: e.message }], isError: true });
      }
    }
    // As notificações (sem id) não têm resposta.
    if (comId) falhar(id, -32601, 'método desconhecido: ' + method);
  } catch (e) {
    if (comId) falhar(id, -32603, e.message);
  }
}

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (linha) => {
  if (!linha.trim()) return;
  let m;
  try { m = JSON.parse(linha); } catch { falhar(null, -32700, 'JSON inválido'); return; }
  tratar(m);
});
rl.on('close', () => process.exit(0));
