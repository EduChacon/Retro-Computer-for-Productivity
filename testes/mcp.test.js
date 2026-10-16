'use strict';
// O Claude ajusta o Retro Computer: o servidor MCP (mcp-retro.js) falando com o processo principal (mcp.js).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { ServidorMcp, FERRAMENTAS, filtrarConfig, textoSistema } = require('../src/principal/mcp.js');
const { comandoClaude } = require('../src/principal/terminal.js');

test('mcp: o Claude só muda as configurações seguras', () => {
  const { aceitas, recusadas } = filtrarConfig({ papel: { cor: '#004080' }, barra: { fixados: [] }, disco: '/etc', bloqueio: { senha: 'x' }, atualizacoes: 'nunca', navegador: { soHttps: false } });
  assert.deepEqual(Object.keys(aceitas), ['papel', 'barra']);
  assert.deepEqual(recusadas, ['disco', 'bloqueio', 'atualizacoes', 'navegador']);
  assert.deepEqual(filtrarConfig(null), { aceitas: {}, recusadas: [] });
  assert.deepEqual(filtrarConfig([1, 2]), { aceitas: {}, recusadas: [] });
  // As regras da casa estão no texto do sistema.
  const t = textoSistema({ raiz: '/home/eu/Retro Computer' });
  assert.match(t, /mover_para_lixeira/);
  assert.match(t, /\/home\/eu\/Retro Computer/);
  assert.ok(FERRAMENTAS.every((f) => /^[a-z_]+$/.test(f.name) && f.inputSchema && f.inputSchema.type === 'object'));
});

test('mcp: o comando do Claude com o servidor (as variáveis, e o --mcp-config por último)', () => {
  const antes = process.env.RETRO_CLAUDE_FALSO;
  delete process.env.RETRO_CLAUDE_FALSO;
  try {
    assert.equal(comandoClaude({ ajustes: true, plataforma: 'linux' }), 'claude --append-system-prompt-file "$RETRO_CLAUDE_SISTEMA" --mcp-config "$RETRO_CLAUDE_MCP"');
    assert.equal(comandoClaude({ pedido: true, ajustes: true, plataforma: 'win32' }), 'claude $env:RETRO_PEDIDO --append-system-prompt-file $env:RETRO_CLAUDE_SISTEMA --mcp-config $env:RETRO_CLAUDE_MCP');
  } finally {
    if (antes !== undefined) process.env.RETRO_CLAUDE_FALSO = antes;
  }
});

/** Uma conversa MCP com o mcp-retro.js de verdade: as mensagens vão pela entrada, as respostas voltam pela saída. */
function conversar(env, mensagens) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [path.join(__dirname, '..', 'src', 'principal', 'mcp-retro.js')], { env: { ...process.env, ...env } });
    const respostas = [];
    let resto = '';
    const esperadas = mensagens.filter((m) => m.id != null).length;
    const fim = setTimeout(() => { p.kill(); reject(new Error('sem resposta: ' + JSON.stringify(respostas))); }, 10000);
    p.stdout.on('data', (d) => {
      resto += d;
      let i;
      while ((i = resto.indexOf('\n')) >= 0) {
        respostas.push(JSON.parse(resto.slice(0, i)));
        resto = resto.slice(i + 1);
      }
      if (respostas.length >= esperadas) { clearTimeout(fim); p.kill(); resolve(respostas); }
    });
    p.on('error', reject);
    for (const m of mensagens) p.stdin.write(JSON.stringify({ jsonrpc: '2.0', ...m }) + '\n');
  });
}

test('mcp: a conversa inteira (initialize, a lista, uma ferramenta, o erro) e o código conferido', async () => {
  const dados = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-mcp-'));
  const chamadas = [];
  const servidor = new ServidorMcp({
    dados,
    executar: async (nome, args) => {
      chamadas.push([nome, args]);
      if (nome === 'mover_para_lixeira') throw new Error('Caminho fora do disco.');
      return { versao: '1.0.0' };
    },
  });
  await servidor.iniciar();
  try {
    const env = { RETRO_MCP_ENDERECO: servidor.endereco, RETRO_MCP_TOKEN: servidor.token };
    const r = await conversar(env, [
      { id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'teste', version: '1' } } },
      { method: 'notifications/initialized' },
      { id: 2, method: 'tools/list' },
      { id: 3, method: 'tools/call', params: { name: 'estado', arguments: {} } },
      { id: 4, method: 'tools/call', params: { name: 'mover_para_lixeira', arguments: { caminho: '../x' } } },
      { id: 5, method: 'nada/disso' },
    ]);
    const por = Object.fromEntries(r.map((x) => [x.id, x]));
    assert.equal(por[1].result.serverInfo.name, 'retro-computer');
    assert.deepEqual(por[1].result.capabilities, { tools: {} });
    assert.deepEqual(por[2].result.tools.map((t) => t.name), FERRAMENTAS.map((f) => f.name));
    assert.match(por[3].result.content[0].text, /"versao": "1.0.0"/);
    assert.equal(por[4].result.isError, true);
    assert.match(por[4].result.content[0].text, /fora do disco/);
    assert.equal(por[5].error.code, -32601);
    assert.deepEqual(chamadas.map((c) => c[0]), ['estado', 'mover_para_lixeira']);
    // Sem o código certo, nada é feito.
    const sem = await new Promise((resolve) => {
      const s = net.connect(servidor.endereco, () => s.write(JSON.stringify({ id: 9, token: 'errado', nome: 'estado', args: {} }) + '\n'));
      s.setEncoding('utf8');
      s.on('data', (d) => { s.end(); resolve(JSON.parse(d.split('\n')[0])); });
    });
    assert.equal(sem.ok, false);
    assert.equal(chamadas.length, 2);
    // Os arquivos do Claude: o config do MCP (só para o dono) e o texto do sistema.
    const arqs = servidor.arquivos({ executavel: '/usr/bin/electron', script: '/app/mcp-retro.js', raiz: '/disco' });
    const conf = JSON.parse(fs.readFileSync(arqs.mcp, 'utf8'));
    assert.equal(conf.mcpServers['retro-computer'].env.RETRO_MCP_TOKEN, servidor.token);
    assert.equal(conf.mcpServers['retro-computer'].env.ELECTRON_RUN_AS_NODE, '1');
    if (process.platform !== 'win32') assert.equal(fs.statSync(arqs.mcp).mode & 0o077, 0);
    assert.match(fs.readFileSync(arqs.sistema, 'utf8'), /\/disco/);
  } finally {
    servidor.fechar();
  }
});
