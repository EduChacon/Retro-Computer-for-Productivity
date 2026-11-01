'use strict';
/* OAuth de aplicativo para computador: PKCE, retorno local e credenciais só no cofre do sistema. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { erro } = require('./google-eventos');
const { tr } = require('./idioma');
const ESCOPOS = ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar.calendarlist.readonly'];
const TOKEN = 'https://oauth2.googleapis.com/token';

async function jsonLimitado(r) {
  if (r.status === 204) return null;
  let total = 0; const partes = [];
  const leitor = r.body?.getReader();
  if (!leitor) throw erro('resposta');
  try {
    for (;;) { const { done, value } = await leitor.read(); if (done) break; total += value.length; if (total > 16 * 1024 * 1024) throw erro('grande'); partes.push(Buffer.from(value)); }
    return JSON.parse(Buffer.concat(partes).toString('utf8'));
  } catch (e) { await leitor.cancel().catch(() => {}); throw e.codigo ? e : erro('resposta'); }
}

class GoogleAuth {
  constructor({ pasta, cofre, disponivel, clientePadrao = null, buscar = fetch, abrir, aoMudar = () => {} }) {
    this.arquivo = path.join(pasta, 'credenciais.bin'); this.cofre = cofre;
    this.disponivel = () => { try { return !!disponivel(); } catch { return false; } };
    this.buscar = buscar; this.abrir = abrir; this.aoMudar = aoMudar; this.dados = null; this.login = null; this.renovando = null;
    this.clientePadrao = null;
    try { if (clientePadrao) this.clientePadrao = this.validarCliente(clientePadrao); } catch { }
    this.aborto = new AbortController(); this.geracao = 0; this.carregar();
  }
  carregar() {
    if (this.dados || !this.disponivel()) return;
    try { this.dados = JSON.parse(this.cofre.decryptString(fs.readFileSync(this.arquivo))); } catch { }
    if (!this.dados && this.clientePadrao) {
      this.dados = { cliente: this.clientePadrao, tokens: null };
    }
  }
  salvar() {
    if (!this.disponivel()) throw erro('cofre');
    fs.mkdirSync(path.dirname(this.arquivo), { recursive: true, mode: 0o700 });
    let bytes; try { bytes = this.cofre.encryptString(JSON.stringify(this.dados)); } catch { throw erro('cofre'); }
    fs.writeFileSync(this.arquivo + '.tmp', bytes, { mode: 0o600 });
    fs.renameSync(this.arquivo + '.tmp', this.arquivo);
  }
  estado() {
    this.carregar();
    return { configurado: !!(this.dados?.cliente || this.clientePadrao), conectado: !!(this.dados?.tokens?.refresh_token || this.dados?.tokens?.access_token), cofre: this.disponivel(), autorizando: !!this.login };
  }
  configurar(json) {
    if (this.login || this.estado().conectado) throw erro('desconectar');
    this.dados = { cliente: this.validarCliente(json), tokens: null };
    this.salvar(); this.aoMudar();
  }
  validarCliente(json) {
    const c = json?.installed;
    if (!c || typeof c.client_id !== 'string' || !/^[a-zA-Z0-9._-]+\.apps\.googleusercontent\.com$/.test(c.client_id) || c.client_id.length > 300 || typeof c.client_secret !== 'string' || !c.client_secret || c.client_secret.length > 300) throw erro('cliente');
    return { client_id: c.client_id, client_secret: c.client_secret };
  }
  async solicitar(url, opcoes = {}) {
    let r;
    try { r = await this.buscar(url, { ...opcoes, credentials: 'omit', redirect: 'error', signal: AbortSignal.any([this.aborto.signal, AbortSignal.timeout(20000)]) }); }
    catch { throw erro('rede'); }
    if (!r.ok) {
      const e = erro(({ 400: 'resposta', 401: 'entrar', 403: 'permissao', 404: 'ausente', 409: 'existe', 410: 'expirado', 412: 'conflito', 429: 'limite' })[r.status] || 'rede'); e.status = r.status;
      try { await r.body?.cancel(); } catch { }
      throw e;
    }
    return jsonLimitado(r);
  }
  async trocar(formulario) {
    try { return await this.solicitar(TOKEN, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(formulario).toString() }); }
    catch (e) { if (e.status === 400 || e.status === 401) throw erro('entrar'); throw e; }
  }
  guardarTokens(tokens) {
    if (!tokens || typeof tokens.access_token !== 'string') throw erro('resposta');
    if (tokens.scope) {
      if (typeof tokens.scope !== 'string') throw erro('resposta');
      const s = tokens.scope.split(/\s+/);
      const todos = s.includes('https://www.googleapis.com/auth/calendar');
      const eventos = todos || s.includes(ESCOPOS[0]);
      const lista = todos || [ESCOPOS[1], 'https://www.googleapis.com/auth/calendar.calendarlist', 'https://www.googleapis.com/auth/calendar.readonly'].some((x) => s.includes(x));
      if (!eventos || !lista) throw erro('permissao');
    }
    this.dados.tokens = { access_token: tokens.access_token, refresh_token: tokens.refresh_token || this.dados.tokens?.refresh_token || null, expira: Date.now() + Math.min(Math.max(Number(tokens.expires_in) || 3600, 60), 86400) * 1000 };
    this.salvar();
  }
  async conectar() {
    if (!this.disponivel()) throw erro('cofre');
    this.carregar(); if (!this.dados?.cliente) throw erro('cliente');
    this.geracao++; this.cancelar();
    const state = crypto.randomBytes(32).toString('base64url'), verifier = crypto.randomBytes(48).toString('base64url');
    const servidor = http.createServer();
    const login = { servidor, state, verifier, url: null, timer: null }; this.login = login;
    const terminar = (codigo = null) => {
      clearTimeout(login.timer); servidor.close();
      if (this.login === login) { this.login = null; this.aoMudar(codigo); }
    };
    await new Promise((resolve, reject) => { servidor.once('error', () => { terminar('rede'); reject(erro('rede')); }); servidor.listen(0, '127.0.0.1', resolve); });
    const porta = servidor.address().port, retorno = `http://127.0.0.1:${porta}/google-calendar`;
    servidor.on('request', async (req, res) => {
      res.setHeader('cache-control', 'no-store'); res.setHeader('content-type', 'text/plain; charset=utf-8'); res.setHeader('content-security-policy', "default-src 'none'; frame-ancestors 'none'");
      let u; try { u = new URL(req.url, retorno); } catch { res.writeHead(400).end(); return; }
      if (req.method !== 'GET' || req.headers.host !== `127.0.0.1:${porta}` || u.pathname !== '/google-calendar' || u.searchParams.get('state') !== state || this.login !== login || login.recebido) { res.writeHead(400).end(); return; }
      if (u.searchParams.has('error')) { res.end(tr('Autorização cancelada. Pode fechar esta página.')); terminar('cancelado'); return; }
      const code = u.searchParams.get('code');
      if (!code || code.length > 4096) { res.writeHead(400).end(); return; }
      login.recebido = true;
      try {
        const tokens = await this.trocar({ ...this.dados.cliente, grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: retorno });
        if (this.login !== login) { res.end(tr('Autorização encerrada.')); return; }
        this.guardarTokens(tokens); res.end(tr('Conectado ao Retro Computer. Pode fechar esta página e voltar à Agenda.')); terminar();
      } catch (e) { res.end(tr('Não foi possível concluir. Volte à Agenda e tente novamente.')); terminar(e.codigo || 'rede'); }
    });
    login.timer = setTimeout(() => terminar('tempo'), 5 * 60000); login.timer.unref();
    const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    u.search = new URLSearchParams({ client_id: this.dados.cliente.client_id, redirect_uri: retorno, response_type: 'code', scope: ESCOPOS.join(' '), access_type: 'offline', prompt: 'consent', state, code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' }).toString();
    login.url = u.href; this.aoMudar();
    try { await this.abrir(login.url); } catch { terminar('navegador'); throw erro('navegador'); }
    return this.estado();
  }
  async abrirLogin() { if (!this.login?.url) throw erro('entrar'); await this.abrir(this.login.url); }
  cancelar() { if (!this.login) return; clearTimeout(this.login.timer); this.login.servidor.close(); this.login = null; this.aoMudar(); }
  async token(forcar = false) {
    if (!this.disponivel()) throw erro('cofre'); this.carregar();
    const t = this.dados?.tokens;
    if (!t) throw erro('entrar');
    if (!forcar && t.access_token && t.expira > Date.now() + 60000) return t.access_token;
    if (!t.refresh_token) throw erro('entrar');
    const geracao = this.geracao;
    if (!this.renovando) this.renovando = this.trocar({ ...this.dados.cliente, grant_type: 'refresh_token', refresh_token: t.refresh_token }).then((r) => { if (geracao !== this.geracao) throw erro('cancelado'); this.guardarTokens(r); return this.dados.tokens.access_token; }).finally(() => { this.renovando = null; });
    return this.renovando;
  }
  async api(caminho, opcoes = {}) {
    const executar = async (forcar) => this.solicitar('https://www.googleapis.com/calendar/v3/' + caminho, { ...opcoes, headers: { 'content-type': 'application/json', ...opcoes.headers, authorization: 'Bearer ' + await this.token(forcar) } });
    try { return await executar(false); } catch (e) { if (e.status !== 401) throw e; return executar(true); }
  }
  desconectar() { this.geracao++; this.cancelar(); this.aborto.abort(); this.aborto = new AbortController(); this.carregar(); if (this.dados) { this.dados.tokens = null; this.salvar(); } this.aoMudar(); }
  encerrar() { this.geracao++; this.cancelar(); this.aborto.abort(); }
}
module.exports = { GoogleAuth, ESCOPOS, jsonLimitado };
