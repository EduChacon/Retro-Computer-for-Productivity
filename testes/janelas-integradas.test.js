'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { JanelasIntegradas, geometria } = require('../src/principal/janelas-integradas');
const g = { ret: { x: 15, y: 60, w: 500, h: 300 }, viewport: { w: 1024, h: 700 }, visivel: true };
function montar(plataforma = 'win32') {
  const pedidos = [], abertos = [];
  const ponte = { pedir: async (acao, dados) => { pedidos.push({ acao, dados }); if (acao === 'estado') return { permitido: true }; if (acao === 'listar') return [{ id: 'janela-conhecida', titulo: 'Documento' }]; if (acao === 'consultar') return { aberta: true }; return { ok: true }; }, encerrar() { pedidos.push({ acao: 'encerrar' }); } };
  const aplicativos = { achar: (id) => id === 'programa' ? { nome: 'Programa' } : null, alvoIntegracao: (id) => id === 'programa' ? '/alvo/conhecido.exe' : null, abrir: async (id) => { abertos.push(id); } };
  return { j: new JanelasIntegradas({ aplicativos, ponte, plataforma, organizar: async () => ({ x: 500, y: 0, w: 500, h: 700 }) }), ponte, pedidos, abertos };
}
test('integração: só abre programas e janelas reconhecidos, com uma sessão por programa', async () => {
  const a = montar(); await assert.rejects(a.j.abrir('/tmp/comando.exe'), { codigo: 'programa' });
  const [s, outro] = await Promise.all([a.j.abrir('programa'), a.j.abrir('programa')]);
  assert.equal(s.id, outro.id); assert.deepEqual(a.abertos, ['programa']); assert.equal(s.modo, 'embutida');
  assert.equal('arquivo' in s, false); await assert.rejects(a.j.associar(s.id, 'hwnd-arbitrario', g), { codigo: 'sessao' });
  await a.j.associar(s.id, s.janelas[0].id, g);
  await assert.rejects(a.j.associar(s.id, s.janelas[0].id, g), { codigo: 'sessao' });
  await a.j.atualizar(s.id, g); await a.j.atualizar(s.id, g);
  assert.equal(a.pedidos.filter((p) => p.acao === 'posicionar').length, 1);
  await assert.rejects(a.j.acao(s.id, 'executar-comando'), { codigo: 'sessao' });
  await a.j.soltar(s.id); await assert.rejects(a.j.estado(s.id), { codigo: 'sessao' });
  assert.equal(a.pedidos.at(-1).acao, 'soltar');
});
test('integração: tela bloqueada impede foco e mantém a área nativa oculta', async () => {
  const a = montar(), s = await a.j.abrir('programa'); await a.j.associar(s.id, s.janelas[0].id, g);
  await a.j.bloquear(true); await a.j.atualizar(s.id, g); assert.equal(a.pedidos.at(-1).dados.visivel, false);
  await assert.rejects(a.j.acao(s.id, 'focar'), { codigo: 'sessao' });
  await a.j.bloquear(false); await a.j.atualizar(s.id, g); assert.equal(a.pedidos.at(-1).dados.visivel, true);
});
test('integração: permissão do Mac é explícita e o modo preserva a moldura nativa', async () => {
  const a = montar('darwin'), original = a.ponte.pedir; let permitido = false;
  a.ponte.pedir = async (acao, dados) => { if (acao === 'estado') return { permitido }; return original(acao, dados); };
  await assert.rejects(a.j.abrir('programa'), { codigo: 'permissao' }); assert.deepEqual(a.abertos, []); assert.equal(a.pedidos.length, 0);
  await a.j.permitir(); assert.equal(a.pedidos.at(-1).acao, 'permitir'); permitido = true;
  const s = await a.j.abrir('programa'); assert.equal(s.modo, 'acompanhada');
  await a.j.associar(s.id, s.janelas[0].id); await a.j.acao(s.id, 'organizar');
  assert.deepEqual(a.pedidos.at(-1), { acao: 'organizar', dados: { janela: 'janela-conhecida', ret: { x: 500, y: 0, w: 500, h: 700 } } });
});
test('integração: falha ao associar permite tentar de novo; falha ao devolver mantém a sessão', async () => {
  const a = montar(), s = await a.j.abrir('programa'), original = a.ponte.pedir;
  a.ponte.pedir = async () => { throw new Error('falha'); };
  await assert.rejects(a.j.associar(s.id, s.janelas[0].id, g)); assert.equal(a.j.obter(s.id).escolhida, null);
  a.ponte.pedir = original; await a.j.associar(s.id, s.janelas[0].id, g);
  a.ponte.pedir = async () => { throw new Error('falha'); }; await assert.rejects(a.j.soltar(s.id)); assert.ok(a.j.obter(s.id));
});
test('integração: sair durante a procura não deixa uma sessão anexada', async () => {
  const a = montar(); a.j.aplicativos.abrir = async () => a.j.encerrar();
  await assert.rejects(a.j.abrir('programa'), { codigo: 'sessao' }); assert.equal(a.j.sessoes.size, 0);
});
test('integração: geometria fica dentro da área visível e recusa números inválidos', () => {
  assert.deepEqual(geometria(g), g);
  for (const ret of [{ ...g.ret, x: -1 }, { ...g.ret, w: Infinity }, { ...g.ret, h: NaN }, { ...g.ret, x: 1000 }]) assert.throws(() => geometria({ ...g, ret }), { codigo: 'programa' });
});
