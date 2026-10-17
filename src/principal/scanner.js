'use strict';
/*
 * Os scanners: no Linux, o "scanimage" do SANE (os de rede pelo eSCL/airscan, os da USB pelos
 * drivers do SANE); no Windows, o WIA pelo PowerShell; no macOS, que não tem um comando para isso,
 * a Captura de Imagem do próprio sistema. A imagem volta em PNG para a tela, que a mostra e a grava
 * no disco C: (como PDF ou imagem).
 *
 * Os scanners só são usados pelo nome que a lista deu (nada vindo da tela vira argumento solto), e
 * no Windows os valores vão pelas variáveis de ambiente, nunca no meio do comando.
 */
const { execFile, spawn } = require('node:child_process');
const fs = require('node:fs');
const fsp = fs.promises;
const os = require('node:os');
const path = require('node:path');
const { tr } = require('./idioma');

const MAX_IMAGEM = 300 * 1024 * 1024;
const TEMPO = 4 * 60 * 1000;
const RESOLUCOES = [150, 200, 300, 600];

function rodar(cmd, args, { timeout = 20000, env = {} } = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, windowsHide: true, maxBuffer: 8 << 20, env: { ...process.env, LC_ALL: 'C', ...env } }, (erro, saida, serr) => {
      if (erro) { erro.saida = String(serr || saida || '').trim(); return reject(erro); }
      resolve(String(saida));
    });
  });
}

const codificar = (s) => Buffer.from(String(s), 'utf16le').toString('base64');

/* ---------- Leitura (funções puras, testadas em testes/scanner.test.js) ---------- */

/** "scanimage -f '%d\t%v\t%m\t%t%n'" → [{ id, nome, tipo }] */
function lerLista(texto) {
  const lista = [];
  for (const linha of String(texto).split('\n')) {
    const [id, fab, modelo, tipo] = linha.split('\t');
    if (!id || !modelo) continue;
    const nome = [fab, modelo].filter((x) => x && x !== 'Unknown').join(' ').replace(/\s+/g, ' ').trim() || id;
    lista.push({ id, nome, tipo: (tipo || '').trim() });
  }
  // O mesmo aparelho pela rede aparece duas vezes (o eSCL e o airscan): fica um.
  const vistos = new Set();
  return lista.filter((s) => { const k = s.nome.toLowerCase(); if (vistos.has(k)) return false; vistos.add(k); return true; });
}

/** As escolhas de um scanner ("scanimage -d … -A"): os modos, as resoluções e as origens. */
function lerOpcoes(texto) {
  const r = { modos: [], resolucoes: [], origens: [] };
  for (const linha of String(texto).split('\n')) {
    const m = /^\s+--(mode|resolution|source)\s+(.+?)\s+\[(.*?)\]\s*$/.exec(linha);
    if (!m) continue;
    const valores = m[2].replace(/dpi\b.*$/, '').split('|').map((v) => v.trim()).filter((v) => v && v !== 'auto');
    if (m[1] === 'mode') r.modos = valores;
    else if (m[1] === 'source') r.origens = valores;
    else {
      const faixa = /^(\d+)\.\.(\d+)/.exec(m[2]);
      r.resolucoes = faixa
        ? RESOLUCOES.filter((x) => x >= Number(faixa[1]) && x <= Number(faixa[2]))
        : valores.map(Number).filter((x) => Number.isFinite(x) && x > 0);
    }
  }
  return r;
}

/** O modo do SANE para a cor escolhida ("cor", "cinza" ou "pb"), entre os que o scanner tem. */
function modoSane(cor, modos) {
  const quer = { cor: /^colou?r$/i, cinza: /^gr[ae]y(scale)?$/i, pb: /^(lineart|binary|black ?& ?white)$/i }[cor] || /^colou?r$/i;
  return modos.find((m) => quer.test(m)) || null;
}

/** A resolução pedida, ou a mais perto que o scanner tem. */
function resolucaoMaisPerto(dpi, lista) {
  if (!lista.length) return Number(dpi) || 200;
  return lista.reduce((a, b) => (Math.abs(b - dpi) < Math.abs(a - dpi) ? b : a));
}

/* ---------- Windows: o WIA ---------- */

// A lista: os aparelhos do tipo 1 (scanner). Sem o WIA (o Windows Server, por exemplo), lista vazia.
const LISTAR_WIA = `
$ErrorActionPreference = 'Stop'
try { $dm = New-Object -ComObject WIA.DeviceManager } catch { '[]'; exit 0 }
$l = @(foreach ($i in $dm.DeviceInfos) { if ($i.Type -eq 1) { [pscustomobject]@{ id = $i.DeviceID; nome = [string]$i.Properties.Item('Name').Value } } })
ConvertTo-Json -InputObject $l -Compress
`;

// A digitalização: o aparelho e as escolhas vêm das variáveis de ambiente (nada entra no texto do comando).
const DIGITALIZAR_WIA = `
$ErrorActionPreference = 'Stop'
$dm = New-Object -ComObject WIA.DeviceManager
$info = $null
foreach ($i in $dm.DeviceInfos) { if ($i.DeviceID -eq $env:RETRO_SCAN_ID) { $info = $i } }
if (-not $info) { Write-Error 'sem-scanner'; exit 2 }
$dev = $info.Connect()
$item = $dev.Items.Item(1)
$dpi = [int]$env:RETRO_SCAN_DPI
$intencao = @{ cor = 1; cinza = 2; pb = 4 }[$env:RETRO_SCAN_COR]
foreach ($p in $item.Properties) {
  try {
    if ($p.PropertyID -eq 6146 -and $intencao) { $p.Value = $intencao }
    if ($p.PropertyID -eq 6147 -or $p.PropertyID -eq 6148) { $p.Value = $dpi }
  } catch { }
}
$png = '{B96B3CAF-0728-11D3-9D7B-0000F81EF32E}'
$img = $item.Transfer($png)
if ($img.FormatID -ne $png) {
  $ip = New-Object -ComObject WIA.ImageProcess
  $ip.Filters.Add($ip.FilterInfos.Item('Convert').FilterID)
  $ip.Filters.Item(1).Properties.Item('FormatID').Value = $png
  $img = $ip.Apply($img)
}
$img.SaveFile($env:RETRO_SCAN_SAIDA)
`;

class Scanners {
  constructor({ plataforma = process.platform, shell } = {}) {
    this.plataforma = plataforma;
    this.shell = shell;
    this.conhecidos = new Map(); // id → scanner (da última lista): só esses são usados
    this.atual = null; // a digitalização em andamento (para Parar)
  }

  /** { disponivel, sistema, motivo, scanners: [{ id, nome, tipo }] } */
  async listar() {
    let lista = [];
    if (this.plataforma === 'linux') {
      try {
        lista = lerLista(await rodar('scanimage', ['-f', '%d\t%v\t%m\t%t%n'], { timeout: 30000 }));
      } catch (e) {
        if (e.code === 'ENOENT') return { disponivel: false, motivo: 'sem-sane', scanners: [] };
        lista = [];
      }
    } else if (this.plataforma === 'win32') {
      try {
        const j = JSON.parse((await rodar('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', codificar(LISTAR_WIA)], { timeout: 30000 })).trim() || '[]');
        lista = (Array.isArray(j) ? j : [j]).filter((s) => s && s.id).map((s) => ({ id: String(s.id), nome: String(s.nome || s.id), tipo: '' }));
      } catch { lista = []; }
    } else {
      return { disponivel: false, motivo: 'mac', scanners: [] };
    }
    this.conhecidos = new Map(lista.map((s) => [s.id, s]));
    return { disponivel: true, scanners: lista };
  }

  scanner(id) {
    const s = this.conhecidos.get(String(id));
    if (!s) throw Object.assign(new Error('sem-scanner'), { codigo: 'sem-scanner' });
    return s;
  }

  /** As escolhas do scanner (no Windows, as de sempre: o WIA ajusta sozinho). */
  async opcoes(id) {
    const s = this.scanner(id);
    if (this.plataforma !== 'linux') return { modos: ['cor', 'cinza', 'pb'], resolucoes: RESOLUCOES.slice(0, 3), origens: [] };
    const o = lerOpcoes(await rodar('scanimage', ['-d', s.id, '-A'], { timeout: 30000 }).catch(() => ''));
    return {
      modos: ['cor', 'cinza', 'pb'].filter((c) => !o.modos.length || modoSane(c, o.modos)),
      resolucoes: o.resolucoes.length ? RESOLUCOES.filter((r) => o.resolucoes.includes(r)).concat(o.resolucoes.filter((r) => !RESOLUCOES.includes(r) && r <= 600)).sort((a, b) => a - b) : RESOLUCOES.slice(0, 3),
      origens: o.origens,
      _sane: o,
    };
  }

  /** Digitaliza uma página: { png } (os bytes). cor: "cor", "cinza" ou "pb"; dpi; origem (só no Linux). */
  async digitalizar(id, { cor = 'cor', dpi = 200, origem = '' } = {}) {
    if (this.atual) throw Object.assign(new Error('ocupado'), { codigo: 'ocupado' });
    const s = this.scanner(id);
    dpi = Math.max(50, Math.min(1200, Math.round(Number(dpi) || 200)));
    if (this.plataforma === 'linux') return this.digitalizarSane(s, { cor, dpi, origem });
    if (this.plataforma === 'win32') return this.digitalizarWia(s, { cor, dpi });
    throw Object.assign(new Error('mac'), { codigo: 'mac' });
  }

  async digitalizarSane(s, { cor, dpi, origem }) {
    const o = (await this.opcoes(s.id))._sane;
    const args = ['-d', s.id, '--format=png'];
    const modo = modoSane(cor, o.modos);
    if (modo) args.push('--mode', modo);
    args.push('--resolution', String(resolucaoMaisPerto(dpi, o.resolucoes)));
    if (origem && o.origens.includes(origem)) args.push('--source', origem);
    return new Promise((resolve, reject) => {
      const p = spawn('scanimage', args, { windowsHide: true, env: { ...process.env, LC_ALL: 'C' } });
      const partes = [];
      let total = 0;
      let erro = '';
      let parado = false;
      const limite = setTimeout(() => { parado = true; p.kill(); }, TEMPO);
      this.atual = { parar: () => { parado = true; p.kill(); } };
      p.stdout.on('data', (d) => {
        total += d.length;
        if (total > MAX_IMAGEM) { parado = true; p.kill(); return; }
        partes.push(d);
      });
      p.stderr.on('data', (d) => { erro = (erro + d).slice(-2000); });
      p.on('error', (e) => { clearTimeout(limite); this.atual = null; reject(e); });
      p.on('close', (codigo) => {
        clearTimeout(limite);
        this.atual = null;
        if (parado) return reject(Object.assign(new Error('parado'), { codigo: 'parado' }));
        const png = Buffer.concat(partes);
        if (codigo !== 0 || png.length < 8) return reject(Object.assign(new Error(erro.trim() || `scanimage ${codigo}`), { codigo: 'falhou' }));
        resolve({ png });
      });
    });
  }

  async digitalizarWia(s, { cor, dpi }) {
    const pasta = await fsp.mkdtemp(path.join(os.tmpdir(), 'retro-scan-'));
    const saida = path.join(pasta, 'pagina.png');
    let parado = false;
    try {
      const p = new Promise((resolve, reject) => {
        const filho = execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', codificar(DIGITALIZAR_WIA)], {
          timeout: TEMPO, windowsHide: true,
          env: { ...process.env, RETRO_SCAN_ID: s.id, RETRO_SCAN_DPI: String(dpi), RETRO_SCAN_COR: ['cor', 'cinza', 'pb'].includes(cor) ? cor : 'cor', RETRO_SCAN_SAIDA: saida },
        }, (erro, so, se) => (erro ? reject(Object.assign(erro, { saida: String(se || so || '').trim() })) : resolve()));
        this.atual = { parar: () => { parado = true; filho.kill(); } };
      });
      await p;
      const st = await fsp.stat(saida);
      if (st.size > MAX_IMAGEM) throw Object.assign(new Error('grande'), { codigo: 'falhou' });
      return { png: await fsp.readFile(saida) };
    } catch (e) {
      if (parado) throw Object.assign(new Error('parado'), { codigo: 'parado' });
      throw Object.assign(new Error((e.saida || e.message || '').split('\n')[0]), { codigo: 'falhou' });
    } finally {
      this.atual = null;
      await fsp.rm(pasta, { recursive: true, force: true }).catch(() => { });
    }
  }

  parar() {
    if (this.atual) this.atual.parar();
    return true;
  }

  /** O programa de digitalização do próprio sistema (a Captura de Imagem no Mac). */
  async abrirDoSistema() {
    if (this.plataforma === 'darwin') {
      await rodar('open', ['-b', 'com.apple.Image_Capture']);
      return true;
    }
    if (this.plataforma === 'win32') {
      // As Configurações › Impressoras e scanners (o explorer.exe devolve 1 mesmo quando abre).
      await rodar('explorer.exe', ['ms-settings:printers']).catch(() => { });
      return true;
    }
    for (const prog of ['simple-scan', 'skanlite', 'xsane']) {
      try {
        const p = spawn(prog, [], { detached: true, stdio: 'ignore' });
        await new Promise((ok, falha) => { p.once('spawn', ok); p.once('error', falha); });
        p.unref();
        return true;
      } catch { }
    }
    throw Object.assign(new Error('sem-programa'), { codigo: 'sem-programa' });
  }
}

/**
 * Para os testes e as capturas (RETRO_SCANNER_FALSO=1): um scanner de mesa e um com alimentador,
 * que "digitalizam" uma carta desenhada na hora (uma página que o OCR consegue ler).
 */
class ScannersFalsos extends Scanners {
  constructor(o = {}) {
    super({ ...o, plataforma: 'linux' });
    this.desenhar = o.desenhar; // (html, largura, altura) → PNG
    this.feitas = 0;
  }

  async listar() {
    const lista = [{ id: 'falso:mesa', nome: tr('Scanner de teste (mesa)'), tipo: 'flatbed scanner' }, { id: 'falso:adf', nome: tr('Multifuncional de teste'), tipo: 'multi-function peripheral' }];
    this.conhecidos = new Map(lista.map((s) => [s.id, s]));
    return { disponivel: true, scanners: lista };
  }

  async opcoes(id) {
    const s = this.scanner(id);
    return { modos: ['cor', 'cinza', 'pb'], resolucoes: [150, 200, 300], origens: s.id === 'falso:adf' ? ['Flatbed', 'ADF'] : [] };
  }

  async digitalizar(id, { cor = 'cor' } = {}) {
    this.scanner(id);
    const n = ++this.feitas;
    const tom = cor === 'cor' ? '#f6f1e2' : '#fff';
    const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:${tom};font:22px serif;color:#222;filter:${cor === 'cor' ? 'none' : 'grayscale(1)'}">
      <div style="padding:70px 80px"><div style="color:#1d3f7a;font:bold 30px sans-serif">Prefeitura de Exemplo</div>
      <p style="margin-top:50px">Ofício n.º ${100 + n}/2026</p><p>Ao senhor responsável,</p>
      <p>Encaminhamos a página ${n} do processo para análise e manifestação no prazo de quinze dias.</p>
      <p style="margin-top:60px">Atenciosamente,</p><p>Secretaria de Administração</p></div></body>`;
    return { png: await this.desenhar(html, 850, 1100) };
  }
}

module.exports = { Scanners, ScannersFalsos, lerLista, lerOpcoes, modoSane, resolucaoMaisPerto, LISTAR_WIA, DIGITALIZAR_WIA };
