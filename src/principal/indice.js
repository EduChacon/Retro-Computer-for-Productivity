/*
 * A busca pelo conteúdo dos arquivos do disco C:, como a do Windows e o Spotlight: o texto de cada
 * documento fica guardado na pasta de dados do usuário (indice/), e a busca procura nele. O índice se
 * refaz aos poucos, um arquivo por vez e devagar, quando o disco muda (só o que mudou de data ou de
 * tamanho é lido de novo). O texto é tirado no processo de trabalho (extrair-texto.js). Nada sai do
 * computador, e desligar a busca pelo conteúdo apaga o índice.
 */
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { EXTS } = require('./extrair-texto');

const VERSAO = 1;
const MAX_ARQUIVO = 50 * 1024 * 1024; // os maiores ficam de fora
const MAX_ARQUIVOS = 20000;
const MEMORIA = 20 * 1000 * 1000; // os caracteres guardados na memória para a busca ser rápida
const PAUSA_MS = 25; // entre um arquivo e outro, para não pesar no computador
const ESPERA_MS = 15 * 1000; // depois de uma mudança no disco, antes de olhar de novo

const SEM_ACENTO = new Map();
function semAcento(c) {
  let r = SEM_ACENTO.get(c);
  if (r === undefined) {
    r = c.normalize('NFD')[0] || c;
    SEM_ACENTO.set(c, r);
  }
  return r;
}

/**
 * Minúsculas e sem acentos, um caractere por um: o texto normalizado tem o mesmo tamanho do
 * original, e o trecho mostrado sai do mesmo lugar. (O "İ" é o único que vira dois em minúscula.)
 */
const normalizar = (s) => String(s).replace(/\u0130/g, 'I').toLowerCase().replace(/[^\x00-\x7f]/g, semAcento);

/** As palavras de uma busca (as aspas juntam uma frase: "prazo de 15 dias"). */
function palavrasDe(termo) {
  const lista = [];
  for (const m of normalizar(String(termo || '').slice(0, 200)).matchAll(/"([^"]+)"|(\S+)/g)) {
    const p = (m[1] || m[2] || '').trim();
    if (p) lista.push(p);
  }
  return lista.slice(0, 8);
}

/** O trecho do texto em volta da primeira palavra achada, numa linha só. */
function trecho(original, normal, palavras) {
  let i = -1;
  let p = '';
  for (const w of palavras) {
    const k = normal.indexOf(w);
    if (k >= 0 && (i < 0 || k < i)) { i = k; p = w; }
  }
  if (i < 0) return '';
  let ini = Math.max(0, i - 50);
  // Começa numa palavra inteira (o primeiro espaço depois do corte, se estiver perto).
  if (ini > 0) { const e = original.slice(ini, i).search(/\s/); if (e >= 0 && e < 20) ini += e + 1; }
  const fim = Math.min(original.length, i + p.length + 90);
  return (ini > 0 ? '…' : '') + original.slice(ini, fim).replace(/\s+/g, ' ').trim() + (fim < original.length ? '…' : '');
}

const extDe = (nome) => path.posix.extname(nome).slice(1).toLowerCase();

class Indice {
  constructor({ disco, trabalhos, pasta, ligado = true }) {
    this.disco = disco;
    this.trabalhos = trabalhos;
    this.pasta = pasta;
    this.ligado = ligado;
    this.itens = new Map(); // rel → { m, t, id }
    this.normais = new Map(); // rel → texto normalizado (os que couberem na memória)
    this.naMemoria = 0;
    this.fila = [];
    this.naFila = new Set();
    this.trabalhando = false;
    this.olhando = false;
    this.relogio = null;
    this.mudouManifesto = false;
    this.carregado = null;
  }

  arquivoManifesto() { return path.join(this.pasta, 'manifesto.json'); }
  arquivoTexto(id) { return path.join(this.pasta, 't', id + '.txt'); }

  async carregar() {
    if (!this.carregado) {
      this.carregado = (async () => {
        try {
          const j = JSON.parse(await fsp.readFile(this.arquivoManifesto(), 'utf8'));
          if (j.v === VERSAO && j.itens && typeof j.itens === 'object') {
            for (const [rel, [m, t, id]] of Object.entries(j.itens)) this.itens.set(rel, { m, t, id });
          }
        } catch { /* sem índice ainda */ }
      })();
    }
    return this.carregado;
  }

  async gravarManifesto() {
    if (!this.mudouManifesto) return;
    this.mudouManifesto = false;
    const itens = {};
    for (const [rel, x] of this.itens) itens[rel] = [x.m, x.t, x.id];
    await fsp.mkdir(this.pasta, { recursive: true });
    const tmp = this.arquivoManifesto() + '.tmp';
    await fsp.writeFile(tmp, JSON.stringify({ v: VERSAO, itens }));
    await fsp.rename(tmp, this.arquivoManifesto());
  }

  /** Liga ou desliga; desligar apaga o índice (é só uma cópia do texto dos arquivos). */
  async ligar(v) {
    this.ligado = !!v;
    if (this.ligado) return this.agendar(2000);
    clearTimeout(this.relogio);
    this.fila = [];
    this.naFila.clear();
    this.itens.clear();
    this.normais.clear();
    this.naMemoria = 0;
    this.carregado = Promise.resolve();
    await fsp.rm(this.pasta, { recursive: true, force: true }).catch(() => { });
  }

  /** Olhar o disco daqui a pouco (na abertura e depois de cada mudança). */
  agendar(ms = ESPERA_MS) {
    if (!this.ligado) return;
    clearTimeout(this.relogio);
    this.relogio = setTimeout(() => this.olhar().catch(() => { }), ms);
    if (this.relogio.unref) this.relogio.unref();
  }

  /** Percorre o disco e põe na fila o que é novo ou mudou; tira do índice o que sumiu. */
  async olhar() {
    if (!this.ligado || this.olhando) return;
    this.olhando = true;
    try {
      await this.carregar();
      const vistos = new Set();
      const fila = [''];
      while (fila.length && vistos.size < MAX_ARQUIVOS) {
        const atual = fila.shift();
        let itens = [];
        try { itens = await this.disco.listar(atual); } catch { continue; }
        for (const it of itens) {
          if (it.pasta) { fila.push(it.rel); continue; }
          if (!EXTS.has(extDe(it.nome)) || it.tamanho > MAX_ARQUIVO || it.tamanho === 0) continue;
          vistos.add(it.rel);
          const x = this.itens.get(it.rel);
          if ((!x || x.m !== Math.round(it.modificado) || x.t !== it.tamanho) && !this.naFila.has(it.rel)) {
            this.naFila.add(it.rel);
            this.fila.push({ rel: it.rel, m: Math.round(it.modificado), t: it.tamanho });
          }
        }
      }
      for (const rel of [...this.itens.keys()]) if (!vistos.has(rel)) await this.esquecer(rel);
      await this.gravarManifesto();
    } finally {
      this.olhando = false;
    }
    this.trabalhar();
    return this.emTrabalho;
  }

  async esquecer(rel) {
    const x = this.itens.get(rel);
    if (!x) return;
    this.itens.delete(rel);
    this.mudouManifesto = true;
    const n = this.normais.get(rel);
    if (n != null) { this.naMemoria -= n.length; this.normais.delete(rel); }
    if (x.id) await fsp.rm(this.arquivoTexto(x.id), { force: true }).catch(() => { });
  }

  /** Lê os arquivos da fila, um por vez e devagar (a promessa termina quando a fila acaba). */
  trabalhar() {
    if (this.trabalhando) return this.emTrabalho;
    this.trabalhando = true;
    this.emTrabalho = (async () => {
      try {
        let feitos = 0;
        while (this.ligado && this.fila.length) {
          const f = this.fila.shift();
          this.naFila.delete(f.rel);
          await this.indexar(f).catch(() => { });
          if (++feitos % 25 === 0) await this.gravarManifesto().catch(() => { });
          await new Promise((ok) => setTimeout(ok, PAUSA_MS));
        }
        await this.gravarManifesto().catch(() => { });
      } finally {
        this.trabalhando = false;
      }
    })();
    return this.emTrabalho;
  }

  async indexar({ rel, m, t }) {
    let texto = '';
    try {
      const bytes = await this.disco.ler(rel);
      texto = String(await this.trabalhos.executar('texto:extrair', { bytes, ext: extDe(rel) }, { tempo: 90 * 1000 }) || '');
    } catch { texto = ''; }
    await this.esquecer(rel);
    // O que não deu texto também fica anotado (com a data e o tamanho), para não ser lido de novo.
    let id = null;
    if (texto) {
      id = crypto.createHash('sha1').update(rel + '\0' + m).digest('hex').slice(0, 20);
      await fsp.mkdir(path.dirname(this.arquivoTexto(id)), { recursive: true });
      await fsp.writeFile(this.arquivoTexto(id), texto);
    }
    this.itens.set(rel, { m, t, id });
    this.mudouManifesto = true;
    if (texto && this.naMemoria + texto.length <= MEMORIA && this.normaisProntos) {
      this.normais.set(rel, normalizar(texto));
      this.naMemoria += texto.length;
    }
  }

  /** Os textos normalizados na memória (até o limite), lidos na primeira busca. */
  async prepararMemoria() {
    if (this.normaisProntos) return;
    for (const [rel, x] of this.itens) {
      if (!x.id || this.normais.has(rel)) continue;
      const t = await fsp.readFile(this.arquivoTexto(x.id), 'utf8').catch(() => '');
      if (this.naMemoria + t.length > MEMORIA) break;
      this.normais.set(rel, normalizar(t));
      this.naMemoria += t.length;
    }
    this.normaisProntos = true;
  }

  /** { arquivos, comTexto, faltam, ligado } */
  async estado() {
    await this.carregar();
    let comTexto = 0;
    for (const x of this.itens.values()) if (x.id) comTexto++;
    return { ligado: this.ligado, arquivos: this.itens.size, comTexto, faltam: this.fila.length };
  }

  /**
   * Os arquivos que têm todas as palavras no texto: [{ rel, nome, trecho, tamanho, modificado }],
   * os mais recentes primeiro. pasta: só dentro dela.
   */
  async buscar(termo, { pasta = '', max = 50 } = {}) {
    if (!this.ligado) return [];
    const palavras = palavrasDe(termo).filter((p) => p.length >= 2);
    if (!palavras.length) return [];
    await this.carregar();
    await this.prepararMemoria();
    const dentro = this.disco.normalizar(String(pasta || ''));
    const achados = [];
    for (const [rel, x] of this.itens) {
      if (!x.id) continue;
      if (dentro && !rel.startsWith(dentro + '/')) continue;
      let normal = this.normais.get(rel);
      let original = null;
      if (normal == null) {
        original = await fsp.readFile(this.arquivoTexto(x.id), 'utf8').catch(() => '');
        normal = normalizar(original);
      }
      if (!palavras.every((p) => normal.includes(p))) continue;
      if (original == null) original = await fsp.readFile(this.arquivoTexto(x.id), 'utf8').catch(() => '');
      achados.push({ rel, nome: path.posix.basename(rel), trecho: trecho(original, normal, palavras), tamanho: x.t, modificado: x.m });
      if (achados.length >= max * 4) break;
    }
    achados.sort((a, b) => b.modificado - a.modificado);
    return achados.slice(0, max);
  }
}

module.exports = { Indice, normalizar, palavrasDe, trecho };
