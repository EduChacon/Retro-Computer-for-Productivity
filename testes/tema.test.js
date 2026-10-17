'use strict';
// O tema Mac clássico: a troca do fundo entre os temas (aparencia.js) e os ícones próprios dele
// (a lista de icones-mac.js e os arquivos em icones-mac/, desenhados por ferramentas/icones-mac.py).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const SISTEMA = path.join(__dirname, '..', 'src', 'sistema');
const modulo = (nome) => import(pathToFileURL(path.join(SISTEMA, 'js', nome)).href);

test('o fundo de sempre de um tema vira o do outro; o escolhido pelo usuário fica', async () => {
  const { FUNDO_TEMA, fundoParaTema } = await modulo('aparencia.js');
  assert.deepEqual(fundoParaTema({ cor: '#008080', padrao: 'nenhum' }, 'pc', 'mac'), { ...FUNDO_TEMA.mac });
  assert.deepEqual(fundoParaTema({ ...FUNDO_TEMA.mac }, 'mac', 'pc'), { ...FUNDO_TEMA.pc });
  // Sem nada guardado, vale o de sempre do PC.
  assert.deepEqual(fundoParaTema({}, 'pc', 'mac'), { ...FUNDO_TEMA.mac });
  // Outra cor, outro padrão ou uma imagem: ficam como estão.
  assert.deepEqual(fundoParaTema({ cor: '#800000', padrao: 'nenhum' }, 'pc', 'mac'), { cor: '#800000', padrao: 'nenhum' });
  assert.deepEqual(fundoParaTema({ cor: '#008080', padrao: 'tijolos' }, 'pc', 'mac'), { cor: '#008080', padrao: 'tijolos' });
  const comImagem = { cor: '#008080', padrao: 'nenhum', imagem: 'abc.png', modo: 'preencher' };
  assert.deepEqual(fundoParaTema(comImagem, 'pc', 'mac'), comImagem);
});

test('cada ícone da lista do tema Mac existe, no tamanho certo, e os principais têm os dois tamanhos', async () => {
  const { ICONES_MAC } = await modulo('icones-mac.js');
  assert.ok(ICONES_MAC.size > 50);
  for (const item of ICONES_MAC) {
    const [tam, nome] = item.split('/');
    const arq = path.join(SISTEMA, 'icones-mac', tam, nome + '.png');
    assert.ok(fs.existsSync(arq), `falta ${arq}`);
    const png = fs.readFileSync(arq);
    // A largura e a altura ficam no cabeçalho IHDR do PNG.
    assert.equal(png.readUInt32BE(16), Number(tam), `${item}: largura`);
    assert.equal(png.readUInt32BE(20), Number(tam), `${item}: altura`);
    // O mesmo nome existe no tema do PC (o Mac só troca o desenho).
    assert.ok(fs.existsSync(path.join(SISTEMA, 'icones', tam, nome + '.png')), `${item} não existe no tema do PC`);
  }
  for (const nome of ['pasta', 'pasta-aberta', 'documentos', 'computador', 'disco', 'lixeira', 'lixeira-cheia', 'arquivo', 'texto', 'navegador', 'correio', 'bloco', 'prompt', 'painel']) {
    assert.ok(ICONES_MAC.has('32/' + nome) && ICONES_MAC.has('16/' + nome), `${nome}: os dois tamanhos`);
  }
});
