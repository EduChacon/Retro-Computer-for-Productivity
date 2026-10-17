'use strict';
// O observador do disco C: (observar.js): no Linux, uma vigia por pasta.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { observarArvore } = require('../src/principal/observar');

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** Espera até aparecer um evento que passe no teste (ou o tempo acabar). */
async function ate(eventos, teste, ms = 3000) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    if (eventos.some(teste)) return true;
    await esperar(30);
  }
  return false;
}

// Uma gravação segura: o temporário renomeado por cima (como o disco C: grava).
const atomico = (arq, texto) => { const tmp = arq + '.~tmp'; fs.writeFileSync(tmp, texto); fs.renameSync(tmp, arq); };

test('observar: a gravação de fora depois de gravações seguras, a pasta nova e a renomeada', { skip: process.platform === 'win32' && 'o Windows usa o recursivo do sistema' }, async () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-observar-'));
  fs.mkdirSync(path.join(raiz, 'Docs'));
  fs.mkdirSync(path.join(raiz, '.lixeira', 'velho'), { recursive: true });
  const ev = [];
  const parar = observarArvore(raiz, (rel) => ev.push(rel), { ignorar: (rel) => rel.startsWith('.lixeira/') });
  try {
    await esperar(200);
    // A pasta criada depois, uma nota gravada três vezes do jeito seguro e, por fim, por outro programa.
    fs.mkdirSync(path.join(raiz, 'Docs', 'Notas'));
    assert.ok(await ate(ev, (r) => r === 'Docs/Notas'), JSON.stringify(ev));
    await esperar(150);
    const nota = path.join(raiz, 'Docs', 'Notas', 'Nota.txt');
    for (const t of ['a', 'ab', 'abc']) { atomico(nota, t); await esperar(80); }
    ev.length = 0;
    fs.writeFileSync(nota, 'de outro programa');
    assert.ok(await ate(ev, (r) => r === 'Docs/Notas/Nota.txt'), 'a gravação de fora não avisou: ' + JSON.stringify(ev));
    // A pasta renomeada continua vigiada pelo nome novo.
    fs.renameSync(path.join(raiz, 'Docs', 'Notas'), path.join(raiz, 'Docs', 'Lembretes'));
    await esperar(200);
    ev.length = 0;
    fs.writeFileSync(path.join(raiz, 'Docs', 'Lembretes', 'Nota.txt'), 'de novo');
    assert.ok(await ate(ev, (r) => r === 'Docs/Lembretes/Nota.txt'), JSON.stringify(ev));
    // Dentro da Lixeira, o que muda não avisa (só a pasta dela, que fica vigiada).
    ev.length = 0;
    fs.writeFileSync(path.join(raiz, '.lixeira', 'velho', 'x.txt'), 'x');
    fs.writeFileSync(path.join(raiz, '.lixeira', 'y.txt'), 'y');
    assert.ok(await ate(ev, (r) => r === '.lixeira/y.txt'), JSON.stringify(ev));
    assert.ok(!ev.includes('.lixeira/velho/x.txt'), JSON.stringify(ev));
    if (process.platform === 'linux') assert.ok(!parar.vigias().includes('.lixeira/velho'));
  } finally {
    parar();
    fs.rmSync(raiz, { recursive: true, force: true });
  }
});

test('observar: no Windows e no Mac (o recursivo do sistema), o que muda dentro de uma pasta ignorada também não avisa', async () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-observar-'));
  fs.mkdirSync(path.join(raiz, 'Docs'));
  fs.mkdirSync(path.join(raiz, '.lixeira', 'velho'), { recursive: true });
  const ev = [];
  // Fora do Linux, o caminho é o do fs.watch recursivo (no Linux, o do Node serve para arquivos novos).
  const parar = observarArvore(raiz, (rel) => ev.push(rel), { ignorar: (rel) => rel.startsWith('.lixeira/'), plataforma: 'outro' });
  try {
    await esperar(300);
    fs.writeFileSync(path.join(raiz, '.lixeira', 'velho', 'x.txt'), 'x');
    fs.writeFileSync(path.join(raiz, '.lixeira', 'y.txt'), 'y');
    fs.writeFileSync(path.join(raiz, 'Docs', 'a.txt'), 'a');
    assert.ok(await ate(ev, (r) => r === 'Docs/a.txt'), JSON.stringify(ev));
    assert.ok(await ate(ev, (r) => r === '.lixeira/y.txt'), JSON.stringify(ev));
    await esperar(200);
    assert.ok(!ev.includes('.lixeira/velho/x.txt'), JSON.stringify(ev));
  } finally {
    parar();
    fs.rmSync(raiz, { recursive: true, force: true });
  }
});
