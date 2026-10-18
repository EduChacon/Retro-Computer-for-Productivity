'use strict';
/*
 * As teclas de função do computador portátil no modo sistema (o MacBook, o ThinkPad…): o brilho, a luz
 * do teclado, a mídia, a Visão das tarefas, o Iniciar e o botão de ligar.
 *
 * O Chromium não pega essas teclas com um programa do Linux na frente (o globalShortcut do Electron só
 * conhece as de volume), e a luz do teclado ele nem reconhece. Quem as pega é o Openbox: o Retro Computer
 * põe no rc.xml da sessão um atalho para cada uma (trocarTeclas), e o atalho escreve o nome da ação numa
 * fila (um FIFO numa pasta só do usuário), que o Retro Computer lê (FilaDeTeclas). A mídia vai para o
 * programa que está tocando, pelo MPRIS do D-Bus (o Firefox e o próprio Retro Computer aparecem nele).
 * O botão de ligar abre a caixa Desligar: a trava do logind (TravaDoBotao) não deixa o computador
 * desligar de uma vez, sem salvar nada.
 */
const { execFile, spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

/** Cada tecla do X e a ação que ela pede (a mesma de main.js e das teclas da área de trabalho). */
const TECLAS = [
  ['XF86MonBrightnessDown', 'brilho-'], ['XF86MonBrightnessUp', 'brilho+'],
  ['XF86LaunchA', 'visao-tarefas'], ['XF86LaunchB', 'iniciar'],
  ['XF86KbdBrightnessDown', 'luz-teclado-'], ['XF86KbdBrightnessUp', 'luz-teclado+'], ['XF86KbdLightOnOff', 'luz-teclado'],
  ['XF86AudioPrev', 'midia-anterior'], ['XF86AudioPlay', 'midia-tocar'], ['XF86AudioPause', 'midia-tocar'],
  ['XF86AudioNext', 'midia-proxima'], ['XF86AudioStop', 'midia-parar'],
  ['XF86Calculator', 'calculadora'], ['XF86PowerOff', 'ligar'],
];
const ACOES = new Set(TECLAS.map(([, a]) => a));

function rodar(cmd, args, { timeout = 4000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, maxBuffer: 1 << 20, env: { ...process.env, LC_ALL: 'C', LANG: 'C' } }, (erro, saida) => (erro ? reject(erro) : resolve(String(saida))));
  });
}

/* ---------- O rc.xml do Openbox (funções puras, testadas em testes/teclas.test.js) ---------- */

const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * O bloco <keyboard> com um atalho para cada tecla: o Openbox roda o comando (sem um shell: ele separa
 * os argumentos como um), que escreve a ação na fila. O "timeout" não deixa o comando preso quando o
 * Retro Computer está fechado (sem ninguém lendo, abrir a fila esperaria para sempre).
 */
function blocoTeclas(fila) {
  if (!path.isAbsolute(fila) || /["\\\n\r]/.test(fila)) throw new Error('fila inválida');
  const linhas = TECLAS.map(([tecla, acao]) =>
    `    <keybind key="${tecla}"><action name="Execute"><command>${xml(`timeout 1 sh -c 'printf "%s\\n" "$0" > "$1"' ${acao} "${fila}"`)}</command></action></keybind>`);
  return `<keyboard>\n    <!-- As teclas do computador (o brilho, a luz do teclado, a mídia, o botão de ligar): o Retro Computer põe e tira este bloco. -->\n${linhas.join('\n')}\n  </keyboard>`;
}

/** O rc.xml com o bloco <keyboard> trocado pelo das teclas (sem ele, o bloco entra antes do </openbox_config>). */
function trocarTeclas(texto, fila) {
  const bloco = blocoTeclas(fila);
  const t = String(texto);
  if (/<keyboard\s*\/>/.test(t)) return t.replace(/<keyboard\s*\/>/, () => bloco);
  if (/<keyboard>[\s\S]*?<\/keyboard>/.test(t)) return t.replace(/<keyboard>[\s\S]*?<\/keyboard>/, () => bloco);
  return t.replace(/<\/openbox_config>/, () => `  ${bloco}\n</openbox_config>`);
}

/** O rc.xml já tem os atalhos que escrevem nesta fila? (Só então a trava do botão de ligar vale a pena.) */
const temTeclas = (texto, fila) => String(texto).includes(xml(`"${fila}"`)) && String(texto).includes('key="XF86PowerOff"');

/* ---------- A fila das teclas ---------- */

/** A pasta da fila: a do rc.xml da sessão (sessao.sh), só do usuário. */
function pastaDaFila(env = process.env) {
  const base = env.XDG_RUNTIME_DIR && path.isAbsolute(env.XDG_RUNTIME_DIR) ? env.XDG_RUNTIME_DIR : path.join(os.homedir(), '.cache');
  return path.join(base, 'retro-computer');
}

/** Separa as linhas que chegam (em pedaços) e entrega só as ações conhecidas; um pedaço sem fim não cresce sem limite. */
function leitorDeLinhas(aoAcao) {
  let resto = '';
  return (pedaco) => {
    resto += String(pedaco);
    let i;
    while ((i = resto.indexOf('\n')) >= 0) {
      const linha = resto.slice(0, i).trim();
      resto = resto.slice(i + 1);
      if (ACOES.has(linha)) aoAcao(linha);
    }
    if (resto.length > 256) resto = '';
  };
}

class FilaDeTeclas {
  constructor({ pasta = pastaDaFila(), aoAcao = () => { } } = {}) {
    this.pasta = pasta;
    this.caminho = path.join(pasta, 'teclas');
    this.aoAcao = aoAcao;
    this.socket = null;
  }

  /** Abre a fila (cria a pasta só do usuário e o FIFO). Devolve false quando não dá (a pasta é de outro, por exemplo). */
  async abrir() {
    if (process.platform !== 'linux' || this.socket) return !!this.socket;
    try {
      await fs.promises.mkdir(this.pasta, { recursive: true, mode: 0o700 });
      const p = await fs.promises.lstat(this.pasta);
      // Só numa pasta do próprio usuário, fechada aos outros: senão alguém de fora poderia mandar teclas.
      if (!p.isDirectory() || p.uid !== process.getuid() || (p.mode & 0o077)) return false;
      let f = await fs.promises.lstat(this.caminho).catch(() => null);
      if (f && !f.isFIFO()) return false;
      if (!f) {
        await rodar('mkfifo', ['-m', '600', this.caminho]);
        f = await fs.promises.lstat(this.caminho);
      }
      if (!f.isFIFO() || f.uid !== process.getuid()) return false;
      // Aberta para ler e escrever: assim ela não fecha quando o atalho termina, e abrir não espera ninguém.
      const fd = fs.openSync(this.caminho, fs.constants.O_RDWR | fs.constants.O_NONBLOCK);
      this.socket = new net.Socket({ fd, readable: true, writable: false });
      this.socket.on('data', leitorDeLinhas((acao) => this.aoAcao(acao)));
      this.socket.on('error', () => { });
      return true;
    } catch {
      return false;
    }
  }

  fechar() {
    if (this.socket) this.socket.destroy();
    this.socket = null;
  }
}

/* ---------- O botão de ligar ---------- */

/**
 * A trava "block" do logind para o botão de ligar (o systemd-inhibit rodando um cat, que termina com o
 * Retro Computer): sem ela, o logind desliga o computador na hora em que o botão é apertado, sem salvar
 * nada. Com ela, a tecla chega ao Openbox, e o Retro Computer mostra a caixa Desligar.
 */
class TravaDoBotao {
  constructor({ existe = (c) => fs.existsSync('/usr/bin/' + c) || fs.existsSync('/bin/' + c) } = {}) {
    this.existe = existe;
    this.filho = null;
  }

  segurar() {
    if (this.filho || !this.existe('systemd-inhibit')) return !!this.filho;
    try {
      const f = spawn('systemd-inhibit', ['--what=handle-power-key', '--mode=block', '--who=Retro Computer', '--why=Mostrar a caixa Desligar', 'cat'], { stdio: ['pipe', 'ignore', 'ignore'] });
      f.on('exit', () => { if (this.filho === f) this.filho = null; });
      f.on('error', () => { if (this.filho === f) this.filho = null; });
      this.filho = f;
      return true;
    } catch {
      return false;
    }
  }

  soltar() {
    if (this.filho) { try { this.filho.kill(); } catch { } }
    this.filho = null;
  }
}

/* ---------- A mídia (o MPRIS do D-Bus) ---------- */

/** A resposta do ListNames pelo busctl ('as 3 "org.freedesktop.DBus" ":1.0" "org.mpris.MediaPlayer2.firefox…"'): os tocadores. */
function lerTocadores(saida) {
  return [...String(saida).matchAll(/"(org\.mpris\.MediaPlayer2\.[A-Za-z0-9_.-]+)"/g)].map((m) => m[1]);
}

/** 's "Playing"' → 'Playing'. */
function lerEstadoTocador(saida) {
  const m = /^\s*s\s+"(\w+)"/.exec(String(saida));
  return m ? m[1] : null;
}

/**
 * Para quem vai a tecla: o que está tocando; senão o último que recebeu uma tecla (para tocar de novo o
 * que foi pausado); senão um pausado; senão o primeiro.
 */
function escolherTocador(lista, ultimo) {
  if (!lista.length) return null;
  return (lista.find((t) => t.estado === 'Playing') || lista.find((t) => t.nome === ultimo) || lista.find((t) => t.estado === 'Paused') || lista[0]).nome;
}

const METODOS = { 'midia-tocar': 'PlayPause', 'midia-proxima': 'Next', 'midia-anterior': 'Previous', 'midia-parar': 'Stop' };
const OBJETO = '/org/mpris/MediaPlayer2';
const PLAYER = 'org.mpris.MediaPlayer2.Player';

class Midia {
  constructor() {
    this.ultimo = null;
  }

  async tocadores() {
    let nomes = [];
    try { nomes = lerTocadores(await rodar('busctl', ['--user', 'call', 'org.freedesktop.DBus', '/org/freedesktop/DBus', 'org.freedesktop.DBus', 'ListNames'])); } catch { return []; }
    return Promise.all(nomes.map(async (nome) => ({
      nome, estado: lerEstadoTocador(await rodar('busctl', ['--user', 'get-property', nome, OBJETO, PLAYER, 'PlaybackStatus'], { timeout: 1500 }).catch(() => '')),
    })));
  }

  /** A tecla de mídia para o tocador escolhido. Devolve false sem nenhum tocador. */
  async comando(acao) {
    const metodo = METODOS[acao];
    if (!metodo) return false;
    const nome = escolherTocador(await this.tocadores(), this.ultimo);
    if (!nome) return false;
    this.ultimo = nome;
    await rodar('busctl', ['--user', 'call', nome, OBJETO, PLAYER, metodo]).catch(() => { });
    return true;
  }
}

/** Para os testes e as capturas (RETRO_BANDEJA_FALSA=1): um tocador de mentira, que anota as teclas. */
class MidiaFalsa {
  constructor() {
    this.estado = 'Playing';
    this.pedidos = [];
  }

  async comando(acao) {
    if (!METODOS[acao]) return false;
    this.pedidos.push(METODOS[acao]);
    if (acao === 'midia-tocar') this.estado = this.estado === 'Playing' ? 'Paused' : 'Playing';
    return true;
  }
}

module.exports = { TECLAS, ACOES, blocoTeclas, trocarTeclas, temTeclas, pastaDaFila, leitorDeLinhas, FilaDeTeclas, TravaDoBotao, lerTocadores, lerEstadoTocador, escolherTocador, Midia, MidiaFalsa };
