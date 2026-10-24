'use strict';
/*
 * Os Craft instalados no Windows (fora do Retro Computer): os instaladores .msi oficiais, que se
 * instalam para todos os usuários em Arquivos de Programas. Eles não se atualizam sozinhos; aqui o
 * Retro Computer os reconhece pelo registro do Windows (o fabricante e o nome do catálogo), compara
 * com o último lançamento no GitHub, baixa o .msi do mesmo processador e roda o próprio instalador,
 * sem modificação, com a confirmação do Windows (o UAC).
 *
 * A conferência: o resumo SHA-256 publicado pelo GitHub (obrigatório) e a assinatura digital do
 * Windows, do mesmo fabricante do programa já instalado. As duas são feitas de novo pelo processo de
 * administrador, numa cópia numa pasta que só o administrador muda, logo antes de instalar. Nunca
 * volta uma versão nem instala um Craft que não estava instalado.
 */
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');
const { CATALOGO, compararVersoes } = require('./programas');
const { tr } = require('./idioma');

// O fabricante nos instaladores dos Craft (o Manufacturer do .msi).
const FABRICANTE = 'Learning Machines LLC';
// Procura versões novas no máximo a cada 6 horas (como os Craft do Retro Computer).
const INTERVALO_BUSCA = 6 * 3600 * 1000;
// Um instalador dos Craft tem algumas dezenas de MB.
const MAX_MSI = 1024 * 1024 * 1024;
// Os códigos de saída do processo de administrador (os do msiexec, e estes, quando a conferência falha).
const SAIDA = { resumo: 91, assinatura: 92, copia: 93 };

const codificar = (s) => Buffer.from(String(s), 'utf16le').toString('base64');

function rodar(cmd, args, { timeout = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, windowsHide: true, maxBuffer: 8 << 20 }, (erro, saida, serr) => {
      if (erro) { erro.saida = String(serr || saida || '').trim(); return reject(erro); }
      resolve(String(saida));
    });
  });
}

/**
 * Lista os programas do fabricante dos Craft no registro do Windows (as três chaves de "Programas e
 * Recursos"), com o executável que estiver em Arquivos de Programas e o assinante dele.
 */
const LISTAR = `[Console]::OutputEncoding = [Text.Encoding]::UTF8
$ErrorActionPreference = 'SilentlyContinue'
$chaves = @('HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*', 'HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*', 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*')
$lista = foreach ($c in $chaves) {
  Get-ItemProperty -Path $c | Where-Object { $_.Publisher -eq '${FABRICANTE}' -and $_.DisplayName } | ForEach-Object {
    $nome = [string]$_.DisplayName
    $exe = $null
    foreach ($pasta in @([string]$_.InstallLocation, (Join-Path $env:ProgramFiles $nome), (Join-Path \${env:ProgramFiles(x86)} $nome))) {
      if (-not $pasta) { continue }
      $p = Join-Path $pasta (($nome.ToLower()) + '.exe')
      if (Test-Path -LiteralPath $p -PathType Leaf) { $exe = $p; break }
    }
    $assinante = $null
    if ($exe) { $s = Get-AuthenticodeSignature -LiteralPath $exe; if ($s.Status -eq 'Valid') { $assinante = $s.SignerCertificate.Subject } }
    [pscustomobject]@{ nome = $nome; versao = [string]$_.DisplayVersion; chave = $c; exe = $exe; assinante = $assinante }
  }
}
ConvertTo-Json -Compress -InputObject @{ arq = [string]$env:PROCESSOR_ARCHITECTURE; programas = @($lista) }`;

/** O processador de um executável do Windows, pelo cabeçalho PE: x64, x86, arm64 ou null. */
function arquiteturaPe(bytes) {
  if (!bytes || bytes.length < 0x40 || bytes[0] !== 0x4d || bytes[1] !== 0x5a) return null;
  const pe = bytes.readUInt32LE(0x3c);
  if (pe + 6 > bytes.length || bytes.readUInt32LE(pe) !== 0x00004550) return null;
  return { 0x8664: 'x64', 0x014c: 'x86', 0xaa64: 'arm64' }[bytes.readUInt16LE(pe + 4)] || null;
}

/** O processador do Windows (o PROCESSOR_ARCHITECTURE do PowerShell nativo). */
function arquiteturaDoSistema(texto) {
  return { AMD64: 'x64', ARM64: 'arm64', X86: 'x86' }[String(texto || '').toUpperCase()] || 'x64';
}

/**
 * Lê a saída de LISTAR: só os do catálogo (pelo nome), cada um com o processador do instalador que
 * vai servir: o do executável instalado ou, sem ele, x86 na chave de 32 bits, senão o do sistema.
 */
function lerInstalados(json, lerExe = () => null) {
  let d;
  try { d = JSON.parse(String(json || '').replace(/^﻿/, '')); } catch { return []; }
  const sistema = arquiteturaDoSistema(d && d.arq);
  const vistos = new Set();
  const r = [];
  for (const x of (d && Array.isArray(d.programas) ? d.programas : [])) {
    const prog = CATALOGO.programas.find((p) => p.nome.toLowerCase() === String(x.nome || '').trim().toLowerCase());
    if (!prog || vistos.has(prog.id) || !/^\d+(\.\d+)*$/.test(String(x.versao || ''))) continue;
    vistos.add(prog.id);
    const doExe = x.exe ? arquiteturaPe(lerExe(x.exe)) : null;
    const arq = doExe || (/WOW6432Node/i.test(String(x.chave || '')) ? 'x86' : sistema);
    r.push({ id: prog.id, nome: prog.nome, repo: prog.repo, icone: prog.icone, versao: String(x.versao), arq, assinante: x.assinante ? String(x.assinante) : null });
  }
  return r;
}

/** O .msi do lançamento para o processador ({ url, tamanho, sha256 }), ou null. */
function msiDoLancamento(j, prog, arq) {
  const re = new RegExp(`^${prog.id}-[\\w.-]+-windows-${arq}\\.msi$`);
  const a = (j && Array.isArray(j.assets) ? j.assets : []).find((x) => re.test(String(x.name || '')));
  if (!a) return null;
  let url;
  try { url = new URL(a.browser_download_url); } catch { return null; }
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || !url.pathname.startsWith(`/${prog.repo}/releases/download/`)) return null;
  const sha256 = /^sha256:[0-9a-f]{64}$/.test(String(a.digest || '')) ? a.digest.slice(7) : null;
  return { nome: a.name, url: url.toString(), tamanho: Number(a.size) || 0, sha256 };
}

/** Um texto para dentro do comando do PowerShell, sem aspas a escapar (em base64, lido como UTF-8). */
const textoPs = (s) => `([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${Buffer.from(String(s || ''), 'utf8').toString('base64')}')))`;

/**
 * O comando do processo de administrador (pela confirmação do Windows): copia o .msi para uma pasta
 * nova dentro da pasta temporária do Windows (que só o administrador muda), confere de novo o resumo
 * e a assinatura nessa cópia e roda o msiexec nela. O processo de administrador não herda o ambiente:
 * o caminho, o resumo e o assinante esperado (o do programa instalado; sem ele, o fabricante dos
 * Craft) vão no próprio comando, em base64.
 */
function comandoInstalar({ msi, sha256, assinante }) {
  return `$ErrorActionPreference = 'Stop'
$origem = ${textoPs(msi)}
$resumo = ${textoPs(String(sha256).toLowerCase())}
$esperado = ${textoPs(assinante)}
$pasta = Join-Path $env:SystemRoot ('Temp\\RetroComputer-' + [guid]::NewGuid().ToString('N'))
$codigo = 1
try {
  New-Item -ItemType Directory -Path $pasta | Out-Null
  $msi = Join-Path $pasta 'craft.msi'
  $copiou = $true
  try { Copy-Item -LiteralPath $origem -Destination $msi } catch { $copiou = $false }
  if (-not $copiou) { $codigo = ${SAIDA.copia} }
  elseif ((Get-FileHash -LiteralPath $msi -Algorithm SHA256).Hash.ToLower() -ne $resumo) { $codigo = ${SAIDA.resumo} }
  else {
    $s = Get-AuthenticodeSignature -LiteralPath $msi
    $quem = [string]$s.SignerCertificate.Subject
    $ok = $s.Status -eq 'Valid' -and $(if ($esperado) { $quem -eq $esperado } else { $quem -match '(^|,\\s*)(CN|O)="?${FABRICANTE}"?(,|$)' })
    if (-not $ok) { $codigo = ${SAIDA.assinatura} }
    else {
      $p = Start-Process -FilePath (Join-Path $env:SystemRoot 'System32\\msiexec.exe') -ArgumentList @('/i', ('"' + $msi + '"'), '/passive', '/norestart') -Wait -PassThru
      $codigo = $p.ExitCode
    }
  }
} catch { $codigo = 1 }
Remove-Item -LiteralPath $pasta -Recurse -Force -ErrorAction SilentlyContinue
exit $codigo`;
}

/**
 * Pede a confirmação do Windows e espera o processo de administrador. Cancelada, sai com 1223 (o
 * código do Windows para "a operação foi cancelada pelo usuário").
 */
function comandoUac(interno) {
  return `try { $p = Start-Process -FilePath 'powershell.exe' -Verb RunAs -WindowStyle Hidden -Wait -PassThru -ArgumentList '-NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${codificar(interno)}'; exit $p.ExitCode } catch { $e = $_.Exception; while ($e) { if ($e -is [System.ComponentModel.Win32Exception]) { exit $e.NativeErrorCode }; $e = $e.InnerException }; exit 1 }`;
}

/** O que o código de saída do instalador quer dizer. */
function resultadoDoCodigo(codigo) {
  if (codigo === 0) return { ok: true };
  if (codigo === 3010 || codigo === 1641) return { ok: true, reiniciar: true };
  if (codigo === 1223 || codigo === 1602) return { ok: false, cancelado: true };
  if (codigo === SAIDA.resumo) return { ok: false, erro: tr('O instalador baixado não confere com o publicado no GitHub. Nada foi instalado.') };
  if (codigo === SAIDA.assinatura) return { ok: false, erro: tr('A assinatura digital do instalador não é a do fabricante do programa. Nada foi instalado.') };
  if (codigo === SAIDA.copia) return { ok: false, erro: tr('Não foi possível preparar o instalador. Nada foi instalado.') };
  if (codigo === 1618) return { ok: false, erro: tr('Outra instalação do Windows está em andamento. Espere ela terminar e tente de novo.') };
  return { ok: false, erro: tr('O instalador do Windows terminou com o código {n}.', { n: codigo }) };
}

class CraftWindows {
  /**
   * @param {(url: string, opcoes?: object) => Promise<Response>} buscar  fetch da rede (net.fetch)
   * @param {string} arquivoBuscas  onde guardar as buscas (<dados do aplicativo>/craft-windows.json)
   */
  constructor(buscar, arquivoBuscas, { plataforma = process.platform } = {}) {
    this.buscar = buscar;
    this.arquivoBuscas = arquivoBuscas;
    this.disponivel = plataforma === 'win32';
    this.emAndamento = null;
  }

  /** Os Craft instalados no Windows (do catálogo), com a versão e o processador. */
  async instalados() {
    if (!this.disponivel) return [];
    const saida = await rodar('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', codificar(LISTAR)]);
    return lerInstalados(saida, (exe) => {
      try {
        const fd = fs.openSync(exe, 'r');
        try { const b = Buffer.alloc(4096); const n = fs.readSync(fd, b, 0, b.length, 0); return b.subarray(0, n); } finally { fs.closeSync(fd); }
      } catch { return null; }
    });
  }

  /** O último lançamento de um Craft (a página da API do GitHub), guardado por algumas horas. */
  async lancamento(prog, forcar) {
    const arq = this.arquivoBuscas;
    let cache = {};
    try { cache = JSON.parse(await fsp.readFile(arq, 'utf8')) || {}; } catch { }
    const c = cache[prog.id];
    if (!forcar && c && Date.now() - c.em < INTERVALO_BUSCA && c.j) return c.j;
    const r = await this.buscar(`https://api.github.com/repos/${prog.repo}/releases/latest`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'RetroComputer' } });
    if (!r.ok) throw new Error(tr('Não foi possível descobrir a versão mais recente.'));
    const j0 = await r.json();
    // Só o que é usado: a versão e os instaladores do Windows.
    const j = { tag_name: String(j0.tag_name || ''), assets: (j0.assets || []).filter((a) => /\.msi$/i.test(String(a.name || ''))).map((a) => ({ name: a.name, browser_download_url: a.browser_download_url, size: a.size, digest: a.digest })) };
    cache[prog.id] = { em: Date.now(), j };
    await fsp.mkdir(path.dirname(arq), { recursive: true }).catch(() => { });
    await fsp.writeFile(arq, JSON.stringify(cache)).catch(() => { });
    return j;
  }

  /** Os instalados, cada um com a versão nova quando houver ({ ..., nova, msi }). */
  async verificar({ forcar = false } = {}) {
    const lista = await this.instalados();
    const r = [];
    for (const inst of lista) {
      const prog = CATALOGO.programas.find((p) => p.id === inst.id);
      try {
        const j = await this.lancamento(prog, forcar);
        const nova = String(j.tag_name || '').replace(/^v/, '');
        const msi = msiDoLancamento(j, prog, inst.arq);
        const temAtualizacao = !!msi && compararVersoes(nova, inst.versao) > 0;
        r.push({ ...inst, nova: temAtualizacao ? nova : null, temAtualizacao, semInstalador: !msi });
      } catch (e) {
        r.push({ ...inst, nova: null, temAtualizacao: false, erro: e.message });
      }
    }
    return r;
  }

  /** Baixa o .msi para uma pasta temporária, conferindo o tamanho e o resumo. */
  async baixar(msi, versao, aoProgresso) {
    const resp = await this.buscar(msi.url);
    if (!resp.ok) throw new Error(tr('O download falhou (HTTP {codigo}).', { codigo: resp.status }));
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'retro-craft-'));
    const arquivo = path.join(dir, 'craft.msi');
    const escrita = fs.createWriteStream(arquivo);
    const resumo = crypto.createHash('sha256');
    const limite = Math.min(MAX_MSI, msi.tamanho ? msi.tamanho + 1024 : MAX_MSI);
    const total = msi.tamanho || Number(resp.headers.get('content-length')) || 0;
    const leitor = resp.body.getReader();
    let recebido = 0;
    let ultimo = 0;
    try {
      for (; ;) {
        const { done, value } = await leitor.read();
        if (done) break;
        recebido += value.length;
        if (recebido > limite) {
          await leitor.cancel().catch(() => { });
          throw new Error(tr('O download é maior que o esperado e foi interrompido.'));
        }
        resumo.update(value);
        if (!escrita.write(Buffer.from(value))) await new Promise((ok) => escrita.once('drain', ok));
        if (Date.now() - ultimo > 120) { ultimo = Date.now(); aoProgresso({ etapa: 'baixando', versao, recebido, total }); }
      }
      await new Promise((ok, falha) => escrita.end((e) => (e ? falha(e) : ok())));
      if (resumo.digest('hex') !== msi.sha256) throw new Error(tr('O instalador baixado não confere com o publicado no GitHub. Nada foi instalado.'));
      return { dir, arquivo };
    } catch (e) {
      escrita.destroy();
      await fsp.rm(dir, { recursive: true, force: true }).catch(() => { });
      throw e;
    }
  }

  /**
   * Atualiza um Craft instalado no Windows: só para uma versão maior, do mesmo processador, com o
   * resumo do GitHub e a assinatura do mesmo fabricante. Devolve { ok, versao, reiniciar } ou
   * { ok: false, cancelado } ou { ok: false, erro }.
   */
  async atualizar(id, aoProgresso = () => { }) {
    if (!this.disponivel) return { ok: false, erro: tr('Só no Windows.') };
    if (this.emAndamento) return { ok: false, erro: tr('Já há uma atualização em andamento.') };
    this.emAndamento = id;
    let dir = null;
    try {
      aoProgresso({ etapa: 'versao' });
      const inst = (await this.instalados()).find((x) => x.id === id);
      if (!inst) return { ok: false, erro: tr('Este programa não está instalado no Windows.') };
      const prog = CATALOGO.programas.find((p) => p.id === id);
      const j = await this.lancamento(prog, true);
      const versao = String(j.tag_name || '').replace(/^v/, '');
      const msi = msiDoLancamento(j, prog, inst.arq);
      if (!msi) return { ok: false, erro: tr('O lançamento {versao} não tem o instalador do Windows para este processador.', { versao }) };
      if (compararVersoes(versao, inst.versao) <= 0) return { ok: false, semNovidade: true, erro: tr('O {programa} já está na versão mais recente ({versao}).', { programa: prog.nome, versao: inst.versao }) };
      if (!msi.sha256) return { ok: false, erro: tr('O GitHub não informou o resumo SHA-256 do instalador, e sem ele nada é instalado. Tente mais tarde.') };
      aoProgresso({ etapa: 'baixando', versao, recebido: 0, total: msi.tamanho });
      const b = await this.baixar(msi, versao, aoProgresso);
      dir = b.dir;
      aoProgresso({ etapa: 'instalando', versao });
      let codigo = 0;
      try {
        const interno = comandoInstalar({ msi: b.arquivo, sha256: msi.sha256, assinante: inst.assinante });
        await rodar('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', codificar(comandoUac(interno))], { timeout: 30 * 60 * 1000 });
      } catch (e) {
        codigo = typeof e.code === 'number' ? e.code : -1;
      }
      const r = resultadoDoCodigo(codigo);
      if (r.ok) aoProgresso({ etapa: 'pronto', versao });
      return { ...r, versao, nome: prog.nome };
    } catch (e) {
      return { ok: false, erro: e.message };
    } finally {
      this.emAndamento = null;
      if (dir) await fsp.rm(dir, { recursive: true, force: true }).catch(() => { });
    }
  }
}

/**
 * Os Craft do Windows de mentira (RETRO_CRAFT_WINDOWS_FALSO=1, para as capturas em qualquer sistema):
 * o WordCraft com uma versão nova e o GridCraft em dia; atualizar só finge o download e a instalação.
 */
class CraftWindowsFalso {
  constructor() {
    this.disponivel = true;
    this.lista = [{ id: 'wordcraft', versao: '0.9.0', nova: '0.10.0' }, { id: 'gridcraft', versao: '0.10.0', nova: null }];
  }

  async instalados() {
    return this.lista.map((x) => {
      const p = CATALOGO.programas.find((c) => c.id === x.id);
      return { id: p.id, nome: p.nome, repo: p.repo, icone: p.icone, versao: x.versao, arq: 'x64', assinante: 'CN=' + FABRICANTE };
    });
  }

  async verificar() {
    const inst = await this.instalados();
    return inst.map((x) => {
      const nova = this.lista.find((y) => y.id === x.id).nova;
      return { ...x, nova, temAtualizacao: !!nova, semInstalador: false };
    });
  }

  async atualizar(id, aoProgresso = () => { }) {
    const x = this.lista.find((y) => y.id === id);
    if (!x || !x.nova) return { ok: false, semNovidade: true, erro: tr('O {programa} já está na versão mais recente ({versao}).', { programa: id, versao: x ? x.versao : '?' }) };
    const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
    const total = 18 * 1024 * 1024;
    aoProgresso({ etapa: 'versao' });
    for (let recebido = 0; recebido <= total; recebido += total / 6) { aoProgresso({ etapa: 'baixando', versao: x.nova, recebido, total }); await espera(150); }
    aoProgresso({ etapa: 'instalando', versao: x.nova });
    await espera(600);
    x.versao = x.nova;
    x.nova = null;
    aoProgresso({ etapa: 'pronto', versao: x.versao });
    return { ok: true, versao: x.versao, nome: CATALOGO.programas.find((c) => c.id === id).nome };
  }
}

module.exports = { CraftWindows, CraftWindowsFalso, lerInstalados, arquiteturaPe, arquiteturaDoSistema, msiDoLancamento, resultadoDoCodigo, comandoInstalar, comandoUac, LISTAR };
