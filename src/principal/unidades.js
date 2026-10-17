'use strict';
/*
 * As unidades removíveis (pendrives, cartões de memória, HDs externos) no Meu computador.
 *
 *   Linux:   lsblk (as partições removíveis ou de USB), udisksctl para montar (sem senha,
 *            para a sessão aberta) e para remover com segurança;
 *   Windows: as unidades removíveis (Win32_LogicalDisk, DriveType 2) e as dos discos de USB,
 *            ejetadas pelo Explorer;
 *   macOS:   os volumes em /Volumes (menos o do sistema), ejetados pelo diskutil.
 *
 * Nada aqui apaga nem grava por cima: os arquivos vêm para o disco C: (disco.importar) ou vão
 * para a unidade com um nome livre (disco.exportar). Um caminho nunca sai da raiz da unidade.
 * Formatar fica em discos.js (com o disco inteiro e as imagens).
 */
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');

function rodar(cmd, args, { timeout = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, windowsHide: true, maxBuffer: 4 << 20, env: { ...process.env, LC_ALL: 'C' } }, (erro, saida, serr) => {
      if (erro) { erro.saida = String(serr || saida || '').trim(); return reject(erro); }
      resolve(String(saida));
    });
  });
}

/* ---------- Leitura (funções puras, testadas em testes/unidades.test.js) ---------- */

/**
 * lsblk -J -b -o NAME,PATH,PKNAME,LABEL,MOUNTPOINT,RM,HOTPLUG,SIZE,TYPE,TRAN,FSTYPE
 * → as partições (ou discos sem partição) removíveis com um sistema de arquivos.
 */
function lerLsblk(json) {
  const r = [];
  const verdade = (v) => v === true || v === '1' || v === 1;
  const andar = (d, pai) => {
    const removivel = verdade(d.rm) || verdade(d.hotplug) || d.tran === 'usb' || (pai && pai.removivel);
    const eu = { removivel, disco: d.type === 'disk' ? d.path || '/dev/' + d.name : pai && pai.disco };
    if (removivel && d.fstype && d.fstype !== 'swap' && ['part', 'disk'].includes(d.type) && !(d.children && d.children.length)) {
      r.push({
        id: d.path || '/dev/' + d.name,
        rotulo: d.label || '',
        raiz: d.mountpoint || null,
        montada: !!d.mountpoint,
        disco: eu.disco || d.pkname && '/dev/' + d.pkname || null,
        tamanho: Number(d.size) || 0,
      });
    }
    for (const f of d.children || []) andar(f, eu);
  };
  for (const d of (JSON.parse(json).blockdevices || [])) andar(d, null);
  return r;
}

/**
 * O rótulo do volume que todos os sistemas aceitam: só letras sem acento, números, espaço, "-" e
 * "_"; no FAT32, até 11 letras maiúsculas; no exFAT, até 15; no NTFS, até 32.
 */
function limparRotulo(rotulo, sistema) {
  const limpo = String(rotulo || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9 _-]/g, '').trim() || 'PENDRIVE';
  if (sistema === 'fat32') return limpo.toUpperCase().slice(0, 11).trim();
  if (sistema === 'exfat') return limpo.slice(0, 15).trim();
  return limpo.slice(0, 32).trim();
}

/**
 * O comando que formata uma partição do pendrive (Linux): o exFAT (o padrão, lido pelo Windows,
 * pelo Mac e pelo Linux) ou o FAT32 (os aparelhos antigos, com arquivos de até 4 GB). Só os nomes
 * de dispositivo de disco passam.
 */
function comandoFormatar(dispositivo, sistema, rotulo) {
  if (!/^\/dev\/(sd[a-z]+\d*|mmcblk\d+(p\d+)?|nvme\d+n\d+(p\d+)?|vd[a-z]+\d*)$/.test(String(dispositivo))) return null;
  if (sistema === 'fat32') return ['mkfs.vfat', ['-F', '32', '-n', limparRotulo(rotulo, sistema), dispositivo]];
  if (sistema === 'exfat') return ['mkfs.exfat', ['-L', limparRotulo(rotulo, sistema), dispositivo]];
  return null;
}

/** "Mounted /dev/sdb1 at /media/eu/PENDRIVE" (udisksctl mount) → o lugar. */
function lerMontagem(s) {
  const m = /\bat\s+(\/.+?)\.?\s*$/m.exec(String(s).trim());
  return m ? m[1] : null;
}

/** Um caminho dentro da unidade: nunca sai da raiz dela. */
function dentro(raiz, rel = '') {
  const partes = String(rel).split(/[\\/]+/).filter((p) => p && p !== '.');
  if (partes.some((p) => p === '..')) throw new Error('caminho');
  const alvo = path.resolve(raiz, ...partes);
  const base = path.resolve(raiz);
  if (alvo !== base && !alvo.startsWith(base.endsWith(path.sep) ? base : base + path.sep)) throw new Error('caminho');
  return alvo;
}

// As pastas que os sistemas criam nas unidades e que ninguém precisa ver.
const ESCONDIDAS = new Set(['system volume information', '$recycle.bin', 'recycler', '.trashes', '.spotlight-v100', '.fseventsd', '.trash-1000', 'lost+found']);
const escondida = (nome) => nome.startsWith('.') || ESCONDIDAS.has(nome.toLowerCase());

/*
 * As unidades do Windows: as removíveis (DriveType 2) e as dos discos de USB, que o Windows às vezes
 * vê como discos fixos (os HDs externos e alguns pendrives). A saída em UTF-8, para os acentos.
 */
const LISTAR_WINDOWS = `[Console]::OutputEncoding = [Text.Encoding]::UTF8
$usb = @{}
foreach ($d in @(Get-CimInstance Win32_DiskDrive -Filter "InterfaceType='USB'")) {
  foreach ($p in @(Get-CimAssociatedInstance -InputObject $d -ResultClassName Win32_DiskPartition)) {
    foreach ($l in @(Get-CimAssociatedInstance -InputObject $p -ResultClassName Win32_LogicalDisk)) { $usb[[string]$l.DeviceID] = 1 }
  }
}
@(Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DriveType -eq 2 -or $usb.ContainsKey([string]$_.DeviceID) } | Select-Object DeviceID,VolumeName,Size) | ConvertTo-Json -Compress`;

/* ---------- As unidades ---------- */

class Unidades {
  constructor({ plataforma = process.platform, disco, sistema = false } = {}) {
    this.plataforma = plataforma;
    // O disco C: pode ser trocado com o programa aberto: sempre o atual.
    this.disco = typeof disco === 'function' ? disco : () => disco;
    this.sistema = sistema; // no modo sistema, monta sozinho o pendrive que chega
    this.ultimas = new Map();
  }

  async listar() {
    let lista = [];
    try {
      if (this.plataforma === 'linux') lista = lerLsblk(await rodar('lsblk', ['-J', '-b', '-o', 'NAME,PATH,PKNAME,LABEL,MOUNTPOINT,RM,HOTPLUG,SIZE,TYPE,TRAN,FSTYPE']));
      else if (this.plataforma === 'win32') lista = await this.listarWindows();
      else if (this.plataforma === 'darwin') lista = await this.listarMac();
    } catch {
      lista = [];
    }
    for (const u of lista) {
      if (u.montada && u.raiz) {
        try {
          const s = await fsp.statfs(u.raiz);
          u.total = s.blocks * s.bsize;
          u.livre = s.bavail * s.bsize;
        } catch { }
      }
    }
    this.ultimas = new Map(lista.map((u) => [u.id, u]));
    return lista;
  }

  async listarWindows() {
    const s = await rodar('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(LISTAR_WINDOWS, 'utf16le').toString('base64')], { timeout: 30000 });
    const d = JSON.parse(s.trim() || '[]');
    return (Array.isArray(d) ? d : [d]).filter((x) => x && x.DeviceID).map((x) => ({
      id: x.DeviceID, rotulo: x.VolumeName || '', letra: x.DeviceID, raiz: x.DeviceID + '\\', montada: true, tamanho: Number(x.Size) || 0,
    }));
  }

  async listarMac() {
    const r = [];
    for (const n of await fsp.readdir('/Volumes').catch(() => [])) {
      const p = path.join('/Volumes', n);
      try { if (fs.realpathSync(p) === '/') continue; } catch { continue; }
      r.push({ id: p, rotulo: n, raiz: p, montada: true });
    }
    return r;
  }

  /** A unidade (da última lista) pelo id; montada, para mexer nos arquivos. */
  async unidade(id) {
    if (!this.ultimas.has(id)) await this.listar();
    const u = this.ultimas.get(id);
    if (!u) throw new Error('unidade');
    return u;
  }

  /** Monta um pendrive (Linux: o udisksctl deixa a sessão aberta montar sem senha). */
  async montar(id) {
    const u = await this.unidade(id);
    if (u.montada) return u;
    if (this.plataforma !== 'linux') throw new Error('unidade');
    const s = await rodar('udisksctl', ['mount', '-b', u.id, '--no-user-interaction'], { timeout: 30000 });
    await this.listar();
    const m = this.ultimas.get(id);
    if (m && !m.raiz) m.raiz = lerMontagem(s);
    return m || u;
  }

  /** Remove com segurança: grava o que falta, desmonta e (no Linux) desliga o pendrive. */
  async ejetar(id) {
    const u = await this.unidade(id);
    try {
      if (this.plataforma === 'linux') {
        if (u.montada) await rodar('udisksctl', ['unmount', '-b', u.id, '--no-user-interaction'], { timeout: 60000 });
        if (u.disco) await rodar('udisksctl', ['power-off', '-b', u.disco, '--no-user-interaction'], { timeout: 30000 }).catch(() => { });
      } else if (this.plataforma === 'win32') {
        if (!/^[A-Z]:$/i.test(u.id)) throw new Error('unidade');
        await rodar('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
          `(New-Object -ComObject Shell.Application).Namespace(17).ParseName('${u.id}').InvokeVerb('Eject'); Start-Sleep -Seconds 2`], { timeout: 30000 });
      } else if (this.plataforma === 'darwin') {
        await rodar('diskutil', ['eject', u.raiz], { timeout: 60000 });
      }
    } catch (e) {
      // "Ocupado": um arquivo dela ainda está aberto em algum programa.
      const ocupado = /busy|in use|ocupad/i.test(String(e.saida || e.message));
      return { ok: false, ocupado, erro: String(e.saida || e.message).split('\n')[0].slice(0, 300) };
    }
    await this.listar();
    return { ok: true };
  }

  /** O conteúdo de uma pasta da unidade. */
  async listarPasta(id, rel = '') {
    const u = await this.montar(id);
    const pasta = dentro(u.raiz, rel);
    const r = [];
    for (const d of await fsp.readdir(pasta, { withFileTypes: true })) {
      if (escondida(d.name)) continue;
      try {
        const st = await fsp.stat(path.join(pasta, d.name));
        r.push({ nome: d.name, rel: rel ? `${rel}/${d.name}` : d.name, pasta: st.isDirectory(), tamanho: st.isDirectory() ? 0 : st.size, modificado: st.mtimeMs });
      } catch { }
    }
    return r;
  }

  /** Traz da unidade para o disco C: (cópia; nada sai da unidade). */
  async trazer(id, rels, destinoC) {
    const u = await this.montar(id);
    return this.disco().importar(rels.map((r) => dentro(u.raiz, r)), destinoC);
  }

  /** Leva do disco C: para uma pasta da unidade (com um nome livre se já existir). */
  async levar(id, relsC, destino = '') {
    const u = await this.montar(id);
    return this.disco().exportar(relsC, dentro(u.raiz, destino));
  }

  /** No modo sistema, o pendrive que chega é montado sozinho (como numa área de trabalho comum). */
  async montarNovas() {
    if (!this.sistema || this.plataforma !== 'linux') return [];
    const montadas = [];
    for (const u of await this.listar()) {
      if (u.montada) continue;
      try { montadas.push(await this.montar(u.id)); } catch { }
    }
    return montadas;
  }
}

/*
 * As pastas do computador principal (fora do modo sistema): a área de trabalho, os documentos, os
 * downloads, as imagens, as músicas e os vídeos da pessoa no Windows, no Mac ou no Linux. Na tela,
 * ficam em Meu computador › Computador principal e funcionam como um pendrive: ver, trazer para o
 * disco C: (uma cópia) e levar do C: (com um nome livre). Nada é apagado nem gravado por cima lá.
 * A pasta do próprio disco C: não aparece nelas (trazer de dentro dela seria mover no disco).
 */
const PASTAS_FORA = [
  ['mesa', 'desktop', 'pasta-mesa'],
  ['documentos', 'documents', 'documentos'],
  ['downloads', 'downloads', 'pasta-recebidos'],
  ['imagens', 'pictures', 'pasta-imagens'],
  ['musicas', 'music', 'pasta-musicas'],
  ['videos', 'videos', 'pasta-videos'],
];

/** O caminho é a raiz do disco C: ou está dentro dela? */
function noDisco(raizDisco, p) {
  if (!raizDisco) return false;
  const rel = path.relative(path.resolve(raizDisco), path.resolve(p));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

class PastasDoComputador extends Unidades {
  /** @param {{ caminho: (nome: string) => string, disco: Function, existe?: Function }} o */
  constructor({ caminho, disco, existe } = {}) {
    super({ disco });
    this.caminho = caminho;
    this.existe = existe || ((p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } });
  }

  async listar() {
    const r = [];
    const vistas = new Set();
    for (const [id, nome, icone] of PASTAS_FORA) {
      let raiz = null;
      try { raiz = this.caminho(nome); } catch { }
      // Sem a pasta (ou com o mesmo caminho de outra, como o Linux sem as pastas do usuário), fica de fora.
      if (!raiz || vistas.has(path.resolve(raiz)) || !this.existe(raiz)) continue;
      const d = this.disco();
      if (d && noDisco(d.raiz, raiz)) continue;
      vistas.add(path.resolve(raiz));
      r.push({ id: 'pc:' + id, tipo: 'pc', pasta: id, icone, raiz, montada: true });
    }
    this.ultimas = new Map(r.map((u) => [u.id, u]));
    return r;
  }

  async montar(id) { return this.unidade(id); }
  async ejetar() { return { ok: false, erro: 'pasta' }; }
  async montarNovas() { return []; }

  async listarPasta(id, rel = '') {
    const u = await this.unidade(id);
    const d = this.disco();
    // A pasta do disco C: (quando fica nos documentos) não aparece: ela já está à vista como o C:.
    return (await super.listarPasta(id, rel)).filter((f) => !(d && noDisco(d.raiz, dentro(u.raiz, f.rel))));
  }

  async trazer(id, rels, destinoC) {
    const u = await this.unidade(id);
    const d = this.disco();
    if (rels.some((r) => noDisco(d && d.raiz, dentro(u.raiz, r)))) throw new Error('disco');
    return d.importar(rels.map((r) => dentro(u.raiz, r)), destinoC);
  }

  async levar(id, relsC, destino = '') {
    const u = await this.unidade(id);
    const d = this.disco();
    if (noDisco(d && d.raiz, dentro(u.raiz, destino))) throw new Error('disco');
    return d.exportar(relsC, dentro(u.raiz, destino));
  }
}

/**
 * Os arquivos que o computador principal manda pela linha de comando (o "Enviar para" do Windows,
 * soltar no ícone do programa): só os caminhos completos que existem, sem as opções (--…) e sem o
 * próprio programa (nem o que fica dentro dele, como a pasta do aplicativo que o Electron recebe
 * nos testes). Eles são só copiados para Meus documentos › Recebidos; nada abre sozinho.
 */
function caminhosDaLinha(argv, { proprios = [], existe = fs.existsSync } = {}) {
  const meus = proprios.filter(Boolean).map((p) => path.resolve(p));
  return (argv || []).slice(1).filter((a) => typeof a === 'string' && a && !a.startsWith('-') && path.isAbsolute(a)
    && !meus.some((m) => noDisco(m, a)) && existe(a));
}

/** Para os testes e as capturas (RETRO_UNIDADES_FALSAS=pasta): um "pendrive" que é uma pasta comum. */
class UnidadesFalsas extends Unidades {
  constructor(o, pasta) {
    super(o);
    this.pasta = pasta;
    this.ligada = true;
  }

  async listar() {
    const lista = this.ligada ? [{ id: 'falsa', rotulo: 'PENDRIVE', raiz: this.pasta, montada: true, tamanho: 8e9, total: 8e9, livre: 6.5e9 }] : [];
    this.ultimas = new Map(lista.map((u) => [u.id, u]));
    return lista;
  }

  async ejetar() {
    this.ligada = false;
    return { ok: true };
  }
}

module.exports = { Unidades, UnidadesFalsas, PastasDoComputador, PASTAS_FORA, noDisco, caminhosDaLinha, lerLsblk, lerMontagem, dentro, escondida, comandoFormatar, limparRotulo };
