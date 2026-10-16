'use strict';
// A loja do Windows (o winget) e a do Mac (o Homebrew): a leitura das saídas e os nomes aceitos.
const test = require('node:test');
const assert = require('node:assert');
const l = require('../src/principal/lojas.js');
const { acharPorNome } = require('../src/principal/aplicativos.js');

test('lojas: só nomes de pacote de verdade vão para o winget e para o brew', () => {
  for (const id of ['Mozilla.Firefox', 'Notepad++.Notepad++', 'Adobe.Acrobat.Reader.64-bit', 'Python.Python.3.13', '7zip.7zip']) assert.ok(l.idWinget(id), id);
  for (const id of ['--silent', 'Firefox', 'le.', '.Firefox', 'Mozilla.Firefox;calc', 'a b.c', '', null]) assert.ok(!l.idWinget(id), String(id));
  for (const id of ['firefox', 'google-chrome', 'visual-studio-code@insiders', 'r-app']) assert.ok(l.idBrew(id), id);
  for (const id of ['--cask', 'Firefox', 'a/b', '../x', 'x y', '']) assert.ok(!l.idBrew(id), id);
});

test('lojas: as tabelas do winget, em inglês e em português, sem a frase do fim', () => {
  const en = [
    '   - \r   \\ \r',
    'Name                      Id                     Version   Available Source',
    '-----------------------------------------------------------------------------',
    'Mozilla Firefox (x64 pt-… Mozilla.Firefox        131.0     132.0     winget',
    'VLC media player          VideoLAN.VLC           3.0.20    3.0.21    winget',
    '2 upgrades available.',
  ].join('\r\n');
  assert.deepStrictEqual(l.lerTabelaWinget(en), [
    ['Mozilla Firefox (x64 pt-…', 'Mozilla.Firefox', '131.0', '132.0', 'winget'],
    ['VLC media player', 'VideoLAN.VLC', '3.0.20', '3.0.21', 'winget'],
  ]);
  const pt = [
    'Nome          ID                                Versão  Origem',
    '---------------------------------------------------------------',
    'LibreOffice   TheDocumentFoundation.LibreOffice 26.8.1  winget',
    '',
    'Outra coisa',
  ].join('\n');
  const r = l.lerTabelaWinget(pt);
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0][0], 'LibreOffice');
  assert.deepStrictEqual(l.lerTabelaWinget('Nenhum pacote encontrado.'), []);
});

test('lojas: o andamento do winget e do Homebrew', () => {
  assert.deepStrictEqual(l.lerAndamentoWinget('  ██████▒▒▒▒  3,00 MB / 12,0 MB'), { pct: 25, passo: 1, passos: 2 });
  assert.deepStrictEqual(l.lerAndamentoWinget('  ████  1.00 GB / 2.00 GB'), { pct: 50, passo: 1, passos: 2 });
  assert.deepStrictEqual(l.lerAndamentoWinget('  ██████████  80%'), { pct: 80, passo: 2, passos: 2 });
  assert.deepStrictEqual(l.lerAndamentoWinget('Successfully verified installer hash'), {});
  assert.deepStrictEqual(l.lerAndamentoBrew('######################                       45.6%'), { pct: 46, passo: 1, passos: 2 });
  assert.deepStrictEqual(l.lerAndamentoBrew('==> Installing Cask firefox'), {});
});

test('lojas: o manifesto do winget e a pasta dele', () => {
  const m = l.lerManifesto([
    'PackageIdentifier: Mozilla.Firefox',
    'Publisher: Mozilla',
    "PackageName: 'Mozilla Firefox'",
    'License: MPL-2.0',
    'ShortDescription: Navegador.',
    'Description: |-',
    '  Primeira linha.',
    '',
    '  Segundo parágrafo.',
    'Tags:',
    '- browser',
  ].join('\r\n'));
  assert.strictEqual(m.PackageName, 'Mozilla Firefox');
  assert.strictEqual(m.License, 'MPL-2.0');
  assert.strictEqual(m.Description, 'Primeira linha.\n\nSegundo parágrafo.');
  assert.strictEqual(l.pastaManifesto('Mozilla.Firefox', '131.0'), 'manifests/m/Mozilla/Firefox/131.0');
});

test('lojas: os casks do Homebrew (os com janela, a pesquisa pelos mais instalados)', () => {
  const casks = [
    { token: 'firefox', name: ['Mozilla Firefox'], desc: 'Web browser', homepage: 'https://www.mozilla.org/firefox/', version: '131.0', artifacts: [{ app: ['Firefox.app'] }] },
    { token: 'firefox@nightly', name: ['Mozilla Firefox Nightly'], desc: 'Web browser', homepage: 'https://www.mozilla.org/', version: '133.0a1', artifacts: [{ app: ['Firefox Nightly.app'] }] },
    { token: 'zoom', name: ['Zoom'], desc: 'Videoconferência', homepage: 'https://www.zoom.us/', version: '6.2', artifacts: [{ pkg: ['zoomusInstallerFull.pkg'] }] },
    { token: 'so-comando', name: ['Só comando'], desc: 'Navegador de terminal', homepage: 'http://x', version: '1', artifacts: [{ binary: ['x'] }] },
    { token: 'velho', name: ['Navegador velho'], desc: '', homepage: '', version: '1', deprecated: true, artifacts: [{ app: ['Velho.app'] }] },
  ].map(l.resumoCask);
  assert.deepStrictEqual(casks[0], { id: 'firefox', nome: 'Mozilla Firefox', resumo: 'Web browser', site: 'https://www.mozilla.org/firefox/', versao: '131.0', apps: ['Firefox.app'], janela: true, fora: false });
  assert.ok(casks[2].janela && !casks[3].janela && casks[4].fora);
  assert.strictEqual(casks[3].site, '');
  const pop = new Map([['firefox@nightly', 0], ['firefox', 1]]);
  assert.deepStrictEqual(l.pesquisarCasks(casks, 'firefox', pop).map((c) => c.id), ['firefox', 'firefox@nightly']);
  assert.deepStrictEqual(l.pesquisarCasks(casks, 'navegador', pop).map((c) => c.id), []);
  assert.deepStrictEqual(l.pesquisarCasks(casks, 'videoconferencia', pop).map((c) => c.id), ['zoom']);
  assert.deepStrictEqual(l.pesquisarCasks(casks, '  ', pop), []);
});

test('lojas: os instalados e as atualizações do Homebrew', () => {
  assert.deepStrictEqual(l.lerListaBrew('firefox 131.0\nvisual-studio-code 1.95.1,abc\n\n'), [
    { id: 'firefox', nome: 'firefox', versao: '131.0', usuario: true },
    { id: 'visual-studio-code', nome: 'visual-studio-code', versao: '1.95.1,abc', usuario: true },
  ]);
  assert.deepStrictEqual(l.lerDesatualizadosBrew('{"formulae":[],"casks":[{"name":"firefox","installed_versions":["131.0"],"current_version":"132.0"}]}'), ['firefox']);
  assert.deepStrictEqual(l.lerDesatualizadosBrew('não é JSON'), []);
  assert.strictEqual(l.acharBrew((p) => p === '/usr/local/bin/brew'), '/usr/local/bin/brew');
  assert.strictEqual(l.acharBrew(() => false), null);
});

test('lojas: os escolhidos são nomes válidos e a mesma categoria não repete', () => {
  for (const [sis, valido] of [['win32', l.idWinget], ['darwin', l.idBrew]]) {
    for (const [cat, ids] of Object.entries(l.ESCOLHIDOS[sis])) {
      assert.strictEqual(new Set(ids).size, ids.length, `${sis} ${cat}`);
      for (const id of ids) assert.ok(valido(id), `${sis} ${cat} ${id}`);
    }
  }
});

test('lojas: no máximo n tarefas ao mesmo tempo, na ordem certa', async () => {
  let agora = 0, maximo = 0;
  const r = await l.aosPoucos([5, 1, 4, 2, 3], 2, async (x) => {
    agora++; maximo = Math.max(maximo, agora);
    await new Promise((ok) => setTimeout(ok, x * 3));
    agora--;
    return x * 10;
  });
  assert.deepStrictEqual(r, [50, 10, 40, 20, 30]);
  assert.strictEqual(maximo, 2);
});

test('lojas: o programa do menu Iniciar pelo nome do pacote do winget', () => {
  const lista = [{ id: 'a', nome: 'Firefox' }, { id: 'b', nome: 'VLC media player' }, { id: 'c', nome: 'LibreOffice Writer' }, { id: 'd', nome: 'LibreOffice' }, { id: 'e', nome: 'Notepad++' }, { id: 'f', nome: 'Git Bash', terminal: true }];
  assert.strictEqual(acharPorNome(lista, 'Mozilla Firefox').id, 'a');
  assert.strictEqual(acharPorNome(lista, 'VLC media player').id, 'b');
  assert.strictEqual(acharPorNome(lista, 'LibreOffice').id, 'd');
  assert.strictEqual(acharPorNome(lista, 'Notepad++').id, 'e');
  assert.strictEqual(acharPorNome(lista, 'Git'), null);
  assert.strictEqual(acharPorNome(lista, ''), null);
});

test('lojas: o ícone do site oficial (o apple-touch-icon, o maior icon, o favicon.ico)', () => {
  const html = `<html><head>
    <link rel="icon" href="/favicon-16.png" sizes="16x16">
    <link rel='icon' type='image/png' href='https://cdn.exemplo.org/icone-64.png' sizes='64x64'>
    <LINK REL="apple-touch-icon" HREF="toque.png">
    <link rel="stylesheet" href="estilo.css">
    <link rel="icon" href="http://inseguro.org/x.png" sizes="256x256">
  </head></html>`;
  assert.deepStrictEqual(l.iconesDaPagina(html, 'https://www.exemplo.org/pagina/'), [
    'https://www.exemplo.org/pagina/toque.png',
    'https://cdn.exemplo.org/icone-64.png',
    'https://www.exemplo.org/favicon-16.png',
    'https://www.exemplo.org/favicon.ico',
  ]);
  assert.deepStrictEqual(l.iconesDaPagina('<link rel="icon" href="/logo.svg" type="image/svg+xml"><link rel="icon" href="/a.png" sizes="32x32">', 'https://x.org/'), ['https://x.org/logo.svg', 'https://x.org/a.png', 'https://x.org/favicon.ico']);
  assert.deepStrictEqual(l.iconesDaPagina('', 'https://so.org/a/b'), ['https://so.org/favicon.ico']);
  assert.deepStrictEqual(l.iconesDaPagina('<link rel="icon" href="/a.png">', 'http://x.org/'), []);
});

test('lojas: o tipo da imagem pelos primeiros bytes', () => {
  assert.strictEqual(l.tipoDaImagem(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a])), 'image/png');
  assert.strictEqual(l.tipoDaImagem(Buffer.from([0, 0, 1, 0, 1, 0]), 'application/octet-stream'), 'image/x-icon');
  assert.strictEqual(l.tipoDaImagem(Buffer.from('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"></svg>'), 'image/svg+xml'), 'image/svg+xml');
  assert.strictEqual(l.tipoDaImagem(Buffer.from('<!doctype html><html>'), 'text/html'), null);
  assert.strictEqual(l.tipoDaImagem(Buffer.from('<svg></svg>'), 'text/html'), null);
});

test('lojas: o ícone do site é achado uma vez e guardado', async () => {
  const pedidos = [];
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
  const fetch = async (url) => {
    pedidos.push(url);
    if (url === 'https://programa.org/') return { ok: true, url, headers: new Map([['content-type', 'text/html']]), text: async () => '<link rel="apple-touch-icon" href="/t.png">' };
    if (url === 'https://programa.org/t.png') return { ok: true, url, headers: new Map([['content-type', 'image/png']]), arrayBuffer: async () => png };
    return { ok: false, headers: new Map() };
  };
  const ic = new l.IconesDoSite({ fetch });
  assert.strictEqual(await ic.doSite('https://programa.org/'), 'data:image/png;base64,' + png.toString('base64'));
  assert.strictEqual(await ic.doSite('https://programa.org/'), 'data:image/png;base64,' + png.toString('base64'));
  assert.deepStrictEqual(pedidos, ['https://programa.org/', 'https://programa.org/t.png']);
  assert.strictEqual(await ic.doSite('http://inseguro.org/'), null);
});
