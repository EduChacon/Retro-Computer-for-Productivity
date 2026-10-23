/*
 * As duas telas em tela cheia sem a tela cheia do sistema (o Windows: ESPALHAR_SEM_CHEIA em main.js),
 * com dois monitores de mentira de tamanhos diferentes. Roda no Windows do fluxo "Compilar" (lá, a
 * tela cheia do Chromium devolvia a janela a um monitor só) e, com RETRO_ESPALHAR_SEM_CHEIA=1, no
 * Linux com o Xvfb ("-screen 0 2304x808x24").
 * Uso: node testes/duas-telas.mjs [pasta das capturas]
 * Confere: a janela abre cobrindo os dois monitores, a área de trabalho vê as duas telas, o F11 volta
 * para a janela de antes e para as duas telas de novo, e desligar a opção volta à tela cheia de um monitor.
 */
import { _electron as electron } from 'playwright-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'retro-duas-telas'));
fs.mkdirSync(SAIDA, { recursive: true });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-duas-'));
const dados = path.join(tmp, 'dados');
fs.mkdirSync(dados, { recursive: true });
fs.writeFileSync(path.join(dados, 'config.json'), JSON.stringify({ primeiraVez: false, telaCheia: true, tela: { duas: true } }));

// Os monitores de mentira e o lugar esperado do conteúdo: a união deles, com a margem de 8 pontos
// dos lados e embaixo (MARGEM_ESPALHADA).
const MONITORES = '1024x768+0+0,1280x800+1024+0';
const ESPALHADA = { x: -8, y: 0, width: 2320, height: 808 };

const falhas = [];
const conferir = (ok, texto) => { console.log(`${ok ? 'ok' : 'FALHOU'}: ${texto}`); if (!ok) falhas.push(texto); };
const perto = (a, b) => ['x', 'y', 'width', 'height'].every((k) => Math.abs(a[k] - b[k]) <= 2);

const app = await electron.launch({
  executablePath: require('electron'),
  args: process.platform === 'win32' ? [RAIZ] : ['--no-sandbox', RAIZ],
  env: {
    ...process.env, RETRO_DADOS: dados, RETRO_DISCO: path.join(tmp, 'disco'), RETRO_RAPIDO: '1', RETRO_SEM_REABRIR: '1',
    RETRO_MONITORES_FALSOS: MONITORES, ...(process.platform === 'win32' ? {} : { RETRO_ESPALHAR_SEM_CHEIA: '1' }),
  },
});
try {
  const pagina = await app.firstWindow();
  await pagina.waitForSelector('#iniciar', { timeout: 60000 });
  const janela = () => app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; return { conteudo: w.getContentBounds(), cheia: w.isFullScreen(), visivel: w.isVisible() }; });
  const telas = () => pagina.evaluate(() => ({ varias: document.documentElement.classList.contains('varias-telas'), barras: document.querySelectorAll('.barra-tela').length, area: [innerWidth, innerHeight] }));
  // Espera até o estado chegar (ou o tempo acabar) e devolve o último.
  const esperar = async (ok, ms = 8000) => {
    let j;
    for (let t = 0; t < ms; t += 250) { j = await janela(); if (ok(j)) return j; await pagina.waitForTimeout(250); }
    return j;
  };

  // 1. Ao abrir: a janela cobre os dois monitores, sem a tela cheia do sistema, e continua no lugar.
  let j = await esperar((x) => x.visivel && perto(x.conteudo, ESPALHADA));
  await pagina.waitForTimeout(2500);
  j = await janela();
  console.log('ao abrir:', JSON.stringify(j), JSON.stringify(await telas()));
  conferir(perto(j.conteudo, ESPALHADA), 'ao abrir, o conteúdo cobre os dois monitores');
  conferir(!j.cheia, 'ao abrir, sem a tela cheia do sistema');
  const t = await telas();
  conferir(t.varias && t.barras === 1, 'a área de trabalho vê as duas telas (e a barra da outra tela)');
  await pagina.screenshot({ path: path.join(SAIDA, 'duas-telas-ao-abrir.png') });

  // 2. O F11 (a tela cheia desligada): a janela de antes, num monitor só.
  await pagina.evaluate(() => retro.sistema.telaCheia(false));
  // (A janela de antes é a de 1280 por 800, ou menor, no monitor principal de verdade.)
  const naJanela = (x) => !x.cheia && x.conteudo.width <= 1280 && x.conteudo.height <= 800;
  j = await esperar(naJanela);
  console.log('sem a tela cheia:', JSON.stringify(j), JSON.stringify(await telas()));
  conferir(naJanela(j), 'o F11 volta para a janela de antes');
  conferir(!(await telas()).varias, 'na janela, uma tela só');

  // 3. O F11 de novo: as duas telas outra vez.
  await pagina.evaluate(() => retro.sistema.telaCheia(true));
  j = await esperar((x) => perto(x.conteudo, ESPALHADA));
  await pagina.waitForTimeout(1500);
  j = await janela();
  console.log('de novo:', JSON.stringify(j), JSON.stringify(await telas()));
  conferir(perto(j.conteudo, ESPALHADA) && !j.cheia, 'o F11 de novo cobre os dois monitores');
  conferir((await telas()).varias, 'e a área de trabalho vê as duas telas de novo');
  await pagina.screenshot({ path: path.join(SAIDA, 'duas-telas-de-novo.png') });

  // 4. A opção desligada: a tela cheia de sempre, num monitor só.
  await pagina.evaluate(() => retro.tela.usarDuasTelas(false));
  j = await esperar((x) => x.cheia);
  await pagina.waitForTimeout(1000);
  j = await janela();
  console.log('opção desligada:', JSON.stringify(j), JSON.stringify(await telas()));
  conferir(j.cheia && j.conteudo.width < 2000, 'sem a opção, a tela cheia de um monitor');
  conferir(!(await telas()).varias, 'e uma tela só na área de trabalho');
} catch (e) {
  falhas.push(String(e && e.stack || e));
  console.error(e);
} finally {
  await app.evaluate(({ app: a }) => { setTimeout(() => a.exit(0), 50); }).catch(() => { });
  await new Promise((r) => setTimeout(r, 1500));
}
if (falhas.length) { console.error(`\n${falhas.length} falha(s).`); process.exit(1); }
console.log('\nDUAS TELAS: ok');
