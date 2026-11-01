'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { formulario, validar, enderecoAutorizacao } = require('../src/principal/assistente-formularios');

test('MCP: os valores enviados preservam booleanos, números, enums e campos opcionais', () => {
  const cs = formulario({ type: 'object', properties: {
    confirmar: { type: 'boolean', default: false }, quantidade: { type: 'integer', minimum: 1, maximum: 3 },
    escolhas: { type: 'array', items: { type: 'string', anyOf: [{ const: 'a', title: 'A' }, { const: 'b', title: 'B' }] }, minItems: 1 },
    nota: { type: 'string' },
  }, required: ['confirmar', 'quantidade', 'escolhas'] });
  // O MCP usa anyOf nas opções de uma seleção múltipla.
  assert.ok(cs);
  const r = validar(cs, { confirmar: false, quantidade: 2, escolhas: ['b'] });
  assert.equal(r.confirmar, false); assert.equal(r.quantidade, 2); assert.deepEqual(r.escolhas, ['b']); assert.ok(!Object.hasOwn(r, 'nota'));
  assert.throws(() => validar(cs, { confirmar: 'true', quantidade: 2, escolhas: ['b'] }), /campo/);
  assert.throws(() => validar(cs, { confirmar: true, quantidade: 4, escolhas: ['b'] }), /campo/);
  assert.throws(() => validar(cs, { confirmar: true, quantidade: 2, escolhas: ['x'] }), /campo/);
  assert.throws(() => validar(cs, { confirmar: true, quantidade: 2, escolhas: ['b', 'b'] }), /campo/);
  assert.throws(() => validar(cs, { confirmar: true, quantidade: 2, escolhas: ['b'], segredo: 'extra' }), /inválida/);
});

test('MCP: confirmações sem campos, formatos e esquemas não suportados', () => {
  assert.deepEqual(formulario({ type: 'object', properties: {} }), []);
  assert.deepEqual(Object.keys(validar([], {})), []);
  const cs = formulario({ type: 'object', properties: { email: { type: 'string', format: 'email' }, data: { type: 'string', format: 'date' } }, required: ['email', 'data'] });
  assert.throws(() => validar(cs, { email: 'incorreto', data: '2026-11-01' }), /campo/);
  assert.throws(() => validar(cs, { email: 'teste@example.test', data: '2026-99-99' }), /campo/);
  assert.throws(() => validar(cs, { email: 'teste@example.test', data: '2026-02-30' }), /campo/);
  assert.equal(validar(cs, { email: 'teste@example.test', data: '2026-11-01' }).data, '2026-11-01');
  assert.equal(formulario({ type: 'object', properties: { x: { type: 'string', enum: {} } } }), null);
  assert.equal(formulario({ type: 'object', properties: { x: { type: 'object', properties: {} } } }), null);
  assert.equal(formulario({ type: 'object', properties: { x: { type: 'string', $ref: 'https://example.test/' } } }), null);
});

test('MCP: endereços de autorização permitem HTTPS e desenvolvimento local, recusando execução e credenciais', () => {
  assert.equal(enderecoAutorizacao('https://servico.example.test/autorizar?pedido=1'), 'https://servico.example.test/autorizar?pedido=1');
  assert.equal(enderecoAutorizacao('http://127.0.0.1:3000/autorizar'), 'http://127.0.0.1:3000/autorizar');
  for (const url of ['javascript:alert(1)', 'file:///etc/passwd', 'data:text/html,teste', 'http://example.test/', 'https://usuario:senha@example.test/', 'inválido']) assert.equal(enderecoAutorizacao(url), null);
});
