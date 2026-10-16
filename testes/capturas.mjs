/*
 * Abre o Retro Computer num Electron sem janela visível (xvfb) e tira capturas.
 * Uso: xvfb-run -a node testes/capturas.mjs [pasta de saída] [roteiro]   (no Linux sem tela)
 *      node testes/capturas.mjs [pasta de saída] [roteiro]                (com tela)
 *   roteiro: o nome de uma função de ROTEIROS abaixo (padrão: "geral")
 * Os dados e o disco ficam em pastas temporárias (RETRO_DADOS, RETRO_DISCO).
 * RETRO_IDIOMA=en ou es: as mesmas capturas em inglês ou em espanhol.
 */
import { _electron as electron } from 'playwright-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import http from 'node:http';

const require = createRequire(import.meta.url);
const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SAIDA = path.resolve(process.argv[2] || path.join(os.tmpdir(), 'retro-capturas'));
const ROTEIRO = process.argv[3] || 'geral';
fs.mkdirSync(SAIDA, { recursive: true });

// O idioma das capturas: as pastas do disco e os textos que o roteiro procura na tela.
const IDIOMA = process.env.RETRO_IDIOMA || 'pt-BR';
const { PASTAS } = require('../src/principal/idioma.js');
const { documentos: DOCS, mesa: MESA, leiame: LEIAME } = PASTAS[IDIOMA];
const CATALOGO = IDIOMA === 'pt-BR' ? {} : JSON.parse(fs.readFileSync(path.join(RAIZ, 'src', 'sistema', 'idiomas', IDIOMA + '.json'), 'utf8'));
const T = (pt) => (CATALOGO[pt] || pt).replace('&', '');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-teste-'));
const dados = process.env.RETRO_DADOS || path.join(tmp, 'dados');
const disco = process.env.RETRO_DISCO || path.join(tmp, 'disco');

// Instala um pacote já baixado (RETRO_ZIP=caminho/wordcraft-web-0.7.0.zip) antes de abrir.
if (process.env.RETRO_ZIP) {
  const { Programas } = require('../src/principal/programas.js');
  const p = new Programas(path.join(dados, 'programas'), fetch);
  for (const z of process.env.RETRO_ZIP.split(',')) console.log('instalado:', (await p.instalarZip(z)).id);
}
// RETRO_FALSA_VERSAO=9.9.9: finge que a busca de atualizações achou essa versão de todos os instalados
// (a busca fica guardada por algumas horas, então o programa não pergunta à internet).
if (process.env.RETRO_FALSA_VERSAO) {
  const pasta = path.join(dados, 'programas');
  const buscas = {};
  for (const id of fs.readdirSync(pasta)) buscas[id] = { verificadoEm: Date.now(), versao: process.env.RETRO_FALSA_VERSAO };
  fs.writeFileSync(path.join(pasta, 'atualizacoes.json'), JSON.stringify(buscas));
}
// Roteiro "autoatualizar" (com RETRO_EXECUTAVEL do pacote .deb desempacotado): um servidor local
// finge a versão 0.0.1 a mais, com o próprio .deb de dist/, e o roteiro procura e baixa.
let servidorAtualizacao = null;
if (ROTEIRO === 'autoatualizar') {
  const http = await import('node:http');
  const dist = path.join(RAIZ, 'dist');
  const yml = fs.readFileSync(path.join(dist, 'latest-linux.yml'), 'utf8');
  const versao = require('../package.json').version.split('.').map(Number);
  const nova = `${versao[0]}.${versao[1]}.${versao[2] + 1}`;
  const falso = yml.replace(/^version: .*$/m, `version: ${nova}`);
  servidorAtualizacao = http.createServer((req, res) => {
    const nome = decodeURIComponent(req.url.split('?')[0].slice(1));
    if (nome === 'latest-linux.yml') { res.writeHead(200, { 'Content-Type': 'text/yaml' }); return res.end(falso); }
    const arq = path.join(dist, path.basename(nome));
    if (!fs.existsSync(arq)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Length': fs.statSync(arq).size });
    fs.createReadStream(arq).pipe(res);
  });
  await new Promise((r) => servidorAtualizacao.listen(0, '127.0.0.1', r));
  servidorAtualizacao.unref();
  process.env.RETRO_ATUALIZACAO_URL = `http://127.0.0.1:${servidorAtualizacao.address().port}/`;
  console.log('versão falsa:', nova);
}
// RETRO_SEM_BOAS_VINDAS=1: abre como se não fosse a primeira vez (sem a Ajuda e o balão).
if (process.env.RETRO_SEM_BOAS_VINDAS) {
  fs.mkdirSync(dados, { recursive: true });
  fs.writeFileSync(path.join(dados, 'config.json'), JSON.stringify({ primeiraVez: false }));
}
// Roteiro "unidades": um "pendrive" que é uma pasta comum (RETRO_UNIDADES_FALSAS), com arquivos.
if ((ROTEIRO === 'unidades' || ROTEIRO === 'antivirus') && !process.env.RETRO_UNIDADES_FALSAS) {
  const pen = path.join(tmp, 'pendrive');
  fs.mkdirSync(path.join(pen, 'Fotos'), { recursive: true });
  fs.mkdirSync(path.join(pen, 'System Volume Information'), { recursive: true });
  fs.writeFileSync(path.join(pen, 'Relatório.txt'), 'Um relatório trazido no pendrive.\n');
  fs.writeFileSync(path.join(pen, 'Planilha.csv'), 'a;b\n1;2\n');
  fs.writeFileSync(path.join(pen, 'Fotos', 'praia.txt'), 'x');
  process.env.RETRO_UNIDADES_FALSAS = pen;
}
// Arquivos de exemplo no disco.
fs.mkdirSync(path.join(disco, DOCS), { recursive: true });
fs.writeFileSync(path.join(disco, DOCS, 'Teste.md'), '# Título do teste\n\nUm parágrafo com **negrito** e acentuação: ação, coração, você.\n');

// RETRO_EXECUTAVEL=dist/linux-unpacked/retro-computer testa o aplicativo já empacotado.
const empacotado = process.env.RETRO_EXECUTAVEL ? path.resolve(process.env.RETRO_EXECUTAVEL) : null;
const app = await electron.launch({
  executablePath: empacotado || require('electron'),
  args: empacotado ? ['--no-sandbox'] : ['--no-sandbox', RAIZ],
  env: { ...process.env, RETRO_IDIOMA: IDIOMA, RETRO_DADOS: dados, RETRO_DISCO: disco, RETRO_JANELA: '1', RETRO_RAPIDO: process.env.RETRO_BOOT ? '' : '1' },
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
// Uma tecla do sistema como o processo principal a manda (sistema:tecla).
const tecla = (acao) => app.evaluate(({ BrowserWindow }, a) => BrowserWindow.getAllWindows().find((w) => w.isVisible()).webContents.send('sistema:tecla', a), acao);
const fecharTudo = () => pagina.evaluate(async () => { for (const j of window.__retro.janelas.lista.slice()) await j.fechar(true); });

/** Um .docx pequeno (o XML do Word, à mão): um título, parágrafos com negrito e itálico e uma tabela. */
async function docxSimples(arquivo) {
  const yazl = require('yazl');
  const zip = new yazl.ZipFile();
  const p = (txt, estilo) => `<w:p>${estilo ? `<w:pPr><w:pStyle w:val="${estilo}"/></w:pPr>` : ''}${txt}</w:p>`;
  const r = (txt, b, i) => `<w:r>${b || i ? `<w:rPr>${b ? '<w:b/>' : ''}${i ? '<w:i/>' : ''}</w:rPr>` : ''}<w:t xml:space="preserve">${txt}</w:t></w:r>`;
  const celula = (txt) => `<w:tc>${p(r(txt))}</w:tc>`;
  const corpo = [
    p(r('Relatório mensal'), 'Heading1'),
    p(r('Este documento resume as atividades do mês. ') + r('Todas as metas foram cumpridas', true) + r(', com ') + r('folga no prazo', false, true) + r('.')),
    p(r('O segundo parágrafo traz os números principais, organizados na tabela abaixo, e as observações da equipe sobre o andamento dos trabalhos.')),
    `<w:tbl>${[['Item', 'Previsto', 'Feito'], ['Relatórios', '12', '14'], ['Reuniões', '8', '7']].map((l) => `<w:tr>${l.map(celula).join('')}</w:tr>`).join('')}</w:tbl>`,
    p(r('Próximos passos', true)),
    p(r('Revisar o orçamento e preparar a apresentação de outubro.')),
  ].join('');
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${corpo}</w:body></w:document>`;
  const estilos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/></w:style></w:styles>`;
  const tipos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  const relsDoc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  zip.addBuffer(Buffer.from(tipos), '[Content_Types].xml');
  zip.addBuffer(Buffer.from(rels), '_rels/.rels');
  zip.addBuffer(Buffer.from(doc), 'word/document.xml');
  zip.addBuffer(Buffer.from(estilos), 'word/styles.xml');
  zip.addBuffer(Buffer.from(relsDoc), 'word/_rels/document.xml.rels');
  zip.end();
  await new Promise((ok, falha) => zip.outputStream.pipe(fs.createWriteStream(arquivo)).on('close', ok).on('error', falha));
}

/** Uma planilha .xlsx pequena (a primeira folha com textos e números). */
async function xlsxSimples(arquivo, folha, linhas) {
  const yazl = require('yazl');
  const zip = new yazl.ZipFile();
  const textos = [];
  const col = (k) => String.fromCharCode(65 + k);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const dados = linhas.map((l, i) => `<row r="${i + 1}">${l.map((v, k) => (typeof v === 'number'
    ? `<c r="${col(k)}${i + 1}"><v>${v}</v></c>`
    : `<c r="${col(k)}${i + 1}" t="s"><v>${textos.push(v) - 1}</v></c>`)).join('')}</row>`).join('');
  const ns = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
  zip.addBuffer(Buffer.from(`<workbook ${ns} xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(folha)}" sheetId="1" r:id="rId1"/></sheets></workbook>`), 'xl/workbook.xml');
  zip.addBuffer(Buffer.from('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'), 'xl/_rels/workbook.xml.rels');
  zip.addBuffer(Buffer.from(`<sst ${ns}>${textos.map((s) => `<si><t>${esc(s)}</t></si>`).join('')}</sst>`), 'xl/sharedStrings.xml');
  zip.addBuffer(Buffer.from(`<worksheet ${ns}><sheetData>${dados}</sheetData></worksheet>`), 'xl/worksheets/sheet1.xml');
  zip.end();
  await new Promise((ok, falha) => zip.outputStream.pipe(fs.createWriteStream(arquivo)).on('close', ok).on('error', falha));
}

/** Um PDF pequeno (escrito à mão, com a fonte Helvetica padrão): uma folha A4 por texto de "paginas". */
function pdfSimples(arquivo, paginas) {
  const objs = [];
  const n = paginas.length;
  // 1 catálogo, 2 páginas, 3 fonte, depois (página, conteúdo) para cada folha.
  objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objs[2] = `<< /Type /Pages /Count ${n} /Kids [${paginas.map((_, i) => `${4 + i * 2} 0 R`).join(' ')}] >>`;
  objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  const esc = (s) => s.replace(/[\\()]/g, (c) => '\\' + c);
  paginas.forEach((linhas, i) => {
    const txt = linhas.map((l, k) => `BT /F1 ${k === 0 ? 20 : 12} Tf 60 ${770 - k * 24 - (k ? 16 : 0)} Td (${esc(l)}) Tj ET`).join('\n');
    objs[4 + i * 2] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`;
    objs[5 + i * 2] = `<< /Length ${Buffer.byteLength(txt, 'latin1')} >>\nstream\n${txt}\nendstream`;
  });
  let saida = '%PDF-1.4\n';
  const pos = [];
  for (let k = 1; k < objs.length; k++) { pos[k] = Buffer.byteLength(saida, 'latin1'); saida += `${k} 0 obj\n${objs[k]}\nendobj\n`; }
  const xref = Buffer.byteLength(saida, 'latin1');
  saida += `xref\n0 ${objs.length}\n0000000000 65535 f \n` + pos.slice(1).map((p) => String(p).padStart(10, '0') + ' 00000 n \n').join('');
  saida += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  fs.writeFileSync(arquivo, Buffer.from(saida, 'latin1'));
}

async function esperarPronto(ms = 90000) {
  await pagina.waitForFunction(() => !document.querySelector('.corpo .carregando'), null, { timeout: ms });
  await pagina.waitForTimeout(1500);
}

const ROTEIROS = {
  async boot() {
    // Com RETRO_BOOT=1: a tela do BIOS e a abertura (capturadas logo no início).
  },
  // As várias telas (com RETRO_SISTEMA=1, RETRO_ENERGIA_FALSA=1 e RETRO_TELA_FALSA=2: o notebook e um
  // monitor pela HDMI): duplicar, estender ou uma só, com a pergunta de manter.
  async variasTelas() {
    await fecharTudo();
    await abrir('painel', { secao: 'aparencia' });
    await pagina.waitForTimeout(500);
    await pagina.locator('.janela.ativa .abas > *', { hasText: T('Configurações') }).click();
    await pagina.waitForTimeout(600);
    await foto('varias-telas');
    await pagina.selectOption('.janela.ativa select:has(option[value=duplicar])', 'duplicar');
    await pagina.locator('.janela.ativa button', { hasText: T('&Aplicar').replace('&', '') }).click();
    await pagina.waitForTimeout(1800);
    await foto('varias-telas-manter');
    await pagina.locator('.janela.dialogo.ativa button', { hasText: T('&Sim').replace('&', '') }).click();
    await pagina.waitForTimeout(400);
    console.log('telas:', JSON.stringify(await pagina.evaluate(() => Promise.all([retro.tela.telas().then((e) => e.arranjo), window.__retro.estado.config.tela]))));
  },

  async resolucao() {
    // A área da tela (com RETRO_SISTEMA=1, RETRO_ENERGIA_FALSA=1 e RETRO_TELA_FALSA=1) e a aba Efeitos.
    await fecharTudo();
    await abrir('painel', { secao: 'aparencia' });
    await pagina.waitForTimeout(500);
    await pagina.locator('.janela.ativa .abas > *', { hasText: T('Efeitos') }).click();
    await pagina.waitForTimeout(200);
    await foto('aparencia-efeitos');
    await pagina.locator('.janela.ativa .abas > *', { hasText: T('Configurações') }).click();
    await pagina.waitForTimeout(400);
    await pagina.locator('.janela.ativa .deslizante').focus();
    await pagina.keyboard.press('ArrowLeft');
    await pagina.waitForTimeout(200);
    await foto('area-da-tela');
    await pagina.locator('.janela.ativa button', { hasText: T('&Aplicar').replace('&', '') }).click();
    await pagina.waitForTimeout(1200);
    await foto('manter-resolucao');
    await pagina.locator('.janela.dialogo.ativa button', { hasText: T('&Sim').replace('&', '') }).click();
    await pagina.waitForTimeout(400);
    console.log('resolução guardada:', JSON.stringify(await pagina.evaluate(() => window.__retro.estado.config.tela)));
  },
  async encaixe() {
    // Os cantos magnéticos, a tecla do logotipo com as setas, o Alt+Tab, o Alt+F4 e o Ctrl+roda.
    await fecharTudo();
    const estado = () => pagina.evaluate(() => window.__retro.janelas.lista.map((j) => ({ t: j.titulo, enc: j.encaixe, max: j.maximizada, ativa: j.el.classList.contains('ativa'), ret: { ...j.ret } })));
    await abrir('bloco');
    await pagina.waitForTimeout(300);
    await abrir('explorador', { pasta: DOCS });
    await pagina.waitForTimeout(600);
    const titulo = pagina.locator('.janela.ativa .titulo .texto');
    let b = await titulo.boundingBox();
    await pagina.mouse.move(b.x + 20, b.y + 6);
    await pagina.mouse.down();
    await pagina.mouse.move(300, 300, { steps: 5 });
    await pagina.mouse.move(1, 300, { steps: 5 });
    await pagina.waitForTimeout(200);
    await foto('encaixe-previa-esquerda');
    await pagina.mouse.up();
    await pagina.waitForTimeout(300);
    // O Bloco de notas no canto de cima, à direita: um quarto da tela.
    await pagina.evaluate(() => window.__retro.janelas.lista.find((j) => j.el.classList.contains('bloco')).focar());
    b = await pagina.locator('.janela.ativa .titulo .texto').boundingBox();
    await pagina.mouse.move(b.x + 20, b.y + 6);
    await pagina.mouse.down();
    await pagina.mouse.move(700, 200, { steps: 5 });
    await pagina.mouse.move(1023, 2, { steps: 5 });
    await pagina.waitForTimeout(200);
    await foto('encaixe-previa-canto');
    await pagina.mouse.up();
    await pagina.waitForTimeout(300);
    console.log('depois de arrastar:', JSON.stringify(await estado()));
    // Logotipo+seta para baixo: do quarto de cima para a metade direita. (As teclas simuladas
    // não passam pelo before-input-event: a ação vai direto, como o processo principal a manda.)
    await tecla('encaixe:ArrowDown');
    await pagina.waitForTimeout(300);
    console.log('depois do logotipo+baixo:', JSON.stringify(await estado()));
    await foto('encaixe-lado-a-lado');
    // Alt+Tab: a caixa das janelas; soltar o Alt escolhe.
    await tecla('alternar');
    await pagina.waitForTimeout(250);
    await foto('alt-tab');
    console.log('alternador aberto?', await pagina.locator('.alternador').count());
    await tecla('alternar-fim');
    await pagina.waitForTimeout(300);
    console.log('depois do Alt+Tab:', JSON.stringify(await estado()), '| alternador:', await pagina.locator('.alternador').count());
    // Ctrl+roda no Bloco de notas: a letra em dobro.
    await pagina.locator('.janela.bloco textarea').click();
    const t = await pagina.locator('.janela.bloco textarea').boundingBox();
    await pagina.mouse.move(t.x + 40, t.y + 40);
    await pagina.keyboard.down('Control');
    await pagina.mouse.wheel(0, -120);
    await pagina.keyboard.up('Control');
    await pagina.keyboard.type('Texto ampliado com Ctrl+roda.');
    await pagina.waitForTimeout(300);
    console.log('fonte do Bloco:', await pagina.locator('.janela.bloco textarea').evaluate((el) => getComputedStyle(el).fontSize));
    await foto('ctrl-roda-bloco');
    // Alt+F4 fecha a janela da frente (o Bloco pergunta se salva: Não).
    const antes = (await estado()).length;
    await tecla('fechar-janela');
    await pagina.waitForTimeout(400);
    const nao = pagina.locator('.janela.dialogo button', { hasText: T('&Não').replace('&', '') });
    if (await nao.count()) await nao.first().click();
    await pagina.waitForTimeout(300);
    console.log('janelas antes e depois do Alt+F4:', antes, (await estado()).length);
  },
  async produtividade() {
    // O que veio das distribuições do Linux (com RETRO_BANDEJA_FALSA=1 e RETRO_FIREWALL_FALSO=1):
    // o histórico da área de transferência, a conta na busca, a luz noturna, o modo de energia,
    // o firewall e a aba de atalhos do Teclado.
    await fecharTudo();
    // Três textos copiados "em outro programa" (a área de transferência do computador).
    for (const t of ['Reunião às 14h com a equipe de vendas', 'https://github.com/EduChacon/Retro-Computer-for-Productivity', 'Lista de compras:\n- café\n- pão\n- queijo']) {
      await app.evaluate(({ clipboard }, x) => clipboard.writeText(x), t);
      await pagina.waitForTimeout(1300);
    }
    await abrir('bloco');
    await pagina.waitForTimeout(400);
    await pagina.locator('.janela.bloco textarea').click();
    await pagina.keyboard.type('Anotações: ');
    await tecla('area-transferencia');
    await pagina.waitForSelector('.historico-transf .ht-item', { timeout: 5000 });
    await pagina.keyboard.press('ArrowDown');
    await pagina.waitForTimeout(300);
    await foto('transferencia-historico');
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(600);
    console.log('colado no Bloco:', JSON.stringify(await pagina.locator('.janela.bloco textarea').inputValue()));
    await foto('transferencia-colado');
    // O "…" de um item: fixar e excluir.
    await tecla('area-transferencia');
    await pagina.waitForSelector('.historico-transf .ht-item');
    await pagina.locator('.historico-transf .ht-mais').first().dispatchEvent('mousedown');
    await pagina.waitForTimeout(300);
    await foto('transferencia-menu');
    await pagina.keyboard.press('Escape');
    await pagina.keyboard.press('Escape');
    await fecharTudo();
    const nao = pagina.locator('.janela.dialogo button', { hasText: T('&Não').replace('&', '') });
    if (await nao.count()) await nao.first().click();
    // A conta na caixa de busca: o resultado primeiro; Enter o copia.
    await pagina.locator('#busca-barra input').click();
    await pagina.keyboard.type('1280*0,15+√144');
    await pagina.waitForSelector('.busca-resultados', { timeout: 5000 });
    await pagina.waitForTimeout(400);
    await foto('busca-conta');
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(300);
    console.log('copiado da busca:', JSON.stringify(await app.evaluate(({ clipboard }) => clipboard.readText())));
    // A luz noturna: ligada o dia todo, na intensidade de 70.
    await abrir('painel', { secao: 'aparencia' });
    await pagina.waitForTimeout(500);
    await pagina.locator('.janela.ativa .abas > *', { hasText: T('Efeitos') }).click();
    await pagina.waitForTimeout(200);
    await pagina.locator('.janela.ativa fieldset >> nth=1').locator('input[type=checkbox]').check();
    await pagina.locator('.janela.ativa fieldset >> nth=1').locator('input[type=radio] >> nth=1').check();
    await pagina.locator('.janela.ativa fieldset >> nth=1').locator('.deslizante').focus();
    for (let i = 0; i < 4; i++) await pagina.keyboard.press('ArrowRight');
    await pagina.waitForTimeout(1800);
    await foto('luz-noturna-previa');
    await pagina.locator('.janela.ativa .acoes button.padrao').click();
    await pagina.waitForTimeout(1800);
    console.log('luz noturna:', JSON.stringify(await pagina.evaluate(() => [window.__retro.estado.config.luzNoturna, (document.getElementById('luz-noturna') || {}).style?.background])));
    await foto('luz-noturna-ligada');
    await pagina.evaluate(() => window.__retro.definirConfig({ luzNoturna: { ligada: false } }));
    await pagina.waitForTimeout(1800);
    // O modo de energia na caixa da bateria.
    await pagina.click('#bandeja img.bandeja-ico[src*="bateria"]');
    await pagina.waitForTimeout(600);
    await pagina.locator('.caixa-bandeja label', { hasText: T('Economia de energia') }).click();
    await pagina.waitForTimeout(300);
    console.log('modo de energia:', JSON.stringify(await pagina.evaluate(() => retro.bandeja.perfil())));
    await foto('bandeja-modo-energia');
    await pagina.keyboard.press('Escape');
    // O firewall: ligar pede a senha de administrador.
    await abrir('painel');
    await pagina.waitForTimeout(500);
    await foto('painel-com-firewall');
    await fecharTudo();
    await abrir('painel', { secao: 'firewall' });
    await pagina.waitForTimeout(500);
    await pagina.locator('.janela.ativa input[type=radio] >> nth=0').check();
    await foto('firewall');
    await pagina.locator('.janela.ativa .acoes button.padrao').click();
    await pagina.waitForSelector('.janela.dialogo input[type=password]', { timeout: 5000 });
    await pagina.keyboard.type('certa');
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(800);
    console.log('firewall:', JSON.stringify(await pagina.evaluate(() => retro.firewall.estado())));
    // A aba de atalhos do Teclado, com o histórico da área de transferência.
    await abrir('painel', { secao: 'teclado' });
    await pagina.waitForTimeout(500);
    await pagina.locator('.janela.ativa .abas > *', { hasText: T('Atalhos') }).click();
    await pagina.waitForTimeout(200);
    await foto('teclado-atalhos');
  },
  async caixas() {
    // Cada caixa do Painel de controle, aba a aba: o conteúdo cabe sem rolar? (sem fotos)
    for (const secao of ['aparencia', 'barra', 'teclado', 'mouse', 'seguranca', 'firewall', 'senhas', 'internet', 'sons', 'idioma', 'claude', 'disco', 'data', 'energia', 'acessibilidade', 'copia', 'impressoras', 'sobre']) {
      await fecharTudo();
      await abrir('painel', { secao });
      await pagina.waitForTimeout(1200);
      const n = await pagina.locator('.janela.ativa .abas > div').count();
      const r = [];
      for (let i = 0; i < Math.max(1, n); i++) {
        if (n) { await pagina.locator(`.janela.ativa .abas > div >> nth=${i}`).dispatchEvent('mousedown'); await pagina.waitForTimeout(300); }
        r.push(await pagina.evaluate(() => {
          const a = document.querySelector('.janela.ativa .painel-aba');
          const j = document.querySelector('.janela.ativa');
          return a ? `${a.scrollHeight > a.clientHeight + 1 ? 'ROLA' : 'ok'}(${a.scrollHeight}/${a.clientHeight}, ${j.offsetHeight})` : 'sem abas';
        }));
      }
      console.log('caixa', secao + ':', r.join(' '));
    }
  },
  async caracteres() {
    // O Mapa de caracteres: a lupa com o botão apertado, dois cliques para juntar e Copiar.
    await fecharTudo();
    await abrir('caracteres');
    await pagina.waitForSelector('.janela.caracteres .cm-c', { timeout: 5000 });
    for (const i of [0, 9, 13]) await pagina.locator(`.janela.caracteres .cm-c >> nth=${i}`).dblclick();
    await foto('caracteres');
    await pagina.locator('.janela.caracteres select >> nth=1').selectOption('1');
    await pagina.waitForTimeout(200);
    const c = await pagina.locator('.janela.caracteres .cm-c >> nth=41').boundingBox();
    await pagina.mouse.move(c.x + 10, c.y + 10);
    await pagina.mouse.down();
    await pagina.waitForTimeout(200);
    await foto('caracteres-lupa');
    await pagina.mouse.up();
    await pagina.mouse.click(c.x + 10, c.y + 10, { clickCount: 2 });
    await pagina.locator('.janela.caracteres button.padrao').click();
    await pagina.waitForTimeout(400);
    console.log('copiado:', JSON.stringify(await app.evaluate(({ clipboard }) => clipboard.readText())));
    await foto('caracteres-copiado');
  },
  async mouse() {
    // Painel › Mouse (com RETRO_MOUSE_FALSO=1: um mouse sem fio e o touchpad de um notebook).
    await fecharTudo();
    await abrir('painel', { secao: 'mouse' });
    await pagina.waitForSelector('.janela.ativa .mouse-teste', { timeout: 5000 });
    await pagina.locator('.janela.ativa input[type=radio] >> nth=1').check();
    await pagina.locator('.janela.ativa .mouse-teste').dblclick();
    await pagina.waitForTimeout(300);
    await foto('mouse-botoes');
    await pagina.locator('.janela.ativa .abas > *', { hasText: T('Movimento') }).click();
    await pagina.locator('.janela.ativa .deslizante').focus();
    for (let i = 0; i < 4; i++) await pagina.keyboard.press('ArrowRight');
    await pagina.waitForTimeout(200);
    await foto('mouse-movimento');
    await pagina.locator('.janela.ativa .abas > *', { hasText: T('Touchpad') }).click();
    await pagina.locator('.janela.ativa input[type=checkbox] >> nth=1').uncheck();
    await pagina.waitForTimeout(200);
    await foto('mouse-touchpad');
    await pagina.locator('.janela.ativa .acoes button.padrao').click();
    await pagina.waitForTimeout(600);
    console.log('mouse:', JSON.stringify(await pagina.evaluate(async () => (await retro.mouse.estado()).aparelhos.map((a) => [a.tipo, a.valores]))));
    console.log('config:', JSON.stringify(await pagina.evaluate(() => window.__retro.estado.config.mouse || (async () => null)())));
  },
  async seguranca() {
    // A Central de segurança (com RETRO_FIREWALL_FALSO=1 e RETRO_ATUALIZACOES_FALSAS=1) e o aviso do
    // site sem conexão segura (precisa de internet: o example.com tem HTTPS; o neverssl.com, não).
    await fecharTudo();
    await abrir('painel', { secao: 'seguranca' });
    await pagina.waitForFunction(() => ![...document.querySelectorAll('.seg-estado')].some((e) => !e.classList.contains('bom') && !e.classList.contains('ruim')), null, { timeout: 15000 }).catch(() => { });
    await pagina.waitForTimeout(300);
    await foto('seguranca-estado');
    await pagina.locator('.janela.ativa .abas > *', { hasText: T('Privacidade') }).click();
    await pagina.waitForTimeout(200);
    await foto('seguranca-privacidade');
    await fecharTudo();
    await abrir('navegador');
    await pagina.waitForTimeout(800);
    for (const [nome, url] of [['https-trocado', 'http://example.com/'], ['https-de-volta', 'http://http.badssl.com/'], ['https-sem-seguranca', 'http://neverssl.com/']]) {
      const campo = pagina.locator('.janela.ativa input.nav-endereco');
      await campo.fill(url);
      await campo.press('Enter');
      await pagina.waitForTimeout(15000);
      console.log(nome, '→', await pagina.evaluate(() => { const j = window.__retro.janelas.lista.find((x) => x.el.classList.contains('ativa')); const wv = j && j.el.querySelector('webview'); return [wv && !wv.hidden ? wv.getURL() : '(sem página)', (j.el.querySelector('.nav-erro-caixa b') || {}).textContent || '']; }));
      await foto(nome);
    }
  },
  async ajuda() {
    // Os tópicos da Ajuda, um por captura (o texto rolado até o fim mostra se cabe).
    await fecharTudo();
    for (const topico of ['inicio', 'pendrives', 'barra', 'internet', 'acessorios', 'painel', 'seguranca', 'linux', 'atalhos']) {
      await abrir('ajuda', { topico });
      await pagina.waitForTimeout(300);
      await foto('ajuda-' + topico);
    }
  },
  async claude() {
    await fecharTudo();
    await abrir('claude', { pasta: DOCS });
    await pagina.waitForTimeout(9000);
    await foto('claude');
    await pagina.evaluate(() => { const j = window.__retro.janelas.janelaAtiva(); if (j) j.maximizar(); });
    await pagina.waitForTimeout(2500);
    await foto('claude-maximizado');
  },
  async mesa() {
    // A área de trabalho padrão (sem o Prompt), o botão direito num programa do Iniciar e a aba
    // Área de trabalho de Painel › Aparência.
    await fecharTudo();
    await foto('mesa-padrao');
    await pagina.click('#iniciar');
    await pagina.waitForTimeout(300);
    await pagina.hover('.menu.iniciar .opcao >> nth=1'); // Programas (o primeiro é a Loja de programas)
    await pagina.waitForTimeout(700);
    await pagina.hover(`.menu .opcao:has-text("${T('Acessórios')}")`);
    await pagina.waitForTimeout(700);
    await pagina.click(`.menu .opcao:has-text("${T('Calculadora')}")`, { button: 'right' });
    await pagina.waitForTimeout(400);
    await foto('mesa-iniciar-contexto');
    await pagina.click(`.menu .opcao:has-text("${T('Adicionar à área de &trabalho')}")`);
    await pagina.waitForTimeout(800);
    await foto('mesa-com-calculadora');
    await abrir('painel', { secao: 'aparencia' });
    await pagina.waitForTimeout(500);
    await pagina.click(`.janela.ativa .abas > div:has-text("${T('Ícones')}")`);
    await pagina.waitForTimeout(300);
    await foto('mesa-aparencia');
    console.log('na mesa:', JSON.stringify(await pagina.evaluate(() => window.__retro.estado.config.mesa.atalhos)));
  },
  async copia() {
    // A cópia de segurança: o destino (a caixa de escolher pasta é a do sistema, por isso vem
    // pela configuração), a cópia na hora e o aviso do fim.
    const destino = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-destino-'));
    await fecharTudo();
    await pagina.evaluate((d) => window.__retro.definirConfig({ copia: { destino: d } }), destino);
    await abrir('painel', { secao: 'copia' });
    await pagina.waitForTimeout(600);
    await pagina.locator('.janela.ativa input[type=checkbox]').check();
    await foto('copia-antes');
    await pagina.click(`.janela.ativa button:has-text("${T('&Fazer a cópia agora')}")`);
    await pagina.waitForTimeout(2500);
    await foto('copia-pronta');
    console.log('na cópia:', JSON.stringify(fs.readdirSync(destino).map((p) => [p, fs.readdirSync(path.join(destino, p))])));
  },
  async diario() {
    // O Diário de trabalho: ligar, uma nota, um arquivo gravado e o dia aberto no Bloco de notas.
    await fecharTudo();
    await abrir('diario');
    await pagina.waitForSelector('.janela .diario-lista', { timeout: 5000 });
    await pagina.locator('.janela.ativa input[type=checkbox]').check();
    await pagina.waitForTimeout(300);
    await pagina.evaluate((d) => retro.disco.gravar(`${d}/Relatório da semana.txt`, new TextEncoder().encode('Pronto.\n')), DOCS);
    await pagina.waitForTimeout(1500);
    await pagina.click(`.janela.ativa button:has-text("${T('&Escrever uma nota…')}")`);
    await pagina.waitForSelector('.janela.dialogo input[type=text]');
    await pagina.keyboard.type('Reunião com a equipe: prazo do relatório na sexta.');
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(800);
    await foto('diario-janela');
    await pagina.click(`.janela.ativa button:has-text("${T('&Hoje')}")`);
    await pagina.waitForTimeout(1500);
    await foto('diario-hoje');
  },
  async pedirClaude() {
    // O "Pedir ao Claude" do botão direito (com RETRO_CLAUDE_FALSO: um script que mostra o
    // pedido recebido). O nome com aspas e $ mostra que o pedido chega inteiro, sem passar pelo shell.
    const nome = 'Contrato "final" $1.txt';
    fs.writeFileSync(path.join(disco, DOCS, nome), 'O contrato tem tres clausulas.\n');
    await fecharTudo();
    await abrir('explorador', { pasta: DOCS });
    await pagina.waitForTimeout(900);
    await pagina.click(`.janela.ativa .item:has-text("Contrato")`, { button: 'right' });
    await pagina.waitForTimeout(300);
    await pagina.hover(`.menu .opcao:has-text("${T('Pe&dir ao Claude')}")`);
    await pagina.waitForTimeout(500);
    await pagina.hover(`.menu .opcao:has-text("${T('&Traduzir')}")`);
    await pagina.waitForTimeout(500);
    await foto('pedir-claude-menu');
    await pagina.click(`.menu .opcao:has-text("${T('Re&sumir')}")`);
    await pagina.waitForTimeout(3500);
    await foto('pedir-claude-prompt');
    console.log('versões guardadas:', JSON.stringify(await pagina.evaluate((r) => retro.disco.versoes(r), `${DOCS}/${nome}`)));
  },
  async lixo() {
    const src =() => pagina.evaluate(() => [...document.querySelectorAll('#mesa .item')].find((e) => e.textContent.includes(T('Lixeira'))).querySelector('img').getAttribute('src'));
    console.log('antes:', await src());
    await pagina.evaluate(async (docs) => {
      await retro.disco.gravar(`${docs}/apagar.txt`, new TextEncoder().encode('x'));
      await retro.disco.paraLixeira(`${docs}/apagar.txt`);
    }, DOCS);
    await pagina.waitForTimeout(1500);
    console.log('depois de excluir:', await src());
    await pagina.evaluate(() => retro.disco.esvaziarLixeira());
    await pagina.waitForTimeout(1500);
    console.log('depois de esvaziar:', await src());
    await abrir('explorador', { pasta: DOCS });
    await pagina.waitForTimeout(400);
    await pagina.evaluate(() => { const j = window.__retro.janelas.janelaAtiva(); j.explorador.definirModo('detalhes'); });
    await pagina.waitForTimeout(400);
    await foto('detalhes');
  },
  async mais() {
    await fecharTudo();
    // Arquivos de exemplo e um item na Lixeira.
    await pagina.evaluate(async ([docs, mesa]) => {
      const enc = (t) => new TextEncoder().encode(t);
      await retro.disco.gravar(`${docs}/Ideias.txt`, enc('Ideias para o projeto\n\n- Escrever o capítulo 1\n- Revisar a ementa\n'));
      await retro.disco.gravar(`${docs}/Orçamento 2026.csv`, enc('item;valor\nlivros;120\n'));
      await retro.disco.criarPasta(docs, 'Projetos');
      await retro.disco.gravar(`${docs}/rascunho velho.txt`, enc('x'));
      await retro.disco.paraLixeira(`${docs}/rascunho velho.txt`);
      await retro.disco.gravar(`${mesa}/Lista de tarefas.txt`, enc('1. Comprar café'));
    }, [DOCS, MESA]);
    await pagina.evaluate(() => window.__retro.estado.config && true);
    await pagina.waitForTimeout(600);
    const ex = await abrir('explorador', { pasta: DOCS });
    await pagina.waitForTimeout(500);
    await pagina.evaluate(() => { const j = window.__retro.janelas.janelaAtiva(); j.explorador.definirModo('detalhes'); });
    await pagina.waitForTimeout(300);
    const item = pagina.locator('.janela.ativa .linha-item .item').nth(1);
    await item.click();
    await item.click({ button: 'right' });
    await pagina.waitForTimeout(300);
    await pagina.hover(`.menu .opcao:has-text("${T('&Enviar para')}")`);
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
    await abrir('bloco', { arquivo: `${DOCS}/Ideias.txt` });
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
    await abrir('craft:wordcraft', { arquivo: `${DOCS}/Teste.md` });
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
    const docs = () => fs.readdirSync(path.join(disco, DOCS)).join(', ');
    console.log('depois do 1º Salvar:', docs());
    // O segundo Ctrl+S grava direto (o arquivo já tem lugar) e guarda a versão anterior.
    await quadro.click({ position: { x: 600, y: 420 } });
    await pagina.keyboard.type(' Mais texto.');
    await pagina.keyboard.press('Control+s');
    await pagina.waitForTimeout(3000);
    const pv = path.join(disco, '.versoes', DOCS, 'Teste.docx');
    console.log('depois do 2º Salvar:', docs(), '| versões:', fs.existsSync(pv) ? fs.readdirSync(pv).join(', ') : '(nenhuma)');
    console.log('caixa aberta?', await pagina.locator('#camada-modal .janela').count());
    // Ctrl+O: a caixa Abrir do disco.
    await quadro.click({ position: { x: 600, y: 420 } });
    await pagina.keyboard.press('Control+o');
    await pagina.waitForSelector('#camada-modal .janela', { timeout: 15000 }).catch(() => console.log('sem caixa Abrir'));
    await pagina.waitForTimeout(800);
    await foto('wordcraft-abrir');
  },

  // Com RETRO_ZIP e RETRO_FALSA_VERSAO: a atualização ao abrir (perguntar, recusar) e a janela dos programas.
  async atualizar() {
    await fecharTudo();
    await pagina.evaluate(() => retro.config.definir({ atualizacoes: 'perguntar' }).then((c) => { window.__retro.estado.config = { ...window.__retro.estado.config, ...c }; }));
    await abrir('craft:wordcraft');
    await pagina.waitForSelector('#camada-modal .janela', { timeout: 20000 });
    await pagina.waitForTimeout(500);
    await foto('atualizar-pergunta');
    await pagina.click(`#camada-modal .janela button:has-text("${T('&Não')}")`);
    await esperarPronto();
    await foto('atualizar-recusado');
    await fecharTudo();
    await abrir('programas');
    await pagina.waitForTimeout(1500);
    await foto('atualizar-programas');
    // No modo automático, sem internet, a atualização falha e o programa abre na versão instalada.
    await fecharTudo();
    await pagina.evaluate(() => retro.config.definir({ atualizacoes: 'automatico' }).then((c) => { window.__retro.estado.config = { ...window.__retro.estado.config, ...c }; }));
    await abrir('craft:wordcraft');
    await pagina.waitForSelector('.aviso-balao', { timeout: 30000 }).catch(() => console.log('sem aviso de falha'));
    await pagina.waitForTimeout(300);
    await foto('atualizar-sem-internet');
  },

  // A troca de idioma e o Sobre (que procura a versão nova do próprio Retro Computer).
  async idioma() {
    await fecharTudo();
    await abrir('painel', { secao: 'idioma' });
    await pagina.waitForTimeout(600);
    await foto('idioma');
    await fecharTudo();
    await abrir('painel', { secao: 'sobre' });
    await pagina.waitForTimeout(4000);
    await foto('sobre');
  },

  // A Calculadora: as contas (conferidas aqui) e a janela.
  async calculadora() {
    await fecharTudo();
    const r = await pagina.evaluate(async () => {
      const { Conta } = await import('./js/apps/calculadora.js');
      // Cada passo: um dígito, '.', + - * /, '=', '%', 'r' (raiz), 'i' (1/x), 's' (±), 'MS', 'MR', 'M+'.
      const fazer = (passos) => {
        const c = new Conta();
        for (const p of passos.split(' ')) {
          if (/^[0-9]+$/.test(p)) for (const d of p) c.digito(d);
          else if (p === '.') c.virgula();
          else if ('+-*/'.includes(p)) c.operacao(p);
          else if (p === '=') c.igual();
          else if (p === '%') c.porcento();
          else if (p === 'r') c.raiz();
          else if (p === 'i') c.inverso();
          else if (p === 's') c.sinal();
          else if (p === 'MS') c.memoriaGuardar();
          else if (p === 'MR') c.memoriaLer();
          else if (p === 'M+') c.memoriaSomar();
        }
        return c.visor;
      };
      return {
        soma: fazer('0 . 1 + 0 . 2 ='),
        porcento: fazer('200 + 10 % ='),
        repetir: fazer('3 + 4 = ='),
        encadear: fazer('2 + 3 * 4 ='),
        zero: fazer('7 / 0 ='),
        raiz: fazer('2 r'),
        inverso: fazer('4 i'),
        sinal: fazer('5 s + 2 ='),
        memoria: fazer('9 MS 1 + MR ='),
        grande: fazer('99999999 * 99999999 * 99999999 ='),
      };
    });
    console.log('contas:', JSON.stringify(r));
    await abrir('calculadora');
    await pagina.waitForTimeout(300);
    await pagina.keyboard.type('125*4');
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(200);
    console.log('pelo teclado:', await pagina.textContent('.calc-visor'));
    await pagina.keyboard.type('+10%');
    await pagina.waitForTimeout(200);
    await foto('calculadora');
  },

  // O Navegador: a página inicial, uma página local (link, janela nova, download, link proibido) e o E-mail.
  async navegador() {
    const http = await import('node:http');
    const PAGINA = `<!doctype html><meta charset="utf-8"><title>Página de teste</title>
      <body style="font-family:sans-serif;padding:20px">
      <h1>Página de teste do Navegador</h1>
      <p><a id="link" href="/segunda">Ir para a segunda página</a></p>
      <p><a id="nova" href="/segunda" target="_blank">Abrir numa janela nova</a></p>
      <p><a id="baixar" href="/arquivo.txt" download>Baixar um arquivo</a></p>
      <p><a id="proibido" href="file:///etc/hostname">Um arquivo do computador (proibido)</a></p>
      <p><input id="campo" value="texto para editar"></p></body>`;
    const servidor = http.createServer((req, res) => {
      if (req.url === '/arquivo.txt') { res.writeHead(200, { 'Content-Type': 'text/plain', 'Content-Disposition': 'attachment; filename="baixado.txt"' }); return res.end('conteúdo baixado'); }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(req.url === '/segunda' ? '<!doctype html><meta charset="utf-8"><title>Segunda página</title><h1>Segunda página</h1>' : PAGINA);
    });
    await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
    servidor.unref(); // o servidor não segura o roteiro se algo falhar
    const base = `http://127.0.0.1:${servidor.address().port}`;
    await fecharTudo();
    await abrir('navegador');
    await pagina.waitForTimeout(600);
    await foto('navegador-inicio');
    // Digitar o endereço na barra.
    await pagina.fill('.janela.ativa .nav-endereco', base + '/');
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(2500);
    await foto('navegador-pagina');
    const wv = async (js) => pagina.evaluate(([c]) => document.querySelector('.janela.ativa webview').executeJavaScript(c), [js]);
    console.log('título:', await pagina.textContent('.janela.ativa .titulo .texto'));
    // Um clique de verdade (o Chromium não guarda no histórico a página anterior a um clique feito por código).
    const clicar = async (id) => {
      const r = await pagina.evaluate(() => { const b = document.querySelector('.janela.ativa webview').getBoundingClientRect(); return { x: b.left, y: b.top }; });
      const p = await wv(`(() => { const b = document.getElementById('${id}').getBoundingClientRect(); return { x: b.left + 10, y: b.top + b.height / 2 }; })()`);
      await pagina.mouse.click(r.x + p.x, r.y + p.y);
    };
    await clicar('link');
    await pagina.waitForTimeout(1500);
    console.log('depois do link:', await pagina.inputValue('.janela.ativa .nav-endereco'), '| voltar ativo:', !(await pagina.isDisabled('.janela.ativa .nav-botoes button >> nth=0')),
      '| canGoBack:', await pagina.evaluate(() => { const w = document.querySelector('.janela.ativa webview'); try { return [w.canGoBack(), w.getURL(), w.hidden]; } catch (e) { return String(e); } }));
    await pagina.click('.janela.ativa .nav-botoes button >> nth=0');
    await pagina.waitForTimeout(1500);
    console.log('depois de voltar:', await pagina.inputValue('.janela.ativa .nav-endereco'));
    const antes = await pagina.evaluate(() => document.querySelectorAll('.janela.navegador').length);
    await clicar('nova');
    await pagina.waitForTimeout(2500);
    console.log('janelas do Navegador:', antes, '→', await pagina.evaluate(() => document.querySelectorAll('.janela.navegador').length));
    await pagina.evaluate(() => { const j = window.__retro.janelas.lista.filter((x) => x.el.classList.contains('navegador')); j[j.length - 1].fechar(true); });
    await pagina.waitForTimeout(500);
    await clicar('proibido');
    await pagina.waitForTimeout(1200);
    console.log('depois do link proibido:', await wv('location.href'));
    await clicar('baixar');
    await pagina.waitForTimeout(2500);
    const recebidos = path.join(disco, DOCS, PASTAS[IDIOMA].recebidos);
    console.log('recebidos:', fs.existsSync(recebidos) ? fs.readdirSync(recebidos).join(', ') : '(nenhum)');
    await foto('navegador-baixado');
    // O agente da página não diz "Electron".
    console.log('agente:', await wv('navigator.userAgent'));
    console.log('node na página?', await wv('typeof require + "/" + typeof process'));
    // O menu do botão direito no campo de texto.
    const r = await pagina.evaluate(() => { const b = document.querySelector('.janela.ativa webview').getBoundingClientRect(); return { x: b.left, y: b.top }; });
    const campo = await wv("(() => { const b = document.getElementById('campo').getBoundingClientRect(); return { x: b.left + 20, y: b.top + 8 }; })()");
    await pagina.mouse.click(r.x + campo.x, r.y + campo.y, { button: 'right' });
    await pagina.waitForTimeout(800);
    await foto('navegador-menu');
    await pagina.keyboard.press('Escape');
    // Um site de verdade (se a rede deixar).
    await pagina.evaluate(() => { const w = document.querySelector('.janela.ativa webview'); window.__falhas = []; w.addEventListener('did-fail-load', (e) => window.__falhas.push([e.errorCode, e.errorDescription, e.validatedURL])); });
    // Um clique de verdade no campo (o foco do teclado sai da página).
    await pagina.click('.janela.ativa .nav-endereco');
    await pagina.keyboard.press('Control+a');
    await pagina.keyboard.type('example.com');
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(3000);
    console.log('example.com, depois de 3 s:', JSON.stringify(await pagina.evaluate(() => { const w = document.querySelector('.janela.ativa webview'); return { url: w.getURL(), carregando: w.isLoading(), falhas: window.__falhas, campo: document.querySelector('.janela.ativa .nav-endereco').value }; })));
    await pagina.waitForFunction(() => !document.querySelector('.janela.ativa').classList.contains('carregando-pagina'), null, { timeout: 20000 }).catch(() => console.log('example.com ainda carregando'));
    await pagina.waitForTimeout(1000);
    console.log('example.com:', await pagina.textContent('.janela.ativa .titulo .texto'), '|', await pagina.evaluate(() => !document.querySelector('.janela.ativa .nav-erro').hidden ? 'erro' : 'ok'));
    await foto('navegador-site');
    // O E-mail: a primeira vez pergunta qual.
    await fecharTudo();
    await pagina.evaluate(() => { window.__retro.abrir('correio'); }); // não espera: a caixa aguarda a escolha
    await pagina.waitForTimeout(700);
    await foto('correio-escolher');
    servidor.close();
  },

  // As permissões dos sites (com RETRO_MIDIA_FALSA=1: a câmera e o microfone de mentira do Chromium):
  // a câmera e o microfone, as notificações (que viram o balão) e o compartilhamento da tela.
  async permissoes() {
    const http = await import('node:http');
    const PAGINA = `<!doctype html><meta charset="utf-8"><title>Reunião de teste</title>
      <body style="font-family:sans-serif;padding:20px">
      <h1>Reunião de teste</h1>
      <p><button id="camera">Ligar a câmera e o microfone</button> <button id="aviso">Avisar</button> <button id="tela">Compartilhar a tela</button> <button id="login">Entrar com a conta</button></p>
      <video id="v" autoplay muted style="width:240px;height:160px;background:#000"></video>
      <pre id="saida"></pre>
      <script>
        const saida = (t) => { document.getElementById('saida').textContent += t + '\\n'; };
        document.getElementById('camera').onclick = () => navigator.mediaDevices.getUserMedia({ audio: true, video: true })
          .then((s) => { document.getElementById('v').srcObject = s; saida('câmera: ' + s.getTracks().map((x) => x.kind).join('+')); })
          .catch((e) => saida('câmera: ' + e.name));
        document.getElementById('aviso').onclick = () => Notification.requestPermission().then((p) => {
          saida('notificações: ' + p + ' / ' + Notification.permission);
          if (p === 'granted') new Notification('Reunião começando', { body: 'A reunião de teste começa em 5 minutos.' });
        });
        // O login numa janelinha (como o "Entrar com Google"): a resposta volta pelo window.opener.
        window.addEventListener('message', (e) => { if (e.data && e.data.login) saida('login: ' + e.data.login); });
        document.getElementById('login').onclick = () => window.open('/login', 'login', 'width=480,height=560');
        document.getElementById('tela').onclick = () => navigator.mediaDevices.getDisplayMedia({ video: true })
          .then((s) => { document.getElementById('v').srcObject = s; saida('tela: ' + s.getVideoTracks()[0].label); })
          .catch((e) => saida('tela: ' + e.name));
      </script></body>`;
    const LOGIN = `<!doctype html><meta charset="utf-8"><title>Entrar</title><body style="font-family:sans-serif;padding:20px">
      <h2>Entrar</h2><button id="entrar" onclick="window.opener.postMessage({ login: 'ok, com opener' }, '*'); window.close()">Entrar</button></body>`;
    const servidor = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(req.url === '/login' ? LOGIN : PAGINA);
    });
    await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
    servidor.unref();
    const base = `http://127.0.0.1:${servidor.address().port}`;
    await fecharTudo();
    await abrir('navegador', { url: base + '/' });
    await pagina.waitForTimeout(2500);
    const wvSel = '.janela.navegador webview';
    const wv = async (js) => pagina.evaluate(([c, s]) => document.querySelector(s).executeJavaScript(c), [js, wvSel]);
    const clicar = async (id) => {
      const r = await pagina.evaluate((s) => { const b = document.querySelector(s).getBoundingClientRect(); return { x: b.left, y: b.top }; }, wvSel);
      const p = await wv(`(() => { const b = document.getElementById('${id}').getBoundingClientRect(); return { x: b.left + 10, y: b.top + b.height / 2 }; })()`);
      await pagina.mouse.click(r.x + p.x, r.y + p.y);
    };
    // A câmera e o microfone: a pergunta; "Permitir" sem lembrar.
    await clicar('camera');
    await pagina.waitForSelector('.janela.dialogo .nav-lembrar', { timeout: 5000 });
    await pagina.waitForTimeout(300);
    await foto('permissao-camera');
    await pagina.click('.janela.dialogo .acoes button.padrao');
    await pagina.waitForTimeout(1500);
    // As notificações: "Permitir" e lembrar.
    await clicar('aviso');
    await pagina.waitForSelector('.janela.dialogo .nav-lembrar', { timeout: 5000 });
    await pagina.check('.janela.dialogo .nav-lembrar input');
    await foto('permissao-notificacoes');
    await pagina.click('.janela.dialogo .acoes button.padrao');
    await pagina.waitForSelector('.aviso-balao', { timeout: 5000 }).catch(() => console.log('sem balão da notificação'));
    await pagina.waitForTimeout(400);
    await foto('permissao-balao');
    console.log('balão:', await pagina.evaluate(() => (document.querySelector('.aviso-balao') || {}).textContent || '(nenhum)'));
    // A tela: a escolha, com as miniaturas.
    await clicar('tela');
    await pagina.waitForSelector('.janela.dialogo .nav-fontes-caixa', { timeout: 8000 }).catch(() => console.log('sem a caixa da tela'));
    await pagina.waitForTimeout(500);
    const primeira = pagina.locator('.janela.dialogo button.nav-fonte').first();
    if (await primeira.count()) await primeira.click();
    await foto('permissao-tela');
    // Sem nada para compartilhar (o xvfb às vezes não dá a tela), Cancelar.
    await pagina.click(`.janela.dialogo .acoes button${(await primeira.count()) ? '.padrao' : ':not(.padrao)'}`);
    await pagina.waitForTimeout(2000);
    await foto('permissao-compartilhando');
    // A janelinha do login: uma janela própria, ligada à página que a abriu.
    await clicar('login');
    let popup = null;
    for (let i = 0; i < 30 && !popup; i++) { await pagina.waitForTimeout(200); popup = app.windows().find((w) => w.url().endsWith('/login')); }
    if (popup) {
      await popup.waitForLoadState();
      await popup.screenshot({ path: path.join(SAIDA, 'permissao-login.png') });
      console.log('janelinha do login:', popup.url(), await popup.evaluate(() => [innerWidth, innerHeight, !!window.opener].join(' ')));
      await popup.click('#entrar');
      await pagina.waitForTimeout(800);
    } else console.log('a janelinha do login não abriu');
    console.log('página:', JSON.stringify(await wv("document.getElementById('saida').textContent")));
    const cfg = await pagina.evaluate(() => retro.config.obter());
    console.log('lembradas:', JSON.stringify((cfg.navegador || {}).permissoes || {}));
    // De novo na mesma sessão: nada é perguntado (a câmera desta vez, as notificações lembradas).
    await clicar('camera');
    await pagina.waitForTimeout(1200);
    console.log('perguntou de novo?', await pagina.evaluate(() => !!document.querySelector('.janela.dialogo .nav-lembrar')));
    // Esquecer, pelo Painel de controle › Internet.
    await pagina.evaluate(() => retro.navegador.esquecerPermissoes());
    console.log('depois de esquecer:', JSON.stringify(((await pagina.evaluate(() => retro.config.obter())).navegador || {}).permissoes || {}));
    await abrir('painel', { secao: 'internet' });
    await pagina.waitForTimeout(500);
    await foto('internet-permissoes');
    servidor.close();
  },

  // A bandeja (com RETRO_BANDEJA_FALSA=1: o volume, o brilho, a bateria e o Wi-Fi de mentira):
  // as caixinhas, conectar a uma rede protegida, as notificações e a data no relógio.
  // Os programas do Windows pelo WINE (com RETRO_WINE_FALSO=1, no Linux): o instalador abre com dois
  // cliques, e o programa instalado aparece em Iniciar › Programas › Programas do Windows.
  async wine() {
    const pasta = path.join(disco, DOCS, 'Recebidos');
    fs.mkdirSync(pasta, { recursive: true });
    fs.writeFileSync(path.join(pasta, 'instalar-agenda.exe'), Buffer.from('MZ'));
    await fecharTudo();
    await abrir('explorador', { pasta: `${DOCS}/Recebidos` });
    await pagina.waitForTimeout(900);
    await pagina.dblclick('.janela.ativa .item:has-text("instalar-agenda")');
    await pagina.waitForTimeout(1200);
    await foto('wine-instalador');
    await fecharTudo();
    await pagina.click('#iniciar');
    await pagina.waitForTimeout(300);
    // A primeira opção é a Loja de programas; a segunda, Programas.
    await pagina.hover('.menu.iniciar .opcao >> nth=1');
    await pagina.waitForTimeout(600);
    await pagina.hover(`.menu .opcao:has-text("${T('Programas do Windows')}")`);
    await pagina.waitForTimeout(900);
    await foto('wine-menu');
    await pagina.keyboard.press('Escape');
    await pagina.keyboard.press('Escape');
    await pagina.keyboard.press('Escape');
  },

  // O antivírus (com RETRO_ANTIVIRUS_FALSO=1: ele acha o arquivo de teste EICAR, escrito na hora) e a
  // caixa de formatar o pendrive (com RETRO_UNIDADES_FALSAS; a senha de teste é "certa").
  async antivirus() {
    const pasta = path.join(disco, DOCS, 'Recebidos');
    fs.mkdirSync(pasta, { recursive: true });
    const { EICAR } = require('../src/principal/antivirus.js');
    fs.writeFileSync(path.join(pasta, 'brinde.com'), EICAR);
    for (let i = 1; i <= 30; i++) fs.writeFileSync(path.join(pasta, `nota ${i}.txt`), 'texto ' + i);
    await fecharTudo();
    await abrir('explorador', { pasta: DOCS });
    await pagina.waitForTimeout(900);
    await pagina.click('.janela.ativa .item:has-text("Recebidos")', { button: 'right' });
    await pagina.waitForTimeout(300);
    await foto('antivirus-menu');
    await pagina.click(`.menu .opcao:has-text("${T('Verificar com o antivír&us')}")`);
    await pagina.waitForSelector('.janela.ativa .av-linha', { timeout: 20000 });
    await pagina.waitForTimeout(2500);
    await foto('antivirus-achou');
    await pagina.click('.janela.ativa .av-linha');
    await pagina.click(`.janela.ativa button:has-text("${T('Mandar para a Lixeira')}")`);
    await pagina.waitForTimeout(400);
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(800);
    await foto('antivirus-lixeira');
    console.log('na lixeira:', JSON.stringify(await pagina.evaluate(() => retro.disco.lixeira().then((l) => l.map((x) => x.nome)))));
    // O pendrive: Formatar….
    await abrir('explorador', { pasta: '::computador' });
    await pagina.waitForTimeout(900);
    await pagina.click('.janela.ativa .item:has-text("PENDRIVE")', { button: 'right' });
    await pagina.waitForTimeout(300);
    await foto('formatar-menu');
    await pagina.click(`.menu .opcao:has-text("${T('&Formatar…')}")`);
    await pagina.waitForTimeout(600);
    await foto('formatar');
    await pagina.click(`.janela.ativa button:has-text("${T('Iniciar')}")`);
    await pagina.waitForTimeout(400);
    await foto('formatar-aviso');
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(400);
    await pagina.keyboard.type('certa');
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(800);
    await foto('formatar-pronto');
  },

  // A acessibilidade (com RETRO_SISTEMA=1, RETRO_ENERGIA_FALSA=1 e RETRO_ACESSIBILIDADE_FALSA=1):
  // as abas, o alto contraste com o cursor grande, a lupa e o aviso visual de um som.
  async acessibilidade() {
    await fecharTudo();
    await abrir('painel', { secao: 'acessibilidade' });
    await pagina.waitForTimeout(900);
    await foto('acessibilidade-teclado');
    for (const [aba, nome] of [['Som', 'som'], ['Vídeo', 'video'], ['Mouse', 'mouse']]) {
      await pagina.click(`.janela.ativa .abas > div:has-text("${T(aba)}")`);
      await pagina.waitForTimeout(300);
      await foto('acessibilidade-' + nome);
    }
    await pagina.locator('.janela.ativa input[type=checkbox] >> nth=0').check(); // o cursor grande (aba Mouse)
    await pagina.click(`.janela.ativa .abas > div:has-text("${T('Vídeo')}")`);
    await pagina.locator('.janela.ativa input[type=checkbox] >> nth=0').check(); // o alto contraste
    await pagina.click(`.janela.ativa button:has-text("${T('OK')}")`);
    await pagina.waitForTimeout(500);
    await abrir('explorador', { pasta: DOCS });
    await pagina.waitForTimeout(900);
    await pagina.mouse.move(300, 200);
    await pagina.waitForTimeout(300);
    await foto('acessibilidade-contraste');
    console.log('classes:', await pagina.evaluate(() => document.documentElement.className));
    // A lupa em 200%, com o ponteiro sobre a janela.
    await tecla('lupa+');
    await tecla('lupa+');
    await pagina.waitForTimeout(200);
    await pagina.mouse.move(320, 140);
    await pagina.waitForTimeout(600);
    await foto('acessibilidade-lupa');
    await tecla('lupa-sair');
    await pagina.evaluate(() => import('./js/sistema.js').then((m) => m.definirConfig({ acessibilidade: { altoContraste: false, cursorGrande: false, avisoVisual: 'janela' } })));
    await pagina.waitForTimeout(300);
    // O aviso visual: a janela ativa pisca com o som do erro.
    await pagina.evaluate(() => import('./js/sons.js').then((m) => m.tocar('erro')));
    await pagina.waitForTimeout(120);
    await foto('acessibilidade-aviso');
    console.log('linux:', JSON.stringify(await pagina.evaluate(() => retro.acessibilidade.estado())));
  },

  // As opções de energia e a data e a hora do modo sistema (com RETRO_SISTEMA=1, RETRO_ENERGIA_FALSA=1
  // e RETRO_DATAHORA_FALSA=1; a senha de teste é "certa").
  async energia() {
    await fecharTudo();
    await abrir('painel', { secao: 'energia' });
    await pagina.waitForTimeout(900);
    await foto('energia');
    const selects = pagina.locator('.janela.ativa select');
    await selects.nth(3).selectOption('60');
    await selects.nth(4).selectOption('nada');
    await pagina.click(`.janela.ativa button:has-text("${T('OK')}")`);
    await pagina.waitForTimeout(500);
    await pagina.keyboard.type('certa');
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(700);
    console.log('energia:', JSON.stringify(await pagina.evaluate(() => retro.energia.estado())));
    await abrir('painel', { secao: 'data' });
    await pagina.waitForTimeout(1200);
    await foto('data-hora');
    await pagina.click(`.janela.ativa .abas > div:has-text("${T('Fuso horário')}")`);
    await pagina.waitForTimeout(500);
    await foto('data-fuso');
    await pagina.selectOption('.janela.ativa select[size]', 'Europe/Lisbon');
    await pagina.click(`.janela.ativa .abas > div:has-text("${T('Data e hora')}")`);
    await pagina.click('.janela.ativa input[type=checkbox] >> nth=0');
    await pagina.click(`.janela.ativa button:has-text("${T('OK')}")`);
    await pagina.waitForTimeout(500);
    await pagina.keyboard.type('certa');
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(700);
    console.log('data e hora:', JSON.stringify(await pagina.evaluate(() => retro.dataHora.estado().then((e) => ({ fuso: e.fuso, ntp: e.ntp })))));
  },

  // A saída de som e o microfone (com RETRO_SOM_FALSO=1 e RETRO_BANDEJA_FALSA=1): a aba Áudio
  // das Propriedades de Sons e a escolha da saída na caixa do volume.
  async som() {
    await fecharTudo();
    await abrir('painel', { secao: 'sons', aba: 'audio' });
    await pagina.waitForTimeout(900);
    await foto('som-audio');
    await pagina.selectOption('.janela.ativa fieldset >> nth=0 >> select', { index: 1 });
    await pagina.click(`.janela.ativa button:has-text("${T('OK')}")`);
    await pagina.waitForTimeout(500);
    console.log('saída padrão:', JSON.stringify(await pagina.evaluate(() => retro.som.estado().then((e) => e.saidas.find((x) => x.padrao).nome))));
    await pagina.click('#bandeja img.bandeja-ico[src*="som-"]');
    await pagina.waitForTimeout(700);
    await foto('som-bandeja');
    await pagina.keyboard.press('Escape');
  },

  async bandeja() {
    await fecharTudo();
    await pagina.waitForTimeout(800);
    // Os ícones pelo desenho (a ordem muda: o do Bluetooth aparece quando há Bluetooth).
    const ico = (n) => ['#bandeja img.bandeja-ico[src*="rede-"], #bandeja img.bandeja-ico[src*="sinal-"]', '#bandeja img.bandeja-ico[src*="som-"]', '#bandeja img.bandeja-ico[src*="bateria"]', '#bandeja .sino'][n];
    console.log('dicas:', JSON.stringify(await pagina.evaluate(() => [...document.querySelectorAll('#bandeja .bandeja-ico')].map((e) => [e.getAttribute('src') || e.querySelector('img').getAttribute('src'), e.dataset.dica, e.hidden]))));
    await pagina.click(ico(1));
    await pagina.waitForTimeout(300);
    await foto('bandeja-volume');
    // Arrastar o controle para baixo baixa o volume.
    const d = await pagina.locator('.caixa-bandeja .deslizante').boundingBox();
    await pagina.mouse.move(d.x + d.width / 2, d.y + 20);
    await pagina.mouse.down();
    await pagina.mouse.move(d.x + d.width / 2, d.y + d.height - 25, { steps: 5 });
    await pagina.mouse.up();
    await pagina.waitForTimeout(400);
    console.log('volume depois de arrastar:', JSON.stringify(await pagina.evaluate(() => retro.bandeja.volume())));
    await pagina.click(ico(2));
    await pagina.waitForTimeout(500);
    await foto('bandeja-bateria');
    await pagina.click(ico(0));
    await pagina.waitForSelector('.lista-redes .rede', { timeout: 5000 });
    await pagina.waitForTimeout(300);
    await pagina.click('.lista-redes .rede >> text=Escritório 5G');
    await foto('bandeja-rede');
    // Conectar: a senha errada é pedida de novo; a certa conecta.
    await pagina.click('.caixa-bandeja.rede .cxb-botoes button >> nth=0');
    await pagina.waitForSelector('.janela.dialogo input[type=password]', { timeout: 5000 });
    await pagina.fill('.janela.dialogo input[type=password]', 'errada');
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(600);
    await foto('bandeja-senha-errada');
    await pagina.fill('.janela.dialogo input[type=password]', 'senha123');
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(800);
    console.log('rede:', JSON.stringify(await pagina.evaluate(() => retro.bandeja.rede())));
    console.log('balão:', await pagina.evaluate(() => (document.querySelector('.aviso-balao') || {}).textContent || '(nenhum)'));
    // As notificações: mais duas, a data no relógio e o sino.
    await pagina.evaluate(() => window.__retro.abrir('painel', { secao: 'data' }));
    await pagina.waitForTimeout(400);
    await pagina.check('.janela.ativa fieldset input[type=checkbox]');
    await pagina.click('.janela.ativa .acoes button.padrao');
    await pagina.waitForTimeout(400);
    await foto('bandeja-sino-data');
    await pagina.click(ico(3));
    await pagina.waitForTimeout(300);
    await foto('bandeja-notificacoes');
    console.log('relógio:', await pagina.evaluate(() => document.querySelector('#bandeja .relogio').innerText.replace(/\n/g, ' | ')));
  },

  // A loja dos programas do Linux (com RETRO_LOJA_FALSA=1: o Flathub de verdade, o flatpak de mentira).
  async loja() {
    await fecharTudo();
    await abrir('programas', { aba: 'linux' });
    await pagina.waitForSelector('.janela.ativa .loja-item', { timeout: 30000 }).catch(() => console.log('a lista não carregou'));
    await pagina.waitForTimeout(2500);
    await foto('loja-mais-usados');
    console.log('itens:', await pagina.locator('.janela.ativa .loja-item').count());
    await pagina.fill('.janela.ativa .loja-topo input', 'libreoffice');
    await pagina.keyboard.press('Enter');
    await pagina.waitForSelector('.janela.ativa .loja-item.sel', { timeout: 20000 });
    await pagina.waitForSelector('.janela.ativa .ficha-dados', { timeout: 20000 }).catch(() => console.log('a ficha não carregou'));
    await pagina.waitForTimeout(2500);
    await foto('loja-ficha');
    console.log('ficha:', (await pagina.textContent('.janela.ativa .loja-ficha')).slice(0, 200));
    await pagina.click('.janela.ativa .loja-botoes button >> text=' + T('Instalar'));
    await pagina.waitForTimeout(900);
    await foto('loja-instalando');
    await pagina.waitForFunction(() => !document.querySelector('.janela.ativa .loja-botoes button[hidden]') === false, null, { timeout: 15000 }).catch(() => { });
    await pagina.waitForTimeout(2500);
    console.log('estado:', await pagina.textContent('.janela.ativa .loja-estado'));
    console.log('no menu:', JSON.stringify(await pagina.evaluate(() => (window.__retro.estado.config.nativos || {}).menu || [])));
    await pagina.selectOption('.janela.ativa .loja-topo select', ':instalados');
    await pagina.waitForTimeout(2500);
    await foto('loja-instalados');
    // A primeira aba continua a dos programas do Retro Computer.
    await pagina.click('.janela.ativa .abas > div >> nth=0');
    await pagina.waitForTimeout(500);
    await foto('loja-aba-retro');
  },

  // A barra de tarefas: a busca ao lado do Iniciar, os programas fixados e os dois jeitos dos botões.
  async fixados() {
    await fecharTudo();
    await abrir('bloco');
    await abrir('navegador');
    await abrir('navegador');
    await abrir('calculadora');
    await pagina.waitForTimeout(800);
    await foto('barra-nomes');
    // Fixar a calculadora pelo botão direito no botão dela.
    await pagina.click('#tarefas button >> nth=3', { button: 'right' });
    await pagina.waitForTimeout(300);
    await foto('barra-menu-fixar');
    await pagina.click('.menu .opcao >> text=' + T('Fixar na &barra de tarefas'));
    await pagina.waitForTimeout(300);
    console.log('fixados:', JSON.stringify(await pagina.evaluate(() => window.__retro.estado.config.barra.fixados)));
    // Só os ícones, agrupados por programa.
    await pagina.evaluate(() => retro.config.definir({ barra: { botoes: 'icones' } }).then(() => window.__retro.abrir('bloco')));
    await pagina.evaluate(async () => { const s = await import('./js/sistema.js'); await s.definirConfig({}); });
    await pagina.waitForTimeout(600);
    await foto('barra-icones');
    // Duas janelas do Navegador: o clique mostra a lista.
    await pagina.click('#tarefas button.prog.varias >> nth=0');
    await pagina.waitForTimeout(300);
    await foto('barra-icones-lista');
    await pagina.keyboard.press('Escape');
    const barra = await pagina.locator('#barra').boundingBox();
    console.log('botões:', await pagina.locator('#tarefas button.prog').count(), '| abertos:', await pagina.locator('#tarefas button.prog.aberto').count(), '| barra:', JSON.stringify(barra));
    await pagina.evaluate(() => retro.config.definir({ barra: { botoes: 'nomes' } }));
  },

  // O modo sistema (com RETRO_SISTEMA=1 e RETRO_ENERGIA_FALSA=1: a energia só é anotada, nunca desliga).
  async sistema() {
    if (!process.env.RETRO_ENERGIA_FALSA) throw new Error('rode com RETRO_ENERGIA_FALSA=1');
    await fecharTudo();
    console.log('modo sistema:', await pagina.evaluate(() => window.__retro.estado.config.modoSistema), '| tela cheia:', await pagina.evaluate(() => retro.sistema.telaCheia(false)));
    await abrir('painel', { secao: 'aparencia' });
    await pagina.waitForTimeout(400);
    await pagina.click('.janela.ativa .abas > div >> nth=2');
    await pagina.waitForTimeout(600);
    await foto('sistema-inicializacao');
    await fecharTudo();
    await abrir('desligar');
    await pagina.waitForTimeout(400);
    await foto('sistema-desligar');
    console.log('suspender:', JSON.stringify(await pagina.evaluate(() => retro.sistema.energia('suspender'))));
    await pagina.keyboard.press('Escape');
    await pagina.waitForTimeout(300);
    // As teclas: a do logotipo sozinha abre o Iniciar; as de volume e de brilho mostram o indicador.
    // (As teclas do Playwright não passam pelo before-input-event; as do sendInputEvent, sim, como as de verdade.)
    await app.evaluate(({ BrowserWindow }) => { const wc = BrowserWindow.getAllWindows()[0].webContents; wc.sendInputEvent({ type: 'keyDown', keyCode: 'Meta' }); wc.sendInputEvent({ type: 'keyUp', keyCode: 'Meta' }); });
    await pagina.waitForTimeout(500);
    console.log('Iniciar pela tecla do logotipo:', await pagina.evaluate(() => document.getElementById('iniciar').classList.contains('apertado')));
    await foto('sistema-tecla-logotipo');
    await pagina.keyboard.press('Escape');
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.send('sistema:tecla', 'volume+'));
    await pagina.waitForTimeout(500);
    console.log('indicador:', await pagina.evaluate(() => (document.querySelector('.indicador-bandeja:not([hidden])') || {}).textContent || '(nenhum)'));
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.send('sistema:tecla', 'brilho+'));
    await pagina.waitForTimeout(500);
    await foto('sistema-tecla-brilho');
    console.log('indicador:', await pagina.evaluate(() => (document.querySelector('.indicador-bandeja:not([hidden])') || {}).textContent || '(nenhum)'));
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.send('sistema:tecla', 'calculadora'));
    await pagina.waitForTimeout(500);
    console.log('calculadora aberta:', await pagina.evaluate(() => window.__retro.janelas.lista.some((j) => j.programa === 'calculadora')));
    await fecharTudo();
    await pagina.click('#bandeja .bandeja-ico >> nth=2');
    await pagina.waitForTimeout(500);
    await foto('sistema-bateria-mouse');
    await pagina.keyboard.press('Escape');
    await abrir('painel', { secao: 'teclado' });
    await pagina.waitForTimeout(600);
    await foto('sistema-teclado');
    await fecharTudo();
    // Reabre a caixa Desligar (as teclas a fecharam).
    await abrir('desligar');
    await pagina.waitForTimeout(400);
    await pagina.click('.janela.dialogo input[value=reiniciar]');
    await pagina.click('.janela.dialogo .acoes button.padrao');
    await pagina.waitForTimeout(1500);
    await foto('sistema-reiniciando');
    console.log('tela:', await pagina.evaluate(() => document.getElementById('boot').innerText));
  },

  // A tela de bloqueio: criar a senha no Painel, bloquear pelo Iniciar, errar e acertar.
  async bloqueio() {
    await fecharTudo();
    await abrir('painel', { secao: 'senhas' });
    await pagina.waitForTimeout(400);
    await foto('senhas-painel');
    await pagina.click('.janela.ativa fieldset button >> nth=0');
    await pagina.waitForSelector('.janela.dialogo input[type=password]');
    const campos = pagina.locator('.janela.dialogo input[type=password]');
    await campos.nth(0).fill('abcd1234');
    await campos.nth(1).fill('abcd1234');
    await foto('senhas-criar');
    await pagina.click('.janela.dialogo .acoes button.padrao');
    await pagina.waitForTimeout(1200);
    console.log('tem senha:', await pagina.evaluate(() => window.__retro.estado.config.bloqueio.temSenha), '| resumo na página?', await pagina.evaluate(() => JSON.stringify(window.__retro.estado.config.bloqueio)));
    await fecharTudo();
    await abrir('bloco');
    await pagina.waitForTimeout(300);
    await pagina.evaluate(() => import('./js/bloqueio.js').then((m) => m.bloquear()));
    await pagina.waitForSelector('#bloqueio input[type=password]');
    await pagina.waitForTimeout(300);
    await foto('bloqueio');
    // Nenhuma tecla passa para trás: Ctrl+Esc não abre o Iniciar.
    await pagina.keyboard.press('Control+Escape');
    await pagina.waitForTimeout(300);
    console.log('Iniciar aberto por trás?', await pagina.evaluate(() => document.getElementById('iniciar').classList.contains('apertado')));
    await pagina.keyboard.type('errada');
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(2200);
    await foto('bloqueio-errada');
    console.log('aviso:', await pagina.textContent('#bloqueio .bloq-aviso'));
    await pagina.keyboard.type('abcd1234');
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(1500);
    console.log('desbloqueado:', await pagina.evaluate(() => !document.getElementById('bloqueio')));
  },

  // Os pendrives: no Meu computador, abrir, trazer para o C:, levar do C:, Enviar para e remover.
  async unidades() {
    await fecharTudo();
    await abrir('explorador', { pasta: '::computador' });
    await pagina.waitForTimeout(900);
    await foto('unidades-meu-computador');
    await pagina.dblclick(`.janela.ativa .item:has-text("PENDRIVE")`);
    await pagina.waitForTimeout(900);
    await foto('unidades-pendrive');
    console.log('escondida a System Volume Information?', await pagina.evaluate(() => ![...document.querySelectorAll('.janela.ativa .item')].some((e) => e.textContent.includes('System Volume'))));
    await pagina.click(`.janela.ativa .item:has-text("Relatório")`, { button: 'right' });
    await pagina.waitForTimeout(300);
    await foto('unidades-menu-item');
    await pagina.click(`.menu .opcao:has-text("${T('Copiar para Meus &documentos')}")`);
    await pagina.waitForTimeout(1000);
    await foto('unidades-trazido');
    console.log('no disco C:?', fs.existsSync(path.join(disco, DOCS, 'Relatório.txt')), '| ainda no pendrive?', fs.existsSync(path.join(process.env.RETRO_UNIDADES_FALSAS, 'Relatório.txt')));
    // Levar do C: pelo Enviar para (no Teste.md de Meus documentos).
    await fecharTudo();
    await abrir('explorador', { pasta: DOCS });
    await pagina.waitForTimeout(900);
    await pagina.click(`.janela.ativa .item:has-text("Teste")`, { button: 'right' });
    await pagina.waitForTimeout(300);
    await pagina.hover(`.menu .opcao:has-text("${T('&Enviar para')}")`);
    await pagina.waitForTimeout(800);
    await foto('unidades-enviar-para');
    await pagina.click(`.menu .opcao:has-text("PENDRIVE")`);
    await pagina.waitForTimeout(1000);
    await foto('unidades-levado');
    console.log('no pendrive?', fs.existsSync(path.join(process.env.RETRO_UNIDADES_FALSAS, 'Teste.md')));
    // Abrir um arquivo do pendrive: vai para Recebidos e abre de lá.
    await fecharTudo();
    await abrir('explorador', { pasta: '::computador' });
    await pagina.waitForTimeout(700);
    await pagina.dblclick(`.janela.ativa .item:has-text("PENDRIVE")`);
    await pagina.waitForTimeout(800);
    await pagina.dblclick(`.janela.ativa .item:has-text("Planilha")`);
    await pagina.waitForTimeout(1500);
    await foto('unidades-aberto');
    // Remover com segurança.
    await fecharTudo();
    await abrir('explorador', { pasta: '::computador' });
    await pagina.waitForTimeout(700);
    await pagina.click(`.janela.ativa .item:has-text("PENDRIVE")`, { button: 'right' });
    await pagina.waitForTimeout(300);
    await foto('unidades-menu-remover');
    await pagina.click(`.menu .opcao:has-text("${T('Remover com &segurança')}")`);
    await pagina.waitForTimeout(5000);
    await foto('unidades-removido');
  },

  // As ferramentas: o Visualizador de imagens e o Reprodutor de mídia (os arquivos de exemplo
  // são feitos pelo ffmpeg, se houver).
  async ferramentas() {
    const pasta = path.join(disco, DOCS, 'Mídia');
    fs.mkdirSync(pasta, { recursive: true });
    const ff = (...a) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a], { stdio: 'inherit' });
    ff('-f', 'lavfi', '-i', 'testsrc2=size=1600x1200', '-frames:v', '1', path.join(pasta, 'foto 1.jpg'));
    ff('-f', 'lavfi', '-i', 'mandelbrot=size=900x600', '-frames:v', '1', path.join(pasta, 'foto 2.png'));
    ff('-f', 'lavfi', '-i', 'testsrc=size=16x16', '-frames:v', '1', path.join(pasta, 'icone.png'));
    ff('-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=25', '-f', 'lavfi', '-i', 'sine=frequency=440', '-t', '6', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', path.join(pasta, 'filme.mp4'));
    fs.writeFileSync(path.join(pasta, 'filme.srt'), '1\n00:00:00,000 --> 00:00:05,000\nUma legenda de teste: ação!\n');
    ff('-f', 'lavfi', '-i', 'sine=frequency=330:duration=20', '-f', 'lavfi', '-i', 'anoisesrc=d=20:a=0.2', '-filter_complex', 'amix=inputs=2', '-c:a', 'libmp3lame', path.join(pasta, 'música.mp3'));
    await fecharTudo();
    const abrirArq = (rel) => pagina.evaluate((r) => import('./js/sistema.js').then((m) => m.abrirArquivo(r)), rel);
    await abrirArq(`${DOCS}/Mídia/foto 1.jpg`);
    await pagina.waitForTimeout(1500);
    await foto('imagens-ajustada');
    await pagina.keyboard.press('ArrowRight');
    await pagina.waitForTimeout(1200);
    await foto('imagens-proxima');
    await pagina.keyboard.press('ArrowRight');
    await pagina.waitForTimeout(800);
    for (let i = 0; i < 4; i++) await pagina.keyboard.press('+');
    await pagina.waitForTimeout(600);
    await foto('imagens-icone-ampliado');
    await pagina.keyboard.press('ArrowLeft');
    await pagina.waitForTimeout(900);
    await pagina.keyboard.press('Control+.');
    await pagina.waitForTimeout(600);
    await foto('imagens-girada');
    await pagina.click('.janela.ativa .menubar >> text=' + T('E&xibir'));
    await pagina.waitForTimeout(300);
    await foto('imagens-menu-exibir');
    await pagina.keyboard.press('Escape');
    await pagina.keyboard.press('Escape');
    await pagina.keyboard.press('F5');
    await pagina.waitForTimeout(1200);
    await foto('imagens-slides');
    await pagina.keyboard.press('Escape');
    await pagina.waitForTimeout(400);
    console.log('saiu dos slides?', await pagina.evaluate(() => !document.getElementById('apresentacao')));
    await fecharTudo();
    await abrirArq(`${DOCS}/Mídia/filme.mp4`);
    await pagina.waitForTimeout(2500);
    console.log('vídeo:', await pagina.evaluate(() => { const v = document.querySelector('.rep-video'); return { tocando: !v.paused, tempo: v.currentTime.toFixed(1), largura: v.videoWidth, legendas: v.textTracks.length, erro: v.error && v.error.code }; }));
    await foto('reprodutor-video');
    await pagina.keyboard.press('Alt+Enter');
    await pagina.mouse.move(500, 600);
    await pagina.waitForTimeout(800);
    await foto('reprodutor-tela-cheia');
    await pagina.keyboard.press('Escape');
    await pagina.waitForTimeout(300);
    await pagina.click('.janela.ativa .menubar >> text=' + T('Re&produzir'));
    await pagina.waitForTimeout(300);
    await foto('reprodutor-menu');
    await pagina.keyboard.press('Escape');
    await pagina.keyboard.press('Escape');
    await fecharTudo();
    await abrirArq(`${DOCS}/Mídia/música.mp3`);
    await pagina.waitForTimeout(3000);
    console.log('música:', await pagina.evaluate(() => { const v = document.querySelector('.rep-video'); return { tocando: !v.paused, tempo: v.currentTime.toFixed(1), erro: v.error && v.error.code }; }));
    await foto('reprodutor-musica');
  },

  // As pastas compactadas: Enviar para › Pasta compactada, ver por dentro, abrir um arquivo
  // (extrai antes) e Extrair tudo.
  async compactados() {
    const base = path.join(disco, DOCS, 'Projeto');
    fs.mkdirSync(path.join(base, 'Notas'), { recursive: true });
    fs.writeFileSync(path.join(base, 'Notas', 'ideia.txt'), 'Uma ideia guardada.\n');
    fs.writeFileSync(path.join(base, 'Leia isto.txt'), 'Leia isto primeiro.\n');
    fs.writeFileSync(path.join(base, 'dados.csv'), 'a;b\n1;2\n');
    await fecharTudo();
    await abrir('explorador', { pasta: DOCS });
    await pagina.waitForTimeout(900);
    await pagina.click(`.janela.ativa .item:has-text("Projeto")`, { button: 'right' });
    await pagina.waitForTimeout(300);
    await pagina.hover(`.menu .opcao:has-text("${T('&Enviar para')}")`);
    await pagina.waitForTimeout(800);
    await foto('compactados-enviar-para');
    await pagina.click(`.menu .opcao:has-text("${T('Pasta compactada (zip)')}")`);
    await pagina.waitForTimeout(1500);
    await foto('compactados-criada');
    console.log('zip criado?', fs.existsSync(path.join(disco, DOCS, 'Projeto.zip')));
    await pagina.dblclick(`.janela.ativa .item:has-text("Projeto.zip")`);
    await pagina.waitForTimeout(1200);
    await foto('compactados-por-dentro');
    await pagina.dblclick(`.janela.ativa .item:has-text("Projeto")`);
    await pagina.waitForTimeout(900);
    await foto('compactados-pasta-de-dentro');
    await pagina.dblclick(`.janela.ativa .item:has-text("Leia isto")`);
    await pagina.waitForTimeout(600);
    await foto('compactados-pergunta');
    await pagina.click(`.janela.dialogo button:has-text("${T('E&xtrair')}")`);
    await pagina.waitForTimeout(1500);
    await foto('compactados-aberto');
    console.log('extraído em "Projeto (2)", sem pasta a mais?', fs.existsSync(path.join(disco, DOCS, 'Projeto (2)', 'Leia isto.txt')));
    await fecharTudo();
    await abrir('explorador', { pasta: DOCS });
    await pagina.waitForTimeout(900);
    await pagina.click(`.janela.ativa .item:has-text("Projeto.zip")`, { button: 'right' });
    await pagina.waitForTimeout(300);
    await foto('compactados-menu-zip');
    await pagina.click(`.menu .opcao:has-text("${T('Extra&ir tudo…')}")`);
    await pagina.waitForTimeout(1500);
    await foto('compactados-extraido');
    console.log('pastas:', fs.readdirSync(path.join(disco, DOCS)).sort().join(' | '));
  },

  // A Captura de tela (a janela da frente, um pedaço e a tecla) e o Monitor do sistema.
  async capturaMonitor() {
    await fecharTudo();
    await abrir('bloco');
    await pagina.waitForTimeout(400);
    await pagina.keyboard.type('Uma janela para capturar.');
    await abrir('captura');
    await pagina.waitForTimeout(500);
    await foto('captura-vazia');
    await pagina.selectOption('.janela.captura select >> nth=0', 'janela');
    await pagina.click('.janela.captura .barra-ferramentas button >> nth=0');
    await pagina.waitForTimeout(1800);
    await foto('captura-janela');
    await pagina.selectOption('.janela.captura select >> nth=0', 'regiao');
    await pagina.click('.janela.captura .barra-ferramentas button >> nth=0');
    await pagina.waitForSelector('#captura-regiao', { timeout: 10000 });
    await pagina.mouse.move(60, 60);
    await pagina.mouse.down();
    await pagina.mouse.move(300, 200, { steps: 5 });
    await pagina.waitForTimeout(300);
    await foto('captura-escolhendo');
    await pagina.mouse.up();
    await pagina.waitForTimeout(1500);
    await foto('captura-pedaco');
    await pagina.evaluate(() => import('./js/apps/captura.js').then((m) => m.capturaRapida('tela')));
    await pagina.waitForTimeout(1500);
    await foto('captura-tecla');
    const pasta = path.join(disco, DOCS, T('Capturas de tela'));
    console.log('capturas guardadas:', fs.existsSync(pasta) ? fs.readdirSync(pasta).length : 0);
    // O Monitor pelo atalho (Ctrl+Shift+Esc chega pelo processo principal).
    await app.evaluate(({ BrowserWindow }) => {
      const wc = BrowserWindow.getAllWindows()[0].webContents;
      wc.sendInputEvent({ type: 'keyDown', keyCode: 'Escape', modifiers: ['control', 'shift'] });
      wc.sendInputEvent({ type: 'keyUp', keyCode: 'Escape', modifiers: ['control', 'shift'] });
    });
    await pagina.waitForSelector('.janela.monitor', { timeout: 10000 });
    await pagina.waitForTimeout(800);
    await foto('monitor-programas');
    await pagina.click('.janela.monitor .abas > div >> nth=1');
    await pagina.waitForTimeout(2500);
    await foto('monitor-processos');
    await pagina.click('.janela.monitor .abas > div >> nth=2');
    await pagina.waitForTimeout(6500);
    await foto('monitor-desempenho');
  },

  // Instalar um site como programa (um site local com manifesto e ícone).
  async webapps() {
    const icone = path.join(tmp, 'icone-site.png');
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc=size=192x192', '-frames:v', '1', icone]);
    const servidor = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://x');
      if (u.pathname === '/manifest.json') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ name: 'Anotações da Web', short_name: 'Anotações', start_url: '/?app=1', icons: [{ src: '/icone.png', sizes: '192x192', type: 'image/png' }] })); }
      if (u.pathname === '/icone.png') { res.setHeader('Content-Type', 'image/png'); return res.end(fs.readFileSync(icone)); }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end('<!doctype html><html><head><title>Anotações — página</title><link rel="manifest" href="/manifest.json"><link rel="icon" href="/favicon.ico"></head><body style="font-family:sans-serif;background:#ffe;padding:20px"><h1>Anotações</h1><p>Uma página de teste para instalar como programa.</p><p>' + u.search + '</p></body></html>');
    });
    await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
    const url = `http://127.0.0.1:${servidor.address().port}/notas`;
    await fecharTudo();
    await abrir('navegador', { url });
    await pagina.waitForTimeout(3500);
    await pagina.click('.janela.ativa .menubar >> text=' + T('&Arquivo'));
    await pagina.waitForTimeout(300);
    await foto('webapps-menu-arquivo');
    await pagina.click(`.menu .opcao:has-text("${T('Instalar como &programa…')}")`);
    await pagina.waitForSelector('.janela.dialogo input[type=text]', { timeout: 15000 });
    await pagina.waitForTimeout(500);
    await foto('webapps-instalar');
    await pagina.click('.janela.dialogo input[type=checkbox] >> nth=1');
    await pagina.click('.janela.dialogo button.padrao');
    await pagina.waitForTimeout(1200);
    const apps = await pagina.evaluate(() => window.__retro.estado.config.webapps.map((w) => ({ nome: w.nome, url: w.url, icone: !!w.icone })));
    console.log('instalados:', JSON.stringify(apps));
    await fecharTudo();
    await pagina.waitForTimeout(500);
    await foto('webapps-mesa-e-barra');
    await pagina.dblclick(`#mesa .item:has-text("Anotações")`);
    await pagina.waitForTimeout(3500);
    await foto('webapps-janela');
    await pagina.click('.janela.ativa .menubar >> text=' + T('&Página'));
    await pagina.waitForTimeout(300);
    await foto('webapps-menu-pagina');
    await pagina.keyboard.press('Escape');
    await pagina.keyboard.press('Escape');
    await pagina.click('#iniciar');
    await pagina.waitForTimeout(300);
    await pagina.hover('.menu.iniciar .opcao >> nth=1'); // Programas (o primeiro é a Loja de programas)
    await pagina.waitForTimeout(800);
    await foto('webapps-iniciar');
    await pagina.keyboard.press('Escape');
    await pagina.keyboard.press('Escape');
    await abrir('painel', { secao: 'internet' });
    await pagina.waitForTimeout(600);
    await pagina.click(`.janela.ativa .abas > div:has-text("${T('Programas da internet')}")`);
    await pagina.waitForTimeout(400);
    await foto('webapps-painel');
    servidor.close();
  },

  // O Explorador: a barra de pastas, o endereço em pedaços e as miniaturas das fotos.
  // O painel de visualização (Alt+P) com um .docx, um PDF, um texto e uma foto; o Acesso rápido.
  async visualizar() {
    const pasta = path.join(disco, DOCS, 'Trabalho');
    fs.mkdirSync(pasta, { recursive: true });
    await docxSimples(path.join(pasta, 'Relatório.docx'));
    pdfSimples(path.join(pasta, 'Contrato.pdf'), [
      ['Contrato de prestação de serviços', 'Cláusula 1. O contratado entrega o trabalho até o fim do mês.', 'Cláusula 2. O pagamento é feito em duas parcelas iguais.', 'Cláusula 3. As partes podem rever o prazo de comum acordo.'],
      ['Anexo', 'Cronograma e valores combinados.'],
    ]);
    await xlsxSimples(path.join(pasta, 'Orçamento.xlsx'), 'Outubro', [
      ['Item', 'Previsto', 'Gasto', 'Saldo'], ['Material', 1200, 980.5, 219.5], ['Transporte', 400, 455, -55], ['Serviços', 2500, 2100, 400], ['Total', 4100, 3535.5, 564.5],
    ]);
    fs.writeFileSync(path.join(pasta, 'Contatos.csv'), 'Nome;Telefone;Cidade\nAna;(11) 5555-0101;São Paulo\nBruno;(21) 5555-0202;"Rio de Janeiro"\n');
    fs.writeFileSync(path.join(pasta, 'Notas.txt'), 'Ideias para a reunião:\n\n- revisar o orçamento\n- marcar a apresentação\n- pedir os números ao financeiro\n');
    try { execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=800x600', '-frames:v', '1', path.join(pasta, 'Gráfico.png')]); } catch { }
    await fecharTudo();
    await pagina.evaluate(([docs]) => import('./js/sistema.js').then((m) => m.definirConfig({
      explorador: { modo: 'detalhes', arvore: true, visualizar: false },
      recentes: [docs + '/Trabalho/Contrato.pdf', docs + '/Trabalho/Relatório.docx', docs + '/Teste.md'],
    })), [DOCS]);
    await abrir('explorador', { pasta: `${DOCS}/Trabalho` });
    await pagina.waitForTimeout(600);
    await pagina.evaluate(() => { const j = window.__retro.janelas.janelaAtiva(); j.ret.w = 600; j.ret.h = 470; j.ret.x = 20; j.ret.y = 10; j.aplicarRet(); });
    await pagina.click('.janela.ativa .item:has-text("Relatório")');
    // Alt+P abre o painel (e alarga a janela estreita).
    await pagina.keyboard.press('Alt+p');
    await pagina.waitForTimeout(1500);
    await foto('visualizar-docx');
    await pagina.click('.janela.ativa .item:has-text("Contrato")');
    await pagina.waitForTimeout(2500);
    await foto('visualizar-pdf');
    await pagina.click('.janela.ativa .item:has-text("Orçamento")');
    await pagina.waitForTimeout(1200);
    await foto('visualizar-planilha');
    await pagina.click('.janela.ativa .item:has-text("Contatos")');
    await pagina.waitForTimeout(800);
    await foto('visualizar-csv');
    await pagina.click('.janela.ativa .item:has-text("Notas")');
    await pagina.waitForTimeout(800);
    await foto('visualizar-texto');
    if (fs.existsSync(path.join(pasta, 'Gráfico.png'))) {
      await pagina.click('.janela.ativa .item:has-text("Gráfico")');
      await pagina.waitForTimeout(800);
      await foto('visualizar-imagem');
    }
    // Fixar a pasta no Acesso rápido (botão direito em Meus documentos) e abrir o Acesso rápido.
    await pagina.click('.janela.ativa .barra-ferramentas button:has-text("' + T('Acima') + '")');
    await pagina.waitForTimeout(800);
    await pagina.click('.janela.ativa .lista-arquivos .item:has-text("Trabalho")', { button: 'right' });
    await pagina.waitForTimeout(300);
    await foto('acesso-fixar');
    await pagina.click(`.menu .opcao:has-text("${T('&Fixar no Acesso rápido')}")`);
    await pagina.waitForTimeout(600);
    await pagina.click(`.janela.ativa .arv-linha:has-text("${T('Acesso rápido')}")`);
    await pagina.waitForTimeout(1500);
    await foto('acesso-rapido');
    console.log('fixadas:', JSON.stringify(await pagina.evaluate(() => import('./js/acesso.js').then((m) => m.fixadas()))));
    await pagina.evaluate(() => import('./js/sistema.js').then((m) => m.definirConfig({ explorador: { modo: 'icones', visualizar: false } })));
  },

  async explorador() {
    const fotos = path.join(disco, DOCS, 'Fotos', 'Viagem');
    fs.mkdirSync(fotos, { recursive: true });
    const ff = (...a) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a]);
    ff('-f', 'lavfi', '-i', 'testsrc2=size=1600x1200', '-frames:v', '1', path.join(fotos, 'praia.jpg'));
    ff('-f', 'lavfi', '-i', 'mandelbrot=size=800x600', '-frames:v', '1', path.join(fotos, 'montanha.png'));
    ff('-f', 'lavfi', '-i', 'testsrc=size=600x800', '-frames:v', '1', path.join(fotos, 'retrato.jpg'));
    fs.writeFileSync(path.join(fotos, 'roteiro.txt'), 'Dia 1: praia.\n');
    await fecharTudo();
    await pagina.evaluate(() => import('./js/sistema.js').then((m) => m.definirConfig({ explorador: { modo: 'miniaturas', arvore: true } })));
    await abrir('explorador', { pasta: `${DOCS}/Fotos/Viagem` });
    await pagina.waitForTimeout(400);
    await pagina.evaluate(() => { const j = window.__retro.janelas.janelaAtiva(); j.ret.w = 700; j.ret.h = 460; j.aplicarRet(); });
    await pagina.waitForTimeout(2500);
    await foto('explorador-miniaturas');
    await pagina.click(`.janela.ativa .migalha:has-text("${DOCS}")`);
    await pagina.waitForTimeout(1200);
    await foto('explorador-migalha');
    const caixa = await pagina.locator('.janela.ativa .migalhas').boundingBox();
    await pagina.mouse.click(caixa.x + caixa.width - 12, caixa.y + caixa.height / 2);
    await pagina.waitForTimeout(300);
    await foto('explorador-endereco-texto');
    await pagina.keyboard.press('Escape');
    await pagina.click(`.janela.ativa .arv-linha:has-text("${T('Lixeira')}")`);
    await pagina.waitForTimeout(800);
    await foto('explorador-arvore-lixeira');
    await pagina.evaluate(() => import('./js/sistema.js').then((m) => m.definirConfig({ explorador: { modo: 'icones' } })));
  },

  // O Foco: o cronômetro (com voltas) e o temporizador.
  async focoAbas() {
    await fecharTudo();
    await abrir('foco', { aba: 1 });
    await pagina.waitForTimeout(400);
    await pagina.click('.janela.ativa .foco-painel:not(.oculto) button.padrao');
    await pagina.waitForTimeout(1300);
    await pagina.click(`.janela.ativa .foco-painel:not(.oculto) button:has-text("${T('Volta')}")`);
    await pagina.waitForTimeout(900);
    await pagina.click(`.janela.ativa .foco-painel:not(.oculto) button:has-text("${T('Volta')}")`);
    await pagina.waitForTimeout(300);
    await foto('foco-cronometro');
    await pagina.click('.janela.ativa .abas > div >> nth=2');
    await pagina.waitForTimeout(300);
    await pagina.click(`.janela.ativa .foco-rapidos button >> nth=0`);
    await pagina.waitForTimeout(1500);
    await foto('foco-temporizador');
    // O modo foco completo: com o foco correndo, o sino silencia e os jogos esperam a pausa.
    await pagina.click('.janela.ativa .abas > div >> nth=0');
    await pagina.locator('.janela.ativa .foco-painel:not(.oculto) fieldset >> nth=1').locator('input >> nth=1').check();
    await pagina.click('.janela.ativa .foco-painel:not(.oculto) button.padrao');
    await pagina.waitForTimeout(600);
    await foto('foco-durante');
    await abrir('paciencia');
    await pagina.waitForTimeout(500);
    console.log('jogo aberto no foco:', await pagina.locator('.janela.paciencia, .janela[data-app=paciencia]').count(), 'sino:', await pagina.evaluate(() => [document.querySelector('.nao-perturbe') ? 'silencioso' : 'normal', window.__retro.estado.emFoco]));
    await foto('foco-sem-jogos');
    await pagina.click(`.janela.ativa .foco-painel:not(.oculto) button:has-text("${T('Pausar')}")`).catch(() => { });
  },

  // As impressoras (com RETRO_IMPRESSORAS_FALSAS=1): a lista, a padrão, a fila e imprimir do Bloco.
  async impressoras() {
    await fecharTudo();
    await abrir('painel', { secao: 'impressoras' });
    await pagina.waitForTimeout(800);
    await foto('impressoras-painel');
    await pagina.click('.janela.ativa .imp-item >> nth=1');
    await pagina.click(`.janela.ativa button:has-text("${T('Definir como padrão')}")`);
    await pagina.waitForTimeout(600);
    await foto('impressoras-padrao');
    await pagina.click('.janela.ativa .imp-item >> nth=0');
    await pagina.click(`.janela.ativa button:has-text("${T('Fila de impressão…')}")`);
    await pagina.waitForTimeout(700);
    await foto('impressoras-fila');
    await pagina.click(`.janela.ativa .imp-trabalho button`);
    await pagina.waitForTimeout(500);
    await foto('impressoras-fila-vazia');
    await fecharTudo();
    await abrir('bloco');
    await pagina.waitForTimeout(300);
    await pagina.keyboard.type('Um texto para imprimir.');
    await pagina.keyboard.press('Control+p');
    await pagina.waitForTimeout(800);
    console.log('impresso:', await app.evaluate(() => 'ok'));
  },

  // O Bluetooth (com RETRO_BLUETOOTH_FALSO=1): a bandeja, o Painel, procurar e parear um teclado.
  async bluetooth() {
    await fecharTudo();
    await pagina.waitForSelector('.bt-ico:not([hidden])', { timeout: 10000 });
    await pagina.click('.bt-ico');
    await pagina.waitForTimeout(700);
    await foto('bluetooth-bandeja');
    await pagina.click(`.caixa-bandeja.bluetooth a:has-text("${T('Adicionar aparelho…')}")`);
    await pagina.waitForTimeout(1500);
    await foto('bluetooth-procurado');
    await pagina.click('.janela.ativa .bt-item:has-text("8BitDo")');
    await pagina.click(`.janela.ativa button:has-text("${T('Parear')}")`);
    await pagina.waitForTimeout(700);
    await foto('bluetooth-codigo');
    await pagina.waitForTimeout(3000);
    await foto('bluetooth-pareado');
  },

  // As atualizações do Linux (com RETRO_ATUALIZACOES_FALSAS=1; a senha de teste é "certa").
  async atualizacoesLinux() {
    await fecharTudo();
    await abrir('atualizacoes');
    await pagina.waitForTimeout(800);
    await foto('atualizacoes-lista');
    await pagina.click(`.janela.ativa button:has-text("${T('Instalar as atualizações')}")`);
    await pagina.waitForSelector('.janela.dialogo input[type=password]');
    await pagina.keyboard.type('certa');
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(1200);
    await foto('atualizacoes-instaladas');
  },

  // Os programas do Linux na barra de tarefas (com RETRO_JANELAS_FALSAS=1).
  async firefox() {
    // O Firefox com o visual do Retro Computer (com RETRO_FIREFOX: o caminho de um Firefox, e no
    // modo sistema com o openbox): o ícone do Navegador o abre, e a barra o mostra como Navegador.
    // A tela inteira vem do X (import), porque o Firefox é outra janela.
    await fecharTudo();
    await abrir('navegador', { url: 'https://example.com/' });
    await pagina.waitForTimeout(15000);
    const tela = path.join(SAIDA, `${String(++n).padStart(2, '0')}-firefox-tela.png`);
    try { execFileSync('import', ['-window', 'root', tela]); console.log('captura:', tela); } catch (e) { console.log('sem o import:', e.message); }
    await foto('firefox-barra');
    console.log('na barra:', JSON.stringify(await pagina.evaluate(() => [...document.querySelectorAll('#tarefas button')].map((b) => b.title))));
  },
  async janelasLinux() {
    await fecharTudo();
    await abrir('bloco');
    await pagina.waitForTimeout(1500);
    await foto('janelas-linux-barra');
    await pagina.click('#tarefas button:has-text("Calculadora")');
    await pagina.waitForTimeout(800);
    await foto('janelas-linux-ativa');
    await pagina.click('#tarefas button:has-text("Calculadora")', { button: 'right' });
    await pagina.waitForTimeout(300);
    await foto('janelas-linux-menu');
    await pagina.keyboard.press('Escape');
    await pagina.evaluate(() => import('./js/sistema.js').then((m) => m.definirConfig({ barra: { botoes: 'icones' } })));
    await pagina.waitForTimeout(600);
    await foto('janelas-linux-icones');
    await pagina.evaluate(() => import('./js/sistema.js').then((m) => m.definirConfig({ barra: { botoes: 'nomes' } })));
  },

  // Os jogos: as regras (conferidas aqui) e as janelas.
  async jogos() {
    await fecharTudo();
    const regras = await pagina.evaluate(async () => {
      const { Campo } = await import('./js/apps/campominado.js');
      const { Jogo } = await import('./js/apps/paciencia.js');
      // Um sorteio fixo, para o teste se repetir.
      let s = 42;
      const fixo = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
      const c = new Campo(9, 9, 10, fixo);
      const primeira = c.abrir(40);
      const r = { minas: c.mina.reduce((a, b) => a + b, 0), primeiraSemMina: !c.mina[40] && c.vizinhosDe(40).every((v) => !c.mina[v]), abriuVarias: primeira.length > 1 };
      // Abrir todas as casas sem mina ganha o jogo.
      for (let i = 0; i < c.n; i++) if (!c.mina[i]) c.abrir(i);
      r.campoGanhou = c.fim;
      const c2 = new Campo(9, 9, 10, fixo);
      c2.abrir(0);
      const minada = [...c2.mina].indexOf(1);
      c2.marcar(minada);
      r.bandeiraProtege = c2.abrir(minada).length === 0;
      c2.marcar(minada);
      c2.abrir(minada);
      r.campoPerdeu = c2.fim;
      const j = new Jogo({ sorteio: fixo });
      r.colunas = j.colunas.map((p) => p.length).join(',');
      r.estoque = j.estoque.length;
      r.topoAberto = j.colunas.every((p) => p[p.length - 1].aberta);
      // Ás na pilha de cima; um 2 não vai para a pilha vazia.
      const as = { naipe: 1, valor: 1, aberta: true, id: 14 };
      const dois = { naipe: 1, valor: 2, aberta: true, id: 15 };
      r.asVai = j.podeNaFundacao(as, 0) && !j.podeNaFundacao(dois, 0);
      // Vermelho sobre preto, um a menos; só o Rei na coluna vazia.
      j.colunas[0] = [{ naipe: 0, valor: 8, aberta: true, id: 8 }];
      r.alternaCor = j.podeNaColuna({ naipe: 1, valor: 7 }, 0) && !j.podeNaColuna({ naipe: 3, valor: 7 }, 0) && !j.podeNaColuna({ naipe: 1, valor: 6 }, 0);
      j.colunas[1] = [];
      r.reiNaVazia = j.podeNaColuna({ naipe: 2, valor: 13 }, 1) && !j.podeNaColuna({ naipe: 2, valor: 12 }, 1);
      const antes = j.jogadas;
      j.comprar();
      r.desfazer = j.desfazer() && j.jogadas === antes;
      return r;
    });
    console.log('regras:', JSON.stringify(regras));
    await abrir('campo-minado');
    await pagina.waitForTimeout(400);
    const casa = pagina.locator('.janela.ativa .cm-c').nth(40);
    await casa.click();
    await pagina.locator('.janela.ativa .cm-c:not(.aberta)').first().click({ button: 'right' });
    await pagina.waitForTimeout(300);
    await foto('campo-minado');
    await fecharTudo();
    await abrir('paciencia');
    await pagina.waitForTimeout(500);
    await pagina.click('.janela.ativa .pac-vaga.estoque', { force: true });
    await pagina.waitForTimeout(400);
    await foto('paciencia');
    // Quase ganho: só falta o Rei de copas; arrastá-lo para a pilha dispara a cascata da vitória.
    await pagina.evaluate(() => {
      const p = window.__retro.abrir('paciencia');
      const jg = p.jogo;
      const todas = [];
      for (let n = 0; n < 4; n++) for (let v = 1; v <= 13; v++) todas.push({ id: n * 13 + v, naipe: n, valor: v, aberta: true });
      jg.fundacoes = [0, 1, 2, 3].map((n) => todas.filter((c) => c.naipe === n && !(n === 1 && c.valor === 13)));
      jg.colunas = [[todas[25]], [], [], [], [], [], []];
      jg.estoque = [];
      jg.descarte = [];
      p.desenhar(false);
    });
    await pagina.waitForTimeout(400);
    await foto('paciencia-quase');
    await pagina.locator('.janela.ativa .pac-carta[data-pilha="c0"]').dblclick();
    await pagina.waitForTimeout(2500);
    await foto('paciencia-vitoria');
    await fecharTudo();
    await abrir('breakout');
    await pagina.waitForTimeout(400);
    await pagina.keyboard.press('Space');
    await pagina.waitForTimeout(2500);
    await foto('breakout');
  },

  // O DOS: um .COM feito aqui (só escreve uma frase) aberto com dois cliques, os comandos digitados e
  // o arquivo criado no DOS de volta ao disco ao fechar a janela.
  async dos() {
    await fecharTudo();
    // mov dx,109h; mov ah,9; int 21h; int 20h; e a frase terminada em "$".
    const com = [0xba, 0x09, 0x01, 0xb4, 0x09, 0xcd, 0x21, 0xcd, 0x20, ...Buffer.from('Ola do Retro Computer!\r\n$', 'latin1')];
    await pagina.evaluate((b) => retro.disco.gravar('DOS/OLA.COM', new Uint8Array(b)), com);
    await abrir('explorador', { pasta: 'DOS' });
    await pagina.waitForTimeout(800);
    await pagina.locator('.janela.ativa .item', { hasText: 'OLA.COM' }).dblclick();
    await pagina.waitForFunction(() => { const a = document.querySelector('.janela.dos .dos-aviso'); return a && a.hidden; }, null, { timeout: 60000 });
    await pagina.waitForTimeout(2500);
    await foto('dos-programa');
    await pagina.locator('.janela.dos iframe.dos-quadro').click();
    // O ">" com o Shift apertado de verdade (o type do Playwright não aperta o Shift).
    await pagina.keyboard.type('echo teste', { delay: 40 });
    await pagina.keyboard.press('Shift+Period');
    await pagina.keyboard.type(' novo.txt', { delay: 40 });
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(600);
    await pagina.keyboard.type('dir', { delay: 40 });
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(1500);
    await foto('dos-dir');
    await pagina.evaluate(() => window.__retro.janelas.lista.find((j) => j.el.classList.contains('dos')).fechar());
    await pagina.waitForTimeout(2500);
    console.log('dos:', JSON.stringify(await pagina.evaluate(async () => ({
      novo: await retro.disco.existe('DOS/NOVO.TXT'),
      texto: await retro.disco.lerTexto('DOS/NOVO.TXT').catch(() => null),
      janela: window.__retro.janelas.lista.some((j) => j.el.classList.contains('dos')),
    }))));
    await fecharTudo();
    // Com RETRO_DOOM (o .zip do Doom shareware), o jogo de verdade: abre o DOOM.EXE e começa uma partida.
    if (process.env.RETRO_DOOM) {
      const destino = path.join(disco, 'DOS', 'DOOM');
      fs.mkdirSync(destino, { recursive: true });
      execFileSync('python3', ['-I', '-c', 'import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', process.env.RETRO_DOOM, destino]);
      await abrir('dos', { arquivo: 'DOS/DOOM/DOOM.EXE' });
      await pagina.waitForFunction(() => { const a = document.querySelector('.janela.dos .dos-aviso'); return a && a.hidden; }, null, { timeout: 60000 });
      await pagina.waitForTimeout(25000);
      await foto('dos-doom-titulo');
      await pagina.locator('.janela.dos iframe.dos-quadro').click();
      for (let i = 0; i < 4; i++) { await pagina.keyboard.press('Enter'); await pagina.waitForTimeout(1500); }
      await pagina.waitForTimeout(8000);
      await foto('dos-doom-jogo');
      await pagina.keyboard.down('ArrowUp');
      await pagina.waitForTimeout(2500);
      await pagina.keyboard.up('ArrowUp');
      await pagina.keyboard.down('ArrowLeft');
      await pagina.waitForTimeout(800);
      await pagina.keyboard.up('ArrowLeft');
      await pagina.waitForTimeout(1500);
      await foto('dos-doom-andando');
      await fecharTudo();
    }
  },

  // O menu Iniciar configurável: fixar pelo botão direito, esconder um item, a caixa de propriedades
  // (as duas abas), os ícones pequenos e o botão direito no próprio Iniciar.
  async iniciar() {
    await fecharTudo();
    await pagina.evaluate(() => window.__retro.definirConfig({ iniciar: null }));
    // O item pelo nome exato (com os fixados no alto, a posição do Programas muda).
    const sobre = async (texto) => (await pagina.evaluateHandle((t) => [...document.querySelectorAll('.menu .opcao')].find((o) => o.textContent.trim() === t), texto)).asElement().hover();
    const abrirAcessorios = async () => {
      await pagina.click('#iniciar');
      await pagina.waitForTimeout(300);
      await sobre(T('&Programas'));
      await pagina.waitForTimeout(700);
      await pagina.hover(`.menu .opcao:has-text("${T('Acessórios')}")`);
      await pagina.waitForTimeout(700);
    };
    for (const nome of ['Calculadora', 'Bloco de notas']) {
      await abrirAcessorios();
      await pagina.click(`.menu .opcao:has-text("${T(nome)}")`, { button: 'right' });
      await pagina.waitForTimeout(400);
      if (nome === 'Calculadora') await foto('iniciar-contexto');
      await pagina.click(`.menu .opcao:has-text("${T('Fixar no menu &Iniciar')}")`);
      await pagina.waitForTimeout(400);
      await pagina.keyboard.press('Escape');
      await pagina.mouse.click(600, 300);
    }
    // Esconde o Localizar pelo botão direito no próprio item.
    await pagina.click('#iniciar');
    await pagina.waitForTimeout(400);
    await pagina.click(`.menu.iniciar .opcao:has-text("${T('&Localizar')}")`, { button: 'right' });
    await pagina.waitForTimeout(300);
    await pagina.click(`.menu .opcao:has-text("${T('&Não mostrar no menu Iniciar')}")`);
    await pagina.waitForTimeout(300);
    await pagina.keyboard.press('Escape');
    await pagina.mouse.click(600, 300);
    await pagina.click('#iniciar');
    await pagina.waitForTimeout(500);
    await foto('iniciar-fixados');
    await pagina.keyboard.press('Escape');
    await pagina.mouse.click(600, 300);
    console.log('iniciar:', JSON.stringify(await pagina.evaluate(() => window.__retro.estado.config.iniciar)));
    // A caixa de propriedades, nas duas abas.
    await abrir('painel', { secao: 'barra', aba: 1 });
    await pagina.waitForTimeout(500);
    await pagina.locator('.janela.ativa .lp-linha >> nth=1').click();
    await pagina.waitForTimeout(200);
    await foto('iniciar-propriedades');
    await pagina.click(`.janela.ativa .abas div:has-text("${T('Barra de tarefas')}")`);
    await pagina.waitForTimeout(300);
    await foto('iniciar-propriedades-barra');
    await pagina.click(`.janela.ativa .abas div:has-text("${T('Menu Iniciar')}")`);
    await pagina.waitForTimeout(200);
    // Sobe o Bloco de notas e liga os ícones pequenos.
    await pagina.click(`.janela.ativa button:has-text("${T('Para &cima')}")`);
    await pagina.locator('.janela.ativa label', { hasText: T('Ícones pequenos no menu Iniciar') }).locator('input').check();
    await pagina.click(`.janela.ativa button:has-text("${T('OK')}")`);
    await pagina.waitForTimeout(400);
    await pagina.click('#iniciar');
    await pagina.waitForTimeout(500);
    await foto('iniciar-pequenos');
    await pagina.keyboard.press('Escape');
    await pagina.mouse.click(600, 300);
    // O botão direito no Iniciar.
    await pagina.click('#iniciar', { button: 'right' });
    await pagina.waitForTimeout(300);
    await foto('iniciar-botao-direito');
    await pagina.keyboard.press('Escape');
    console.log('iniciar depois:', JSON.stringify(await pagina.evaluate(() => window.__retro.estado.config.iniciar)));
    await pagina.evaluate(() => window.__retro.definirConfig({ iniciar: null }));
  },

  // As Damas e o Xadrez: os menus do Iniciar, a tomada obrigatória, a resposta do computador (o Worker),
  // as regras inglesas, a escolha da promoção, o xeque-mate, a partida guardada e as pretas embaixo.
  async tabuleiro() {
    await fecharTudo();
    await pagina.evaluate(() => window.__retro.definirConfig({ jogos: { damas: null, xadrez: null } }));
    await pagina.click('#iniciar');
    await pagina.waitForTimeout(300);
    await pagina.hover('.menu.iniciar .opcao >> nth=1'); // Programas (o primeiro é a Loja de programas)
    await pagina.waitForTimeout(700);
    await pagina.hover(`.menu .opcao:has-text("${T('Acessórios')}")`);
    await pagina.waitForTimeout(700);
    await pagina.hover(`.menu .opcao:has-text("${T('Jogos')}")`);
    await pagina.waitForTimeout(700);
    await foto('tabuleiro-iniciar');
    await pagina.keyboard.press('Escape');
    await pagina.mouse.click(5, 5);
    // Clica numa casa pelo nome ("e4"), com o tabuleiro na posição em que está.
    const casa = async (nome) => {
      const el = pagina.locator('.janela.ativa canvas.tab-canvas');
      const caixa = await el.boundingBox();
      const girado = await pagina.evaluate(() => window.__retro.janelas.janelaAtiva().el.querySelector('.tab-colunas span').textContent === 'h');
      let k = 'abcdefgh'.indexOf(nome[0]);
      let l = 8 - Number(nome[1]);
      if (girado) { k = 7 - k; l = 7 - l; }
      await pagina.mouse.click(caixa.x + (k + 0.5) * caixa.width / 8, caixa.y + (l + 0.5) * caixa.height / 8);
      await pagina.waitForTimeout(150);
    };
    const pensando = () => pagina.waitForFunction(() => !document.querySelector('.janela.ativa canvas.tab-canvas.pensando'), null, { timeout: 30000 }).then(() => pagina.waitForTimeout(300));

    // Damas (brasileiras, contra o computador): c3-d4, a resposta, e a tomada obrigatória marcada.
    await abrir('damas');
    await pagina.waitForTimeout(600);
    await casa('c3');
    await foto('damas-escolhida');
    await casa('d4');
    await pagina.waitForTimeout(300);
    await pensando();
    // Uma posição com tomada: as pretas avançam para ser tomadas.
    await pagina.evaluate(async () => {
      const a = await window.__retro.abrir('damas');
      const c = (s) => (8 - Number(s[1])) * 8 + 'abcdefgh'.indexOf(s[0]);
      a.ia.cancelar();
      a.criar();
      for (const [de, para] of [['c3', 'd4'], ['f6', 'e5']]) a.d.jogar({ de: c(de), caminho: [c(para)] });
      a.guardar();
      a.atualizar();
    });
    await pagina.waitForTimeout(300);
    await casa('a3');
    await foto('damas-obrigatoria');
    await casa('d4');
    await pagina.waitForTimeout(200);
    await foto('damas-tomada');
    await casa('f6');
    await pagina.waitForTimeout(300);
    await pensando();
    await foto('damas-resposta');
    console.log('damas:', JSON.stringify(await pagina.evaluate(async () => { const a = await window.__retro.abrir('damas'); return { lances: a.notacao(), worker: !a.ia.falhou, guardada: window.__retro.estado.config.jogos.damas.partida.lances.length }; })));
    // As regras inglesas: as pretas (o computador) começam, e a notação é pelos números das casas.
    await pagina.evaluate(async () => { const a = await window.__retro.abrir('damas'); await a.salvar({ regra: 'inglesas' }); await a.novo(true); });
    await pagina.waitForTimeout(600);
    await pensando();
    await casa('c3');
    await foto('damas-inglesas');
    await fecharTudo();

    // Xadrez entre duas pessoas: a abertura, os lances possíveis do cavalo e o xeque-mate do pastor.
    await pagina.evaluate(() => window.__retro.definirConfig({ jogos: { xadrez: { oponente: 'pessoas' } } }));
    await abrir('xadrez');
    await pagina.waitForTimeout(600);
    for (const c of ['e2', 'e4', 'e7', 'e5', 'f1', 'c4', 'b8', 'c6', 'd1', 'h5', 'g8']) await casa(c);
    await foto('xadrez-cavalo');
    await casa('f6');
    await casa('h5');
    await casa('f7');
    await pagina.waitForTimeout(500);
    await foto('xadrez-mate');
    // A promoção: o peão em a7, com a caixa da escolha.
    await pagina.evaluate(async () => {
      await window.__retro.definirConfig({ jogos: { xadrez: { partida: { fen: '1k6/P7/8/8/8/8/5PPP/6K1 w - - 0 40', lances: [] } } } });
      for (const j of window.__retro.janelas.lista.slice()) await j.fechar(true);
    });
    await abrir('xadrez');
    await pagina.waitForTimeout(500);
    await casa('a7');
    await casa('a8');
    await pagina.waitForTimeout(400);
    await foto('xadrez-promocao');
    await pagina.click(`.janela.ativa button.xz-promo:has-text("${T('Cavalo')}")`);
    await pagina.waitForTimeout(400);
    await foto('xadrez-promovido');
    // A partida guardada: fechar e abrir de novo traz a mesma posição.
    const antes = await pagina.evaluate(async () => (await window.__retro.abrir('xadrez')).x.fen());
    await fecharTudo();
    await abrir('xadrez');
    await pagina.waitForTimeout(500);
    const depois = await pagina.evaluate(async () => (await window.__retro.abrir('xadrez')).x.fen());
    console.log('partida guardada:', antes === depois, depois);
    await fecharTudo();
    // Contra o computador, com as pretas: o tabuleiro vira, e as brancas (o computador) começam.
    await pagina.evaluate(() => window.__retro.definirConfig({ jogos: { xadrez: { oponente: 'computador', cor: -1, nivel: 'dificil', partida: null } } }));
    await abrir('xadrez');
    await pagina.waitForTimeout(600);
    await pensando();
    await casa('e7');
    await casa('e5');
    await pagina.waitForTimeout(300);
    await pensando();
    await casa('b8');
    await foto('xadrez-pretas');
    console.log('xadrez:', JSON.stringify(await pagina.evaluate(async () => { const a = await window.__retro.abrir('xadrez'); return { lances: a.notacao(), worker: !a.ia.falhou, girado: a.tab.girado }; })));
    await fecharTudo();
  },

  // Os programas do computador principal: a janela, o atalho na área de trabalho e um de terminal no Prompt.
  async nativos() {
    await fecharTudo();
    await abrir('nativos');
    await pagina.waitForTimeout(2500);
    await foto('nativos');
    const nomes = await pagina.$$eval('.janela.ativa .item .rotulo', (els) => els.map((e) => e.textContent));
    console.log('programas:', nomes.join(' | '));
    const writer = pagina.locator('.janela.ativa .item', { hasText: 'Writer' }).first();
    if (await writer.count()) {
      await writer.click({ button: 'right' });
      await pagina.waitForTimeout(300);
      await pagina.click(`.menu .opcao:has-text("${T('Criar atalho na área de &trabalho')}")`);
      await pagina.waitForTimeout(1500);
      console.log('atalho na área de trabalho:', await pagina.locator('#mesa .item', { hasText: 'Writer' }).count());
    }
    const vim = pagina.locator('.janela.ativa .item', { hasText: 'Vim' }).first();
    if (await vim.count()) {
      await vim.dblclick();
      await pagina.waitForTimeout(3000);
      console.log('janela do Vim:', await pagina.textContent('.janela.ativa .titulo .texto'));
      await foto('nativos-vim');
    }
    await fecharTudo();
    await pagina.click('#iniciar');
    await pagina.waitForTimeout(300);
    await pagina.hover('.menu.iniciar .opcao >> nth=0');
    await pagina.waitForTimeout(700);
    await foto('nativos-mesa-e-menu');
    await pagina.keyboard.press('Escape');
    await pagina.keyboard.press('Escape');
  },

  // A atualização do próprio aplicativo (veja o servidor no começo do roteiro).
  async autoatualizar() {
    await fecharTudo();
    console.log('instalação:', JSON.stringify(await pagina.evaluate(() => retro.sistema.atualizacao.info())));
    const v = await pagina.evaluate(() => retro.sistema.atualizacao.verificar());
    console.log('verificar:', JSON.stringify(v));
    await abrir('painel', { secao: 'sobre' });
    await pagina.waitForTimeout(1500);
    await foto('autoatualizar-sobre');
    await pagina.click('.janela.ativa a:has-text("' + T('Atualizar agora') + '")');
    await pagina.waitForFunction(() => retro.sistema.atualizacao.info().then((i) => i.etapa === 'baixada' || i.etapa === 'erro'), null, { timeout: 120000 }).catch(() => { });
    await pagina.waitForTimeout(800);
    console.log('depois de baixar:', JSON.stringify(await pagina.evaluate(() => retro.sistema.atualizacao.info())));
    await foto('autoatualizar-pronta');
  },

  // O calendário do relógio e a caixa de busca da barra de tarefas.
  async barra() {
    await fecharTudo();
    await pagina.click('#bandeja .relogio');
    await pagina.waitForTimeout(400);
    console.log('calendário:', await pagina.textContent('.calendario .cal-titulo'), '| hoje:', await pagina.textContent('.calendario .cal-dia.hoje'));
    await foto('calendario');
    await pagina.keyboard.press('Escape');
    await pagina.click('#busca-barra input');
    await pagina.keyboard.type('calc');
    await pagina.waitForTimeout(900);
    console.log('busca "calc":', await pagina.$$eval('.busca-resultados .busca-item', (els) => els.map((e) => e.textContent).join(' | ')));
    await foto('busca');
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(600);
    console.log('Enter abriu:', await pagina.textContent('.janela.ativa .titulo .texto'));
    await pagina.click('#busca-barra input');
    await pagina.keyboard.type('Teste');
    await pagina.waitForTimeout(900);
    console.log('busca "Teste":', await pagina.$$eval('.busca-resultados .busca-item', (els) => els.map((e) => e.textContent).join(' | ')));
    await pagina.keyboard.press('Escape');
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
    await abrir('explorador', { pasta: DOCS });
    await pagina.waitForTimeout(400);
    await foto('pastas');
    await fecharTudo();
    await abrir('bloco', { arquivo: `${DOCS}/${LEIAME}` });
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
