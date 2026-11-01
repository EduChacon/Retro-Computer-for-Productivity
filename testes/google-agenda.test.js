'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawnSync } = require('node:child_process');
const { Disco } = require('../src/principal/disco');
const { GoogleAgenda } = require('../src/principal/google-agenda');
const { GoogleAuth } = require('../src/principal/google-auth');
const { ics, chave, hash, doGoogle, paraGoogle } = require('../src/principal/google-eventos');
const criarFake = require('./google-falso.cjs');

const remoto = { id: 'remoto1', iCalUID: 'remoto@example.test', summary: 'Evento do Google', description: 'Descrição', start: { dateTime: '2026-11-04T10:00:00Z' }, end: { dateTime: '2026-11-04T11:00:00Z' }, reminders: { useDefault: false }, status: 'confirmed', attendees: [{ email: 'preservar@example.test' }], colorId: '5' };
const local = { uid: 'local@retro', titulo: 'Evento do Retro', descricao: '', local: '', inicio: '2026-11-05', fim: '2026-11-06', diaTodo: true, lembrete: null, repetir: null, excecoes: [], recorrencia: null, extra: [] };
async function montar(t, iniciais = [remoto]) {
  const pasta = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'retro-google-'))), disco = new Disco(path.join(pasta, 'C'));
  await disco.preparar(['Documentos']);
  const fake = criarFake({ arquivo: path.join(pasta, 'google.json'), manual: true, eventos: iniciais });
  const g = new GoogleAgenda({ pasta: path.join(pasta, 'conta'), disco, arquivo: () => 'Documentos/Agenda.ics', cofre: fake.cofre, disponivel: () => true, buscar: fake.buscar, abrir: fake.abrir });
  g.auth.configurar(fake.cliente); g.auth.guardarTokens({ access_token: 'token-teste', refresh_token: 'refresh-teste' });
  const { lerIcs, gravarIcs } = await ics();
  const ler = () => lerIcs(fs.readFileSync(disco.real('Documentos/Agenda.ics'), 'utf8')).eventos;
  const gravar = (evs) => disco.gravar('Documentos/Agenda.ics', Buffer.from(gravarIcs(evs)));
  await gravar([local]);
  t.after(() => { g.encerrar(); fs.rmSync(pasta, { recursive: true, force: true }); });
  return { g, disco, fake, pasta, ler, gravar };
}

test('Google Agenda: junta os dois lados, usa UID estável e mantém dados que o Retro não edita', async (t) => {
  const a = await montar(t); await a.g.selecionar('retro@example.test');
  assert.equal(a.g.estado().erro, null); assert.equal(a.ler().length, 2);
  assert.equal(Object.values(a.fake.ler().eventos).length, 2);
  await a.g.sincronizar(true); await a.g.sincronizar(true);
  assert.equal(Object.values(a.fake.ler().eventos).length, 2, 'não duplica na repetição');
  await a.gravar(a.ler().map((e) => e.uid === remoto.iCalUID ? { ...e, titulo: 'Editado no Retro' } : e));
  await a.g.sincronizar(true);
  const r = a.fake.ler().eventos.remoto1;
  assert.equal(r.summary, 'Editado no Retro'); assert.deepEqual(r.attendees, remoto.attendees); assert.equal(r.colorId, '5');
  assert.ok(a.fake.ler().pedidos.every((p) => p.atualizacoes === 'none'));
  a.fake.modificar('remoto1', { summary: 'Editado no Google' });
  await a.g.sincronizar(true); assert.equal(a.ler().find((e) => e.uid === remoto.iCalUID).titulo, 'Editado no Google');
  assert.ok((await a.disco.versoes('Documentos/Agenda.ics')).length);
});

test('Google Agenda: conflito explícito e resolução preservam a versão escolhida', async (t) => {
  const a = await montar(t); await a.g.selecionar('retro@example.test');
  await a.gravar(a.ler().map((e) => e.uid === remoto.iCalUID ? { ...e, titulo: 'Minha mudança' } : e));
  a.fake.modificar('remoto1', { summary: 'Outra mudança' }); await a.g.sincronizar(true);
  const c = a.g.estado().conflitos[0]; assert.equal(c.local.titulo, 'Minha mudança'); assert.equal(c.google.titulo, 'Outra mudança');
  assert.equal(a.fake.ler().eventos.remoto1.summary, 'Outra mudança');
  await a.g.resolver(c.chave, 'local'); await a.g.sincronizar(true);
  assert.equal(a.fake.ler().eventos.remoto1.summary, 'Minha mudança');
  assert.equal(a.g.estado().conflitos.length, 0);
});

test('Google Agenda: exclusão nos dois sentidos, restauração e 410 não criam duplicações', async (t) => {
  const a = await montar(t); await a.g.selecionar('retro@example.test');
  const copia = a.ler(); await a.gravar(copia.filter((e) => e.uid !== local.uid)); await a.g.sincronizar(true);
  assert.equal(Object.values(a.fake.ler().eventos).find((e) => e.extendedProperties?.private?.retroUid === local.uid).status, 'cancelled');
  a.g.s.geracoes = {}; // Também recupera uma criação cujo identificador antigo ficou na lixeira do Google.
  await a.gravar([...a.ler(), copia.find((e) => e.uid === local.uid)]); await a.g.sincronizar(true);
  assert.equal(a.g.estado().erro, null);
  assert.equal(Object.values(a.fake.ler().eventos).filter((e) => e.status !== 'cancelled' && e.extendedProperties?.private?.retroUid === local.uid).length, 1);
  a.fake.modificar('remoto1', { status: 'cancelled' }); await a.g.sincronizar(true);
  assert.ok(!a.ler().some((e) => e.uid === remoto.iCalUID));
  const s = a.fake.ler(); s.expirar = true; fs.writeFileSync(path.join(a.pasta, 'google.json'), JSON.stringify(s));
  await a.g.sincronizar(true); assert.equal(a.g.estado().erro, null); assert.equal(a.ler().length, 1);
});

test('Google Agenda: erro de rede, arquivo ausente, disco trocado e pausa não apagam eventos', async (t) => {
  const a = await montar(t); await a.g.selecionar('retro@example.test');
  const antes = a.ler();
  const s = a.fake.ler(); s.falhar = 503; fs.writeFileSync(path.join(a.pasta, 'google.json'), JSON.stringify(s));
  await a.g.sincronizar(true); assert.equal(a.g.estado().erro, 'rede'); assert.deepEqual(a.ler(), antes);
  fs.unlinkSync(a.disco.real('Documentos/Agenda.ics')); await a.g.sincronizar(true); assert.equal(a.g.estado().erro, 'arquivo');
  assert.equal(Object.values(a.fake.ler().eventos).filter((e) => e.status !== 'cancelled').length, 2);
  await a.gravar(antes); a.g.pausar(true); await a.g.sincronizar(true); assert.ok(a.g.estado().pausado);
  a.g.pausar(false); a.g.disco = new Disco(path.join(a.pasta, 'outro')); await a.g.sincronizar(true); assert.equal(a.g.estado().erro, 'disco');
});

test('Google OAuth: PKCE e state, credenciais cifradas e cancelamento do retorno tardio', async (t) => {
  const a = await montar(t, []); a.g.auth.desconectar();
  await a.g.auth.conectar(); const u = a.fake.login, retorno = new URL(u.searchParams.get('redirect_uri'));
  assert.equal(u.origin, 'https://accounts.google.com'); assert.equal(u.searchParams.get('code_challenge_method'), 'S256');
  const pedir = (state) => new Promise((resolve, reject) => { const r = new URL(retorno); r.search = new URLSearchParams({ state, code: 'codigo-teste' }); http.get(r, (res) => { res.resume(); res.on('end', () => resolve(res.statusCode)); }).on('error', reject); });
  assert.equal(await pedir('incorreto'), 400); assert.equal(a.g.auth.estado().conectado, false);
  assert.equal(await pedir(u.searchParams.get('state')), 200); assert.equal(a.g.auth.estado().conectado, true);
  const bytes = fs.readFileSync(path.join(a.pasta, 'conta', 'credenciais.bin')); assert.ok(!String(bytes).includes('refresh-teste'));
  assert.ok(!JSON.stringify(a.g.estado()).includes('token-teste'));
  await a.g.auth.conectar(); const velho = a.fake.login; a.g.auth.cancelar();
  assert.equal(a.g.auth.estado().autorizando, false); assert.ok(velho.searchParams.get('state'));
});

test('Disco: a gravação condicional impede que a sincronização sobrescreva a edição concorrente', async (t) => {
  const a = await montar(t, []); const arq = 'Documentos/Agenda.ics'; const antes = fs.readFileSync(a.disco.real(arq));
  const p = a.disco.gravar(arq, Buffer.from('edição concorrente'));
  const q = a.disco.gravar(arq, Buffer.from('sincronização antiga'), { esperado: hash(antes) });
  await p; await assert.rejects(q, (e) => e.codigo === 'alterado');
  assert.equal(fs.readFileSync(a.disco.real(arq), 'utf8'), 'edição concorrente');
});

test('Google eventos: dia todo, fuso, repetição e alterações de campos são preservados', async () => {
  const d = await doGoogle({ ...remoto, start: { date: '2026-11-04' }, end: { date: '2026-11-06' }, recurrence: ['RRULE:FREQ=DAILY;COUNT=3'] });
  assert.equal(d.diaTodo, true); assert.equal(d.fim, '2026-11-06'); assert.equal(d.repetir.vezes, 3);
  const p = await paraGoogle({ ...d, titulo: 'Outro' }, d); assert.deepEqual(p, { summary: 'Outro' });
  const f = await doGoogle(remoto); assert.equal(new Date(f.inicio).getTime(), Date.parse(remoto.start.dateTime));
  assert.equal(chave(f), JSON.stringify([remoto.iCalUID, '']));
});

test('Google Agenda: reiniciar preserva o estado incremental, e a versão do Google resolve exclusão local', async (t) => {
  const a = await montar(t); await a.g.selecionar('retro@example.test'); a.g.encerrar();
  const g = new GoogleAgenda({ pasta: path.join(a.pasta, 'conta'), disco: a.disco, arquivo: () => 'Documentos/Agenda.ics', cofre: a.fake.cofre, disponivel: () => true, buscar: a.fake.buscar, abrir: a.fake.abrir });
  t.after(() => g.encerrar());
  await g.sincronizar(true); assert.equal(a.ler().length, 2); assert.equal(g.estado().erro, null);
  await a.gravar(a.ler().filter((e) => e.uid !== remoto.iCalUID)); a.fake.modificar('remoto1', { summary: 'Google mais recente' });
  await g.sincronizar(true); assert.equal(g.estado().conflitos.length, 1);
  await g.resolver(g.estado().conflitos[0].chave, 'google');
  assert.equal(a.ler().find((e) => e.uid === remoto.iCalUID).titulo, 'Google mais recente');
});

test('Google Agenda: editar uma ocorrência usa a instância da série, sem criar outro evento', async (t) => {
  const a = await montar(t, [{ ...remoto, recurrence: ['RRULE:FREQ=DAILY;COUNT=4'] }]); await a.g.selecionar('retro@example.test');
  const master = a.ler().find((e) => e.uid === remoto.iCalUID);
  const evento = { ...master, inicio: '2026-11-05T12:00', fim: '2026-11-05T13:00', recorrencia: '2026-11-05T10:00', repetir: null, excecoes: [], titulo: 'Só esta ocorrência' };
  await a.gravar([...a.ler(), evento]); await a.g.sincronizar(true);
  assert.equal(a.g.estado().erro, null);
  const modificado = a.fake.ler().eventos.remoto1_instancia;
  assert.equal(modificado.summary, 'Só esta ocorrência'); assert.equal(modificado.recurringEventId, 'remoto1');
  assert.equal(a.fake.ler().pedidos.filter((p) => p.metodo === 'POST').length, 1, 'somente o evento local independente foi criado');
});

test('Google OAuth: uma renovação atrasada não reconecta a conta após Desconectar', async (t) => {
  const a = await montar(t, []); a.g.auth.dados.tokens.expira = 0;
  let liberar;
  a.g.auth.buscar = () => new Promise((resolve) => { liberar = resolve; });
  const p = a.g.auth.token(); a.g.auth.desconectar();
  liberar(new Response(JSON.stringify({ access_token: 'token-atrasado', expires_in: 3600 })));
  await assert.rejects(p, (e) => e.codigo === 'cancelado'); assert.equal(a.g.auth.estado().conectado, false);
});

test('Google Agenda: If-Match bloqueia uma alteração concorrente no servidor', async (t) => {
  const a = await montar(t); await a.g.selecionar('retro@example.test');
  await a.gravar(a.ler().map((e) => e.uid === remoto.iCalUID ? { ...e, titulo: 'Mudança local pendente' } : e));
  const buscar = a.g.auth.buscar; let mudou = false;
  a.g.auth.buscar = (url, o) => { if (!mudou && o.method === 'PATCH') { mudou = true; a.fake.modificar('remoto1', { summary: 'Mudança concorrente' }); } return buscar(url, o); };
  await a.g.sincronizar(true); assert.equal(a.g.estado().erro, 'conflito');
  assert.equal(a.fake.ler().eventos.remoto1.summary, 'Mudança concorrente');
  assert.equal(a.ler().find((e) => e.uid === remoto.iCalUID).titulo, 'Mudança local pendente');
  await a.g.sincronizar(true); assert.equal(a.g.estado().conflitos.length, 1);
});

test('Google Agenda: a recuperação inclui a cópia anterior mesmo após edição fora do Retro', async (t) => {
  const a = await montar(t); await a.g.selecionar('retro@example.test');
  const { gravarIcs } = await ics();
  fs.writeFileSync(a.disco.real('Documentos/Agenda.ics'), gravarIcs(a.ler().filter((e) => e.uid !== remoto.iCalUID)));
  await a.g.sincronizar(true);
  const dir = path.join(a.pasta, 'conta', 'recuperacao');
  const copias = fs.readdirSync(dir).filter((n) => n.endsWith('.json')).map((n) => JSON.parse(fs.readFileSync(path.join(dir, n))));
  assert.ok(copias.some((c) => c.eventosLocais.some((e) => e.uid === remoto.iCalUID) && c.eventosGoogle.remoto1?.attendees[0].email === 'preservar@example.test'));
  assert.ok(!JSON.stringify(copias).includes('refresh-teste'));
});

test('Google OAuth: configuração do instalador e validação do cliente não expõem credenciais', async (t) => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-google-cliente-')); t.after(() => fs.rmSync(pasta, { recursive: true, force: true }));
  const f = criarFake({ manual: true }); let disponivel = false;
  const a = new GoogleAuth({ pasta, cofre: f.cofre, disponivel: () => disponivel, clientePadrao: f.cliente, buscar: f.buscar, abrir: f.abrir }); t.after(() => a.encerrar());
  assert.equal(a.estado().configurado, true); assert.equal(a.estado().cofre, false);
  await assert.rejects(a.conectar(), (e) => e.codigo === 'cofre');
  disponivel = true; a.carregar(); assert.equal(a.estado().configurado, true);
  assert.throws(() => a.configurar({ web: f.cliente.installed }), (e) => e.codigo === 'cliente');
  a.guardarTokens({ access_token: 'teste', scope: 'https://www.googleapis.com/auth/calendar' });
  assert.equal(a.estado().conectado, true);
  assert.throws(() => a.guardarTokens({ access_token: 'teste', scope: 'https://www.googleapis.com/auth/calendar.readonly' }), (e) => e.codigo === 'permissao');
  assert.ok(!JSON.stringify(a.estado()).includes('client_secret'));
});

test('Google eventos: dia todo não perde um dia na troca do horário de verão', async () => {
  const anterior = process.env.TZ; process.env.TZ = 'America/New_York';
  try {
    const r = await paraGoogle({ ...local, inicio: '2026-11-01', fim: null });
    assert.deepEqual(r.start, { date: '2026-11-01' }); assert.deepEqual(r.end, { date: '2026-11-02' });
    const e = await doGoogle(remoto); assert.equal(e.inicio, '2026-11-04T05:00');
  } finally { if (anterior === undefined) delete process.env.TZ; else process.env.TZ = anterior; }
});

test('Google Agenda: duas escolhas concorrentes não trocam o destino no meio da ativação', async (t) => {
  const a = await montar(t); const listar = a.g.calendarios.bind(a.g); let liberar;
  a.g.calendarios = () => new Promise((resolve) => { liberar = async () => resolve(await listar()); });
  const primeira = a.g.selecionar('retro@example.test');
  await assert.rejects(a.g.selecionar('feriados@example.test'), (e) => e.codigo === 'desconectar');
  await liberar(); await primeira;
  assert.equal(a.g.estado().calendario.id, 'retro@example.test'); assert.equal(a.g.estado().erro, null);
});

test('Google: preparação do instalador não inclui tokens nem revela JSON inválido nos registros', (t) => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-google-build-')); t.after(() => fs.rmSync(pasta, { recursive: true, force: true }));
  fs.mkdirSync(path.join(pasta, 'ferramentas')); fs.mkdirSync(path.join(pasta, 'recursos'));
  const script = path.join(pasta, 'ferramentas', 'preparar-google.cjs'); fs.copyFileSync(path.join(__dirname, '../ferramentas/preparar-google.cjs'), script);
  const cliente = criarFake().cliente;
  const bom = spawnSync(process.execPath, [script], { encoding: 'utf8', env: { ...process.env, GOOGLE_CALENDAR_CLIENT_JSON: JSON.stringify({ ...cliente, refresh_token: 'nao-incluir-no-instalador' }) } });
  assert.equal(bom.status, 0);
  assert.ok(!fs.readFileSync(path.join(pasta, 'recursos', 'google-oauth.json'), 'utf8').includes('nao-incluir'));
  const ruim = spawnSync(process.execPath, [script], { encoding: 'utf8', env: { ...process.env, GOOGLE_CALENDAR_CLIENT_JSON: '{valor-privado-nao-mostrar' } });
  assert.notEqual(ruim.status, 0); assert.ok(!ruim.stderr.includes('valor-privado-nao-mostrar'));
});
