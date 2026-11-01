'use strict';
/* Google local para testes: OAuth por loopback e API em arquivo, sem contas ou serviços reais. */
const fs = require('node:fs');
const http = require('node:http');
const crypto = require('node:crypto');
module.exports = function criarGoogleFalso({ arquivo = process.env.RETRO_GOOGLE_DADOS, manual = false, eventos = [] } = {}) {
  let memoria = { cursor: 1, eventos: Object.fromEntries(eventos.map((e) => [e.id, { ...e, _versao: 1 }])), pedidos: [] };
  const ler = () => { try { return JSON.parse(fs.readFileSync(arquivo, 'utf8')); } catch { return memoria; } };
  const guardar = (s) => { memoria = s; if (arquivo) fs.writeFileSync(arquivo, JSON.stringify(s)); };
  if (arquivo && !fs.existsSync(arquivo)) guardar(memoria);
  let login = null;
  const resposta = (r, status = 200) => new Response(status === 204 ? null : JSON.stringify(r), { status, headers: { 'content-type': 'application/json' } });
  const publico = (e) => { const { _versao, ...r } = e; return { ...r, etag: '"' + _versao + '"' }; };
  const mudar = (s, id, parte) => { s.cursor++; s.eventos[id] = { ...s.eventos[id], ...parte, id, _versao: s.cursor }; guardar(s); return publico(s.eventos[id]); };
  const f = {
    cliente: process.env.RETRO_GOOGLE_SEM_CLIENTE ? null : { installed: { client_id: 'retro-teste.apps.googleusercontent.com', client_secret: 'cliente-falso-sem-conta' } },
    cofre: { encryptString: (s) => Buffer.from('TESTE:' + Buffer.from(s).toString('base64')), decryptString: (b) => Buffer.from(String(b).slice(6), 'base64').toString() },
    async abrir(url) {
      login = new URL(url);
      if (!manual) setTimeout(() => { const u = new URL(login.searchParams.get('redirect_uri')); u.search = new URLSearchParams({ state: login.searchParams.get('state'), code: 'codigo-teste' }); http.get(u, (r) => r.resume()).on('error', () => {}); }, 100);
    },
    get login() { return login; },
    ler,
    modificar(id, parte) { return mudar(ler(), id, parte); },
    async buscar(url, o = {}) {
      const u = new URL(url), metodo = o.method || 'GET';
      if (u.origin === 'https://oauth2.googleapis.com') {
        const p = new URLSearchParams(o.body);
        if (p.get('grant_type') === 'authorization_code' && (!login || p.get('code') !== 'codigo-teste' || p.get('redirect_uri') !== login.searchParams.get('redirect_uri') || crypto.createHash('sha256').update(p.get('code_verifier')).digest('base64url') !== login.searchParams.get('code_challenge'))) return resposta({}, 400);
        return resposta({ access_token: 'token-teste', refresh_token: 'refresh-teste', expires_in: 3600 });
      }
      if (u.origin !== 'https://www.googleapis.com' || o.headers?.authorization !== 'Bearer token-teste') return resposta({}, 401);
      if (u.pathname.endsWith('/calendarList')) return resposta({ items: [{ id: 'retro@example.test', summary: 'Pessoal de teste', primary: true, accessRole: 'owner', timeZone: 'Etc/UTC', defaultReminders: [] }, { id: 'feriados@example.test', summary: 'Feriados de teste', accessRole: 'reader' }] });
      const s = ler();
      if (s.falhar) return resposta({}, s.falhar);
      const m = /\/events(?:\/([^/?]+))?(\/instances)?$/.exec(u.pathname);
      if (!m) return resposta({}, 404);
      const id = m[1] && decodeURIComponent(m[1]);
      if (m[2]) {
        const pai = s.eventos[id]; if (!pai) return resposta({}, 404);
        const start = u.searchParams.get('originalStart'), inst = id + '_instancia';
        if (!s.eventos[inst]) s.eventos[inst] = { ...pai, id: inst, recurrence: undefined, recurringEventId: id, originalStartTime: { dateTime: start }, start: { dateTime: start }, end: { dateTime: new Date(Date.parse(start) + 3600000).toISOString() } };
        guardar(s); return resposta({ items: [publico(s.eventos[inst])] });
      }
      if (!id && metodo === 'GET') {
        if (s.expirar && u.searchParams.has('syncToken')) { s.expirar = false; guardar(s); return resposta({}, 410); }
        const token = Number(u.searchParams.get('syncToken') || 0);
        return resposta({ items: Object.values(s.eventos).filter((e) => e._versao > token).map(publico), nextSyncToken: String(s.cursor) });
      }
      if (id && metodo === 'GET') return s.eventos[id] ? resposta(publico(s.eventos[id])) : resposta({}, 404);
      const body = o.body ? JSON.parse(o.body) : null;
      s.pedidos.push({ metodo, id, body, atualizacoes: u.searchParams.get('sendUpdates') });
      if (metodo === 'POST') {
        if (s.eventos[body.id]) return resposta({}, 409);
        return resposta(mudar(s, body.id, { ...body, iCalUID: body.id + '@google.test', status: 'confirmed' }));
      }
      if (!s.eventos[id]) return resposta({}, 404);
      if (o.headers?.['if-match'] !== publico(s.eventos[id]).etag) return resposta({}, 412);
      if (metodo === 'DELETE') { mudar(s, id, { status: 'cancelled' }); return resposta(null, 204); }
      if (metodo === 'PATCH') return resposta(mudar(s, id, body));
      return resposta({}, 400);
    },
  };
  return f;
};
