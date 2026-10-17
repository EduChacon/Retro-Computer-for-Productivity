'use strict';
/*
 * O Mac Plus: o PCE.js (o pacote "pcejs-macplus", de James Friend, sobre o PCE de Hampa Hug,
 * GPL-2.0, sem modificação) roda numa janela da área de trabalho, sem internet. Nada da Apple vem
 * com o Retro Computer: a ROM do Mac (a imagem de 128 KB do Mac Plus, de 256 KB do Mac SE ou de
 * 512 KB do Mac Classic), o disquete do Sistema e os jogos são do usuário, na pasta C:\Mac do disco.
 * Os disquetes e discos vão para o emulador ao ligar e voltam ao disco ao guardar: o que mudou é
 * gravado com a versão de antes de ligar o Mac guardada (nada se perde).
 */
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const PASTA_MAC = 'Mac';
// O tamanho da ROM diz o modelo (o PCE escolhe a máquina por ele).
const MODELOS = { 131072: 'mac-plus', 262144: 'mac-se', 524288: 'mac-classic' };
const EXT_DISCO = new Set(['dsk', 'img', 'image', 'dc42', 'diskcopy42', 'hfv', 'hda', 'ima', 'raw', 'disk']);
// Os discos ficam inteiros na memória do emulador.
const LIMITE = 512 * 1024 * 1024;
const MAX_DISQUETES = 3;
const MAX_DISCOS = 3;
// O cabeçalho do Disk Copy 4.2 (o formato dos disquetes da época): 84 bytes, depois os dados e as etiquetas.
const DC42_CAB = 84;

const resumo = (b) => crypto.createHash('sha1').update(b).digest('hex');
const extensao = (nome) => path.extname(nome).slice(1).toLowerCase();

/** O modelo da ROM pelo tamanho, ou null (o arquivo .rom do próprio PCE não conta). */
function modeloDaRom(nome, tam) {
  if (extensao(nome) !== 'rom' || /pcex/i.test(nome)) return null;
  return MODELOS[tam] || null;
}

/**
 * A imagem do Disk Copy 4.2: { dados, etiquetas } (as partes do arquivo), ou null se não for.
 * O nome tem até 63 letras, a marca 0x0100 fica no fim do cabeçalho e os tamanhos fecham com o arquivo.
 */
function lerDc42(b) {
  if (!b || b.length < DC42_CAB || b[0] > 63 || b[0x52] !== 0x01 || b[0x53] !== 0x00) return null;
  const tamDados = b.readUInt32BE(0x40);
  const tamEtiquetas = b.readUInt32BE(0x44);
  if (!tamDados || tamDados % 512 || DC42_CAB + tamDados + tamEtiquetas !== b.length) return null;
  return { dados: b.subarray(DC42_CAB, DC42_CAB + tamDados), etiquetas: b.subarray(DC42_CAB + tamDados) };
}

/** A soma do Disk Copy 4.2: cada palavra de 16 bits somada e a soma girada um bit para a direita. */
function somaDc42(dados) {
  let s = 0;
  for (let i = 0; i + 1 < dados.length; i += 2) {
    s = (s + ((dados[i] << 8) | dados[i + 1])) >>> 0;
    s = ((s >>> 1) | (s << 31)) >>> 0;
  }
  return s;
}

/** O arquivo do Disk Copy 4.2 de volta, com os dados novos (o cabeçalho e as etiquetas de antes). */
function montarDc42(original, dados) {
  const cab = Buffer.from(original.subarray(0, DC42_CAB));
  const etiquetas = original.subarray(DC42_CAB + cab.readUInt32BE(0x40));
  cab.writeUInt32BE(dados.length, 0x40);
  cab.writeUInt32BE(somaDc42(dados), 0x48);
  return Buffer.concat([cab, Buffer.from(dados), etiquetas]);
}

/** Um disco rígido tem o mapa de partições da Apple ("ER" no começo); o resto vai nas unidades de disquete. */
const ehDiscoRigido = (dados) => dados.length > 1474560 && dados[0] === 0x45 && dados[1] === 0x52;

/** Os discos de partida (System, Sistema, Boot, Startup) vão na primeira unidade. */
const ehPartida = (nome) => /system|sistema|boot|startup|inicializ|arranque/i.test(nome);

/**
 * A ordem das unidades: os de partida, depois o aberto com dois cliques, depois os outros por nome.
 * Cada item é { caminho, nome }; o caminho aberto vem em "primeiro".
 */
function ordenarDiscos(itens, primeiro = '') {
  const peso = (i) => (ehPartida(i.nome) ? 0 : i.caminho === primeiro ? 1 : 2);
  return [...itens].sort((a, b) => peso(a) - peso(b) || a.nome.localeCompare(b.nome, undefined, { numeric: true, sensitivity: 'base' }));
}

/**
 * O pce-config.cfg (do modelo pce-macplus.cfg.in do PCE): a máquina da ROM, 4 MB de memória, a
 * tela de 512 × 342, o som e os discos. Os disquetes são "d1.img"…, os discos rígidos "h1.img"…
 * (o emulador recebe os dados crus, sem o cabeçalho do Disk Copy). A tecla de escape do PCE vira
 * a ScrollLock (a página do emulador não a deixa passar), para o Esc ir para o Mac.
 */
function configuracao({ modelo = 'mac-plus', disquetes = 0, discos = 0 } = {}) {
  const l = [
    'path = "-."',
    'memtest = 0',
    'system {', `\tmodel = "${modelo}"`, '}',
    'cpu {', '\tmodel = "68000"', '\tspeed = 1', '}',
    'ram {', '\taddress = 0', '\tsize = 4096K', '\tdefault = 0x00', '}',
    'rom {', '\tfile = "mac.rom"', '\taddress = 0x400000', `\tsize = ${modelo === 'mac-classic' ? '512K' : '256K'}`, '\tdefault = 0xff', '}',
    'rom {', '\taddress = 0xf80000', '\tsize = 256K', '\tfile = "macplus-pcex.rom"', '\tdefault = 0xff', '}',
    'terminal {', '\tdriver = "sdl"', '\tescape = "ScrollLock"', '\tscale = 1', '\taspect_x = 3', '\taspect_y = 2',
    '\tmin_w = 512', '\tmin_h = 342', '\tborder = 0', '\tfullscreen = 0', '}',
    'sound {', '\tlowpass = 8000', '\tdriver = "sdl:lowpass=0"', '}',
    'keyboard {', '\tmodel = 0', '\tintl = 0', '\tkeypad_motion = 0', '}',
    'adb {', '\tmouse = true', '\tkeyboard = true', '\tkeypad_motion = false', '}',
    'rtc {', `\tfile = "pram-${modelo}.dat"`, '\tromdisk = 0', '}',
    'sony {', '\tenable = 1', '\tinsert_delay = 15', '}',
    'scsi {',
  ];
  for (let i = 0; i < Math.min(discos, MAX_DISCOS); i++) l.push('\tdevice {', `\t\tid = ${6 - 2 * i}`, `\t\tdrive = ${128 + i}`, '\t}');
  l.push('}', 'video {', '\tcolor0 = 0x000000', '\tcolor1 = 0xffffff', '\tbrightness = 1000', '}');
  for (let i = 0; i < Math.min(disquetes, MAX_DISQUETES); i++) l.push('disk {', `\tdrive = ${i + 1}`, '\ttype = "image"', `\tfile = "d${i + 1}.img"`, '\toptional = 1', '}');
  for (let i = 0; i < Math.min(discos, MAX_DISCOS); i++) l.push('disk {', `\tdrive = ${128 + i}`, '\ttype = "image"', `\tfile = "h${i + 1}.img"`, '\toptional = 1', '}');
  return l.join('\n') + '\n';
}

class Mac {
  constructor({ disco }) {
    this.disco = disco;
  }

  /**
   * Prepara o Mac: a ROM e os discos da pasta C:\Mac (criada na primeira vez). Um disco aberto com
   * dois cliques de outra pasta entra junto, logo depois do de partida.
   */
  async abrir(arquivo = '') {
    const pasta = PASTA_MAC;
    await fsp.mkdir(this.disco.real(pasta), { recursive: true });
    let itens = [];
    try { itens = await fsp.readdir(this.disco.real(pasta), { withFileTypes: true }); } catch { }
    const candidatos = [];
    let rom = null;
    for (const e of itens) {
      if (e.name.startsWith('.') || !e.isFile()) continue;
      const caminho = pasta + '/' + e.name;
      const st = await fsp.stat(this.disco.real(caminho));
      const modelo = modeloDaRom(e.name, st.size);
      if (modelo && !rom) rom = { caminho, modelo };
      else if (EXT_DISCO.has(extensao(e.name))) candidatos.push({ caminho, nome: e.name, tam: st.size });
    }
    const aberto = arquivo ? this.disco.normalizar(arquivo) : '';
    if (aberto && !candidatos.some((c) => c.caminho.toLowerCase() === aberto.toLowerCase())) {
      const st = await fsp.stat(this.disco.real(aberto));
      candidatos.push({ caminho: aberto, nome: path.posix.basename(aberto), tam: st.size });
    }
    if (!rom) return { ok: false, semRom: true, pasta };
    if (!candidatos.length) return { ok: false, semDisco: true, pasta };

    const discos = [];
    const foto = {};
    let total = 0;
    let disquetes = 0;
    let rigidos = 0;
    const primeiro = candidatos.find((c) => c.caminho.toLowerCase() === aberto.toLowerCase());
    for (const c of ordenarDiscos(candidatos, primeiro ? primeiro.caminho : '')) {
      if (total + c.tam > LIMITE) continue;
      const bruto = await fsp.readFile(this.disco.real(c.caminho));
      const dc42 = lerDc42(bruto);
      const dados = dc42 ? dc42.dados : bruto;
      if (dados.length < 512 * 2) continue;
      const rigido = ehDiscoRigido(dados);
      if (rigido ? rigidos >= MAX_DISCOS : disquetes >= MAX_DISQUETES) continue;
      const interno = rigido ? `h${++rigidos}.img` : `d${++disquetes}.img`;
      total += dados.length;
      discos.push({ caminho: c.caminho, nome: c.nome, interno, rigido, dc42: !!dc42, conteudo: dados });
      foto[c.caminho] = { resumo: resumo(dados), dc42: !!dc42 };
    }
    if (!discos.length) return { ok: false, semDisco: true, pasta };
    return {
      ok: true, pasta, modelo: rom.modelo,
      rom: { caminho: rom.caminho, conteudo: await fsp.readFile(this.disco.real(rom.caminho)) },
      conf: configuracao({ modelo: rom.modelo, disquetes, discos: rigidos }),
      discos, foto, total,
    };
  }

  /**
   * Guarda no disco os discos que mudaram ([{ caminho, conteudo }], os dados crus do emulador).
   * Na primeira vez de cada um, a versão de antes de ligar o Mac fica guardada; nas outras, só o
   * arquivo muda (senão cada dois minutos virariam uma versão de um disco inteiro).
   */
  async guardar(foto = {}, discos = []) {
    const nova = { ...foto };
    let gravados = 0;
    for (const d of discos || []) {
      const antes = foto[d.caminho];
      if (!antes) continue; // só os discos que foram para o emulador voltam
      const dados = Buffer.from(d.conteudo);
      const r = resumo(dados);
      if (r === antes.resumo) continue;
      let corpo = dados;
      if (antes.dc42) {
        const original = await fsp.readFile(this.disco.real(d.caminho));
        corpo = lerDc42(original) ? montarDc42(original, dados) : dados;
      }
      await this.disco.gravar(d.caminho, corpo, { versao: !antes.versionado });
      nova[d.caminho] = { ...antes, resumo: r, versionado: true };
      gravados++;
    }
    return { gravados, foto: nova };
  }
}

/* ---------- O emulador em mac://emulador ---------- */

// O emulador roda numa origem só dele (mac://emulador), num quadro isolado da área de trabalho,
// sem a ponte com o processo principal e sem internet; só a área de trabalho pode embutir a página.
const CSP_EMULADOR = [
  "default-src 'none'",
  "script-src mac: 'wasm-unsafe-eval'",
  'connect-src mac:',
  "style-src 'unsafe-inline'",
  'img-src data: blob:',
  'media-src blob:',
  'frame-ancestors sistema:',
].join('; ');

const DA_BIBLIOTECA = new Set(['pcejs-macplus.umd.js', 'pce-macplus.wasm', 'macplus-pcex.rom']);
const DA_PAGINA = new Set(['emulador.html', 'emulador.js']);
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm' };

/** O arquivo de verdade de um endereço mac://emulador/…, ou null (só a página e a biblioteca). */
function arquivoDoEmulador(url, raizApp) {
  let u;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== 'mac:' || u.hostname !== 'emulador') return null;
  const nome = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'emulador.html';
  if (DA_PAGINA.has(nome)) return path.join(raizApp, 'src', 'mac', nome);
  if (DA_BIBLIOTECA.has(nome)) return path.join(raizApp, 'node_modules', 'pcejs-macplus', nome);
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

module.exports = {
  Mac, modeloDaRom, lerDc42, somaDc42, montarDc42, ehDiscoRigido, ordenarDiscos, configuracao,
  arquivoDoEmulador, servirEmulador, CSP_EMULADOR, PASTA_MAC, EXT_DISCO, LIMITE,
};
