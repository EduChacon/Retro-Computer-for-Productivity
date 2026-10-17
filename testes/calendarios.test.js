'use strict';
// Os calendários da internet da Agenda (calendarios.js): o endereço só https, o .ics conferido, a
// cópia guardada, os erros anotados sem perder a cópia e a área de trabalho sem ver o endereço.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Config } = require('../src/principal/config');
const c = require('../src/principal/calendarios');

const ICS = 'BEGIN:VCALENDAR\r\nX-WR-CALNAME:Feriados\\, Brasil\r\nBEGIN:VEVENT\r\nUID:x\r\nDTSTART;VALUE=DATE:20261102\r\nSUMMARY:Finados\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n';

function ambiente(respostas) {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-cal-'));
  const config = new Config(pasta, null);
  const pedidos = [];
  const buscar = async (url, o) => {
    pedidos.push({ url, o });
    const r = respostas[url];
    if (r instanceof Error) throw r;
    if (r == null) { const e = new Error('http'); e.codigo = 'http'; e.status = 404; throw e; }
    return Buffer.from(r);
  };
  const cal = new c.Calendarios({ pasta: path.join(pasta, 'calendarios'), config, buscar });
  return { pasta, config, cal, pedidos, fim: () => fs.rmSync(pasta, { recursive: true, force: true }) };
}

test('calendários: só https (o webcal vira https), sem usuário e senha', () => {
  assert.equal(c.normalizarEndereco(' webcal://exemplo.com/a.ics '), 'https://exemplo.com/a.ics');
  assert.equal(c.normalizarEndereco('webcals://exemplo.com/a.ics#x'), 'https://exemplo.com/a.ics');
  assert.equal(c.normalizarEndereco('https://calendar.google.com/calendar/ical/x%40group/private-abc/basic.ics'), 'https://calendar.google.com/calendar/ical/x%40group/private-abc/basic.ics');
  for (const ruim of ['http://exemplo.com/a.ics', 'file:///etc/passwd', 'javascript:alert(1)', 'ftp://x/y', '', 'https://', 'https://x/' + 'a'.repeat(2100)]) {
    assert.throws(() => c.normalizarEndereco(ruim), (e) => e.codigo === 'endereco', ruim);
  }
  assert.throws(() => c.normalizarEndereco('https://eu:segredo@exemplo.com/a.ics'), (e) => e.codigo === 'credenciais');
});

test('calendários: o que não é um .ics é recusado; o BOM e o nome do calendário', () => {
  assert.throws(() => c.conferirIcs(Buffer.from('<html>login</html>')), (e) => e.codigo === 'formato');
  assert.match(c.conferirIcs(Buffer.from('﻿' + ICS)), /^BEGIN:VCALENDAR/);
  assert.equal(c.nomeDoIcs(ICS), 'Feriados, Brasil');
  assert.equal(c.nomeDoIcs('BEGIN:VCALENDAR\r\nX-WR-CALNAME:a\u0007b\r\n'), 'a b');
});

test('calendários: assinar guarda a cópia e o nome; o mesmo endereço duas vezes não', async () => {
  const a = ambiente({ 'https://exemplo.com/f.ics': ICS });
  try {
    const id = await a.cal.adicionar({ endereco: 'webcal://exemplo.com/f.ics' });
    assert.match(id, /^[0-9a-f]{12}$/);
    assert.equal(a.pedidos[0].o.limite, c.MAX_BYTES);
    const [item] = a.cal.lista();
    assert.equal(item.nome, 'Feriados, Brasil');
    assert.equal(item.url, 'https://exemplo.com/f.ics');
    assert.equal(item.lembretes, false);
    assert.equal(a.cal.ler(id), ICS);
    await assert.rejects(a.cal.adicionar({ endereco: 'https://exemplo.com/f.ics' }), (e) => e.codigo === 'repetido');
    // O que não baixa nem entra na lista.
    await assert.rejects(a.cal.adicionar({ endereco: 'https://exemplo.com/nada.ics' }), (e) => e.codigo === 'http' && e.status === 404);
    assert.equal(a.cal.lista().length, 1);
  } finally { a.fim(); }
});

test('calendários: o erro ao atualizar fica anotado e a cópia de antes continua', async () => {
  const respostas = { 'https://exemplo.com/f.ics': ICS };
  const a = ambiente(respostas);
  try {
    const id = await a.cal.adicionar({ endereco: 'https://exemplo.com/f.ics', nome: 'Feriados', lembretes: true });
    respostas['https://exemplo.com/f.ics'] = '<html>fora do ar</html>';
    await assert.rejects(a.cal.atualizar(id), (e) => e.codigo === 'formato');
    assert.equal(a.cal.lista()[0].erro, 'formato');
    assert.equal(a.cal.ler(id), ICS, 'a cópia de antes fica');
    respostas['https://exemplo.com/f.ics'] = ICS.replace('Finados', 'Dia de Finados');
    await a.cal.atualizar(id);
    assert.equal(a.cal.lista()[0].erro, null);
    assert.match(a.cal.ler(id), /Dia de Finados/);
  } finally { a.fim(); }
});

test('calendários: a área de trabalho só muda o nome, os lembretes e se aparece; o id é conferido', async () => {
  const a = ambiente({ 'https://exemplo.com/f.ics': ICS });
  try {
    const id = await a.cal.adicionar({ endereco: 'https://exemplo.com/f.ics' });
    a.cal.mudar(id, { nome: 'Outro\nnome', lembretes: true, ligado: false, url: 'https://mau.example/x.ics', ultima: 0 });
    const [item] = a.cal.lista();
    assert.equal(item.nome, 'Outro nome');
    assert.equal(item.lembretes, true);
    assert.equal(item.ligado, false);
    assert.equal(item.url, 'https://exemplo.com/f.ics', 'o endereço não muda por aqui');
    assert.ok(item.ultima > 0);
    for (const ruim of ['../config', '..', 'abc', '/etc/passwd']) assert.throws(() => a.cal.ler(ruim), (e) => e.codigo === 'desconhecido', ruim);
    a.cal.remover(id);
    assert.equal(a.cal.lista().length, 0);
    assert.ok(!fs.existsSync(path.join(a.pasta, 'calendarios', `${id}.ics`)));
  } finally { a.fim(); }
});

test('calendários: no máximo vinte', async () => {
  const respostas = {};
  for (let i = 0; i <= c.MAX_CALENDARIOS; i++) respostas[`https://exemplo.com/${i}.ics`] = ICS;
  const a = ambiente(respostas);
  try {
    for (let i = 0; i < c.MAX_CALENDARIOS; i++) await a.cal.adicionar({ endereco: `https://exemplo.com/${i}.ics` });
    await assert.rejects(a.cal.adicionar({ endereco: `https://exemplo.com/${c.MAX_CALENDARIOS}.ics` }), (e) => e.codigo === 'muitos');
  } finally { a.fim(); }
});

test('calendários: a área de trabalho e o Claude veem o site, não o endereço', () => {
  const cfg = { agenda: { vistos: ['x'], calendarios: [{ id: 'aaaaaaaaaaaa', url: 'https://calendar.google.com/calendar/ical/private-segredo/basic.ics', nome: 'Trabalho' }] } };
  const v = c.semEnderecos(cfg);
  assert.deepEqual(v.agenda.calendarios, [{ id: 'aaaaaaaaaaaa', nome: 'Trabalho', site: 'calendar.google.com' }]);
  assert.deepEqual(v.agenda.vistos, ['x']);
  assert.ok(!JSON.stringify(v).includes('segredo'));
  assert.equal(cfg.agenda.calendarios[0].url.includes('segredo'), true, 'o original não muda');
});

test('calendários: a versão de mentira lê da pasta e respeita o limite', async () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-cal-falso-'));
  try {
    fs.writeFileSync(path.join(pasta, 'f.ics'), ICS);
    const buscar = c.buscarFalso(pasta);
    assert.equal(String(await buscar('https://exemplo.invalid/x/f.ics')), ICS);
    await assert.rejects(buscar('https://exemplo.invalid/f.ics', { limite: 10 }), (e) => e.codigo === 'grande');
    await assert.rejects(buscar('https://exemplo.invalid/falta.ics'), (e) => e.codigo === 'http');
  } finally { fs.rmSync(pasta, { recursive: true, force: true }); }
});
