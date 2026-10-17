/*
 * O processo de trabalho (o utilityProcess do Electron): o que lê arquivos de fora, que podem vir
 * malfeitos de propósito, e o que demora (as ferramentas de PDF, o OCR e o texto para a busca), longe do processo principal e da
 * janela. Ele não tem a ponte nem o disco: recebe os bytes e devolve os bytes. Se travar ou passar da
 * memória, só ele cai (trabalho.js o encerra e abre outro na vez seguinte).
 */
'use strict';

const TAREFAS = {
  'pdf:info': (d) => require('./pdf-ops').info(d.bytes),
  'pdf:combinar': (d) => require('./pdf-ops').combinar(d.itens, d.opcoes),
  'pdf:extrair': (d) => require('./pdf-ops').extrair(d.bytes, d.intervalo),
  'pdf:separar': (d) => require('./pdf-ops').separar(d.bytes),
  'pdf:girar': (d) => require('./pdf-ops').girar(d.bytes, d.graus),
  'pdf:marcar': (d) => require('./pdf-ops').marcar(d.bytes, d.marcas),
  'ocr:reconhecer': (d) => require('./ocr-ops').reconhecer(d.bytes, d.idioma, d.langPath),
  'texto:extrair': (d) => require('./extrair-texto').extrair(d.bytes, d.ext),
};

process.parentPort.on('message', async (e) => {
  const { id, tipo, dados } = e.data || {};
  const tarefa = Object.prototype.hasOwnProperty.call(TAREFAS, tipo) ? TAREFAS[tipo] : null;
  try {
    if (!tarefa) throw Object.assign(new Error('tarefa desconhecida'), { codigo: 'falhou' });
    const r = await tarefa(dados || {});
    process.parentPort.postMessage({ id, ok: true, r });
  } catch (err) {
    process.parentPort.postMessage({ id, ok: false, codigo: (err && err.codigo) || 'falhou', indice: err && err.indice, mensagem: String((err && err.message) || err) });
  }
});
