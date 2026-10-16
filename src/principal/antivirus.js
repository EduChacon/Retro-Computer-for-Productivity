'use strict';
/*
 * O antivírus sob demanda (botão direito › Verificar com o antivírus, e Painel de controle ›
 * Segurança): o ClamAV no Linux (o clamscan, instalado com a senha de administrador quando
 * falta) e o Microsoft Defender no Windows (o MpCmdRun, sem apagar nada: ele só conta o que
 * achou). No macOS, o próprio sistema verifica os arquivos (o XProtect).
 *
 * Nada é apagado aqui: o que for achado aparece na lista, e a tela oferece mandar para a Lixeira.
 *
 * RETRO_ANTIVIRUS_FALSO=1: um verificador de mentira que acha o arquivo de teste EICAR.
 */
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { spawn, execFile } = require('node:child_process');

// O arquivo de teste EICAR (o que todo antivírus reconhece), montado em pedaços para este
// arquivo não ser confundido com ele.
const EICAR = ['X5O!P%@AP[4\\PZX54(P^)7CC)7}', '$EICAR-STANDARD-ANTIVIRUS-', 'TEST-FILE!$H+H*'].join('');

const CONTAR_MAX = 200000;

function rodar(cmd, args, { timeout = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, windowsHide: true, env: { ...process.env, LC_ALL: 'C' } }, (e, saida) => (e ? reject(e) : resolve(String(saida))));
  });
}

/* ---------- A leitura das saídas (testadas em testes/antivirus.test.js) ---------- */

/** Uma linha do "clamscan --stdout": { arquivo, ok } ou { arquivo, ameaca }, ou null. */
function lerLinhaClam(linha) {
  const m = /^(.*): (.+) FOUND$/.exec(linha);
  if (m) return { arquivo: m[1], ameaca: m[2] };
  const ok = /^(.*): (OK|Empty file|Symbolic link|Excluded)$/.exec(linha);
  if (ok) return { arquivo: ok[1], ok: true };
  return null;
}

/** A saída do "MpCmdRun -Scan": as ameaças e os arquivos de cada uma. */
function lerDefender(s) {
  const achados = [];
  let ameaca = null;
  for (const l of String(s).split(/\r?\n/)) {
    const t = /^\s*Threat\s*:\s*(.+?)\s*$/.exec(l);
    if (t) { ameaca = t[1]; continue; }
    const f = /^\s*file\s*:\s*(.+?)\s*$/i.exec(l);
    if (f && ameaca) achados.push({ arquivo: f[1], ameaca });
  }
  return achados;
}

/** A versão das definições do ClamAV ("ClamAV 1.0.7/27431/Thu Oct 15 08:12:34 2026"). */
function lerVersaoClam(s) {
  const m = /^ClamAV ([\d.]+)(?:\/(\d+)\/(.+))?$/m.exec(String(s).trim());
  return m ? { versao: m[1], banco: m[2] || null, data: m[3] ? m[3].trim() : null } : null;
}

/** Conta os arquivos de uma pasta (para a barra de progresso), até um limite. */
async function contarArquivos(raiz, limite = CONTAR_MAX) {
  let n = 0;
  const pilha = [raiz];
  while (pilha.length && n < limite) {
    const p = pilha.pop();
    let st;
    try { st = await fsp.lstat(p); } catch { continue; }
    if (st.isFile()) { n++; continue; }
    if (!st.isDirectory()) continue;
    const nomes = await fsp.readdir(p).catch(() => []);
    for (const nome of nomes) pilha.push(path.join(p, nome));
  }
  return n;
}

class Antivirus {
  constructor({ plataforma = process.platform, comoAdmin, falso = false } = {}) {
    this.plataforma = plataforma;
    this.comoAdmin = comoAdmin;
    this.falso = falso;
    this.atual = null;
  }

  defender() {
    return path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Windows Defender', 'MpCmdRun.exe');
  }

  /** { disponivel, motor, versao, instalavel, sistema } */
  async estado() {
    if (this.falso) return { disponivel: true, motor: 'clamav', versao: { versao: '1.4.3', banco: '27800', data: 'Fri Oct 16 08:00:00 2026' } };
    if (this.plataforma === 'linux') {
      const v = await rodar('clamscan', ['--version']).then(lerVersaoClam, () => null);
      if (v) return { disponivel: true, motor: 'clamav', versao: v };
      const apt = fs.existsSync('/usr/bin/apt-get');
      return { disponivel: false, motor: 'clamav', instalavel: apt };
    }
    if (this.plataforma === 'win32') return fs.existsSync(this.defender()) ? { disponivel: true, motor: 'defender' } : { disponivel: false, motor: 'defender' };
    return { disponivel: false, sistema: true };
  }

  /** Instala o ClamAV (Linux, com a senha de administrador). */
  instalar(senha, aoAndar) {
    return this.comoAdmin(senha, 'apt-get', ['install', '-y', 'clamav', 'clamav-freshclam'], { aoAndar });
  }

  /** Atualiza as definições (o freshclam). Com o serviço do freshclam ligado, elas já se atualizam sozinhas. */
  async atualizar(senha) {
    if (this.falso) return { ok: true };
    const r = await this.comoAdmin(senha, 'freshclam', []);
    if (!r.ok && /locked|lock file|another freshclam/i.test(String(r.erro || '') + String(r.saida || ''))) return { ok: true, sozinho: true };
    return r;
  }

  /**
   * Verifica um arquivo ou uma pasta. aoAndar({ n, total, arquivo }); aoAchar({ arquivo, ameaca }).
   * @returns {Promise<{ ok:boolean, n:number, achados:Array, parado?:boolean, erro?:string }>}
   */
  async verificar(alvo, { aoAndar = () => { }, aoAchar = () => { } } = {}) {
    if (this.atual) throw new Error('ocupado');
    const total = await contarArquivos(alvo);
    const achados = [];
    const achar = (x) => { achados.push(x); aoAchar(x); };
    let n = 0;
    this.parado = false;
    this.atual = { kill: () => { } };
    try {
      if (this.falso) {
        const pilha = [alvo];
        while (pilha.length && !this.parado) {
          const p = pilha.pop();
          const st = await fsp.lstat(p).catch(() => null);
          if (!st) continue;
          if (st.isDirectory()) { for (const nome of await fsp.readdir(p).catch(() => [])) pilha.push(path.join(p, nome)); continue; }
          if (!st.isFile()) continue;
          n++;
          const b = st.size < 1 << 20 ? await fsp.readFile(p).catch(() => Buffer.alloc(0)) : Buffer.alloc(0);
          if (b.includes(EICAR)) achar({ arquivo: p, ameaca: 'Eicar-Test-Signature' });
          aoAndar({ n, total, arquivo: p });
          await new Promise((r) => setTimeout(r, 15));
        }
        return { ok: true, n, total, achados, parado: this.parado };
      }
      if (this.plataforma === 'linux') return { ...(await this.clamscan(alvo, total, achar, aoAndar)), achados };
      if (this.plataforma === 'win32') return { ...(await this.mpcmdrun(alvo, total, achar, aoAndar)), achados };
      return { ok: false, n: 0, total, achados, erro: 'sistema' };
    } finally {
      this.atual = null;
    }
  }

  clamscan(alvo, total, achar, aoAndar) {
    return new Promise((resolve) => {
      const p = spawn('clamscan', ['-r', '--stdout', '--no-summary', '--', alvo], { env: { ...process.env, LC_ALL: 'C' } });
      this.atual = p;
      let resto = '';
      let n = 0;
      let erros = '';
      p.stdout.on('data', (d) => {
        resto += d;
        let i;
        while ((i = resto.indexOf('\n')) >= 0) {
          const linha = resto.slice(0, i);
          resto = resto.slice(i + 1);
          const r = lerLinhaClam(linha);
          if (!r) continue;
          n++;
          if (r.ameaca) achar(r);
          aoAndar({ n, total, arquivo: r.arquivo });
        }
      });
      p.stderr.on('data', (d) => { erros = (erros + d).slice(-4000); });
      p.on('error', (e) => resolve({ ok: false, n, total, erro: e.message }));
      // O clamscan sai com 0 (nada achado), 1 (achou) ou 2 (erro).
      p.on('close', (codigo) => resolve({ ok: this.parado || codigo === 0 || codigo === 1, n, total, parado: this.parado, erro: codigo === 2 && !this.parado ? erros.trim().split('\n').pop() : undefined }));
    });
  }

  mpcmdrun(alvo, total, achar, aoAndar) {
    return new Promise((resolve) => {
      aoAndar({ n: 0, total, arquivo: alvo });
      const p = spawn(this.defender(), ['-Scan', '-ScanType', '3', '-File', alvo, '-DisableRemediation'], { windowsHide: true });
      this.atual = p;
      let saida = '';
      p.stdout.on('data', (d) => { saida += d; });
      p.on('error', (e) => resolve({ ok: false, n: 0, total, erro: e.message }));
      p.on('close', (codigo) => {
        for (const a of lerDefender(saida)) achar(a);
        aoAndar({ n: total, total, arquivo: alvo });
        // 0: nada achado; 2: achou. Os outros são erro.
        resolve({ ok: this.parado || codigo === 0 || codigo === 2, n: total, total, parado: this.parado, erro: codigo !== 0 && codigo !== 2 && !this.parado ? saida.trim().split(/\r?\n/).pop() : undefined });
      });
    });
  }

  parar() {
    this.parado = true;
    if (this.atual) { try { this.atual.kill(); } catch { } }
  }
}

module.exports = { Antivirus, lerLinhaClam, lerDefender, lerVersaoClam, contarArquivos, EICAR };
