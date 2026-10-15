'use strict';
// A loja do Flathub: a leitura das saídas do flatpak e das respostas do Flathub, e os nomes aceitos.
const test = require('node:test');
const assert = require('node:assert');
const l = require('../src/principal/loja.js');

test('loja: só nomes de programa de verdade vão para o flatpak', () => {
  assert.ok(l.idValido('org.libreoffice.LibreOffice'));
  assert.ok(l.idValido('com.github.tchx84.Flatseal'));
  assert.ok(!l.idValido('--system'));
  assert.ok(!l.idValido('-y'));
  assert.ok(!l.idValido('org.exemplo; rm -rf ~'));
  assert.ok(!l.idValido(''));
  assert.ok(!l.idValido(null));
});

test('loja: os instalados e o andamento do flatpak', () => {
  const inst = l.lerInstalados('org.gnome.TextEditor\tText Editor\t46.3\tuser\norg.libreoffice.LibreOffice\tLibreOffice\t26.8.1.1\tsystem\n\n');
  assert.deepStrictEqual(inst, [
    { id: 'org.gnome.TextEditor', nome: 'Text Editor', versao: '46.3', usuario: true },
    { id: 'org.libreoffice.LibreOffice', nome: 'LibreOffice', versao: '26.8.1.1', usuario: false },
  ]);
  assert.deepStrictEqual(l.lerAndamento('Installing 2/3… ████████▌            45%  2.1 MB/s  00:12'), { passo: 2, passos: 3, pct: 45 });
  assert.deepStrictEqual(l.lerAndamento('Looking for matches…'), {});
});

test('loja: a ficha do Flathub (descrição, captura, idioma)', () => {
  assert.deepStrictEqual(l.textoDescricao('<p>Um editor &amp; mais.</p>\n<ul><li>Abas</li><li>Temas</li></ul>'), ['Um editor & mais.', '• Abas\n• Temas']);
  assert.deepStrictEqual(l.textoDescricao(''), []);
  const lista = [{ default: true, sizes: [{ src: 'a.png', width: '1074' }, { src: 'b.png', width: '624' }, { src: 'c.png', width: '224' }] }];
  assert.strictEqual(l.escolherCaptura(lista), 'b.png');
  assert.strictEqual(l.escolherCaptura([{ sizes: { '1248x702': 'x.png', '624x351': 'y.png' } }]), 'y.png');
  assert.strictEqual(l.escolherCaptura([]), null);
  assert.strictEqual(l.localeDe('pt-BR'), 'pt_BR');
  assert.strictEqual(l.localeDe('es'), 'es');
  const r = l.resumo({ app_id: 'org.gnome.TextEditor', name: 'Text Editor', summary: 'Edit text files', icon: 'https://dl.flathub.org/x.png', developer_name: 'GNOME', verification_verified: true, is_free_license: true, installs_last_month: '10' });
  assert.strictEqual(r.id, 'org.gnome.TextEditor');
  assert.strictEqual(r.instalacoes, 10);
});

test('loja: as imagens só vêm do Flathub', async () => {
  const loja = new l.Loja({ fetch: async () => { throw new Error('não devia buscar'); } });
  assert.strictEqual(await loja.imagem('https://exemplo.com/x.png'), null);
  assert.strictEqual(await loja.imagem('file:///etc/passwd'), null);
});

test('loja: as quebras de linha do arquivo não partem os parágrafos', () => {
  const t = l.textoDescricao('<p>LibreOffice is a powerful office suite.  Its clean interface and\n  feature-rich tools help you.</p>\n<p>Second.</p>');
  assert.deepStrictEqual(t, ['LibreOffice is a powerful office suite. Its clean interface and feature-rich tools help you.', 'Second.']);
});
