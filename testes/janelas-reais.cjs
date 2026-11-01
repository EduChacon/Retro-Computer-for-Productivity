'use strict';
/* Aplicativos reais do runner, com arquivos e perfil exclusivos do teste. Sem contas pessoais. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { Aplicativos } = require('../src/principal/aplicativos');
const { JanelasIntegradas, PonteNativa } = require('../src/principal/janelas-integradas');
const aguardar = async (fn) => { for (let n = 0; n < 100; n++) { try { const r = fn(); if (r) return r; } catch { } await new Promise((r) => setTimeout(r, 100)); } throw new Error('A janela do hospedeiro de teste não iniciou.'); };
const argumento = (s) => '"' + s.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/, '$1$1') + '"';

for (const programa of ['notepad', 'chrome']) for (const lancador of [false, true]) {
  test(`Windows real: ${programa}, ${lancador ? 'por lançador que termina' : 'atalho direto'}`, { skip: process.platform !== 'win32', timeout: 90000 }, async (t) => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-app-real-'));
    const ps = path.join(process.env.SystemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe');
    const executar = (script, args) => execFileSync(ps, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, ...args], { windowsHide: true, encoding: 'utf8' });
    const compilar = path.join(tmp, 'compilar.ps1'); fs.writeFileSync(compilar, "param($Fonte,$Saida)\n$ErrorActionPreference='Stop'\nAdd-Type -Path $Fonte -ReferencedAssemblies System.Windows.Forms,System.Drawing -OutputAssembly $Saida -OutputType WindowsApplication\n");
    const exePai = path.join(tmp, 'Hospedeiro.exe'); executar(compilar, [path.join(__dirname, 'janela-windows-falsa.cs'), exePai]);
    const dadosPai = path.join(tmp, 'pai.json'), pai = spawn(exePai, [dadosPai, 'pai']);
    let ponte, j, sessao;
    t.after(async () => {
      if (j && sessao) { await j.acao(sessao.id, 'fechar').catch(() => {}); await j.soltar(sessao.id).catch(() => {}); }
      ponte?.encerrar();
      if (pai.exitCode === null && !pai.signalCode) await new Promise((r) => { pai.once('exit', r); pai.kill(); });
      try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); } catch { t.diagnostic('O Windows ainda mantém o perfil temporário aberto; o runner o remove ao terminar.'); }
    });
    const p = await aguardar(() => JSON.parse(fs.readFileSync(dadosPai, 'utf8')));
    ponte = new PonteNativa({ pai: () => p.hwnd, processoPai: pai.pid });
    const nomeTeste = 'Retro teste ' + (lancador ? 'lancador' : 'direto');
    const texto = path.join(tmp, nomeTeste + '.txt'); fs.writeFileSync(texto, 'Documento exclusivo do teste de integração.\r\n');
    const chrome = [process.env.CHROME_BIN, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'].find((f) => f && fs.existsSync(f));
    const exe = programa === 'notepad' ? path.join(process.env.SystemRoot, 'System32/notepad.exe') : chrome;
    assert.ok(exe && fs.existsSync(exe), 'Aplicativo real ausente no runner: ' + programa);
    const tituloChrome = 'Retro Chrome real ' + (lancador ? 'lancador' : 'direto');
    const html = path.join(tmp, 'chrome-teste.html'); fs.writeFileSync(html, '<!doctype html><html><title>' + tituloChrome + '</title><body style="background:#e0f0e0;font:24px sans-serif"><h1>RETRO_CHROME_REAL</h1><input value="Documento preservado"></body></html>');
    const args = programa === 'notepad' ? [texto] : ['--user-data-dir=' + path.join(tmp, 'perfil-chrome'), '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-background-mode', '--disable-sync', '--disable-component-update', '--app=' + pathToFileURL(html).href];
    let alvo = exe, parametros = args.map(argumento).join(' ');
    if (lancador) { alvo = path.join(tmp, 'Update.exe'); executar(compilar, [path.join(__dirname, 'lancador-janelas.cs'), alvo]); parametros = ['--processStart', path.basename(exe), exe, parametros].map(argumento).join(' '); }
    const atalho = path.join(tmp, 'Aplicativo real.lnk'), spec = path.join(tmp, 'atalho.json');
    fs.writeFileSync(spec, JSON.stringify({ atalho, arquivo: alvo, argumentos: parametros }));
    const detalhes = JSON.parse(executar(path.join(__dirname, 'atalho-janelas.ps1'), [spec]));
    const apps = new Aplicativos({ plataforma: 'win32', shell: { readShortcutLink: (f) => { assert.equal(f, atalho); return detalhes; } } });
    const id = 'win:' + atalho; apps.lista = [{ id, nome: programa, arquivo: atalho }];
    j = new JanelasIntegradas({ aplicativos: apps, ponte, plataforma: 'win32' });
    sessao = await j.abrir(id); assert.ok(sessao.janelas.length > 0, 'Não reconheceu a janela do aplicativo real.');
    assert.ok(sessao.janelas.every((x) => !x.titulo.includes('Atualizando o programa de teste')), 'Capturou o atualizador em vez do aplicativo solicitado.');
    const titulo = programa === 'chrome' ? tituloChrome : nomeTeste;
    let escolhida;
    for (let n = 0; n < 40; n++) {
      escolhida = sessao.janelas.find((x) => x.titulo.toLowerCase().includes(titulo.toLowerCase())); if (escolhida) break;
      await new Promise((r) => setTimeout(r, 250)); sessao = await j.abrir(id);
    }
    assert.ok(escolhida, 'Selecionou uma janela alheia ao teste: ' + JSON.stringify(sessao.janelas));
    const g = { ret: { x: 10, y: 40, w: 570, h: 310 }, viewport: { w: 624, h: 381 }, visivel: true };
    await j.associar(sessao.id, escolhida.id, g); await j.acao(sessao.id, 'focar');
    assert.equal((await j.estado(sessao.id)).embutida, true);
    await new Promise((r) => setTimeout(r, 800));
    const pasta = path.resolve(process.env.RETRO_CAPTURAS_JANELAS || 'capturas-janelas-reais'); fs.mkdirSync(pasta, { recursive: true });
    const captura = path.join(tmp, 'captura.json');
    fs.writeFileSync(captura, JSON.stringify(await aguardar(() => JSON.parse(fs.readFileSync(dadosPai, 'utf8')))));
    executar(path.join(__dirname, 'capturar-janelas.ps1'), [captura, path.join(pasta, programa + (lancador ? '-lancador' : '-direto') + '.png')]);
    await j.acao(sessao.id, 'fechar');
    assert.equal((await j.estado(sessao.id)).embutida, false);
    await j.soltar(sessao.id); sessao = null;
    assert.equal(fs.readFileSync(texto, 'utf8'), 'Documento exclusivo do teste de integração.\r\n');
  });
}
