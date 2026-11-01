'use strict';
/* Sincronização em três vias: mudanças simultâneas viram conflitos, nunca uma escolha silenciosa. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { ics, chave, resumo, igual, hash, erro, projetar, doGoogle, paraGoogle } = require('./google-eventos');
const { GoogleAuth } = require('./google-auth');

class GoogleAgenda {
  constructor({ pasta, disco, arquivo, config, aoMudar = () => {}, ...opcoes }) {
    this.pasta = pasta; this.disco = disco; this.arquivo = arquivo; this.config = config; this.aoMudar = aoMudar;
    this.geracao = 0; this.ocupado = false; this.falha = null; this.timer = null; this.relogio = null; this.proximaTentativa = 0;
    this.s = { versao: 1, calendario: null, registros: {}, cache: {}, geracoes: {}, syncToken: null, ultima: 0, pausado: false, conflitos: [] };
    try {
      const arq = path.join(pasta, 'estado.json'); if (fs.statSync(arq).size > 32 * 1024 * 1024) throw erro('grande');
      const s = JSON.parse(fs.readFileSync(arq, 'utf8'));
      const objeto = (v) => v && typeof v === 'object' && !Array.isArray(v);
      if (s.versao !== 1 || !objeto(s.registros) || !objeto(s.cache) || !objeto(s.geracoes) || !Array.isArray(s.conflitos)
        || Object.values(s.registros).some((r) => !objeto(r) || typeof r.id !== 'string' || !objeto(r.base))
        || Object.entries(s.cache).some(([id, r]) => !objeto(r) || r.id !== id)
        || Object.entries(s.registros).some(([k, r]) => chave(r.base) !== k || !Object.hasOwn(s.cache, r.id))
        || (s.calendario && (!objeto(s.calendario) || typeof s.calendario.id !== 'string' || typeof s.calendario.nonce !== 'string' || typeof s.calendario.raiz !== 'string' || typeof s.calendario.arquivo !== 'string'))) throw erro('estado');
      this.s = s;
    } catch (e) { if (e.code !== 'ENOENT') this.falha = 'estado'; }
    this.auth = new GoogleAuth({ pasta, ...opcoes, aoMudar: (c) => { this.falha = c || null; this.proximaTentativa = 0; this.mudar(); } });
  }
  salvar() {
    fs.mkdirSync(this.pasta, { recursive: true, mode: 0o700 });
    fs.writeFileSync(path.join(this.pasta, 'estado.json.tmp'), JSON.stringify(this.s), { mode: 0o600 });
    fs.renameSync(path.join(this.pasta, 'estado.json.tmp'), path.join(this.pasta, 'estado.json'));
  }
  guardarRecuperacao(chaves, local) {
    const registros = {}, eventosGoogle = {}, eventosLocais = [];
    for (const k of chaves) {
      const r = this.s.registros[k], e = r?.base || local.mapa.get(k);
      if (e) eventosLocais.push(e);
      if (r) { registros[k] = r; if (this.s.cache[r.id]) eventosGoogle[r.id] = this.s.cache[r.id]; }
    }
    const pasta = path.join(this.pasta, 'recuperacao'); fs.mkdirSync(pasta, { recursive: true, mode: 0o700 });
    const nome = new Date().toISOString().replace(/[:.]/g, '-') + '-' + crypto.randomBytes(4).toString('hex');
    // Sem tokens ou configuração OAuth. As versões que uma escrita pode substituir ficam recuperáveis.
    fs.writeFileSync(path.join(pasta, nome + '.json'), JSON.stringify({ eventosLocais, eventosGoogle, registros }), { mode: 0o600, flag: 'wx' });
    return { pasta, nome, eventosLocais };
  }
  estado() {
    return { ...this.auth.estado(), calendario: this.s.calendario ? { id: this.s.calendario.id, nome: this.s.calendario.nome } : null,
      pausado: this.s.pausado, ocupado: this.ocupado, ultima: this.s.ultima, erro: this.falha,
      conflitos: this.s.conflitos.map((c) => ({ chave: c.chave, titulo: c.local?.titulo || c.google?.titulo || '', local: c.local, google: c.google })) };
  }
  mudar() { this.aoMudar(this.estado()); }
  async calendarios() {
    const lista = []; let pageToken;
    do {
      const q = new URLSearchParams({ maxResults: '250', ...(pageToken ? { pageToken } : {}) });
      const r = await this.auth.api('users/me/calendarList?' + q);
      for (const c of r.items || []) if (c.id && !c.deleted) lista.push({ id: c.id, nome: c.summaryOverride || c.summary || c.id, gravavel: ['owner', 'writer'].includes(c.accessRole), primario: !!c.primary, fuso: c.timeZone, lembretes: c.defaultReminders || [] });
      pageToken = r.nextPageToken; if (lista.length > 2000) throw erro('grande');
    } while (pageToken);
    return lista;
  }
  async selecionar(id) {
    if (this.ocupado || this.selecionando || this.s.calendario) throw erro('desconectar');
    if (this.auth.estado().autorizando) throw erro('entrar');
    this.selecionando = true;
    const g = this.geracao;
    try {
      const c = (await this.calendarios()).find((c) => c.id === id && c.gravavel);
      this.conferir(g);
      if (!c) throw erro('permissao');
      this.s = { versao: 1, calendario: { ...c, raiz: this.disco.raiz, arquivo: this.arquivo(), nonce: crypto.randomBytes(16).toString('hex') }, registros: {}, cache: {}, geracoes: {}, syncToken: null, ultima: 0, pausado: false, conflitos: [] };
      // A assinatura antiga do mesmo Google Calendar fica oculta para não duplicar os eventos.
      if (this.config) {
        const lista = this.config.obter().agenda?.calendarios || [];
        const novos = lista.map((x) => { try { const u = new URL(x.url), m = /^\/calendar\/ical\/([^/]+)\//.exec(u.pathname); return u.hostname === 'calendar.google.com' && m && decodeURIComponent(m[1]) === id ? { ...x, ligado: false } : x; } catch { return x; } });
        if (JSON.stringify(lista) !== JSON.stringify(novos)) this.config.definir({ agenda: { calendarios: novos } });
      }
      this.salvar(); this.mudar(); return this.sincronizar(true);
    } finally { this.selecionando = false; }
  }
  caminho(sufixo = '') { return 'calendars/' + encodeURIComponent(this.s.calendario.id) + '/events' + sufixo; }
  conferir(g) { if (g !== this.geracao) throw erro('cancelado'); }
  async baixar(g, completo = false) {
    const cache = completo || !this.s.syncToken ? Object.create(null) : { ...this.s.cache }; let pageToken, syncToken;
    try {
      do {
        const q = new URLSearchParams({ maxResults: '250', showDeleted: 'true', singleEvents: 'false', ...(!completo && this.s.syncToken ? { syncToken: this.s.syncToken } : {}), ...(pageToken ? { pageToken } : {}) });
        const r = await this.auth.api(this.caminho('?' + q)); this.conferir(g);
        for (const e of r.items || []) {
          if (typeof e.id !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(e.id)) throw erro('resposta');
          cache[e.id] = e.status === 'cancelled' ? { ...cache[e.id], ...e } : e;
        }
        if (Object.keys(cache).length > 20000) throw erro('grande');
        pageToken = r.nextPageToken; syncToken = r.nextSyncToken;
      } while (pageToken);
    } catch (e) { if (e.status === 410 && !completo) return this.baixar(g, true); throw e; }
    if (!syncToken) throw erro('resposta');
    for (const r of Object.values(this.s.registros)) if (!Object.hasOwn(cache, r.id)) cache[r.id] = { ...this.s.cache[r.id], id: r.id, status: 'cancelled' };
    this.s.cache = cache; this.s.syncToken = syncToken; this.salvar();
  }
  async lerAgenda() {
    const rel = this.arquivo(); let texto = null;
    try { const n = this.disco.real(rel); if (fs.statSync(n).size > 20 * 1024 * 1024) throw erro('grande'); texto = fs.readFileSync(n, 'utf8'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (texto == null && Object.keys(this.s.registros).length) throw erro('arquivo');
    if (texto != null && !/^\s*BEGIN:VCALENDAR/i.test(texto)) throw erro('arquivo');
    const { lerIcs } = await ics(); const d = texto == null ? { eventos: [], nome: '' } : lerIcs(texto);
    const mapa = new Map();
    for (const e of d.eventos) { const k = chave(e); if (mapa.has(k)) throw erro('duplicado'); mapa.set(k, e); }
    const blocos = (texto?.match(/BEGIN:VEVENT/gi) || []).length;
    const ids = (texto?.match(/^UID[:;]/gmi) || []).length;
    if (blocos !== d.eventos.length || ids !== blocos) throw erro('arquivo');
    return { ...d, mapa, esperado: texto == null ? null : hash(texto), texto };
  }
  async enviar(k, e, registro, remoto, g, tentativas = 0) {
    this.conferir(g);
    if (!e) {
      if (registro?.id && typeof (remoto?.etag || registro.etag) !== 'string') throw erro('conflito');
      if (registro?.id) { try { await this.auth.api(this.caminho('/' + encodeURIComponent(registro.id) + '?sendUpdates=none'), { method: 'DELETE', headers: { 'if-match': remoto?.etag || registro.etag } }); } catch (x) { if (![404, 410].includes(x.status)) throw x; } }
      this.conferir(g); if (registro?.id) this.s.cache[registro.id] = { ...this.s.cache[registro.id], id: registro.id, status: 'cancelled' };
      delete this.s.registros[k]; this.s.geracoes[k] = (this.s.geracoes[k] || 0) + 1; this.salvar(); return null;
    }
    const corpo = await paraGoogle(e, registro?.base || null); this.conferir(g);
    let id = remoto?.id || registro?.id, etag = remoto?.etag || registro?.etag;
    if (!id && e.recorrencia) {
      const master = this.s.registros[JSON.stringify([e.uid, ''])]; if (!master?.id) throw erro('serie');
      const { paraData } = await ics();
      const q = new URLSearchParams({ originalStart: paraData(e.recorrencia).toISOString(), maxResults: '250' });
      const r = await this.auth.api(this.caminho('/' + encodeURIComponent(master.id) + '/instances?' + q)); this.conferir(g);
      const instance = (r.items || [])[0]; if (!instance?.id) throw erro('serie');
      id = instance.id; etag = instance.etag; delete corpo.recurrence;
    }
    let resposta;
    if (id) {
      if (typeof etag !== 'string' || !etag) throw erro('conflito');
      resposta = await this.auth.api(this.caminho('/' + encodeURIComponent(id) + '?sendUpdates=none'), { method: 'PATCH', headers: { 'if-match': etag }, body: JSON.stringify(corpo) });
    } else {
      const novoId = hash(this.s.calendario.nonce + k + ':' + (this.s.geracoes[k] || 0));
      const novo = { ...corpo, id: novoId, extendedProperties: { private: { retroUid: e.uid } } };
      try { resposta = await this.auth.api(this.caminho('?sendUpdates=none'), { method: 'POST', body: JSON.stringify(novo) }); }
      catch (x) {
        if (x.status !== 409) throw x;
        try { resposta = await this.auth.api(this.caminho('/' + novoId)); } catch (e) { if (e.status !== 410) throw e; resposta = { status: 'cancelled' }; }
        if (resposta.status === 'cancelled' && tentativas < 3) { this.s.geracoes[k] = (this.s.geracoes[k] || 0) + 1; this.salvar(); return this.enviar(k, e, null, null, g, tentativas + 1); }
        if (resposta.extendedProperties?.private?.retroUid !== e.uid || resposta.status === 'cancelled') throw erro('conflito');
        const recebido = await doGoogle(resposta, this.s.calendario.lembretes); if (!igual(resumo(recebido), resumo(e))) throw erro('conflito');
      }
    }
    this.conferir(g);
    this.s.cache[resposta.id] = resposta;
    this.s.registros[k] = { id: resposta.id, etag: resposta.etag, base: resumo(e) };
    this.salvar(); return resposta;
  }
  sincronizar(manual = false) {
    if (this.emCurso) return this.emCurso.catch(() => {}).then(() => this.estado());
    if (!this.s.calendario || this.s.pausado || !this.auth.estado().conectado || this.auth.estado().autorizando || (!manual && Date.now() < this.proximaTentativa)) return Promise.resolve(this.estado());
    const g = this.geracao; this.ocupado = true; this.falha = null; this.mudar();
    this.emCurso = this.executar(g).catch((e) => { if (g === this.geracao) { this.falha = e.codigo || (e.code === 'alterado' ? 'alterado' : 'rede'); this.proximaTentativa = Date.now() + (e.codigo === 'limite' ? 15 : 2) * 60000; try { this.salvar(); } catch { this.falha = 'gravar'; } } }).finally(() => { this.ocupado = false; this.emCurso = null; this.mudar(); });
    return this.emCurso.then(() => this.estado());
  }
  async executar(g) {
    const c = this.s.calendario;
    if (c.raiz !== this.disco.raiz || c.arquivo !== this.arquivo()) throw erro('disco');
    const local = await this.lerAgenda(); await this.baixar(g); this.conferir(g);
    const remotos = await projetar(this.s.cache, c.lembretes);
    const chaves = new Set([...local.mapa.keys(), ...remotos.keys(), ...Object.keys(this.s.registros)]);
    const entradas = [], saidas = [], confirmados = {}, conflitos = [];
    for (const k of chaves) {
      const l = local.mapa.get(k) || null, item = remotos.get(k), r = item?.evento || null, registro = this.s.registros[k], base = registro?.base || null;
      const a = resumo(l), b = resumo(r);
      if (igual(a, b)) { confirmados[k] = r ? { id: item.google.id, etag: item.google.etag, base: b } : null; if (!r && registro) this.s.geracoes[k] = (this.s.geracoes[k] || 0) + 1; continue; }
      if (igual(a, base)) entradas.push({ k, r, google: item?.google });
      else if (igual(b, base)) saidas.push({ k, l, registro, google: item?.google });
      else conflitos.push({ chave: k, local: a, google: b, id: item?.google?.id || registro?.id, etag: item?.google?.etag });
    }
    this.s.conflitos = conflitos; this.salvar(); this.mudar();
    if (saidas.length || entradas.some((x) => local.mapa.has(x.k))) {
      const copia = this.guardarRecuperacao([...new Set([...saidas.map((x) => x.k), ...entradas.filter((x) => local.mapa.has(x.k)).map((x) => x.k)])], local);
      const { gravarIcs } = await ics();
      fs.writeFileSync(path.join(copia.pasta, copia.nome + '.ics'), gravarIcs(copia.eventosLocais), { mode: 0o600, flag: 'wx' });
    }
    // Antes de qualquer escrita no Google, mantém também uma cópia local recuperável.
    if (saidas.length && local.texto != null) await this.disco.guardarVersao(this.arquivo());
    saidas.sort((a, b) => Number(!!a.l?.recorrencia) - Number(!!b.l?.recorrencia));
    for (const s of saidas) { await this.enviar(s.k, s.l, s.registro, s.google, g); this.conferir(g); }
    if (entradas.length) {
      for (const { k, r } of entradas) { if (r) local.mapa.set(k, { ...local.mapa.get(k), ...r }); else local.mapa.delete(k); }
      const { gravarIcs } = await ics(); this.conferir(g);
      await this.disco.gravar(this.arquivo(), Buffer.from(gravarIcs([...local.mapa.values()], { nome: local.nome || c.nome })), { esperado: local.esperado }); this.conferir(g);
      for (const { k, r, google } of entradas) { if (r) confirmados[k] = { id: google.id, etag: google.etag, base: resumo(r) }; else { confirmados[k] = null; this.s.geracoes[k] = (this.s.geracoes[k] || 0) + 1; } }
    }
    for (const [k, v] of Object.entries(confirmados)) { if (v) this.s.registros[k] = v; else delete this.s.registros[k]; }
    this.s.ultima = Date.now(); this.falha = null; this.salvar();
  }
  async resolver(k, escolha) {
    if (this.ocupado || !['local', 'google'].includes(escolha)) throw erro('conflito');
    this.ocupado = true; this.mudar();
    const g = this.geracao;
    this.emCurso = this.resolverConflito(k, escolha, g).finally(() => { this.ocupado = false; this.emCurso = null; this.mudar(); });
    await this.emCurso; this.falha = null; this.proximaTentativa = 0; this.agendar(); return this.estado();
  }
  async resolverConflito(k, escolha, g) {
    const c = this.s.conflitos.find((c) => c.chave === k); if (!c) throw erro('conflito');
    const local = await this.lerAgenda();
    if (!igual(resumo(local.mapa.get(k) || null), c.local)) throw erro('alterado');
    let raw = null;
    if (c.id) { try { raw = await this.auth.api(this.caminho('/' + encodeURIComponent(c.id))); } catch (e) { if (![404, 410].includes(e.status)) throw e; } }
    this.conferir(g);
    const cache = { ...this.s.cache };
    if (raw) cache[raw.id] = raw;
    else if (c.id) cache[c.id] = { ...cache[c.id], id: c.id, status: 'cancelled' };
    const r = (await projetar(cache, this.s.calendario.lembretes)).get(k)?.evento || null;
    if (!igual(resumo(r), c.google)) { this.agendar(); throw erro('alterado'); }
    if (escolha === 'google') {
      if (r) local.mapa.set(k, { ...local.mapa.get(k), ...r }); else local.mapa.delete(k);
      const { gravarIcs } = await ics();
      this.conferir(g); await this.disco.gravar(this.arquivo(), Buffer.from(gravarIcs([...local.mapa.values()], { nome: local.nome })), { esperado: local.esperado }); this.conferir(g);
    }
    if (raw) this.s.cache[raw.id] = raw;
    if (r) this.s.registros[k] = { id: raw.id, etag: raw.etag, base: resumo(r) };
    else { delete this.s.registros[k]; this.s.geracoes[k] = (this.s.geracoes[k] || 0) + 1; }
    this.s.conflitos = this.s.conflitos.filter((x) => x.chave !== k); this.salvar();
  }
  agendar() { clearTimeout(this.timer); if (this.s.calendario && !this.s.pausado) this.timer = setTimeout(() => this.sincronizar(), 2000); this.timer?.unref(); }
  iniciar() { this.agendar(); this.relogio = setInterval(() => this.sincronizar(), 60000); this.relogio.unref(); }
  pausar(v) { this.geracao++; this.s.pausado = v === true; this.salvar(); if (!v) this.agendar(); this.mudar(); return this.estado(); }
  desconectar() { this.geracao++; clearTimeout(this.timer); this.auth.desconectar(); this.s.calendario = null; this.s.conflitos = []; this.salvar(); this.mudar(); return this.estado(); }
  encerrar() { this.geracao++; clearTimeout(this.timer); clearInterval(this.relogio); this.auth.encerrar(); }
}
module.exports = { GoogleAgenda };
