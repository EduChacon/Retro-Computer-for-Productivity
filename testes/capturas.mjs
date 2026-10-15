/*
 * Abre o Retro Computer num Electron sem janela visível (xvfb) e tira capturas.
 * Uso: xvfb-run -a node testes/capturas.mjs [pasta de saída] [roteiro]   (no Linux sem tela)
 *      node testes/capturas.mjs [pasta de saída] [roteiro]                (com tela)
 *   roteiro: o nome de uma função de ROTEIROS abaixo (padrão: "geral")
 * Os dados e o disco ficam em pastas temporárias (RETRO_DADOS, RETRO_DISCO).
 */
import { _electron as electron } from 'playwright-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SAIDA = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'retro-capturas'));
const ROTEIRO = process.argv[3] || 'geral';
fs.mkdirSync(SAIDA, { recursive: true });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-teste-'));
const dados = process.env.RETRO_DADOS || path.join(tmp, 'dados');
const disco = process.env.RETRO_DISCO || path.join(tmp, 'disco');

// Instala um pacote já baixado (RETRO_ZIP=caminho/wordcraft-web-0.7.0.zip) antes de abrir.
if (process.env.RETRO_ZIP) {
  const { Programas } = require('../src/principal/programas.js');
  const p = new Programas(path.join(dados, 'programas'), fetch);
  for (const z of process.env.RETRO_ZIP.split(',')) console.log('instalado:', (await p.instalarZip(z)).id);
}
// RETRO_SEM_BOAS_VINDAS=1: abre como se não fosse a primeira vez (sem a Ajuda e o balão).
if (process.env.RETRO_SEM_BOAS_VINDAS) {
  fs.mkdirSync(dados, { recursive: true });
  fs.writeFileSync(path.join(dados, 'config.json'), JSON.stringify({ primeiraVez: false }));
}
// Arquivos de exemplo no disco.
fs.mkdirSync(path.join(disco, 'Meus documentos'), { recursive: true });
fs.writeFileSync(path.join(disco, 'Meus documentos', 'Teste.md'), '# Título do teste\n\nUm parágrafo com **negrito** e acentuação: ação, coração, você.\n');

// RETRO_EXECUTAVEL=dist/linux-unpacked/retro-computer testa o aplicativo já empacotado.
const empacotado = process.env.RETRO_EXECUTAVEL ? path.resolve(process.env.RETRO_EXECUTAVEL) : null;
const app = await electron.launch({
  executablePath: empacotado || require('electron'),
  args: empacotado ? ['--no-sandbox'] : ['--no-sandbox', RAIZ],
  env: { ...process.env, RETRO_DADOS: dados, RETRO_DISCO: disco, RETRO_JANELA: '1', RETRO_RAPIDO: process.env.RETRO_BOOT ? '' : '1' },
});
const pagina = await app.firstWindow();
const erros = [];
pagina.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') erros.push(`[${m.type()}] ${m.text()}`); });
pagina.on('pageerror', (e) => erros.push(`[pageerror] ${e.message}\n${e.stack}`));
await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.setContentSize(1024, 700); });
if (process.env.RETRO_BOOT) {
  await pagina.waitForSelector('#boot .bios', { timeout: 30000 });
  await pagina.waitForTimeout(700);
  await pagina.screenshot({ path: path.join(SAIDA, '00-bios.png') });
  await pagina.waitForSelector('#boot .abertura', { timeout: 30000 });
  await pagina.waitForTimeout(500);
  await pagina.screenshot({ path: path.join(SAIDA, '00-abertura.png') });
}
await pagina.waitForSelector('#iniciar', { timeout: 30000 });
await pagina.waitForTimeout(800);

let n = 0;
async function foto(nome) {
  n++;
  const arq = path.join(SAIDA, `${String(n).padStart(2, '0')}-${nome}.png`);
  await pagina.screenshot({ path: arq });
  console.log('captura:', arq);
}
const abrir = (id, args) => pagina.evaluate(([i, a]) => window.__retro.abrir(i, a), [id, args || {}]);
const fecharTudo = () => pagina.evaluate(async () => { for (const j of window.__retro.janelas.lista.slice()) await j.fechar(true); });

async function esperarPronto(ms = 90000) {
  await pagina.waitForFunction(() => !document.querySelector('.corpo .carregando'), null, { timeout: ms });
  await pagina.waitForTimeout(1500);
}

const ROTEIROS = {
  async boot() {
    // Com RETRO_BOOT=1: a tela do BIOS e a abertura (capturadas logo no início).
  },
  async claude() {
    await fecharTudo();
    await abrir('claude', { pasta: 'Meus documentos' });
    await pagina.waitForTimeout(9000);
    await foto('claude');
    await pagina.evaluate(() => { const j = window.__retro.janelas.janelaAtiva(); if (j) j.maximizar(); });
    await pagina.waitForTimeout(2500);
    await foto('claude-maximizado');
  },
  async lixo() {
    const src = () => pagina.evaluate(() => [...document.querySelectorAll('#mesa .item')].find((e) => e.textContent.includes('Lixeira')).querySelector('img').getAttribute('src'));
    console.log('antes:', await src());
    await pagina.evaluate(async () => {
      await retro.disco.gravar('Meus documentos/apagar.txt', new TextEncoder().encode('x'));
      await retro.disco.paraLixeira('Meus documentos/apagar.txt');
    });
    await pagina.waitForTimeout(1500);
    console.log('depois de excluir:', await src());
    await pagina.evaluate(() => retro.disco.esvaziarLixeira());
    await pagina.waitForTimeout(1500);
    console.log('depois de esvaziar:', await src());
    await abrir('explorador', { pasta: 'Meus documentos' });
    await pagina.waitForTimeout(400);
    await pagina.evaluate(() => { const j = window.__retro.janelas.janelaAtiva(); j.explorador.definirModo('detalhes'); });
    await pagina.waitForTimeout(400);
    await foto('detalhes');
  },
  async mais() {
    await fecharTudo();
    // Arquivos de exemplo e um item na Lixeira.
    await pagina.evaluate(async () => {
      const enc = (t) => new TextEncoder().encode(t);
      await retro.disco.gravar('Meus documentos/Ideias.txt', enc('Ideias para o projeto\n\n- Escrever o capítulo 1\n- Revisar a ementa\n'));
      await retro.disco.gravar('Meus documentos/Orçamento 2026.csv', enc('item;valor\nlivros;120\n'));
      await retro.disco.criarPasta('Meus documentos', 'Projetos');
      await retro.disco.gravar('Meus documentos/rascunho velho.txt', enc('x'));
      await retro.disco.paraLixeira('Meus documentos/rascunho velho.txt');
      await retro.disco.gravar('Área de trabalho/Lista de tarefas.txt', enc('1. Comprar café'));
    });
    await pagina.evaluate(() => window.__retro.estado.config && true);
    await pagina.waitForTimeout(600);
    const ex = await abrir('explorador', { pasta: 'Meus documentos' });
    await pagina.waitForTimeout(500);
    await pagina.evaluate(() => { const j = window.__retro.janelas.janelaAtiva(); j.explorador.definirModo('detalhes'); });
    await pagina.waitForTimeout(300);
    const item = pagina.locator('.janela.ativa .linha-item .item').nth(1);
    await item.click();
    await item.click({ button: 'right' });
    await pagina.waitForTimeout(300);
    await pagina.hover('.menu .opcao:has-text("Enviar para")');
    await pagina.waitForTimeout(600);
    await foto('detalhes-e-menu');
    await pagina.keyboard.press('Escape'); await pagina.keyboard.press('Escape');
    await pagina.evaluate(() => { const j = window.__retro.janelas.janelaAtiva(); j.explorador.definirModo('icones'); });
    await fecharTudo();
    await abrir('lixeira');
    await pagina.waitForTimeout(500);
    await abrir('executar');
    await pagina.waitForTimeout(300);
    await pagina.keyboard.type('bloco');
    await foto('lixeira-executar');
    await fecharTudo();
    await abrir('localizar', { termo: 'o' });
    await pagina.waitForTimeout(800);
    await abrir('foco');
    await pagina.waitForTimeout(300);
    await foto('localizar-foco');
    await fecharTudo();
    await abrir('ajuda', { topico: 'arquivos' });
    await pagina.waitForTimeout(300);
    await abrir('painel', { secao: 'claude' });
    await pagina.waitForTimeout(1500);
    await foto('ajuda-claude');
    await fecharTudo();
    await abrir('bloco', { arquivo: 'Meus documentos/Ideias.txt' });
    await pagina.waitForTimeout(400);
    await pagina.click('.janela.ativa .menubar > div:nth-child(4)');
    await pagina.waitForTimeout(300);
    await foto('bloco-formatar');
    await pagina.keyboard.press('Escape');
    await fecharTudo();
    await pagina.evaluate(async () => { await retro.config.definir({ papel: { cor: '#3a6ea5', padrao: 'tijolos' } }); });
    await pagina.evaluate(() => import('./js/aparencia.js').then((m) => m.aplicarFundo({ cor: '#3a6ea5', padrao: 'tijolos' })));
    await pagina.waitForTimeout(300);
    await foto('fundo-tijolos');
  },
  async craft() {
    await fecharTudo();
    await abrir('craft:wordcraft', { arquivo: 'Meus documentos/Teste.md' });
    await esperarPronto();
    await pagina.waitForTimeout(2500);
    await foto('wordcraft-aberto');
    // Ctrl+S dentro do programa: o .md vira .docx, então a caixa "Salvar como" aparece.
    const quadro = pagina.frameLocator('iframe').locator('canvas');
    await quadro.click({ position: { x: 400, y: 300 } });
    await pagina.keyboard.press('Control+s');
    await pagina.waitForSelector('#camada-modal .janela', { timeout: 15000 });
    await pagina.waitForTimeout(500);
    await foto('wordcraft-salvar-como');
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(3000);
    await foto('wordcraft-salvo');
    const docs = () => fs.readdirSync(path.join(disco, 'Meus documentos')).join(', ');
    console.log('depois do 1º Salvar:', docs());
    // O segundo Ctrl+S grava direto (o arquivo já tem lugar) e guarda a versão anterior.
    await quadro.click({ position: { x: 600, y: 420 } });
    await pagina.keyboard.type(' Mais texto.');
    await pagina.keyboard.press('Control+s');
    await pagina.waitForTimeout(3000);
    const pv = path.join(disco, '.versoes', 'Meus documentos', 'Teste.docx');
    console.log('depois do 2º Salvar:', docs(), '| versões:', fs.existsSync(pv) ? fs.readdirSync(pv).join(', ') : '(nenhuma)');
    console.log('caixa aberta?', await pagina.locator('#camada-modal .janela').count());
    // Ctrl+O: a caixa Abrir do disco.
    await quadro.click({ position: { x: 600, y: 420 } });
    await pagina.keyboard.press('Control+o');
    await pagina.waitForSelector('#camada-modal .janela', { timeout: 15000 }).catch(() => console.log('sem caixa Abrir'));
    await pagina.waitForTimeout(800);
    await foto('wordcraft-abrir');
  },

  async geral() {
    await fecharTudo();
    await foto('mesa');
    await pagina.click('#iniciar');
    await pagina.waitForTimeout(300);
    await pagina.hover('.menu.iniciar .opcao >> nth=0');
    await pagina.waitForTimeout(500);
    await pagina.hover('.menu:not(.iniciar) .opcao >> nth=0');
    await pagina.waitForTimeout(500);
    await foto('iniciar');
    await pagina.keyboard.press('Escape');
    await pagina.keyboard.press('Escape');
    await pagina.keyboard.press('Escape');
    await abrir('explorador', { pasta: '::computador' });
    await pagina.waitForTimeout(400);
    await abrir('explorador', { pasta: 'Meus documentos' });
    await pagina.waitForTimeout(400);
    await foto('pastas');
    await fecharTudo();
    await abrir('bloco', { arquivo: 'Meus documentos/Leia-me.txt' });
    await pagina.waitForTimeout(500);
    await foto('bloco');
    await fecharTudo();
    await abrir('painel');
    await pagina.waitForTimeout(300);
    await abrir('painel', { secao: 'aparencia' });
    await pagina.waitForTimeout(400);
    await foto('painel');
    await fecharTudo();
    await abrir('programas');
    await pagina.waitForTimeout(800);
    await foto('programas');
    await fecharTudo();
    await abrir('prompt');
    await pagina.waitForTimeout(1500);
    await pagina.keyboard.type('echo Olá, Retro Computer && ls\n');
    await pagina.waitForTimeout(800);
    await foto('prompt');
    await fecharTudo();
    await abrir('foco');
    await pagina.waitForTimeout(300);
    await abrir('desligar');
    await pagina.waitForTimeout(400);
    await foto('desligar');
  },
};

try {
  await ROTEIROS[ROTEIRO]();
} catch (e) {
  console.error('ERRO NO ROTEIRO:', e);
  await foto('erro').catch(() => {});
} finally {
  if (erros.length) console.log('--- console ---\n' + erros.join('\n'));
  // O fechamento normal passa pela caixa "Desligar"; nos testes, sai direto.
  await app.evaluate(({ app: a }) => a.exit(0)).catch(() => {});
}
