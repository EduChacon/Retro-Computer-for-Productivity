'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { LaboratorioProgramacao, ambiente, candidatos, MAX_SAIDA } = require('../src/principal/laboratorio');

async function laboratorio(t, opcoes) {
  const c = new LaboratorioProgramacao(opcoes);
  if (!(await c.detectar())) { t.skip('sem GCC ou Clang nesta máquina'); return null; }
  return c;
}

test('compila C11, recebe stdin e devolve stdout e o código de saída', async (t) => {
  const c = await laboratorio(t); if (!c) return;
  const r = await c.executar({ codigo: '#include <stdio.h>\nint main(void) { int n; if (scanf("%d", &n) != 1) return 2; printf("%d\\n", n*2); return 0; }', entrada: '21\n' });
  assert.equal(r.etapa, 'executar'); assert.equal(r.codigo, 0); assert.equal(r.saida, '42\n');
  assert.equal(c.ativo, null);
});

test('um erro de sintaxe mostra a linha e não executa um binário anterior', async (t) => {
  const c = await laboratorio(t); if (!c) return;
  const r = await c.executar({ codigo: 'int main(void) { return erro_de_sintaxe; }' });
  assert.equal(r.etapa, 'compilar'); assert.notEqual(r.codigo, 0); assert.match(r.saida, /programa.c:1/);
});

test('um laço infinito termina no prazo, e o laboratório pode rodar de novo', async (t) => {
  const c = await laboratorio(t, { tempoExecutar: 150 }); if (!c) return;
  const r = await c.executar({ codigo: 'int main(void) { for (;;) {} }' });
  assert.equal(r.motivo, 'tempo');
  assert.equal((await c.executar({ codigo: 'int main(void) { return 7; }' })).codigo, 7);
});

test('Parar cancela o trabalho e recusa duas execuções simultâneas', async (t) => {
  const c = await laboratorio(t); if (!c) return;
  const p = c.executar({ codigo: 'int main(void) { for (;;) {} }' });
  await assert.rejects(c.executar({ codigo: 'int main(void) {}' }), /Já existe/);
  c.parar(); assert.equal((await p).motivo, 'cancelado'); assert.equal(c.ativo, null);
});

test('uma saída sem fim é limitada a 64 KiB', async (t) => {
  const c = await laboratorio(t); if (!c) return;
  const r = await c.executar({ codigo: '#include <stdio.h>\nint main(void) { for (;;) puts("0123456789"); }' });
  assert.equal(r.motivo, 'saida'); assert.ok(Buffer.byteLength(r.saida) <= MAX_SAIDA);
});

test('recusa entradas inválidas e informa a falta do compilador', async () => {
  const c = new LaboratorioProgramacao({ procurar: [] });
  await assert.rejects(c.executar({ codigo: '\0' }), /inválido/);
  await assert.rejects(c.executar({ codigo: 'a'.repeat(262145) }), /grande demais/);
  await assert.rejects(c.executar({ codigo: 'int main(void) {}' }), /ferramenta desta linguagem/);
  assert.equal(c.ativo, null);
});

test('o ambiente não herda chaves e encontra o MSYS2 fora do PATH', () => {
  const env = ambiente({ PATH: '/usr/bin', ANTHROPIC_API_KEY: 'nao-herdar', RETRO_PEDIDO: 'nao-herdar', OPENAI_API_KEY: 'nao-herdar' });
  assert.deepEqual(env, { PATH: '/usr/bin' });
  assert.ok(candidatos('darwin').includes('/usr/bin/clang'));
  assert.ok(candidatos('win32', {}).includes('C:\\msys64\\ucrt64\\bin\\gcc.exe'));
});

test('Python recebe entrada e mostra os erros de execução', async (t) => {
  const c = new LaboratorioProgramacao();
  if (!(await c.detectar('python'))) return t.skip('sem Python');
  const r = await c.executar({ linguagem: 'python', codigo: 'n = int(input())\nprint(n * 2)', entrada: '21\n' });
  assert.equal(r.codigo, 0); assert.equal(r.saida.trim(), '42');
  const e = await c.executar({ linguagem: 'python', codigo: 'print(1 / 0)' });
  assert.notEqual(e.codigo, 0); assert.match(e.saida, /ZeroDivisionError/);
});

test('C++ compila com a biblioteca padrão', async (t) => {
  const c = new LaboratorioProgramacao();
  if (!(await c.detectar('cpp'))) return t.skip('sem C++');
  const r = await c.executar({ linguagem: 'cpp', codigo: '#include <iostream>\nint main() { std::cout << 42 << std::endl; }' });
  assert.equal(r.codigo, 0); assert.equal(r.saida.trim(), '42');
});

for (const [linguagem, codigo] of [
  ['rust', 'fn main() { println!("42"); }'],
  ['java', 'public class Main { public static void main(String[] args) { System.out.println(42); } }'],
  ['csharp', 'using System; class Programa { static void Main() { Console.WriteLine(42); } }'],
]) {
  test(`${linguagem}: compila e executa de verdade quando a ferramenta está instalada`, async (t) => {
    const c = new LaboratorioProgramacao();
    if (!(await c.detectar(linguagem))) return t.skip('ferramenta não instalada');
    const r = await c.executar({ linguagem, codigo });
    assert.equal(r.codigo, 0, r.saida); assert.equal(r.saida.trim(), '42');
  });
}

test('uma linguagem desconhecida nunca vira um comando', async () => {
  const c = new LaboratorioProgramacao();
  await assert.rejects(c.executar({ linguagem: '../../bin/sh', codigo: '' }), /não suportada/);
});
