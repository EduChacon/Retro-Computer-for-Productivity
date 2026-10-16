'use strict';
// As regras das Damas e do Xadrez (src/sistema/js/jogos), sem a tela.
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const modulo = (nome) => import(pathToFileURL(path.join(__dirname, '../src/sistema/js/jogos', nome)).href);

test('xadrez: as contagens de referência (perft) com o roque, o en passant e a promoção', async () => {
  const { Xadrez } = await modulo('xadrez.js');
  const casos = [
    ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', [20, 400, 8902, 197281]],
    ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', [48, 2039, 97862]],
    ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', [14, 191, 2812, 43238]],
    ['r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', [6, 264, 9467]],
    ['rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', [44, 1486, 62379]],
  ];
  for (const [fen, esperado] of casos) {
    const x = new Xadrez(fen);
    assert.deepStrictEqual(esperado.map((_, i) => x.perft(i + 1)), esperado, fen);
    // Fazer e desfazer não muda nada.
    assert.strictEqual(x.fen(), fen);
  }
});

test('xadrez: a notação, o xeque-mate, o afogamento e os empates', async () => {
  const { Xadrez } = await modulo('xadrez.js');
  const jogar = (x, ...lances) => lances.map((u) => x.jogar(x.deUci(u), 'RDTBC') && x.feitos[x.feitos.length - 1].san);
  // O mate do louco.
  let x = new Xadrez();
  assert.deepStrictEqual(jogar(x, 'f2f3', 'e7e5', 'g2g4', 'd8h4'), ['f3', 'e5', 'g4', 'Dh4#']);
  assert.deepStrictEqual([x.situacao().fim, x.situacao().vencedor], ['mate', -1]);
  // O roque, a desambiguação e a promoção.
  x = new Xadrez('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  assert.strictEqual(x.san(x.deUci('e1g1')), 'O-O');
  assert.strictEqual(x.san(x.deUci('e1c1')), 'O-O-O');
  // A torre de h1 não chega a d1 (o rei está no caminho): sem a letra da coluna.
  assert.strictEqual(x.san(x.deUci('a1d1')), 'Rd1');
  x = new Xadrez('4k3/8/8/8/8/8/4K3/R6R w - - 0 1');
  assert.strictEqual(x.san(x.deUci('a1d1')), 'Rad1');
  assert.strictEqual(x.san(x.deUci('h1d1'), 'RDTBC'), 'Thd1');
  x = new Xadrez('8/P6k/8/8/8/8/8/K7 w - - 0 1');
  assert.strictEqual(x.lances().filter((m) => m.de === 8).length, 4);
  assert.strictEqual(x.san(x.deUci('a7a8q'), 'RDTBC'), 'a8=D');
  // O en passant.
  x = new Xadrez('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
  assert.strictEqual(x.san(x.deUci('e5d6')), 'exd6');
  // O afogamento e o material insuficiente.
  x = new Xadrez('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
  assert.strictEqual(x.situacao().fim, 'afogamento');
  assert.strictEqual(new Xadrez('8/8/4k3/8/8/2B5/4K3/8 w - - 0 1').situacao().fim, 'material');
  assert.strictEqual(new Xadrez('8/8/4k3/8/8/2B5/4KP2/8 w - - 0 1').situacao().fim, null);
  // As três repetições.
  x = new Xadrez();
  jogar(x, 'g1f3', 'g8f6', 'f3g1', 'f6g8', 'g1f3', 'g8f6', 'f3g1', 'f6g8');
  assert.strictEqual(x.situacao().fim, 'repeticao');
  // Os 50 lances.
  assert.strictEqual(new Xadrez('4k3/8/8/8/8/8/8/R3K3 w - - 100 80').situacao().fim, 'cinquenta');
  // Voltar desfaz tudo, até o roque.
  x = new Xadrez('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  jogar(x, 'e1g1');
  x.voltar();
  assert.strictEqual(x.fen(), 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
});

test('xadrez: o computador acha o mate e não entrega a dama', async () => {
  const { Xadrez, melhorLance } = await modulo('xadrez.js');
  let x = new Xadrez('6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1');
  assert.strictEqual(x.san(melhorLance(x, 'medio')), 'Rd8#');
  x = new Xadrez('r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 2 3');
  assert.strictEqual(x.san(melhorLance(x, 'medio')), 'Qxf7#');
  // A dama atacada por um peão sai de lá.
  x = new Xadrez('rnb1kbnr/pppp1ppp/8/4p3/3q4/2P5/PP1PPPPP/RNBQKBNR b KQkq - 0 3');
  const m = melhorLance(x, 'medio');
  assert.strictEqual(m.de, 35);
});

test('damas: as regras brasileiras (tomar para trás, a maioria, a dama que voa, passar sem coroar)', async () => {
  const { Damas } = await modulo('damas.js');
  const casa = (s) => (8 - Number(s[1])) * 8 + 'abcdefgh'.indexOf(s[0]);
  const nome = (c) => 'abcdefgh'[c & 7] + (8 - (c >> 3));
  const texto = (lista) => lista.map((m) => nome(m.de) + m.caminho.map((c) => (m.tomadas.length ? 'x' : '-') + nome(c)).join('') + (m.coroa ? '=D' : '')).sort();
  const com = (pecas, regra = 'brasileiras', vez = 1) => {
    const t = new Int8Array(64);
    for (const [s, p] of Object.entries(pecas)) t[casa(s)] = p;
    return new Damas(regra, t, vez);
  };
  assert.deepStrictEqual(texto(new Damas().lances()), ['a3-b4', 'c3-b4', 'c3-d4', 'e3-d4', 'e3-f4', 'g3-f4', 'g3-h4']);
  // A pedra toma para trás nas brasileiras, não nas inglesas.
  assert.deepStrictEqual(texto(com({ d4: 1, c3: -1, h8: -1 }).lances()), ['d4xb2']);
  assert.deepStrictEqual(texto(com({ d4: 1, c3: -1, h8: -1 }, 'inglesas').lances()), ['d4-c5', 'd4-e5']);
  // A maioria: só a tomada de duas peças vale (nas inglesas, qualquer uma).
  const maioria = { a1: 1, b2: -1, e3: 1, f4: -1, f6: -1, a7: -1 };
  assert.deepStrictEqual(texto(com(maioria).lances()), ['e3xg5xe7']);
  assert.deepStrictEqual(texto(com(maioria, 'inglesas').lances()), ['a1xc3', 'e3xg5xe7']);
  // A dama voa e pousa em qualquer casa depois da tomada.
  assert.deepStrictEqual(texto(com({ a1: 2, d4: -1, h8: -1 }).lances()), ['a1xe5', 'a1xf6', 'a1xg7']);
  assert.deepStrictEqual(texto(com({ a1: 2, d4: -1, h8: -1 }, 'inglesas').lances()), ['a1-b2']);
  // A pedra passa pela última fileira tomando e não vira dama; nas inglesas, para e coroa.
  assert.deepStrictEqual(texto(com({ b6: 1, c7: -1, e7: -1, a1: -1 }).lances()), ['b6xd8xf6']);
  assert.deepStrictEqual(texto(com({ b6: 1, c7: -1, e7: -1, a1: -1 }, 'inglesas').lances()), ['b6xd8=D']);
  // A tomada em sequência, com a coroa no fim.
  assert.deepStrictEqual(texto(com({ b2: 1, c3: -1, e5: -1, e7: -1, a1: -1 }).lances()), ['b2xd4xf6xd8=D']);
  // A peça tomada fica no tabuleiro até o fim do lance: ela bloqueia a volta e não é tomada duas vezes.
  const dama = com({ a1: 2, c3: -1, e5: -1, h8: -1 });
  assert.deepStrictEqual(texto(dama.lances()), ['a1xd4xf6', 'a1xd4xg7']);
  assert.ok(dama.lances().every((m) => new Set(m.tomadas).size === m.tomadas.length));
  // Sem lances, perde.
  const presa = com({ a1: 1, b2: -1, c3: -1 });
  assert.deepStrictEqual([presa.situacao().fim, presa.situacao().vencedor], ['sem-lances', -1]);
  // Jogar e voltar.
  const d = new Damas();
  d.jogar({ de: casa('c3'), caminho: [casa('d4')] });
  assert.strictEqual(d.vez, -1);
  d.voltar();
  assert.deepStrictEqual(texto(d.lances()).length, 7);
});

test('damas: o computador toma o que precisa e acaba a partida', async () => {
  const { Damas, melhorLance } = await modulo('damas.js');
  const d = new Damas();
  let s;
  for (let i = 0; i < 300; i++) {
    s = d.situacao();
    if (s.fim) break;
    const m = melhorLance(d, i % 2 ? 'facil' : 'medio', { sorteio: () => 0.37 });
    assert.ok(s.legais.some((x) => x.de === m.de && x.caminho.join() === m.caminho.join()));
    d.jogar(m);
  }
  assert.ok(s.fim, 'a partida termina');
});

test('jogos: o Worker pensa com o mesmo formato de pedido', async () => {
  const { pensar } = await modulo('pensar.js');
  const { Xadrez } = await modulo('xadrez.js');
  const r = pensar({ jogo: 'xadrez', nivel: 'facil', fen: new Xadrez().fen(), lances: ['e2e4'] });
  assert.match(r.uci, /^[a-h][1-8][a-h][1-8]$/);
  const { Damas } = await modulo('damas.js');
  const d = new Damas();
  const r2 = pensar({ jogo: 'damas', nivel: 'facil', regra: 'brasileiras', t: Array.from(d.t), vez: 1, semTomar: 0, chaves: d.chaves });
  assert.ok(d.lances().some((m) => m.de === r2.lance.de && m.caminho.join() === r2.lance.caminho.join()));
});
