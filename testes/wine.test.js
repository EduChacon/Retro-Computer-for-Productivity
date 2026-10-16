// Os programas do Windows no Linux, pelo WINE: os argumentos e os atalhos dos instaladores.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Wine, argsDoArquivo, lerAtalhos } = require('../src/principal/wine');

test('o .msi pelo msiexec, o .exe direto', () => {
  assert.deepStrictEqual(argsDoArquivo('/c/Recebidos/instalar.msi'), ['msiexec', '/i', '/c/Recebidos/instalar.msi']);
  assert.deepStrictEqual(argsDoArquivo('/c/Recebidos/Jogo.EXE'), ['/c/Recebidos/Jogo.EXE']);
});

test('os atalhos do menu Iniciar do Windows, sem os desinstaladores', () => {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-wine-'));
  fs.mkdirSync(path.join(raiz, 'Agenda'), { recursive: true });
  const desktop = (nome, exec) => `[Desktop Entry]\nName=${nome}\nExec=${exec}\nType=Application\nIcon=1A2B_agenda.0\n`;
  fs.writeFileSync(path.join(raiz, 'Agenda', 'Agenda 98.desktop'), desktop('Agenda 98', 'env WINEPREFIX="/home/eu/.config/Retro Computer/wine" wine C:\\\\\\\\ProgramData\\\\\\\\Agenda.lnk'));
  fs.writeFileSync(path.join(raiz, 'Agenda', 'Desinstalar Agenda.desktop'), desktop('Desinstalar Agenda', 'wine uninstall.exe'));
  fs.writeFileSync(path.join(raiz, 'Calculadora Antiga.desktop'), desktop('Calculadora Antiga', 'wine calc.exe'));
  const lista = lerAtalhos(raiz, 'sistema');
  assert.deepStrictEqual(lista.map((x) => x.nome), ['Agenda 98', 'Calculadora Antiga']);
  assert.match(lista[0].id, /^sistema:/);
  assert.match(lista[0].exec, /^env WINEPREFIX=/);
  assert.deepStrictEqual(lerAtalhos(path.join(raiz, 'nao-existe'), 'flatpak'), []);
});

test('a versão de mentira anota o que abriria', async () => {
  const w = new Wine({ dados: os.tmpdir(), plataforma: 'linux', falso: true });
  assert.deepStrictEqual(await w.estado(), { disponivel: true, como: 'sistema' });
  const r = await w.abrir('/c/Recebidos/instalar.msi');
  assert.deepStrictEqual(r, { ok: true, como: 'sistema' });
  assert.deepStrictEqual(w.abertos, [['wine', 'msiexec', '/i', '/c/Recebidos/instalar.msi']]);
  assert.deepStrictEqual(await new Wine({ dados: os.tmpdir(), plataforma: 'win32' }).estado(), { disponivel: false });
});
