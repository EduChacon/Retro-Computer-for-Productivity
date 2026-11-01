'use strict';
/* CLI local para as capturas: não faz login, não chama modelos e não usa credenciais. */
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const args = process.argv.slice(2);
const relatorio = process.env.RETRO_CODEX_RELATORIO;
const dado = { args, pasta: process.cwd(), chaveClaude: !!process.env.ANTHROPIC_API_KEY, electronComoNode: !!process.env.ELECTRON_RUN_AS_NODE, mcp: false, ferramentas: [] };
const salvar = () => { if (relatorio) fs.appendFileSync(relatorio, JSON.stringify(dado) + '\n'); };
process.stdout.write('Codex — teste local do Retro Computer\r\n');
process.stdout.write('Login e modelos não são usados neste teste.\r\n');

if (args.includes('login')) {
  process.stdout.write(args.includes('--device-auth') ? 'Entrar com código (teste)\r\n' : 'Entrar com ChatGPT (teste)\r\n');
  salvar();
} else {
  const cfg = args.find((a) => a.startsWith('mcp_servers.retro-computer='));
  if (cfg) {
    const comando = JSON.parse(cfg.match(/command=("(?:\\.|[^"\\])*")/)[1]);
    const arqs = JSON.parse(cfg.match(/args=(\[(?:"(?:\\.|[^"\\])*"[,]?)*\])/)[1]);
    const p = spawn(comando, arqs, { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, stdio: ['pipe', 'pipe', 'pipe'] });
    // Exercita mudanças reais, só no perfil temporário das capturas, além de ler o estado.
    const tarefas = [
      ['estado', {}],
      ['mudar_configuracoes', { configuracoes: { papel: { cor: '#335577', padrao: 'nenhum' } } }],
      ['atalho', { programa: 'bloco', onde: 'area_de_trabalho', acao: 'por' }],
      ['agenda_ver', { dias: 1 }],
    ];
    const enviar = (m) => p.stdin.write(JSON.stringify(m) + '\n');
    const pedir = (i) => enviar({ jsonrpc: '2.0', id: i + 2, method: 'tools/call', params: { name: tarefas[i][0], arguments: tarefas[i][1] } });
    let buffer = '';
    p.stdout.on('data', (b) => {
      buffer += b;
      let i;
      while ((i = buffer.indexOf('\n')) >= 0) {
        const linha = buffer.slice(0, i); buffer = buffer.slice(i + 1);
        const r = JSON.parse(linha);
        if (r.id === 1) {
          enviar({ jsonrpc: '2.0', method: 'notifications/initialized' });
          pedir(0);
        } else if (r.id >= 2) {
          const i = r.id - 2;
          if (!r.error && !r.result?.isError) dado.ferramentas.push(tarefas[i][0]);
          if (i + 1 < tarefas.length) pedir(i + 1);
          else {
            dado.mcp = dado.ferramentas.length === tarefas.length;
            process.stdout.write(dado.mcp ? 'Ferramentas do Retro Computer conectadas; aparência e atalho alterados.\r\n' : 'Falha no MCP de teste.\r\n');
            salvar(); p.kill();
          }
        }
      }
    });
    p.on('error', () => { salvar(); });
    enviar({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'teste', version: '1' } } });
  } else salvar();
  process.stdout.write(args.includes('resume') ? 'Retomar conversa (teste)\r\n' : 'Pronto para trabalhar nos arquivos desta pasta.\r\n');
}
process.stdin.resume();
process.stdin.on('data', (b) => { if (b.toString().includes('sair')) process.exit(0); });
