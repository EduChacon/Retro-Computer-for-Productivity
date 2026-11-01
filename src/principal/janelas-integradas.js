'use strict';
/* Janelas escolhidas de programas conhecidos. Nenhum PID, executável ou comando vem da página. */
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const readline = require('node:readline');
const crypto = require('node:crypto');
const { tr } = require('./idioma');
const marcar = (s) => s;

const TEXTOS = {
  plataforma: marcar('A integração de programas está disponível no Windows e no Mac.'),
  programa: marcar('Este programa não oferece uma janela compatível. Use Abrir no computador ou associe uma versão web.'),
  permissao: marcar('Permita o controle de janelas em Ajustes do Sistema › Privacidade e Segurança › Acessibilidade e tente novamente.'),
  ausente: marcar('Nenhuma janela compatível foi encontrada. O programa pode estar iniciando ou usar um processo diferente.'),
  sessao: marcar('Esta janela já não está disponível. Abra a integração novamente.'),
  auxiliar: marcar('O auxiliar de janelas não está disponível. Atualize ou reinstale o Retro Computer.'),
  incompativel: marcar('Não foi possível incorporar esta janela. Ela continua disponível no computador principal.'),
  restaurar: marcar('Não foi possível devolver a janela ao computador. Tente Sair da integração novamente.'),
};
function falha(codigo) { const e = new Error(tr(TEXTOS[codigo] || TEXTOS.auxiliar)); e.codigo = codigo; return e; }

function geometria(o) {
  if (!o || !o.ret || !o.viewport) throw falha('programa');
  const { x, y, w, h } = o.ret, { w: vw, h: vh } = o.viewport;
  if (![x, y, w, h, vw, vh].every(Number.isFinite) || vw < 1 || vh < 1 || vw > 40000 || vh > 40000 || w < 1 || h < 1 || x < 0 || y < 0 || x + w > vw + 1 || y + h > vh + 1) throw falha('programa');
  return { ret: { x, y, w, h }, viewport: { w: vw, h: vh }, visivel: o.visivel === true };
}

class PonteNativa {
  constructor({ plataforma = process.platform, recursos, empacotado = false, pai, processoPai = process.pid, iniciar = spawn }) {
    this.opcoes = { plataforma, recursos, empacotado, pai, processoPai, iniciar }; this.pendentes = new Map(); this.seq = 0; this.filho = null; this.encerrada = false;
  }
  iniciar() {
    if (this.encerrada) throw falha('sessao');
    if (this.filho) return;
    const { plataforma, recursos, empacotado, pai, processoPai, iniciar } = this.opcoes;
    const base = path.join(__dirname.replace(/app\.asar([\\/])/, 'app.asar.unpacked$1'), 'nativo');
    let arquivo, args;
    if (plataforma === 'win32') {
      arquivo = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
      args = ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(base, 'janelas-windows.ps1'), '-Pai', pai(), '-ProcessoPai', String(processoPai)];
    } else if (plataforma === 'darwin') {
      arquivo = path.join(empacotado ? recursos : path.resolve(__dirname, '../../recursos/janelas'), 'retro-janelas-mac'); args = [];
      if (!fs.existsSync(arquivo)) throw falha('auxiliar');
    } else throw falha('plataforma');
    const env = { ...process.env };
    for (const k of Object.keys(env)) if (/^(RETRO_|ELECTRON_|OPENAI_|ANTHROPIC_|CLAUDE_|CODEX_)/.test(k)) delete env[k];
    const filho = iniciar(arquivo, args, { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], env }); this.filho = filho;
    // EOF faz o auxiliar devolver as janelas. Não matar o processo: ele pode estar restaurando uma delas.
    const falhou = () => { if (this.filho !== filho) return; this.filho = null; for (const p of this.pendentes.values()) { clearTimeout(p.timer); p.reject(falha('auxiliar')); } this.pendentes.clear(); };
    filho.on('error', falhou); filho.on('exit', falhou); filho.stdin.on('error', falhou); filho.stderr.resume();
    const linhas = readline.createInterface({ input: filho.stdout });
    linhas.on('line', (linha) => {
      if (linha.length > 1024 * 1024) { falhou(); filho.stdin.end(); return; }
      let r; try { r = JSON.parse(linha); } catch { return; }
      const p = this.pendentes.get(r.id); if (!p) return;
      clearTimeout(p.timer); this.pendentes.delete(r.id);
      if (r.erro) p.reject(falha(r.erro)); else p.resolve(r.dados);
    });
    filho.unref(); filho.stdout.unref?.(); filho.stderr.unref?.(); filho.stdin.unref?.();
  }
  pedir(acao, dados = {}) {
    this.iniciar(); const id = ++this.seq;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pendentes.delete(id); reject(falha('auxiliar')); }, 20000);
      this.pendentes.set(id, { resolve, reject, timer });
      this.filho.stdin.write(JSON.stringify({ id, acao, ...dados }) + '\n');
    });
  }
  encerrar() { this.encerrada = true; this.filho?.stdin.end(); }
}

class JanelasIntegradas {
  constructor({ aplicativos, ponte, plataforma = process.platform, organizar = async () => {}, aoMudar = () => {} }) {
    this.aplicativos = aplicativos; this.ponte = ponte; this.plataforma = plataforma; this.organizar = organizar; this.aoMudar = aoMudar; this.sessoes = new Map(); this.aberturas = new Map(); this.geracao = 0; this.bloqueada = false;
  }
  async info() {
    if (!['win32', 'darwin'].includes(this.plataforma)) return { disponivel: false, modo: null };
    const e = await this.ponte.pedir('estado'); return { disponivel: true, modo: this.plataforma === 'win32' ? 'embutida' : 'acompanhada', permitido: e.permitido !== false };
  }
  async permitir() { if (this.plataforma !== 'darwin') return this.info(); await this.ponte.pedir('permitir'); return this.info(); }
  async abrir(id) {
    if (this.aberturas.has(id)) return this.aberturas.get(id);
    const p = this._abrir(id).finally(() => this.aberturas.delete(id)); this.aberturas.set(id, p); return p;
  }
  async _abrir(id) {
    const a = this.aplicativos.achar(id), alvo = this.aplicativos.alvoIntegracao(id);
    if (!a || a.terminal || !alvo) throw falha('programa');
    const info = await this.info(); if (!info.disponivel) throw falha('plataforma'); if (!info.permitido) throw falha('permissao');
    const existente = [...this.sessoes.values()].find((s) => s.programa === id);
    if (existente) return this.resumo(existente);
    if (this.sessoes.size >= 4) throw falha('programa');
    const geracao = this.geracao;
    await this.aplicativos.abrir(id);
    let janelas = [];
    for (let i = 0; i < 24; i++) {
      if (geracao !== this.geracao) throw falha('sessao');
      janelas = await this.ponte.pedir('listar', { arquivo: alvo });
      if (janelas.length) break;
      await new Promise((r) => setTimeout(r, 250));
    }
    if (geracao !== this.geracao) throw falha('sessao');
    if (!janelas.length) throw falha('ausente');
    const s = { id: crypto.randomUUID(), programa: id, modo: info.modo, janelas: janelas.slice(0, 50), escolhida: null, ultima: null };
    this.sessoes.set(s.id, s); return this.resumo(s);
  }
  resumo(s) { return { id: s.id, programa: s.programa, modo: s.modo, janelas: s.janelas.map((j) => ({ id: j.id, titulo: String(j.titulo || '').slice(0, 300) })), escolhida: s.escolhida }; }
  obter(id) { const s = this.sessoes.get(id); if (!s) throw falha('sessao'); return s; }
  async associar(id, janela, o) {
    const s = this.obter(id); if (!s.janelas.some((j) => j.id === janela) || s.escolhida) throw falha('sessao');
    // Marca antes do await para impedir duas incorporações concorrentes.
    s.escolhida = janela;
    try { const g = s.modo === 'embutida' ? geometria(o) : {}; if (this.bloqueada) g.visivel = false; await this.ponte.pedir('associar', { janela, ...g }); }
    catch (e) { s.escolhida = null; throw e; }
    return this.resumo(s);
  }
  async atualizar(id, o) {
    const s = this.obter(id); if (!s.escolhida) return;
    if (s.modo !== 'embutida') return;
    const g = geometria(o); if (this.bloqueada) g.visivel = false;
    const chave = JSON.stringify(g); if (s.ultima === chave) return;
    await this.ponte.pedir('posicionar', { janela: s.escolhida, ...g }); s.ultima = chave;
  }
  async acao(id, acao) {
    if (this.bloqueada) throw falha('sessao');
    const s = this.obter(id); if (!s.escolhida || !['focar', 'minimizar', 'fechar', 'organizar'].includes(acao)) throw falha('sessao');
    if (acao === 'organizar') { if (s.modo !== 'acompanhada') throw falha('programa'); return this.ponte.pedir('organizar', { janela: s.escolhida, ret: await this.organizar() }); }
    return this.ponte.pedir(acao, { janela: s.escolhida });
  }
  async estado(id) { const s = this.obter(id); return s.escolhida ? this.ponte.pedir('consultar', { janela: s.escolhida }) : { aberta: true }; }
  async soltar(id) { const s = this.obter(id); if (s.escolhida) await this.ponte.pedir('soltar', { janela: s.escolhida }); this.sessoes.delete(id); }
  async bloquear(v) { this.bloqueada = !!v; for (const s of this.sessoes.values()) s.ultima = null; if (v && this.plataforma === 'win32' && this.sessoes.size) await this.ponte.pedir('ocultar'); }
  encerrar() { this.geracao++; this.sessoes.clear(); this.ponte.encerrar(); }
}
module.exports = { JanelasIntegradas, PonteNativa, geometria, TEXTOS };
