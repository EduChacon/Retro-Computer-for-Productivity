'use strict';
/*
 * O disco C: do computador retrô é uma pasta comum do computador principal.
 * Tudo o que o usuário salva fica nela, visível fora do programa.
 *
 * Os caminhos internos são relativos à raiz, com "/" ("" é a raiz). A tela
 * mostra "C:\Meus documentos\carta.docx"; a conversão fica na área de trabalho.
 *
 * Nada se perde:
 *  - excluir move para a Lixeira (.lixeira/), com o lugar de origem guardado;
 *  - gravar por cima guarda a versão anterior (.versoes/), até VERSOES_MAX por arquivo;
 *  - a gravação é atômica (arquivo temporário + rename).
 */
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { tr } = require('./idioma');

const LIXEIRA = '.lixeira';
const VERSOES = '.versoes';
const VERSOES_MAX = 20;
const PASTAS_INICIAIS = ['Meus documentos', 'Área de trabalho'];

class ErroDisco extends Error {
  constructor(mensagem, codigo) {
    super(mensagem);
    this.codigo = codigo;
  }
}

/** Nome válido nos três sistemas (sem barras, sem os reservados do Windows). */
function nomeValido(nome) {
  if (typeof nome !== 'string') return false;
  const n = nome.trim();
  if (!n || n === '.' || n === '..' || n.length > 200) return false;
  if (/[\\/:*?"<>|\u0000-\u001f]/.test(n)) return false;
  if (/^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i.test(n)) return false;
  if (/[. ]$/.test(n)) return false; // o Windows apaga ponto e espaço do fim
  return true;
}

/*
 * O atalho de um programa num arquivo (o ".lnk" do Windows): um texto pequeno com a chave do
 * programa do Retro Computer ("craft:wordcraft", "navegador", "nativo:…"). Ele só aponta para os
 * programas que o Retro Computer já conhece: a área de trabalho acha o programa pela chave e
 * nunca roda um caminho escrito no arquivo.
 */
const EXT_ATALHO = '.atalho';
const MAX_ATALHO = 4096;

/** O texto de um arquivo de atalho. */
function textoAtalho(chave) {
  return `[Retro Computer]\r\nPrograma=${chave}\r\n`;
}

/** A chave do programa de um arquivo de atalho, ou null. */
function lerAtalho(texto) {
  const m = /^\s*Programa\s*=\s*([^\r\n]+?)\s*$/im.exec(String(texto || ''));
  const chave = m ? m[1] : '';
  return chave && chave.length <= 1000 && !/[\x00-\x1f]/.test(chave) ? chave : null;
}

const ehAtalho = (nome) => nome.toLowerCase().endsWith(EXT_ATALHO);

class Disco {
  constructor(raiz) {
    this.raiz = path.resolve(raiz);
  }

  /** Prepara a pasta na primeira vez (as pastas iniciais, no idioma escolhido). */
  async preparar(pastas = PASTAS_INICIAIS) {
    await fsp.mkdir(this.raiz, { recursive: true });
    for (const p of pastas) await fsp.mkdir(path.join(this.raiz, p), { recursive: true });
    await fsp.mkdir(path.join(this.raiz, LIXEIRA), { recursive: true });
    await fsp.mkdir(path.join(this.raiz, VERSOES), { recursive: true });
    if (process.platform === 'win32') {
      // Pastas do sistema ocultas também no Explorador do Windows.
      try { require('node:child_process').execFile('attrib', ['+h', path.join(this.raiz, LIXEIRA)]); } catch { }
      try { require('node:child_process').execFile('attrib', ['+h', path.join(this.raiz, VERSOES)]); } catch { }
    }
  }

  /** Normaliza um caminho interno e recusa o que sair da raiz. */
  normalizar(rel, { sistema = false } = {}) {
    if (rel == null) rel = '';
    if (typeof rel !== 'string') throw new ErroDisco(tr('Caminho inválido.'), 'invalido');
    const partes = [];
    for (const p of rel.replace(/\\/g, '/').split('/')) {
      if (!p || p === '.') continue;
      if (p === '..') throw new ErroDisco(tr('Caminho fora do disco.'), 'fora');
      partes.push(p);
    }
    if (!sistema && partes.length && (partes[0] === LIXEIRA || partes[0] === VERSOES)) {
      throw new ErroDisco(tr('Pasta reservada do sistema.'), 'reservado');
    }
    return partes.join('/');
  }

  real(rel, opcoes) {
    const n = this.normalizar(rel, opcoes);
    const r = path.resolve(this.raiz, n);
    if (r !== this.raiz && !r.startsWith(this.raiz + path.sep)) throw new ErroDisco(tr('Caminho fora do disco.'), 'fora');
    if (r !== this.raiz) this.semLinksParaFora(r);
    return r;
  }

  /**
   * O caminho, seguindo os links que já existem, continua no disco: um link (mesmo encadeado em
   * outros, ou quebrado à espera de o alvo existir) não leva para fora dele.
   */
  semLinksParaFora(r) {
    let raizReal;
    try { raizReal = fs.realpathSync.native(this.raiz); } catch { return; }
    const noDisco = (x) => x === raizReal || x.startsWith(raizReal + path.sep) || x === this.raiz || x.startsWith(this.raiz + path.sep);
    const fora = () => new ErroDisco(tr('Caminho fora do disco.'), 'fora');
    for (let p = r; p !== this.raiz && p.startsWith(this.raiz + path.sep); p = path.dirname(p)) {
      let real;
      try {
        real = fs.realpathSync.native(p);
      } catch {
        // Ainda não existe (vai ser criado) ou é um link quebrado: o alvo do link quebrado também conta.
        let st = null;
        try { st = fs.lstatSync(p); } catch { }
        if (st && st.isSymbolicLink()) {
          const alvo = path.resolve(path.dirname(p), fs.readlinkSync(p));
          if (!noDisco(alvo)) throw fora();
        }
        continue;
      }
      if (!noDisco(real)) throw fora();
      return;
    }
  }

  async existe(rel) {
    try { await fsp.access(this.real(rel)); return true; } catch { return false; }
  }

  async info(rel) {
    const n = this.normalizar(rel);
    const st = await fsp.stat(this.real(n));
    return { rel: n, nome: n ? path.posix.basename(n) : '', pasta: st.isDirectory(), tamanho: st.size, modificado: st.mtimeMs, criado: st.birthtimeMs };
  }

  async listar(rel = '', { ocultos = false } = {}) {
    const n = this.normalizar(rel);
    const pasta = this.real(n);
    const entradas = await fsp.readdir(pasta, { withFileTypes: true });
    const itens = [];
    for (const e of entradas) {
      if (!ocultos && e.name.startsWith('.')) continue;
      if (/^(desktop\.ini|thumbs\.db)$/i.test(e.name)) continue;
      const relItem = n ? `${n}/${e.name}` : e.name;
      try {
        const st = await fsp.stat(path.join(pasta, e.name));
        const item = { rel: relItem, nome: e.name, pasta: st.isDirectory(), tamanho: st.size, modificado: st.mtimeMs };
        // O atalho de um programa já vem com a chave dele (para o ícone e o nome do programa).
        if (!item.pasta && ehAtalho(e.name) && st.size <= MAX_ATALHO) {
          item.atalho = lerAtalho(await fsp.readFile(path.join(pasta, e.name), 'utf8').catch(() => ''));
        }
        itens.push(item);
      } catch { /* link quebrado ou sem acesso */ }
    }
    itens.sort((a, b) => (b.pasta - a.pasta) || a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base', numeric: true }));
    return itens;
  }

  async ler(rel) {
    return fsp.readFile(this.real(rel));
  }

  /** A chave do programa de um arquivo de atalho do disco, ou null. */
  async lerAtalho(rel) {
    const n = this.normalizar(rel);
    if (!ehAtalho(n)) return null;
    const st = await fsp.stat(this.real(n));
    if (st.size > MAX_ATALHO) return null;
    return lerAtalho(await fsp.readFile(this.real(n), 'utf8'));
  }

  /** Cria o atalho de um programa numa pasta ("Calculadora.atalho", ou "Calculadora (2).atalho"). */
  async criarAtalho(relPai, nome, chave) {
    if (!lerAtalho(textoAtalho(chave))) throw new ErroDisco(tr('Nome de arquivo vazio.'), 'invalido');
    // Os sinais que os sistemas não aceitam num nome viram espaço.
    const limpo = String(nome || '').replace(/[\\/:*?"<>|\x00-\x1f]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\.+/, '') || 'Atalho';
    const pai = this.normalizar(relPai);
    const livre = await this.nomeLivre(pai, limpo + EXT_ATALHO);
    return this.gravar(pai ? `${pai}/${livre}` : livre, Buffer.from(textoAtalho(chave), 'utf8'));
  }

  /** Grava o arquivo; se ele já existir, a versão anterior vai para .versoes/. */
  async gravar(rel, dados, { versao = true } = {}) {
    const n = this.normalizar(rel);
    if (!n) throw new ErroDisco(tr('Nome de arquivo vazio.'), 'invalido');
    const nome = path.posix.basename(n);
    if (!nomeValido(nome)) throw new ErroDisco(tr('O nome "{nome}" não é válido.', { nome }), 'nome');
    const destino = this.real(n);
    await fsp.mkdir(path.dirname(destino), { recursive: true });
    let anterior = null;
    try { anterior = await fsp.stat(destino); } catch { }
    if (anterior && anterior.isDirectory()) throw new ErroDisco(tr('Já existe uma pasta com esse nome.'), 'existe');
    if (anterior && versao) await this.guardarVersao(n);
    const tmp = path.join(path.dirname(destino), `.~${nome}.${process.pid}.${Date.now()}.tmp`);
    await fsp.writeFile(tmp, Buffer.from(dados));
    await fsp.rename(tmp, destino);
    return this.info(n);
  }

  async criarPasta(relPai, nome) {
    if (!nomeValido(nome)) throw new ErroDisco(tr('O nome "{nome}" não é válido.', { nome }), 'nome');
    const pai = this.normalizar(relPai);
    const n = pai ? `${pai}/${nome.trim()}` : nome.trim();
    if (await this.existe(n)) throw new ErroDisco(tr('Já existe "{nome}" nesta pasta.', { nome }), 'existe');
    await fsp.mkdir(this.real(n));
    return this.info(n);
  }

  /** Um nome livre na pasta: "Nova pasta", "Nova pasta (2)"… */
  async nomeLivre(relPai, nome) {
    const pai = this.normalizar(relPai);
    const ext = path.extname(nome);
    const base = ext && !nome.startsWith('.') ? nome.slice(0, -ext.length) : nome;
    const usar = ext && !nome.startsWith('.') ? ext : '';
    for (let i = 1; i < 10000; i++) {
      const tent = i === 1 ? nome : `${base} (${i})${usar}`;
      if (!(await this.existe(pai ? `${pai}/${tent}` : tent))) return tent;
    }
    throw new ErroDisco(tr('Não foi possível achar um nome livre.'), 'existe');
  }

  async renomear(rel, novoNome) {
    const n = this.normalizar(rel);
    if (!n) throw new ErroDisco(tr('Não dá para renomear o disco.'), 'invalido');
    if (!nomeValido(novoNome)) throw new ErroDisco(tr('O nome "{nome}" não é válido.', { nome: novoNome }), 'nome');
    const pai = path.posix.dirname(n) === '.' ? '' : path.posix.dirname(n);
    const novo = pai ? `${pai}/${novoNome.trim()}` : novoNome.trim();
    if (novo === n) return this.info(n);
    // Trocar só maiúsculas e minúsculas é permitido (o sistema pode não distinguir).
    if (novo.toLowerCase() !== n.toLowerCase() && await this.existe(novo)) {
      throw new ErroDisco(tr('Já existe "{nome}" nesta pasta.', { nome: novoNome }), 'existe');
    }
    await fsp.rename(this.real(n), this.real(novo));
    await this.moverVersoes(n, novo);
    return this.info(novo);
  }

  async mover(rel, relDestino) {
    const n = this.normalizar(rel);
    const d = this.normalizar(relDestino);
    if (!n) throw new ErroDisco(tr('Não dá para mover o disco.'), 'invalido');
    if (d === n || d.startsWith(n + '/')) throw new ErroDisco(tr('Não dá para mover uma pasta para dentro dela mesma.'), 'invalido');
    const nome = await this.nomeLivre(d, path.posix.basename(n));
    const novo = d ? `${d}/${nome}` : nome;
    await fsp.rename(this.real(n), this.real(novo));
    await this.moverVersoes(n, novo);
    return this.info(novo);
  }

  async copiar(rel, relDestino) {
    const n = this.normalizar(rel);
    const d = this.normalizar(relDestino);
    if (d === n || d.startsWith(n + '/')) throw new ErroDisco(tr('Não dá para copiar uma pasta para dentro dela mesma.'), 'invalido');
    const nome = await this.nomeLivre(d, path.posix.basename(n));
    const novo = d ? `${d}/${nome}` : nome;
    await fsp.cp(this.real(n), this.real(novo), { recursive: true, errorOnExist: true, force: false });
    return this.info(novo);
  }

  /** Traz arquivos e pastas do computador principal (arrastados para a janela). */
  async importar(caminhosExternos, relDestino) {
    const d = this.normalizar(relDestino);
    const feitos = [];
    for (const ext of caminhosExternos) {
      const origem = path.resolve(ext);
      if (origem === this.raiz || origem.startsWith(this.raiz + path.sep)) {
        // Já está no disco: vira um mover dentro do disco.
        const rel = path.relative(this.raiz, origem).split(path.sep).join('/');
        if (path.posix.dirname(rel) === (d || '.')) continue;
        feitos.push(await this.mover(rel, d));
        continue;
      }
      const nome = await this.nomeLivre(d, path.basename(origem));
      const novo = d ? `${d}/${nome}` : nome;
      await fsp.cp(origem, this.real(novo), { recursive: true, errorOnExist: true, force: false });
      feitos.push(await this.info(novo));
    }
    return feitos;
  }

  /** Leva arquivos do disco para uma pasta do computador principal. */
  async exportar(rels, pastaExterna) {
    const feitos = [];
    for (const rel of rels) {
      const n = this.normalizar(rel);
      if (!n) continue;
      let nome = path.posix.basename(n);
      let alvo = path.join(pastaExterna, nome);
      const ext = path.extname(nome);
      for (let i = 2; fs.existsSync(alvo); i++) alvo = path.join(pastaExterna, `${path.basename(nome, ext)} (${i})${ext}`);
      await fsp.cp(this.real(n), alvo, { recursive: true, errorOnExist: true, force: false });
      if (this.aoExportar) await this.aoExportar(this.real(n), alvo);
      feitos.push(alvo);
    }
    return feitos;
  }

  /** Procura arquivos e pastas pelo nome (sem as pastas do sistema). */
  async buscar(termo, { pasta = '', max = 300 } = {}) {
    const t = String(termo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const achados = [];
    const fila = [this.normalizar(pasta)];
    let vistos = 0;
    while (fila.length && achados.length < max && vistos < 20000) {
      const atual = fila.shift();
      let itens = [];
      try { itens = await this.listar(atual); } catch { continue; }
      for (const it of itens) {
        vistos++;
        const nome = it.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (!t || nome.includes(t)) achados.push(it);
        if (it.pasta) fila.push(it.rel);
        if (achados.length >= max) break;
      }
    }
    return achados;
  }

  /* ---------- Lixeira ---------- */

  async paraLixeira(rel) {
    const n = this.normalizar(rel);
    if (!n) throw new ErroDisco(tr('Não dá para excluir o disco.'), 'invalido');
    const id = `${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
    const pasta = path.join(this.raiz, LIXEIRA, id);
    await fsp.mkdir(pasta, { recursive: true });
    const nome = path.posix.basename(n);
    const st = await fsp.stat(this.real(n));
    await fsp.rename(this.real(n), path.join(pasta, nome));
    const meta = { id, nome, origem: n, apagadoEm: Date.now(), pasta: st.isDirectory(), tamanho: st.size };
    await fsp.writeFile(path.join(this.raiz, LIXEIRA, `${id}.json`), JSON.stringify(meta, null, 1));
    return meta;
  }

  async listarLixeira() {
    const pasta = path.join(this.raiz, LIXEIRA);
    let nomes = [];
    try { nomes = await fsp.readdir(pasta); } catch { return []; }
    const itens = [];
    for (const f of nomes) {
      if (!f.endsWith('.json')) continue;
      try {
        const meta = JSON.parse(await fsp.readFile(path.join(pasta, f), 'utf8'));
        if (fs.existsSync(path.join(pasta, meta.id, meta.nome))) itens.push(meta);
      } catch { }
    }
    itens.sort((a, b) => b.apagadoEm - a.apagadoEm);
    return itens;
  }

  async restaurar(id) {
    if (!/^[a-z0-9-]+$/.test(id)) throw new ErroDisco(tr('Item inválido.'), 'invalido');
    const pasta = path.join(this.raiz, LIXEIRA);
    const meta = JSON.parse(await fsp.readFile(path.join(pasta, `${id}.json`), 'utf8'));
    let pai = path.posix.dirname(meta.origem);
    if (pai === '.') pai = '';
    await fsp.mkdir(this.real(pai), { recursive: true });
    const nome = await this.nomeLivre(pai, meta.nome);
    const destino = pai ? `${pai}/${nome}` : nome;
    await fsp.rename(path.join(pasta, id, meta.nome), this.real(destino));
    await fsp.rm(path.join(pasta, id), { recursive: true, force: true });
    await fsp.rm(path.join(pasta, `${id}.json`), { force: true });
    return this.info(destino);
  }

  /** Apaga de vez (só a pedido do usuário: "Esvaziar Lixeira" ou "Excluir" dentro dela). */
  async apagarDaLixeira(id) {
    if (!/^[a-z0-9-]+$/.test(id)) throw new ErroDisco(tr('Item inválido.'), 'invalido');
    const pasta = path.join(this.raiz, LIXEIRA);
    await fsp.rm(path.join(pasta, id), { recursive: true, force: true });
    await fsp.rm(path.join(pasta, `${id}.json`), { force: true });
  }

  async esvaziarLixeira() {
    for (const m of await this.listarLixeira()) await this.apagarDaLixeira(m.id);
  }

  /* ---------- Versões ---------- */

  pastaVersoes(n) {
    return path.join(this.raiz, VERSOES, ...n.split('/'));
  }

  async guardarVersao(n) {
    const pasta = this.pastaVersoes(n);
    await fsp.mkdir(pasta, { recursive: true });
    const st = await fsp.stat(this.real(n));
    const marca = new Date(st.mtimeMs).toISOString().replace(/[:.]/g, '-');
    let destino = path.join(pasta, `${marca}${path.extname(n)}`);
    if (fs.existsSync(destino)) destino = path.join(pasta, `${marca}-${Date.now()}${path.extname(n)}`);
    await fsp.copyFile(this.real(n), destino);
    const todas = (await fsp.readdir(pasta)).sort();
    for (const velha of todas.slice(0, Math.max(0, todas.length - VERSOES_MAX))) {
      await fsp.rm(path.join(pasta, velha), { force: true });
    }
  }

  async versoes(rel) {
    const n = this.normalizar(rel);
    const pasta = this.pastaVersoes(n);
    let nomes = [];
    try { nomes = await fsp.readdir(pasta); } catch { return []; }
    const lista = [];
    for (const v of nomes) {
      const st = await fsp.stat(path.join(pasta, v));
      if (st.isFile()) lista.push({ id: v, tamanho: st.size, modificado: st.mtimeMs });
    }
    return lista.sort((a, b) => b.modificado - a.modificado);
  }

  async restaurarVersao(rel, id) {
    const n = this.normalizar(rel);
    if (!/^[\w.-]+$/.test(id)) throw new ErroDisco(tr('Versão inválida.'), 'invalido');
    const origem = path.join(this.pastaVersoes(n), id);
    const dados = await fsp.readFile(origem);
    return this.gravar(n, dados, { versao: true });
  }

  async moverVersoes(de, para) {
    const a = this.pastaVersoes(de);
    if (!fs.existsSync(a)) return;
    const b = this.pastaVersoes(para);
    await fsp.mkdir(path.dirname(b), { recursive: true });
    try { await fsp.rename(a, b); } catch { }
  }

  /**
   * As versões anteriores guardadas há mais de "dias" dias (pela data do nome, que é a da versão;
   * sem ela, pela do arquivo).
   */
  async versoesAntigas(dias = 30) {
    const limite = Date.now() - dias * 86400000;
    const r = [];
    const pilha = [path.join(this.raiz, VERSOES)];
    while (pilha.length) {
      const atual = pilha.pop();
      let itens = [];
      try { itens = await fsp.readdir(atual, { withFileTypes: true }); } catch { continue; }
      for (const d of itens) {
        const c = path.join(atual, d.name);
        if (d.isDirectory()) { pilha.push(c); continue; }
        if (!d.isFile()) continue;
        try {
          const st = await fsp.lstat(c);
          const m = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/.exec(d.name);
          const quando = m ? Date.parse(`${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]}Z`) : st.mtimeMs;
          if (quando < limite) r.push({ arquivo: c, tamanho: st.size });
        } catch { }
      }
    }
    return r;
  }

  /** Apaga as versões anteriores com mais de "dias" dias (só a pedido do usuário, na limpeza do disco). */
  async apagarVersoesAntigas(dias = 30) {
    let liberado = 0;
    const lista = await this.versoesAntigas(dias);
    for (const v of lista) {
      await fsp.rm(v.arquivo, { force: true });
      liberado += v.tamanho;
    }
    // As pastas que ficaram vazias saem também (das mais fundas para cima).
    const vazias = async (p) => {
      let itens = [];
      try { itens = await fsp.readdir(p, { withFileTypes: true }); } catch { return; }
      for (const d of itens) if (d.isDirectory()) await vazias(path.join(p, d.name));
      if (p !== path.join(this.raiz, VERSOES)) await fsp.rmdir(p).catch(() => { });
    };
    await vazias(path.join(this.raiz, VERSOES));
    return { n: lista.length, liberado };
  }

  /* ---------- Diversos ---------- */

  /**
   * O que ocupa o disco C: (o programa Discos): cada pasta de cima, os arquivos soltos na raiz, a
   * Lixeira e as versões anteriores (as de mais de "dias" dias à parte, as que a limpeza apaga).
   */
  async uso({ dias = 30, max = 500000 } = {}) {
    let vistos = 0;
    const medir = async (p) => {
      let total = 0;
      const pilha = [p];
      while (pilha.length && vistos < max) {
        const atual = pilha.pop();
        let itens = [];
        try { itens = await fsp.readdir(atual, { withFileTypes: true }); } catch { continue; }
        vistos += itens.length;
        const tamanhos = await Promise.all(itens.map(async (d) => {
          const c = path.join(atual, d.name);
          if (d.isDirectory()) { pilha.push(c); return 0; }
          try { return (await fsp.lstat(c)).size; } catch { return 0; }
        }));
        for (const t of tamanhos) total += t;
      }
      return total;
    };
    const pastas = [];
    let soltos = 0;
    for (const d of await fsp.readdir(this.raiz, { withFileTypes: true }).catch(() => [])) {
      if (d.name === LIXEIRA || d.name === VERSOES) continue;
      const c = path.join(this.raiz, d.name);
      if (d.isDirectory()) pastas.push({ nome: d.name, tamanho: await medir(c), oculta: d.name.startsWith('.') });
      else { try { soltos += (await fsp.lstat(c)).size; } catch { } }
    }
    pastas.sort((a, b) => b.tamanho - a.tamanho);
    const lixeira = await medir(path.join(this.raiz, LIXEIRA));
    const versoes = await medir(path.join(this.raiz, VERSOES));
    const velhas = await this.versoesAntigas(dias);
    const total = pastas.reduce((s, p) => s + p.tamanho, 0) + soltos + lixeira + versoes;
    return { total, pastas, soltos, lixeira, versoes, antigas: velhas.reduce((s, v) => s + v.tamanho, 0), nAntigas: velhas.length, incompleto: vistos >= max };
  }

  async espaco() {
    try {
      const s = await fsp.statfs(this.raiz);
      return { total: s.blocks * s.bsize, livre: s.bavail * s.bsize };
    } catch {
      return { total: 0, livre: 0 };
    }
  }

  /**
   * Avisa quais pastas mudaram (para as janelas abertas se atualizarem) e, a cada aviso do
   * sistema, qual arquivo (aoArquivo, para o Diário de trabalho).
   */
  observar(aoMudar, aoArquivo = null) {
    const pendentes = new Set();
    let timer = null;
    let w;
    try {
      w = fs.watch(this.raiz, { recursive: true }, (_ev, arquivo) => {
        if (!arquivo) return;
        const rel = String(arquivo).split(path.sep).join('/');
        if (rel.startsWith(LIXEIRA)) pendentes.add('::lixeira');
        else if (rel.startsWith(VERSOES) || path.posix.basename(rel).startsWith('.~')) return;
        else {
          pendentes.add(path.posix.dirname(rel) === '.' ? '' : path.posix.dirname(rel));
          if (aoArquivo) aoArquivo(rel);
        }
        clearTimeout(timer);
        timer = setTimeout(() => {
          const lista = [...pendentes];
          pendentes.clear();
          aoMudar(lista);
        }, 250);
      });
    } catch {
      return () => { };
    }
    return () => { clearTimeout(timer); w.close(); };
  }
}

module.exports = { Disco, ErroDisco, nomeValido, lerAtalho, textoAtalho, EXT_ATALHO, LIXEIRA, VERSOES, VERSOES_MAX, PASTAS_INICIAIS };
