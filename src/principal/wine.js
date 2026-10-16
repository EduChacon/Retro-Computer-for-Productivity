'use strict';
/*
 * Os programas do Windows no Linux, pelo WINE: um .exe ou um .msi do disco C: abre com dois
 * cliques; o instalador instala, e os atalhos que ele cria aparecem em Iniciar › Programas ›
 * Programas do Windows. Vale o WINE do sistema (com um "C:" do Windows só do Retro Computer, em
 * <dados>/wine, para não misturar com o de outros programas) ou, sem ele, o WINE do Flathub
 * (org.winehq.Wine), que a Loja instala sem a senha de administrador.
 *
 * RETRO_WINE_FALSO=1: o WINE de mentira (só anota o que abriria), para as capturas.
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFile } = require('node:child_process');
const { lerDesktop, limparExec, iconeLinux } = require('./aplicativos');

const FLATPAK_ID = 'org.winehq.Wine';

/** O ambiente dos programas: sem as variáveis do Electron e do AppImage. */
function ambiente(extra = {}) {
  const env = { ...process.env, WINEDEBUG: '-all', ...extra };
  for (const k of Object.keys(env)) if (/^(ELECTRON_|RETRO_)/.test(k) || ['APPDIR', 'APPIMAGE', 'ARGV0', 'OWD'].includes(k)) delete env[k];
  return env;
}

/** Os argumentos do WINE para abrir um arquivo: o .msi pelo msiexec, o resto direto. */
function argsDoArquivo(arquivo) {
  return /\.msi$/i.test(arquivo) ? ['msiexec', '/i', arquivo] : [arquivo];
}

/** As pastas onde o WINE põe os atalhos do menu Iniciar do Windows (o do sistema e o do Flathub). */
function pastasDosAtalhos(casa = os.homedir()) {
  const dados = process.env.XDG_DATA_HOME || path.join(casa, '.local', 'share');
  return [
    { como: 'sistema', pasta: path.join(dados, 'applications', 'wine', 'Programs') },
    { como: 'flatpak', pasta: path.join(casa, '.var', 'app', FLATPAK_ID, 'data', 'applications', 'wine', 'Programs') },
  ];
}

/** Os atalhos de uma pasta (com as subpastas), lidos como os .desktop dos programas do Linux. */
function lerAtalhos(pasta, como, ler = (p) => fs.readFileSync(p, 'utf8'), listar = (p) => fs.readdirSync(p, { withFileTypes: true })) {
  const r = [];
  const andar = (p, nivel) => {
    let itens = [];
    try { itens = listar(p); } catch { return; }
    for (const e of itens) {
      const cheio = path.join(p, e.name);
      if (e.isDirectory() && nivel < 4) andar(cheio, nivel + 1);
      else if (e.name.endsWith('.desktop')) {
        let d = null;
        try { d = lerDesktop(ler(cheio), 'pt-BR'); } catch { }
        // Os desinstaladores ficam de fora (eles estão no Adicionar ou remover programas do próprio WINE).
        if (d && !/uninstall|desinstal/i.test(d.nome + ' ' + e.name)) r.push({ id: como + ':' + cheio, nome: d.nome, exec: d.exec, icone: d.icone || null, como });
      }
    }
  };
  andar(pasta, 0);
  return r.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

function rodar(cmd, args, { timeout = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, env: { ...process.env, LC_ALL: 'C' } }, (e, saida) => (e ? reject(e) : resolve(String(saida))));
  });
}

function noPath(cmd) {
  return String(process.env.PATH || '').split(path.delimiter).some((d) => d && fs.existsSync(path.join(d, cmd)));
}

class Wine {
  constructor({ dados, plataforma = process.platform, falso = false } = {}) {
    this.prefixo = path.join(dados, 'wine');
    this.plataforma = plataforma;
    this.falso = falso;
    this.abertos = [];
  }

  /** { disponivel, como: 'sistema' | 'flatpak', instalavel } (só no Linux). */
  async estado() {
    if (this.plataforma !== 'linux') return { disponivel: false };
    if (this.falso) return { disponivel: true, como: 'sistema' };
    if (noPath('wine')) return { disponivel: true, como: 'sistema' };
    const flatpak = noPath('flatpak');
    if (flatpak && await rodar('flatpak', ['info', FLATPAK_ID]).then(() => true, () => false)) return { disponivel: true, como: 'flatpak' };
    return { disponivel: false, instalavel: flatpak };
  }

  lancar(cmd, args, cwd) {
    if (this.falso) { this.abertos.push([cmd, ...args]); return; }
    const p = spawn(cmd, args, { detached: true, stdio: 'ignore', cwd, env: ambiente(cmd === 'flatpak' ? {} : { WINEPREFIX: this.prefixo }) });
    p.on('error', () => { });
    p.unref();
  }

  /** Abre um .exe ou um .msi (o caminho de verdade do arquivo). */
  async abrir(arquivo) {
    const e = await this.estado();
    if (!e.disponivel) return { ok: false, faltaWine: true, instalavel: !!e.instalavel };
    const cwd = path.dirname(arquivo);
    if (e.como === 'sistema') {
      if (!this.falso) fs.mkdirSync(this.prefixo, { recursive: true });
      this.lancar('wine', argsDoArquivo(arquivo), cwd);
    } else {
      // O WINE do Flathub vê só o que lhe é mostrado: a pasta do arquivo.
      this.lancar('flatpak', ['run', '--filesystem=' + cwd, FLATPAK_ID, ...argsDoArquivo(arquivo)], cwd);
    }
    return { ok: true, como: e.como };
  }

  /** Os programas do Windows instalados (os atalhos que os instaladores criaram). */
  programas() {
    if (this.plataforma !== 'linux') return [];
    if (this.falso) return [{ id: 'falso:agenda', nome: 'Agenda 98', exec: 'wine agenda.exe', icone: null, como: 'sistema' }];
    return pastasDosAtalhos().flatMap((x) => lerAtalhos(x.pasta, x.como)).map((p) => ({ ...p, iconeArquivo: iconeLinux(p.icone) }));
  }

  /** Abre um programa do Windows pelo atalho dele. */
  abrirPrograma(id) {
    const p = this.programas().find((x) => x.id === id);
    if (!p) throw new Error('programa desconhecido');
    const cmd = limparExec(p.exec);
    if (p.como === 'flatpak') this.lancar('flatpak', ['run', '--command=sh', FLATPAK_ID, '-c', cmd], os.homedir());
    else this.lancar('/bin/sh', ['-c', cmd], os.homedir());
    return { ok: true };
  }
}

module.exports = { Wine, argsDoArquivo, pastasDosAtalhos, lerAtalhos, FLATPAK_ID };
