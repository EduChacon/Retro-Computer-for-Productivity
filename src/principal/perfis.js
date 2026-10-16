'use strict';
/*
 * Os vários perfis (usuários) do Retro Computer: cada um com a pasta de dados própria (as
 * configurações, a senha da tela de bloqueio, os favoritos e os cookies do Navegador, o Diário)
 * e o disco C: próprio. O perfil de sempre é o "principal": continua com a pasta de dados e o
 * disco de antes. Os outros ficam em <dados>/perfis/<id>, com o disco "Retro Computer - <nome>"
 * ao lado do disco principal ("Disco C - <nome>" no modo portátil). Os programas instalados são
 * de todos (como no Windows).
 *
 * Tirar um perfil só o tira da lista: a pasta de dados e o disco dele ficam onde estão.
 * O registro (perfis.json) e a "próxima abertura" (abertura.json: quem entra depois de trocar de
 * usuário ou de fazer logoff) ficam na pasta de dados principal.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PRINCIPAL = 'principal';
/** A "próxima abertura" só vale logo depois de pedida (uma troca de usuário que não abriu não vale para sempre). */
const VALIDADE_ABERTURA = 2 * 60 * 1000;
const MAX_NOME = 40;

/** O nome do usuário: sem caracteres de controle nem espaços sobrando, até 40 caracteres. */
function limparNome(nome) {
  return String(nome == null ? '' : nome).replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_NOME);
}

/** Um nome que serve de pasta em qualquer sistema (sem / \ : * ? " < > |, sem ponto ou espaço no fim, sem os nomes reservados do Windows). */
function nomeDePasta(nome) {
  let n = limparNome(nome).replace(/[<>:"/\\|?*]/g, '').replace(/[. ]+$/, '').replace(/^\.+/, '').trim();
  if (/^(con|prn|aux|nul|com\d|lpt\d)$/i.test(n)) n = '_' + n;
  return n || 'Usuario';
}

/** Grava sem deixar o arquivo pela metade (um arquivo novo e a troca de nome), só para o usuário ler. */
function gravarJson(arquivo, valor) {
  fs.mkdirSync(path.dirname(arquivo), { recursive: true });
  const tmp = `${arquivo}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(valor, null, 1), { mode: 0o600 });
  fs.renameSync(tmp, arquivo);
}

function lerJson(arquivo) {
  try { return JSON.parse(fs.readFileSync(arquivo, 'utf8')); } catch { return null; }
}

class Perfis {
  /** @param {string} base a pasta de dados principal (a do perfil principal) */
  constructor(base) {
    this.base = base;
    this.arquivo = path.join(base, 'perfis.json');
    this.arquivoAbertura = path.join(base, 'abertura.json');
  }

  /** O registro, sempre com o principal primeiro e sem entradas estragadas. */
  ler() {
    const r = lerJson(this.arquivo) || {};
    const vistos = new Set();
    const perfis = [];
    const principal = (Array.isArray(r.perfis) ? r.perfis : []).find((p) => p && p.id === PRINCIPAL) || {};
    perfis.push({ id: PRINCIPAL, nome: limparNome(principal.nome) });
    vistos.add(PRINCIPAL);
    for (const p of Array.isArray(r.perfis) ? r.perfis : []) {
      if (!p || typeof p.id !== 'string' || !/^u[0-9a-f]{8}$/.test(p.id) || vistos.has(p.id)) continue;
      const nome = limparNome(p.nome);
      if (!nome) continue;
      vistos.add(p.id);
      perfis.push({ id: p.id, nome, pasta: nomeDePasta(p.pasta || nome) });
    }
    const ultimo = vistos.has(r.ultimo) ? r.ultimo : PRINCIPAL;
    return { perfis, ultimo, perguntar: r.perguntar !== false };
  }

  gravar(r) {
    gravarJson(this.arquivo, { perfis: r.perfis, ultimo: r.ultimo, perguntar: r.perguntar });
  }

  lista() {
    return this.ler().perfis;
  }

  perfil(id) {
    return this.lista().find((p) => p.id === id) || null;
  }

  /** A pasta de dados do perfil. */
  pastaDados(id) {
    return id === PRINCIPAL ? this.base : path.join(this.base, 'perfis', id);
  }

  /**
   * O disco C: padrão do perfil, ao lado do disco padrão principal ("Retro Computer - Ana").
   * O principal fica com o de sempre.
   */
  discoPadrao(id, padrao) {
    if (id === PRINCIPAL) return padrao;
    const p = this.perfil(id);
    if (!p) return null;
    return path.join(path.dirname(padrao), `${path.basename(padrao)} - ${p.pasta}`);
  }

  /** O nome já usado por outro perfil (sem diferença de maiúsculas). */
  nomeUsado(nome, menos) {
    const n = limparNome(nome).toLocaleLowerCase();
    return this.lista().some((p) => p.id !== menos && p.nome && p.nome.toLocaleLowerCase() === n);
  }

  /**
   * Cria um perfil. O disco dele não pode ser o de um perfil tirado antes (que ficou com os
   * arquivos): com o mesmo nome, ganha "(2)", "(3)"…
   * @param {string} padrao o disco padrão principal (para achar o nome livre do disco novo)
   */
  criar(nome, padrao, existe = fs.existsSync) {
    const n = limparNome(nome);
    if (!n) return { ok: false, erro: 'nome' };
    if (this.nomeUsado(n)) return { ok: false, erro: 'repetido' };
    const r = this.ler();
    let id;
    do id = 'u' + crypto.randomBytes(4).toString('hex'); while (r.perfis.some((p) => p.id === id) || existe(this.pastaDados(id)));
    const usadas = new Set(r.perfis.map((p) => (p.pasta || '').toLocaleLowerCase()));
    const base = nomeDePasta(n);
    let pasta = base;
    for (let i = 2; usadas.has(pasta.toLocaleLowerCase()) || (padrao && existe(path.join(path.dirname(padrao), `${path.basename(padrao)} - ${pasta}`))); i++) pasta = `${base} (${i})`;
    const novo = { id, nome: n, pasta };
    r.perfis.push(novo);
    this.gravar(r);
    fs.mkdirSync(this.pastaDados(id), { recursive: true });
    return { ok: true, perfil: novo };
  }

  /** Muda o nome (o disco continua na pasta de antes). O principal também pode ter nome. */
  renomear(id, nome) {
    const n = limparNome(nome);
    const r = this.ler();
    const p = r.perfis.find((x) => x.id === id);
    if (!p) return { ok: false, erro: 'perfil' };
    if (!n && id !== PRINCIPAL) return { ok: false, erro: 'nome' };
    if (n && this.nomeUsado(n, id)) return { ok: false, erro: 'repetido' };
    p.nome = n;
    this.gravar(r);
    return { ok: true, perfil: p };
  }

  /** Tira da lista (nunca o principal nem o que está em uso). Os arquivos ficam. */
  remover(id, emUso) {
    if (id === PRINCIPAL || id === emUso) return { ok: false, erro: 'emUso' };
    const r = this.ler();
    const p = r.perfis.find((x) => x.id === id);
    if (!p) return { ok: false, erro: 'perfil' };
    r.perfis = r.perfis.filter((x) => x.id !== id);
    if (r.ultimo === id) r.ultimo = PRINCIPAL;
    this.gravar(r);
    return { ok: true, perfil: p, dados: this.pastaDados(id) };
  }

  definirUltimo(id) {
    const r = this.ler();
    if (!r.perfis.some((p) => p.id === id) || r.ultimo === id) return;
    r.ultimo = id;
    this.gravar(r);
  }

  definirPerguntar(sim) {
    const r = this.ler();
    r.perguntar = !!sim;
    this.gravar(r);
  }

  /** Quem entra na próxima abertura: a troca de usuário (já com a senha conferida) ou o logoff (a tela de entrada). */
  gravarAbertura({ perfil, entrou = false, logon = false }, agora = Date.now()) {
    gravarJson(this.arquivoAbertura, { perfil, entrou: !!entrou, logon: !!logon, em: agora });
  }

  /** Lê e apaga a "próxima abertura" (só vale uma vez, e logo depois de pedida). */
  lerAbertura(agora = Date.now()) {
    const a = lerJson(this.arquivoAbertura);
    try { fs.unlinkSync(this.arquivoAbertura); } catch { }
    if (!a || typeof a.em !== 'number' || agora - a.em > VALIDADE_ABERTURA || agora < a.em - 5000) return null;
    if (!this.perfil(a.perfil)) return null;
    return { perfil: a.perfil, entrou: !!a.entrou, logon: !!a.logon };
  }

  /**
   * O perfil desta abertura: o da "próxima abertura", se houver; senão, o último usado.
   * A tela de entrada aparece com mais de um perfil (se o usuário não a desligou) e depois do logoff.
   */
  inicial(agora = Date.now()) {
    const r = this.ler();
    const a = this.lerAbertura(agora);
    if (a) return { perfil: a.perfil, entrou: a.entrou, logon: a.logon || (!a.entrou && r.perfis.length > 1 && r.perguntar), reaberto: true };
    return { perfil: r.ultimo, entrou: false, logon: r.perfis.length > 1 && r.perguntar, reaberto: false };
  }
}

module.exports = { Perfis, PRINCIPAL, limparNome, nomeDePasta, VALIDADE_ABERTURA };
