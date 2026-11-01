'use strict';
/* Codex CLI no terminal: argumentos separados, sem passar pedidos ou TOML pelo shell. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { shellPadrao } = require('./terminal');
const { textoSistema } = require('./mcp');
const { tr } = require('./idioma');

function comandoInstalarCodex(plataforma = process.platform) {
  return plataforma === 'win32'
    // O install.ps1 usa RuntimeInformation.OSArchitecture, ausente em alguns Windows PowerShell 5.1.
    ? 'winget install --id OpenAI.Codex --exact --source winget'
    : 'curl -fsSL https://chatgpt.com/codex/install.sh | sh';
}

/** O caminho do instalador autônomo também vale antes de o menu/Finder reler o PATH. */
function candidatosCodex({ plataforma = process.platform, casa = os.homedir(), env = process.env } = {}) {
  const p = plataforma === 'win32' ? path.win32 : path.posix;
  const nome = plataforma === 'win32' ? 'codex.exe' : 'codex';
  const local = env.LOCALAPPDATA || p.join(casa, 'AppData', 'Local');
  return [
    p.join(casa, '.local', 'bin', nome), p.join(casa, '.codex', 'bin', nome),
    ...(plataforma === 'win32'
      ? [
        p.join(local, 'Programs', 'OpenAI', 'Codex', 'bin', nome),
        p.join(local, 'Microsoft', 'WinGet', 'Links', nome),
        ...(env.ProgramFiles ? [p.join(env.ProgramFiles, 'WinGet', 'Links', nome)] : []),
        ...(env.CODEX_INSTALL_DIR ? [p.join(env.CODEX_INSTALL_DIR, nome)] : []),
        p.join(env.APPDATA || p.join(casa, 'AppData', 'Roaming'), 'npm', 'codex.cmd'),
      ]
      : ['/opt/homebrew/bin/codex', '/usr/local/bin/codex']),
  ];
}

function acharCodex() {
  if (process.env.RETRO_CODEX_AUSENTE) return Promise.resolve(null);
  if (process.env.RETRO_CODEX_FALSO) return Promise.resolve(process.env.RETRO_CODEX_FALSO);
  return new Promise((resolve) => {
    const pronto = (_erro, saida) => {
      const encontrados = String(saida || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      // O .exe nativo e o .cmd do npm precedem o .ps1, que depende da política do PowerShell.
      const caminhos = process.platform === 'win32' ? encontrados : encontrados.reverse();
      resolve([...caminhos, ...candidatosCodex()].find((s) => path.isAbsolute(s) && fs.existsSync(s)) || null);
    };
    if (process.platform === 'win32') execFile('where.exe', ['codex.exe', 'codex.cmd'], { timeout: 5000, windowsHide: true }, pronto);
    else execFile(shellPadrao().arquivo, ['-l', '-c', 'command -v codex'], { timeout: 5000 }, pronto);
  });
}

/** As únicas ações vindas da tela; nenhum argumento arbitrário de CLI é aceito. */
function argumentosCodex({ acao = 'conversar', pedido = '', raiz, idioma = 'pt-BR', mcp = null } = {}) {
  if (acao === 'entrar') return ['login'];
  if (acao === 'entrar-codigo') return ['login', '--device-auth'];
  if (!['conversar', 'retomar'].includes(acao)) throw new Error(tr('Ação do Codex inválida.'));
  const args = ['--no-alt-screen'];
  const contexto = mcp ? textoSistema({ raiz }) : `Você está no Retro Computer. O disco C: é a pasta ${JSON.stringify(raiz)}. Trabalhe nos arquivos solicitados, preserve os originais e confirme antes de regravar documentos. Não altere as configurações do Retro Computer.`;
  const instrucoes = contexto + '\n\n' + ({ 'pt-BR': 'Responda em português do Brasil.', es: 'Responde en español.', en: 'Respond in English.' }[idioma] || '');
  args.push('-c', 'developer_instructions=' + JSON.stringify(instrucoes));
  if (mcp) {
    // O token vai só no ambiente. Nada secreto entra na linha de comando ou no config.toml.
    const servidor = `{command=${JSON.stringify(mcp.executavel)},args=${JSON.stringify([mcp.script])},env={ELECTRON_RUN_AS_NODE="1"},env_vars=["RETRO_MCP_ENDERECO","RETRO_MCP_TOKEN"]}`;
    args.push('-c', 'mcp_servers.retro-computer=' + servidor);
  }
  if (acao === 'retomar') args.push('resume');
  if (acao === 'conversar' && typeof pedido === 'string' && pedido.trim()) args.push('--', pedido.slice(0, 4000));
  return args;
}

/** O wrapper do npm no Windows é JavaScript: o próprio Electron como Node o executa. */
function programaCodex(caminho, args, { executavel = process.execPath, plataforma = process.platform } = {}) {
  const iniciador = path.join(__dirname, 'codex-node.js').replace(`app.asar${path.sep}`, `app.asar.unpacked${path.sep}`);
  const node = (script) => ({ arquivo: executavel, args: [iniciador, script, ...args], env: { ELECTRON_RUN_AS_NODE: '1' } });
  if (plataforma === 'win32' && /\.(cmd|ps1)$/i.test(caminho)) {
    const script = path.join(path.dirname(caminho), 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
    if (!fs.existsSync(script)) throw new Error(tr('Reinstale o Codex com o instalador oficial.'));
    return node(script);
  }
  // O npm no Mac/Linux pode ser um link para um .js com /usr/bin/env node. No Finder,
  // o Node do nvm pode não estar no PATH; o Electron já fornece o runtime necessário.
  let real = caminho;
  try { real = fs.realpathSync(caminho); } catch {}
  if (/[\\/]@openai[\\/]codex[\\/]bin[\\/]codex\.js$/i.test(real)) return node(real);
  // Para as capturas, um CLI JavaScript de mentira funciona também no Windows, sem .bat ou shell.
  if (process.env.RETRO_CODEX_FALSO === caminho && /\.[cm]?js$/i.test(caminho)) return node(caminho);
  return { arquivo: caminho, args, env: {} };
}

module.exports = { acharCodex, candidatosCodex, comandoInstalarCodex, argumentosCodex, programaCodex };
