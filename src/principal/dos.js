'use strict';
/*
 * O DOS: o DOSBox do projeto js-dos (o pacote "emulators", GPL-2.0, sem modificação, servido em
 * vendor/emulators/) roda numa janela da área de trabalho, sem internet. A unidade C: do DOS é a
 * pasta C:\DOS do disco do Retro Computer (ou a pasta do programa aberto com dois cliques): os
 * arquivos vão para o emulador ao abrir e voltam para o disco ao guardar. Nada se perde: o que
 * mudou é gravado com a versão anterior guardada, e o que o DOS apagou vai para a Lixeira.
 *
 * No Linux, com o DOSBox do sistema instalado (o do apt ou o do Flathub), o DOS roda nele, bem
 * mais rápido (DosNativo): numa cópia da pasta, que volta para o disco do mesmo jeito.
 */
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn, execFile } = require('node:child_process');

const PASTA_DOS = 'DOS';
// O DOS cabe em pouco: uma pasta maior que isso não vai inteira para a memória do emulador.
const LIMITE = 256 * 1024 * 1024;
// A configuração que o js-dos guarda junto dos arquivos (não volta para o disco).
const DO_EMULADOR = /^\.jsdos(\/|$)/i;

const resumo = (b) => crypto.createHash('sha1').update(b).digest('hex');

/**
 * O que é um .exe: 'dos' (um programa do DOS, inclusive os com extensor, LE e LX), 'windows'
 * (PE ou NE: o Windows de 32 bits ou o de 16) ou null (não é um executável).
 */
function tipoExecutavel(b) {
  if (!b || b.length < 2 || b[0] !== 0x4d || b[1] !== 0x5a) return null; // "MZ"
  // A tabela de realocação antes de 0x40 é o sinal do executável do DOS puro.
  if (b.length < 0x40 || b.readUInt16LE(0x18) < 0x40) return 'dos';
  const novo = b.readUInt32LE(0x3c);
  if (novo + 2 > b.length) return 'dos';
  const assinatura = b.toString('latin1', novo, novo + 2);
  if (assinatura === 'PE' || assinatura === 'NE') return 'windows';
  return 'dos';
}

/** O nome que o DOS entende (8.3, sem espaços): só esses o emulador abre direto pelo nome. */
const nomeDos = (nome) => /^[A-Z0-9_~!#$%&'()@^`{}-]{1,8}(\.[A-Z0-9_~!#$%&'()@^`{}-]{1,3})?$/i.test(nome);

/**
 * Os comandos do autoexec para abrir um programa (o caminho dentro da unidade C:, com "/"):
 * entra na pasta dele e o chama. Com um nome fora do 8.3, só entra na pasta (e lista os arquivos).
 */
function comandosPara(dentro) {
  if (!dentro) return [];
  const partes = dentro.split('/').filter(Boolean);
  const nome = partes.pop();
  if (!partes.every(nomeDos)) return [];
  const r = partes.length ? ['cd \\' + partes.join('\\')] : [];
  if (!nomeDos(nome)) return [...r, 'dir /w'];
  // Os arquivos de lote rodam pelo "call", para voltar ao prompt no fim.
  return [...r, /\.bat$/i.test(nome) ? 'call ' + nome : nome];
}

/** O dosbox.conf: o mouse sem prender, a máquina SVGA, a memória e a unidade C: (a pasta). */
function configuracao(comandos = []) {
  return [
    '[sdl]', 'autolock=false', '',
    '[dosbox]', 'machine=svga_s3', 'memsize=16', '',
    '[cpu]', 'core=auto', 'cputype=auto', 'cycles=auto', '',
    '[mixer]', 'rate=44100', '',
    '[sblaster]', 'sbtype=sb16', '',
    '[autoexec]', 'mount c .', 'c:', ...comandos, '',
  ].join('\n');
}

/** Os arquivos de uma pasta (com as subpastas), sem os ocultos e as versões. */
async function lerPasta(raiz, { limite = LIMITE } = {}) {
  const arquivos = [];
  const pastas = [];
  const foto = {};
  let total = 0;
  const andar = async (real, rel) => {
    let itens = [];
    try { itens = await fsp.readdir(real, { withFileTypes: true }); } catch { return; }
    for (const e of itens) {
      if (e.name.startsWith('.') || e.isSymbolicLink()) continue;
      const r = rel ? rel + '/' + e.name : e.name;
      const cheio = path.join(real, e.name);
      if (e.isDirectory()) { pastas.push(r); await andar(cheio, r); continue; }
      if (!e.isFile()) continue;
      const st = await fsp.stat(cheio);
      total += st.size;
      if (total > limite) { const erro = new Error('grande'); erro.grande = true; throw erro; }
      const conteudo = await fsp.readFile(cheio);
      arquivos.push({ caminho: r, conteudo });
      foto[r.toLowerCase()] = { caminho: r, resumo: resumo(conteudo) };
    }
  };
  await andar(raiz, '');
  return { arquivos, pastas, foto, total };
}

/**
 * O que mudou entre a foto (os arquivos quando o DOS abriu) e o que o DOS tem agora:
 * { gravar: [{ caminho, conteudo }], apagar: [caminho] }. Os nomes valem sem maiúsculas.
 */
function diferencas(foto, arquivos) {
  const gravar = [];
  const vistos = new Set();
  for (const a of arquivos) {
    if (DO_EMULADOR.test(a.caminho)) continue;
    const chave = a.caminho.toLowerCase();
    vistos.add(chave);
    const antes = foto[chave];
    if (antes && antes.resumo === resumo(a.conteudo)) continue;
    // Um arquivo que já existia volta com o nome de antes (o DOS mostra tudo em maiúsculas).
    gravar.push({ caminho: antes ? antes.caminho : a.caminho, conteudo: a.conteudo });
  }
  const apagar = Object.entries(foto).filter(([k]) => !vistos.has(k)).map(([, v]) => v.caminho);
  return { gravar, apagar };
}

class Dos {
  constructor({ disco }) {
    this.disco = disco;
  }

  /**
   * Prepara a unidade C: do DOS. Sem arquivo, é a pasta C:\DOS (criada na primeira vez); com um
   * programa, a pasta C:\DOS quando ele está dentro dela, ou a própria pasta dele.
   */
  async abrir(arquivo = '') {
    let pasta = PASTA_DOS;
    let dentro = '';
    if (arquivo) {
      const n = this.disco.normalizar(arquivo);
      if (n.toLowerCase().startsWith(PASTA_DOS.toLowerCase() + '/')) {
        dentro = n.slice(PASTA_DOS.length + 1);
      } else {
        pasta = path.posix.dirname(n) === '.' ? '' : path.posix.dirname(n);
        dentro = path.posix.basename(n);
      }
    }
    const real = this.disco.real(pasta);
    if (pasta === PASTA_DOS) await fsp.mkdir(real, { recursive: true });
    try {
      const { arquivos, pastas, foto, total } = await lerPasta(real);
      const comandos = comandosPara(dentro);
      return { ok: true, pasta, conf: configuracao(comandos), comandos, arquivos, pastas, foto, total };
    } catch (e) {
      if (e.grande) return { ok: false, grande: true, pasta, limite: LIMITE };
      throw e;
    }
  }

  /**
   * Guarda no disco o que mudou no DOS (os arquivos e as pastas novas). Devolve a foto nova e
   * quantos foram gravados e para a Lixeira.
   */
  async guardar(pasta, foto, arquivos, pastas = []) {
    const { gravar, apagar } = diferencas(foto || {}, arquivos || []);
    const junta = (c) => (pasta ? pasta + '/' + c : c);
    let gravados = 0;
    let lixeira = 0;
    for (const p of pastas || []) {
      if (DO_EMULADOR.test(p)) continue;
      await fsp.mkdir(this.disco.real(junta(p)), { recursive: true });
    }
    for (const a of gravar) {
      await this.disco.gravar(junta(a.caminho), Buffer.from(a.conteudo));
      gravados++;
    }
    for (const c of apagar) {
      try { await this.disco.paraLixeira(junta(c)); lixeira++; } catch { /* já não existe */ }
    }
    const nova = {};
    for (const a of arquivos || []) {
      if (DO_EMULADOR.test(a.caminho)) continue;
      const k = a.caminho.toLowerCase();
      nova[k] = { caminho: (foto && foto[k] && foto[k].caminho) || a.caminho, resumo: resumo(Buffer.from(a.conteudo)) };
    }
    return { gravados, lixeira, foto: nova };
  }

  /** O tipo de um .exe do disco ('dos', 'windows' ou null), pelos primeiros 64 KB. */
  async tipo(rel) {
    const arq = await fsp.open(this.disco.real(rel), 'r');
    try {
      const b = Buffer.alloc(64 * 1024);
      const { bytesRead } = await arq.read(b, 0, b.length, 0);
      return tipoExecutavel(b.subarray(0, bytesRead));
    } finally {
      await arq.close();
    }
  }
}

/* ---------- O DOSBox do Linux ---------- */

// Os DOSBox do Linux, do mais novo ao mais antigo: os do sistema (o apt) e os do Flathub.
const DO_SISTEMA = [
  { nome: 'DOSBox Staging', cmd: 'dosbox-staging' },
  { nome: 'DOSBox-X', cmd: 'dosbox-x' },
  { nome: 'DOSBox', cmd: 'dosbox' },
];
const DO_FLATHUB = [
  { nome: 'DOSBox Staging', app: 'io.github.dosbox-staging' },
  { nome: 'DOSBox-X', app: 'com.dosbox_x.DOSBox-X' },
];
const PASTAS_BIN = ['/usr/bin', '/usr/local/bin', '/usr/games', '/usr/local/games'];

/**
 * O DOSBox do Linux instalado: { nome, cmd } (o do sistema) ou { nome, app } (o do Flathub), ou
 * null. casa é a pasta do usuário; existe(caminho) diz se o arquivo existe (os testes trocam).
 */
function acharDosbox({ casa = os.homedir(), existe = fs.existsSync } = {}) {
  for (const d of DO_SISTEMA) {
    const cheio = PASTAS_BIN.map((p) => path.join(p, d.cmd)).find((c) => existe(c));
    if (cheio) return { nome: d.nome, cmd: cheio };
  }
  if (PASTAS_BIN.some((p) => existe(path.join(p, 'flatpak')))) {
    for (const d of DO_FLATHUB) {
      const dentro = [path.join(casa, '.local', 'share', 'flatpak', 'app', d.app), path.join('/var', 'lib', 'flatpak', 'app', d.app)];
      if (dentro.some((c) => existe(c))) return { nome: d.nome, app: d.app };
    }
  }
  return null;
}

/**
 * O dosbox.conf do DOSBox do Linux: o mesmo DOS de dentro, a unidade C: na cópia da pasta e, logo
 * depois de montá-la, o modo seguro (config -securemode): sem ele, um .bat poderia montar outras
 * pastas do computador e apagar arquivos sem passar pela Lixeira. Sem rede (o IPX e as portas seriais).
 * O preparo não aparece na tela (o @echo off e o > nul); os comandos do programa, sim.
 */
function configuracaoNativa(unidade, comandos = []) {
  if (!path.isAbsolute(unidade) || /["\r\n]/.test(unidade)) throw new Error('pasta');
  return [
    '[sdl]', 'autolock=false', '',
    '[dosbox]', 'machine=svga_s3', 'memsize=16', '',
    '[cpu]', 'core=auto', 'cputype=auto', 'cycles=auto', '',
    '[mixer]', 'rate=44100', '',
    '[sblaster]', 'sbtype=sb16', '',
    '[ipx]', 'ipx=false', '',
    '[serial]', 'serial1=disabled', 'serial2=disabled', 'serial3=disabled', 'serial4=disabled', '',
    '[autoexec]', '@echo off', `mount c "${unidade}" > nul`, 'c:', 'config -securemode > nul', '@echo on', ...comandos, '',
  ].join('\n');
}

/** O comando que liga o DOSBox achado, com o dosbox.conf. */
function comandoDosbox(achado, conf) {
  if (achado.app) return { arquivo: 'flatpak', args: ['run', achado.app, '-conf', conf] };
  return { arquivo: achado.cmd, args: ['-conf', conf] };
}

/**
 * O DOS no DOSBox do Linux: a pasta (C:\DOS ou a do programa) é copiada para uma pasta de trabalho
 * só do usuário (a do Flathub fica dentro da pasta do próprio programa, que ele enxerga), o DOSBox
 * abre numa janela dele e, ao fechar (e em Guardar no disco), o que mudou volta pelo Dos.guardar:
 * com a versão anterior guardada e o que foi apagado na Lixeira. Um de cada vez.
 */
class DosNativo {
  constructor({ dos, aoSair = () => { }, achar = acharDosbox } = {}) {
    this.dos = dos;
    this.aoSair = aoSair;
    this.achar = achar;
    this.sessao = null;
    this.fila = Promise.resolve();
  }

  disponivel() {
    if (process.platform !== 'linux') return null;
    if (this.achado === undefined) this.achado = this.achar();
    return this.achado;
  }

  /** Procura de novo (depois de instalar pela Loja). */
  procurar() {
    this.achado = undefined;
    return this.disponivel();
  }

  async ligar(arquivo = '') {
    const achado = this.disponivel();
    if (!achado) return { ok: false, erro: 'sem' };
    if (this.sessao) await this.parar();
    const u = await this.dos.abrir(arquivo);
    if (!u.ok) return u;
    const base = achado.app ? path.join(os.homedir(), '.var', 'app', achado.app, 'retro-computer-dos') : os.tmpdir();
    await fsp.mkdir(base, { recursive: true, mode: 0o700 });
    const raiz = await fsp.mkdtemp(path.join(base, 'retro-dos-'));
    const unidade = path.join(raiz, 'c');
    for (const p of ['', ...(u.pastas || [])]) await fsp.mkdir(path.join(unidade, ...p.split('/')), { recursive: true });
    for (const a of u.arquivos) await fsp.writeFile(path.join(unidade, ...a.caminho.split('/')), a.conteudo);
    const conf = path.join(raiz, 'dosbox.conf');
    await fsp.writeFile(conf, configuracaoNativa(unidade, u.comandos), { mode: 0o600 });
    const c = comandoDosbox(achado, conf);
    const proc = spawn(c.arquivo, c.args, { cwd: raiz, stdio: 'ignore' });
    const id = crypto.randomBytes(8).toString('hex');
    const s = { id, proc, raiz, unidade, pasta: u.pasta, foto: u.foto, nome: achado.nome };
    this.sessao = s;
    proc.on('error', () => this.terminou(s));
    proc.on('exit', () => this.terminou(s));
    return { ok: true, id, pasta: u.pasta, nome: achado.nome };
  }

  /** Traz para o disco o que mudou na cópia (um de cada vez: o relógio, o botão e o fim). */
  guardar(s = this.sessao) {
    const vez = this.fila.then(async () => {
      if (!s) return { gravados: 0, lixeira: 0 };
      const { arquivos, pastas } = await lerPasta(s.unidade, { limite: LIMITE * 2 });
      const r = await this.dos.guardar(s.pasta, s.foto, arquivos, pastas);
      s.foto = r.foto;
      return { gravados: r.gravados, lixeira: r.lixeira };
    });
    this.fila = vez.catch(() => { });
    return vez;
  }

  /** Fecha o DOSBox (o que mudou volta antes). */
  async parar() {
    const s = this.sessao;
    if (!s) return { gravados: 0, lixeira: 0 };
    const r = await this.guardar(s).catch((e) => ({ erro: e.message }));
    s.parando = true;
    const saiu = new Promise((ok) => { s.proc.once('exit', ok); setTimeout(ok, 4000); });
    try { s.proc.kill('SIGTERM'); } catch { }
    await saiu;
    return r;
  }

  /** O DOSBox fechou (o EXIT, a janela dele ou o Parar): guarda e apaga a cópia (só se guardou). */
  async terminou(s) {
    if (s.terminado) return;
    s.terminado = true;
    if (this.sessao === s) this.sessao = null;
    let r;
    try {
      r = await this.guardar(s);
      await fsp.rm(s.raiz, { recursive: true, force: true });
    } catch (e) {
      // Sem guardar, a cópia fica: nada se perde, e o aviso diz onde ela está.
      r = { erro: e.message, copia: s.unidade };
    }
    this.aoSair({ id: s.id, parando: !!s.parando, ...r });
  }

  /** A janela do DOSBox vem para a frente (no Linux, pelo wmctrl). */
  mostrar() {
    return new Promise((ok) => {
      execFile('wmctrl', ['-lx'], { timeout: 3000 }, (erro, saida) => {
        const linha = !erro && String(saida).split('\n').find((l) => /dosbox/i.test(l.split(/\s+/)[2] || ''));
        if (!linha) return ok(false);
        execFile('wmctrl', ['-ia', linha.split(/\s+/)[0]], { timeout: 3000 }, () => ok(true));
      });
    });
  }

  encerrar() {
    const s = this.sessao;
    if (s) { try { s.proc.kill('SIGTERM'); } catch { } }
  }
}

/* ---------- O emulador em dos://emulador ---------- */

// O js-dos avalia o próprio código com eval: ele roda numa origem só dele (dos://emulador), num
// quadro isolado da área de trabalho, sem a ponte com o processo principal e sem internet. Só ali
// o eval vale, e só a área de trabalho pode embutir a página.
const CSP_EMULADOR = [
  "default-src 'none'",
  "script-src dos: 'unsafe-eval' 'wasm-unsafe-eval'",
  'worker-src dos: blob:',
  'connect-src dos:',
  "style-src 'unsafe-inline'",
  'img-src data: blob:',
  'media-src blob:',
  'frame-ancestors sistema:',
].join('; ');

const DA_BIBLIOTECA = new Set(['emulators.js', 'wdosbox.js', 'wdosbox.wasm', 'wlibzip.js', 'wlibzip.wasm']);
const DA_PAGINA = new Set(['emulador.html', 'emulador.js']);
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm' };

/** O arquivo de verdade de um endereço dos://emulador/…, ou null (só a página e a biblioteca). */
function arquivoDoEmulador(url, raizApp) {
  let u;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== 'dos:' || u.hostname !== 'emulador') return null;
  const nome = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'emulador.html';
  if (DA_PAGINA.has(nome)) return path.join(raizApp, 'src', 'dos', nome);
  if (DA_BIBLIOTECA.has(nome)) return path.join(raizApp, 'node_modules', 'emulators', 'dist', nome);
  return null;
}

async function servirEmulador(pedido, raizApp) {
  const arquivo = arquivoDoEmulador(pedido.url, raizApp);
  let corpo;
  try { corpo = arquivo && await fsp.readFile(arquivo); } catch { corpo = null; }
  if (!corpo) return new Response('404', { status: 404 });
  return new Response(corpo, {
    headers: {
      'Content-Type': TIPOS[path.extname(arquivo)] || 'application/octet-stream',
      'Content-Security-Policy': CSP_EMULADOR,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

module.exports = { Dos, DosNativo, acharDosbox, configuracaoNativa, comandoDosbox, tipoExecutavel, nomeDos, comandosPara, configuracao, lerPasta, diferencas, arquivoDoEmulador, servirEmulador, CSP_EMULADOR, PASTA_DOS, LIMITE };
