/*
 * A janela de um programa instalado (os Craft): a página dele num iframe
 * (programa://<id>/) e a conversa com o adaptador, que pede as caixas Abrir e
 * Salvar como do disco e avisa quando o programa está pronto.
 */
import { h, img, nomeDe, paiDe, juntar, caminhoTela, extensao } from '../util.js';
import { Janela } from '../janelas.js';
import { registrarApp, instalado, adicionarRecente, avisar, abrir, estado, atualizarProgramas, pastaDocs } from '../sistema.js';
import { caixaArquivo, confirmar, erro } from '../dialogos.js';
import { tr } from '../idioma.js';

const ORIGEM = (id) => `programa://${id}`;
const abertos = new Set();

class ProgramaCraft {
  constructor({ programa: id, arquivo }) {
    this.id = id;
    this.info = instalado(id);
    this.arquivos = new Map(); // nome → caminho no disco (para "Salvar" gravar no mesmo lugar)
    this.pendente = arquivo || null;
    this.pronto = false;
    const t = document.getElementById('janelas').getBoundingClientRect();
    this.j = new Janela({
      titulo: this.info.nome,
      icone: this.info.icone || 'programa',
      largura: Math.min(1100, Math.round(t.width * 0.86)),
      altura: Math.min(760, Math.round(t.height * 0.88)),
      minLargura: 360,
      minAltura: 240,
      aoFechar: () => this.podeFechar(),
    });
    this.iframe = h('iframe', {
      allow: 'clipboard-read; clipboard-write; fullscreen; local-fonts',
      'aria-label': this.info.nome,
    });
    this.barra = h('div.progresso', h('div'));
    this.textoCarga = h('div', tr('Carregando o {programa}…', { programa: this.info.nome }));
    this.carregando = h('div.carregando', img(this.info.icone || 'programa', 32), this.textoCarga, this.barra);
    this.j.corpo.append(this.iframe, this.carregando);
    this.ouvinte = (e) => this.mensagem(e);
    window.addEventListener('message', this.ouvinte);
    this.j.ev.on('fechada', () => {
      window.removeEventListener('message', this.ouvinte);
      abertos.delete(this);
    });
    this.j.ev.on('ativada', () => this.focarPrograma());
    const outraJanela = [...abertos].some((p) => p.id === id);
    abertos.add(this);
    this.preparar(outraJanela);
  }

  /**
   * Antes de carregar: procura uma versão nova do programa e, conforme a
   * escolha em Adicionar ou remover programas, atualiza (automático), pergunta
   * ou não faz nada. Sem internet, ou se demorar, abre a versão instalada.
   */
  async preparar(outraJanela) {
    const modo = (estado.config && estado.config.atualizacoes) || 'automatico';
    if (modo !== 'nunca' && !outraJanela) {
      this.textoCarga.textContent = tr('Procurando atualizações do {programa}…', { programa: this.info.nome });
      let v = null;
      try { v = await retro.programas.verificar(this.id, { limite: 5000 }); } catch { }
      if (v && v.temAtualizacao && !this.j.fechada) {
        let atualizar = modo === 'automatico';
        if (modo === 'perguntar') {
          atualizar = await confirmar(tr('Há uma versão nova do {programa} ({nova}); a instalada é a {atual}.\n\nDeseja atualizar agora?', { programa: this.info.nome, nova: v.nova, atual: v.atual }), { titulo: tr('Atualização disponível') });
        }
        if (atualizar) await this.atualizar(v);
      }
    }
    if (this.j.fechada) return;
    this.textoCarga.textContent = tr('Carregando o {programa}…', { programa: this.info.nome });
    this.barra.firstChild.style.width = '0%';
    this.animarCarga();
    this.iframe.src = `${ORIGEM(this.id)}/index.html`;
  }

  async atualizar(v) {
    const barra = this.barra.firstChild;
    this.textoCarga.textContent = tr('Atualizando o {programa} para a versão {nova}…', { programa: this.info.nome, nova: v.nova });
    const parar = retro.programas.aoProgresso((id, p) => {
      if (id !== this.id || p.etapa !== 'baixando' || !p.total) return;
      barra.style.width = Math.round((p.recebido / p.total) * 95) + '%';
    });
    try {
      const novo = await retro.programas.instalar(this.id, { atualizar: true });
      await atualizarProgramas();
      this.info = instalado(this.id) || this.info;
      avisar(tr('Programa atualizado'), tr('{programa} {versao}', { programa: novo.nome, versao: novo.versao }), { som: null, icone: this.info.icone || 'programa' });
    } catch (e) {
      avisar(tr('Atualização não concluída'), tr('O {programa} abre na versão instalada ({atual}).', { programa: this.info.nome, atual: v.atual }), { som: null, icone: 'msg-aviso' });
    } finally {
      parar();
    }
  }

  animarCarga() {
    let p = 0;
    const barra = this.barra.firstChild;
    const t = setInterval(() => {
      if (this.pronto || this.j.fechada) return clearInterval(t);
      p = Math.min(92, p + (92 - p) * 0.08);
      barra.style.width = p + '%';
    }, 120);
  }

  focarPrograma() {
    if (!this.pronto) return;
    setTimeout(() => {
      this.iframe.focus();
      this.enviar({ tipo: 'focar' });
    }, 0);
  }

  enviar(msg, transferir) {
    msg.retro = 1;
    try { this.iframe.contentWindow.postMessage(msg, ORIGEM(this.id), transferir || []); } catch { }
  }

  responder(pedido, dados, transferir) {
    this.enviar({ tipo: 'resposta', pedido, ...dados }, transferir);
  }

  async mensagem(e) {
    if (e.source !== this.iframe.contentWindow || e.origin !== ORIGEM(this.id)) return;
    const m = e.data;
    if (!m || m.retro !== 1) return;
    switch (m.tipo) {
      case 'ativo':
        this.j.focar();
        document.dispatchEvent(new CustomEvent('retro-atividade'));
        break;
      case 'atividade':
        document.dispatchEvent(new CustomEvent('retro-atividade'));
        break;
      case 'pronto':
        this.aoPronto();
        break;
      case 'falhou':
        this.falhou(m.texto);
        break;
      case 'titulo': {
        const t = String(m.titulo || '').trim();
        this.j.definirTitulo(t && t !== this.info.nome ? (t.includes(this.info.nome) ? t : `${t} - ${this.info.nome}`) : this.info.nome);
        break;
      }
      case 'abrir':
        this.pedirAbrir(m);
        break;
      case 'escolherSalvar':
        this.pedirSalvar(m);
        break;
      case 'salvar':
        this.gravar(m);
        break;
      case 'resposta':
        if (this.esperando && this.esperando.pedido === m.pedido) {
          this.esperando.fn(m);
          this.esperando = null;
        }
        break;
      default:
    }
  }

  aoPronto() {
    if (this.pronto) return;
    this.pronto = true;
    this.barra.firstChild.style.width = '100%';
    setTimeout(() => this.carregando.remove(), 150);
    if (this.pendente) {
      const rel = this.pendente;
      this.pendente = null;
      setTimeout(() => this.abrirNoPrograma(rel), 250);
    }
    this.focarPrograma();
  }

  falhou(texto) {
    this.carregando.remove();
    const gpu = /webgl|webgpu|surface|adapter/i.test(texto || '');
    erro(
      tr('O {programa} não conseguiu iniciar.', { programa: this.info.nome }) + '\n\n' +
      (gpu ? tr('Ele precisa de aceleração gráfica (WebGPU ou WebGL2), que não está disponível neste computador agora. Atualizar o driver da placa de vídeo costuma resolver.') + '\n\n' : '') +
      tr('Detalhe técnico: {texto}', { texto }),
      this.info.nome,
    );
  }

  /** Abre um arquivo do disco dentro do programa (soltando-o sobre a tela dele). */
  async abrirNoPrograma(rel) {
    if (!this.pronto) {
      this.pendente = rel;
      return;
    }
    try {
      const dados = await retro.disco.ler(rel);
      const buf = dados.buffer.slice(dados.byteOffset, dados.byteOffset + dados.byteLength);
      this.arquivos.set(nomeDe(rel), rel);
      this.enviar({ tipo: 'soltar', nome: nomeDe(rel), dados: buf }, [buf]);
      adicionarRecente(rel);
      this.j.focar();
    } catch (e) {
      erro(tr('Não foi possível abrir {nome}: {erro}', { nome: nomeDe(rel), erro: e.message }), this.info.nome);
    }
  }

  tiposDe(exts) {
    const lista = [...new Set((exts || []).map((x) => String(x).replace(/^\./, '').toLowerCase()).filter((x) => x && !x.includes('/') && x !== '*'))];
    if (!lista.length) return [];
    return [{ rotulo: tr('Arquivos do {programa} ({tipos})', { programa: this.info.nome, tipos: lista.map((x) => '*.' + x).join(';') }).slice(0, 90), exts: lista }];
  }

  async pedirAbrir(m) {
    const pasta = this.ultimaPasta || pastaDocs();
    const escolha = await caixaArquivo({ modo: 'abrir', pasta, tipos: this.tiposDe(m.aceitar), varios: !!m.varios, titulo: `${tr('Abrir')} - ${this.info.nome}` });
    if (!escolha) return this.responder(m.pedido, { ok: false });
    const rels = [].concat(escolha);
    const arquivos = [];
    const transferir = [];
    for (const rel of rels) {
      try {
        const [dados, info] = await Promise.all([retro.disco.ler(rel), retro.disco.info(rel)]);
        const buf = dados.buffer.slice(dados.byteOffset, dados.byteOffset + dados.byteLength);
        arquivos.push({ nome: nomeDe(rel), dados: buf, modificado: info.modificado, caminho: rel });
        transferir.push(buf);
        this.arquivos.set(nomeDe(rel), rel);
        this.ultimaPasta = paiDe(rel);
        adicionarRecente(rel);
      } catch (e) {
        await erro(tr('Não foi possível ler {nome}: {erro}', { nome: nomeDe(rel), erro: e.message }), this.info.nome);
      }
    }
    this.responder(m.pedido, { ok: arquivos.length > 0, arquivos }, transferir);
    this.j.focar();
  }

  async pedirSalvar(m) {
    const nome = String(m.nome || tr('Documento'));
    // "Salvar" de um arquivo que veio do disco grava no mesmo lugar, sem perguntar.
    const conhecido = this.arquivos.get(nome);
    if (conhecido) return this.responder(m.pedido, { ok: true, nome, caminho: conhecido });
    const exts = (m.exts && m.exts.length) ? m.exts : (extensao(nome) ? ['.' + extensao(nome)] : []);
    const rel = await caixaArquivo({
      modo: 'salvar',
      pasta: this.ultimaPasta || pastaDocs(),
      nome,
      tipos: this.tiposDe(exts),
      titulo: `${tr('Salvar como')} - ${this.info.nome}`,
    });
    this.j.focar();
    if (!rel) return this.responder(m.pedido, { ok: false });
    this.arquivos.set(nomeDe(rel), rel);
    this.ultimaPasta = paiDe(rel);
    this.responder(m.pedido, { ok: true, nome: nomeDe(rel), caminho: rel });
  }

  async gravar(m) {
    const rel = m.caminho || juntar(this.ultimaPasta || pastaDocs(), nomeDe(m.nome || tr('Documento')));
    try {
      await retro.disco.gravar(rel, new Uint8Array(m.dados));
      this.arquivos.set(nomeDe(rel), rel);
      adicionarRecente(rel);
      this.responder(m.pedido, { ok: true, nome: nomeDe(rel) });
      avisar(tr('Salvo'), caminhoTela(rel), { som: null, ms: 2500, icone: this.info.icone || 'programa' });
    } catch (e) {
      this.responder(m.pedido, { ok: false, erro: e.message });
      erro(tr('Não foi possível salvar {nome}: {erro}', { nome: nomeDe(rel), erro: e.message }), this.info.nome);
    }
  }

  perguntar(msg, ms = 1500) {
    return new Promise((resolve) => {
      const pedido = Math.floor(Math.random() * 1e9);
      const t = setTimeout(() => { this.esperando = null; resolve(null); }, ms);
      this.esperando = { pedido, fn: (r) => { clearTimeout(t); resolve(r); } };
      this.enviar({ ...msg, pedido });
    });
  }

  async podeFechar() {
    if (!this.pronto) return true;
    const r = await this.perguntar({ tipo: 'podeFechar' });
    if (!r || !r.sujo) return true;
    this.j.focar();
    return confirmar(tr('Há alterações não salvas no {programa}.\n\nDeseja fechar mesmo assim? (Para salvar, escolha Não e use o comando Salvar do programa.)', { programa: this.info.nome }), { titulo: this.info.nome, tipo: 'aviso' });
  }
}

/** Abrir um programa instalado; um arquivo vai para a janela já aberta, se houver. */
function abrirCraft(args = {}) {
  const id = args.programa;
  if (!instalado(id)) {
    erro(tr('Este programa não está instalado. Use Adicionar ou remover programas.'), tr('Programa não encontrado')).then(() => abrir('programas'));
    return null;
  }
  return new ProgramaCraft({ programa: id, arquivo: args.arquivo });
}

/** As janelas de programa abertas (o Desligar pergunta a cada uma). */
export function programasAbertos() {
  return [...abertos];
}

registrarApp('craft', { nome: 'Programa', icone: 'programa', abrir: abrirCraft });
