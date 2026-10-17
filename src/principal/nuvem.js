'use strict';
/*
 * A nuvem no Linux: o Google Drive, o OneDrive e o Dropbox pelo rclone (o programa livre que fala
 * com eles), cada conta montada numa pasta e mostrada no Meu computador como um pendrive: ver,
 * trazer para o disco C: (uma cópia) e levar do C: (com um nome livre). Nada é apagado da nuvem
 * pelo Retro Computer.
 *
 * O login é o do próprio serviço, no navegador do computador: o rclone abre o endereço de
 * autorização dele (em 127.0.0.1:53682) e espera. As chaves de acesso ficam no rclone.conf do
 * Retro Computer, na pasta de dados do usuário (só ele lê), e não no rclone do usuário. As contas
 * ficam em config.json (nuvem.contas: { id, tipo, nome, aoLigar }), e só este módulo as muda.
 *
 * A configuração do rclone é pelas perguntas dele sem tela (o --non-interactive, do rclone 1.56
 * em diante): cada resposta é a de sempre (a padrão), menos as que o Retro Computer sabe responder.
 */
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn, execFile } = require('node:child_process');
const { Unidades } = require('./unidades');

// Os serviços: o nome do tipo no rclone e as opções da criação.
const TIPOS = Object.freeze({
  drive: { rclone: 'drive', opcoes: ['scope', 'drive'], nome: 'Google Drive' },
  onedrive: { rclone: 'onedrive', opcoes: [], nome: 'OneDrive' },
  dropbox: { rclone: 'dropbox', opcoes: [], nome: 'Dropbox' },
});

// As respostas que não são a padrão do rclone (o resto vai com a padrão ou a primeira opção).
const RESPOSTAS = Object.freeze({
  config_is_local: 'true', // o navegador deste computador
  config_change_team_drive: 'false', // o Meu Drive, não um drive compartilhado
  config_type: 'onedrive', // o OneDrive pessoal ou o da empresa (não o SharePoint)
  config_drive_ok: 'true',
});

const MAX_PASSOS = 12;
const ESPERA_LOGIN = 10 * 60 * 1000; // o tempo para entrar na conta, no navegador
const ESPERA_MONTAR = 30000;
const VERSAO_MINIMA = [1, 56];
const AUTORIZACAO = /https?:\/\/127\.0\.0\.1:53682\/auth\?state=[A-Za-z0-9_-]+/;

const idValido = (id) => typeof id === 'string' && /^(drive|onedrive|dropbox)-[0-9a-f]{8}$/.test(id);

function erro(codigo, extra = {}) {
  const e = new Error(codigo);
  e.codigo = codigo;
  Object.assign(e, extra);
  return e;
}

/** "rclone v1.60.1-DEV" → [1, 60, 1]. */
function lerVersao(saida) {
  const m = /rclone v?(\d+)\.(\d+)(?:\.(\d+))?/.exec(String(saida || ''));
  return m ? [Number(m[1]), Number(m[2]), Number(m[3] || 0)] : null;
}

const versaoServe = (v) => !!v && (v[0] > VERSAO_MINIMA[0] || (v[0] === VERSAO_MINIMA[0] && v[1] >= VERSAO_MINIMA[1]));

/** As pastas montadas (o /proc/self/mounts escreve o espaço como \040, o tab como \011…). */
function lerMontagens(texto) {
  return String(texto || '').split('\n').map((l) => l.split(' ')[1]).filter(Boolean)
    .map((p) => p.replace(/\\([0-7]{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8))));
}

/** O JSON das perguntas do rclone (na saída, às vezes depois de outras linhas). */
function lerPergunta(saida) {
  const s = String(saida || '');
  const i = s.indexOf('{');
  if (i < 0) throw erro('rclone');
  let d;
  try { d = JSON.parse(s.slice(i)); } catch { throw erro('rclone'); }
  if (!d || typeof d !== 'object') throw erro('rclone');
  return { estado: String(d.State || ''), opcao: d.Option || null, erro: String(d.Error || '') };
}

/** A resposta de uma pergunta: a conhecida, a padrão ou a primeira opção. */
function responder(opcao) {
  if (!opcao) return '';
  if (Object.prototype.hasOwnProperty.call(RESPOSTAS, opcao.Name)) return RESPOSTAS[opcao.Name];
  if (opcao.DefaultStr != null && opcao.DefaultStr !== '') return String(opcao.DefaultStr);
  if (opcao.Default != null && opcao.Default !== '' && typeof opcao.Default !== 'object') return String(opcao.Default);
  const ex = Array.isArray(opcao.Examples) ? opcao.Examples.find((x) => x && x.Value != null && x.Value !== '') : null;
  if (ex) return String(ex.Value);
  if (opcao.Required) throw erro('pergunta', { pergunta: String(opcao.Name || '') });
  return '';
}

function rodar(cmd, args, { timeout = 20000, env } = {}) {
  return new Promise((ok, falha) => {
    execFile(cmd, args, { timeout, env, maxBuffer: 4 * 1024 * 1024 }, (e, saida, erros) => {
      if (e) { e.saida = String(erros || saida || ''); falha(e); } else ok(String(saida || ''));
    });
  });
}

class Nuvens extends Unidades {
  /**
   * pasta: <dados do usuário>/nuvem (o rclone.conf, as montagens e o cache); config: o Config;
   * disco: o disco C: atual; comoAdmin: o sudo (para instalar); aoMudar(): avisa a tela;
   * falso: a pasta da versão de mentira (RETRO_NUVEM_FALSA), sem o rclone.
   */
  constructor({ pasta, config, disco, comoAdmin = null, aoMudar = () => { }, falso = null, plataforma = process.platform, tipos = TIPOS } = {}) {
    super({ disco, plataforma });
    this.pastaBase = pasta;
    this.config = config;
    this.comoAdmin = comoAdmin;
    this.aoMudar = aoMudar;
    this.falso = falso;
    this.tipos = tipos;
    this.conf = path.join(pasta, 'rclone.conf');
    this.montagens = new Map(); // id → { filho, pasta, estado: 'conectando' | 'conectada', erro }
    this.erros = new Map(); // id → o último erro ao conectar
    this.criando = null; // a conta sendo criada: { filho, url, id, cancelado }
  }

  /* ---------- As contas ---------- */

  contas() {
    const n = this.config.obter().nuvem || {};
    return Array.isArray(n.contas) ? n.contas.filter((c) => c && idValido(c.id) && this.tipos[c.tipo]) : [];
  }

  gravarContas(lista) {
    this.config.definir({ nuvem: { contas: lista } });
    this.aoMudar();
  }

  conta(id) {
    const c = this.contas().find((x) => x.id === id);
    if (!c) throw erro('conta');
    return c;
  }

  pastaDe(id) {
    if (!idValido(id)) throw erro('conta');
    return path.join(this.pastaBase, 'montagens', id);
  }

  /** O que a tela mostra: as contas e o estado de cada uma (sem nenhuma chave de acesso). */
  resumo() {
    return this.contas().map((c) => {
      const m = this.montagens.get(c.id);
      return { id: c.id, tipo: c.tipo, servico: this.tipos[c.tipo].nome, nome: c.nome, aoLigar: c.aoLigar !== false, estado: m ? m.estado : 'desconectada', erro: this.erros.get(c.id) || null };
    });
  }

  /* ---------- O rclone ---------- */

  env() {
    return { ...process.env, RCLONE_CONFIG: this.conf, LC_ALL: 'C' };
  }

  async rclone(args, o = {}) {
    return rodar('rclone', ['--config', this.conf, ...args], { env: this.env(), ...o });
  }

  /** { disponivel (Linux), rclone (a versão, ou null), serve (a versão dá), fuse, instalavel (apt), contas } */
  async estado() {
    if (this.plataforma !== 'linux') return { disponivel: false, contas: [] };
    if (this.falso) return { disponivel: true, rclone: '1.60.1', serve: true, fuse: true, instalavel: true, contas: this.resumo() };
    const v = await rodar('rclone', ['version'], { timeout: 10000 }).then(lerVersao, () => null);
    const fuse = fs.existsSync('/dev/fuse') && ['/usr/bin/fusermount3', '/usr/bin/fusermount', '/bin/fusermount3', '/bin/fusermount'].some((p) => fs.existsSync(p));
    return { disponivel: true, rclone: v ? v.join('.') : null, serve: versaoServe(v), fuse, instalavel: fs.existsSync('/usr/bin/apt-get'), contas: this.resumo() };
  }

  /** Instala o rclone e o FUSE (com a senha de administrador). */
  instalar(senha) {
    if (this.falso) return Promise.resolve({ ok: true });
    if (!this.comoAdmin) return Promise.resolve({ ok: false, erro: 'sudo' });
    return this.comoAdmin(senha, 'apt-get', ['install', '-y', 'rclone', 'fuse3'], { timeout: 15 * 60 * 1000 });
  }

  /**
   * Cria uma conta: as perguntas do rclone uma a uma; na do login, o rclone abre o navegador e
   * espera (aoAutorizar avisa a tela, que pode abrir o endereço de novo). Devolve o id.
   */
  async adicionar(tipo, { aoAutorizar = () => { } } = {}) {
    const t = this.tipos[tipo];
    if (!t) throw erro('tipo');
    if (this.criando) throw erro('ocupado');
    const id = `${tipo}-${crypto.randomBytes(4).toString('hex')}`;
    const atual = { id, filho: null, url: null, cancelado: false };
    this.criando = atual;
    try {
      fs.mkdirSync(this.pastaBase, { recursive: true, mode: 0o700 });
      if (this.falso) await this.adicionarFalso(atual, aoAutorizar);
      else {
        let p = lerPergunta(await this.passo(atual, ['config', 'create', id, t.rclone, ...t.opcoes, '--non-interactive'], aoAutorizar));
        for (let i = 0; p.estado && i < MAX_PASSOS; i++) {
          if (p.erro) throw erro('servico', { detalhe: p.erro.slice(0, 200) });
          const resposta = responder(p.opcao);
          p = lerPergunta(await this.passo(atual, ['config', 'update', id, '--continue', '--state', p.estado, '--result', resposta, '--non-interactive'], aoAutorizar));
        }
        if (p.erro) throw erro('servico', { detalhe: p.erro.slice(0, 200) });
        if (p.estado) throw erro('rclone');
        try { fs.chmodSync(this.conf, 0o600); } catch { /* fica */ }
      }
      const iguais = this.contas().filter((c) => c.tipo === tipo).length;
      const nome = iguais ? `${t.nome} (${iguais + 1})` : t.nome;
      this.gravarContas([...this.contas(), { id, tipo, nome, aoLigar: true }]);
      return id;
    } catch (e) {
      // Nada pela metade: a conta sai do rclone.conf.
      if (!this.falso) await this.rclone(['config', 'delete', id]).catch(() => { });
      if (atual.cancelado) throw erro('cancelado');
      throw e;
    } finally {
      this.criando = null;
    }
  }

  /** Um passo das perguntas: o rclone pode parar esperando o login (o endereço vem na saída de erro). */
  passo(atual, args, aoAutorizar) {
    return new Promise((ok, falha) => {
      if (atual.cancelado) { falha(erro('cancelado')); return; }
      const filho = spawn('rclone', ['--config', this.conf, ...args], { env: this.env(), stdio: ['ignore', 'pipe', 'pipe'] });
      atual.filho = filho;
      let saida = '';
      let erros = '';
      const relogio = setTimeout(() => { try { filho.kill('SIGTERM'); } catch { /* já saiu */ } }, ESPERA_LOGIN);
      filho.stdout.on('data', (d) => { saida = (saida + d).slice(-200000); });
      filho.stderr.on('data', (d) => {
        erros = (erros + d).slice(-20000);
        const m = AUTORIZACAO.exec(erros);
        if (m && atual.url !== m[0]) { atual.url = m[0]; aoAutorizar(); }
      });
      filho.on('error', (e) => { clearTimeout(relogio); falha(erro(e.code === 'ENOENT' ? 'semRclone' : 'rclone')); });
      filho.on('close', (codigo) => {
        clearTimeout(relogio);
        atual.filho = null;
        if (atual.cancelado) { falha(erro('cancelado')); return; }
        if (codigo !== 0) { falha(erro('rclone', { detalhe: erros.split('\n').map((l) => l.trim()).filter(Boolean).pop() || '' })); return; }
        ok(saida);
      });
    });
  }

  async adicionarFalso(atual, aoAutorizar) {
    atual.url = 'http://127.0.0.1:53682/auth?state=teste';
    aoAutorizar();
    await new Promise((ok) => setTimeout(ok, 1500));
    if (atual.cancelado) throw erro('cancelado');
  }

  /** O endereço do login da conta que está sendo criada (só o do rclone, em 127.0.0.1). */
  enderecoDoLogin() {
    const u = this.criando && this.criando.url;
    return u && AUTORIZACAO.test(u) ? u : null;
  }

  cancelar() {
    const c = this.criando;
    if (!c) return false;
    c.cancelado = true;
    if (c.filho) { try { c.filho.kill('SIGTERM'); } catch { /* já saiu */ } }
    return true;
  }

  renomear(id, nome) {
    const limpo = String(nome || '').replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
    if (!limpo) throw erro('nome');
    this.gravarContas(this.contas().map((c) => (c.id === id ? { ...c, nome: limpo } : c)));
  }

  mudar(id, { aoLigar } = {}) {
    this.conta(id);
    this.gravarContas(this.contas().map((c) => (c.id === id ? { ...c, aoLigar: aoLigar !== false } : c)));
  }

  /** Tira a conta do Retro Computer (os arquivos dela ficam na nuvem, como estão). */
  async remover(id) {
    this.conta(id);
    await this.desconectar(id);
    if (!this.falso) await this.rclone(['config', 'delete', id]).catch(() => { });
    this.erros.delete(id);
    this.gravarContas(this.contas().filter((c) => c.id !== id));
    // A pasta da montagem (vazia, já desmontada) e o cache dela.
    try { fs.rmdirSync(this.pastaDe(id)); } catch { /* fica */ }
    try { fs.rmSync(path.join(this.pastaBase, 'cache', 'vfs', id), { recursive: true, force: true }); } catch { /* fica */ }
  }

  /* ---------- Montar e desmontar ---------- */

  async montada(pasta) {
    if (this.falso) return fs.existsSync(pasta);
    const texto = await fsp.readFile('/proc/self/mounts', 'utf8').catch(() => '');
    return lerMontagens(texto).includes(pasta);
  }

  async conectar(id) {
    this.conta(id);
    const atual = this.montagens.get(id);
    if (atual) return atual.esperar;
    const pasta = this.pastaDe(id);
    const m = { pasta, estado: 'conectando', filho: null, esperar: null };
    this.montagens.set(id, m);
    this.erros.delete(id);
    this.aoMudar();
    m.esperar = this.montarConta(id, m).then(() => {
      m.estado = 'conectada';
      this.aoMudar();
      return { ok: true };
    }, (e) => {
      if (this.montagens.get(id) === m) this.montagens.delete(id);
      this.erros.set(id, e.codigo || 'rclone');
      this.aoMudar();
      throw e;
    });
    return m.esperar;
  }

  async montarConta(id, m) {
    if (this.falso) {
      // A "nuvem" de mentira é uma pasta comum, com alguns arquivos de exemplo na primeira vez.
      const origem = path.join(this.falso, id);
      if (!fs.existsSync(origem)) {
        fs.mkdirSync(path.join(origem, 'Documentos'), { recursive: true });
        fs.mkdirSync(path.join(origem, 'Fotos'), { recursive: true });
        fs.writeFileSync(path.join(origem, 'Documentos', 'Relatório anual.txt'), 'Relatório anual\n\nTexto de exemplo da nuvem.\n');
        fs.writeFileSync(path.join(origem, 'Leia-me.txt'), 'Arquivos da nuvem de mentira (RETRO_NUVEM_FALSA).\n');
      }
      m.pasta = origem;
      await new Promise((ok) => setTimeout(ok, 300));
      return;
    }
    fs.mkdirSync(m.pasta, { recursive: true, mode: 0o700 });
    // Uma montagem que ficou de antes (o programa fechou sem desmontar) sai primeiro.
    if (await this.montada(m.pasta)) await this.desmontarPasta(m.pasta);
    if (fs.readdirSync(m.pasta).length) throw erro('pastaCheia');
    // Sem o cache de gravação (o "off"): o Retro Computer só copia de e para a nuvem (os programas
    // abrem a cópia do disco C:), e cada cópia levada só termina com o arquivo já no servidor.
    // Com o cache, o arquivo esperava uns segundos para subir, e desconectar antes o deixava para trás.
    const args = ['--config', this.conf, 'mount', `${id}:`, m.pasta,
      '--vfs-cache-mode', 'off', '--cache-dir', path.join(this.pastaBase, 'cache'),
      '--dir-cache-time', '1m', '--poll-interval', '1m', '--log-level', 'NOTICE'];
    const filho = spawn('rclone', args, { env: this.env(), stdio: ['ignore', 'ignore', 'pipe'] });
    m.filho = filho;
    let erros = '';
    filho.stderr.on('data', (d) => { erros = (erros + d).slice(-8000); });
    const saiu = new Promise((ok) => filho.on('close', (codigo) => ok(codigo)));
    filho.on('error', () => { });
    // Saiu (sozinho ou desconectado): a conta volta a desconectada.
    saiu.then(() => {
      if (this.montagens.get(id) === m) {
        this.montagens.delete(id);
        if (m.estado === 'conectada' && !m.saindo) this.erros.set(id, 'caiu');
        this.aoMudar();
      }
    });
    const ate = Date.now() + ESPERA_MONTAR;
    while (Date.now() < ate) {
      if (await this.montada(m.pasta)) return;
      const r = await Promise.race([saiu, new Promise((ok) => setTimeout(() => ok('espera'), 300))]);
      if (r !== 'espera') {
        if (/couldn't find|didn't find section|not found in config/i.test(erros)) throw erro('conta');
        if (/fusermount|fuse|\/dev\/fuse/i.test(erros)) throw erro('fuse');
        if (/token|oauth|invalid_grant|unauthorized|401/i.test(erros)) throw erro('login');
        throw erro('rclone', { detalhe: erros.split('\n').map((l) => l.trim()).filter(Boolean).pop() || '' });
      }
    }
    try { filho.kill('SIGTERM'); } catch { /* já saiu */ }
    throw erro('tempo');
  }

  async desmontarPasta(pasta) {
    for (const cmd of ['fusermount3', 'fusermount']) {
      try { await rodar(cmd, ['-u', '-z', pasta], { timeout: 10000 }); return true; } catch { /* o outro */ }
    }
    return false;
  }

  /** Desconecta (o rclone grava o que falta e desmonta); os arquivos ficam na nuvem. */
  async desconectar(id) {
    const m = this.montagens.get(id);
    if (!m) return { ok: true };
    m.saindo = true;
    if (this.falso) {
      this.montagens.delete(id);
      this.aoMudar();
      return { ok: true };
    }
    if (m.filho && m.filho.exitCode == null) {
      const saiu = new Promise((ok) => m.filho.once('close', ok));
      try { m.filho.kill('SIGTERM'); } catch { /* já saiu */ }
      await Promise.race([saiu, new Promise((ok) => setTimeout(ok, 15000))]);
    }
    if (await this.montada(m.pasta)) await this.desmontarPasta(m.pasta);
    this.montagens.delete(id);
    this.aoMudar();
    return { ok: true };
  }

  /** Conecta as contas com "Conectar ao ligar" (o erro de uma não impede as outras). */
  async conectarAoLigar() {
    const e = await this.estado().catch(() => null);
    if (!e || !e.disponivel || !e.rclone || !e.serve) return;
    for (const c of this.contas()) if (c.aoLigar !== false) await this.conectar(c.id).catch(() => { });
  }

  /** Ao fechar o Retro Computer: o rclone de cada conta termina (e desmonta). */
  encerrar() {
    this.cancelar();
    for (const m of this.montagens.values()) {
      m.saindo = true;
      if (m.filho && m.filho.exitCode == null) { try { m.filho.kill('SIGTERM'); } catch { /* já saiu */ } }
    }
  }

  /* ---------- No Meu computador, como os pendrives ---------- */

  async listar() {
    const r = [];
    for (const c of this.contas()) {
      const m = this.montagens.get(c.id);
      if (!m || m.estado !== 'conectada') continue;
      const u = { id: `nuvem:${c.id}`, tipo: 'nuvem', servico: this.tipos[c.tipo].nome, rotulo: c.nome, icone: 'nuvem', raiz: m.pasta, montada: true };
      try {
        const s = await fsp.statfs(m.pasta);
        if (s.blocks) { u.total = s.blocks * s.bsize; u.livre = s.bavail * s.bsize; }
      } catch { /* sem o espaço */ }
      r.push(u);
    }
    this.ultimas = new Map(r.map((u) => [u.id, u]));
    return r;
  }

  async montar(id) {
    const conta = String(id).replace(/^nuvem:/, '');
    if (!this.montagens.has(conta) || this.montagens.get(conta).estado !== 'conectada') await this.conectar(conta);
    return this.unidade(`nuvem:${conta}`);
  }

  async unidade(id) {
    await this.listar();
    const u = this.ultimas.get(id);
    if (!u) throw erro('unidade');
    return u;
  }

  async ejetar(id) {
    await this.desconectar(String(id).replace(/^nuvem:/, ''));
    return { ok: true };
  }

  async montarNovas() { return []; }
}

module.exports = { Nuvens, TIPOS, RESPOSTAS, lerVersao, versaoServe, lerMontagens, lerPergunta, responder, idValido };
