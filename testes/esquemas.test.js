'use strict';
// Os esquemas de cores (esquemas.js): as variáveis de cada um, o Padrão sem regra e o fundo que acompanha.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const carregar = () => import('../src/sistema/js/esquemas.js');

test('esquemas: cada um tem todas as variáveis do :root, e o Padrão fica sem regra', async () => {
  const { ESQUEMAS, estiloDoEsquema, variaveisDoEsquema, esquemaValido } = await carregar();
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'sistema', 'estilo.css'), 'utf8');
  const raiz = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
  // As cores do :root (não os relevos nem os desenhos, que são calculados a partir delas; nem a da
  // mesa, que vem do fundo escolhido, e cada esquema traz a sua em `mesa`).
  const doRoot = [...raiz.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6});/gi)].filter((m) => m[1] !== 'mesa');
  const cores = doRoot.map((m) => m[1]);
  assert.ok(cores.includes('texto') && cores.includes('janela') && cores.includes('face'), cores.join());
  for (const [id, e] of Object.entries(ESQUEMAS)) {
    const vars = variaveisDoEsquema(id);
    for (const c of cores) assert.match(vars, new RegExp(`--${c}: #[0-9a-f]{6};`), `${id}: falta --${c}`);
    assert.match(e.mesa, /^#[0-9a-f]{6}$/);
    if (id === 'padrao') assert.equal(estiloDoEsquema(id), '');
    else {
      const regra = estiloDoEsquema(id);
      assert.ok(regra.startsWith('html:not(.tema-mac) {'), id);
      assert.equal(regra.includes('color-scheme: dark'), !!e.escuro, id);
      assert.ok(!/javascript:|<\/style/i.test(regra), id);
    }
  }
  // As cores do Padrão são as do :root (a prévia do Padrão mostra o que a página mostra sem regra).
  const padrao = variaveisDoEsquema('padrao');
  for (const m of doRoot) assert.ok(padrao.includes(`--${m[1]}: ${m[2].toLowerCase()};`), `padrão: --${m[1]}`);
  assert.equal(esquemaValido('nada'), 'padrao');
  assert.equal(esquemaValido('__proto__'), 'padrao');
  assert.equal(esquemaValido('noite'), 'noite');
});

test('esquemas: o fundo de sempre acompanha o esquema; o escolhido pelo usuário fica', async () => {
  const { fundoParaEsquema, ESQUEMAS } = await carregar();
  assert.deepEqual(fundoParaEsquema({ cor: '#008080', padrao: 'nenhum' }, 'padrao', 'noite'), { cor: ESQUEMAS.noite.mesa, padrao: 'nenhum' });
  assert.deepEqual(fundoParaEsquema({ cor: ESQUEMAS.noite.mesa, padrao: 'nenhum' }, 'noite', 'oceano'), { cor: ESQUEMAS.oceano.mesa, padrao: 'nenhum' });
  const meu = { cor: '#123456', padrao: 'nenhum' };
  assert.equal(fundoParaEsquema(meu, 'padrao', 'noite'), meu);
  const comImagem = { cor: '#008080', padrao: 'nenhum', imagem: 'x.png' };
  assert.equal(fundoParaEsquema(comImagem, 'padrao', 'noite'), comImagem);
  const comPadrao = { cor: '#008080', padrao: 'tijolos' };
  assert.equal(fundoParaEsquema(comPadrao, 'padrao', 'noite'), comPadrao);
});
