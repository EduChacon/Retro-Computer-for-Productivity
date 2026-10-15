'use strict';
// As janelas dos programas do Linux: a leitura do wmctrl e do xprop, e os ids aceitos.
const test = require('node:test');
const assert = require('node:assert');
const jl = require('../src/principal/janelas-linux.js');
const { Aplicativos, lerDesktop } = require('../src/principal/aplicativos.js');

test('janelas do Linux: a lista do wmctrl e a janela ativa', () => {
  const texto = [
    '0x03a00007  0 4321   libreoffice.libreoffice-writer  notebook Documento sem título - LibreOffice Writer',
    '0x01e00003 -1 900    panel.Panel  notebook painel',
    '0x04c00003  0 5555   gnome-calculator.Gnome-calculator  notebook Calculadora',
    '0x05000001  0 77     N/A  notebook ',
  ].join('\n');
  assert.deepStrictEqual(jl.lerWmctrl(texto), [
    { id: '0x03a00007', mesa: 0, pid: 4321, instancia: 'libreoffice', classe: 'libreoffice-writer', titulo: 'Documento sem título - LibreOffice Writer' },
    { id: '0x04c00003', mesa: 0, pid: 5555, instancia: 'gnome-calculator', classe: 'Gnome-calculator', titulo: 'Calculadora' },
    { id: '0x05000001', mesa: 0, pid: 77, instancia: '', classe: '', titulo: '' },
  ]);
  assert.strictEqual(jl.lerAtiva('_NET_ACTIVE_WINDOW(WINDOW): window id # 0x3a00007'), '0x3a00007');
  assert.strictEqual(jl.lerAtiva('_NET_ACTIVE_WINDOW(WINDOW): window id # 0x0'), null);
  assert.strictEqual(jl.normalizar('0x03a00007'), jl.normalizar('0x3a00007'));
});

test('janelas do Linux: o programa de cada janela pela classe', () => {
  const ap = new Aplicativos({ plataforma: 'linux' });
  ap.lista = [
    { id: 'org.gnome.Calculator.desktop', ...lerDesktop('[Desktop Entry]\nType=Application\nName=Calculadora\nExec=gnome-calculator\nStartupWMClass=gnome-calculator\n') },
    { id: 'libreoffice-writer.desktop', ...lerDesktop('[Desktop Entry]\nType=Application\nName=LibreOffice Writer\nExec=libreoffice --writer\n') },
    { id: 'org.mozilla.firefox.desktop', ...lerDesktop('[Desktop Entry]\nType=Application\nName=Firefox\nExec=firefox\n') },
  ];
  assert.strictEqual(ap.idPorJanela({ classe: 'Gnome-calculator', instancia: 'gnome-calculator' }), 'org.gnome.Calculator.desktop');
  assert.strictEqual(ap.idPorJanela({ classe: 'libreoffice-writer', instancia: 'libreoffice' }), 'libreoffice-writer.desktop');
  assert.strictEqual(ap.idPorJanela({ classe: 'firefox', instancia: 'Navigator' }), 'org.mozilla.firefox.desktop');
  assert.strictEqual(ap.idPorJanela({ classe: 'xterm' }), null);
});

test('janelas do Linux: nada vai para o wmctrl sem um id de janela', async () => {
  const j = new jl.JanelasLinux();
  assert.strictEqual(await j.ativar('0x1; rm -rf /'), false);
  assert.strictEqual(await j.fechar('abc'), false);
});
