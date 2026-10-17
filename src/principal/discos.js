'use strict';
/*
 * Os discos externos inteiros (pendrives, cartões de memória, HDs pela USB), para o programa Discos e
 * para a caixa de formatar: listar com as partições, formatar (uma partição ou o disco inteiro, que
 * volta a ter uma partição só) e gravar uma imagem (.iso ou .img) que liga outro computador, com a
 * cópia conferida no fim.
 *
 *   Linux:   o lsblk; o mkfs, o sfdisk e o dd pela senha de administrador (o sudo, comoAdmin);
 *   Windows: o Get-Disk; formatar e gravar pelos roteiros de ps/, rodados como administrador (a
 *            confirmação do próprio Windows, o UAC);
 *   macOS:   o diskutil (formatar sem senha, quando o Mac deixa); gravar pelo dd, com a senha do Mac.
 *
 * Só os discos de USB e os cartões, nunca o do sistema nem um interno; e nunca o que guarda o disco
 * C:, os dados ou o próprio programa (o modo portátil): a lista os marca "emUso", e formatar e gravar
 * recusam. Tudo o que havia no disco é apagado: a tela pede a confirmação antes.
 */
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { comandoFormatar, limparRotulo } = require('./unidades');
const { tr } = require('./idioma');

const MIB = 1048576;
// As imagens que ligam um computador: a cópia exata de um disco (a .iso de uma instalação, a .img
// de um Raspberry Pi). As compactadas (.img.xz, .zip) precisam ser extraídas antes.
const IMAGENS = ['.iso', '.img', '.raw'];
// Os sistemas de arquivos que cada sistema formata.
const SISTEMAS = { linux: ['exfat', 'fat32'], darwin: ['exfat', 'fat32'], win32: ['exfat', 'fat32', 'ntfs'] };
// Os lugares do Linux que só um disco do sistema tem montados.
const SISTEMA_LINUX = new Set(['/', '/boot', '/boot/efi', '/efi', '/home', '/usr', '/var', '[SWAP]']);
const COLUNAS_LSBLK = 'NAME,PATH,TYPE,SIZE,MODEL,VENDOR,TRAN,RM,HOTPLUG,LABEL,FSTYPE,MOUNTPOINT';

function rodar(cmd, args, { timeout = 15000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, windowsHide: true, maxBuffer: 8 << 20, env: { ...process.env, LC_ALL: 'C' } }, (erro, saida, serr) => {
      if (erro) { erro.saida = String(serr || saida || '').trim(); return reject(erro); }
      resolve(String(saida));
    });
  });
}

const primeiraLinha = (e) => String((e && (e.saida || e.message)) || e || '').split('\n').map((x) => x.trim()).filter(Boolean)[0] || '?';
const aspas = (s) => "'" + String(s).replace(/'/g, "'\\''") + "'";
const codificar = (s) => Buffer.from(String(s), 'utf16le').toString('base64');

/* ---------- Leitura (funções puras, testadas em testes/discos.test.js) ---------- */

/** Um .plist em XML (o que o diskutil -plist escreve) → objetos, listas, textos, números e booleanos. */
function lerPlist(xml) {
  const tokens = [];
  const re = /<\?[^>]*\?>|<!--[\s\S]*?-->|<![^>]*>|<(\/?)([A-Za-z]+)[^>]*?(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(String(xml)))) {
    if (m[2]) tokens.push({ fecha: !!m[1], tag: m[2], vazio: !!m[3] });
    else if (m[4] != null) tokens.push({ texto: m[4] });
  }
  const ENT = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
  const decodificar = (t) => t.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (x, e) => {
    if (e[0] !== '#') return ENT[e.toLowerCase()] ?? x;
    return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  });
  let i = 0;
  const pularEspacos = () => { while (i < tokens.length && tokens[i].texto != null) i++; };
  const texto = (tag) => {
    let t = '';
    while (i < tokens.length && !(tokens[i].fecha && tokens[i].tag === tag)) { if (tokens[i].texto != null) t += tokens[i].texto; i++; }
    i++;
    return decodificar(t);
  };
  const valor = () => {
    pularEspacos();
    const t = tokens[i++];
    if (!t || t.fecha) return undefined;
    switch (t.tag) {
      case 'plist': { const v = valor(); pularEspacos(); i++; return v; }
      case 'dict': {
        const o = {};
        if (t.vazio) return o;
        for (;;) {
          pularEspacos();
          const k = tokens[i++];
          if (!k || k.fecha) return o;
          if (k.tag === 'key') o[texto('key')] = valor();
        }
      }
      case 'array': {
        const a = [];
        if (t.vazio) return a;
        for (;;) {
          pularEspacos();
          if (!tokens[i] || tokens[i].fecha) { i++; return a; }
          a.push(valor());
        }
      }
      case 'true': if (!t.vazio) texto('true'); return true;
      case 'false': if (!t.vazio) texto('false'); return false;
      case 'integer': case 'real': return t.vazio ? 0 : Number(texto(t.tag).trim());
      default: return t.vazio ? '' : texto(t.tag);
    }
  };
  return valor();
}

/** O nome que a tela mostra para o sistema de arquivos ("vfat" → "FAT32"). */
function nomeSistema(s, tamanho = 0) {
  const t = String(s || '').toLowerCase();
  if (t === 'vfat' || t === 'msdos' || t === 'fat32') return tamanho && tamanho < 512 * MIB && t !== 'fat32' ? 'FAT' : 'FAT32';
  return { exfat: 'exFAT', ntfs: 'NTFS', fat: 'FAT', fat16: 'FAT', iso9660: 'ISO 9660', udf: 'UDF', ext4: 'ext4', ext3: 'ext3', ext2: 'ext2', btrfs: 'Btrfs', xfs: 'XFS', hfs: 'HFS+', hfsplus: 'HFS+', apfs: 'APFS', swap: 'swap', crypto_luks: 'LUKS' }[t] || String(s || '');
}

/** lsblk -J -b -o NAME,PATH,TYPE,SIZE,… → os discos externos, sem os do sistema. */
function discosLinux(json) {
  const v = (x) => x === true || x === '1' || x === 1;
  const r = [];
  for (const d of JSON.parse(json).blockdevices || []) {
    const nome = String(d.name || '');
    if (d.type !== 'disk' || !Number(d.size) || /^(loop|zram|ram|nbd|md|dm-)/.test(nome)) continue;
    // Só os de USB e os removíveis (os cartões; o eMMC soldado na placa não é): um disco interno
    // que aceita ser trocado com o computador ligado ("hotplug") não entra.
    if (!(v(d.rm) || d.tran === 'usb')) continue;
    const cartao = /^mmcblk\d+$/.test(nome);
    const pontos = [];
    const andar = (x) => { if (x.mountpoint) pontos.push(x.mountpoint); for (const f of x.children || []) andar(f); };
    andar(d);
    if (pontos.some((p) => SISTEMA_LINUX.has(p))) continue;
    const vol = (x) => ({ id: x.path || '/dev/' + x.name, rotulo: x.label || '', sistema: nomeSistema(x.fstype, Number(x.size)), raiz: x.mountpoint || null, tamanho: Number(x.size) || 0 });
    const partes = (d.children || []).filter((x) => x.type === 'part');
    r.push({
      id: d.path || '/dev/' + nome,
      nome: [d.vendor, d.model].map((s) => String(s || '').trim()).filter(Boolean).join(' '),
      tamanho: Number(d.size) || 0,
      barramento: cartao ? 'sd' : String(d.tran || 'usb'),
      volumes: partes.length ? partes.map(vol) : d.fstype ? [vol(d)] : [],
      pontos,
    });
  }
  return r;
}

/** A lista do Windows (o Get-Disk, só os de USB e os cartões), como o roteiro abaixo a escreve. */
const LISTAR_WINDOWS = `[Console]::OutputEncoding = [Text.Encoding]::UTF8
$ErrorActionPreference = 'Stop'
$r = @(Get-Disk | Where-Object { ([string]$_.BusType -in @('USB', 'SD')) -and -not $_.IsBoot -and -not $_.IsSystem } | ForEach-Object {
  $d = $_
  $vols = @(Get-Partition -DiskNumber $d.Number -ErrorAction SilentlyContinue | ForEach-Object {
    $v = $null
    try { $v = $_ | Get-Volume -ErrorAction Stop } catch { }
    $l = [string]$_.DriveLetter
    if ($l -notmatch '^[A-Za-z]$') { $l = '' }
    [pscustomobject]@{ letra = $l; tamanho = [int64]$_.Size; rotulo = [string]$v.FileSystemLabel; sistema = [string]$v.FileSystem; livre = [int64]$v.SizeRemaining }
  })
  [pscustomobject]@{ numero = [int]$d.Number; nome = [string]$d.FriendlyName; tamanho = [int64]$d.Size; barramento = [string]$d.BusType; volumes = $vols }
})
ConvertTo-Json -InputObject $r -Depth 4 -Compress`;

function discosWindows(texto) {
  const d = JSON.parse(String(texto).replace(/^﻿/, '').trim() || '[]');
  const lista = (x) => (Array.isArray(x) ? x : x ? [x] : []);
  return lista(d).filter((x) => x && Number.isInteger(x.numero) && x.numero >= 0).map((x) => {
    const volumes = lista(x.volumes).map((v) => {
      const letra = /^[A-Za-z]$/.test(v.letra || '') ? v.letra.toUpperCase() : '';
      return { id: letra ? letra + ':' : null, letra, rotulo: String(v.rotulo || ''), sistema: nomeSistema(v.sistema, Number(v.tamanho)), raiz: letra ? letra + ':\\' : null, tamanho: Number(v.tamanho) || 0 };
    });
    return { id: 'PhysicalDrive' + x.numero, numero: x.numero, nome: String(x.nome || '').trim(), tamanho: Number(x.tamanho) || 0, barramento: String(x.barramento || '').toLowerCase(), volumes, pontos: volumes.map((v) => v.raiz).filter(Boolean) };
  });
}

/**
 * diskutil list -plist physical (+ diskutil info -plist de cada disco e dos volumes montados) → os
 * discos externos ou de cartão. "fisicos" são os discos que guardam o que não pode ser apagado.
 */
function discosMac(lista, infos = {}, fisicos = new Set()) {
  const r = [];
  for (const d of (lista && lista.AllDisksAndPartitions) || []) {
    const id = String(d.DeviceIdentifier || '');
    const info = infos[id];
    if (!/^disk\d+$/.test(id) || !info) continue;
    if (info.VirtualOrPhysical === 'Virtual' || /disk image/i.test(info.BusProtocol || '')) continue;
    if (info.Internal !== false && !info.RemovableMedia && !info.Removable) continue;
    const partes = d.Partitions && d.Partitions.length ? d.Partitions : d.MountPoint || d.VolumeName ? [d] : [];
    const volumes = partes.filter((p) => p.Content !== 'EFI' && p.VolumeName !== 'EFI').map((p) => {
      const i = infos[p.DeviceIdentifier] || {};
      const sistema = i.FilesystemType ? nomeSistema(i.FilesystemType, Number(p.Size)) : { DOS_FAT_32: 'FAT32', Apple_HFS: 'HFS+', Apple_APFS: 'APFS' }[p.Content] || '';
      return { id: p.MountPoint || null, dispositivo: String(p.DeviceIdentifier || ''), rotulo: String(p.VolumeName || ''), sistema, raiz: p.MountPoint || null, tamanho: Number(p.Size) || 0 };
    });
    const bus = String(info.BusProtocol || '');
    r.push({
      id: '/dev/' + id,
      nome: String(info.MediaName || info.IORegistryEntryName || '').trim(),
      tamanho: Number(d.Size || info.TotalSize) || 0,
      barramento: /usb/i.test(bus) ? 'usb' : /secure digital|^sd/i.test(bus) ? 'sd' : bus.toLowerCase(),
      volumes,
      pontos: volumes.map((v) => v.raiz).filter(Boolean),
      emUso: fisicos.has(id),
    });
  }
  return r;
}

/** O caminho está dentro do lugar onde o volume está montado (no Windows, sem diferença de maiúsculas)? */
function dentroDe(raiz, p, plataforma = process.platform) {
  if (!raiz || !p) return false;
  const win = plataforma === 'win32';
  const sep = win ? '\\' : '/';
  let a = String(raiz);
  let b = String(p);
  if (win) { a = a.replace(/\//g, '\\').toLowerCase(); b = b.replace(/\//g, '\\').toLowerCase(); }
  if (a === sep) return true;
  if (a.endsWith(sep)) a = a.slice(0, -1);
  return b === a || b.startsWith(a + sep);
}

/** A primeira partição de um disco do Linux: /dev/sdb → /dev/sdb1; /dev/mmcblk0 → /dev/mmcblk0p1. */
function particaoDe(disco) {
  return /\d$/.test(disco) ? disco + 'p1' : disco + '1';
}

/** O comando do PowerShell que roda um roteiro (com os argumentos) e é o que o administrador roda. */
function comandoInterno(roteiro, args) {
  const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
  const partes = ['&', q(roteiro)];
  for (const [k, v] of Object.entries(args)) {
    if (!/^[A-Za-z]+$/.test(k)) throw new Error('argumento');
    if (v === true) partes.push('-' + k);
    else if (v !== false && v != null) partes.push('-' + k, q(v));
  }
  return partes.join(' ');
}

/**
 * O comando que pede a confirmação do Windows (o UAC) e espera o roteiro terminar. Cancelada a
 * confirmação, sai com 1223 (o código do Windows para "a operação foi cancelada pelo usuário").
 */
function comandoAdminWindows(roteiro, args) {
  const interno = codificar(comandoInterno(roteiro, args));
  return `try { $p = Start-Process -FilePath 'powershell.exe' -Verb RunAs -WindowStyle Hidden -Wait -PassThru -ArgumentList '-NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${interno}'; exit $p.ExitCode } catch { $e = $_.Exception; while ($e) { if ($e -is [System.ComponentModel.Win32Exception]) { exit $e.NativeErrorCode }; $e = $e.InnerException }; exit 1 }`;
}

/** O andamento da gravação no Linux e no Mac: a fase e o que o dd escreveu ("123 bytes … copied"). */
function andamentoUnix(fase, erros, total) {
  const f = String(fase || '').trim() || 'preparar';
  const todos = String(erros || '').match(/(\d+) bytes/g);
  const feitos = todos ? Number(todos[todos.length - 1].split(' ')[0]) : 0;
  let feito = 0;
  if (f === 'gravar' || f === 'conferir') feito = Math.min(total, MIB + feitos);
  else if (f === 'inicio') feito = total;
  return { fase: f, feito, total };
}

/** O andamento da gravação no Windows ("gravar 123456"). */
function andamentoWindows(texto, total) {
  const [fase, n] = String(texto || '').trim().split(/\s+/);
  return { fase: fase || 'preparar', feito: Math.min(total, Number(n) || 0), total };
}

/** O fim do roteiro do Linux e do Mac ("ok", "parado", "erro conferir", "erro gravar <o que o dd disse>"). */
function resultadoUnix(texto) {
  const t = String(texto || '').trim();
  if (t === 'ok') return { ok: true };
  if (t === 'parado') return { ok: false, parado: true };
  const [, tipo = '', resto = ''] = /^erro\s+(\S+)\s*(.*)$/.exec(t) || [];
  if (tipo === 'conferir') return { ok: false, diferente: true };
  if (tipo === 'montado') return { ok: false, ocupado: true };
  if (tipo === 'disco') return { ok: false, naoExterno: true };
  return { ok: false, erro: resto || tipo || t || '?' };
}

/** O resultado do roteiro do Windows. */
function resultadoWindows(r) {
  if (!r) return null;
  if (r.ok) return r.letra ? { ok: true, letra: String(r.letra) } : { ok: true };
  if (r.estado === 'parado') return { ok: false, parado: true };
  if (r.estado === 'diferente') return { ok: false, diferente: true };
  if (r.erro === 'disco') return { ok: false, naoExterno: true };
  if (r.fat32Grande) return { ok: false, fat32Grande: true };
  if (r.pequeno) return { ok: false, pequeno: true };
  return { ok: false, erro: String(r.erro || '?').split('\n')[0].slice(0, 300) };
}

async function lerJson(arquivo) {
  try { return JSON.parse((await fsp.readFile(arquivo, 'utf8')).replace(/^﻿/, '')); } catch { return null; }
}

async function lerTexto(arquivo) {
  try { return await fsp.readFile(arquivo, 'utf8'); } catch { return ''; }
}

/* ---------- Os discos ---------- */

class Discos {
  /**
   * @param {{ plataforma?: string, comoAdmin?: Function, protegidos?: () => string[], roteiros?: string }} o
   *   protegidos: os caminhos que não podem estar no disco a apagar (o disco C:, os dados, o programa).
   */
  constructor({ plataforma = process.platform, comoAdmin = null, protegidos = () => [], roteiros = path.join(__dirname, 'ps') } = {}) {
    this.plataforma = plataforma;
    this.comoAdmin = comoAdmin;
    this.protegidos = protegidos;
    this.roteiros = roteiros;
    this.ultimos = new Map();
    this.erro = null;
    this.gravacao = null;
  }

  /** Durante a gravação, o modo sistema não monta sozinho as partições que aparecem no pendrive. */
  get ocupado() { return !!this.gravacao; }

  async listar() {
    let lista = [];
    this.erro = null;
    try {
      if (this.plataforma === 'linux') lista = discosLinux(await rodar('lsblk', ['-J', '-b', '-o', COLUNAS_LSBLK]));
      else if (this.plataforma === 'win32') lista = discosWindows(await rodar('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', codificar(LISTAR_WINDOWS)], { timeout: 30000 }));
      else if (this.plataforma === 'darwin') lista = await this.listarMac();
    } catch (e) {
      this.erro = primeiraLinha(e);
    }
    const prot = (this.protegidos() || []).filter(Boolean);
    for (const d of lista) d.emUso = !!d.emUso || d.pontos.some((p) => prot.some((q) => dentroDe(p, q, this.plataforma)));
    this.ultimos = new Map(lista.map((d) => [d.id, d]));
    return lista;
  }

  async listarMac() {
    const info = async (id) => { try { return lerPlist(await rodar('diskutil', ['info', '-plist', id])); } catch { return null; } };
    const lista = lerPlist(await rodar('diskutil', ['list', '-plist', 'physical']));
    const infos = {};
    for (const d of (lista && lista.AllDisksAndPartitions) || []) {
      infos[d.DeviceIdentifier] = await info(d.DeviceIdentifier);
      for (const p of d.Partitions || []) if (p.MountPoint) infos[p.DeviceIdentifier] = await info(p.DeviceIdentifier);
    }
    // Os discos de verdade que guardam o sistema e o que não pode ser apagado (no APFS, os "physical
    // stores" do volume): pelo dispositivo de cada caminho (o df).
    const fisicos = new Set();
    for (const p of ['/', ...(this.protegidos() || [])].filter(Boolean)) {
      try {
        const dev = /^\/dev\/(disk\d+(s\d+)*)/m.exec((await rodar('df', ['-P', p])).split('\n')[1] || '');
        if (!dev) continue;
        const i = await info(dev[1]);
        if (i && i.ParentWholeDisk) fisicos.add(i.ParentWholeDisk);
        for (const s of (i && i.APFSPhysicalStores) || []) fisicos.add(String(s.APFSPhysicalStore || '').replace(/s\d+$/, ''));
      } catch { }
    }
    return discosMac(lista, infos, fisicos);
  }

  /** O disco (e o volume) de um alvo: { disco: id } ou { volume: id }, pela lista de agora. */
  async achar(alvo = {}) {
    const lista = await this.listar();
    if (alvo.disco) return { disco: lista.find((d) => d.id === alvo.disco) || null, volume: null };
    for (const d of lista) {
      const v = d.volumes.find((x) => x.id && x.id === alvo.volume);
      if (v) return { disco: d, volume: v };
    }
    return { disco: null, volume: null };
  }

  /**
   * Formata. alvo: { volume: id } (a partição: no Linux, o /dev/sdb1; no Windows, a letra "E:"; no
   * Mac, o /Volumes/…) ou { disco: id } (o disco inteiro). Com "inteiro", o volume vale pelo disco
   * dele inteiro, com uma partição só.
   */
  async formatar(alvo, { sistema = 'exfat', rotulo = '', inteiro = false } = {}, senha = '') {
    if (!(SISTEMAS[this.plataforma] || []).includes(sistema)) return { ok: false, erro: 'sistema' };
    if (this.gravacao) return { ok: false, gravando: true };
    const { disco, volume } = await this.achar(alvo);
    if (!disco) return { ok: false, naoExterno: true };
    if (disco.emUso) return { ok: false, emUso: true };
    const todo = !!inteiro || !volume;
    const nome = limparRotulo(rotulo, sistema);
    try {
      if (this.plataforma === 'linux') return await this.formatarLinux(disco, volume, todo, sistema, nome, senha);
      if (this.plataforma === 'win32') return await this.formatarWindows(disco, volume, todo, sistema, nome);
      if (this.plataforma === 'darwin') return await this.formatarMac(disco, volume, todo, sistema, nome);
    } catch (e) {
      return { ok: false, erro: primeiraLinha(e).slice(0, 300) };
    }
    return { ok: false, erro: 'sistema' };
  }

  async formatarLinux(disco, volume, todo, sistema, nome, senha) {
    if (!/^\/dev\/(sd[a-z]{1,2}|mmcblk\d+)$/.test(disco.id)) return { ok: false, naoExterno: true };
    const parte = todo ? particaoDe(disco.id) : volume.id;
    const cmd = comandoFormatar(parte, sistema, nome);
    if (!cmd) return { ok: false, naoExterno: true };
    // O udisksctl desmonta sem senha; o que um programa ainda usa recusa ("ocupado").
    for (const v of todo ? disco.volumes : [volume]) {
      if (!v.raiz) continue;
      try { await rodar('udisksctl', ['unmount', '-b', v.id, '--no-user-interaction'], { timeout: 60000 }); } catch (e) {
        if (/busy|in use/i.test(e.saida || e.message)) return { ok: false, ocupado: true, erro: primeiraLinha(e) };
      }
    }
    // Como administrador: desmonta o que sobrou e, no disco inteiro, faz a tabela nova com uma
    // partição só (o tipo "c" é o FAT32, o "7", o exFAT) antes de formatar.
    const roteiro = todo
      ? 'd=$1 t=$2 p=$3; shift 3; for m in $(grep "^$d" /proc/mounts | cut -d " " -f 1); do umount "$m" || exit 3; done; '
        + 'wipefs -a -q "$d"; printf "label: dos\\n,,%s\\n" "$t" | sfdisk -q --wipe always --wipe-partitions always "$d" || exit 4; '
        + 'udevadm settle 2> /dev/null; i=0; while [ ! -b "$p" ] && [ $i -lt 10 ]; do sleep 1; i=$((i + 1)); done; exec "$@"'
      : 'p=$1; shift; grep -q "^$p " /proc/mounts && { umount "$p" || exit 3; }; exec "$@"';
    const args = todo ? [disco.id, sistema === 'fat32' ? 'c' : '7', parte] : [parte];
    const r = await this.comoAdmin(senha, 'sh', ['-c', roteiro, 'sh', ...args, cmd[0], ...cmd[1]], { timeout: 15 * 60 * 1000 });
    // Formatado ou não, o pendrive volta a ficar à vista.
    await rodar('udisksctl', ['mount', '-b', parte, '--no-user-interaction'], { timeout: 30000 }).catch(() => { });
    if (!r.ok && /busy/i.test(r.erro || '')) return { ok: false, ocupado: true, erro: r.erro };
    return r;
  }

  async formatarWindows(disco, volume, todo, sistema, nome) {
    const args = { Sistema: { exfat: 'exFAT', fat32: 'FAT32', ntfs: 'NTFS' }[sistema], Rotulo: nome };
    // A letra de antes fica com o pendrive (com o disco inteiro, a do primeiro volume).
    const comLetra = volume && volume.letra ? volume : todo ? disco.volumes.find((v) => v.letra) : null;
    if (comLetra) { args.Letra = comLetra.letra; if (todo) args.Inteiro = true; } else args.Disco = disco.numero;
    return this.adminWindows('formatar.ps1', args, { timeout: 15 * 60 * 1000 });
  }

  async formatarMac(disco, volume, todo, sistema, nome) {
    const fsMac = { exfat: 'ExFAT', fat32: 'FAT32' }[sistema];
    if (!/^\/dev\/disk\d+$/.test(disco.id)) return { ok: false, naoExterno: true };
    if (!todo && !/^disk\d+s\d+$/.test(volume.dispositivo || '')) return { ok: false, naoExterno: true };
    const args = todo ? ['eraseDisk', fsMac, nome, 'MBRFormat', disco.id] : ['eraseVolume', fsMac, nome, volume.dispositivo];
    try {
      await rodar('diskutil', args, { timeout: 15 * 60 * 1000 });
      return { ok: true };
    } catch (e) {
      const t = String(e.saida || e.message);
      if (/busy|in use|unmount/i.test(t)) return { ok: false, ocupado: true, erro: primeiraLinha(e) };
      if (!/permission|privilege|not permitted|denied|-69877/i.test(t)) return { ok: false, erro: primeiraLinha(e) };
    }
    // O Mac não deixou sem a senha: de novo, com a senha do Mac.
    return this.adminMac(['/usr/sbin/diskutil', ...args].map(aspas).join(' '), tr('O Retro Computer precisa da senha do Mac para formatar o pendrive.'));
  }

  /**
   * Grava a imagem (o caminho de verdade, já conferido pelo disco C:) no disco inteiro e confere a
   * cópia. aoAndar({ fase, feito, total }) a cada meio segundo.
   */
  async gravar(id, imagem, senha = '', aoAndar = () => { }) {
    if (this.gravacao) return { ok: false, gravando: true };
    if (!IMAGENS.includes(path.extname(imagem).toLowerCase())) return { ok: false, tipo: true };
    let total = 0;
    try {
      const st = await fsp.stat(imagem);
      if (!st.isFile()) throw new Error('imagem');
      total = st.size;
    } catch {
      return { ok: false, erro: 'imagem' };
    }
    if (!total) return { ok: false, erro: 'imagem' };
    const { disco } = await this.achar({ disco: id });
    if (!disco) return { ok: false, naoExterno: true };
    if (disco.emUso) return { ok: false, emUso: true };
    if (disco.tamanho && total > disco.tamanho) return { ok: false, pequeno: true };
    const pasta = await fsp.mkdtemp(path.join(os.tmpdir(), 'retro-'));
    this.gravacao = { pasta, parando: 0 };
    try {
      if (this.plataforma === 'win32') return await this.gravarWindows(disco, imagem, total, pasta, aoAndar);
      if (this.plataforma === 'linux' || this.plataforma === 'darwin') return await this.gravarUnix(disco, imagem, total, pasta, senha, aoAndar);
      return { ok: false, erro: 'sistema' };
    } catch (e) {
      return { ok: false, erro: primeiraLinha(e).slice(0, 300) };
    } finally {
      this.gravacao = null;
      await fsp.rm(pasta, { recursive: true, force: true }).catch(() => { });
    }
  }

  /** Para a gravação: o roteiro vê o arquivo "parar" e interrompe (o pendrive fica sem nada legível). */
  async parar() {
    const g = this.gravacao;
    if (!g) return false;
    g.parando = Date.now();
    await fsp.writeFile(path.join(g.pasta, 'parar'), '').catch(() => { });
    return true;
  }

  /** Lê o andamento a cada meio segundo; "fim" resolve com o texto do fim do roteiro (Linux e Mac). */
  vigiar(pasta, ler, aoAndar) {
    let acabou = false;
    let resolver;
    const fim = new Promise((r) => { resolver = r; });
    const passo = async () => {
      if (acabou) return;
      try { aoAndar(await ler()); } catch { }
      const t = await lerTexto(path.join(pasta, 'fim'));
      // Pediram para parar e o roteiro não respondeu em 15 segundos: ele já não está rodando.
      const g = this.gravacao;
      if (t || (g && g.parando && Date.now() - g.parando > 15000)) { acabou = true; resolver(t || 'parado'); return; }
      setTimeout(passo, 500);
    };
    passo();
    return { fim, parar: () => { acabou = true; resolver(''); } };
  }

  async gravarUnix(disco, imagem, total, pasta, senha, aoAndar) {
    const linux = this.plataforma === 'linux';
    if (linux ? !/^\/dev\/(sd[a-z]{1,2}|mmcblk\d+)$/.test(disco.id) : !/^\/dev\/disk\d+$/.test(disco.id)) return { ok: false, naoExterno: true };
    const roteiro = path.join(pasta, 'gravar.sh');
    await fsp.writeFile(roteiro, await fsp.readFile(path.join(this.roteiros, 'gravar.sh')), { mode: 0o600 });
    // Desmonta antes, sem senha (o administrador desmonta o que sobrar).
    if (linux) {
      for (const v of disco.volumes) if (v.raiz) await rodar('udisksctl', ['unmount', '-b', v.id, '--no-user-interaction'], { timeout: 60000 }).catch(() => { });
    } else {
      await rodar('diskutil', ['unmountDisk', disco.id], { timeout: 60000 }).catch(() => { });
    }
    const ler = async () => andamentoUnix(await lerTexto(path.join(pasta, 'fase')), await lerTexto(path.join(pasta, 'erros')), total);
    const v = this.vigiar(pasta, ler, aoAndar);
    try {
      if (linux) {
        const r = await this.comoAdmin(senha, 'sh', [roteiro, imagem, disco.id, String(total), pasta, 'linux'], { timeout: 6 * 3600 * 1000 });
        // Sem o fim, o roteiro nem começou (a senha errada, por exemplo).
        const t = await lerTexto(path.join(pasta, 'fim'));
        if (!t) return r.ok ? { ok: false, erro: '?' } : r;
      } else {
        // No Mac, o roteiro roda em segundo plano (o osascript devolve na hora) e avisa pelo "fim".
        const r = await this.adminMac(`/bin/sh ${aspas(roteiro)} ${aspas(imagem)} ${aspas(disco.id)} ${total} ${aspas(pasta)} mac > /dev/null 2>&1 &`,
          tr('O Retro Computer precisa da senha do Mac para gravar a imagem no pendrive.'));
        if (!r.ok) return r;
      }
      const t = await v.fim;
      try { aoAndar(await ler()); } catch { }
      return resultadoUnix(t);
    } finally {
      v.parar();
    }
  }

  async gravarWindows(disco, imagem, total, pasta, aoAndar) {
    const ler = async () => andamentoWindows(await lerTexto(path.join(pasta, 'andamento')), total);
    let v = null;
    const r = await this.adminWindows('gravar.ps1', { Disco: disco.numero, Imagem: imagem, Pasta: pasta }, {
      pasta, timeout: 0, aoComecar: () => { v = this.vigiar(pasta, ler, aoAndar); },
    });
    if (v) v.parar();
    try { aoAndar(await ler()); } catch { }
    return r;
  }

  /**
   * Roda um roteiro de ps/ como administrador no Windows (a confirmação do próprio Windows) e lê o
   * resultado. O roteiro é copiado para uma pasta temporária: o de dentro do programa (o .asar) o
   * PowerShell não lê.
   */
  async adminWindows(nome, args, { timeout = 30 * 60 * 1000, pasta = null, aoComecar = null } = {}) {
    const dir = pasta || await fsp.mkdtemp(path.join(os.tmpdir(), 'retro-'));
    try {
      const roteiro = path.join(dir, nome);
      await fsp.writeFile(roteiro, await fsp.readFile(path.join(this.roteiros, nome)));
      const saida = path.join(dir, 'saida.json');
      const cmd = comandoAdminWindows(roteiro, { ...args, Saida: saida });
      if (aoComecar) aoComecar();
      let codigo = 0;
      try {
        await rodar('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', codificar(cmd)], { timeout });
      } catch (e) {
        codigo = typeof e.code === 'number' ? e.code : -1;
      }
      const r = resultadoWindows(await lerJson(saida));
      if (r) return r;
      if (codigo === 1223) return { ok: false, cancelado: true };
      return { ok: false, erro: codigo ? tr('código {n}', { n: codigo }) : '?' };
    } finally {
      if (!pasta) await fsp.rm(dir, { recursive: true, force: true }).catch(() => { });
    }
  }

  /** Um comando do shell com a senha do Mac (a caixa do próprio Mac, com o aviso dado). */
  async adminMac(comando, aviso) {
    try {
      const s = await rodar('osascript', ['-e', 'on run argv', '-e', 'do shell script (item 1 of argv) with prompt (item 2 of argv) with administrator privileges', '-e', 'end run', comando, aviso], { timeout: 15 * 60 * 1000 });
      return { ok: true, saida: s };
    } catch (e) {
      const t = String(e.saida || e.message);
      if (/-128|user cancel/i.test(t)) return { ok: false, cancelado: true };
      return { ok: false, erro: primeiraLinha(e).replace(/^.*execution error:\s*/, '').slice(0, 300) };
    }
  }
}

/**
 * Para os testes e as capturas (com RETRO_UNIDADES_FALSAS=pasta): o pendrive de mentira (o mesmo das
 * Unidades) e um segundo, com uma imagem do Linux gravada. Nada é apagado: formatar só confere a
 * senha de teste ("certa", no Linux), e gravar copia a imagem, devagar, para um arquivo temporário.
 */
class DiscosFalsos extends Discos {
  constructor(o, pasta) {
    super(o);
    this.pasta = pasta;
    this.feitos = [];
  }

  async listar() {
    const lista = [
      { id: 'falso1', nome: 'SanDisk Cruzer Blade', tamanho: 8004304896, barramento: 'usb', volumes: [{ id: 'falsa', rotulo: 'PENDRIVE', sistema: 'exFAT', raiz: this.pasta, tamanho: 8003256320 }], pontos: [this.pasta] },
      { id: 'falso2', nome: 'Kingston DataTraveler 3.0', tamanho: 15552479232, barramento: 'usb', volumes: [{ id: null, rotulo: 'Linux Mint 22.3 Xfce 64-bit', sistema: 'ISO 9660', raiz: null, tamanho: 2996633600 }], pontos: [] },
    ];
    for (const d of lista) d.emUso = false;
    this.ultimos = new Map(lista.map((d) => [d.id, d]));
    return lista;
  }

  senhaOk(senha) { return this.plataforma !== 'linux' || senha === 'certa'; }

  async formatar(alvo, opcoes = {}, senha = '') {
    if (!this.senhaOk(senha)) return { ok: false, senhaErrada: true };
    const { disco } = await this.achar(alvo);
    if (!disco) return { ok: false, naoExterno: true };
    this.feitos.push({ formatar: alvo, opcoes });
    return { ok: true };
  }

  async gravar(id, imagem, senha = '', aoAndar = () => { }) {
    if (!this.senhaOk(senha)) return { ok: false, senhaErrada: true };
    if (this.gravacao) return { ok: false, gravando: true };
    if (!IMAGENS.includes(path.extname(imagem).toLowerCase())) return { ok: false, tipo: true };
    const dados = await fsp.readFile(imagem).catch(() => null);
    if (!dados || !dados.length) return { ok: false, erro: 'imagem' };
    const { disco } = await this.achar({ disco: id });
    if (!disco) return { ok: false, naoExterno: true };
    const pasta = await fsp.mkdtemp(path.join(os.tmpdir(), 'retro-falso-'));
    this.gravacao = { pasta, parando: 0 };
    const total = dados.length;
    const espera = () => new Promise((r) => setTimeout(r, 120));
    try {
      // Um "disco" que é um arquivo: a cópia em 24 pedaços e a conferência em 12, para dar tempo de ver.
      const alvo = path.join(pasta, 'disco.img');
      const passo = Math.ceil(total / 24);
      for (let p = 0; p < total; p += passo) {
        if (this.gravacao.parando) return { ok: false, parado: true };
        await fsp.appendFile(alvo, dados.subarray(p, p + passo));
        aoAndar({ fase: 'gravar', feito: Math.min(total, p + passo), total });
        await espera();
      }
      const copia = await fsp.readFile(alvo);
      for (let k = 1; k <= 12; k++) {
        if (this.gravacao.parando) return { ok: false, parado: true };
        aoAndar({ fase: 'conferir', feito: Math.round((total * k) / 12), total });
        await espera();
      }
      aoAndar({ fase: 'inicio', feito: total, total });
      this.feitos.push({ gravar: id, imagem: path.basename(imagem) });
      return copia.equals(dados) ? { ok: true } : { ok: false, diferente: true };
    } finally {
      this.gravacao = null;
      await fsp.rm(pasta, { recursive: true, force: true }).catch(() => { });
    }
  }
}

module.exports = {
  Discos, DiscosFalsos, IMAGENS, SISTEMAS, MIB,
  lerPlist, nomeSistema, discosLinux, discosWindows, discosMac, dentroDe, particaoDe,
  comandoInterno, comandoAdminWindows, andamentoUnix, andamentoWindows, resultadoUnix, resultadoWindows, LISTAR_WINDOWS,
};
