'use strict';
/*
 * Os calendários da internet da Agenda (as assinaturas .ics, só para ler): o Google Agenda, o
 * Outlook, os feriados, a escola. O endereço (https:// ou webcal://) é baixado pelo processo
 * principal, numa sessão à parte e sem cookies, com tempo e tamanho máximos, e o .ics fica guardado
 * na pasta de dados do usuário (calendarios/<id>.ics), para a Agenda valer sem internet. O
 * endereço pode ser secreto (o "endereço secreto" do Google Agenda): ele fica só no config.json,
 * não vai para a área de trabalho (que vê o nome do site), para os registros, para as mensagens de
 * erro nem para o Claude.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const MAX_BYTES = 5 * 1024 * 1024;
const TEMPO = 20000;
const MAX_CALENDARIOS = 20;
const MAX_ENDERECO = 2048;
const MAX_NOME = 80;
const MAX_REDIRECIONAR = 5;

/** Um erro com o código (o processo principal o traduz). */
function erro(codigo, extra = {}) {
  const e = new Error(codigo);
  e.codigo = codigo;
  Object.assign(e, extra);
  return e;
}

/**
 * O endereço como ele é baixado: o webcal:// vira https://; só https, sem nome de usuário e senha.
 * Devolve a URL em texto ou lança o erro com o código.
 */
function normalizarEndereco(texto) {
  let s = String(texto || '').trim();
  if (!s || s.length > MAX_ENDERECO) throw erro('endereco');
  s = s.replace(/^webcals?:\/\//i, 'https://');
  let u;
  try { u = new URL(s); } catch { throw erro('endereco'); }
  if (u.protocol !== 'https:' || !u.hostname) throw erro('endereco');
  if (u.username || u.password) throw erro('credenciais');
  u.hash = '';
  return u.toString();
}

/** O nome do site (para a área de trabalho mostrar no lugar do endereço). */
function siteDe(endereco) {
  try { return new URL(endereco).hostname; } catch { return ''; }
}

/** O nome do calendário: sem controles nem quebras de linha, curto. */
function limparNome(s) {
  return String(s || '').replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_NOME);
}

/** O texto do .ics baixado, conferido (começa com BEGIN:VCALENDAR), ou o erro "formato". */
function conferirIcs(bytes) {
  let texto = new TextDecoder('utf-8').decode(bytes);
  if (texto.charCodeAt(0) === 0xfeff) texto = texto.slice(1);
  if (!/^\s*BEGIN:VCALENDAR/i.test(texto.slice(0, 1024))) throw erro('formato');
  return texto;
}

/** O X-WR-CALNAME do .ics (o nome que o calendário dá a si mesmo), se houver. */
function nomeDoIcs(texto) {
  const m = /^X-WR-CALNAME:(.*)$/im.exec(texto.slice(0, 64 * 1024));
  return m ? limparNome(m[1].replace(/\\([\\;,])/g, '$1')) : '';
}

/**
 * Baixa pela rede do Chromium (o proxy do sistema e os certificados dele), numa sessão só na
 * memória e sem cookies. Os redirecionamentos são conferidos um a um: um para http:// é recusado.
 */
function buscarNaRede(url, { limite = MAX_BYTES, tempo = TEMPO } = {}) {
  const { net, session } = require('electron');
  return new Promise((ok, falha) => {
    const req = net.request({ url, method: 'GET', session: session.fromPartition('retro-calendarios'), redirect: 'manual', useSessionCookies: false, cache: 'no-store' });
    req.setHeader('Accept', 'text/calendar, text/plain;q=0.8, */*;q=0.5');
    let feito = false;
    let saltos = 0;
    const fim = (e, v) => {
      if (feito) return;
      feito = true;
      clearTimeout(relogio);
      if (e) { try { req.abort(); } catch { /* já terminou */ } falha(e); } else ok(v);
    };
    const relogio = setTimeout(() => fim(erro('tempo')), tempo);
    req.on('redirect', (_status, _metodo, para) => {
      if (++saltos > MAX_REDIRECIONAR) { fim(erro('rede')); return; }
      let u;
      try { u = new URL(para); } catch { fim(erro('rede')); return; }
      if (u.protocol !== 'https:') { fim(erro('inseguro')); return; }
      req.followRedirect();
    });
    req.on('response', (res) => {
      if (res.statusCode < 200 || res.statusCode > 299) { fim(erro('http', { status: res.statusCode })); return; }
      const tam = Number(res.headers['content-length']);
      if (tam > limite) { fim(erro('grande')); return; }
      const partes = [];
      let total = 0;
      res.on('data', (b) => {
        total += b.length;
        if (total > limite) { fim(erro('grande')); return; }
        partes.push(b);
      });
      res.on('end', () => fim(null, Buffer.concat(partes)));
      res.on('error', () => fim(erro('rede')));
    });
    req.on('error', () => fim(erro('rede')));
    req.end();
  });
}

/**
 * A versão de mentira (RETRO_CALENDARIOS_FALSOS=<pasta>): o .ics vem do arquivo da pasta com o
 * nome do fim do endereço; "lento" no nome demora, e o que não existe responde 404.
 */
function buscarFalso(pasta) {
  return async (url, { limite = MAX_BYTES } = {}) => {
    const nome = path.basename(new URL(url).pathname) || 'calendario.ics';
    if (/lento/.test(nome)) await new Promise((ok) => setTimeout(ok, 1500));
    let bytes;
    try { bytes = fs.readFileSync(path.join(pasta, nome)); } catch { throw erro('http', { status: 404 }); }
    if (bytes.length > limite) throw erro('grande');
    return bytes;
  };
}

class Calendarios {
  /**
   * pasta: onde ficam as cópias (<dados do usuário>/calendarios); config: o Config (a lista fica em
   * agenda.calendarios); buscar(url, { limite, tempo }): os bytes (a rede, ou a de mentira nos testes).
   */
  constructor({ pasta, config, buscar = buscarNaRede }) {
    this.pasta = pasta;
    this.config = config;
    this.buscar = buscar;
    this.emCurso = new Map();
  }

  lista() {
    const a = this.config.obter().agenda || {};
    return Array.isArray(a.calendarios) ? a.calendarios.filter((c) => c && typeof c.id === 'string' && /^[0-9a-f]{12}$/.test(c.id)) : [];
  }

  gravarLista(lista) {
    // A lista troca inteira (o mesclar das configurações não mistura listas).
    this.config.definir({ agenda: { calendarios: lista } });
  }

  arquivo(id) {
    if (!/^[0-9a-f]{12}$/.test(String(id))) throw erro('desconhecido');
    return path.join(this.pasta, `${id}.ics`);
  }

  guardar(id, texto) {
    fs.mkdirSync(this.pasta, { recursive: true });
    const destino = this.arquivo(id);
    const tmp = `${destino}.tmp`;
    fs.writeFileSync(tmp, texto, { mode: 0o600 });
    fs.renameSync(tmp, destino);
  }

  async baixar(endereco) {
    const bytes = await this.buscar(endereco, { limite: MAX_BYTES, tempo: TEMPO });
    return conferirIcs(bytes);
  }

  /** Assina um calendário: confere o endereço, baixa (tem que ser um .ics) e guarda. */
  async adicionar({ endereco, nome, lembretes } = {}) {
    const url = normalizarEndereco(endereco);
    const lista = this.lista();
    if (lista.length >= MAX_CALENDARIOS) throw erro('muitos', { n: MAX_CALENDARIOS });
    if (lista.some((c) => c.url === url)) throw erro('repetido');
    const texto = await this.baixar(url);
    let id;
    do id = crypto.randomBytes(6).toString('hex'); while (lista.some((c) => c.id === id));
    this.guardar(id, texto);
    const item = { id, url, nome: limparNome(nome) || nomeDoIcs(texto) || siteDe(url), lembretes: lembretes === true, ligado: true, ultima: Date.now(), erro: null };
    this.gravarLista([...this.lista(), item]);
    return item.id;
  }

  /** Baixa de novo (um de cada vez por calendário); o erro fica anotado e a cópia de antes continua. */
  atualizar(id) {
    if (this.emCurso.has(id)) return this.emCurso.get(id);
    const p = (async () => {
      const c = this.lista().find((x) => x.id === id);
      if (!c) throw erro('desconhecido');
      try {
        const texto = await this.baixar(c.url);
        this.guardar(id, texto);
        this.mudar(id, { ultima: Date.now(), erro: null }, true);
        return { ok: true };
      } catch (e) {
        this.mudar(id, { erro: e.codigo || 'rede', status: e.status || null, tentativa: Date.now() }, true);
        throw e;
      }
    })();
    this.emCurso.set(id, p);
    p.finally(() => this.emCurso.delete(id)).catch(() => { });
    return p;
  }

  /** O .ics guardado (vazio se ainda não há). */
  ler(id) {
    try { return fs.readFileSync(this.arquivo(id), 'utf8'); } catch (e) { if (e.codigo) throw e; return ''; }
  }

  /** Muda o nome, os lembretes ou se aparece (a área de trabalho só pode esses três). */
  mudar(id, parte, interno = false) {
    const lista = this.lista();
    const i = lista.findIndex((c) => c.id === id);
    if (i < 0) throw erro('desconhecido');
    const c = { ...lista[i] };
    if (interno) Object.assign(c, parte);
    else {
      if ('nome' in parte) c.nome = limparNome(parte.nome) || c.nome;
      if ('lembretes' in parte) c.lembretes = parte.lembretes === true;
      if ('ligado' in parte) c.ligado = parte.ligado !== false;
    }
    lista[i] = c;
    this.gravarLista(lista);
  }

  /** Deixa de assinar: sai da lista, e a cópia guardada é apagada (ela não é um arquivo do disco C:). */
  remover(id) {
    const arq = this.arquivo(id);
    this.gravarLista(this.lista().filter((c) => c.id !== id));
    try { fs.rmSync(arq, { force: true }); } catch { /* fica */ }
  }
}

/** As configurações como a área de trabalho as vê: os calendários sem o endereço, só com o site. */
function semEnderecos(c) {
  const a = c && c.agenda;
  if (!a || !Array.isArray(a.calendarios)) return c;
  return { ...c, agenda: { ...a, calendarios: a.calendarios.map(({ url, ...resto }) => ({ ...resto, site: siteDe(url) })) } };
}

module.exports = { Calendarios, normalizarEndereco, conferirIcs, nomeDoIcs, siteDe, semEnderecos, buscarNaRede, buscarFalso, MAX_BYTES, MAX_CALENDARIOS };
