'use strict';
/*
 * O Prompt de comando: um terminal de verdade (node-pty) com o shell do
 * computador principal, aberto na pasta do disco. O Claude Code roda nele.
 *
 * No macOS e no Linux, o shell abre como "login" (-l) para ler o PATH do
 * perfil do usuário: aberto pelo Finder ou pelo menu, o aplicativo não herda
 * o PATH do terminal, e o comando "claude" não seria achado.
 */
const os = require('node:os');
const { execFile } = require('node:child_process');

let pty = null;
try {
  pty = require('node-pty');
} catch (e) {
  pty = null;
}

function shellPadrao() {
  if (process.platform === 'win32') {
    return { arquivo: 'powershell.exe', args: ['-NoLogo'] };
  }
  const sh = process.env.SHELL || (process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash');
  return { arquivo: sh, args: ['-l'] };
}

const INSTALAR_CLAUDE = {
  win32: 'irm https://claude.ai/install.ps1 | iex',
  outros: 'curl -fsSL https://claude.ai/install.sh | bash',
};

class Terminais {
  constructor(aoDados, aoSair) {
    this.aoDados = aoDados;
    this.aoSair = aoSair;
    this.lista = new Map();
    this.prox = 1;
  }

  disponivel() {
    return !!pty;
  }

  /**
   * @param {{cols:number, rows:number, cwd:string, comando?:string, env?:object}} o
   * @returns {number} o número do terminal
   */
  criar(o) {
    if (!pty) throw new Error('O terminal não está disponível nesta instalação (node-pty não carregou).');
    const { arquivo, args } = shellPadrao();
    const env = { ...process.env, ...o.env, TERM: 'xterm-256color', COLORTERM: 'truecolor', RETRO_COMPUTER: '1' };
    if (!env.LANG && process.platform !== 'win32') env.LANG = 'pt_BR.UTF-8';
    const p = pty.spawn(arquivo, args, {
      name: 'xterm-256color',
      cols: Math.max(20, o.cols | 0 || 80),
      rows: Math.max(5, o.rows | 0 || 25),
      cwd: o.cwd || os.homedir(),
      env,
      useConpty: true,
    });
    const id = this.prox++;
    this.lista.set(id, p);
    p.onData((d) => this.aoDados(id, d));
    p.onExit(({ exitCode }) => {
      this.lista.delete(id);
      this.aoSair(id, exitCode);
    });
    if (o.comando) {
      // Escreve o comando depois que o shell leu o perfil (o PATH já está pronto).
      setTimeout(() => { try { p.write(o.comando + '\r'); } catch { } }, 350);
    }
    return id;
  }

  escrever(id, dados) {
    const p = this.lista.get(id);
    if (p) p.write(dados);
  }

  redimensionar(id, cols, rows) {
    const p = this.lista.get(id);
    if (p && cols > 0 && rows > 0) {
      try { p.resize(cols | 0, rows | 0); } catch { }
    }
  }

  fechar(id) {
    const p = this.lista.get(id);
    if (p) {
      try { p.kill(); } catch { }
      this.lista.delete(id);
    }
  }

  fecharTodos() {
    for (const id of [...this.lista.keys()]) this.fechar(id);
  }
}

/** Procura o comando "claude" no PATH do shell de login. */
function acharClaude() {
  return new Promise((resolve) => {
    const { arquivo } = shellPadrao();
    const pronto = (erro, saida) => {
      const linha = String(saida || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean).pop();
      resolve(!erro && linha ? linha : null);
    };
    if (process.platform === 'win32') {
      execFile('where.exe', ['claude'], { timeout: 8000, windowsHide: true }, pronto);
    } else {
      execFile(arquivo, ['-l', '-c', 'command -v claude'], { timeout: 8000 }, pronto);
    }
  });
}

function comandoInstalarClaude() {
  return process.platform === 'win32' ? INSTALAR_CLAUDE.win32 : INSTALAR_CLAUDE.outros;
}

module.exports = { Terminais, acharClaude, comandoInstalarClaude, shellPadrao };
