'use strict';
/* Exercita as regras pelo mesmo motor que a janela usa, com relógio e sorteio controlados. */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const modulo = () => import(pathToFileURL(path.join(__dirname, '../src/sistema/js/jogos/breakout.js')).href);
const avancar = (m, segundos) => { for (let t = 0; t < segundos; t += 0.01) m.passo(0.01); };
const iniciar = async () => { const { PartidaBreakout } = await modulo(); const m = new PartidaBreakout({ sorteio: () => 0.9 }); m.acao(); return m; };
const vazio = (m) => { m.tijolos = [{ id: 999, x: 20, y: 20, w: 30, h: 10, l: 0, c: 0, tipo: 'a', vidas: 1, max: 1, vivo: true, cor: 0 }]; };

test('breakout: 24 mapas distintos, válidos e sem objetivos presos pelo aço', async () => {
  const { FASES } = await modulo();
  assert.equal(FASES.length, 24); assert.equal(new Set(FASES.map((f) => f.mapa.join(''))).size, 24);
  for (const f of FASES) {
    assert.equal(f.mapa.length, 8); assert.ok(f.mapa.every((l) => /^[abcdef23*#.]{12}$/.test(l)), f.nome);
    assert.ok(f.mapa.join('').replace(/[.#]/g, '').length >= 20, f.nome);
    // Todos os tijolos podem ser alcançados a partir de baixo, removendo os coloridos no caminho.
    const fila = Array.from({ length: 12 }, (_, x) => [x, 8]), vistos = new Set();
    while (fila.length) {
      const [x, y] = fila.pop(), chave = x + ',' + y;
      if (x < 0 || x >= 12 || y < 0 || y > 8 || vistos.has(chave) || f.mapa[y]?.[x] === '#') continue;
      vistos.add(chave); fila.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
    }
    f.mapa.forEach((l, y) => [...l].forEach((t, x) => { if (!'.#'.includes(t)) assert.ok(vistos.has(x + ',' + y), f.nome); }));
  }
});

test('breakout: colisão rápida não atravessa tijolos nem a raquete; as bordas permitem mirar', async () => {
  const m = await iniciar(); vazio(m);
  const t = m.tijolos[0]; t.x = 200; t.y = 100;
  m.bolas = [{ x: 215, y: 150, vx: 0, vy: -1200 }]; m.passo(0.05);
  assert.equal(t.vivo, false); assert.equal(m.estado, 'passou');
  m.novo(); m.acao(); vazio(m);
  m.bolas = [{ x: m.raquete.x + m.raquete.w - 8, y: 380, vx: 0, vy: 1200 }]; m.passo(0.04);
  assert.ok(m.bolas[0].vy < 0); assert.ok(m.bolas[0].vx > 0); assert.equal(m.vidas, 3);
  m.bolas = [{ x: 13, y: 300, vx: -1200, vy: -20 }]; m.passo(0.01);
  assert.ok(m.bolas[0].vx > 0); assert.ok(m.bolas[0].x >= 12);
});

test('breakout: reforço, explosão em cadeia, combo e aço têm regras diferentes', async () => {
  const m = await iniciar(); m.carregarFase(5); m.acao();
  const resistente = m.tijolos.find((t) => t.tipo === '2');
  m.acertar(resistente); assert.equal(resistente.vivo, true); assert.equal(resistente.vidas, 1);
  m.acertar(resistente); assert.equal(resistente.vivo, false);
  const bomba = m.tijolos.find((t) => t.tipo === '*'), antes = m.tijolos.filter((t) => t.vivo).length;
  m.acertar(bomba); assert.ok(m.tijolos.filter((t) => t.vivo).length < antes); assert.ok(m.combo >= 2);
  const aco = { x: 100, y: 200, w: 35, h: 16, l: 7, c: 5, tipo: '#', vidas: Infinity, max: Infinity, vivo: true };
  m.tijolos.push(aco); m.acertar(aco, Infinity); assert.equal(aco.vivo, true); assert.equal(aco.vidas, Infinity);
  assert.ok(Number.isFinite(m.pontos));
});

test('breakout: cápsulas coletadas por colisão; oito poderes disponíveis sem depender só da sorte', async () => {
  const m = await iniciar(); vazio(m);
  m.poderes = [{ tipo: 'larga', x: m.raquete.x + 10, y: m.raquete.y - 15, w: 20, h: 16 }];
  m.passo(0.01); assert.equal(m.raquete.w, 116); assert.equal(m.poderes.length, 0);
  m.novo(); m.acao();
  // O sorteio não produz bônus; a garantia de quatro tijolos produz a sequência completa.
  const encontrados = new Set();
  for (const t of m.tijolos) { m.acertar(t); for (const p of m.poderes) encontrados.add(p.tipo); m.poderes = []; }
  assert.equal(encontrados.size, 8);
});

test('breakout: multibola tem limite e só perde vida quando a última cai', async () => {
  const m = await iniciar(); vazio(m);
  m.receberPoder('multi'); assert.equal(m.bolas.length, 3);
  m.bolas[0].y = 450; m.bolas[0].vy = 100; m.passo(0.01); assert.equal(m.bolas.length, 2); assert.equal(m.vidas, 3);
  m.receberPoder('multi'); m.receberPoder('multi'); m.receberPoder('multi'); assert.equal(m.bolas.length, 6);
  for (const b of m.bolas) { b.y = 450; b.vy = 100; }
  m.passo(0.01); assert.equal(m.vidas, 2); assert.equal(m.estado, 'pronto'); assert.equal(m.bolas.length, 1);
});

test('breakout: escudo consome cargas, vida extra respeita o limite', async () => {
  const m = await iniciar(); vazio(m); m.receberPoder('escudo'); m.receberPoder('escudo'); assert.equal(m.escudo, 3);
  m.bolas = [{ x: 50, y: 425, vx: 0, vy: 250 }]; m.passo(0.02);
  assert.equal(m.escudo, 2); assert.ok(m.bolas[0].vy < 0); assert.equal(m.vidas, 3);
  for (let i = 0; i < 4; i++) m.receberPoder('vida'); assert.equal(m.vidas, 5); assert.ok(m.pontos >= 1000);
});

test('breakout: pausa congela bola, tiros, cápsulas e duração dos poderes', async () => {
  const m = await iniciar(); m.receberPoder('laser'); m.receberPoder('lenta'); m.disparar();
  m.poderes.push({ tipo: 'vida', x: 20, y: 200, w: 20, h: 16 });
  m.pausar(); const antes = JSON.stringify({ bolas: m.bolas, tiros: m.tiros, poderes: m.poderes, efeitos: m.efeitos });
  avancar(m, 20); assert.equal(JSON.stringify({ bolas: m.bolas, tiros: m.tiros, poderes: m.poderes, efeitos: m.efeitos }), antes);
  m.acao(); assert.equal(m.estado, 'jogando'); m.passo(0.02); assert.ok(m.efeitos.lenta < 12);
});

test('breakout: efeitos expiram restaurando raquete e velocidade; ímã prende e solta', async () => {
  const m = await iniciar(); vazio(m); m.receberPoder('larga'); m.receberPoder('lenta');
  const lento = Math.hypot(m.bolas[0].vx, m.bolas[0].vy);
  m.efeitos.larga = m.efeitos.lenta = 0.001; m.passo(0.01);
  assert.equal(m.raquete.w, 72); assert.ok(Math.hypot(m.bolas[0].vx, m.bolas[0].vy) > lento);
  m.receberPoder('ima'); m.bolas = [{ x: m.raquete.x + 24, y: 400, vx: 0, vy: 250 }]; m.passo(0.03);
  assert.equal(m.bolas[0].presa, true); const x = m.bolas[0].x;
  m.moverRaquete(m.raquete.x + m.raquete.w / 2 + 30); assert.equal(m.bolas[0].x, x + 30);
  m.acao(); assert.equal(m.bolas[0].presa, false); assert.ok(m.bolas[0].vy < 0);
  m.bolas[0].presa = true; m.efeitos.ima = 0.001; m.passo(0.01); assert.equal(m.bolas[0].presa, false);
});

test('breakout: laser acerta o primeiro tijolo no caminho; fogo atravessa reforços', async () => {
  const m = await iniciar(); vazio(m);
  m.tijolos.push({ ...m.tijolos[0], id: 2, x: 200, y: 200, vidas: 3, max: 3, tipo: '3' });
  m.bolas = [{ x: 215, y: 235, vx: 0, vy: -500 }]; m.receberPoder('fogo'); m.passo(0.05);
  assert.equal(m.tijolos[1].vivo, false); assert.ok(m.bolas[0].vy < 0);
  m.receberPoder('laser'); m.tiros = [{ x: 25, y: 50, w: 2, h: 8 }]; m.passo(0.05); assert.equal(m.tijolos[0].vivo, false); assert.equal(m.estado, 'passou');
});

test('breakout: campanha avança, ignora aço na vitória e termina na fase 24', async () => {
  const m = await iniciar();
  for (let fase = 0; fase < 24; fase++) {
    assert.equal(m.fase, fase); assert.equal(m.estado, 'jogando');
    for (const t of m.tijolos) if (t.tipo !== '#') m.acertar(t, Infinity);
    assert.equal(m.estado, fase === 23 ? 'vitoria' : 'passou'); assert.equal(m.maiorFase, Math.min(23, fase + 1));
    assert.ok(m.tijolos.every((t) => t.tipo === '#' || !t.vivo));
    if (fase < 23) { m.acao(); assert.equal(m.estado, 'pronto'); m.acao(); }
  }
  assert.ok(m.pontos > 0); assert.equal(m.vidas, 3); m.acao(); assert.equal(m.fase, 0); assert.equal(m.estado, 'pronto');
});

test('breakout: perder todas as vidas encerra e reiniciar limpa efeitos e eventos antigos', async () => {
  const m = await iniciar(); vazio(m);
  for (let i = 0; i < 3; i++) { m.bolas = [{ x: 50, y: 450, vx: 0, vy: 250 }]; m.passo(0.01); if (i < 2) m.acao(); }
  assert.equal(m.estado, 'fim'); assert.equal(m.vidas, 0);
  m.acao(); assert.equal(m.vidas, 3); assert.equal(m.pontos, 0); assert.deepEqual(m.efeitos, {});
  assert.deepEqual(m.consumirEventos().map((e) => e.tipo), ['fase']);
});
