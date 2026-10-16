'use strict';
// O histórico da área de transferência (logotipo + V), o firewall do Linux (ufw), os modos de
// energia, a luz noturna do xrandr e as contas da caixa de busca.
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { HistoricoTransferencia, acrescentar } = require('../src/principal/transferencia');
const { lerUfwConf, Firewall, FirewallFalso } = require('../src/principal/firewall');
const { lerPerfis, PerfilEnergia, bandejaFalsa } = require('../src/principal/bandeja');
const { gamaDe, lerSaidas, TelaFalsa } = require('../src/principal/tela');
const { trazORetro } = require('../src/principal/atalhos');

/** Uma área de transferência de mentira (assíncrona, como a do Electron 44), com as marcas dos gerenciadores de senhas. */
function prancheta(texto = '') {
  return {
    texto, marcas: new Set(),
    async readText() { return this.texto; },
    async writeText(t) { this.texto = t; this.marcas.clear(); },
    async has(f) { return this.marcas.has(f); },
  };
}

test('área de transferência: o mesmo texto sobe sem repetir, e os fixados não saem', () => {
  let l = [];
  for (let i = 1; i <= 4; i++) l = acrescentar(l, 't' + i, { id: i, quando: i, max: 3 });
  assert.deepStrictEqual(l.map((i) => i.texto), ['t4', 't3', 't2']);
  l[2].fixado = true;
  l = acrescentar(l, 't3', { id: 5, quando: 5, max: 3 });
  assert.deepStrictEqual(l.map((i) => i.texto), ['t3', 't4', 't2']);
  l = acrescentar(l, 't6', { id: 6, quando: 6, max: 2 });
  // Com o limite de 2 soltos, o t4 (o mais antigo dos soltos) sai; o t2 fixado fica.
  assert.deepStrictEqual(l.map((i) => [i.texto, i.fixado]), [['t6', false], ['t3', false], ['t2', true]]);
});

test('área de transferência: lê o que muda, deixa de fora as senhas e some ao desligar', async () => {
  const c = prancheta('senha de antes');
  let avisos = 0;
  const h = new HistoricoTransferencia({ clipboard: c, aoMudar: () => avisos++ });
  h.ligar(true);
  clearTimeout(h.timer); // as leituras, aqui, são chamadas à mão
  // O que já estava copiado antes de ligar não entra.
  assert.deepStrictEqual((await h.listar()).itens, []);
  c.texto = 'primeiro';
  assert.strictEqual(await h.olhar(), true);
  assert.strictEqual(await h.olhar(), false);
  c.texto = '   ';
  assert.strictEqual(await h.olhar(), false);
  c.texto = 'segredo';
  c.marcas.add('electron application/osclipboard;format="x-kde-passwordManagerHint"');
  assert.strictEqual(await h.olhar(), false);
  await c.writeText('segundo');
  const { itens } = await h.listar();
  assert.deepStrictEqual(itens.map((i) => i.texto), ['segundo', 'primeiro']);
  // Usar um item o põe de volta na área de transferência e no topo, sem duplicar.
  assert.strictEqual(await h.usar(itens[1].id), true);
  assert.strictEqual(c.texto, 'primeiro');
  assert.strictEqual(await h.olhar(), false);
  assert.deepStrictEqual((await h.listar()).itens.map((i) => i.texto), ['primeiro', 'segundo']);
  // Limpar tudo deixa os fixados; desligar apaga tudo.
  h.fixar((await h.listar()).itens[1].id, true);
  h.limpar();
  assert.deepStrictEqual((await h.listar()).itens.map((i) => i.texto), ['segundo']);
  h.apagar((await h.listar()).itens[0].id);
  assert.deepStrictEqual((await h.listar()).itens, []);
  await c.writeText('terceiro');
  await h.olhar();
  h.ligar(false);
  assert.deepStrictEqual(await h.listar(), { ligado: false, itens: [] });
  assert.ok(avisos >= 5);
  assert.strictEqual(await h.usar(999), false);
});

test('área de transferência: uma leitura que não responde não trava o histórico', async () => {
  const c = { readText: () => new Promise(() => { }), writeText: async () => { }, has: async () => false };
  const h = new HistoricoTransferencia({ clipboard: c });
  h.ligar(true);
  clearTimeout(h.timer);
  const t0 = Date.now();
  assert.deepStrictEqual(await h.listar(), { ligado: true, itens: [] });
  assert.ok(Date.now() - t0 >= 2900);
  h.ligar(false);
});

test('firewall: o estado pelo ufw.conf e a senha de administrador', async () => {
  assert.strictEqual(lerUfwConf('# comentário\nENABLED=yes\nLOGLEVEL=low\n'), true);
  assert.strictEqual(lerUfwConf('ENABLED=no\n'), false);
  assert.strictEqual(lerUfwConf('ENABLED="yes"'), true);
  assert.strictEqual(lerUfwConf('LOGLEVEL=low'), null);
  // Fora do Linux, nada a fazer.
  assert.deepStrictEqual(await new Firewall({ plataforma: 'win32' }).estado(), { disponivel: false });
  assert.deepStrictEqual(await new Firewall({ plataforma: 'darwin' }).definir(true, 'x'), { ok: false, erro: 'linux' });
  const f = new FirewallFalso();
  assert.deepStrictEqual(await f.definir(true, 'errada'), { ok: false, senhaErrada: true });
  assert.deepStrictEqual(await f.definir(true, 'certa'), { ok: true });
  assert.strictEqual((await f.estado()).ligado, true);
});

test('modos de energia: powerprofilesctl list', async () => {
  const texto = [
    '  performance:',
    '    CpuDriver:\tintel_pstate',
    '    PlatformDriver:\tplatform_profile',
    '    Degraded:   no',
    '',
    '* balanced:',
    '    CpuDriver:\tintel_pstate',
    '    PlatformDriver:\tplatform_profile',
    '',
    '  power-saver:',
    '    CpuDriver:\tintel_pstate',
  ].join('\n');
  assert.deepStrictEqual(lerPerfis(texto), { atual: 'balanced', perfis: ['power-saver', 'balanced', 'performance'] });
  // Sem o modo de desempenho (muitos computadores de mesa e o Raspberry Pi), só os dois.
  assert.deepStrictEqual(lerPerfis('* power-saver:\n    Driver: placeholder\n\n  balanced:\n'), { atual: 'power-saver', perfis: ['power-saver', 'balanced'] });
  assert.strictEqual(lerPerfis('erro'), null);
  assert.deepStrictEqual(await new PerfilEnergia({ plataforma: 'win32' }).ler(), { disponivel: false });
  const falsa = bandejaFalsa();
  assert.strictEqual((await falsa.perfil.definir('performance')).atual, 'performance');
  assert.strictEqual((await falsa.perfil.definir('turbo')).atual, 'performance');
});

test('luz noturna: a gama do xrandr e as telas ligadas', async () => {
  assert.strictEqual(gamaDe(0), '1.00:1.00:1.00');
  assert.strictEqual(gamaDe(1), '1.00:0.72:0.42');
  assert.strictEqual(gamaDe(0.5), '1.00:0.86:0.71');
  assert.strictEqual(gamaDe(7), '1.00:0.72:0.42');
  assert.deepStrictEqual(lerSaidas('Screen 0: minimum 8 x 8\neDP-1 connected primary 1440x900+0+0\n   1440x900 59.90*+\nHDMI-1 disconnected\nDP-1 connected 1920x1080+1440+0\n'), ['eDP-1', 'DP-1']);
  const t = new TelaFalsa();
  await t.luzNoturna(0.5);
  assert.strictEqual(t.gama, '1.00:0.86:0.71');
});

test('atalhos: o que traz o Retro Computer para a frente (modo sistema)', () => {
  for (const a of ['alternar', 'explorador', 'busca', 'area-transferencia', 'fixado:3', 'bloquear']) assert.strictEqual(trazORetro(a), true, a);
  // A captura fotografa primeiro; fechar e encaixar agem no programa da frente.
  for (const a of ['captura-regiao', 'fechar-janela', 'encaixe:ArrowLeft', 'area-de-trabalho']) assert.strictEqual(trazORetro(a), false, a);
});

test('busca: as contas', async () => {
  const { calcular, arredondar } = await import(pathToFileURL(path.join(__dirname, '../src/sistema/js/conta.js')).href);
  const c = (s) => { const v = calcular(s); return v == null ? v : arredondar(v); };
  assert.strictEqual(c('2+2'), 4);
  assert.strictEqual(c('12*3,5'), 42);
  assert.strictEqual(c('12 × 3.5'), 42);
  assert.strictEqual(c('10 ÷ 4'), 2.5);
  assert.strictEqual(c('(1+2)^3'), 27);
  assert.strictEqual(c('2^3^2'), 512);
  assert.strictEqual(c('-2^2'), -4);
  assert.strictEqual(c('200 * 15%'), 30);
  assert.strictEqual(c('√16 + 1'), 5);
  assert.strictEqual(c('0,1+0,2'), 0.3);
  assert.strictEqual(c('7 − 10'), -3);
  // Não são contas: um número sozinho, uma palavra, uma data, um parêntese a mais, a divisão por zero.
  for (const s of ['2026', '-5', 'relatório', '2024-10-16', '16/10/2024', '(1+2', '1+', '1/0', '1.000.000+1', 'x+1', '', '√-4']) {
    assert.strictEqual(calcular(s), null, s);
  }
});
