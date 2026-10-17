'use strict';
/*
 * O chaveiro do Linux (o GNOME Keyring) no modo sistema. Ele guarda a chave do Claude e a chave dos
 * cookies do Navegador, e a tela de entrada o abre com a senha. Com a entrada automática (ou com a
 * senha do chaveiro diferente da de entrada), ele fica trancado, e o primeiro pedido do cofre
 * (o safeStorage) abria a caixa do próprio Linux e parava o Retro Computer até ela fechar: a janela
 * não se redesenhava, e arrastar a caixa deixava rastros na tela.
 *
 * Aqui, o estado se lê sem pedir nada (a propriedade Locked, pelo D-Bus), e o chaveiro se abre com a
 * senha digitada numa caixa do Retro Computer, pelo socket de controle do próprio gnome-keyring (o
 * mesmo caminho da pam_gnome_keyring na tela de entrada): o chaveiro confere a senha, e sem um
 * chaveiro ainda, ele o cria com ela. A senha não é guardada nem anotada em lugar nenhum.
 */
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { execFile } = require('node:child_process');

const OBJETO = '/org/freedesktop/secrets/aliases/default';

/**
 * A saída do gdbus ("(<true>,)") ou do busctl ("v b true"): true trancado, false aberto, 'sem' sem
 * chaveiro (o objeto não existe), null sem saber (sem o serviço, outro erro).
 */
function lerTrancado(saida, erro) {
  const t = String(saida || '');
  if (/<true>|\bb true\b/.test(t)) return true;
  if (/<false>|\bb false\b/.test(t)) return false;
  if (/Object does not exist|UnknownObject|No such object/i.test(String(erro || '') + t)) return 'sem';
  return null;
}

/** O pedido de abrir do protocolo de controle: o tamanho, a operação 1 (abrir) e a senha. */
function pacoteAbrir(senha) {
  const b = Buffer.from(String(senha), 'utf8');
  const p = Buffer.alloc(12 + b.length);
  p.writeUInt32BE(p.length, 0);
  p.writeUInt32BE(1, 4);
  p.writeUInt32BE(b.length, 8);
  b.copy(p, 12);
  return p;
}

/** A resposta: 0 aberto, 1 senha errada, 2 falhou, 3 sem o daemon. */
function lerResposta(buf) {
  if (!buf || buf.length < 8 || buf.readUInt32BE(0) !== 8) return null;
  return buf.readUInt32BE(4);
}

/**
 * O socket de controle, só se for deste usuário (o socket e a pasta, que não deixa os outros entrarem):
 * a senha nunca vai para um socket de outra pessoa.
 */
function socketDeControle(env = process.env, uid = process.getuid ? process.getuid() : -1) {
  const pastas = [env.GNOME_KEYRING_CONTROL, env.XDG_RUNTIME_DIR && path.join(env.XDG_RUNTIME_DIR, 'keyring')].filter(Boolean);
  for (const pasta of pastas) {
    try {
      const d = fs.lstatSync(pasta);
      const s = fs.lstatSync(path.join(pasta, 'control'));
      if (d.isDirectory() && d.uid === uid && (d.mode & 0o022) === 0 && s.isSocket() && s.uid === uid) return path.join(pasta, 'control');
    } catch { }
  }
  return null;
}

class Chaveiro {
  constructor({ env = process.env } = {}) {
    this.env = env;
  }

  /** O chaveiro padrão está trancado? (true, false, 'sem' ou null; ver lerTrancado.) */
  trancado() {
    const gdbus = () => new Promise((resolve) => {
      execFile('gdbus', ['call', '--session', '--dest', 'org.freedesktop.secrets', '--object-path', OBJETO,
        '--method', 'org.freedesktop.DBus.Properties.Get', 'org.freedesktop.Secret.Collection', 'Locked'],
      { timeout: 3000, env: { ...this.env, LC_ALL: 'C' } }, (erro, saida, err) => resolve(erro && erro.code === 'ENOENT' ? undefined : lerTrancado(saida, err || (erro && erro.message))));
    });
    const busctl = () => new Promise((resolve) => {
      execFile('busctl', ['--user', 'call', 'org.freedesktop.secrets', OBJETO, 'org.freedesktop.DBus.Properties', 'Get', 'ss',
        'org.freedesktop.Secret.Collection', 'Locked'],
      { timeout: 3000, env: { ...this.env, LC_ALL: 'C' } }, (erro, saida, err) => resolve(lerTrancado(saida, err || (erro && erro.message))));
    });
    return gdbus().then((r) => (r === undefined ? busctl() : r));
  }

  /** Abre (ou cria) o chaveiro com a senha: { ok } ou { negado }, { erro }. */
  abrir(senha) {
    const caminho = socketDeControle(this.env);
    if (!caminho || !senha) return Promise.resolve({ erro: true });
    return new Promise((resolve) => {
      let resposta = Buffer.alloc(0);
      let feito = false;
      const fim = (r) => { if (feito) return; feito = true; clearTimeout(relogio); s.destroy(); resolve(r); };
      const s = net.createConnection(caminho);
      const relogio = setTimeout(() => fim({ erro: true }), 8000);
      s.on('connect', () => {
        // Primeiro um byte zero (o daemon lê quem é pelo SO_PEERCRED), depois o pedido.
        s.write(Buffer.from([0]));
        s.write(pacoteAbrir(senha));
      });
      s.on('data', (d) => {
        resposta = Buffer.concat([resposta, d]);
        if (resposta.length < 8) return;
        const r = lerResposta(resposta.subarray(0, 8));
        fim(r === 0 ? { ok: true } : r === 1 ? { negado: true } : { erro: true });
      });
      s.on('error', () => fim({ erro: true }));
      s.on('close', () => fim({ erro: true }));
    });
  }
}

/** O de mentira (RETRO_CHAVEIRO_FALSO): começa trancado e abre com a senha "certa". */
class ChaveiroFalso {
  constructor() {
    this.estado = true;
    this.tentativas = [];
  }

  async trancado() { return this.estado; }

  async abrir(senha) {
    this.tentativas.push(senha === 'certa');
    if (senha !== 'certa') return { negado: true };
    this.estado = false;
    return { ok: true };
  }
}

module.exports = { Chaveiro, ChaveiroFalso, lerTrancado, pacoteAbrir, lerResposta, socketDeControle };
