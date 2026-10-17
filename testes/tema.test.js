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

/** Os pontos de um PNG RGBA de 8 bits sem entrelaçamento (o que ferramentas/icones-mac.py grava). */
function lerPng(arq) {
  const b = fs.readFileSync(arq);
  const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  assert.equal(b[24], 8, `${arq}: 8 bits`);
  assert.equal(b[25], 6, `${arq}: RGBA`);
  assert.equal(b[28], 0, `${arq}: sem entrelaçamento`);
  const partes = [];
  for (let i = 8; i < b.length;) {
    const tam = b.readUInt32BE(i);
    if (b.toString('latin1', i + 4, i + 8) === 'IDAT') partes.push(b.subarray(i + 8, i + 8 + tam));
    i += 12 + tam;
  }
  const cru = require('node:zlib').inflateSync(Buffer.concat(partes));
  const linha = w * 4;
  const px = Buffer.alloc(linha * h);
  const paeth = (a, c, d) => { const p = a + c - d; const pa = Math.abs(p - a), pb = Math.abs(p - c), pc = Math.abs(p - d); return pa <= pb && pa <= pc ? a : pb <= pc ? c : d; };
  for (let y = 0; y < h; y++) {
    const filtro = cru[y * (linha + 1)];
    for (let x = 0; x < linha; x++) {
      const v = cru[y * (linha + 1) + 1 + x];
      const a = x >= 4 ? px[y * linha + x - 4] : 0;
      const c = y ? px[(y - 1) * linha + x] : 0;
      const d = x >= 4 && y ? px[(y - 1) * linha + x - 4] : 0;
      px[y * linha + x] = (v + [0, a, c, (a + c) >> 1, paeth(a, c, d)][filtro]) & 255;
    }
  }
  return { w, h, ponto: (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? [0, 0, 0, 0] : [...px.subarray((y * w + x) * 4, (y * w + x) * 4 + 4)]) };
}

test('no tema Mac, a borda de fora de cada ícone é escura (nenhuma sombra ou luz por cima do contorno)', async () => {
  const { ICONES_MAC } = await modulo('icones-mac.js');
  for (const item of ICONES_MAC) {
    const [tam, nome] = item.split('/');
    const im = lerPng(path.join(SISTEMA, 'icones-mac', tam, nome + '.png'));
    for (let y = 0; y < im.h; y++) {
      for (let x = 0; x < im.w; x++) {
        const [r, g, b, a] = im.ponto(x, y);
        if (!a) continue;
        const naBorda = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !im.ponto(x + dx, y + dy)[3]);
        if (naBorda) assert.ok(r + g + b < 300, `${item}: o ponto ${x},${y} da borda é claro (${r},${g},${b})`);
      }
    }
  }
});
