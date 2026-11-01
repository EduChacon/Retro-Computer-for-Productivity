'use strict';
/* Os programas do computador principal (Linux: os .desktop) e a migração das configurações. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { lerDesktop, limparExec } = require('../src/principal/aplicativos.js');
const { Aplicativos } = require('../src/principal/aplicativos.js');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { migrar, mesclar, PADRAO } = require('../src/principal/config.js');

test('integração Windows conserva o atalho e expande o alvo de um lançador', (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-atalho-')), atalho = path.join(tmp, 'Programa.lnk'); fs.writeFileSync(atalho, 'teste');
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const anterior = process.env.RETRO_TESTE_LANCADOR_DIR; process.env.RETRO_TESTE_LANCADOR_DIR = 'C:\\Programas\\Aplicativo';
  t.after(() => { if (anterior === undefined) delete process.env.RETRO_TESTE_LANCADOR_DIR; else process.env.RETRO_TESTE_LANCADOR_DIR = anterior; });
  let args;
  const a = new Aplicativos({ plataforma: 'win32', shell: { readShortcutLink: () => ({ target: '%RETRO_TESTE_LANCADOR_DIR%\\Update.exe', args }) } });
  a.lista = [{ id: 'programa', arquivo: atalho }];
  for (args of ['--processStart programa.exe', '"--processStart" "programa.exe"', '--processStart="programa.exe"']) assert.deepEqual(a.alvoIntegracao('programa'), { atalho, arquivo: 'C:\\Programas\\Aplicativo\\Update.exe', appId: null, processoEsperado: 'programa.exe' });
  assert.equal(a.alvoIntegracao('desconhecido'), null);
});
test('integração Windows reconhece um atalho AppsFolder sem confundir o Explorer com o programa', (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-atalho-')), atalho = path.join(tmp, 'Aplicativo.lnk'); fs.writeFileSync(atalho, 'teste');
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  const appId = 'Microsoft.WindowsCalculator_8wekyb3d8bbwe!App';
  const a = new Aplicativos({ plataforma: 'win32', shell: { readShortcutLink: () => ({ target: 'C:\\Windows\\explorer.exe', args: 'shell:AppsFolder\\' + appId }) } });
  a.lista = [{ id: 'programa', arquivo: atalho }];
  assert.deepEqual(a.alvoIntegracao('programa'), { atalho, arquivo: null, appId, processoEsperado: null });
});

const WRITER = `[Desktop Entry]
Version=1.0
Type=Application
Name=LibreOffice Writer
Name[pt_BR]=Editor de textos
Name[es]=Procesador de textos
Exec=libreoffice --writer %U
Icon=libreoffice-writer
Categories=Office;WordProcessor;

[Desktop Action NewDocument]
Name=Novo documento
Exec=libreoffice --writer --new
`;

test('lê um .desktop no idioma pedido', () => {
  assert.equal(lerDesktop(WRITER, 'pt-BR').nome, 'Editor de textos');
  assert.equal(lerDesktop(WRITER, 'es').nome, 'Procesador de textos');
  assert.equal(lerDesktop(WRITER, 'en').nome, 'LibreOffice Writer');
  // A ação [Desktop Action] não troca o comando principal.
  assert.equal(lerDesktop(WRITER).exec, 'libreoffice --writer %U');
  assert.equal(lerDesktop(WRITER).icone, 'libreoffice-writer');
});

test('pula o que não é programa ou está escondido', () => {
  assert.equal(lerDesktop('[Desktop Entry]\nType=Link\nName=X\nURL=https://x'), null);
  assert.equal(lerDesktop('[Desktop Entry]\nType=Application\nName=X\nExec=x\nNoDisplay=true'), null);
  assert.equal(lerDesktop('[Desktop Entry]\nType=Application\nName=X\nExec=x\nHidden=true'), null);
  assert.equal(lerDesktop('[Desktop Entry]\nType=Application\nName=Vim\nExec=vim %F\nTerminal=true').terminal, true);
});

test('tira os códigos de campo do Exec', () => {
  assert.equal(limparExec('libreoffice --writer %U'), 'libreoffice --writer');
  assert.equal(limparExec('app %f --x %i %c %k'), 'app --x');
  assert.equal(limparExec('echo 100%%'), 'echo 100%');
});

test('a 0.3.0 põe o Navegador e o E-mail na área de trabalho de quem já usava', () => {
  const antigo = mesclar(PADRAO, { versao: 1, mesa: { atalhos: ['meu-computador', 'lixeira', 'craft:wordcraft'] } });
  const d = migrar(antigo);
  assert.deepEqual(d.mesa.atalhos, ['meu-computador', 'lixeira', 'navegador', 'correio', 'craft:wordcraft']);
  assert.equal(d.versao, 7);
  // Quem já está na versão 3 não muda (nem se tirou os ícones).
  assert.deepEqual(migrar({ ...d, mesa: { atalhos: ['lixeira'] } }).mesa.atalhos, ['lixeira']);
});

test('a 1.0.0 tira o Prompt de comando da área de trabalho só de quem tinha a lista padrão', () => {
  const padraoAntigo = ['meu-computador', 'meus-documentos', 'lixeira', 'navegador', 'correio', 'claude', 'prompt'];
  assert.deepEqual(migrar({ versao: 2, mesa: { atalhos: padraoAntigo } }).mesa.atalhos, [...padraoAntigo.slice(0, 6), 'codex', 'assistente']);
  // Quem mudou a lista (pôs ou tirou um ícone) fica com o Prompt.
  const mudada = [...padraoAntigo, 'craft:wordcraft'];
  assert.deepEqual(migrar({ versao: 2, mesa: { atalhos: mudada } }).mesa.atalhos, mudada);
  assert.equal(migrar({ versao: 2, mesa: { atalhos: mudada } }).versao, 7);
  assert.ok(!PADRAO.mesa.atalhos.includes('prompt'));
});

test('a 2.3.0 retira o Dot sem perder a mesa, os fixados ou as janelas pessoais', () => {
  const antigo = { versao: 6, mesa: { atalhos: ['lixeira', 'dot', 'craft:wordcraft', 'assistente'], posicoes: { dot: { x: 12, y: 34 }, lixeira: { x: 1, y: 2 } } }, barra: { fixados: ['bloco', 'dot', 'navegador'] }, reabrir: { ligado: true, janelas: [{ p: 'dot', args: { url: 'https://chatgpt.com/dots' }, ret: { x: 40 } }, { p: 'bloco', args: { caminho: 'a.txt' } }] } };
  const d = migrar(antigo);
  assert.deepEqual(d.mesa.atalhos, ['lixeira', 'assistente', 'craft:wordcraft']);
  assert.deepEqual(d.mesa.posicoes, { assistente: { x: 12, y: 34 }, lixeira: { x: 1, y: 2 } });
  assert.deepEqual(d.barra.fixados, ['bloco', 'assistente', 'navegador']);
  assert.deepEqual(d.reabrir.janelas, [{ p: 'assistente', args: {}, ret: { x: 40 } }, antigo.reabrir.janelas[1]]);
  assert.equal(antigo.mesa.atalhos[1], 'dot');
  assert.deepEqual(migrar(d), d);
});

test('a 1.1.0 pede a senha ao abrir (quem tem senha não abria mais pedindo, a não ser marcando a opção)', () => {
  const antigo = migrar(mesclar(PADRAO, { versao: 3, bloqueio: { aoVoltar: true, aoAbrir: false, naProtecao: false } }));
  assert.equal(antigo.bloqueio.aoAbrir, true);
  assert.equal(antigo.versao, 7);
  // Depois da migração, desligar no Painel fica desligado.
  assert.equal(migrar({ ...antigo, bloqueio: { ...antigo.bloqueio, aoAbrir: false } }).bloqueio.aoAbrir, false);
  assert.equal(PADRAO.bloqueio.aoAbrir, true);
});

test('a 2.0.0 deixa a proteção de tela pedir a senha no modo sistema (o falso guardado só pelo padrão sai)', () => {
  const antigo = migrar(mesclar(PADRAO, { versao: 4, bloqueio: { aoVoltar: true, aoAbrir: true, naProtecao: false } }));
  assert.ok(!('naProtecao' in antigo.bloqueio));
  assert.equal(antigo.versao, 7);
  assert.ok(!('naProtecao' in PADRAO.bloqueio));
  // Marcado continua marcado; e, depois da 2.0.0, a escolha do Painel fica como está.
  assert.equal(migrar(mesclar(PADRAO, { versao: 4, bloqueio: { naProtecao: true } })).bloqueio.naProtecao, true);
  assert.equal(migrar({ ...antigo, bloqueio: { ...antigo.bloqueio, naProtecao: false } }).bloqueio.naProtecao, false);
});

test('o ícone de um atalho do Windows vem do programa para onde ele aponta (não o genérico da extensão)', () => {
  const { origemDoIcone, iconeDoUrl, expandirVariaveis } = require('../src/principal/aplicativos');
  const existe = (p) => ['C:\\Program Files\\Brave\\brave.exe', 'C:\\Windows\\system32\\imageres.dll', 'C:\\Apps\\anki.ico'].includes(p);
  const atalhos = {
    'brave.lnk': { target: 'C:\\Program Files\\Brave\\brave.exe', icon: '' },
    'anki.lnk': { target: 'C:\\Apps\\anki.exe', icon: 'C:\\Apps\\anki.ico' },
    'painel.lnk': { target: '', icon: '%SystemRoot%\\system32\\imageres.dll', iconIndex: 27 },
    'loja.lnk': { target: '', icon: '' },
  };
  const shell = { readShortcutLink: (p) => { if (!atalhos[p]) throw new Error('não é atalho'); return atalhos[p]; } };
  const env = { SystemRoot: 'C:\\Windows' };
  assert.equal(origemDoIcone('brave.lnk', { shell, existe, env }), 'C:\\Program Files\\Brave\\brave.exe');
  // O ícone escolhido no atalho vem antes do programa.
  assert.equal(origemDoIcone('anki.lnk', { shell, existe, env }), 'C:\\Apps\\anki.ico');
  // Um ícone do meio de um .dll, sem um programa: o genérico (o Electron só leria o primeiro do .dll).
  assert.equal(origemDoIcone('painel.lnk', { shell, existe, env }), null);
  atalhos['brave2.lnk'] = { target: 'C:\\Program Files\\Brave\\brave.exe', icon: 'C:\\Windows\\system32\\imageres.dll', iconIndex: 3 };
  assert.equal(origemDoIcone('brave2.lnk', { shell, existe, env }), 'C:\\Program Files\\Brave\\brave.exe');
  // Os da Microsoft Store (sem .exe) e os quebrados ficam com o genérico.
  assert.equal(origemDoIcone('loja.lnk', { shell, existe, env }), null);
  assert.equal(origemDoIcone('quebrado.lnk', { shell, existe, env }), null);
  // O .exe é ele mesmo; um .txt não tem ícone próprio.
  assert.equal(origemDoIcone('C:\\x\\programa.exe', { shell, existe, env }), 'C:\\x\\programa.exe');
  assert.equal(origemDoIcone('C:\\x\\nota.txt', { shell, existe, env }), null);
  // O atalho da internet: o IconFile dele.
  assert.equal(iconeDoUrl('[InternetShortcut]\r\nURL=https://exemplo.com\r\nIconFile=C:\\Program Files\\Brave\\brave.exe\r\nIconIndex=0\r\n'), 'C:\\Program Files\\Brave\\brave.exe');
  assert.equal(origemDoIcone('site.url', { shell, existe, env, ler: () => '[InternetShortcut]\nIconFile=C:\\Program Files\\Brave\\brave.exe' }), 'C:\\Program Files\\Brave\\brave.exe');
  assert.equal(expandirVariaveis('%ProgramFiles%\\x', { PROGRAMFILES: 'C:\\Program Files' }), 'C:\\Program Files\\x');
  assert.equal(expandirVariaveis('%NAOEXISTE%\\x', {}), '%NAOEXISTE%\\x');
});
