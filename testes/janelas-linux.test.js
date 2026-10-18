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

test('janelas do Linux: a área útil e a moldura para encaixar com a tecla do logotipo', async () => {
  assert.deepStrictEqual(jl.lerAreaUtil('_NET_WORKAREA(CARDINAL) = 0, 0, 1440, 866'), { x: 0, y: 0, w: 1440, h: 866 });
  assert.deepStrictEqual(jl.lerAreaUtil('_NET_WORKAREA:  not found.'), null);
  assert.deepStrictEqual(jl.lerMoldura('_NET_FRAME_EXTENTS(CARDINAL) = 4, 4, 22, 4'), { e: 4, d: 4, c: 22, b: 4 });
  assert.deepStrictEqual(jl.lerMoldura(''), { e: 0, d: 0, c: 0, b: 0 });
  // Sem um id de janela ou com uma seta desconhecida, nada vai para o wmctrl.
  const j = new jl.JanelasLinux();
  assert.strictEqual(await j.encaixar('0x1; reboot', 'ArrowLeft'), false);
  assert.strictEqual(await j.encaixar('0x3a00007', 'Diagonal'), false);
});

test('janelas do Linux: as margens do Openbox seguem a barra (só os números mudam)', async () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const rc = fs.readFileSync(path.join(__dirname, '..', 'recursos', 'linux', 'openbox', 'rc.xml'), 'utf8');
  const novo = jl.trocarMargens(rc, { cima: 20, baixo: 34 });
  assert.match(novo, /<margins><top>20<\/top><bottom>34<\/bottom><left>0<\/left><right>0<\/right><\/margins>/);
  assert.strictEqual(novo.replace(/<margins>[\s\S]*?<\/margins>/, ''), rc.replace(/<margins>[\s\S]*?<\/margins>/, ''));
  // Os valores fora do lugar ficam no limite; sem o bloco, ele entra no fim.
  assert.match(jl.trocarMargens(rc, { cima: -5, baixo: 99999 }), /<top>0<\/top><bottom>500<\/bottom>/);
  assert.match(jl.trocarMargens('<openbox_config>\n</openbox_config>', { baixo: 28 }), /<margins><top>0<\/top><bottom>28<\/bottom>.*<\/margins>\n<\/openbox_config>/);
  // Sem o rc.xml da sessão (ou com um caminho que não é um .xml), nada muda.
  assert.strictEqual(await new jl.JanelasLinux({ rcOpenbox: 'rc.xml' }).margens({ baixo: 28 }), false);
  assert.strictEqual(new jl.JanelasLinux({ rcOpenbox: '/etc/passwd' }).rcOpenbox, null);
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-openbox-'));
  assert.strictEqual(new jl.JanelasLinux({ rcOpenbox: path.join(pasta, 'rc.xml') }).rcOpenbox, path.join(pasta, 'rc.xml'));
});

test('tela: os modos do xrandr da tela principal', async () => {
  const { lerXrandr, Tela } = require('../src/principal/tela');
  const texto = [
    'Screen 0: minimum 8 x 8, current 1440 x 900, maximum 32767 x 32767',
    'eDP-1 connected primary 1440x900+0+0 (normal left inverted right x axis y axis) 286mm x 179mm',
    '   1440x900      59.90*+',
    '   1366x768      59.79',
    '   1280x800      59.81    59.91',
    '   1280x800      59.99',
    'HDMI-1 disconnected (normal left inverted right x axis y axis)',
    'DP-1 connected 1920x1080+1440+0 (normal) 510mm x 290mm',
    '   1920x1080     60.00*+',
  ].join('\n');
  assert.deepStrictEqual(lerXrandr(texto), { saida: 'eDP-1', atual: '1440x900', preferido: '1440x900', modos: ['1440x900', '1366x768', '1280x800'] });
  // Sem a marcada como principal, vale a primeira ligada.
  assert.strictEqual(lerXrandr(texto.replace(' primary', '')).saida, 'eDP-1');
  assert.strictEqual(lerXrandr('Screen 0: minimum 8 x 8'), null);
  // Fora do modo sistema, nada muda a resolução; nomes estranhos não chegam ao xrandr.
  const t = new Tela({ plataforma: 'linux', sistema: false });
  assert.deepStrictEqual(await t.modos(), { disponivel: false });
  assert.deepStrictEqual(await t.definir('eDP-1; reboot', '800x600'), { ok: false, erro: 'modo' });
});

test('janelas do Linux: a moldura do Openbox no tamanho dos pixels', async () => {
  const { medidasDoTema, themercDoTamanho, trocarTema, xbm, GLIFOS, JanelasLinux } = require('../src/principal/janelas-linux.js');
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  // No tamanho 1, a barra de título com os 18 pontos das janelas do Retro Computer (a fonte de 9); no 2, tudo em dobro.
  assert.deepStrictEqual(medidasDoTema(1), { s: 1, fonte: 9, borda: 1, margem: 2, alca: 3, cliente: 1, glifo: 1 });
  assert.deepStrictEqual(medidasDoTema(2), { s: 2, fonte: 18, borda: 2, margem: 4, alca: 6, cliente: 2, glifo: 2 });
  // Os desenhos dos botões só em fatores inteiros (sem pontos borrados): 1,25 e 1,5 ficam com os de 1.
  assert.strictEqual(medidasDoTema(1.25).glifo, 1);
  assert.strictEqual(medidasDoTema(1.5).glifo, 1);
  assert.strictEqual(medidasDoTema(2.5).glifo, 2);
  assert.strictEqual(medidasDoTema(99).s, 4);
  // O × de 8 × 7 no formato XBM (o bit menos significativo é o ponto da esquerda).
  assert.match(xbm(GLIFOS['close.xbm'], 1), /b_width 8\n#define b_height 7\n[\s\S]*0xc3, 0x66, 0x3c, 0x18, 0x3c, 0x66, 0xc3 \}/);
  assert.match(xbm(GLIFOS['close.xbm'], 2), /b_width 16\n#define b_height 14/);
  // O themerc do pacote: só as medidas mudam, as cores ficam.
  const base = fs.readFileSync(path.join(__dirname, '..', 'recursos', 'linux', 'openbox', 'themes', 'Retro', 'openbox-3', 'themerc'), 'utf8');
  const t2 = themercDoTamanho(base, medidasDoTema(2));
  assert.match(t2, /^border\.width: 2$/m);
  assert.match(t2, /^padding\.height: 4$/m);
  assert.match(t2, /^window\.handle\.width: 6$/m);
  assert.match(t2, /^window\.active\.title\.bg\.color: #000080$/m);
  assert.strictEqual(t2.split('\n').length, base.split('\n').length);
  // O rc.xml com o tema pelo caminho completo e as fontes do tamanho, sem mexer nas margens.
  const rc = fs.readFileSync(path.join(__dirname, '..', 'recursos', 'linux', 'openbox', 'rc.xml'), 'utf8');
  const novo = trocarTema(rc, '/run/user/1000/retro-computer/tema-2', 18);
  assert.match(novo, /<theme>\s*<name>\/run\/user\/1000\/retro-computer\/tema-2<\/name>/);
  assert.strictEqual((novo.match(/<size>18<\/size>/g) || []).length, 5);
  assert.match(novo, /<name>DejaVu Sans<\/name>/);
  assert.match(novo, /<margins><top>0<\/top><bottom>28<\/bottom>/);
  // O tema gravado ao lado da cópia do rc.xml: o themerc e os quatro desenhos.
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-tema-'));
  const j = new JanelasLinux({ rcOpenbox: path.join(pasta, 'openbox-rc.xml'), temaBase: path.join(__dirname, '..', 'recursos', 'linux', 'openbox', 'themes', 'Retro', 'openbox-3', 'themerc') });
  const tema = await j.temaDoTamanho(medidasDoTema(1.25));
  assert.strictEqual(tema, path.join(pasta, 'tema-1_25'));
  assert.deepStrictEqual(fs.readdirSync(path.join(tema, 'openbox-3')).sort(), ['close.xbm', 'iconify.xbm', 'max.xbm', 'max_toggled.xbm', 'themerc']);
  assert.match(fs.readFileSync(path.join(tema, 'openbox-3', 'themerc'), 'utf8'), /^padding\.width: 3$/m);
});
