'use strict';
/* As linguagens do laboratório: uma cópia temporária, sem shell e sem tocar no original. */
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFile } = require('node:child_process');
const { tr } = require('./idioma');

const MAX_TEXTO = 256 * 1024;
const MAX_SAIDA = 64 * 1024;

// O Finder não herda o PATH do terminal; o MSYS2 também pode não estar no PATH do Windows.
function candidatos(plataforma = process.platform, env = process.env) {
  if (plataforma === 'darwin') return ['/usr/bin/clang', '/opt/homebrew/opt/llvm/bin/clang', '/usr/local/opt/llvm/bin/clang'];
  if (plataforma === 'win32') return [
    'gcc.exe', 'clang.exe',
    ...['ucrt64', 'mingw64', 'clang64'].map((p) => path.win32.join(env.SystemDrive || 'C:', 'msys64', p, 'bin', 'gcc.exe')),
    path.win32.join(env.ProgramFiles || 'C:\\Program Files', 'LLVM', 'bin', 'clang.exe'),
  ];
  return ['cc', 'gcc', 'clang', '/usr/bin/cc'];
}

// Os segredos do Electron e do Claude não são herdados pelos exercícios.
function ambiente(env = process.env, compilador = '') {
  const r = {};
  const permitidas = new Set(['path', 'systemroot', 'windir', 'comspec', 'pathext', 'temp', 'tmp', 'tmpdir', 'home', 'userprofile', 'lang', 'lc_all', 'sdkroot', 'developer_dir']);
  for (const [k, v] of Object.entries(env)) if (permitidas.has(k.toLowerCase())) r[k] = v;
  const chave = Object.keys(r).find((k) => k.toLowerCase() === 'path') || 'PATH';
  if (path.isAbsolute(compilador)) r[chave] = path.dirname(compilador) + path.delimiter + (r[chave] || '');
  return r;
}

function conferir(texto) {
  if (typeof texto !== 'string' || Buffer.byteLength(texto) > MAX_TEXTO || texto.includes('\0')) throw new Error(tr('O código ou a entrada é grande demais ou contém um caractere inválido.'));
}

const LINGUAGENS = {
  c: { extensao: 'c', comandos: ['cc', 'gcc', 'clang'] },
  cpp: { extensao: 'cpp', comandos: ['c++', 'g++', 'clang++'] },
  python: { extensao: 'py', comandos: ['python3', 'python'] },
  rust: { extensao: 'rs', comandos: ['rustc'] },
  java: { extensao: 'java', comandos: ['javac'] },
  csharp: { extensao: 'cs', comandos: ['dotnet'] },
};

function ferramentas(linguagem) {
  if (!Object.hasOwn(LINGUAGENS, linguagem)) throw new Error(tr('Linguagem não suportada.'));
  if (linguagem === 'c') return candidatos();
  const nomes = LINGUAGENS[linguagem].comandos;
  const r = [...nomes];
  if (process.platform === 'darwin') r.push(...nomes.flatMap((n) => ['/usr/bin/' + n, '/opt/homebrew/bin/' + n, '/usr/local/bin/' + n]));
  if (linguagem === 'cpp') r.push(...candidatos().map((c) => c.replace(/gcc/g, 'g++').replace(/clang/g, 'clang++').replace(/\bcc\b/g, 'c++')));
  if (linguagem === 'rust') r.push(path.join(os.homedir(), '.cargo', 'bin', process.platform === 'win32' ? 'rustc.exe' : 'rustc'));
  if (linguagem === 'java' && process.env.JAVA_HOME) r.unshift(path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'javac.exe' : 'javac'));
  if (linguagem === 'csharp') {
    if (process.platform === 'win32') r.push(path.win32.join(process.env.ProgramFiles || 'C:\\Program Files', 'dotnet', 'dotnet.exe'));
    else r.push('/usr/local/share/dotnet/dotnet', '/usr/share/dotnet/dotnet');
  }
  return [...new Set(r)];
}

class LaboratorioProgramacao {
  constructor({ tempoCompilar = 30000, tempoExecutar = 5000, procurar = null } = {}) {
    this.tempoCompilar = tempoCompilar;
    this.tempoExecutar = tempoExecutar;
    this.procurar = procurar;
    this.ativo = null;
  }

  async detectar(linguagem = 'c') {
    // Os lançadores do macOS não são uma instalação do JDK nem das Command Line Tools.
    if (process.platform === 'darwin' && linguagem === 'java' && !process.env.JAVA_HOME) {
      const temJdk = await new Promise((r) => execFile('/usr/libexec/java_home', [], { timeout: 3000 }, (e) => r(!e)));
      if (!temJdk) return null;
    }
    const lista = ferramentas(linguagem);
    for (const arquivo of this.procurar || lista) {
      // Sem as Command Line Tools, /usr/bin/clang é um lançador que pode pedir a instalação.
      if (process.platform === 'darwin' && ['/usr/bin/clang', '/usr/bin/clang++', '/usr/bin/javac'].includes(arquivo)) {
        const existe = await new Promise((r) => execFile('/usr/bin/xcode-select', ['-p'], { timeout: 3000 }, (e) => r(!e)));
        if (!existe) continue;
      }
      const versao = await new Promise((r) => execFile(arquivo, [linguagem === 'java' ? '-version' : '--version'], { timeout: 3000, maxBuffer: 8192, windowsHide: true, env: ambiente() }, (e, s, err) => r(e ? null : (s || err).split(/\r?\n/)[0])));
      if (versao) return { arquivo, versao };
    }
    return null;
  }

  parar() {
    if (!this.ativo) return false;
    this.ativo.cancelado = true;
    this.ativo.matar?.();
    return true;
  }

  async executar({ codigo, entrada = '', linguagem = 'c' } = {}) {
    conferir(codigo); conferir(entrada);
    ferramentas(linguagem);
    if (this.ativo) throw new Error(tr('Já existe um programa em execução.'));
    const tarefa = { cancelado: false, matar: null };
    this.ativo = tarefa;
    let pasta;
    try {
      const compilador = await this.detectar(linguagem);
      if (!compilador) throw new Error(tr('A ferramenta desta linguagem não foi encontrada. Abra Preparar linguagem.'));
      if (tarefa.cancelado) return { etapa: 'compilar', motivo: 'cancelado', saida: '', codigo: null };
      pasta = await fs.mkdtemp(path.join(os.tmpdir(), 'retro-c-'));
      const fonte = linguagem === 'java' ? 'Main.java' : 'programa.' + LINGUAGENS[linguagem].extensao;
      await fs.writeFile(path.join(pasta, fonte), codigo, { mode: 0o600 });
      const exe = process.platform === 'win32' ? 'programa.exe' : 'programa';
      const env = ambiente(process.env, compilador.arquivo);
      let args, executar = path.join(pasta, exe), argsExecutar = [];
      if (linguagem === 'python') return { ...await this.rodar(tarefa, compilador.arquivo, ['-I', '-u', fonte], pasta, { ...env, PYTHONIOENCODING: 'utf-8' }, entrada, this.tempoExecutar), etapa: 'executar' };
      if (linguagem === 'c' || linguagem === 'cpp') args = [linguagem === 'c' ? '-std=c11' : '-std=c++17', '-Wall', '-Wextra', '-pedantic', '-fdiagnostics-color=never', fonte, '-o', exe, '-lm'];
      if (linguagem === 'rust') args = ['--edition=2021', '--color=never', fonte, '-o', exe];
      if (linguagem === 'java') {
        args = ['-encoding', 'UTF-8', fonte];
        executar = path.isAbsolute(compilador.arquivo) ? path.join(path.dirname(compilador.arquivo), process.platform === 'win32' ? 'java.exe' : 'java') : 'java';
        argsExecutar = ['-cp', pasta, 'Main'];
      }
      if (linguagem === 'csharp') {
        const maior = parseInt(compilador.versao, 10);
        if (!Number.isInteger(maior) || maior < 6) throw new Error(tr('Instale o .NET SDK 6 ou mais novo.'));
        await fs.writeFile(path.join(pasta, 'programa.csproj'), `<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net${maior}.0</TargetFramework><UseAppHost>false</UseAppHost></PropertyGroup></Project>`);
        // Exercícios simples usam só a biblioteca do SDK, sem pacotes ou downloads do NuGet.
        await fs.writeFile(path.join(pasta, 'NuGet.Config'), '<configuration><packageSources><clear /></packageSources></configuration>');
        Object.assign(env, { DOTNET_CLI_HOME: pasta, DOTNET_CLI_TELEMETRY_OPTOUT: '1', DOTNET_NOLOGO: '1', DOTNET_SKIP_FIRST_TIME_EXPERIENCE: '1' });
        args = ['build', 'programa.csproj', '--nologo', '--verbosity', 'quiet', '--configfile', path.join(pasta, 'NuGet.Config'), '-o', 'saida'];
        executar = compilador.arquivo; argsExecutar = [path.join(pasta, 'saida', 'programa.dll')];
      }
      const compilacao = await this.rodar(tarefa, compilador.arquivo, args, pasta, env, '', this.tempoCompilar);
      if (compilacao.codigo !== 0 || compilacao.motivo) return { ...compilacao, etapa: 'compilar' };
      if (tarefa.cancelado) return { etapa: 'executar', motivo: 'cancelado', saida: compilacao.saida, codigo: null };
      const resultado = await this.rodar(tarefa, executar, argsExecutar, pasta, env, entrada, this.tempoExecutar);
      return { ...resultado, etapa: 'executar', avisos: compilacao.saida };
    } finally {
      if (pasta) await fs.rm(pasta, { recursive: true, force: true }).catch(() => {});
      this.ativo = null;
    }
  }

  rodar(tarefa, arquivo, args, cwd, env, entrada, prazo) {
    return new Promise((resolve, reject) => {
      if (tarefa.cancelado) return resolve({ codigo: null, motivo: 'cancelado', saida: '' });
      const p = spawn(arquivo, args, { cwd, env, windowsHide: true, detached: process.platform !== 'win32', stdio: ['pipe', 'pipe', 'pipe'] });
      let saida = Buffer.alloc(0), motivo = null;
      const matar = () => {
        if (!p.pid) return;
        if (process.platform === 'win32') execFile('taskkill.exe', ['/PID', String(p.pid), '/T', '/F'], { windowsHide: true }, () => {});
        else { try { process.kill(-p.pid, 'SIGKILL'); } catch {} }
      };
      tarefa.matar = matar;
      const timer = setTimeout(() => { motivo = 'tempo'; matar(); }, prazo);
      const receber = (b) => {
        const sobra = MAX_SAIDA - saida.length;
        saida = Buffer.concat([saida, b.subarray(0, sobra)]);
        if (b.length > sobra) { motivo = 'saida'; matar(); }
      };
      p.stdout.on('data', receber); p.stderr.on('data', receber);
      p.stdin.on('error', () => {}); // Um programa sem scanf pode sair antes de ler a entrada.
      p.stdin.end(entrada);
      p.on('error', (e) => { clearTimeout(timer); tarefa.matar = null; reject(e); });
      p.on('close', (codigo, sinal) => {
        clearTimeout(timer); tarefa.matar = null;
        // Fecha também filhos que o exercício tenha deixado em segundo plano.
        if (process.platform !== 'win32') matar();
        resolve({ codigo, sinal, motivo: tarefa.cancelado ? 'cancelado' : motivo, saida: saida.toString('utf8') });
      });
    });
  }
}

module.exports = { LaboratorioProgramacao, candidatos, ambiente, ferramentas, LINGUAGENS, MAX_TEXTO, MAX_SAIDA };
