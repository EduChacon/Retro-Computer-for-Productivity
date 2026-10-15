'use strict';
/*
 * O Monitor do sistema: o uso do processador e da memória, o que o próprio Retro Computer
 * gasta, e a lista de processos (no Linux e no macOS pelo "ps"; no Windows pelo PowerShell,
 * só com a memória). Finalizar só vale para os processos do próprio usuário, nunca os do
 * Retro Computer nem os do sistema (o "kill" do sistema recusa os dos outros usuários).
 */
const fs = require('node:fs');
const os = require('node:os');
const { execFile } = require('node:child_process');

function rodar(cmd, args, { timeout = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, windowsHide: true, maxBuffer: 8 << 20, env: { ...process.env, LC_ALL: 'C' } }, (erro, saida) => (erro ? reject(erro) : resolve(String(saida))));
  });
}

/** O tempo ocupado e o total de todos os núcleos (para a porcentagem entre duas leituras). */
function temposCpu(cpus = os.cpus()) {
  let ocupado = 0;
  let total = 0;
  for (const c of cpus) {
    const t = c.times;
    const soma = t.user + t.nice + t.sys + t.idle + t.irq;
    total += soma;
    ocupado += soma - t.idle;
  }
  return { ocupado, total };
}

/** A porcentagem de uso entre duas leituras de temposCpu. */
function porcentagemCpu(antes, agora) {
  const total = agora.total - antes.total;
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, ((agora.ocupado - antes.ocupado) / total) * 100));
}

/** /proc/meminfo → { total, disponivel } em bytes (o "disponível" do Linux, que conta o cache). */
function lerMeminfo(texto) {
  const campo = (n) => { const m = new RegExp('^' + n + ':\\s+(\\d+)\\s*kB', 'm').exec(texto); return m ? Number(m[1]) * 1024 : null; };
  const total = campo('MemTotal');
  const disponivel = campo('MemAvailable') ?? campo('MemFree');
  return total ? { total, disponivel } : null;
}

/** ps -eo pid=,user=,pcpu=,rss=,comm= → [{ pid, usuario, cpu, memoria, nome }] */
function lerPs(texto) {
  const r = [];
  for (const linha of String(texto).split('\n')) {
    const m = /^\s*(\d+)\s+(\S+)\s+([\d.]+)\s+(\d+)\s+(.+?)\s*$/.exec(linha);
    if (m) r.push({ pid: Number(m[1]), usuario: m[2], cpu: Number(m[3]), memoria: Number(m[4]) * 1024, nome: m[5].split('/').pop() });
  }
  return r;
}

/** A saída JSON do Get-Process (Windows) → a mesma forma, sem a porcentagem de processador. */
function lerProcessosWindows(texto) {
  let d = [];
  try { d = JSON.parse(texto || '[]'); } catch { return []; }
  return (Array.isArray(d) ? d : [d]).filter((p) => p && p.Id).map((p) => ({ pid: Number(p.Id), usuario: '', cpu: null, memoria: Number(p.WorkingSet64) || 0, nome: String(p.ProcessName || '') }));
}

class Monitor {
  constructor({ app, plataforma = process.platform } = {}) {
    this.app = app;
    this.plataforma = plataforma;
    this.anterior = temposCpu();
    this.usuario = (() => { try { return os.userInfo().username; } catch { return ''; } })();
  }

  /** O uso agora: o processador, a memória e o Retro Computer. */
  amostra() {
    const agora = temposCpu();
    const cpu = porcentagemCpu(this.anterior, agora);
    this.anterior = agora;
    let mem = null;
    if (this.plataforma === 'linux') {
      try { mem = lerMeminfo(fs.readFileSync('/proc/meminfo', 'utf8')); } catch { }
    }
    if (!mem) mem = { total: os.totalmem(), disponivel: os.freemem() };
    let retroCpu = 0;
    let retroMem = 0;
    for (const m of (this.app && this.app.getAppMetrics ? this.app.getAppMetrics() : [])) {
      retroCpu += (m.cpu && m.cpu.percentCPUUsage) || 0;
      retroMem += ((m.memory && m.memory.workingSetSize) || 0) * 1024;
    }
    return {
      cpu,
      nucleos: os.cpus().length,
      modelo: (os.cpus()[0] || {}).model || '',
      memoria: { total: mem.total, emUso: mem.total - mem.disponivel },
      retro: { cpu: retroCpu / Math.max(1, os.cpus().length), memoria: retroMem },
      ligadoHa: os.uptime(),
      carga: os.loadavg(),
    };
  }

  /** Os pids do próprio Retro Computer (nunca finalizados por aqui). */
  pidsDoRetro() {
    const s = new Set([process.pid]);
    for (const m of (this.app && this.app.getAppMetrics ? this.app.getAppMetrics() : [])) s.add(m.pid);
    return s;
  }

  async processos() {
    let lista = [];
    try {
      if (this.plataforma === 'win32') {
        lista = lerProcessosWindows(await rodar('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
          'Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 60 Id,ProcessName,WorkingSet64 | ConvertTo-Json -Compress'], { timeout: 15000 }));
      } else {
        lista = lerPs(await rodar('ps', ['-eo', 'pid=,user=,pcpu=,rss=,comm=']));
      }
    } catch {
      return [];
    }
    const doRetro = this.pidsDoRetro();
    const meus = this.plataforma === 'win32';
    return lista
      .filter((p) => p.pid > 1)
      .map((p) => ({ ...p, doRetro: doRetro.has(p.pid), meu: meus || p.usuario === this.usuario }))
      .sort((a, b) => (b.cpu ?? 0) - (a.cpu ?? 0) || b.memoria - a.memoria)
      .slice(0, 80);
  }

  /** Finaliza um processo do usuário (com "forcar", sem esperar ele fechar sozinho). */
  finalizar(pid, forcar = false) {
    pid = Number(pid);
    if (!Number.isInteger(pid) || pid <= 1 || this.pidsDoRetro().has(pid)) return { ok: false, erro: 'protegido' };
    try {
      process.kill(pid, forcar ? 'SIGKILL' : 'SIGTERM');
      return { ok: true };
    } catch (e) {
      return { ok: false, erro: e.code === 'EPERM' ? 'permissao' : e.code === 'ESRCH' ? 'acabou' : e.message };
    }
  }
}

module.exports = { Monitor, temposCpu, porcentagemCpu, lerMeminfo, lerPs, lerProcessosWindows };
