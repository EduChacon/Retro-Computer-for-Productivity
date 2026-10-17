/*
 * As ferramentas de PDF do lado do disco: lê os arquivos do disco C: (só dele, pelo Disco), manda o
 * trabalho para o processo de trabalho (trabalho.js → pdf-ops.js) e grava o resultado. O original
 * nunca muda, a não ser no Girar, que grava por cima e guarda a versão anterior (Versões anteriores).
 */
'use strict';
const path = require('path');
const { tr } = require('./idioma');

const MAX_ARQUIVO = 300 * 1024 * 1024;
const MAX_TOTAL = 600 * 1024 * 1024;
const MAX_ITENS = 500;
const TIPO_DA_EXT = { '.pdf': 'pdf', '.jpg': 'jpg', '.jpeg': 'jpg', '.png': 'png' };

const baseDe = (nome) => nome.slice(0, nome.length - path.posix.extname(nome).length) || nome;

class FerramentasPdf {
  /** papel(): 'A4' ou 'Letter', o do país. */
  constructor({ disco, trabalhos, papel = () => 'A4' }) {
    this.disco = disco;
    this.trabalhos = trabalhos;
    this.papel = papel;
  }

  /** O erro do processo de trabalho na língua do usuário (com o nome do arquivo, quando se sabe). */
  traduzir(e, nome = '') {
    const msg = {
      senha: () => tr('"{nome}" tem senha ou está protegido contra mudanças, e não pode ser mudado aqui.', { nome }),
      invalido: () => tr('"{nome}" não é um PDF que se consiga ler.', { nome }),
      imagem: () => tr('A imagem "{nome}" não pôde ser lida.', { nome }),
      intervalo: () => tr('As páginas pedidas não existem neste PDF.'),
      demorou: () => tr('O trabalho demorou demais e foi interrompido.'),
      caiu: () => tr('O trabalho parou no meio: o arquivo pode estar danificado ou ser grande demais.'),
    }[e && e.codigo];
    return msg ? new Error(msg()) : e;
  }

  /** Os bytes de um arquivo do disco C:, com o limite de tamanho. */
  async ler(rel, soma = { total: 0 }) {
    const n = this.disco.normalizar(String(rel || ''));
    const i = await this.disco.info(n);
    if (i.pasta) throw new Error(tr('"{nome}" é uma pasta.', { nome: i.nome }));
    if (i.tamanho > MAX_ARQUIVO) throw new Error(tr('"{nome}" é grande demais (o limite é de {max} MB).', { nome: i.nome, max: MAX_ARQUIVO / 1048576 }));
    soma.total += i.tamanho;
    if (soma.total > MAX_TOTAL) throw new Error(tr('Os arquivos juntos passam de {max} MB.', { max: MAX_TOTAL / 1048576 }));
    return { rel: n, nome: i.nome, bytes: await this.disco.ler(n) };
  }

  async tarefa(tipo, dados, nome) {
    try { return await this.trabalhos.executar(tipo, dados); } catch (e) { throw this.traduzir(e, nome); }
  }

  /** O destino do resultado: no disco C:, terminado em .pdf. */
  destino(rel) {
    const n = this.disco.normalizar(String(rel || ''));
    if (!/\.pdf$/i.test(n)) throw new Error(tr('O nome do arquivo precisa terminar em .pdf.'));
    return n;
  }

  /** As páginas de cada PDF (null nas imagens; senha: true no protegido). */
  async info(rels) {
    const lista = [];
    for (const rel of (Array.isArray(rels) ? rels : []).slice(0, MAX_ITENS)) {
      const ext = path.posix.extname(String(rel)).toLowerCase();
      if (ext !== '.pdf') { lista.push({ rel, paginas: null }); continue; }
      try {
        const a = await this.ler(rel);
        lista.push({ rel, ...(await this.tarefa('pdf:info', { bytes: a.bytes }, a.nome)) });
      } catch (e) {
        lista.push({ rel, erro: e.message });
      }
    }
    return lista;
  }

  /**
   * Um PDF só com os itens na ordem: { rel } (PDF, JPG ou PNG do disco) ou { png, nome } e { jpg, nome }
   * (uma imagem de outro tipo ou uma página digitalizada, já desenhada pela tela).
   */
  async combinar(itens, relDestino) {
    const destino = this.destino(relDestino);
    if (!Array.isArray(itens) || !itens.length) throw new Error(tr('Escolha pelo menos um arquivo.'));
    if (itens.length > MAX_ITENS) throw new Error(tr('São arquivos demais de uma vez (o limite é {max}).', { max: MAX_ITENS }));
    const soma = { total: 0 };
    const lidos = [];
    for (const it of itens) {
      if (it && (it.png || it.jpg)) {
        const bytes = Buffer.from(it.png || it.jpg);
        soma.total += bytes.length;
        if (bytes.length > MAX_ARQUIVO || soma.total > MAX_TOTAL) throw new Error(tr('Os arquivos juntos passam de {max} MB.', { max: MAX_TOTAL / 1048576 }));
        lidos.push({ tipo: it.png ? 'png' : 'jpg', bytes, nome: String(it.nome || '') });
        continue;
      }
      const tipo = TIPO_DA_EXT[path.posix.extname(String(it && it.rel)).toLowerCase()];
      if (!tipo) throw new Error(tr('"{nome}" não é um PDF nem uma imagem JPG ou PNG.', { nome: path.posix.basename(String(it && it.rel)) }));
      const a = await this.ler(it.rel, soma);
      lidos.push({ tipo, bytes: a.bytes, nome: a.nome });
    }
    let bytes;
    try {
      bytes = await this.trabalhos.executar('pdf:combinar', { itens: lidos.map(({ tipo, bytes: b }) => ({ tipo, bytes: b })), opcoes: { papel: this.papel() } });
    } catch (e) {
      throw this.traduzir(e, e.indice != null && lidos[e.indice] ? lidos[e.indice].nome : '');
    }
    return this.disco.gravar(destino, bytes);
  }

  /** Um PDF novo só com as páginas do intervalo ("1-3, 5"). */
  async extrair(rel, intervalo, relDestino) {
    const destino = this.destino(relDestino);
    const a = await this.ler(rel);
    if (destino === a.rel) throw new Error(tr('Escolha outro nome: o PDF original não muda.'));
    const bytes = await this.tarefa('pdf:extrair', { bytes: a.bytes, intervalo: String(intervalo || '').slice(0, 2000) }, a.nome);
    return this.disco.gravar(destino, bytes);
  }

  /** Um PDF por página, numa pasta nova ao lado ("Nome (páginas)"). Devolve a pasta. */
  async separar(rel) {
    const a = await this.ler(rel);
    const partes = await this.tarefa('pdf:separar', { bytes: a.bytes }, a.nome);
    const pai = path.posix.dirname(a.rel) === '.' ? '' : path.posix.dirname(a.rel);
    const base = baseDe(a.nome);
    const pasta = await this.disco.criarPasta(pai, await this.disco.nomeLivre(pai, tr('{nome} (páginas)', { nome: base })));
    const digitos = String(partes.length).length;
    for (let i = 0; i < partes.length; i++) {
      const nome = tr('{nome} - página {n}', { nome: base, n: String(i + 1).padStart(digitos, '0') }) + '.pdf';
      await this.disco.gravar(`${pasta.rel}/${nome}`, partes[i], { versao: false });
    }
    return { pasta: pasta.rel, paginas: partes.length };
  }

  /** Gira todas as páginas e grava por cima (a versão anterior fica guardada). */
  async girar(rel, graus) {
    const a = await this.ler(rel);
    if (!/\.pdf$/i.test(a.nome)) throw new Error(tr('"{nome}" não é um PDF que se consiga ler.', { nome: a.nome }));
    const bytes = await this.tarefa('pdf:girar', { bytes: a.bytes, graus: Number(graus) }, a.nome);
    return this.disco.gravar(a.rel, bytes);
  }
}

module.exports = { FerramentasPdf, MAX_ARQUIVO, MAX_TOTAL };
