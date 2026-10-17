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
import { execFileSync, spawn } from 'node:child_process';
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
// RETRO_BOOT=1: com a tela do BIOS e a abertura (desde a 1.1, a área de trabalho aparece direto).
if (process.env.RETRO_BOOT) {
  fs.mkdirSync(dados, { recursive: true });
  const arq = path.join(dados, 'config.json');
  const atual = fs.existsSync(arq) ? JSON.parse(fs.readFileSync(arq, 'utf8')) : {};
  fs.writeFileSync(arq, JSON.stringify({ ...atual, inicioRapido: false }));
}
// Roteiro "unidades": um "pendrive" que é uma pasta comum (RETRO_UNIDADES_FALSAS), com arquivos.
if (['unidades', 'antivirus', 'discos'].includes(ROTEIRO) && !process.env.RETRO_UNIDADES_FALSAS) {
  const pen = path.join(tmp, 'pendrive');
  fs.mkdirSync(path.join(pen, 'Fotos'), { recursive: true });
  fs.mkdirSync(path.join(pen, 'System Volume Information'), { recursive: true });
  fs.writeFileSync(path.join(pen, 'Relatório.txt'), 'Um relatório trazido no pendrive.\n');
  fs.writeFileSync(path.join(pen, 'Planilha.csv'), 'a;b\n1;2\n');
  fs.writeFileSync(path.join(pen, 'Fotos', 'praia.txt'), 'x');
  process.env.RETRO_UNIDADES_FALSAS = pen;
}
// Roteiro "computador": as pastas de um computador principal de mentira (RETRO_COMPUTADOR_FALSO).
if (ROTEIRO === 'computador' && !process.env.RETRO_COMPUTADOR_FALSO) {
  const casa = path.join(tmp, 'casa');
  for (const p of ['desktop', 'documents/Projetos', 'downloads', 'pictures', 'music', 'videos']) fs.mkdirSync(path.join(casa, p), { recursive: true });
  fs.writeFileSync(path.join(casa, 'documents', 'Contrato.txt'), 'O contrato do computador principal.\n');
  fs.writeFileSync(path.join(casa, 'documents', 'Orçamento.csv'), 'item;valor\nmesa;300\n');
  fs.writeFileSync(path.join(casa, 'downloads', 'Manual.txt'), 'x');
  process.env.RETRO_COMPUTADOR_FALSO = casa;
}
// Arquivos de exemplo no disco.
fs.mkdirSync(path.join(disco, DOCS), { recursive: true });
fs.writeFileSync(path.join(disco, DOCS, 'Teste.md'), '# Título do teste\n\nUm parágrafo com **negrito** e acentuação: ação, coração, você.\n');

// RETRO_EXECUTAVEL=dist/linux-unpacked/retro-computer testa o aplicativo já empacotado.
const empacotado = process.env.RETRO_EXECUTAVEL ? path.resolve(process.env.RETRO_EXECUTAVEL) : null;
// O roteiro "perfis" troca de usuário: o Retro Computer fecha (sem se abrir sozinho) e o roteiro o abre de novo.
if (ROTEIRO === 'perfis') process.env.RETRO_SEM_RELANCAR = '1';
// Os roteiros do teclado: o EUA internacional antes de abrir (a regra dos acentos é escolhida ao abrir).
if (ROTEIRO === 'acentos' || ROTEIRO === 'cedilha') {
  execFileSync('setxkbmap', ['-layout', 'us', '-variant', 'intl']);
  // O Xvfb não aplica a variante (o setxkbmap -query continua "us"): o Retro Computer finge o layout.
  if (!process.env.RETRO_TECLADO) process.env.RETRO_TECLADO = 'us:intl';
}
// O arrastar do sistema no Linux precisa de um idioma UTF-8 (sem ele, o Retro Computer fica com o de dentro).
if (ROTEIRO === 'arrastarReal' && !/utf-?8/i.test(process.env.LC_ALL || process.env.LC_CTYPE || process.env.LANG || '')) process.env.LANG = 'C.UTF-8';
const erros = [];
let app = null;
let pagina = null;
// RETRO_TEMA=mac: o botão Iniciar e a barra de menus da janela da frente viram o logotipo e os menus
// no alto da tela, o relógio fica na barra de menus e a busca é a lupa da Faixa de controle (o clique
// abre o campo), para os roteiros do PC rodarem no tema Mac sem mudar cada seletor.
let temaMacLigado = false;
const SELETORES_MAC = [['#iniciar', '#barra-mac .bm-logo'], ['.janela.ativa .menubar', '#barra-mac .bm-menus .menubar'], ['#bandeja .relogio', '#barra-mac .relogio'], ['#busca-barra input', '#busca-barra']];
function seletoresDoTema(p) {
  if (process.env.RETRO_TEMA !== 'mac') return;
  const trocar = (s) => (temaMacLigado && typeof s === 'string' ? SELETORES_MAC.reduce((x, [de, para]) => x.split(de).join(para), s) : s);
  for (const m of ['click', 'dblclick', 'hover', 'locator', 'waitForSelector', '$', '$$', '$eval', '$$eval', 'isVisible', 'dispatchEvent', 'fill', 'focus']) {
    const original = p[m].bind(p);
    p[m] = (s, ...resto) => original(trocar(s), ...resto);
  }
}
async function lancar(extra = {}) {
  app = await electron.launch({
    executablePath: empacotado || require('electron'),
    args: empacotado ? ['--no-sandbox'] : ['--no-sandbox', RAIZ],
    env: { ...process.env, RETRO_IDIOMA: IDIOMA, RETRO_DADOS: dados, RETRO_DISCO: disco, RETRO_JANELA: '1', RETRO_RAPIDO: process.env.RETRO_BOOT ? '' : '1', ...extra },
  });
  pagina = await app.firstWindow();
  seletoresDoTema(pagina);
  pagina.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') erros.push(`[${m.type()}] ${m.text()}`); });
  pagina.on('pageerror', (e) => erros.push(`[pageerror] ${e.message}\n${e.stack}`));
  // O console só diz "404"; o endereço ajuda a achar o recurso que falta.
  pagina.on('response', (r) => { if (r.status() >= 400) erros.push(`[resposta ${r.status()}] ${r.url()}`); });
  await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.setContentSize(1024, 700); });
}
/** Fecha o Retro Computer de vez (sem a caixa Desligar), para abrir de novo com a mesma pasta de dados. */
async function fecharApp() {
  const fechou = new Promise((r) => app.process().once('exit', r));
  await app.evaluate(({ app: a }) => { setTimeout(() => a.exit(0), 50); }).catch(() => { });
  await Promise.race([fechou, new Promise((r) => setTimeout(r, 15000))]);
}
/** Espera o Retro Computer fechar sozinho (a troca de usuário, o logoff) e o abre de novo. */
async function abrirDeNovo() {
  const fechou = new Promise((r) => app.process().once('exit', (codigo) => r(codigo)));
  const codigo = await Promise.race([fechou, new Promise((r) => setTimeout(() => r('não fechou'), 20000))]);
  console.log('fechou com o código', codigo);
  await lancar();
}
await lancar();
if (process.env.RETRO_BOOT) {
  await pagina.waitForSelector('#boot .bios', { timeout: 30000 });
  await pagina.waitForTimeout(700);
  await pagina.screenshot({ path: path.join(SAIDA, '00-bios.png') });
  await pagina.waitForSelector('#boot .abertura', { timeout: 30000 });
  await pagina.waitForTimeout(500);
  await pagina.screenshot({ path: path.join(SAIDA, '00-abertura.png') });
}
await pagina.waitForSelector('#iniciar', { timeout: 30000 });
// RETRO_TEMA=mac: qualquer roteiro no tema Mac clássico.
// (No tema Mac, a Faixa de controle começa recolhida: os roteiros a abrem, para achar a busca e a bandeja.)
if (process.env.RETRO_TEMA) await pagina.evaluate((tema) => window.__retro.definirConfig({ tema, ...(tema === 'mac' ? { barra: { faixaAberta: true } } : {}) }), process.env.RETRO_TEMA);
temaMacLigado = process.env.RETRO_TEMA === 'mac';
await pagina.waitForTimeout(800);

/** O mouse sobre o Programas do Iniciar aberto, pelo nome: a posição muda com os fixados e, no tema Mac, com o Sobre no alto. */
async function sobreProgramas() {
  await (await pagina.evaluateHandle((t) => [...document.querySelectorAll('.menu.iniciar .opcao')].find((o) => o.textContent.trim() === t), T('&Programas'))).asElement().hover();
}

let n = 0;
async function foto(nome) {
  n++;
  const arq = path.join(SAIDA, `${String(n).padStart(2, '0')}-${nome}.png`);
  await pagina.screenshot({ path: arq });
  console.log('captura:', arq);
  return arq;
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

/** Um PDF protegido (o dicionário Encrypt no trailer, como os extratos de banco com senha de dono). */
function pdfProtegido(arquivo) {
  const objs = [null, '<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Count 1 /Kids [3 0 R] >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] >>',
    '<< /Filter /Standard /V 1 /R 2 /O (aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa) /U (bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb) /P -4 >>'];
  let s = '%PDF-1.4\n';
  const pos = [];
  for (let k = 1; k < objs.length; k++) { pos[k] = s.length; s += `${k} 0 obj\n${objs[k]}\nendobj\n`; }
  const xref = s.length;
  s += `xref\n0 ${objs.length}\n0000000000 65535 f \n` + pos.slice(1).map((p) => String(p).padStart(10, '0') + ' 00000 n \n').join('');
  s += `trailer\n<< /Size ${objs.length} /Root 1 0 R /Encrypt 4 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  fs.writeFileSync(arquivo, Buffer.from(s, 'latin1'));
}

async function esperarPronto(ms = 90000) {
  await pagina.waitForFunction(() => !document.querySelector('.corpo .carga-programa'), null, { timeout: ms });
  await pagina.waitForTimeout(1500);
}

const ROTEIROS = {
  // Os vários usuários: o Painel › Usuários, o logoff, a tela de entrada, a área de trabalho de outro
  // usuário (com o disco C: dele) e a senha dele na tela de entrada.
  async perfis() {
    await fecharTudo();
    await abrir('painel', { secao: 'usuarios' });
    await pagina.waitForTimeout(500);
    await foto('usuarios');
    const novo = async (nome, fotografar) => {
      await pagina.locator('.janela.ativa button', { hasText: T('&Novo usuário…') }).click();
      await pagina.waitForTimeout(300);
      await pagina.keyboard.type(nome);
      if (fotografar) await foto('usuario-novo');
      await pagina.keyboard.press('Enter');
      await pagina.waitForTimeout(600);
      if (fotografar) await foto('usuario-criado');
      await pagina.keyboard.press('Enter');
      await pagina.waitForTimeout(300);
    };
    await novo('Ana', true);
    await novo('Bruno', false);
    await foto('usuarios-tres');
    // Um nome repetido não vale.
    await pagina.locator('.janela.ativa button', { hasText: T('&Novo usuário…') }).click();
    await pagina.waitForTimeout(300);
    await pagina.keyboard.type('ana');
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(500);
    await foto('usuario-repetido');
    await pagina.keyboard.press('Enter');
    await fecharTudo();
    // O logoff, pelo menu Iniciar.
    await pagina.click('#iniciar');
    await pagina.waitForTimeout(400);
    await foto('iniciar-logoff');
    await pagina.locator('.menu.iniciar .opcao', { hasText: T('Fazer l&ogoff de {nome}…').replace('{nome}', T('Principal')) }).click();
    await pagina.waitForTimeout(500);
    await foto('logoff-pergunta');
    await pagina.locator('.janela.dialogo.ativa button', { hasText: T('&Sim') }).click();
    await pagina.waitForTimeout(500);
    await foto('fazendo-logoff');
    await abrirDeNovo();
    await pagina.waitForSelector('#entrada .ent-usuario', { timeout: 30000 });
    await pagina.waitForTimeout(500);
    await foto('tela-de-entrada');
    // Entra a Ana: o Retro Computer abre de novo com ela.
    await pagina.locator('#entrada .ent-usuario', { hasText: 'Ana' }).click();
    await pagina.keyboard.press('Enter');
    await abrirDeNovo();
    await pagina.waitForSelector('#iniciar', { timeout: 30000 });
    await pagina.waitForTimeout(1500);
    await foto('ana-primeira-vez');
    console.log('disco da Ana:', await pagina.evaluate(() => retro.disco.raiz()));
    await fecharTudo();
    // O fundo dela é só dela.
    await pagina.evaluate(() => window.__retro.definirConfig({ papel: { cor: '#800040', padrao: 'nenhum' } }));
    await pagina.evaluate(async () => { const { aplicarFundo } = await import('./js/aparencia.js'); aplicarFundo(window.__retro.estado.config.papel); });
    // A senha dela (a da tela de bloqueio).
    console.log('senha da Ana:', JSON.stringify(await pagina.evaluate(() => retro.bloqueio.definir('', 'certa'))));
    await pagina.click('#iniciar');
    await pagina.waitForTimeout(400);
    await foto('iniciar-logoff-ana');
    await pagina.keyboard.press('Escape');
    // A troca de usuário pela caixa Desligar.
    await abrir('desligar');
    await pagina.waitForTimeout(400);
    await pagina.locator('.janela.dialogo.ativa input[value=logoff]').check();
    await foto('desligar-outro-usuario');
    await pagina.locator('.janela.dialogo.ativa button', { hasText: T('&Sim') }).click();
    await abrirDeNovo();
    await pagina.waitForSelector('#entrada .ent-usuario', { timeout: 30000 });
    await pagina.waitForTimeout(500);
    await foto('entrada-com-senha');
    await pagina.keyboard.type('errada');
    await pagina.keyboard.press('Enter');
    await pagina.waitForFunction(() => /\S/.test(document.querySelector('#entrada .bloq-aviso').textContent) && !document.querySelector('#entrada button.padrao').disabled, null, { timeout: 10000 });
    await foto('entrada-senha-errada');
    await pagina.keyboard.type('certa');
    await pagina.keyboard.press('Enter');
    await pagina.waitForSelector('#iniciar', { timeout: 30000 });
    await pagina.waitForTimeout(800);
    await foto('ana-de-volta');
    // O principal continua com o fundo e o disco de antes.
    console.log('perfis:', JSON.stringify(await pagina.evaluate(() => retro.perfis.estado())));
  },

  // As imagens dos READMEs que não saem de outro roteiro: o Xadrez no meio de uma partida (o
  // gambito italiano, com as peças tomadas à vista), contra o computador.
  // A auditoria de segurança (sem fotos): um "programa Craft" de mentira tenta (1) rodar um .svg com
  // script do disco, (2) abrir a página da área de trabalho dentro dele e (3) ler a pasta de dados
  // por programa://../. Nada disso pode dar certo.
  async auditoria() {
    fs.writeFileSync(path.join(disco, DOCS, 'teste.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><script>top.postMessage({ invadido: location.origin, ponte: typeof top.retro }, "*")</script></svg>');
    const prog = path.join(dados, 'programas', 'auditoria');
    fs.mkdirSync(prog, { recursive: true });
    fs.writeFileSync(path.join(prog, 'programa.json'), JSON.stringify({ id: 'auditoria', nome: 'Auditoria', versao: '1.0.0' }));
    const svg = `sistema://retro/disco/${encodeURIComponent(DOCS)}/teste.svg`;
    fs.writeFileSync(path.join(prog, 'index.html'), `<!doctype html><body><script>
      const a = document.createElement('iframe'); a.src = ${JSON.stringify(svg)}; document.body.append(a);
      const b = document.createElement('iframe'); b.src = 'sistema://retro/index.html'; document.body.append(b);
      fetch('programa://../config.json').then((r) => r.text()).then((x) => parent.postMessage({ leu: x.slice(0, 40) }, '*'), () => parent.postMessage({ leu: 'recusado' }, '*'));
    </script></body>`);
    const r = await pagina.evaluate(async () => {
      const msgs = [];
      window.addEventListener('message', (e) => msgs.push(e.data));
      const q = document.createElement('iframe');
      q.src = 'programa://auditoria/';
      document.body.append(q);
      await new Promise((ok) => setTimeout(ok, 4000));
      q.dataset.auditoria = '1';
      return msgs;
    });
    const quadros = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.mainFrame.framesInSubtree.map((f) => f.url));
    console.log('mensagens:', JSON.stringify(r));
    console.log('quadros:', JSON.stringify(quadros));
    const invadido = r.some((m) => m && m.invadido) || quadros.filter((u) => u.startsWith('sistema:')).length > 1 || r.some((m) => m && m.leu && m.leu.trim().startsWith('{'));
    console.log(invadido ? 'AUDITORIA: FALHOU' : 'AUDITORIA: ok');
  },

  // O ç do teclado EUA internacional (´ seguido de c), como no Windows, com o Linux em qualquer
  // idioma (rode com LANG=en_US.UTF-8; precisa do setxkbmap e do xdotool): digita no Bloco de notas.
  async cedilha() {
    execFileSync('setxkbmap', ['-layout', 'us', '-variant', 'intl']);
    await fecharTudo();
    await abrir('bloco');
    await pagina.waitForTimeout(800);
    await pagina.click('.janela.ativa textarea');
    for (const k of ['dead_acute', 'c', 'dead_acute', 'C', 'dead_acute', 'a', 'o']) {
      execFileSync('xdotool', ['key', k]);
      await pagina.waitForTimeout(250);
    }
    await pagina.waitForTimeout(400);
    const v = await pagina.inputValue('.janela.ativa textarea');
    await foto('cedilha');
    console.log('cedilha:', JSON.stringify(v), v === 'çÇáo' ? 'ok' : 'ERRADO', '| LANG=' + (process.env.LANG || ''));
  },

  // Todos os acentos do português no teclado EUA internacional (pelo xdotool, como teclas de
  // verdade), em cinco lugares: o Bloco de notas, a caixa de busca, o nome de um arquivo no
  // Explorador, o Prompt de comando e uma página do Navegador. Rode com LANG=en_US.UTF-8 e com
  // LANG=pt_BR.UTF-8 (veja o roteiro "cedilha").
  async acentos() {
    execFileSync('setxkbmap', ['-layout', 'us', '-variant', 'intl']);
    const SEQ = [
      ...['a', 'e', 'i', 'o', 'u', 'A', 'E', 'I', 'O', 'U'].flatMap((k) => ['dead_acute', k]),
      ...['a', 'e', 'o', 'A', 'E', 'O'].flatMap((k) => ['dead_circumflex', k]),
      ...['a', 'o', 'A', 'O'].flatMap((k) => ['dead_tilde', k]),
      'dead_grave', 'a', 'dead_grave', 'A', 'dead_acute', 'c', 'dead_acute', 'C', 'dead_diaeresis', 'u', 'dead_diaeresis', 'U',
      // Os sinais sozinhos (o acento seguido de espaço) e as letras da AltGr.
      'dead_acute', 'space', 'dead_diaeresis', 'space', 'dead_grave', 'space', 'dead_tilde', 'space', 'dead_circumflex', 'space',
      'ccedilla', 'aacute', 'eacute',
    ];
    const ESPERADO = 'áéíóúÁÉÍÓÚâêôÂÊÔãõÃÕàÀçÇüÜ\'"`~^çáé';
    // O que o Windows faz e o Linux pode fazer diferente: o apóstrofo antes de uma consoante e o ^ antes de um número.
    // [as teclas, o que o Windows escreve]
    const EXTRAS = [
      [['dead_acute', 's'], "'s"], [['dead_acute', 't'], "'t"], [['dead_acute', 'n'], "'n"], [['dead_acute', 'd'], "'d"],
      [['dead_diaeresis', 'B'], '"B'], [['dead_diaeresis', 't'], '"t'], [['dead_diaeresis', 'o'], 'ö'], [['dead_grave', 'n'], '`n'],
      [['dead_tilde', 's'], '~s'], [['dead_tilde', 'n'], 'ñ'], [['dead_circumflex', '2'], '^2'], [['dead_circumflex', 't'], '^t'],
      [['dead_acute', '1'], "'1"], [['dead_diaeresis', '1'], '"1'], [['dead_acute', 'dead_acute'], "''"],
    ];
    const teclar = async (teclas) => { execFileSync('xdotool', ['key', '--delay', '180', ...teclas]); await pagina.waitForTimeout(400); };
    const conferir = (onde, v) => console.log(`acentos ${onde}:`, JSON.stringify(v), v === ESPERADO ? 'ok' : 'ERRADO');
    // 1. O Bloco de notas, com os extras numa linha cada.
    await fecharTudo();
    await abrir('bloco');
    await pagina.waitForTimeout(800);
    await pagina.click('.janela.ativa textarea');
    await teclar(SEQ);
    conferir('Bloco de notas', await pagina.inputValue('.janela.ativa textarea'));
    for (const [teclas, windows] of EXTRAS) {
      await pagina.fill('.janela.ativa textarea', '');
      await teclar(teclas);
      const v = await pagina.inputValue('.janela.ativa textarea');
      console.log(`acentos extra ${teclas.join(' + ')}: ${JSON.stringify(v)} (Windows: ${JSON.stringify(windows)})`, v === windows ? 'ok' : 'DIFERENTE');
    }
    await pagina.fill('.janela.ativa textarea', '');
    await fecharTudo();
    // 2. A caixa de busca da barra de tarefas.
    await pagina.click('#busca-barra input');
    await teclar(SEQ);
    conferir('caixa de busca', await pagina.inputValue('#busca-barra input'));
    await pagina.fill('#busca-barra input', '');
    await pagina.keyboard.press('Escape');
    // 3. O nome de um arquivo (F2 no Explorador).
    fs.writeFileSync(path.join(disco, DOCS, 'renomear.txt'), 'x');
    await abrir('explorador', { pasta: DOCS });
    await pagina.waitForTimeout(900);
    await pagina.locator('.janela.ativa .item', { hasText: 'renomear.txt' }).click();
    await pagina.keyboard.press('F2');
    await pagina.waitForTimeout(300);
    await pagina.keyboard.press('Control+a');
    await teclar(SEQ);
    conferir('nome do arquivo', await pagina.inputValue('.rotulo-editor'));
    await pagina.keyboard.press('Escape');
    await fecharTudo();
    // 4. O Prompt de comando: o cat grava o que chega ao terminal num arquivo do disco.
    await abrir('prompt');
    await pagina.waitForTimeout(2500);
    await pagina.keyboard.type('cat > acentos-prompt.txt\n');
    await pagina.waitForTimeout(600);
    await teclar(SEQ);
    await teclar(['Return', 'ctrl+d']);
    await pagina.waitForTimeout(800);
    const doPrompt = (() => { try { return fs.readFileSync(path.join(disco, 'acentos-prompt.txt'), 'utf8').replace(/\r?\n$/, ''); } catch (e) { return 'sem o arquivo: ' + e.message; } })();
    conferir('Prompt de comando', doPrompt);
    await foto('acentos-prompt');
    await fecharTudo();
    // 5. Uma página do Navegador.
    const servidor = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end('<!doctype html><meta charset="utf-8"><textarea id="t" style="width:90%;height:120px"></textarea>'); });
    await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
    servidor.unref();
    await abrir('navegador');
    await pagina.waitForTimeout(600);
    await pagina.fill('.janela.ativa .nav-endereco', `http://127.0.0.1:${servidor.address().port}/`);
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(2500);
    const r = await pagina.evaluate(() => { const b = document.querySelector('.janela.ativa .nav-conteudo:not(.escondida) webview').getBoundingClientRect(); return { x: b.left + 40, y: b.top + 30 }; });
    await pagina.mouse.click(r.x, r.y);
    await pagina.waitForTimeout(400);
    await teclar(SEQ);
    conferir('Navegador', await pagina.evaluate(() => document.querySelector('.janela.ativa .nav-conteudo:not(.escondida) webview').executeJavaScript("document.getElementById('t').value")));
    console.log('LANG=' + (process.env.LANG || ''), '| GTK_IM_MODULE do aplicativo:', await app.evaluate(() => process.env.GTK_IM_MODULE));
  },

  // As pastas especiais com os próprios ícones (como no Windows): o C:, Meus documentos (com
  // Recebidos, o Diário, as Capturas, Imagens, Músicas e Vídeos), a barra de pastas e a caixa Abrir.
  async pastas() {
    const T2 = (pt) => (CATALOGO[pt] || pt);
    const docs = path.join(disco, DOCS);
    for (const p of [path.join(disco, 'DOS'), path.join(docs, PASTAS[IDIOMA].recebidos), path.join(docs, T2('Capturas de tela')), path.join(docs, T2('Diário de trabalho')),
      path.join(docs, T2('Imagens')), path.join(docs, T2('Músicas')), path.join(docs, T2('Vídeos')), path.join(docs, 'Trabalho')]) fs.mkdirSync(p, { recursive: true });
    await pagina.evaluate((d) => window.__retro.definirConfig({ pastas: { diario: d } }), T2('Diário de trabalho'));
    await fecharTudo();
    await abrir('explorador', { pasta: '' });
    await pagina.waitForTimeout(1000);
    await foto('pastas-c');
    await fecharTudo();
    await abrir('explorador', { pasta: DOCS });
    await pagina.waitForTimeout(1000);
    await foto('pastas-documentos');
  },

  // O programa padrão de cada tipo: Abrir com › Escolher o programa… (o Bloco de notas para o .md, que
  // abre no WordCraft com RETRO_ZIP), os dois cliques com ele, o Painel › Programas padrão e o Voltar ao normal.
  async padroes() {
    fs.writeFileSync(path.join(disco, DOCS, 'Notas.md'), '# Notas\n\nO programa padrão de cada tipo de arquivo.\n');
    const titulo = () => pagina.evaluate(() => { const j = window.__retro.janelas.janelaAtiva(); return j ? j.titulo : null; });
    await fecharTudo();
    await abrir('explorador', { pasta: DOCS });
    await pagina.waitForTimeout(900);
    const item = '.janela.ativa .item:has-text("Notas")';
    await pagina.dblclick(item);
    await pagina.waitForTimeout(2500);
    console.log('antes, os dois cliques abrem:', await titulo());
    await fecharTudo();
    await abrir('explorador', { pasta: DOCS });
    await pagina.waitForTimeout(900);
    await pagina.click(item, { button: 'right' });
    await pagina.waitForTimeout(300);
    await pagina.hover(`.menu .opcao:has-text("${T('Abrir c&om')}")`);
    await pagina.waitForTimeout(500);
    await foto('padroes-menu');
    await pagina.click(`.menu .opcao:has-text("${T('&Escolher o programa…')}")`);
    await pagina.waitForTimeout(600);
    await pagina.click(`.janela.ativa .lp-linha:has-text("${T('Bloco de notas')}")`);
    await pagina.waitForTimeout(200);
    await foto('padroes-escolher');
    await pagina.click(`.janela.ativa button:has-text("${T('OK')}")`);
    await pagina.waitForTimeout(1200);
    console.log('aberto pela caixa:', await titulo(), '| abrirCom:', JSON.stringify(await pagina.evaluate(() => window.__retro.estado.config.abrirCom)));
    await fecharTudo();
    await abrir('explorador', { pasta: DOCS });
    await pagina.waitForTimeout(900);
    await pagina.dblclick(item);
    await pagina.waitForTimeout(1500);
    console.log('depois, os dois cliques abrem:', await titulo());
    await fecharTudo();
    await abrir('painel', { secao: 'padroes' });
    await pagina.waitForTimeout(700);
    await foto('padroes-painel');
    await pagina.click(`.janela.ativa button:has-text("${T('&Voltar ao normal')}")`);
    await pagina.waitForTimeout(200);
    await pagina.click(`.janela.ativa .acoes button:has-text("${T('OK')}")`);
    await pagina.waitForTimeout(500);
    console.log('voltou ao normal:', JSON.stringify(await pagina.evaluate(() => window.__retro.estado.config.abrirCom)));
    await fecharTudo();
    await abrir('painel', { secao: 'padroes' });
    await pagina.waitForTimeout(700);
    await foto('padroes-painel-vazio');
  },

  // A ida e a volta com o computador principal (RETRO_COMPUTADOR_FALSO, posto pelo próprio roteiro): o
  // Meu computador, as pastas de lá, trazer, levar sem gravar por cima, soltar numa pasta de lá e
  // receber um arquivo mandado de fora (uma segunda abertura com o arquivo, como o "Enviar para").
  async computador() {
    const casa = process.env.RETRO_COMPUTADOR_FALSO;
    await fecharTudo();
    await abrir('explorador', { pasta: '::computador' });
    await pagina.waitForTimeout(1000);
    await foto('computador-meu');
    await pagina.dblclick(`.janela.ativa .item:has(.rotulo:text-is("${T('Computador principal')}"))`);
    await pagina.waitForTimeout(1000);
    await foto('computador-pastas');
    await pagina.dblclick(`.janela.ativa .item:has(.rotulo:text-is("${T('Documentos')}"))`);
    await pagina.waitForTimeout(1000);
    await pagina.click('.janela.ativa .item:has-text("Contrato")', { button: 'right' });
    await pagina.waitForTimeout(300);
    await foto('computador-documentos');
    await pagina.click(`.menu .opcao:has-text("${T('Copiar para Meus &documentos')}")`);
    await pagina.waitForTimeout(1000);
    console.log('trazido para o C:?', fs.existsSync(path.join(disco, DOCS, 'Contrato.txt')), '| ainda lá?', fs.existsSync(path.join(casa, 'documents', 'Contrato.txt')));
    // Levar duas vezes: o segundo ganha "(2)".
    for (let i = 0; i < 2; i++) await pagina.evaluate((r) => retro.unidades.levar('pc:mesa', [r], ''), `${DOCS}/Teste.md`);
    console.log('na área de trabalho de lá:', JSON.stringify(fs.readdirSync(path.join(casa, 'desktop')).sort()));
    // A pasta do disco C: não vai e não vem por aqui.
    console.log('trazer de fora da pasta recusado?', await pagina.evaluate(() => retro.unidades.trazer('pc:documentos', ['../x'], '').then(() => false, () => true)));
    // A janela da área de trabalho de lá, com o Contrato da janela de Meus documentos solto nela.
    await fecharTudo();
    await abrir('explorador', { pasta: '::unidade:pc%3Amesa' });
    await pagina.waitForTimeout(1000);
    await foto('computador-mesa');
    // Receber de fora: uma segunda abertura com o arquivo (o "Enviar para" do Windows faz assim).
    const enviado = path.join(casa, 'documents', 'Orçamento.csv');
    const segundo = spawn(require('electron'), ['--no-sandbox', RAIZ, enviado], {
      env: { ...process.env, RETRO_IDIOMA: IDIOMA, RETRO_DADOS: dados, RETRO_DISCO: disco, RETRO_JANELA: '1', RETRO_RAPIDO: '1' }, stdio: 'ignore',
    });
    await new Promise((r) => { segundo.once('exit', r); setTimeout(r, 15000); });
    await pagina.waitForTimeout(2000);
    await foto('computador-recebido');
    console.log('recebido em Recebidos?', fs.existsSync(path.join(disco, DOCS, PASTAS[IDIOMA].recebidos, 'Orçamento.csv')), '| o original ficou?', fs.existsSync(enviado));
    // O Painel › Disco C: › Computador principal.
    await fecharTudo();
    await abrir('painel', { secao: 'disco' });
    await pagina.waitForTimeout(800);
    await pagina.locator('.janela.ativa .abas > *', { hasText: T('Computador principal') }).dispatchEvent('mousedown');
    await pagina.waitForTimeout(400);
    await foto('computador-painel');
    // Desligar as pastas: somem do Meu computador e as rotas recusam.
    await pagina.locator('.janela.ativa .painel-aba input[type=checkbox] >> nth=0').uncheck();
    await pagina.click(`.janela.ativa .acoes button:has-text("${T('OK')}")`);
    await pagina.waitForTimeout(500);
    console.log('desligadas: pastas', JSON.stringify(await pagina.evaluate(() => retro.computador.pastas())), '| rota recusa?', await pagina.evaluate(() => retro.unidades.pasta('pc:mesa', '').then(() => false, () => true)));
  },

  // Arrastar e soltar com o mouse: um arquivo sobre o ícone de uma pasta (no Explorador e na área de
  // trabalho), um arquivo para dentro de uma pasta aberta, e renomear na área de trabalho (o texto à vista).
  // Os atalhos de programas: o da área de trabalho solto numa pasta vira um arquivo de atalho (e sai
  // da área de trabalho); dois cliques nele abrem o programa; renomear mantém o ".atalho".
  async atalhos() {
    const mesa = path.join(disco, MESA);
    await pagina.evaluate(() => { window.__retro.arrastoSimulado = true; });
    fs.mkdirSync(path.join(mesa, 'Projetos'), { recursive: true });
    await pagina.evaluate(async () => { const m = await import('./js/mesa.js'); await m.adicionarAtalho('calculadora'); await m.adicionarAtalho('bloco'); });
    await fecharTudo();
    await pagina.waitForTimeout(1500);
    const arrastar = async (de, para) => {
      const a = await pagina.locator(de).first().boundingBox();
      const b = await pagina.locator(para).first().boundingBox();
      await pagina.mouse.move(a.x + a.width / 2, a.y + 12);
      await pagina.mouse.down();
      for (let i = 1; i <= 12; i++) await pagina.mouse.move(a.x + a.width / 2 + ((b.x + b.width / 2) - (a.x + a.width / 2)) * i / 12, a.y + 12 + ((b.y + 12) - (a.y + 12)) * i / 12);
      await pagina.waitForTimeout(150);
      await pagina.mouse.up();
      await pagina.waitForTimeout(1500);
    };
    const naMesa = () => pagina.evaluate(() => window.__retro.estado.config.mesa.atalhos);
    await foto('atalhos-antes');
    await arrastar(`#mesa .item:has(.rotulo:text-is("${T('Calculadora')}"))`, '#mesa .item:has(.rotulo:text-is("Projetos"))');
    console.log('na pasta:', JSON.stringify(fs.readdirSync(path.join(mesa, 'Projetos'))), '| na área de trabalho:', JSON.stringify(await naMesa()));
    console.log('conteúdo:', JSON.stringify(fs.readFileSync(path.join(mesa, 'Projetos', T('Calculadora') + '.atalho'), 'utf8')));
    // Na pasta aberta: o ícone da Calculadora com a setinha, o nome sem o ".atalho".
    await abrir('explorador', { pasta: MESA + '/Projetos' });
    await pagina.waitForTimeout(1200);
    // O Bloco de notas, solto dentro da pasta aberta.
    await pagina.evaluate(() => { const j = window.__retro.janelas.janelaAtiva(); j.ret = { x: 380, y: 60, w: 420, h: 300 }; j.aplicarRet(); });
    await pagina.waitForTimeout(400);
    await arrastar(`#mesa .item:has(.rotulo:text-is("${T('Bloco de notas')}"))`, '.janela.ativa .icones');
    console.log('na pasta, depois do Bloco:', JSON.stringify(fs.readdirSync(path.join(mesa, 'Projetos')).sort()), '| na área de trabalho:', JSON.stringify(await naMesa()));
    await foto('atalhos-pasta');
    await abrir('explorador', { pasta: MESA + '/Projetos' });
    await pagina.waitForTimeout(800);
    await pagina.evaluate(() => { const j = window.__retro.janelas.janelaAtiva(); j.explorador.definirModo('detalhes'); });
    await pagina.waitForTimeout(500);
    await foto('atalhos-detalhes');
    console.log('detalhes:', JSON.stringify(await pagina.evaluate(() => [...document.querySelectorAll('.janela.ativa .linha-item')].map((l) => l.innerText.replace(/\s+/g, ' ').trim()))));
    // Renomear: o nome novo continua um atalho.
    await pagina.click(`.janela.ativa .item:has(.rotulo:text-is("${T('Calculadora')}"))`);
    await pagina.keyboard.press('F2');
    await pagina.waitForTimeout(300);
    await pagina.keyboard.type('Contas');
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(1200);
    console.log('renomeado:', JSON.stringify(fs.readdirSync(path.join(mesa, 'Projetos')).sort()));
    // Dois cliques abrem o programa.
    await pagina.dblclick('.janela.ativa .item:has(.rotulo:text-is("Contas"))');
    await pagina.waitForTimeout(1200);
    console.log('aberta:', await pagina.evaluate(() => window.__retro.janelas.janelaAtiva().titulo));
    await foto('atalhos-aberto');
    // Um atalho para um programa que não existe mais avisa.
    fs.writeFileSync(path.join(mesa, 'Projetos', 'Velho.atalho'), '[Retro Computer]\r\nPrograma=craft:nao-existe\r\n');
    await pagina.evaluate((m) => import('./js/sistema.js').then((s) => { s.abrirArquivo(m + '/Projetos/Velho.atalho'); }), MESA);
    await pagina.waitForTimeout(800);
    console.log('aviso:', await pagina.evaluate(() => (document.querySelector('.janela.ativa .cxb-texto, .janela.ativa .mensagem') || document.querySelector('.janela.ativa')).innerText.slice(0, 120)));
    await foto('atalhos-sem-programa');
    await pagina.keyboard.press('Enter');
  },

  async arrastar() {
    const docs = path.join(disco, DOCS);
    const mesa = path.join(disco, MESA);
    // O Playwright só imita o arrastar do navegador: aqui, o Retro Computer usa o dele (o do sistema,
    // que solta fora do Retro Computer, fica para o roteiro arrastarReal, com o mouse de verdade).
    await pagina.evaluate(() => { window.__retro.arrastoSimulado = true; });
    fs.mkdirSync(path.join(docs, 'Pasta A'), { recursive: true });
    fs.mkdirSync(path.join(docs, 'Pasta B'), { recursive: true });
    fs.writeFileSync(path.join(docs, 'nota.txt'), 'nota');
    fs.writeFileSync(path.join(docs, 'outra.txt'), 'outra');
    fs.mkdirSync(path.join(mesa, 'Projetos'), { recursive: true });
    fs.writeFileSync(path.join(mesa, 'lembrete.txt'), 'lembrete');
    await fecharTudo();
    await pagina.waitForTimeout(1500);
    const arrastar = async (de, para) => {
      const a = await pagina.locator(de).first().boundingBox();
      const b = await pagina.locator(para).first().boundingBox();
      await pagina.mouse.move(a.x + a.width / 2, a.y + 12);
      await pagina.mouse.down();
      for (let i = 1; i <= 12; i++) await pagina.mouse.move(a.x + a.width / 2 + ((b.x + b.width / 2) - (a.x + a.width / 2)) * i / 12, a.y + 12 + ((b.y + 12) - (a.y + 12)) * i / 12);
      await pagina.waitForTimeout(150);
      await pagina.mouse.up();
      await pagina.waitForTimeout(1200);
    };
    // 1) No Explorador, sobre o ícone da pasta.
    await abrir('explorador', { pasta: DOCS });
    await pagina.waitForTimeout(1200);
    await arrastar('.janela.ativa .vista-icones .item:has-text("nota.txt"), .janela.ativa .item:has(.rotulo:text-is("nota.txt"))', '.janela.ativa .item:has(.rotulo:text-is("Pasta A"))');
    console.log('1) sobre o ícone da pasta, no Explorador:', fs.existsSync(path.join(docs, 'Pasta A', 'nota.txt')));
    // 2) Para dentro de uma pasta aberta (a janela da Pasta B ao lado).
    await abrir('explorador', { pasta: DOCS + '/Pasta B' });
    await pagina.waitForTimeout(1200);
    await pagina.evaluate(() => { const l = window.__retro.janelas.lista; const [a, b] = l.slice(-2); a.ret = { x: 10, y: 10, w: 470, h: 330 }; a.aplicarRet(); b.ret = { x: 500, y: 10, w: 470, h: 330 }; b.aplicarRet(); });
    await pagina.waitForTimeout(400);
    const janelas = pagina.locator('.janela');
    const n = await janelas.count();
    await arrastar(`.janela >> nth=${n - 2} >> .item:has(.rotulo:text-is("outra.txt"))`, `.janela >> nth=${n - 1} >> .icones`);
    console.log('2) para dentro da pasta aberta:', fs.existsSync(path.join(docs, 'Pasta B', 'outra.txt')));
    await foto('arrastar-janelas');
    // 3) Na área de trabalho, sobre o ícone da pasta.
    await fecharTudo();
    await pagina.waitForTimeout(1500);
    await arrastar('#mesa .item:has(.rotulo:text-is("lembrete.txt"))', '#mesa .item:has(.rotulo:text-is("Projetos"))');
    console.log('3) sobre a pasta da área de trabalho:', fs.existsSync(path.join(mesa, 'Projetos', 'lembrete.txt')));
    // 4) Renomear na área de trabalho: o texto digitado tem que aparecer.
    await pagina.click('#mesa .item:has(.rotulo:text-is("Projetos"))');
    await pagina.keyboard.press('F2');
    await pagina.waitForTimeout(300);
    await pagina.keyboard.type('Projetos novos');
    await pagina.waitForTimeout(300);
    console.log('4) cor do texto ao renomear:', await pagina.evaluate(() => { const e = document.querySelector('.rotulo-editor'); return e ? getComputedStyle(e).color + ' sobre ' + getComputedStyle(e).backgroundColor : 'sem editor'; }));
    await foto('arrastar-renomear-mesa');
    await pagina.keyboard.press('Escape');
  },

  // Arrastar com o mouse de verdade (o xdotool, pelo arrastar do X, e não o simulado pelo Playwright),
  // com o zoom da interface em RETRO_ZOOM_TESTE (1, 1.25, 1.5…): o Windows com a escala de 125% ou
  // 150% fica com um zoom fracionário. Um arquivo vai para a Lixeira e outro para uma pasta.
  async arrastarReal() {
    const docs = path.join(disco, DOCS);
    fs.mkdirSync(path.join(docs, 'Pasta A'), { recursive: true });
    fs.writeFileSync(path.join(docs, 'nota.txt'), 'nota');
    fs.writeFileSync(path.join(docs, 'lixo.txt'), 'lixo');
    const zoom = Number(process.env.RETRO_ZOOM_TESTE || 1);
    await pagina.evaluate((z) => retro.sistema.zoom(z), zoom);
    await fecharTudo();
    await abrir('explorador', { pasta: DOCS });
    await pagina.waitForTimeout(1500);
    const cont = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getContentBounds());
    const fator = await pagina.evaluate(() => window.devicePixelRatio);
    const ponto = async (sel) => { const b = await pagina.locator(sel).first().boundingBox(); return [Math.round(cont.x + (b.x + b.width / 2) * fator), Math.round(cont.y + (b.y + Math.min(16, b.height / 2)) * fator)]; };
    const xdo = (...a) => execFileSync('xdotool', a.map(String));
    const arrastarX = async (de, para) => {
      const [x0, y0] = await ponto(de);
      const [x1, y1] = await ponto(para);
      xdo('mousemove', x0, y0); await pagina.waitForTimeout(200);
      xdo('mousedown', 1); await pagina.waitForTimeout(200);
      for (let i = 1; i <= 15; i++) { xdo('mousemove', Math.round(x0 + (x1 - x0) * i / 15), Math.round(y0 + (y1 - y0) * i / 15)); await pagina.waitForTimeout(40); }
      await pagina.waitForTimeout(300);
      xdo('mouseup', 1); await pagina.waitForTimeout(1500);
    };
    console.log('zoom', zoom, '| devicePixelRatio', fator);
    await arrastarX('.janela.ativa .item:has(.rotulo:text-is("nota.txt"))', '.janela.ativa .item:has(.rotulo:text-is("Pasta A"))');
    console.log('para a pasta:', fs.existsSync(path.join(docs, 'Pasta A', 'nota.txt')), '| saiu de onde estava:', !fs.existsSync(path.join(docs, 'nota.txt')));
    fs.writeFileSync(path.join(docs, 'fundo.txt'), 'f');
    await pagina.waitForTimeout(1500);
    const jb = await pagina.locator('.janela.ativa').boundingBox();
    const [fx, fy] = await ponto('.janela.ativa .item:has(.rotulo:text-is("fundo.txt"))');
    xdo('mousemove', fx, fy); await pagina.waitForTimeout(200); xdo('mousedown', 1); await pagina.waitForTimeout(200);
    for (let i = 1; i <= 15; i++) { xdo('mousemove', fx + 20 * i, Math.round(cont.y + (jb.y + jb.height + 60) * fator)); await pagina.waitForTimeout(40); }
    await pagina.waitForTimeout(300); xdo('mouseup', 1); await pagina.waitForTimeout(1500);
    console.log('para o fundo da área de trabalho:', fs.existsSync(path.join(disco, MESA, 'fundo.txt')), '| saiu de onde estava:', !fs.existsSync(path.join(docs, 'fundo.txt')));
    // Na própria área de trabalho, o ícone só muda de lugar (o arquivo fica onde está).
    const antesMesa = await pagina.locator('#mesa .item:has(.rotulo:text-is("fundo.txt"))').boundingBox();
    const [mx, my] = await ponto('#mesa .item:has(.rotulo:text-is("fundo.txt"))');
    xdo('mousemove', mx, my); await pagina.waitForTimeout(200); xdo('mousedown', 1); await pagina.waitForTimeout(200);
    for (let i = 1; i <= 15; i++) { xdo('mousemove', mx + Math.round(160 * i / 15) * fator, my); await pagina.waitForTimeout(40); }
    await pagina.waitForTimeout(300); xdo('mouseup', 1); await pagina.waitForTimeout(1500);
    const depoisMesa = await pagina.locator('#mesa .item:has(.rotulo:text-is("fundo.txt"))').boundingBox();
    console.log('pela área de trabalho: mudou de lugar', !!depoisMesa && depoisMesa.x > antesMesa.x + 50, '| continua lá:', fs.existsSync(path.join(disco, MESA, 'fundo.txt')));
    // A janela sai de cima do ícone da Lixeira.
    await pagina.evaluate(() => { const j = window.__retro.janelas.janelaAtiva(); j.ret.x = 300; j.ret.y = 80; j.aplicarRet(); });
    await pagina.waitForTimeout(400);
    await arrastarX('.janela.ativa .item:has(.rotulo:text-is("lixo.txt"))', '#mesa .item:has(.rotulo:text-is("' + T('Lixeira') + '"))');
    const pergunta = await pagina.locator('.janela.dialogo.ativa').count();
    if (pergunta) { await foto('arrastar-lixeira-pergunta'); await pagina.locator('.janela.dialogo.ativa button', { hasText: T('&Sim').replace('&', '') }).click(); await pagina.waitForTimeout(800); }
    console.log('para a Lixeira (com a pergunta):', !!pergunta, !fs.existsSync(path.join(docs, 'lixo.txt')));
    await foto('arrastar-real');
    // Para fora do Retro Computer: um programa de mentira (outra janela do X, ao lado) recebe o
    // arrastar do sistema e anota os caminhos; o arquivo continua no disco C: (o sistema só copia).
    const fora = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-receptor-'));
    fs.writeFileSync(path.join(fora, 'package.json'), JSON.stringify({ name: 'receptor', main: 'main.js' }));
    fs.writeFileSync(path.join(fora, 'main.js'), `const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs'); const path = require('path');
app.whenReady().then(() => {
  const w = new BrowserWindow({ x: Number(process.env.RECEPTOR_X), y: 120, width: 200, height: 300, frame: false, webPreferences: { preload: path.join(__dirname, 'preload.js'), sandbox: false } });
  w.loadURL('data:text/html,<body style="background:yellow;margin:0;height:100vh">solte aqui</body>');
  ipcMain.on('soltou', (_e, l) => fs.writeFileSync(path.join(__dirname, 'soltos.json'), JSON.stringify(l)));
});`);
    fs.writeFileSync(path.join(fora, 'preload.js'), `const { ipcRenderer, webUtils } = require('electron');
addEventListener('dragover', (e) => e.preventDefault());
addEventListener('drop', (e) => { e.preventDefault(); ipcRenderer.send('soltou', [...e.dataTransfer.files].map((f) => webUtils.getPathForFile(f))); });`);
    fs.writeFileSync(path.join(docs, 'para fora ação.txt'), 'vai para fora');
    await pagina.waitForTimeout(1500);
    const rx = cont.x + cont.width + 20;
    const env = { ...process.env, RECEPTOR_X: String(rx) };
    delete env.ELECTRON_RUN_AS_NODE;
    const receptor = spawn(require('electron'), ['--no-sandbox', fora], { env, stdio: 'ignore' });
    await pagina.waitForTimeout(4000);
    const [ox, oy] = await ponto('.janela.ativa .item:has(.rotulo:text-is("para fora ação.txt"))');
    xdo('mousemove', ox, oy); await pagina.waitForTimeout(200); xdo('mousedown', 1); await pagina.waitForTimeout(200);
    for (let i = 1; i <= 20; i++) { xdo('mousemove', Math.round(ox + (rx + 100 - ox) * i / 20), Math.round(oy + (250 - oy) * i / 20)); await pagina.waitForTimeout(40); }
    await pagina.waitForTimeout(400); xdo('mouseup', 1); await pagina.waitForTimeout(2000);
    const soltos = fs.existsSync(path.join(fora, 'soltos.json')) ? JSON.parse(fs.readFileSync(path.join(fora, 'soltos.json'), 'utf8')) : null;
    console.log('para fora:', JSON.stringify(soltos), '| o caminho certo:', !!soltos && soltos[0] === path.join(docs, 'para fora ação.txt'), '| continua no C:', fs.existsSync(path.join(docs, 'para fora ação.txt')));
    receptor.kill();
  },

  // A barra de ferramentas do Explorador e a do Navegador numa janela estreita: os botões não são
  // cortados (fica só o ícone) e os nomes voltam com a janela larga.
  async barraFerramentas() {
    await fecharTudo();
    await abrir('explorador', { pasta: DOCS });
    await pagina.waitForTimeout(1000);
    const medir = () => pagina.evaluate(() => { const b = document.querySelector('.janela.ativa .barra-ferramentas'); return { compacta: b.classList.contains('compacta'), sobra: b.scrollWidth - b.clientWidth }; });
    const largura = async (w) => { await pagina.evaluate((w) => { const j = window.__retro.janelas.janelaAtiva(); j.ret.w = w; j.aplicarRet(); j.ev.emit('tamanho'); }, w); await pagina.waitForTimeout(500); };
    await largura(760);
    console.log('larga:', JSON.stringify(await medir()));
    await foto('barra-larga');
    await largura(420);
    console.log('estreita:', JSON.stringify(await medir()));
    await foto('barra-estreita');
    await largura(760);
    console.log('larga de novo:', JSON.stringify(await medir()));
  },

  // A tela cheia de um site (a página inteira e o vídeo de dentro de um quadro de outro site, como o
  // Vimeo numa página de curso) e a aba nova logo que abre.
  async telaCheiaSite() {
    const quadro = '<!doctype html><meta charset="utf-8"><body style="margin:0;background:#123"><div id="v" style="width:100%;height:100%;background:linear-gradient(90deg,#c33,#33c);color:#fff;font:40px sans-serif;display:flex;align-items:center;justify-content:center">VÍDEO</div>';
    const pagina1 = (porta) => `<!doctype html><meta charset="utf-8"><title>Curso</title><body style="margin:0;font:16px sans-serif"><h1>Aula</h1><iframe id="q" src="http://localhost:${porta}/quadro" allow="fullscreen" allowfullscreen style="width:640px;height:360px;border:0"></iframe>`;
    const servidor = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(req.url.startsWith('/quadro') ? quadro : pagina1(servidor.address().port));
    });
    await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
    const porta = servidor.address().port;
    await fecharTudo();
    await abrir('navegador', { url: `http://127.0.0.1:${porta}/`, interno: true });
    await pagina.waitForTimeout(3000);
    const wv = '.janela.ativa .nav-conteudo:not(.escondida) webview';
    const medir = (rotulo) => pagina.evaluate(([s, r]) => {
      const w = document.querySelector(s);
      const b = w && w.getBoundingClientRect();
      return `${r}: webview ${b ? [b.x, b.y, b.width, b.height].map(Math.round).join(',') : '-'} | janela ${innerWidth}x${innerHeight} | tela cheia: ${document.fullscreenElement ? document.fullscreenElement.tagName : 'não'}`;
    }, [wv, rotulo]);
    console.log(await medir('antes'));
    // 1) A página inteira em tela cheia.
    await pagina.evaluate((s) => document.querySelector(s).executeJavaScript('document.documentElement.requestFullscreen().then(() => "ok", (e) => String(e))', true), wv).then((r) => console.log('página:', r));
    await pagina.waitForTimeout(1500);
    console.log(await medir('página em tela cheia'));
    await foto('tela-cheia-pagina');
    await pagina.evaluate((s) => document.querySelector(s).executeJavaScript('document.exitFullscreen()', true), wv).catch(() => { });
    await pagina.waitForTimeout(1200);
    // 2) O vídeo de dentro do quadro de outro site.
    const r2 = await app.evaluate(async ({ webContents }) => {
      const g = webContents.getAllWebContents().find((w) => w.getType() === 'webview' && /127\.0\.0\.1/.test(w.getURL()));
      if (!g) return 'sem a página';
      const f = g.mainFrame.frames.find((x) => /\/quadro/.test(x.url));
      if (!f) return 'sem o quadro';
      return f.executeJavaScript('document.getElementById("v").requestFullscreen().then(() => "ok", (e) => String(e))', true);
    });
    console.log('quadro:', r2);
    await pagina.waitForTimeout(1500);
    console.log(await medir('quadro em tela cheia'), '| camada de cima:', await pagina.evaluate((s) => document.querySelector(s).matches(':popover-open'), wv));
    await foto('tela-cheia-quadro');
    // O Esc, na página (o teclado vai para ela), sai da tela cheia.
    await app.evaluate(({ webContents }) => {
      const g = webContents.getAllWebContents().find((w) => w.getType() === 'webview' && /127\.0\.0\.1/.test(w.getURL()));
      g.focus();
      g.sendInputEvent({ type: 'keyDown', keyCode: 'Escape' });
      g.sendInputEvent({ type: 'keyUp', keyCode: 'Escape' });
    });
    await pagina.waitForTimeout(1500);
    console.log(await medir('depois do Esc'), '| camada de cima:', await pagina.evaluate((s) => document.querySelector(s).matches(':popover-open'), wv));
    await app.evaluate(async ({ webContents }) => {
      const g = webContents.getAllWebContents().find((w) => w.getType() === 'webview' && /127\.0\.0\.1/.test(w.getURL()));
      const f = g && g.mainFrame.frames.find((x) => /\/quadro/.test(x.url));
      if (f) await f.executeJavaScript('document.fullscreenElement && document.exitFullscreen()', true);
    }).catch(() => { });
    await pagina.waitForTimeout(1200);
    await foto('tela-cheia-saiu');
    // 3) A aba nova, logo que abre (o endereço ainda carregando).
    await pagina.click('.janela.ativa .nav-aba-nova');
    await pagina.waitForTimeout(300);
    await pagina.fill('.janela.ativa .nav-endereco', `http://127.0.0.1:${porta}/devagar`);
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(150);
    await foto('aba-nova-carregando');
    await pagina.waitForTimeout(2500);
    await foto('aba-nova-pronta');
    servidor.close();
  },

  // O aviso do vídeo protegido (DRM): a página pede o Widevine, que o Navegador daqui não tem, e a
  // faixa amarela oferece o Firefox (com RETRO_FIREFOX) ou o navegador do computador. O ClearKey (que
  // toca) e outro erro não avisam; fechar, trocar de site e "Não avisar neste site" tiram a faixa.
  // RETRO_DRM_SITES (endereços separados por vírgula, precisa da internet) diz se cada site avisa.
  async drm() {
    const pagina1 = (sistema) => `<!doctype html><meta charset="utf-8"><title>Filme</title><body style="margin:0;font:16px sans-serif;background:#000;color:#fff"><div style="height:300px;display:flex;align-items:center;justify-content:center">VÍDEO PROTEGIDO</div><p id="r">…</p><script>
      navigator.requestMediaKeySystemAccess(${JSON.stringify(sistema)}, [{ initDataTypes: ['cenc'], videoCapabilities: [{ contentType: 'video/mp4; codecs="avc1.42E01E"' }] }])
        .then(() => { document.getElementById('r').textContent = 'aceito'; }, (e) => { document.getElementById('r').textContent = 'recusado: ' + e.name; });
    </script>`;
    const servidor = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      const u = new URL(req.url, 'http://x');
      res.end(pagina1(u.searchParams.get('s') || 'com.widevine.alpha'));
    });
    await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
    const porta = servidor.address().port;
    const base = `http://127.0.0.1:${porta}`;
    await pagina.evaluate(() => retro.config.definir({ navegador: { semAvisoDrm: [] } }));
    await fecharTudo();
    await abrir('navegador', { url: base + '/filme', interno: true });
    await pagina.waitForTimeout(2500);
    const faixa = '.janela.ativa .nav-conteudo:not(.escondida) .nav-faixa-info';
    const wv = '.janela.ativa .nav-conteudo:not(.escondida) webview';
    const ler = (r) => pagina.evaluate(([f, w, r]) => {
      const el = document.querySelector(f);
      return document.querySelector(w).executeJavaScript('document.getElementById("r") && document.getElementById("r").textContent')
        .then((p) => `${r}: página "${p}" | faixa: ${el ? `"${el.querySelector('span').textContent}" [${[...el.querySelectorAll('button')].map((b) => b.textContent || b.title).join(' | ')}]` : 'não'}`);
    }, [faixa, wv, r]);
    const ir = async (url) => { await pagina.evaluate(([w, u]) => document.querySelector(w).loadURL(u), [wv, url]); await pagina.waitForTimeout(2000); };
    console.log(await ler('Widevine'));
    await foto('drm-aviso');
    // Fechar tira a faixa; voltar à página avisa de novo.
    await pagina.click(faixa + ' .nav-faixa-fechar');
    await pagina.waitForTimeout(300);
    console.log(await ler('fechada'));
    await ir(base + '/filme?2');
    console.log(await ler('de novo'));
    // Outro site (outra origem, o localhost) tira a faixa.
    await ir(`http://localhost:${porta}/outro?s=org.w3.clearkey`);
    console.log(await ler('outro site com ClearKey'));
    await ir(base + '/filme?s=com.exemplo.inventado');
    console.log(await ler('sistema desconhecido'));
    await ir(base + '/filme?s=com.microsoft.playready');
    console.log(await ler('PlayReady'));
    // "Não avisar neste site".
    await pagina.click(`${faixa} button:text-is("${T('Não avisar neste site')}")`);
    await pagina.waitForTimeout(500);
    console.log('guardado:', JSON.stringify(await pagina.evaluate(() => window.__retro.estado.config.navegador.semAvisoDrm)));
    await ir(base + '/filme?3');
    console.log(await ler('depois de não avisar'));
    await pagina.evaluate(() => retro.config.definir({ navegador: { semAvisoDrm: [] } }));
    for (const site of (process.env.RETRO_DRM_SITES || '').split(',').filter(Boolean)) {
      await ir(site);
      await pagina.waitForTimeout(6000);
      const f = await pagina.evaluate((f) => !!document.querySelector(f), faixa);
      console.log(`site ${site}: ${f ? 'avisou' : 'não avisou'}`);
      await foto('drm-' + new URL(site).hostname.replace(/[^a-z0-9]+/g, '-'));
      await pagina.evaluate((f) => { const b = document.querySelector(f + ' .nav-faixa-fechar'); if (b) b.click(); }, faixa);
    }
    servidor.close();
  },

  // A aba nova por cada caminho (o +, o link com target, o window.open, o favorito com o botão do
  // meio, o Navegador aberto de fora) com os pixels em 2, como no Windows a 150%.
  async abasNovas() {
    const servidor = http.createServer((req, res) => {
      const pagina = (corpo) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(corpo); };
      if (req.url.startsWith('/devagar')) return setTimeout(() => pagina('<!doctype html><title>Devagar</title><h1>Devagar</h1>'), 4000);
      pagina(`<!doctype html><title>Início</title><a id="l" href="/devagar?alvo" target="_blank">abrir em outra aba</a><br><button id="b" onclick="window.open('/devagar?janela')">window.open</button>`);
    });
    await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
    const base = `http://127.0.0.1:${servidor.address().port}`;
    await pagina.evaluate(() => retro.sistema.zoom(2));
    await fecharTudo();
    await abrir('navegador', { url: base + '/', interno: true });
    await pagina.waitForTimeout(2500);
    await pagina.evaluate(() => { const j = window.__retro.janelas.janelaAtiva(); j.ret = { x: 0, y: 0, w: 500, h: 320 }; j.aplicarRet(); });
    await pagina.waitForTimeout(500);
    const wv = '.janela.ativa .nav-conteudo:not(.escondida) webview';
    const abas = () => pagina.evaluate(() => [...document.querySelectorAll('.janela.ativa .nav-aba')].map((a) => {
      const r = a.getBoundingClientRect(); const i = a.querySelector('.nav-aba-icone').getBoundingClientRect(); const f = a.querySelector('.nav-aba-fechar').getBoundingClientRect();
      return `[aba ${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)} ícone ${Math.round(i.x)},${Math.round(i.y)} fechar ${Math.round(f.x)},${Math.round(f.y)} "${a.querySelector('.nav-aba-nome').textContent}"]`;
    }).join(' ') + ' | rolagem ' + [...document.querySelectorAll('.janela.ativa *')].filter((e) => e.scrollTop || e.scrollLeft).map((e) => e.className + ':' + e.scrollLeft + ',' + e.scrollTop).join(';'));
    // 1) O link com target="_blank".
    await pagina.evaluate((s) => document.querySelector(s).executeJavaScript('document.getElementById("l").click()', true), wv);
    await pagina.waitForTimeout(400);
    console.log('1) link:', await abas());
    await foto('aba-nova-link');
    // 2) O window.open.
    await pagina.evaluate(() => { const n = window.__retro.janelas.janelaAtiva().navegador; if (n) n.escolherAba(n.abas[0]); });
    await pagina.waitForTimeout(300);
    await pagina.evaluate((s) => document.querySelector(s).executeJavaScript('document.getElementById("b").click()', true), wv).catch(() => { });
    await pagina.waitForTimeout(400);
    console.log('2) window.open:', await abas());
    await foto('aba-nova-janela');
    // 3) O Navegador aberto de fora (um link de outro programa).
    await pagina.evaluate((u) => import('./js/sistema.js').then((s) => s.abrirEndereco(u)), base + '/devagar?fora').catch((e) => console.log('fora:', e.message));
    await pagina.waitForTimeout(400);
    console.log('3) de fora:', await abas());
    await foto('aba-nova-fora');
    await pagina.waitForTimeout(4500);
    console.log('depois de carregar:', await abas());
    await foto('aba-nova-carregada');
    await pagina.evaluate(() => retro.sistema.zoom(1));
    servidor.close();
  },

  // A aba nova (o +, com a página inicial) e depois um site digitado no endereço ou uma pesquisa
  // pela caixa da página inicial: a faixa das abas tem que continuar no lugar.
  async abaNova() {
    const servidor = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      setTimeout(() => res.end(`<!doctype html><title>Site ${req.url}</title><h1>Site ${req.url}</h1>`), 800);
    });
    await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
    const base = `127.0.0.1:${servidor.address().port}`;
    await fecharTudo();
    await abrir('navegador');
    await pagina.waitForTimeout(1500);
    const medir = (r) => pagina.evaluate((rot) => {
      const j = document.querySelector('.janela.ativa');
      const abas = [...j.querySelectorAll('.nav-aba')].map((a) => {
        const q = (s) => { const b = a.querySelector(s).getBoundingClientRect(); return `${Math.round(b.x)},${Math.round(b.y)}`; };
        const b = a.getBoundingClientRect();
        return `[${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.width)}x${Math.round(b.height)} ícone ${q('.nav-aba-icone')} fechar ${q('.nav-aba-fechar')} "${a.querySelector('.nav-aba-nome').textContent}"]`;
      }).join(' ');
      const rolados = [...j.querySelectorAll('*')].filter((e) => e.scrollTop || e.scrollLeft).map((e) => `${e.className}:${e.scrollLeft},${e.scrollTop}`).join('; ');
      return `${rot}: ${abas} | rolados: ${rolados || 'nenhum'}`;
    }, r);
    console.log(await medir('início'));
    // 1) O + e um site digitado no endereço.
    await pagina.click('.janela.ativa .nav-aba-nova');
    await pagina.waitForTimeout(600);
    console.log(await medir('aba nova'));
    await pagina.click('.janela.ativa .nav-endereco');
    await pagina.keyboard.type(base + '/digitado');
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(200);
    console.log(await medir('carregando o site'));
    await foto('aba-nova-site-carregando');
    await pagina.waitForTimeout(2500);
    console.log(await medir('site aberto'));
    await foto('aba-nova-site');
    // 2) O + e a pesquisa pela caixa da página inicial.
    await pagina.click('.janela.ativa .nav-aba-nova');
    await pagina.waitForTimeout(600);
    const caixa = '.janela.ativa .nav-conteudo:not(.escondida) .nav-inicio input';
    await pagina.click(caixa);
    await pagina.keyboard.type('retro computer');
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(200);
    console.log(await medir('pesquisando'));
    await foto('aba-nova-pesquisa-carregando');
    await pagina.waitForTimeout(4000);
    console.log(await medir('pesquisa'));
    await foto('aba-nova-pesquisa');
    servidor.close();
  },

  // A troca de jeito no login do Google (precisa da internet): a recusa do Google é imitada no
  // processo principal (o did-navigate da página de recusa), e o Navegador passa do Firefox para o
  // Chrome, recomeça o login e, recusado de novo, sugere o Firefox de verdade.
  async loginTroca() {
    await fecharTudo();
    await pagina.evaluate(() => retro.config.definir({ navegador: { loginGoogle: 'firefox' } }));
    await abrir('navegador', { url: 'https://accounts.google.com/ServiceLogin?service=mail', interno: true });
    await pagina.waitForTimeout(7000);
    const wv = '.janela.ativa .nav-conteudo:not(.escondida) webview';
    const ler = () => pagina.evaluate((s) => document.querySelector(s).executeJavaScript('[location.href.slice(0, 60), navigator.userAgent, !!navigator.userAgentData && navigator.userAgentData.brands.map((b) => b.brand).join(",")]'), wv);
    const recusar = () => app.evaluate(({ webContents }) => {
      const wc = webContents.getAllWebContents().find((w) => w.getType() === 'webview' && /accounts\.google\.com/.test(w.getURL()));
      if (!wc) return 'sem a página';
      wc.emit('did-navigate', {}, 'https://accounts.google.com/v3/signin/rejected?continue=x');
      return 'recusado';
    });
    const modo = () => app.evaluate(() => { try { return JSON.parse(require('fs').readFileSync(require('path').join(require('electron').app.getPath('userData'), 'config.json'), 'utf8')).navegador.loginGoogle; } catch (e) { return String(e.message); } });
    console.log('antes:', JSON.stringify(await ler()));
    console.log(await recusar());
    await pagina.waitForTimeout(7000);
    console.log('depois da 1ª recusa:', JSON.stringify(await ler()), '| guardado:', await pagina.evaluate(() => window.__retro.estado.config.navegador && window.__retro.estado.config.navegador.loginGoogle));
    console.log(await recusar());
    await pagina.waitForTimeout(1500);
    console.log('aviso:', await pagina.evaluate(() => { const j = document.querySelector('.janela.ativa'); return j ? j.innerText.slice(0, 160) : ''; }));
    await foto('login-troca-aviso');
    await pagina.keyboard.press('Escape');
    await pagina.evaluate(() => retro.config.definir({ navegador: { loginGoogle: 'firefox' } }));
  },

  // O login do Google no Navegador (precisa da internet): na página de login, o Navegador se
  // apresenta como o Firefox; noutro site, como o Chrome.
  async loginGoogle() {
    await fecharTudo();
    await abrir('navegador', { url: 'https://accounts.google.com/', interno: true });
    await pagina.waitForTimeout(9000);
    const ler = () => pagina.evaluate(() => document.querySelector('.janela.ativa .nav-conteudo:not(.escondida) webview').executeJavaScript('[location.host, navigator.userAgent, !!navigator.userAgentData && navigator.userAgentData.brands.map((b) => b.brand).join(",")]'));
    console.log('no login do Google:', JSON.stringify(await ler()));
    await foto('login-google');
    // O Google recusa o navegador ao passar do e-mail para a senha: o roteiro digita um e-mail (o de
    // RETRO_EMAIL_TESTE ou um que não existe), como o usuário, e mostra a página que vem depois.
    const email = process.env.RETRO_EMAIL_TESTE || `retro.computer.teste.${Date.now()}@gmail.com`;
    const wv = '.janela.ativa .nav-conteudo:not(.escondida) webview';
    // O que dá errado no caminho: os pedidos do Google que falham e os erros da página.
    await app.evaluate(({ session }) => {
      const s = session.fromPartition('persist:navegador');
      globalThis.__login = [];
      s.webRequest.onErrorOccurred({ urls: ['https://*.google.com/*', 'https://*.gstatic.com/*'] }, (d) => globalThis.__login.push(`${d.error} ${d.method} ${d.url}`));
      s.webRequest.onCompleted({ urls: ['https://accounts.google.com/*'] }, (d) => { if (d.method !== 'GET' || d.statusCode >= 400) globalThis.__login.push(`${d.statusCode} ${d.method} ${d.url.slice(0, 110)}`); });
    });
    await pagina.evaluate((s) => {
      const w = document.querySelector(s);
      window.__consoleLogin = [];
      w.addEventListener('console-message', (e) => { if (e.level >= 2 || /error|erro/i.test(e.message)) window.__consoleLogin.push(String(e.message).slice(-260)); });
    }, wv);
    await pagina.evaluate((s) => { const w = window.__retro.janelas.janelaAtiva(); w.ret = { x: 10, y: 10, w: 1000, h: 640 }; w.aplicarRet(); return document.querySelector(s).loadURL('https://accounts.google.com/signin'); }, wv).catch(() => { });
    let campo = null;
    for (let i = 0; i < 20 && !campo; i++) {
      await pagina.waitForTimeout(1000);
      campo = await pagina.evaluate(async (s) => {
        const w = document.querySelector(s);
        const r = w.getBoundingClientRect();
        const c = await w.executeJavaScript('(() => { const e = document.querySelector("#identifierId, input[type=email]"); if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? [r.x + r.width / 2, r.y + r.height / 2] : null; })()').catch(() => null);
        return c && [r.x + c[0], r.y + c[1]];
      }, wv);
    }
    if (!campo) return console.log('login do Google: sem o campo do e-mail');
    await pagina.mouse.click(campo[0], campo[1]);
    await pagina.keyboard.type(email, { delay: 40 });
    await pagina.waitForTimeout(800);
    // O "Avançar", clicado como o usuário (o Enter nem sempre passa).
    const avancar = await pagina.evaluate(async (s) => {
      const w = document.querySelector(s);
      const r = w.getBoundingClientRect();
      const c = await w.executeJavaScript('(() => { const e = document.querySelector("#identifierNext button, #identifierNext"); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()').catch(() => null);
      return c && [r.x + c[0], r.y + c[1]];
    }, wv);
    if (avancar) await pagina.mouse.click(avancar[0], avancar[1]);
    else await pagina.keyboard.press('Enter');
    let depois = [];
    for (let i = 0; i < 25; i++) {
      await pagina.waitForTimeout(1000);
      depois = await pagina.evaluate((s) => document.querySelector(s).executeJavaScript('[location.href, document.body.innerText.replace(/\\s+/g, " ").slice(0, 260)]'), wv).catch(() => []);
      if (depois[0] && !/\/signin\/identifier/.test(depois[0])) break;
      if (/Não foi possível|Couldn.t|No se pudo/i.test(depois[1] || '')) break;
    }
    console.log('depois do e-mail:', JSON.stringify(depois), /rejected|não ser seguro|may not be secure|no sea seguro/i.test(depois.join(' ')) ? 'RECUSADO' : /\/signin\/identifier/.test(depois[0] || '') ? 'PARADO no e-mail' : 'aceito');
    console.log('pedidos:', JSON.stringify(await app.evaluate(() => globalThis.__login)));
    console.log('erros da página:', JSON.stringify(await pagina.evaluate(() => window.__consoleLogin)));
    await foto('login-google-email');
    await pagina.evaluate((s) => document.querySelector(s).loadURL('https://www.wikipedia.org/'), wv).catch(() => { });
    await pagina.waitForTimeout(6000);
    console.log('noutro site:', JSON.stringify(await ler()));
  },

  // O vídeo em janela flutuante (o PiP do Chromium): pelo menu Exibir, e ele continua tocando com o
  // Navegador minimizado. O vídeo de exemplo é feito pelo ffmpeg; a foto da tela inteira, pelo import.
  async pip() {
    const http = await import('node:http');
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'retro-pip-'));
    execFileSync('ffmpeg', ['-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=duration=20:size=320x240:rate=25', '-c:v', 'libvpx', '-b:v', '300k', path.join(pasta, 'v.webm')]);
    const video = fs.readFileSync(path.join(pasta, 'v.webm'));
    const servidor = http.createServer((req, res) => {
      if (req.url === '/v.webm') { res.writeHead(200, { 'Content-Type': 'video/webm', 'Content-Length': video.length }); return res.end(video); }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<!doctype html><meta charset="utf-8"><title>Vídeo</title><body style="font-family:sans-serif;padding:20px"><h1>Vídeo de teste</h1><video id="v" src="/v.webm" loop muted autoplay width="320" height="240"></video></body>');
    });
    await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
    servidor.unref();
    await fecharTudo();
    await abrir('navegador', { url: `http://127.0.0.1:${servidor.address().port}/`, interno: true });
    await pagina.waitForTimeout(4000);
    const wv = '.janela.ativa .nav-conteudo:not(.escondida) webview';
    const estado = () => pagina.evaluate((s) => document.querySelector(s).executeJavaScript('({ flutuando: !!document.pictureInPictureElement, pausado: document.getElementById("v").paused, tempo: Math.round(document.getElementById("v").currentTime * 10) / 10 })'), wv);
    console.log('antes:', JSON.stringify(await estado()));
    await pagina.click(`.janela.ativa .menubar > div:has-text("${T('E&xibir').replace('&', '')}")`);
    await pagina.waitForTimeout(300);
    await pagina.click(`.menu .opcao:has-text("${T('Vídeo em janela flu&tuante').replace('&', '')}")`);
    await pagina.waitForTimeout(2000);
    console.log('no menu Exibir:', JSON.stringify(await estado()));
    await pagina.evaluate(() => window.__retro.janelas.janelaAtiva().minimizar());
    await pagina.waitForTimeout(3000);
    const minimizado = await pagina.evaluate((s) => document.querySelector(s).executeJavaScript('({ flutuando: !!document.pictureInPictureElement, pausado: document.getElementById("v").paused, tempo: Math.round(document.getElementById("v").currentTime * 10) / 10 })'), '.janela.minimizada .nav-conteudo:not(.escondida) webview');
    console.log('com o Navegador minimizado:', JSON.stringify(minimizado));
    try { execFileSync('import', ['-window', 'root', path.join(SAIDA, `${String(++n).padStart(2, '0')}-pip-tela-inteira.png`)]); console.log('captura: tela inteira'); } catch (e) { console.log('sem o import:', e.message); }
  },

  // As abas e a barra de favoritos do Navegador (com uma página de teste local, com ícone): a estrela,
  // o Ctrl+T, o botão do meio num link (a aba por trás), o Ctrl+Tab, o Ctrl+W, o Ctrl+Shift+T e o »
  // numa janela estreita. E o painel de visualização numa janela estreita, que não sai da janela.
  async abas() {
    const http = await import('node:http');
    const icone = fs.readFileSync(path.join(RAIZ, 'src', 'sistema', 'icones', '32', 'xadrez.png'));
    const pag = (titulo, corpo) => `<!doctype html><meta charset="utf-8"><title>${titulo}</title><body style="font-family:sans-serif;padding:20px"><h1>${titulo}</h1>${corpo}</body>`;
    const servidor = http.createServer((req, res) => {
      if (req.url === '/favicon.ico') { res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(icone); }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      if (req.url === '/b') return res.end(pag('Página B', '<p><a id="l" href="/c">Abrir a página C</a></p>'));
      if (req.url === '/c') return res.end(pag('Página C', ''));
      res.end(pag('Página A', '<p>A primeira página.</p>'));
    });
    await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
    servidor.unref();
    const base = `http://127.0.0.1:${servidor.address().port}`;
    const abas = () => pagina.evaluate(() => [...document.querySelectorAll('.janela.ativa .nav-aba')].map((a) => (a.classList.contains('ativa') ? '*' : '') + a.textContent.trim()));
    await fecharTudo();
    await pagina.evaluate(() => window.__retro.definirConfig({ navegador: { favoritos: null } }));
    await abrir('navegador', { interno: true });
    await pagina.waitForTimeout(800);
    await pagina.evaluate((j) => { const w = window.__retro.janelas.janelaAtiva(); w.ret = { x: 10, y: 10, w: 900, h: 560 }; w.aplicarRet(); }, null);
    await pagina.fill('.janela.ativa .nav-endereco', base + '/a');
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(2500);
    // A estrela: guarda a página nos favoritos (com o ícone do site).
    await pagina.click('.janela.ativa .nav-estrela');
    await pagina.waitForTimeout(500);
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(1200);
    console.log('favoritos:', JSON.stringify(await pagina.evaluate(() => (window.__retro.estado.config.navegador.favoritos || []).map((f) => [f.nome, !!f.icone]))));
    // Ctrl+T (com o foco no endereço) e a página B.
    await pagina.click('.janela.ativa .nav-endereco');
    await pagina.keyboard.press('Control+t');
    await pagina.waitForTimeout(600);
    await pagina.keyboard.type(base + '/b');
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(2500);
    // O botão do meio no link: a página C abre numa aba por trás.
    const r = await pagina.evaluate(() => { const b = document.querySelector('.janela.ativa .nav-conteudo:not(.escondida) webview').getBoundingClientRect(); return { x: b.left, y: b.top }; });
    const p = await pagina.evaluate(() => document.querySelector('.janela.ativa .nav-conteudo:not(.escondida) webview').executeJavaScript("(() => { const b = document.getElementById('l').getBoundingClientRect(); return { x: b.left + 10, y: b.top + b.height / 2 }; })()"));
    await pagina.mouse.click(r.x + p.x, r.y + p.y, { button: 'middle' });
    await pagina.waitForTimeout(2500);
    console.log('abas:', JSON.stringify(await abas()));
    await foto('navegador-abas');
    await pagina.click('.janela.ativa .nav-endereco');
    await pagina.keyboard.press('Control+Tab');
    await pagina.waitForTimeout(400);
    console.log('Ctrl+Tab:', JSON.stringify(await abas()));
    await pagina.click('.janela.ativa .nav-endereco');
    await pagina.keyboard.press('Control+w');
    await pagina.waitForTimeout(400);
    console.log('Ctrl+W:', JSON.stringify(await abas()));
    await pagina.click('.janela.ativa .nav-endereco');
    await pagina.keyboard.press('Control+Shift+T');
    await pagina.waitForTimeout(1500);
    console.log('Ctrl+Shift+T:', JSON.stringify(await abas()));
    // Mais favoritos e a janela estreita: o ».
    await pagina.evaluate((b) => window.__retro.definirConfig({ navegador: { favoritos: [...window.__retro.estado.config.navegador.favoritos, ...['Notícias', 'Tribunal', 'Pesquisa de jurisprudência', 'Agenda do gabinete', 'Biblioteca', 'Vídeos'].map((n, i) => ({ nome: n, url: b + '/a?' + i }))] } }), base);
    await pagina.evaluate(() => { const w = window.__retro.janelas.janelaAtiva(); w.ret.w = 560; w.aplicarRet(); w.ev.emit('tamanho'); });
    await pagina.waitForTimeout(800);
    console.log('na barra:', await pagina.evaluate(() => [...document.querySelectorAll('.janela.ativa .nav-link')].filter((b) => !b.hidden).length), '| » à vista:', await pagina.evaluate(() => !document.querySelector('.janela.ativa .nav-mais').hidden));
    await foto('navegador-abas-estreita');
    servidor.close();
    // O painel de visualização largo numa janela estreita (como ele ficava na Lixeira).
    await fecharTudo();
    await pagina.evaluate(() => window.__retro.definirConfig({ explorador: { visualizar: true, largVis: 1000 } }));
    await abrir('explorador', { pasta: '::lixeira' });
    await pagina.waitForTimeout(900);
    await pagina.evaluate(() => { const w = window.__retro.janelas.janelaAtiva(); w.ret = { x: 40, y: 30, w: 620, h: 360 }; w.aplicarRet(); });
    await pagina.waitForTimeout(500);
    console.log('painel dentro da janela:', JSON.stringify(await pagina.evaluate(() => { const j = document.querySelector('.janela.ativa').getBoundingClientRect(); const v = document.querySelector('.janela.ativa .exp-vis').getBoundingClientRect(); const l = document.querySelector('.janela.ativa .lista-arquivos').getBoundingClientRect(); return { dentro: v.right <= j.right, lista: Math.round(l.width) }; })));
    await foto('lixeira-visualizar-estreita');
    await pagina.evaluate(() => window.__retro.definirConfig({ explorador: { visualizar: false, largVis: null } }));
  },

  async vitrine() {
    await fecharTudo();
    const lances = ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'c2c3', 'g8f6', 'd2d4', 'e5d4', 'c3d4', 'c5b4', 'b1c3', 'f6e4', 'e1g1', 'e4c3', 'b2c3', 'b4c3'];
    await pagina.evaluate((l) => window.__retro.definirConfig({ jogos: { xadrez: { oponente: 'computador', nivel: 'medio', partida: { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', lances: l } } } }), lances);
    await abrir('xadrez');
    await pagina.waitForTimeout(1500);
    await foto('xadrez-partida');
  },

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

  // O tema Mac clássico (Painel › Aparência › Tema): a escolha, a mesa com a barra de menus no alto e a
  // Faixa de controle, as janelas com o título listrado, os menus da janela da frente e os da área de
  // trabalho, o menu do logotipo e o dos programas, uma janela recolhida, uma caixa de diálogo, os
  // controles do Painel e a volta para o tema do PC.
  async temaMac() {
    await fecharTudo();
    const estadoTema = () => pagina.evaluate(() => ({
      classe: document.documentElement.classList.contains('tema-mac'),
      barraMac: (({ x, y, width: w, height: h }) => ({ x, y, w, h }))(document.getElementById('barra-mac').getBoundingClientRect()),
      menus: [...document.querySelectorAll('#barra-mac .menubar > div')].map((d) => d.textContent),
      app: document.querySelector('#barra-mac .bm-app') && document.querySelector('#barra-mac .bm-app').textContent,
      barraTarefas: getComputedStyle(document.getElementById('barra')).display,
      faixa: [...document.querySelectorAll('#faixa-controle .fc-botoes button')].length,
      lixeira: (() => { const el = [...document.querySelectorAll('#mesa .item')].find((e) => /^(Lixeira|Trash|Papelera)$/.test(e.textContent)); return el ? (({ x, y }) => ({ x, y }))(el.getBoundingClientRect()) : null; })(),
      icones: [...document.querySelectorAll('#mesa .item img')].slice(0, 3).map((i) => i.getAttribute('src')),
    }));
    await abrir('painel', { secao: 'aparencia', aba: 'tema' });
    await pagina.waitForTimeout(600);
    await foto('tema-escolha-pc');
    await pagina.locator('.janela.ativa .tema-opcao', { hasText: T('Mac clássico') }).click();
    await pagina.waitForTimeout(200);
    await pagina.locator('.janela.ativa button', { hasText: T('OK') }).first().click();
    await pagina.waitForTimeout(1200);
    console.log('no tema Mac:', JSON.stringify(await estadoTema()), '| fundo:', JSON.stringify(await pagina.evaluate(() => window.__retro.estado.config.papel)));
    await foto('tema-mac-mesa');
    // A Faixa de controle começa recolhida (só a ponta); um clique na ponta a abre.
    const faixaVista = () => pagina.evaluate(() => ({ largura: Math.round(document.getElementById('faixa-controle').getBoundingClientRect().width), aberta: !document.querySelector('#faixa-controle .fc-modulos').hidden }));
    console.log('faixa recolhida:', JSON.stringify(await faixaVista()));
    await pagina.click('#faixa-controle .fc-ponta');
    await pagina.waitForTimeout(400);
    console.log('faixa aberta pela ponta:', JSON.stringify(await faixaVista()));
    // Duas janelas: o Explorador na frente, com os menus dele no alto.
    await abrir('bloco');
    await pagina.waitForTimeout(400);
    await pagina.keyboard.type('Um texto no Bloco de notas, no tema Mac clássico.');
    await abrir('explorador', { pasta: DOCS });
    await pagina.waitForTimeout(800);
    console.log('com o Explorador na frente:', JSON.stringify(await estadoTema()));
    await foto('tema-mac-janelas');
    await pagina.locator('#barra-mac .menubar > div').first().dispatchEvent('mousedown');
    await pagina.waitForTimeout(300);
    await foto('tema-mac-menu-arquivo');
    await pagina.keyboard.press('Escape');
    // O menu do logotipo (o Iniciar) e o dos programas abertos.
    await pagina.locator('#barra-mac .bm-logo').dispatchEvent('mousedown');
    await pagina.waitForTimeout(300);
    await foto('tema-mac-menu-logotipo');
    await pagina.keyboard.press('Escape');
    await pagina.locator('#barra-mac .bm-app').dispatchEvent('mousedown');
    await pagina.waitForTimeout(300);
    await foto('tema-mac-menu-programas');
    await pagina.keyboard.press('Escape');
    // O Bloco recolhido (duplo clique no título): só a barra de título fica.
    await pagina.evaluate(() => window.__retro.janelas.lista.find((j) => j.el.classList.contains('bloco')).focar());
    await pagina.waitForTimeout(200);
    await pagina.locator('.janela.ativa .titulo .texto').dblclick();
    await pagina.waitForTimeout(300);
    console.log('recolhida:', await pagina.evaluate(() => { const j = window.__retro.janelas.lista.find((x) => x.el.classList.contains('bloco')); return { recolhida: !!j.recolhida, altura: Math.round(j.el.getBoundingClientRect().height) }; }));
    await foto('tema-mac-recolhida');
    // A área de trabalho na frente: os menus dela.
    await pagina.mouse.click(600, 600);
    await pagina.waitForTimeout(300);
    console.log('com a mesa na frente:', JSON.stringify(await estadoTema()));
    await pagina.locator('#barra-mac .menubar > div', { hasText: T('E&special').replace('&', '') }).dispatchEvent('mousedown');
    await pagina.waitForTimeout(300);
    await foto('tema-mac-menu-especial');
    await pagina.keyboard.press('Escape');
    // Uma caixa de diálogo e os controles do Painel.
    await fecharTudo();
    await abrir('painel', { secao: 'aparencia' });
    await pagina.waitForTimeout(600);
    await pagina.locator('.janela.ativa .abas > *', { hasText: T('Efeitos') }).click();
    await pagina.waitForTimeout(300);
    await foto('tema-mac-painel-efeitos');
    await pagina.locator('.janela.ativa .abas > *', { hasText: T('Configurações') }).click();
    await pagina.waitForTimeout(300);
    await foto('tema-mac-painel-config');
    await pagina.locator('.janela.ativa button', { hasText: T('Cancelar') }).first().click();
    await pagina.waitForTimeout(300);
    // As opções da Faixa de controle: aberta ou não e os ícones dela, um a um (o Volume desmarcado some).
    await abrir('painel', { secao: 'barra' });
    await pagina.waitForTimeout(600);
    await pagina.locator('.janela.ativa label', { hasText: T('Volume') }).first().click();
    await foto('tema-mac-painel-barra');
    await pagina.locator('.janela.ativa button', { hasText: T('OK') }).first().click();
    await pagina.waitForTimeout(400);
    console.log('sem o volume:', JSON.stringify(await pagina.evaluate(() => ({ ocultos: window.__retro.estado.config.barra.ocultos, visiveis: [...document.querySelectorAll('#faixa-controle #bandeja > .bandeja-ico')].filter((e) => getComputedStyle(e).display !== 'none').map((e) => e.getAttribute('src') || e.className) }))));
    await pagina.evaluate(() => window.__retro.definirConfig({ barra: { ocultos: [] } }));
    await pagina.waitForTimeout(300);
    await pagina.evaluate(() => import('./js/dialogos.js').then((m) => { m.confirmar('Esvaziar a Lixeira? Os 3 itens são apagados de vez.', { titulo: 'Lixeira' }); }));
    await pagina.waitForTimeout(400);
    await foto('tema-mac-dialogo');
    await pagina.keyboard.press('Escape');
    await pagina.waitForTimeout(200);
    // A Faixa de controle: os fixados, a lupa da busca e os ícones da bandeja; a lupa abre o campo.
    console.log('faixa:', JSON.stringify(await pagina.evaluate(() => ({ direita: [...document.querySelectorAll('#barra-mac .bm-direita > :not([hidden])')].map((e) => e.className || e.tagName), modulos: [...document.querySelectorAll('#faixa-controle .fc-modulos #bandeja > :not([hidden])')].length, busca: !!document.querySelector('#faixa-controle #busca-barra'), alturas: ['#faixa-controle', '#faixa-controle .fc-botoes', '#faixa-controle .fc-modulos', '#faixa-controle #busca-barra', '#faixa-controle #bandeja'].map((s) => { const r = document.querySelector(s).getBoundingClientRect(); return `${s.split(' ').pop()} ${Math.round(r.top)}+${Math.round(r.height)}`; }) }))));
    await pagina.click('#faixa-controle #busca-barra');
    await pagina.keyboard.type('calc');
    await pagina.waitForTimeout(900);
    await foto('tema-mac-busca');
    await pagina.keyboard.press('Escape');
    await pagina.mouse.click(600, 400);
    await pagina.waitForTimeout(300);
    console.log('busca fechada:', await pagina.evaluate(() => !document.querySelector('#busca-barra').classList.contains('aberta')));
    // O calendário do relógio e um aviso: os dois descem da barra de menus, no canto de cima.
    await pagina.click('#barra-mac .relogio');
    await pagina.waitForTimeout(400);
    const lugar = (sel) => pagina.evaluate((s) => { const el = document.querySelector(s); return el ? (({ x, y, right: d }) => ({ x: Math.round(x), y: Math.round(y), direita: Math.round(d) }))(el.getBoundingClientRect()) : null; }, sel);
    console.log('calendário:', JSON.stringify(await lugar('.calendario')));
    await foto('tema-mac-calendario');
    await pagina.keyboard.press('Escape');
    await pagina.waitForTimeout(200);
    await pagina.evaluate(() => import('./js/sistema.js').then((m) => m.avisar('Cópia de segurança', 'A cópia do disco C: terminou.', { guardar: false, som: null })));
    await pagina.waitForSelector('.aviso-balao');
    await pagina.waitForTimeout(400);
    console.log('aviso:', JSON.stringify(await lugar('.aviso-balao')));
    await foto('tema-mac-aviso');
    await pagina.evaluate(() => document.querySelectorAll('.aviso-balao').forEach((b) => b.remove()));
    // A tecla do logotipo abre o menu do logotipo, no alto.
    await tecla('iniciar');
    await pagina.waitForTimeout(300);
    console.log('tecla do logotipo:', await pagina.evaluate(() => { const m = document.querySelector('.menu.iniciar'); return m ? Math.round(m.getBoundingClientRect().top) : null; }));
    await pagina.keyboard.press('Escape');
    // O Navegador no tema (a página inicial, as abas e os favoritos).
    await abrir('navegador', { interno: true });
    await pagina.waitForTimeout(1500);
    await pagina.evaluate(() => window.__retro.janelas.janelaAtiva().maximizar());
    await pagina.waitForTimeout(500);
    await foto('tema-mac-navegador');
    await fecharTudo();
    // A abertura do tema: a caixa com a marca e a barra, e os ícones aparecendo embaixo.
    const fim = pagina.evaluate(() => window.__retro.mostrarAbertura());
    await pagina.waitForSelector('#boot .abertura-mac', { timeout: 10000 });
    await pagina.waitForTimeout(1100);
    await foto('tema-mac-abertura');
    await fim;
    await pagina.waitForTimeout(300);
    // A volta para o tema do PC: a barra de tarefas, o fundo de sempre e as barras de menus nas janelas.
    await abrir('explorador', { pasta: DOCS });
    await pagina.waitForTimeout(500);
    await pagina.evaluate(() => window.__retro.definirConfig({ tema: 'pc', papel: { cor: '#008080', padrao: 'nenhum' } }));
    await pagina.waitForTimeout(800);
    console.log('de volta ao PC:', JSON.stringify(await estadoTema()), '| barra de menus na janela:', await pagina.evaluate(() => !!document.querySelector('.janela.ativa > .menubar')));
    await foto('tema-pc-de-volta');
  },

  // As duas telas em tela cheia (Windows e Mac), com dois monitores de mentira de tamanhos diferentes:
  // RETRO_MONITORES_FALSOS="1024x768+0+0,1280x800+1024+0" e o Xvfb com "-screen 0 2304x800x24".
  // A opção do Painel, a barra e os ícones na principal, o papel de parede em cada tela, maximizar e
  // encaixar em cada uma, arrastar a janela para a outra, os menus na borda, o bloqueio na principal
  // e a volta para uma tela só.
  async duasTelas() {
    await fecharTudo();
    const telas = () => pagina.evaluate(() => ({ classe: document.documentElement.classList.contains('varias-telas'), fundos: document.querySelectorAll('#tela > .fundo-tela').length, area: `${innerWidth} x ${innerHeight}`, barra: (({ x, y, width: w, height: h }) => ({ x, y, w, h }))(document.getElementById('barra').getBoundingClientRect()) }));
    const ret = () => pagina.evaluate(() => { const j = window.__retro.janelas.janelaAtiva(); const r = j.el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), max: j.maximizada, enc: j.encaixe }; });
    // Os botões de cada barra: a principal (todas as janelas) e a de cada outra tela (só as que estão nela).
    const barras = () => pagina.evaluate(() => ({ principal: [...document.querySelectorAll('#tarefas button')].map((b) => b.textContent), outras: [...document.querySelectorAll('.barra-tela')].map((el) => ({ x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y), w: Math.round(el.getBoundingClientRect().width), botoes: [...el.querySelectorAll('.tarefas button')].map((b) => b.textContent) })) }));
    await abrir('painel', { secao: 'aparencia' });
    await pagina.waitForTimeout(500);
    await pagina.locator('.janela.ativa .abas > *', { hasText: T('Configurações') }).click();
    await pagina.waitForTimeout(600);
    await pagina.locator('.janela.ativa label', { hasText: T('Usar as duas telas na tela cheia') }).click();
    await pagina.waitForTimeout(200);
    await foto('duas-telas-opcao');
    await pagina.locator('.janela.ativa button', { hasText: T('OK') }).first().click();
    await pagina.waitForTimeout(3000);
    console.log('guardado:', JSON.stringify(await pagina.evaluate(() => window.__retro.estado.config.tela)), '| no principal:', JSON.stringify(await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; return { cheia: w.isFullScreen(), ret: w.getBounds() }; })));
    console.log('telas:', JSON.stringify(await telas()));
    await foto('duas-telas-mesa');
    // A opção da barra em todas as telas, no Painel › Barra de tarefas (só aparece com mais de um monitor).
    await abrir('painel', { secao: 'barra' });
    await pagina.waitForTimeout(600);
    await foto('duas-telas-painel-barra');
    await fecharTudo();
    // O Bloco de notas maximizado na principal; o Explorador arrastado para a outra e maximizado lá.
    await abrir('bloco');
    await pagina.waitForTimeout(400);
    await pagina.keyboard.type('Na tela principal.');
    await pagina.evaluate(() => window.__retro.janelas.janelaAtiva().maximizar());
    await pagina.waitForTimeout(300);
    console.log('Bloco maximizado:', JSON.stringify(await ret()));
    await abrir('explorador', { pasta: DOCS });
    await pagina.waitForTimeout(600);
    let b = await pagina.locator('.janela.ativa .titulo .texto').boundingBox();
    await pagina.mouse.move(b.x + 20, b.y + 6);
    await pagina.mouse.down();
    await pagina.mouse.move(1300, 200, { steps: 8 });
    await pagina.mouse.move(1500, 260, { steps: 4 });
    await pagina.mouse.up();
    await pagina.waitForTimeout(300);
    console.log('Explorador na outra tela:', JSON.stringify(await ret()), '| barras:', JSON.stringify(await barras()));
    await foto('duas-telas-arrastada');
    await pagina.evaluate(() => window.__retro.janelas.janelaAtiva().maximizar());
    await pagina.waitForTimeout(300);
    console.log('Explorador maximizado na outra:', JSON.stringify(await ret()));
    await foto('duas-telas-maximizadas');
    await pagina.evaluate(() => window.__retro.janelas.janelaAtiva().restaurar());
    await pagina.waitForTimeout(300);
    // Os cantos magnéticos na borda da outra tela (a da direita) e na borda entre as duas.
    b = await pagina.locator('.janela.ativa .titulo .texto').boundingBox();
    await pagina.mouse.move(b.x + 20, b.y + 6);
    await pagina.mouse.down();
    await pagina.mouse.move(2000, 300, { steps: 6 });
    await pagina.mouse.move(2303, 300, { steps: 6 });
    await pagina.waitForTimeout(200);
    await foto('duas-telas-previa-direita');
    await pagina.mouse.up();
    await pagina.waitForTimeout(300);
    console.log('encaixada à direita da outra:', JSON.stringify(await ret()));
    // Logotipo+seta para a esquerda: a metade esquerda da mesma tela.
    await tecla('encaixe:ArrowLeft');
    await pagina.waitForTimeout(300);
    console.log('logotipo+esquerda:', JSON.stringify(await ret()));
    await foto('duas-telas-metades');
    // O botão direito no fundo da outra tela (o menu da área de trabalho), perto do canto: não passa da borda dela.
    const menuAberto = () => pagina.evaluate(() => { const m = [...document.querySelectorAll('.menu')].pop(); if (!m) return null; const r = m.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), direita: Math.round(r.right), baixo: Math.round(r.bottom), itens: m.querySelectorAll('.item, [role=menuitem]').length }; });
    await pagina.mouse.click(2280, 700, { button: 'right' });
    await pagina.waitForTimeout(300);
    console.log('menu no fundo da outra tela:', JSON.stringify(await menuAberto()));
    await foto('duas-telas-menu-fundo');
    await pagina.keyboard.press('Escape');
    await pagina.mouse.click(1700, 600);
    // O botão direito na barra da outra tela (no tema Mac não há barra nas outras telas, como no Mac:
    // a barra de menus fica só na principal).
    if (!temaMacLigado) {
      await pagina.mouse.click(1700, 786, { button: 'right' });
      await pagina.waitForTimeout(300);
      console.log('menu da barra da outra tela:', JSON.stringify(await menuAberto()));
      await foto('duas-telas-menu-barra');
      await pagina.keyboard.press('Escape');
      // O Iniciar da outra tela abre o menu lá; o da principal, na principal.
      await pagina.locator('.barra-tela .bt-iniciar').click();
      await pagina.waitForTimeout(300);
      console.log('Iniciar da outra tela:', JSON.stringify(await menuAberto()));
      await foto('duas-telas-iniciar-outra');
      await pagina.keyboard.press('Escape');
    }
    await pagina.click('#iniciar');
    await pagina.waitForTimeout(300);
    console.log('Iniciar da principal:', JSON.stringify(await menuAberto()));
    await foto('duas-telas-iniciar');
    await pagina.keyboard.press('Escape');
    // Desligada a barra das outras telas: a maximizada lá ocupa a tela inteira. (No tema Mac, o clique
    // no fundo deixou a área de trabalho na frente: o Explorador volta para a frente antes.)
    await pagina.evaluate(() => { const j = window.__retro.janelas.lista.find((x) => x.id === 'explorador'); j.focar(); j.maximizar(); });
    await pagina.waitForTimeout(200);
    console.log('maximizada com a barra:', JSON.stringify(await ret()));
    await pagina.evaluate(() => window.__retro.definirConfig({ barra: { todasTelas: false } }));
    await pagina.waitForTimeout(400);
    console.log('maximizada sem a barra:', JSON.stringify(await ret()), '| barras:', JSON.stringify(await barras()));
    await foto('duas-telas-sem-barra');
    await pagina.evaluate(() => window.__retro.definirConfig({ barra: { todasTelas: true } }));
    await pagina.waitForTimeout(400);
    await pagina.evaluate(() => window.__retro.janelas.janelaAtiva().restaurar());
    // O bloqueio no meio da principal (uma senha fingida só na página; a tela sai sem conferir).
    await pagina.evaluate(() => { window.__retro.estado.config.bloqueio = { ...(window.__retro.estado.config.bloqueio || {}), temSenha: true }; return import('./js/bloqueio.js').then((m) => m.bloquear()); });
    await pagina.waitForTimeout(800);
    console.log('caixa do bloqueio:', JSON.stringify(await pagina.evaluate(() => { const r = document.querySelector('#bloqueio .bloq-caixa').getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) }; })));
    await foto('duas-telas-bloqueio');
    await pagina.evaluate(() => document.getElementById('bloqueio').remove());
    // Desligar a opção: uma tela só de novo, e as janelas da outra voltam para a principal.
    await pagina.evaluate(() => retro.tela.usarDuasTelas(false));
    await pagina.waitForTimeout(2000);
    console.log('de volta:', JSON.stringify(await telas()), '| Explorador:', JSON.stringify(await ret()));
    await foto('duas-telas-uma');
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
    for (const secao of ['aparencia', 'barra', 'teclado', 'mouse', 'seguranca', 'firewall', 'senhas', 'usuarios', 'internet', 'sons', 'idioma', 'claude', 'disco', 'data', 'energia', 'acessibilidade', 'copia', 'impressoras', 'padroes', 'sobre']) {
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
    for (const topico of ['inicio', 'pendrives', 'pdf', 'busca', 'barra', 'internet', 'acessorios', 'painel', 'seguranca', 'linux', 'atalhos']) {
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
  // O texto do Claude no terminal (com RETRO_CLAUDE_FALSO apontando para um script que escreve um
  // texto como o dele: o negrito, os acentos, as aspas, as setas e as molduras), nos três tamanhos de letra.
  async claudeTexto() {
    await fecharTudo();
    await abrir('claude', { pasta: DOCS });
    await pagina.waitForTimeout(4000);
    await pagina.evaluate(() => { const j = window.__retro.janelas.janelaAtiva(); j.ret = { x: 0, y: 0, w: 1024, h: 660 }; j.aplicarRet(); });
    for (const tam of ['10', '15', '20']) {
      await pagina.selectOption('.janela.ativa .barra-ferramentas select >> nth=0', tam);
      await pagina.waitForTimeout(1500);
      await foto('claude-texto-' + tam);
    }
    // O fundo escuro (o aviso de que o Claude acompanha na próxima vez) e o Claude aberto de novo.
    await pagina.selectOption('.janela.ativa .barra-ferramentas select >> nth=0', '10');
    await pagina.selectOption('.janela.ativa .barra-ferramentas select >> nth=1', 'escuro');
    await pagina.waitForTimeout(800);
    await foto('claude-texto-escuro-aviso');
    await pagina.keyboard.press('Enter');
    console.log('tema guardado:', JSON.stringify(await pagina.evaluate(() => window.__retro.estado.config.prompt)));
    await fecharTudo();
    await abrir('claude', { pasta: DOCS });
    await pagina.waitForTimeout(4000);
    await pagina.evaluate(() => { const j = window.__retro.janelas.janelaAtiva(); j.ret = { x: 0, y: 0, w: 1024, h: 660 }; j.aplicarRet(); });
    await pagina.waitForTimeout(800);
    await foto('claude-texto-escuro');
  },
  async mesa() {
    // A área de trabalho padrão (sem o Prompt), o botão direito num programa do Iniciar e a aba
    // Área de trabalho de Painel › Aparência.
    await fecharTudo();
    await foto('mesa-padrao');
    await pagina.click('#iniciar');
    await pagina.waitForTimeout(300);
    await sobreProgramas();
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
  // O ícone da Lixeira: vazio, cheio depois de excluir e vazio de novo depois de esvaziar.
  async lixo() {
    await fecharTudo();
    const src = () => pagina.evaluate((nome) => [...document.querySelectorAll('#mesa .item')].find((e) => e.textContent.includes(nome)).querySelector('img').getAttribute('src'), T('Lixeira'));
    const fotoLixeira = async (nome) => {
      const caixa = await pagina.evaluate((n) => { const r = [...document.querySelectorAll('#mesa .item')].find((e) => e.textContent.includes(n)).getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }, T('Lixeira'));
      const arq = path.join(SAIDA, `${String(++n).padStart(2, '0')}-${nome}.png`);
      await pagina.screenshot({ path: arq, clip: { x: Math.max(0, caixa.x - 8), y: Math.max(0, caixa.y - 8), width: caixa.width + 16, height: caixa.height + 16 } });
      console.log('captura:', arq);
    };
    await pagina.evaluate(() => retro.disco.esvaziarLixeira());
    await pagina.waitForTimeout(1500);
    console.log('antes:', await src());
    await fotoLixeira('lixeira-vazia');
    await pagina.evaluate(async (docs) => {
      await retro.disco.gravar(`${docs}/apagar.txt`, new TextEncoder().encode('x'));
      await retro.disco.paraLixeira(`${docs}/apagar.txt`);
    }, DOCS);
    await pagina.waitForTimeout(1500);
    console.log('depois de excluir:', await src());
    await fotoLixeira('lixeira-cheia');
    await pagina.evaluate(() => retro.disco.esvaziarLixeira());
    await pagina.waitForTimeout(1500);
    console.log('depois de esvaziar:', await src());
    await fotoLixeira('lixeira-esvaziada');
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
    const wv = async (js) => pagina.evaluate(([c]) => document.querySelector('.janela.ativa .nav-conteudo:not(.escondida) webview').executeJavaScript(c), [js]);
    console.log('título:', await pagina.textContent('.janela.ativa .titulo .texto'));
    // Um clique de verdade (o Chromium não guarda no histórico a página anterior a um clique feito por código).
    const clicar = async (id) => {
      const r = await pagina.evaluate(() => { const b = document.querySelector('.janela.ativa .nav-conteudo:not(.escondida) webview').getBoundingClientRect(); return { x: b.left, y: b.top }; });
      const p = await wv(`(() => { const b = document.getElementById('${id}').getBoundingClientRect(); return { x: b.left + 10, y: b.top + b.height / 2 }; })()`);
      await pagina.mouse.click(r.x + p.x, r.y + p.y);
    };
    await clicar('link');
    await pagina.waitForTimeout(1500);
    console.log('depois do link:', await pagina.inputValue('.janela.ativa .nav-endereco'), '| voltar ativo:', !(await pagina.isDisabled('.janela.ativa .nav-linha .nav-bt >> nth=0')),
      '| canGoBack:', await pagina.evaluate(() => { const w = document.querySelector('.janela.ativa .nav-conteudo:not(.escondida) webview'); try { return [w.canGoBack(), w.getURL(), w.hidden]; } catch (e) { return String(e); } }));
    await pagina.click('.janela.ativa .nav-linha .nav-bt >> nth=0');
    await pagina.waitForTimeout(1500);
    console.log('depois de voltar:', await pagina.inputValue('.janela.ativa .nav-endereco'));
    // O link com target abre numa aba nova da mesma janela (como nos navegadores de hoje).
    const antes = await pagina.evaluate(() => document.querySelectorAll('.janela.ativa .nav-aba').length);
    await clicar('nova');
    await pagina.waitForTimeout(2500);
    console.log('abas do Navegador:', antes, '→', await pagina.evaluate(() => document.querySelectorAll('.janela.ativa .nav-aba').length));
    await pagina.click('.janela.ativa .nav-aba.ativa .nav-aba-fechar');
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
    const r = await pagina.evaluate(() => { const b = document.querySelector('.janela.ativa .nav-conteudo:not(.escondida) webview').getBoundingClientRect(); return { x: b.left, y: b.top }; });
    const campo = await wv("(() => { const b = document.getElementById('campo').getBoundingClientRect(); return { x: b.left + 20, y: b.top + 8 }; })()");
    await pagina.mouse.click(r.x + campo.x, r.y + campo.y, { button: 'right' });
    await pagina.waitForTimeout(800);
    await foto('navegador-menu');
    await pagina.keyboard.press('Escape');
    // Um site de verdade (se a rede deixar).
    await pagina.evaluate(() => { const w = document.querySelector('.janela.ativa .nav-conteudo:not(.escondida) webview'); window.__falhas = []; w.addEventListener('did-fail-load', (e) => window.__falhas.push([e.errorCode, e.errorDescription, e.validatedURL])); });
    // Um clique de verdade no campo (o foco do teclado sai da página).
    await pagina.click('.janela.ativa .nav-endereco');
    await pagina.keyboard.press('Control+a');
    await pagina.keyboard.type('example.com');
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(3000);
    console.log('example.com, depois de 3 s:', JSON.stringify(await pagina.evaluate(() => { const w = document.querySelector('.janela.ativa .nav-conteudo:not(.escondida) webview'); return { url: w.getURL(), carregando: w.isLoading(), falhas: window.__falhas, campo: document.querySelector('.janela.ativa .nav-endereco').value }; })));
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

  // O programa Discos (com RETRO_UNIDADES_FALSAS: o pendrive de mentira e um segundo, com o Linux
  // gravado; a senha de teste é "certa"): a lista, o botão direito, formatar o disco inteiro, gravar
  // uma imagem com o andamento e o espaço do disco C: com a limpeza.
  async discos() {
    const receb = path.join(disco, DOCS, PASTAS[IDIOMA].recebidos);
    fs.mkdirSync(receb, { recursive: true });
    fs.writeFileSync(path.join(receb, 'linuxmint-22.3-xfce-64bit.iso'), Buffer.alloc(3 << 20, 7));
    // Uma versão anterior de dois meses atrás, para a limpeza.
    const pv = path.join(disco, '.versoes', DOCS, 'carta.txt');
    fs.mkdirSync(pv, { recursive: true });
    fs.writeFileSync(path.join(pv, new Date(Date.now() - 60 * 86400000).toISOString().replace(/[:.]/g, '-') + '.txt'), Buffer.alloc(420 << 10, 65));
    await fecharTudo();
    await abrir('discos');
    await pagina.waitForTimeout(1200);
    await foto('discos-lista');
    await pagina.click('.janela.ativa .mon-linha:has-text("Kingston")', { button: 'right' });
    await pagina.waitForTimeout(300);
    await foto('discos-menu');
    await pagina.keyboard.press('Escape');
    // Formatar o disco inteiro (o pendrive com o Linux gravado, sem nada à vista).
    await pagina.click(`.janela.ativa button:has-text("${T('Formatar…')}")`);
    await pagina.waitForTimeout(600);
    await foto('discos-formatar');
    await pagina.click(`.janela.ativa button:has-text("${T('Fechar')}")`);
    await pagina.waitForTimeout(300);
    // Gravar a imagem no pendrive de mentira, com a senha de teste.
    await pagina.click('.janela.ativa .mon-linha:has-text("SanDisk")');
    await pagina.click(`.janela.ativa button:has-text("${T('Gravar imagem…')}")`);
    await pagina.waitForTimeout(800);
    await pagina.dblclick(`.janela.ativa .lista-arquivos .item:has-text("${PASTAS[IDIOMA].recebidos}")`);
    await pagina.waitForTimeout(600);
    await foto('discos-escolher');
    await pagina.dblclick('.janela.ativa .lista-arquivos .item:has-text("linuxmint")');
    await pagina.waitForTimeout(500);
    await foto('discos-aviso');
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(400);
    await pagina.keyboard.type('certa');
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(1300);
    await foto('discos-gravando');
    await pagina.waitForSelector('.janela.ativa .msg-info, .janela.ativa img[src*="msg-info"]', { timeout: 20000 }).catch(() => { });
    await pagina.waitForTimeout(600);
    await foto('discos-gravada');
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(400);
    // O espaço do disco C: e a limpeza.
    await pagina.click(`.janela.ativa .abas > div:has-text("${T('Espaço em disco')}")`);
    await pagina.waitForTimeout(1500);
    await foto('discos-espaco');
    await pagina.click(`.janela.ativa button:has-text("${T('Limpar…')}")`);
    await pagina.waitForTimeout(500);
    await foto('discos-limpar');
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(1500);
    await foto('discos-limpo');
    console.log('versão antiga apagada?', !fs.existsSync(pv));
    await pagina.keyboard.press('Enter');
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
    console.log('relógio:', await pagina.evaluate(() => document.querySelector('#bandeja .relogio, #barra-mac .relogio').innerText.replace(/\n/g, ' | ')));
  },

  // A loja de programas. Com RETRO_LOJA_FALSA=1, a do Linux (o Flathub de verdade, o flatpak de mentira);
  // com =winget, a do Windows (os manifestos de verdade, o winget de mentira); com =brew, a do Mac
  // (a lista do Homebrew de verdade, o brew de mentira). As fotos levam o nome da loja.
  async loja() {
    const qual = { winget: 'winget', brew: 'brew' }[process.env.RETRO_LOJA_FALSA] || 'linux';
    const fotoLoja = (n) => foto(qual === 'linux' ? n : n.replace('loja-', `loja-${qual}-`));
    await fecharTudo();
    await abrir('programas', { aba: 'loja' });
    await pagina.waitForSelector('.janela.ativa .loja-item', { timeout: 30000 }).catch(() => console.log('a lista não carregou'));
    // No winget e no Homebrew, os ícones vêm dos sites dos programas: um tempo a mais.
    await pagina.waitForTimeout(qual === 'linux' ? 2500 : 9000);
    await fotoLoja('loja-mais-usados');
    console.log('ícones:', await pagina.evaluate(() => [...document.querySelectorAll('.janela.ativa .loja-item img')].filter((i) => i.src.startsWith('data:')).length));
    console.log('itens:', await pagina.locator('.janela.ativa .loja-item').count());
    await pagina.fill('.janela.ativa .loja-topo input', qual === 'linux' ? 'libreoffice' : 'firefox');
    await pagina.keyboard.press('Enter');
    await pagina.waitForSelector('.janela.ativa .loja-item.sel', { timeout: 20000 });
    await pagina.waitForSelector('.janela.ativa .ficha-dados', { timeout: 20000 }).catch(() => console.log('a ficha não carregou'));
    await pagina.waitForTimeout(2500);
    await fotoLoja('loja-ficha');
    console.log('ficha:', (await pagina.textContent('.janela.ativa .loja-ficha')).slice(0, 200));
    await pagina.click('.janela.ativa .loja-botoes button >> text=' + T('Instalar'));
    await pagina.waitForTimeout(900);
    await fotoLoja('loja-instalando');
    await pagina.waitForFunction(() => !document.querySelector('.janela.ativa .loja-botoes button[hidden]') === false, null, { timeout: 15000 }).catch(() => { });
    await pagina.waitForTimeout(2500);
    console.log('estado:', await pagina.textContent('.janela.ativa .loja-estado'));
    console.log('no menu:', JSON.stringify(await pagina.evaluate(() => (window.__retro.estado.config.nativos || {}).menu || [])));
    await pagina.selectOption('.janela.ativa .loja-topo select', ':instalados');
    await pagina.waitForTimeout(2500);
    await fotoLoja('loja-instalados');
    // No Mac, o instalador .pkg pede a senha: o mesmo comando vai para o Prompt.
    if (qual === 'brew') {
      await pagina.selectOption('.janela.ativa .loja-topo select', '');
      await pagina.fill('.janela.ativa .loja-topo input', 'zoom');
      await pagina.keyboard.press('Enter');
      await pagina.waitForSelector('.janela.ativa .loja-item.sel[data-id="zoom"]', { timeout: 20000 }).catch(() => console.log('o zoom não apareceu'));
      await pagina.waitForTimeout(800);
      await pagina.click('.janela.ativa .loja-botoes button >> text=' + T('Instalar'));
      await pagina.waitForTimeout(2500);
      await fotoLoja('loja-senha');
      await pagina.keyboard.press('Escape');
      await pagina.waitForTimeout(400);
    }
    // A primeira aba continua a dos programas do Retro Computer.
    await pagina.click('.janela.ativa .abas > div >> nth=0');
    await pagina.waitForTimeout(500);
    await fotoLoja('loja-aba-retro');
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

  // Arrastar para reorganizar a barra: os botões das janelas, os fixados (com o nome) e os
  // programas (só os ícones). O clique de soltar não pode abrir nem minimizar nada.
  async reorganizar() {
    await fecharTudo();
    await pagina.evaluate(() => retro.config.definir({ barra: { botoes: 'nomes', fixados: ['navegador', 'bloco', 'calculadora'] } }));
    await pagina.evaluate(async () => { const s = await import('./js/sistema.js'); await s.definirConfig({}); });
    await abrir('bloco');
    await abrir('calculadora');
    await abrir('explorador', { pasta: DOCS });
    await pagina.waitForTimeout(800);
    const titulos = (sel) => pagina.evaluate((s) => [...document.querySelectorAll(s)].map((b) => b.title || b.dataset.dica || ''), sel);
    const estados = () => pagina.evaluate(() => window.__retro.janelas.lista.filter((j) => !j.dialogo).map((j) => (j.minimizada ? 'min' : 'ok')).join(','));
    // Arrasta do centro de um botão até um ponto, em passos, como a mão.
    const arrastar = async (de, ateX, foto1) => {
      const r = await pagina.locator(de).boundingBox();
      await pagina.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
      await pagina.mouse.down();
      const passos = 12;
      for (let i = 1; i <= passos; i++) {
        await pagina.mouse.move(r.x + r.width / 2 + ((ateX - (r.x + r.width / 2)) * i) / passos, r.y + r.height / 2);
        await pagina.waitForTimeout(30);
      }
      if (foto1) await foto(foto1);
      await pagina.mouse.up();
      await pagina.waitForTimeout(500);
    };
    console.log('janelas antes:', JSON.stringify(await titulos('#tarefas button')), '| estados:', await estados());
    await foto('reorganizar-antes');
    // A primeira janela (o Bloco de notas) vai para o fim.
    const fim = await pagina.locator('#tarefas button >> nth=-1').boundingBox();
    await arrastar('#tarefas button >> nth=0', fim.x + fim.width - 4, 'reorganizar-arrastando');
    console.log('janelas depois:', JSON.stringify(await titulos('#tarefas button')), '| estados:', await estados());
    await foto('reorganizar-janelas');
    // Uma janela nova entra no fim, sem desfazer a ordem.
    await abrir('navegador');
    await pagina.waitForTimeout(800);
    console.log('com mais uma:', JSON.stringify(await titulos('#tarefas button')));
    // O último fixado (a Calculadora) vai para o começo e fica guardado.
    const ini = await pagina.locator('#fixados button >> nth=0').boundingBox();
    await arrastar('#fixados button >> nth=-1', ini.x + 2);
    console.log('fixados:', JSON.stringify(await pagina.evaluate(() => window.__retro.estado.config.barra.fixados)), '| janelas abertas:', await pagina.evaluate(() => window.__retro.janelas.lista.length));
    await foto('reorganizar-fixados');
    // Só os ícones: um programa aberto que não está fixado vai para o começo; a ordem dos fixados segue a nova.
    await pagina.evaluate(() => retro.config.definir({ barra: { botoes: 'icones' } }));
    await pagina.evaluate(async () => { const s = await import('./js/sistema.js'); await s.definirConfig({}); });
    await pagina.waitForTimeout(600);
    console.log('ícones antes:', JSON.stringify(await titulos('#tarefas button.prog')));
    const primeiro = await pagina.locator('#tarefas button.prog >> nth=0').boundingBox();
    await arrastar('#tarefas button.prog >> nth=-1', primeiro.x + 2);
    const ultimoFix = await pagina.locator('#tarefas button.prog >> nth=-1').boundingBox();
    await arrastar('#tarefas button.prog >> nth=1', ultimoFix.x + ultimoFix.width - 2);
    console.log('ícones depois:', JSON.stringify(await titulos('#tarefas button.prog')), '| fixados:', JSON.stringify(await pagina.evaluate(() => window.__retro.estado.config.barra.fixados)), '| estados:', await estados());
    await foto('reorganizar-icones');
    // Um clique simples continua sendo um clique (minimiza a janela da frente).
    await pagina.click('#tarefas button.prog.apertado');
    await pagina.waitForTimeout(400);
    console.log('clique simples:', await estados());
    await pagina.evaluate(() => retro.config.definir({ barra: { botoes: 'nomes' } }));
  },

  // Arrastar para reorganizar a barra de favoritos do Navegador: a ordem fica guardada, e o clique de
  // soltar não abre o favorito.
  async reorganizarFavoritos() {
    await fecharTudo();
    await pagina.evaluate(() => retro.config.definir({ navegador: { favoritos: [
      { nome: 'Gmail', url: 'https://mail.google.com/' }, { nome: 'Wikipédia', url: 'https://pt.wikipedia.org/' },
      { nome: 'YouTube', url: 'https://www.youtube.com/' }, { nome: 'FMB', url: 'https://cursos.cursofmbonline.com.br/' },
    ] } }));
    await pagina.evaluate(async () => { const s = await import('./js/sistema.js'); await s.definirConfig({}); });
    await abrir('navegador');
    await pagina.waitForTimeout(1500);
    const nomes = () => pagina.evaluate(() => [...document.querySelectorAll('.janela.ativa .nav-link span')].map((s) => s.textContent).join(', '));
    const guardados = () => pagina.evaluate(() => window.__retro.estado.config.navegador.favoritos.map((f) => f.nome).join(', '));
    const arrastar = async (de, ateX, foto1) => {
      const r = await pagina.locator(de).boundingBox();
      await pagina.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
      await pagina.mouse.down();
      for (let i = 1; i <= 12; i++) { await pagina.mouse.move(r.x + r.width / 2 + ((ateX - (r.x + r.width / 2)) * i) / 12, r.y + r.height / 2); await pagina.waitForTimeout(30); }
      if (foto1) await foto(foto1);
      await pagina.mouse.up();
      await pagina.waitForTimeout(800);
    };
    console.log('antes:', await nomes());
    const primeiro = await pagina.locator('.janela.ativa .nav-link >> nth=0').boundingBox();
    await arrastar('.janela.ativa .nav-link >> nth=3', primeiro.x + 2, 'favoritos-arrastando');
    console.log('depois:', await nomes(), '| guardados:', await guardados(), '| abriu algo:', await pagina.evaluate(() => { const n = document.querySelector('.janela.ativa .nav-endereco'); return n ? n.value || '(nada)' : '?'; }));
    const ultimo = await pagina.locator('.janela.ativa .nav-link >> nth=-1').boundingBox();
    await arrastar('.janela.ativa .nav-link >> nth=1', ultimo.x + ultimo.width - 2);
    console.log('de novo:', await nomes(), '| guardados:', await guardados());
    await foto('favoritos-reorganizados');
  },

  // A luz noturna (o filtro, fora do modo sistema) continua na tela cheia: a da página inteira e a de
  // um vídeo num quadro de outro site. A cor do meio da tela é lida na captura (o branco fica alaranjado).
  async luzTelaCheia() {
    const branco = '<!doctype html><meta charset="utf-8"><body style="margin:0;background:#fff"><div id="v" style="width:100%;height:100%;background:#fff"></div>';
    const servidor = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(req.url.startsWith('/quadro') ? branco : `<!doctype html><meta charset="utf-8"><title>Aula</title><body style="margin:0;background:#fff"><iframe src="http://localhost:${servidor.address().port}/quadro" allowfullscreen style="width:640px;height:360px;border:0"></iframe>`);
    });
    await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
    await pagina.evaluate(() => import('./js/sistema.js').then((m) => m.definirConfig({ luzNoturna: { ligada: true, quando: 'sempre', intensidade: 100 } })));
    await fecharTudo();
    await abrir('navegador', { url: `http://127.0.0.1:${servidor.address().port}/`, interno: true });
    await pagina.waitForTimeout(3000);
    const wv = '.janela.ativa .nav-conteudo:not(.escondida) webview';
    const corNo = async (rotulo, x, y) => {
      const arq = await foto(rotulo);
      const px = execFileSync('convert', [arq, '-crop', `1x1+${x}+${y}`, '-depth', '8', 'txt:-']).toString().split('\n')[1] || '';
      console.log(`${rotulo}: ${(px.match(/#[0-9A-F]{6}/i) || ['?'])[0]} | tela cheia: ${await pagina.evaluate(() => (document.fullscreenElement ? document.fullscreenElement.tagName : 'não'))} | filtro aberto: ${await pagina.evaluate(() => { const f = document.getElementById('luz-noturna'); return !!f && f.matches(':popover-open'); })} | o clique vai para: ${await pagina.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.tagName + (e.id ? '#' + e.id : '') : '-'; }, [x, y])}`);
    };
    const meio = await pagina.locator(wv).boundingBox();
    await corNo('luz-pagina', Math.round(meio.x + 100), Math.round(meio.y + 100));
    await pagina.evaluate((s) => document.querySelector(s).executeJavaScript('document.documentElement.requestFullscreen().then(() => "ok", (e) => String(e))', true), wv);
    await pagina.waitForTimeout(1500);
    await corNo('luz-pagina-cheia', 400, 300);
    await pagina.evaluate((s) => document.querySelector(s).executeJavaScript('document.exitFullscreen()', true), wv).catch(() => { });
    await pagina.waitForTimeout(1200);
    await app.evaluate(async ({ webContents }) => {
      const g = webContents.getAllWebContents().find((w) => w.getType() === 'webview' && /127\.0\.0\.1/.test(w.getURL()));
      const f = g && g.mainFrame.frames.find((x) => /\/quadro/.test(x.url));
      return f && f.executeJavaScript('document.getElementById("v").requestFullscreen().then(() => "ok", (e) => String(e))', true);
    });
    await pagina.waitForTimeout(1500);
    await corNo('luz-quadro-cheio', 400, 300);
    await pagina.evaluate(() => import('./js/sistema.js').then((m) => m.definirConfig({ luzNoturna: { ligada: false } })));
    servidor.close();
  },

  // As abas arrastadas (a ordem vale para o Ctrl+Tab), as pastas de favoritos (na barra, no menu, na
  // página inicial, arrastar para dentro e para fora, excluir a pasta) e os ícones grandes da página
  // inicial arrastados em grade.
  async pastasFavoritos() {
    const servidor = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(`<!doctype html><meta charset="utf-8"><title>${decodeURIComponent(req.url.slice(1))}</title><h1>${decodeURIComponent(req.url.slice(1))}</h1>`); });
    await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok));
    const base = `http://127.0.0.1:${servidor.address().port}/`;
    await fecharTudo();
    await pagina.evaluate((b) => retro.config.definir({ navegador: { favoritos: [
      { nome: 'Gmail', url: 'https://mail.google.com/' }, { nome: 'Wikipédia', url: 'https://pt.wikipedia.org/' },
      { nome: 'Trabalho', pasta: true, itens: [{ nome: 'Tribunal', url: b + 'Tribunal' }, { nome: 'Agenda', url: b + 'Agenda' }] },
      { nome: 'YouTube', url: 'https://www.youtube.com/' }, { nome: 'Curso', url: b + 'Curso' },
    ] } }), base);
    await pagina.evaluate(async () => { const s = await import('./js/sistema.js'); await s.definirConfig({}); });
    await abrir('navegador', { url: base + 'Um', interno: true });
    await pagina.waitForTimeout(1500);
    await pagina.evaluate(() => { const j = window.__retro.janelas.janelaAtiva(); j.ret = { x: 10, y: 10, w: 760, h: 520 }; j.aplicarRet(); });
    const nav = () => pagina.evaluate(() => { const n = window.__retro.janelas.janelaAtiva().navegador; return n ? `abas: ${n.abas.map((a) => a.nome()).join(', ')} | na tela: ${[...document.querySelectorAll('.janela.ativa .nav-aba-nome')].map((s) => s.textContent).join(', ')} | da frente: ${n.aba.nome()}` : '?'; });
    await pagina.evaluate((b) => { const n = window.__retro.janelas.janelaAtiva().navegador; n.novaAba(b + 'Dois'); n.novaAba(b + 'Tres'); }, base);
    await pagina.waitForTimeout(1500);
    const centro = async (sel) => { const r = await pagina.locator(sel).boundingBox(); return [r.x + r.width / 2, r.y + r.height / 2, r]; };
    const arrastar = async (sel, x, y, foto1) => {
      const [x0, y0] = await centro(sel);
      await pagina.mouse.move(x0, y0);
      await pagina.mouse.down();
      for (let i = 1; i <= 14; i++) { await pagina.mouse.move(x0 + ((x - x0) * i) / 14, y0 + ((y - y0) * i) / 14); await pagina.waitForTimeout(30); }
      if (foto1) await foto(foto1);
      await pagina.mouse.up();
      await pagina.waitForTimeout(900);
    };
    const favs = () => pagina.evaluate(() => JSON.stringify(window.__retro.estado.config.navegador.favoritos.map((f) => (f.pasta ? { [f.nome]: f.itens.map((g) => g.nome) } : f.nome))));
    // 1) As abas: a terceira vai para o começo.
    console.log('abas antes:', await nav());
    const [, , primeira] = await centro('.janela.ativa .nav-aba >> nth=0');
    await arrastar('.janela.ativa .nav-aba >> nth=2', primeira.x + 4, primeira.y + primeira.height / 2, 'abas-arrastando');
    console.log('abas depois:', await nav());
    await pagina.evaluate(() => window.__retro.janelas.janelaAtiva().navegador.passarAba(1));
    console.log('Ctrl+Tab:', await nav());
    await foto('abas-reorganizadas');
    // 2) A pasta na barra: o menu dela e um favorito arrastado para dentro.
    await pagina.click('.janela.ativa .nav-link.nav-pasta');
    await pagina.waitForTimeout(400);
    await foto('pasta-menu');
    await pagina.keyboard.press('Escape');
    const [px, py] = await centro('.janela.ativa .nav-link.nav-pasta');
    await arrastar('.janela.ativa .nav-link:has-text("Curso")', px, py, 'pasta-recebendo');
    console.log('Curso na pasta:', await favs());
    // O Mover para do botão direito: o YouTube para a pasta.
    await pagina.click('.janela.ativa .nav-link:has-text("YouTube")', { button: 'right' });
    await pagina.waitForTimeout(300);
    await pagina.hover(`.menu .opcao:has-text("${T('Mo&ver para').replace('&', '')}")`);
    await pagina.waitForTimeout(400);
    await foto('pasta-mover-para');
    await pagina.click('.menu .opcao:has-text("Trabalho")');
    await pagina.waitForTimeout(800);
    console.log('YouTube na pasta:', await favs());
    // 3) A página inicial: a pasta, a grade arrastada e a pasta aberta.
    await pagina.click('.janela.ativa .nav-aba-nova');
    await pagina.waitForTimeout(800);
    await foto('inicio-com-pasta');
    const [wx, wy] = await centro('.janela.ativa .nav-conteudo:not(.escondida) .nav-fav >> nth=0');
    await arrastar('.janela.ativa .nav-conteudo:not(.escondida) .nav-fav:has-text("Trabalho")', wx - 30, wy, 'inicio-arrastando');
    console.log('Trabalho no começo:', await favs());
    await pagina.click('.janela.ativa .nav-conteudo:not(.escondida) .nav-fav.nav-fav-pasta');
    await pagina.waitForTimeout(600);
    await foto('inicio-pasta-aberta');
    const [vx, vy] = await centro('.janela.ativa .nav-conteudo:not(.escondida) .nav-fav-voltar');
    await arrastar('.janela.ativa .nav-conteudo:not(.escondida) .nav-fav:has-text("Agenda")', vx, vy, 'inicio-saindo-da-pasta');
    console.log('Agenda fora da pasta:', await favs());
    // A estrela do endereço reconhece a página que está dentro da pasta.
    await pagina.evaluate((b) => window.__retro.janelas.janelaAtiva().navegador.ir(b + 'Tribunal'), base);
    await pagina.waitForTimeout(1500);
    console.log('estrela acesa na página da pasta:', await pagina.evaluate(() => document.querySelector('.janela.ativa .nav-estrela').classList.contains('apertado')));
    // 4) Excluir a pasta: os favoritos dela ficam na barra.
    await pagina.click('.janela.ativa .nav-link.nav-pasta', { button: 'right' });
    await pagina.waitForTimeout(300);
    await pagina.click(`.menu .opcao:has-text("${T('&Excluir a pasta…').replace('&', '')}")`);
    await pagina.waitForTimeout(400);
    await foto('pasta-excluir');
    await pagina.click(`.janela.ativa button >> text=${T('&Sim').replace('&', '')}`);
    await pagina.waitForTimeout(800);
    console.log('sem a pasta:', await favs());
    await foto('pasta-excluida');
    servidor.close();
  },

  // Os tamanhos dos pixels do Painel › Aparência › Configurações (os inteiros e os do meio, com a área de cada um).
  async pixels() {
    await fecharTudo();
    await abrir('painel', { secao: 'aparencia' });
    await pagina.waitForTimeout(600);
    await pagina.locator('.janela.ativa .abas > *', { hasText: T('Configurações') }).click();
    await pagina.waitForTimeout(800);
    console.log('opções:', await pagina.evaluate(() => { const s = [...document.querySelectorAll('.janela.ativa select')].find((x) => [...x.options].some((o) => o.value === 'auto')); return [...s.options].map((o) => o.textContent).join(' | '); }));
    await foto('pixels');
    // Escolher o 1,5 e aplicar: o zoom da tela segue.
    await pagina.evaluate(() => { const s = [...document.querySelectorAll('.janela.ativa select')].find((x) => [...x.options].some((o) => o.value === 'auto')); s.value = '1.5'; s.dispatchEvent(new Event('change')); });
    await pagina.click('.janela.ativa button >> text=' + T('&Aplicar').replace('&', ''));
    await pagina.waitForTimeout(1200);
    console.log('guardado:', await pagina.evaluate(() => window.__retro.estado.config.escala), '| área:', await pagina.evaluate(() => `${innerWidth} x ${innerHeight}`));
    await foto('pixels-1-5');
    await pagina.evaluate(() => { const s = [...document.querySelectorAll('.janela.ativa select')].find((x) => [...x.options].some((o) => o.value === 'auto')); s.value = 'auto'; s.dispatchEvent(new Event('change')); });
    await pagina.click('.janela.ativa button >> text=' + T('&Aplicar').replace('&', ''));
    await pagina.waitForTimeout(800);
  },

  // O fundo da página inicial do Navegador (Painel › Internet › Página inicial): o de sempre (o azul
  // com losangos), outra cor e outro padrão, com o Navegador aberto mudando na hora, e o Restaurar.
  // E a aba Plano de fundo da Aparência, que usa a mesma escolha.
  async fundoInicio() {
    await fecharTudo();
    await pagina.evaluate(() => retro.config.definir({ navegador: { inicioFundo: null } }));
    await abrir('navegador', { interno: true });
    await pagina.waitForTimeout(1200);
    await pagina.evaluate(() => { const j = window.__retro.janelas.janelaAtiva(); j.ret = { x: 380, y: 20, w: 620, h: 420 }; j.aplicarRet(); });
    const fundo = () => pagina.evaluate(() => [...document.querySelectorAll('.nav-inicio')].map((e) => `${e.style.backgroundColor} ${e.style.backgroundImage === 'none' ? 'sem padrão' : e.style.backgroundImage ? 'com padrão' : '?'}`).join(' | '));
    console.log('o de sempre:', await fundo());
    await foto('fundo-inicio-padrao');
    await abrir('painel', { secao: 'internet' });
    await pagina.waitForTimeout(600);
    await pagina.click('.janela.ativa .abas > div >> nth=1');
    await pagina.waitForTimeout(400);
    await foto('fundo-inicio-painel');
    await pagina.click('.janela.ativa .cores > div >> nth=6');
    await pagina.evaluate(() => { const s = [...document.querySelectorAll('.janela.ativa select')].find((x) => [...x.options].some((o) => o.value === 'tijolos')); s.value = 'tijolos'; s.dispatchEvent(new Event('change')); });
    await pagina.waitForTimeout(300);
    await foto('fundo-inicio-outro');
    await pagina.click('.janela.ativa button >> text=' + T('&Aplicar').replace('&', ''));
    await pagina.waitForTimeout(600);
    console.log('guardado:', JSON.stringify(await pagina.evaluate(() => window.__retro.estado.config.navegador.inicioFundo)), '| o Navegador aberto:', await fundo());
    await foto('fundo-inicio-aplicado');
    // Uma aba nova já vem com o fundo escolhido.
    await pagina.click('.janela.ativa button >> text=' + T('OK'));
    await pagina.waitForTimeout(400);
    await pagina.click('.janela.ativa .nav-aba-nova');
    await pagina.waitForTimeout(500);
    console.log('com a aba nova:', await fundo());
    await foto('fundo-inicio-aba-nova');
    // O Restaurar volta ao de sempre.
    await abrir('painel', { secao: 'internet' });
    await pagina.waitForTimeout(600);
    await pagina.click('.janela.ativa .abas > div >> nth=1');
    await pagina.waitForTimeout(300);
    await pagina.click('.janela.ativa button >> text=' + T('Restaurar o padrão'));
    await pagina.click('.janela.ativa button >> text=' + T('&Aplicar').replace('&', ''));
    await pagina.waitForTimeout(600);
    console.log('restaurado:', JSON.stringify(await pagina.evaluate(() => window.__retro.estado.config.navegador.inicioFundo)), '|', await fundo());
    await fecharTudo();
    await abrir('painel', { secao: 'aparencia' });
    await pagina.waitForTimeout(600);
    await foto('fundo-aparencia');
  },

  // O papel de parede com uma imagem do usuário: Procurar… no Painel (a prévia, Preencher e
  // Centralizado), o botão direito numa imagem do Explorador (Lado a lado), um arquivo que não é
  // imagem recusado e o Remover…, que tira a cópia e deixa o arquivo do disco C:.
  async papelDeParede() {
    const docs = path.join(disco, DOCS);
    const foto1 = path.join(docs, 'Fractal.png');
    const ladrilho = path.join(docs, 'Ladrilho.png');
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'mandelbrot=size=1600x1000', '-frames:v', '1', foto1]);
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc=size=96x96', '-frames:v', '1', ladrilho]);
    fs.writeFileSync(path.join(docs, 'Falso.png'), 'isto não é uma imagem');
    const estadoPapel = () => pagina.evaluate(() => { const c = window.__retro.estado.config; const t = document.getElementById('tela').style; return `papel ${JSON.stringify(c.papel)} | lista ${JSON.stringify((c.papeis || []).map((p) => p.nome))} | tela: ${t.backgroundImage.slice(0, 60)}… ${t.backgroundRepeat} ${t.backgroundSize}`; });
    const aplicar = () => pagina.click('.janela.ativa button >> text=' + T('&Aplicar').replace('&', ''));
    await fecharTudo();
    await abrir('painel', { secao: 'aparencia' });
    await pagina.waitForTimeout(600);
    await foto('papel-painel-antes');
    await pagina.click(`.janela.ativa button:text-is("${T('Procurar…')}")`);
    await pagina.waitForTimeout(800);
    await pagina.dblclick('.janela.ativa .lista-arquivos .item:has-text("Fractal")');
    await pagina.waitForTimeout(1200);
    await foto('papel-painel-preencher');
    await aplicar();
    await pagina.waitForTimeout(800);
    console.log('preencher:', await estadoPapel());
    // Centralizado: a imagem no tamanho do arquivo, um pixel dela por pixel da tela.
    await pagina.evaluate((m) => { const s = [...document.querySelectorAll('.janela.ativa select')].find((x) => [...x.options].some((o) => o.value === m)); s.value = m; s.dispatchEvent(new Event('change')); }, 'centro');
    await pagina.waitForTimeout(600);
    await foto('papel-painel-centro');
    await aplicar();
    await pagina.waitForTimeout(800);
    console.log('centralizado:', await estadoPapel(), '| devicePixelRatio', await pagina.evaluate(() => devicePixelRatio));
    await fecharTudo();
    await foto('papel-mesa-centro');
    // O botão direito numa imagem do Explorador, com o Lado a lado.
    await pagina.evaluate(() => import('./js/sistema.js').then((m) => m.definirConfig({ papel: { modo: 'lado' } })));
    await abrir('explorador', { pasta: DOCS });
    await pagina.waitForTimeout(800);
    await pagina.evaluate(() => { const j = window.__retro.janelas.janelaAtiva(); j.ret = { x: 20, y: 20, w: 520, h: 360 }; j.aplicarRet(); });
    await pagina.click('.janela.ativa .item:has-text("Ladrilho")', { button: 'right' });
    await pagina.waitForTimeout(300);
    await foto('papel-menu');
    await pagina.click(`.menu .opcao:has-text("${T('Usar como papel de &parede').replace('&', '')}")`);
    await pagina.waitForTimeout(1200);
    console.log('lado a lado:', await estadoPapel());
    await foto('papel-mesa-lado');
    // Um arquivo que só tem o nome de imagem é recusado.
    await pagina.click('.janela.ativa .item:has-text("Falso")', { button: 'right' });
    await pagina.waitForTimeout(300);
    await pagina.click(`.menu .opcao:has-text("${T('Usar como papel de &parede').replace('&', '')}")`);
    await pagina.waitForTimeout(800);
    console.log('falso:', await pagina.evaluate(() => document.querySelector('.janela.ativa').innerText.replace(/\s+/g, ' ').slice(0, 160)));
    await foto('papel-falso');
    await pagina.keyboard.press('Enter');
    // Remover…: tira a cópia e a imagem da lista; o arquivo do disco C: fica.
    await fecharTudo();
    await abrir('painel', { secao: 'aparencia' });
    await pagina.waitForTimeout(600);
    await pagina.click(`.janela.ativa button:text-is("${T('Remover…')}")`);
    await pagina.waitForTimeout(400);
    await foto('papel-remover');
    await pagina.click(`.janela.ativa button >> text=${T('&Sim').replace('&', '')}`);
    await pagina.waitForTimeout(800);
    console.log('removido:', await estadoPapel(), '| o arquivo do C: ficou:', fs.existsSync(ladrilho), '| cópias:', fs.readdirSync(path.join(dados, 'papeis-de-parede')).join(','));
    await foto('papel-painel-depois');
  },

  // O modo sistema (com RETRO_SISTEMA=1 e RETRO_ENERGIA_FALSA=1: a energia só é anotada, nunca desliga).
  async sistema() {
    if (!process.env.RETRO_ENERGIA_FALSA) throw new Error('rode com RETRO_ENERGIA_FALSA=1');
    await fecharTudo();
    console.log('modo sistema:', await pagina.evaluate(() => window.__retro.estado.config.modoSistema), '| tela cheia:', await pagina.evaluate(() => retro.sistema.telaCheia(false)));
    await abrir('painel', { secao: 'aparencia' });
    await pagina.waitForTimeout(400);
    await pagina.locator('.janela.ativa .abas > *', { hasText: T('Proteção de tela') }).click();
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
    // A senha ao abrir: o Retro Computer fecha e abre de novo, com a abertura direta e com a introdução.
    console.log('pedir ao abrir (padrão):', await pagina.evaluate(() => window.__retro.estado.config.bloqueio.aoAbrir));
    for (const rapido of [true, false]) {
      await pagina.evaluate((r) => window.__retro.definirConfig({ inicioRapido: r }), rapido);
      await fecharApp();
      await lancar({ RETRO_RAPIDO: '' });
      await pagina.waitForSelector('#iniciar', { timeout: 60000 });
      await pagina.waitForTimeout(1500);
      console.log(`ao abrir ${rapido ? 'sem' : 'com'} a introdução: bloqueado?`, await pagina.evaluate(() => !!document.getElementById('bloqueio')));
      await foto(rapido ? 'bloqueio-ao-abrir' : 'bloqueio-ao-abrir-introducao');
      await pagina.keyboard.type('abcd1234');
      await pagina.keyboard.press('Enter');
      await pagina.waitForTimeout(1500);
    }
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
    await sobreProgramas();
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

  // O Salvar como PDF, sem impressora: o Bloco de notas (o menu, a caixa e o aviso), o Visualizador de
  // imagens e uma página do Navegador. Cada PDF é conferido no disco C: (o cabeçalho e as páginas).
  async pdf() {
    const pdfs = path.join(disco, DOCS);
    const conferirPdf = async (nome) => {
      const arq = path.join(pdfs, nome);
      for (let i = 0; i < 150 && !fs.existsSync(arq); i++) await pagina.waitForTimeout(200);
      if (!fs.existsSync(arq)) return console.log('PDF:', nome, '— não foi gravado; na pasta:', fs.readdirSync(pdfs).join(', '));
      const b = fs.readFileSync(arq);
      let paginas = '?';
      try { paginas = /Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [arq]).toString())[1]; } catch { }
      console.log('PDF:', nome, b.length, 'bytes, cabeçalho', JSON.stringify(b.subarray(0, 5).toString('latin1')), 'páginas', paginas);
      try { execFileSync('pdftoppm', ['-png', '-r', '40', '-f', '1', '-l', '1', arq, path.join(SAIDA, 'pdf-' + path.parse(nome).name.replace(/\W+/g, '-'))]); } catch { }
    };
    const menuArquivo = async () => {
      await pagina.click(`.janela.ativa .menubar > div:has-text("${T('&Arquivo')}")`);
      await pagina.waitForTimeout(300);
    };
    await fecharTudo();
    await abrir('bloco');
    await pagina.waitForTimeout(300);
    await pagina.keyboard.type('Relatório do mês\n\nAs vendas cresceram 12% em outubro. Ação, coração, pão e açúcar.');
    await menuArquivo();
    await foto('pdf-menu-bloco');
    await pagina.click(`.menu .opcao:has-text("${T('Salvar como P&DF…')}")`);
    await pagina.waitForSelector('#camada-modal .janela', { timeout: 10000 });
    await pagina.waitForTimeout(400);
    await foto('pdf-salvar-como');
    await pagina.keyboard.press('Enter');
    await conferirPdf(T('Sem título') + '.pdf');
    await pagina.waitForTimeout(800);
    await foto('pdf-aviso');
    // O Visualizador de imagens (uma imagem feita pelo ffmpeg, se houver).
    const foto1 = path.join(pdfs, 'Paisagem.png');
    try { execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'mandelbrot=size=800x500', '-frames:v', '1', foto1]); } catch { }
    if (fs.existsSync(foto1)) {
      await fecharTudo();
      await abrir('imagens', { arquivo: `${DOCS}/Paisagem.png` });
      await pagina.waitForTimeout(1000);
      await menuArquivo();
      await pagina.click(`.menu .opcao:has-text("${T('Salvar como P&DF…')}")`);
      await pagina.waitForSelector('#camada-modal .janela', { timeout: 10000 });
      await pagina.keyboard.press('Enter');
      await conferirPdf('Paisagem.pdf');
    }
    // Uma página do Navegador (de um servidor local), com o título como nome sugerido.
    const servidor = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<!doctype html><meta charset="utf-8"><title>Orçamento: 2026/27</title><body style="font:16px sans-serif;background:#eef"><h1>Orçamento da casa</h1><p>Uma página da internet salva como PDF.</p></body>');
    });
    await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
    servidor.unref();
    await fecharTudo();
    await abrir('navegador', { url: `http://127.0.0.1:${servidor.address().port}/`, interno: true });
    await pagina.waitForTimeout(3000);
    await menuArquivo();
    await pagina.click(`.menu .opcao:has-text("${T('Salvar como P&DF…')}")`);
    await pagina.waitForSelector('#camada-modal .janela', { timeout: 10000 });
    await pagina.waitForTimeout(400);
    console.log('nome sugerido:', await pagina.inputValue('#camada-modal .janela input[type=text]'));
    await foto('pdf-navegador');
    await pagina.keyboard.press('Enter');
    await conferirPdf('Orçamento 2026 27.pdf');
    servidor.close();

    // As ferramentas de PDF pelo botão direito do Explorador: separar, extrair, girar e combinar.
    const { PDFDocument } = require('pdf-lib');
    const rotacoes = async (nome) => (await PDFDocument.load(fs.readFileSync(path.join(pdfs, nome)), { updateMetadata: false })).getPages().map((p) => p.getRotation().angle).join(',');
    pdfSimples(path.join(pdfs, 'Contrato.pdf'), [['Contrato', 'Página 1'], ['Cláusulas', 'Página 2'], ['Assinaturas', 'Página 3']]);
    pdfSimples(path.join(pdfs, 'Anexo.pdf'), [['Anexo', 'Página única']]);
    await fecharTudo();
    await abrir('explorador', { pasta: DOCS });
    await pagina.waitForTimeout(1200);
    const item = (nome) => `.janela.ativa .item:has(.rotulo:text-is("${nome}"))`;
    const ferramenta = async (nome, rotulo, fotografar) => {
      await pagina.click(item(nome), { button: 'right' });
      await pagina.waitForTimeout(300);
      await pagina.hover(`.menu .opcao:has-text("${T('Ferramentas de PD&F')}")`);
      await pagina.waitForTimeout(400);
      if (fotografar) await foto(fotografar);
      await pagina.click(`.menu .opcao:has-text("${T(rotulo)}")`);
    };
    await ferramenta('Contrato.pdf', '&Separar as páginas', 'pdf-ferramentas-menu');
    await pagina.waitForTimeout(2500);
    const pastaPaginas = path.join(pdfs, T('{nome} (páginas)').replace('{nome}', 'Contrato'));
    console.log('separadas:', fs.existsSync(pastaPaginas) ? fs.readdirSync(pastaPaginas).join(' | ') : '(nenhuma pasta)');
    await ferramenta('Contrato.pdf', 'E&xtrair páginas…');
    await pagina.waitForSelector('#camada-modal .janela input[type=text]', { timeout: 10000 });
    await pagina.waitForTimeout(300);
    await pagina.fill('#camada-modal .janela input[type=text]', '3, 1');
    await foto('pdf-extrair');
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(600);
    console.log('nome sugerido:', await pagina.inputValue('#camada-modal .janela input[type=text]'));
    await pagina.keyboard.press('Enter');
    await conferirPdf(T('{nome} (páginas {paginas})').replace('{nome}', 'Contrato').replace('{paginas}', '3,1') + '.pdf');
    await ferramenta('Anexo.pdf', 'Girar à &direita');
    await pagina.waitForTimeout(2000);
    console.log('girado:', await rotacoes('Anexo.pdf'), '| versões:', fs.readdirSync(path.join(disco, '.versoes', DOCS, 'Anexo.pdf')).length);
    // Dois arquivos escolhidos (um PDF e uma imagem): combinar em um PDF.
    await pagina.click(item('Anexo.pdf'));
    await pagina.click(item('Paisagem.png'), { modifiers: ['Control'] });
    await pagina.click(item('Paisagem.png'), { button: 'right' });
    await pagina.waitForTimeout(300);
    await pagina.hover(`.menu .opcao:has-text("${T('Ferramentas de PD&F')}")`);
    await pagina.waitForTimeout(400);
    await foto('pdf-combinar-menu');
    await pagina.click(`.menu .opcao:has-text("${T('&Combinar em um PDF…')}")`);
    await pagina.waitForSelector('#camada-modal .janela', { timeout: 10000 });
    await pagina.waitForTimeout(300);
    const nomeCombinado = await pagina.inputValue('#camada-modal .janela input[type=text]');
    console.log('nome sugerido:', nomeCombinado);
    await pagina.keyboard.press('Enter');
    await conferirPdf(nomeCombinado);
    // A janela Ferramentas de PDF: a lista na ordem, Descer, e o protegido marcado.
    pdfProtegido(path.join(pdfs, 'Extrato do banco.pdf'));
    await fecharTudo();
    await abrir('pdf', { arquivos: [`${DOCS}/Contrato.pdf`, `${DOCS}/Paisagem.png`, `${DOCS}/Anexo.pdf`] });
    await pagina.waitForTimeout(1500);
    await pagina.click(`.janela.ativa .pdf-item:has-text("Contrato.pdf")`);
    await pagina.click(`.janela.ativa button:has-text("${T('Descer')}")`);
    await pagina.waitForTimeout(300);
    await foto('pdf-janela');
    await pagina.evaluate((r) => window.__retro.abrir('pdf', { arquivos: [r] }), `${DOCS}/Extrato do banco.pdf`);
    await pagina.waitForTimeout(1200);
    await foto('pdf-janela-protegido');
    await pagina.click(`.janela.ativa .pdf-item:has-text("Extrato do banco.pdf")`);
    await pagina.click(`.janela.ativa button:has-text("${T('Remover')}")`);
    await pagina.click(`.janela.ativa button:has-text("${T('Combinar em um PDF…')}")`);
    await pagina.waitForSelector('#camada-modal .janela', { timeout: 10000 });
    await pagina.fill('#camada-modal .janela input[type=text]', 'Tudo junto.pdf');
    await pagina.keyboard.press('Enter');
    await conferirPdf('Tudo junto.pdf');
    await pagina.waitForTimeout(800);
    await foto('pdf-janela-combinado');

    // Copiar o texto (OCR): uma foto de um texto (desenhada na hora), a mesma foto num PDF digitalizado
    // (só a imagem, sem texto) e um PDF com texto, que não passa pelo OCR.
    const imagemTexto = await pagina.evaluate(() => {
      const c = document.createElement('canvas');
      c.width = 1400; c.height = 360;
      const g = c.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = '#111'; g.font = '44px sans-serif';
      ['Ação de cobrança: o réu foi citado em São Paulo.', 'Valor da causa: R$ 12.345,67 (doze mil reais).', 'Prazo de 15 dias úteis, conforme o art. 335.']
        .forEach((l, i) => g.fillText(l, 50, 90 + i * 90));
      return c.toDataURL('image/png').split(',')[1];
    });
    fs.writeFileSync(path.join(pdfs, 'Foto do ofício.png'), Buffer.from(imagemTexto, 'base64'));
    const digitalizado = await PDFDocument.create();
    const png = await digitalizado.embedPng(Buffer.from(imagemTexto, 'base64'));
    digitalizado.addPage([595, 153]).drawImage(png, { x: 0, y: 0, width: 595, height: 153 });
    fs.writeFileSync(path.join(pdfs, 'Ofício digitalizado.pdf'), await digitalizado.save());
    const lerTexto = async (nome, fotografar) => {
      await fecharTudo();
      await abrir('ocr', { arquivo: `${DOCS}/${nome}` });
      await pagina.waitForFunction(() => { const t = document.querySelector('.janela.ativa .ocr-texto'); return t && !t.closest('.janela').querySelector('select').disabled; }, null, { timeout: 120000 }).catch(() => { });
      await pagina.waitForTimeout(400);
      console.log('texto de', nome + ':', JSON.stringify(await pagina.inputValue('.janela.ativa .ocr-texto')), '|', await pagina.textContent('.janela.ativa .status'));
      if (fotografar) await foto(fotografar);
    };
    await fecharTudo();
    await abrir('explorador', { pasta: DOCS });
    await pagina.waitForTimeout(1200);
    await pagina.click(item('Foto do ofício.png'), { button: 'right' });
    await pagina.waitForTimeout(300);
    await foto('ocr-menu');
    await pagina.keyboard.press('Escape');
    await lerTexto('Foto do ofício.png', 'ocr-imagem');
    await lerTexto('Ofício digitalizado.pdf', 'ocr-pdf-digitalizado');
    await lerTexto('Contrato.pdf', 'ocr-pdf-texto');
  },

  // A busca pelo conteúdo: um texto, um Word, uma planilha e um PDF; o índice lê todos (meio minuto
  // depois de abrir), e a busca acha pelo texto de dentro, na caixa da barra e no Localizar.
  async busca() {
    const docs = path.join(disco, DOCS);
    fs.writeFileSync(path.join(docs, 'Recibo.txt'), 'Recebi de Maria a quantia referente ao aluguel de outubro.\nSão Paulo, 17 de outubro de 2026.');
    await docxSimples(path.join(docs, 'Relatório.docx'));
    await xlsxSimples(path.join(docs, 'Despesas.xlsx'), 'Outubro', [['Item', 'Valor'], ['Aluguel do escritório', 2400], ['Internet', 120]]);
    pdfSimples(path.join(docs, 'Contrato de locação.pdf'), [['Contrato de locacao', 'O locatario pagara o aluguel ate o dia cinco.'], ['Clausula segunda', 'Multa de dez por cento.']]);
    const inicio = Date.now();
    let est = null;
    while (Date.now() - inicio < 90000) {
      est = await pagina.evaluate(() => retro.indice.estado());
      if (est.comTexto >= 5 && !est.faltam) break;
      await pagina.waitForTimeout(1000);
    }
    console.log('índice:', JSON.stringify(est), 'em', Math.round((Date.now() - inicio) / 1000), 's');
    await fecharTudo();
    await pagina.click('#busca-barra input');
    await pagina.keyboard.type('aluguel');
    await pagina.waitForSelector('.busca-resultados .busca-item.com-trecho', { timeout: 10000 }).catch(() => { });
    await pagina.waitForTimeout(500);
    console.log('na caixa:', JSON.stringify(await pagina.$$eval('.busca-resultados .busca-item', (l) => l.map((e) => e.textContent))));
    await foto('busca-caixa');
    await pagina.keyboard.press('Escape');
    await pagina.evaluate(() => { const c = document.querySelector('#busca-barra input'); if (c) { c.value = ''; c.blur(); } });
    await abrir('localizar', { texto: 'dez por cento' });
    await pagina.waitForTimeout(1500);
    console.log('no Localizar:', JSON.stringify(await pagina.$$eval('.janela.ativa .linha-item', (l) => l.map((e) => e.textContent))));
    await foto('busca-localizar');
    await fecharTudo();
    await abrir('localizar', { texto: 'escritorio' });
    await pagina.waitForTimeout(1500);
    console.log('sem acento:', JSON.stringify(await pagina.$$eval('.janela.ativa .linha-item', (l) => l.map((e) => e.textContent))));
    await fecharTudo();
    await abrir('painel', { secao: 'disco' });
    await pagina.waitForTimeout(800);
    await pagina.click(`.janela.ativa .abas > div:has-text("${T('Busca')}")`).catch(() => pagina.click(`.janela.ativa [role=tab]:has-text("${T('Busca')}")`));
    await pagina.waitForTimeout(500);
    await foto('busca-painel');
  },

  // As abas do Explorador (Ctrl+T, o botão direito numa pasta, Ctrl+Tab, Ctrl+W) e a visualização
  // rápida pela barra de espaço (as setas passam para o arquivo do lado).
  async abasExplorador() {
    const docs = path.join(disco, DOCS);
    fs.mkdirSync(path.join(docs, 'Projetos'), { recursive: true });
    fs.writeFileSync(path.join(docs, 'Ata da reunião.txt'), 'Ata da reunião de 17 de outubro.\n\nPresentes: Ana, Bruno e Carla.\nPauta: o orçamento de 2027.');
    pdfSimples(path.join(docs, 'Relatório.pdf'), [['Relatorio anual', 'Resumo das atividades de 2026.']]);
    try { execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'mandelbrot=size=640x400', '-frames:v', '1', path.join(docs, 'Paisagem.png')]); } catch { }
    await fecharTudo();
    await abrir('explorador', { pasta: DOCS });
    await pagina.waitForTimeout(1200);
    const item = (nome) => `.janela.ativa .item:has(.rotulo:text-is("${nome}"))`;
    await pagina.click(item('Projetos'), { button: 'right' });
    await pagina.waitForTimeout(300);
    await pagina.click(`.menu .opcao:has-text("${T('Abrir em nova a&ba')}")`);
    await pagina.waitForTimeout(800);
    await pagina.keyboard.press('Control+t');
    await pagina.waitForTimeout(800);
    console.log('abas:', JSON.stringify(await pagina.$$eval('.janela.ativa .exp-abas .nav-aba', (l) => l.map((e) => e.textContent + (e.classList.contains('ativa') ? ' *' : '')))));
    await foto('explorador-abas');
    await pagina.keyboard.press('Control+Tab');
    await pagina.waitForTimeout(600);
    console.log('depois do Ctrl+Tab:', await pagina.textContent('.janela.ativa .exp-abas .nav-aba.ativa'), '|', await pagina.textContent('.janela.ativa .titulo'));
    await pagina.keyboard.press('Control+w');
    await pagina.waitForTimeout(600);
    console.log('depois do Ctrl+W:', JSON.stringify(await pagina.$$eval('.janela.ativa .exp-abas .nav-aba', (l) => l.map((e) => e.textContent))));
    // A visualização rápida: um texto, depois a seta para a direita (o próximo arquivo).
    await pagina.click(`.janela.ativa button.ferramenta:has-text("${T('Acima')}")`);
    await pagina.waitForTimeout(800);
    await pagina.click(item('Ata da reunião.txt'));
    await pagina.keyboard.press(' ');
    await pagina.waitForTimeout(1200);
    console.log('rápida:', await pagina.textContent('.janela.ativa .titulo'));
    await foto('rapida-texto');
    await pagina.keyboard.press('ArrowRight');
    await pagina.waitForTimeout(1500);
    console.log('rápida, depois da seta:', await pagina.textContent('.janela.ativa .titulo'));
    await foto('rapida-seguinte');
    await pagina.keyboard.press(' ');
    await pagina.waitForTimeout(500);
    console.log('fechou?', await pagina.locator('.janela:has-text("' + T('Visualização rápida').replace(/"/g, '') + '")').count(), '| escolhido no Explorador:', await pagina.textContent('.janela.ativa .item.sel .rotulo').catch(() => '?'));
  },

  // A Agenda: o .ics de Meus documentos (feito aqui, com um lembrete que vence logo), a janela, o
  // evento novo, a repetição (só esta ocorrência), os próximos 30 dias, a importação de outro .ics,
  // os lembretes e o calendário do relógio. No fim, o arquivo é conferido.
  async agenda() {
    const docs = path.join(disco, DOCS);
    const d2 = (n) => String(n).padStart(2, '0');
    const ics = (d, dia) => `${d.getFullYear()}${d2(d.getMonth() + 1)}${d2(d.getDate())}` + (dia ? '' : `T${d2(d.getHours())}${d2(d.getMinutes())}00`);
    const agora = new Date();
    const hoje = (h, m = 0) => new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), h, m);
    const daqui = (min) => new Date(Math.ceil((agora.getTime() + min * 60000) / 60000) * 60000);
    const amanha = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1);
    const evento = (uid, titulo, ini, fim, extra = []) => ['BEGIN:VEVENT', `UID:${uid}`, `DTSTART${ini.length === 8 ? ';VALUE=DATE' : ''}:${ini}`, `DTEND${fim.length === 8 ? ';VALUE=DATE' : ''}:${fim}`, `SUMMARY:${titulo}`, ...extra, 'END:VEVENT'];
    const calendario = (eventos) => ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Teste//PT', ...eventos.flat(), 'END:VCALENDAR', ''].join('\r\n');
    const proxSegunda = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - ((agora.getDay() + 6) % 7));
    fs.writeFileSync(path.join(docs, 'Feriados.ics'), calendario([
      evento('finados@teste', 'Finados', `${agora.getFullYear()}1102`, `${agora.getFullYear()}1103`),
      evento('republica@teste', 'Proclamação da República', `${agora.getFullYear()}1115`, `${agora.getFullYear()}1116`),
      evento('natal@teste', 'Natal', `${agora.getFullYear()}1225`, `${agora.getFullYear()}1226`, ['RRULE:FREQ=YEARLY']),
    ]));
    await fecharTudo();
    // O arquivo da Agenda aparece com a janela fechada: o lembrete que vence agora abre sozinho.
    fs.writeFileSync(path.join(docs, T('Agenda') + '.ics'), calendario([
      evento('audiencia@teste', 'Audiência de conciliação', ics(daqui(10)), ics(daqui(70)), ['LOCATION:Sala 3 do Fórum', 'DESCRIPTION:Levar a procuração', 'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:-PT15M', 'END:VALARM']),
      evento('equipe@teste', 'Reunião da equipe', ics(new Date(proxSegunda.getFullYear(), proxSegunda.getMonth(), proxSegunda.getDate(), 9)), ics(new Date(proxSegunda.getFullYear(), proxSegunda.getMonth(), proxSegunda.getDate(), 9, 30)), ['RRULE:FREQ=WEEKLY;BYDAY=MO,TH']),
      evento('relatorio@teste', 'Entregar o relatório', ics(amanha, true), ics(new Date(amanha.getFullYear(), amanha.getMonth(), amanha.getDate() + 1), true)),
      evento('almoco@teste', 'Almoço com a Ana', ics(hoje(12, 30)), ics(hoje(13, 30)), ['LOCATION:Restaurante da esquina']),
    ]));
    await pagina.waitForSelector(`.janela:has-text("${T('1 lembrete')}")`, { timeout: 30000 });
    await pagina.waitForTimeout(500);
    await foto('agenda-lembrete');
    await pagina.click(`.janela.ativa button:has-text("${T('Adia&r')}")`);
    await pagina.waitForTimeout(400);
    console.log('lembrete adiado; janelas:', await pagina.locator(`.janela:has-text("${T('Lembretes')}")`).count());
    // A janela: hoje, com a audiência e o almoço.
    await abrir('agenda');
    await pagina.waitForSelector('.janela.ativa .ag-item', { timeout: 15000 });
    await pagina.waitForTimeout(500);
    console.log('hoje:', JSON.stringify(await pagina.$$eval('.janela.ativa .ag-item', (l) => l.map((e) => e.innerText.replace(/\n/g, ' | ')))));
    await foto('agenda-dia');
    // Um evento novo amanhã (a seta para a direita passa o dia), com o lembrete de 30 minutos.
    await pagina.keyboard.press('ArrowRight');
    await pagina.waitForTimeout(300);
    await pagina.click(`.janela.ativa button:has-text("${T('&Novo evento…')}")`);
    await pagina.waitForSelector('.janela.dialogo .ag-form', { timeout: 5000 });
    await pagina.fill('.janela.dialogo .ag-form input[type=text] >> nth=0', 'Despachar os processos da semana');
    await pagina.fill('.janela.dialogo .ag-form input[type=text] >> nth=1', 'Gabinete');
    await pagina.fill('.janela.dialogo .ag-form input[type=time] >> nth=0', '16:00');
    await pagina.dispatchEvent('.janela.dialogo .ag-form input[type=time] >> nth=0', 'change');
    await pagina.selectOption('.janela.dialogo .ag-form select >> nth=0', 'semanal');
    await pagina.selectOption('.janela.dialogo .ag-form select >> nth=1', '30');
    await pagina.fill('.janela.dialogo .ag-form textarea', 'Conferir os prazos antes.');
    await pagina.waitForTimeout(300);
    await foto('agenda-novo');
    await pagina.click('.janela.dialogo .ag-form button.padrao');
    await pagina.waitForTimeout(800);
    console.log('depois do novo:', JSON.stringify(await pagina.$$eval('.janela.ativa .ag-item', (l) => l.map((e) => e.innerText.replace(/\n/g, ' | ')))));
    // A reunião da segunda (repete): mudar só esta ocorrência.
    const seg = new Date(proxSegunda.getFullYear(), proxSegunda.getMonth(), proxSegunda.getDate() + 7);
    await abrir('agenda', { dia: `${seg.getFullYear()}-${d2(seg.getMonth() + 1)}-${d2(seg.getDate())}` });
    await pagina.waitForTimeout(600);
    await foto('agenda-segunda');
    await pagina.click(`.janela.ativa .ag-item:has-text("Reunião da equipe")`);
    await pagina.click(`.janela.ativa button:has-text("${T('E&ditar…')}")`);
    await pagina.waitForSelector('.janela.dialogo .mensagem', { timeout: 5000 });
    await pagina.waitForTimeout(300);
    await foto('agenda-repete');
    await pagina.click(`.janela.dialogo button:has-text("${T('Só &esta ocorrência')}")`);
    await pagina.waitForSelector('.janela.dialogo .ag-form', { timeout: 5000 });
    await pagina.fill('.janela.dialogo .ag-form input[type=time] >> nth=0', '10:00');
    await pagina.dispatchEvent('.janela.dialogo .ag-form input[type=time] >> nth=0', 'change');
    await pagina.fill('.janela.dialogo .ag-form input[type=text] >> nth=0', 'Reunião da equipe (com a diretoria)');
    await pagina.click('.janela.dialogo .ag-form button.padrao');
    await pagina.waitForTimeout(800);
    console.log('segunda:', JSON.stringify(await pagina.$$eval('.janela.ativa .ag-item', (l) => l.map((e) => e.innerText.replace(/\n/g, ' | ')))));
    // Importar os feriados (abrir o .ics no Explorador faz o mesmo).
    await abrir('agenda', { arquivo: `${DOCS}/Feriados.ics` });
    await pagina.waitForSelector('.janela.dialogo .mensagem', { timeout: 5000 });
    await pagina.waitForTimeout(300);
    await foto('agenda-importar');
    await pagina.click(`.janela.dialogo button:has-text("${T('&Importar')}")`);
    await pagina.waitForTimeout(1000);
    await pagina.click('.janela.dialogo button.padrao').catch(() => { });
    await pagina.waitForTimeout(400);
    await pagina.click(`.janela.ativa button:has-text("${T('Próximos &30 dias')}")`);
    await pagina.waitForTimeout(600);
    await foto('agenda-proximos');
    // O calendário do relógio: os dias com eventos e os de hoje.
    await pagina.click('#bandeja .relogio');
    await pagina.waitForTimeout(500);
    await foto('agenda-relogio');
    console.log('relógio, dias marcados:', await pagina.$$eval('.calendario:not(.ag-mes) .cal-dia.com-evento', (l) => l.length), '| hoje:', JSON.stringify(await pagina.$$eval('.cal-evento', (l) => l.map((e) => e.innerText.replace(/\n/g, ' ')))));
    await pagina.keyboard.press('Escape');
    // O arquivo no disco.
    const texto = fs.readFileSync(path.join(docs, T('Agenda') + '.ics'), 'utf8');
    console.log('arquivo:', (texto.match(/BEGIN:VEVENT/g) || []).length, 'eventos;', (texto.match(/RECURRENCE-ID/g) || []).length, 'alterada;', /RRULE:FREQ=WEEKLY;BYDAY=MO,TH/.test(texto) ? 'regra semanal ok' : 'regra semanal PERDIDA', '; linhas até 75 bytes:', texto.split('\r\n').every((l) => Buffer.byteLength(l) <= 75));
    console.log('versões guardadas:', fs.existsSync(path.join(disco, '.versoes')) ? execFileSync('find', [path.join(disco, '.versoes'), '-type', 'f']).toString().split('\n').filter((l) => /Agenda|Calendar/.test(l)).length : 0);
  },

  // O Digitalizar (com RETRO_SCANNER_FALSO=1): dois scanners de mentira, duas páginas, o PDF salvo e o
  // texto dele pelo OCR (a página de mentira é um ofício desenhado na hora).
  async scanner() {
    await fecharTudo();
    await abrir('scanner');
    await pagina.waitForSelector('.janela.ativa .scn-opcoes select option', { state: 'attached', timeout: 15000 });
    await pagina.waitForTimeout(800);
    await foto('scanner-aberto');
    const botao = `.janela.ativa .scn-opcoes button.padrao`;
    for (let i = 0; i < 2; i++) {
      await pagina.click(botao);
      await pagina.waitForFunction((n) => document.querySelectorAll('.janela.ativa .scn-pagina').length === n, i + 1, { timeout: 30000 });
      await pagina.waitForTimeout(400);
    }
    await foto('scanner-paginas');
    await pagina.selectOption('.janela.ativa .scn-opcoes select >> nth=0', 'falso:adf');
    await pagina.waitForTimeout(600);
    console.log('origens do multifuncional:', await pagina.$$eval('.janela.ativa .scn-opcoes select >> nth=3', (s) => [...s[0].options].map((o) => o.value)).catch(() => '?'));
    await pagina.check('#scn-ocr');
    await pagina.click(`.janela.ativa button:has-text("${T('Salvar…')}")`);
    await pagina.waitForSelector('#camada-modal .janela', { timeout: 10000 });
    await pagina.waitForTimeout(400);
    await foto('scanner-salvar');
    const nome = await pagina.inputValue('#camada-modal .janela input[type=text]');
    await pagina.keyboard.press('Enter');
    const arq = path.join(disco, DOCS, nome);
    for (let i = 0; i < 100 && !fs.existsSync(arq); i++) await pagina.waitForTimeout(200);
    let paginas = '?';
    try { paginas = /Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [arq]).toString())[1]; } catch { }
    console.log('digitalização salva:', nome, fs.existsSync(arq) ? fs.statSync(arq).size + ' bytes' : '(não gravada)', 'páginas', paginas);
    await pagina.waitForFunction(() => { const t = document.querySelector('.janela.ativa .ocr-texto'); return t && t.value && !t.closest('.janela').querySelector('select').disabled; }, null, { timeout: 120000 }).catch(() => { });
    await pagina.waitForTimeout(500);
    console.log('texto da digitalização:', JSON.stringify((await pagina.inputValue('.janela.ativa .ocr-texto').catch(() => '')).slice(0, 160)));
    await foto('scanner-ocr');
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

  // O Mac Plus: o que falta (a ROM, depois o disco) e o emulador ligado com uma ROM de teste feita aqui,
  // que nada tem da Apple: ela só tira a sobreposição da ROM (pela VIA) e pinta a tela com o cinza
  // pontilhado da época, linha a linha. Com ela, o PCE.js liga, desenha e a janela se ajusta.
  async mac() {
    await fecharTudo();
    await abrir('mac');
    await pagina.waitForSelector('.janela.mac .mac-falta', { timeout: 20000 });
    await pagina.waitForTimeout(400);
    await foto('mac-sem-rom');
    const codigo = [
      0x13fc, 0x00ff, 0x00ef, 0xe7fe, // move.b #$FF,$EFE7FE (a VIA: a porta A como saída)
      0x13fc, 0x0040, 0x00ef, 0xfffe, // move.b #$40,$EFFFFE (sem a sobreposição, com a tela principal)
      0x41f9, 0x003f, 0xa700, // lea $3FA700,a0 (a tela, no fim dos 4 MB)
      0x323c, 0x0155, // move.w #341,d1
      0x243c, 0xaaaa, 0xaaaa, // linha: move.l #$AAAAAAAA,d2
      0x0801, 0x0000, // btst #0,d1
      0x6706, // beq.s par
      0x243c, 0x5555, 0x5555, // move.l #$55555555,d2
      0x700f, // par: moveq #15,d0
      0x20c2, // coluna: move.l d2,(a0)+
      0x51c8, 0xfffc, // dbra d0,coluna
      0x51c9, 0xffe4, // dbra d1,linha
      0x60fe, // fim: bra.s fim
    ];
    const rom = Buffer.alloc(131072);
    rom.writeUInt32BE(0x00040000, 0); // a pilha
    rom.writeUInt32BE(0x00400008, 4); // o começo do programa
    codigo.forEach((w, i) => rom.writeUInt16BE(w, 8 + 2 * i));
    await pagina.evaluate((b) => retro.disco.gravar('Mac/Teste.rom', new Uint8Array(b)), [...rom]);
    await pagina.locator('.janela.mac .mac-falta button').nth(1).click();
    await pagina.waitForFunction(() => /disquete do Sistema|System floppy|disquete del Sistema/.test((document.querySelector('.janela.mac .mac-falta') || {}).textContent || ''), null, { timeout: 20000 });
    await pagina.waitForTimeout(300);
    await foto('mac-sem-disco');
    await pagina.evaluate(() => retro.disco.gravar('Mac/System de teste.img', new Uint8Array(819200)));
    await pagina.locator('.janela.mac .mac-falta button').nth(1).click();
    await pagina.waitForFunction(() => { const a = document.querySelector('.janela.mac .dos-aviso'); return a && a.hidden; }, null, { timeout: 60000 });
    await pagina.waitForTimeout(2500);
    const quadro = pagina.frames().find((f) => f.url().startsWith('mac://'));
    const tela = quadro && await quadro.evaluate(() => {
      const c = document.getElementById('tela');
      // O cinza pontilhado: metade dos pontos acesos, lidos do canvas do emulador.
      const g = c.getContext('2d') || null;
      return { w: c.width, h: c.height, css: getComputedStyle(c).width + ' × ' + getComputedStyle(c).height, ctx2d: !!g, registro: (window.__registroPce || []).slice(-30) };
    }).catch((e) => ({ erro: e.message }));
    console.log('mac:', JSON.stringify({ tela, status: await pagina.evaluate(() => [...document.querySelectorAll('.janela.mac .status span, .janela.mac .status > *')].map((e) => e.textContent).join(' | ')) }));
    await foto('mac-ligado');
    // A volta dos discos: o Mac "grava" no disquete (o roteiro muda um byte do arquivo na memória do
    // emulador, como a gravação do PCE faria) e Arquivo › Guardar no disco o leva ao disco C:.
    await quadro.evaluate(() => { const d = window.__discosPce[0]; d.no.contents[0] = 0x42; d.no.timestamp = Date.now() + 1000; });
    await pagina.locator('.janela.mac iframe').click({ position: { x: 100, y: 100 } });
    await pagina.click('.janela.ativa .menubar >> text=' + T('&Arquivo'));
    await pagina.click('.menu >> text=' + T('&Guardar no disco'));
    await pagina.waitForSelector('.janela.ativa.dialogo', { timeout: 10000 }).catch(() => null);
    await pagina.waitForTimeout(500);
    await foto('mac-guardado');
    console.log('mac guardar:', JSON.stringify(await pagina.evaluate(async () => {
      const b = await retro.disco.ler('Mac/System de teste.img').catch((e) => ({ erro: e.message }));
      return { primeiro: b && b[0], tamanho: b && b.length, versoes: (await retro.disco.versoes('Mac/System de teste.img').catch(() => [])).length };
    })));
    await pagina.keyboard.press('Enter');
    await pagina.waitForTimeout(300);
    await pagina.locator('.janela.mac iframe').click({ position: { x: 100, y: 100 } });
    await pagina.evaluate(() => window.__retro.janelas.lista.find((j) => j.el.classList.contains('mac')).maximizar());
    await pagina.waitForTimeout(300);
    await pagina.click('.janela.ativa .menubar >> text=' + T('&Exibir'));
    await pagina.waitForTimeout(300);
    await foto('mac-exibir');
    await pagina.click('.menu >> text=' + T('&Ajustar à janela'));
    await pagina.waitForTimeout(1500);
    await foto('mac-ajustado');
    await pagina.evaluate(() => window.__retro.janelas.lista.find((j) => j.el.classList.contains('mac')).fechar());
    await pagina.waitForTimeout(2500);
    console.log('mac fechado:', JSON.stringify(await pagina.evaluate(async () => ({
      janela: window.__retro.janelas.lista.some((j) => j.el.classList.contains('mac')),
      disco: (await retro.disco.listar('Mac')).map((i) => i.nome),
    }))));
    await fecharTudo();
  },

  // O Claude ajusta o Retro Computer: o roteiro faz o papel do Claude Code, roda o servidor MCP com o
  // config que o Retro Computer gravou e pede o fundo azul-marinho, a Calculadora no Iniciar e um aviso.
  async claudeAjusta() {
    await fecharTudo();
    const conf = JSON.parse(fs.readFileSync(path.join(dados, 'claude', 'mcp.json'), 'utf8')).mcpServers['retro-computer'];
    const { spawn } = await import('node:child_process');
    const p = spawn(conf.command, conf.args, { env: { ...process.env, ...conf.env } });
    let resto = '';
    const respostas = new Map();
    p.stdout.on('data', (d) => {
      resto += d;
      let i;
      while ((i = resto.indexOf('\n')) >= 0) { const m = JSON.parse(resto.slice(0, i)); respostas.set(m.id, m); resto = resto.slice(i + 1); }
    });
    let id = 0;
    const pedir = async (method, params) => {
      const n = ++id;
      p.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: n, method, params }) + '\n');
      for (let t = 0; t < 200 && !respostas.has(n); t++) await pagina.waitForTimeout(50);
      return respostas.get(n);
    };
    await pedir('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'roteiro', version: '1' } });
    console.log('ferramentas:', (await pedir('tools/list', {})).result.tools.map((t) => t.name).join(', '));
    const usar = async (name, args) => { const r = await pedir('tools/call', { name, arguments: args }); console.log(name + ':', r.result.content[0].text.replace(/\s+/g, ' ').slice(0, 200)); return r; };
    await usar('mudar_configuracoes', { configuracoes: { papel: { cor: '#000080', padrao: 'nenhum' } } });
    await usar('mudar_configuracoes', { configuracoes: { bloqueio: { aoAbrir: false } } });
    await usar('atalho', { programa: 'calculadora', onde: 'iniciar', acao: 'por' });
    await usar('avisar', { titulo: 'Claude', texto: T('Pronto: o fundo azul-marinho e a Calculadora no menu Iniciar.') });
    await usar('estado', {});
    await pagina.waitForTimeout(600);
    await pagina.click('#iniciar');
    await pagina.waitForTimeout(500);
    await foto('claude-ajusta');
    await pagina.keyboard.press('Escape');
    p.kill();
    await pagina.evaluate(() => window.__retro.definirConfig({ papel: { cor: '#008080', padrao: 'nenhum' }, iniciar: null }));
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
    await sobreProgramas();
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
    await sobreProgramas();
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
