/*
 * O Mac Plus: o PCE.js (o pacote "pcejs-macplus", GPL-2.0, sem modificação) numa janela, sem
 * internet. O emulador roda num quadro isolado, em mac://emulador (src/mac/), sem a ponte com o
 * processo principal; esta janela conversa com ele só por mensagens. A ROM e os discos são do
 * usuário, na pasta C:\Mac: vão para o emulador ao ligar e voltam ao disco ao fechar a janela (ou
 * em Arquivo › Guardar no disco), pelo processo principal (src/principal/macintosh.js), com a
 * versão de antes de ligar o Mac guardada.
 */
import { h, img } from '../util.js';
import { Janela } from '../janelas.js';
import { registrarApp, abrir, eventos } from '../sistema.js';
import { erro, info, ajustarAoConteudo, caixaArquivo } from '../dialogos.js';
import { tr } from '../idioma.js';
import { estado as estadoSons } from '../sons.js';

const ORIGEM = 'mac://emulador';
const MODELOS = { 'mac-plus': 'Mac Plus', 'mac-se': 'Mac SE', 'mac-classic': 'Mac Classic' };
const EXTS = ['dsk', 'img', 'image', 'dc42', 'diskcopy42', 'hfv', 'hda', 'ima', 'raw', 'disk'];

class JanelaMac {
  constructor(arquivo) {
    // A tela de 512 × 342 é pequena nas telas de hoje: no dobro, quando cabe.
    this.escala = innerWidth >= 1100 && innerHeight >= 820 ? 2 : 1;
    this.tam = { w: 512, h: 342 };
    this.pedidos = new Map();
    this.n = 0;
    this.j = new Janela({
      id: 'mac', titulo: tr('Mac Plus'), icone: 'mac', largura: 560, altura: 470, classe: 'mac', status: ['', ''],
      aoFechar: () => this.fechar(),
      menus: [
        {
          rotulo: tr('&Arquivo'), itens: () => [
            { rotulo: tr('&Ligar com outro disco…'), acao: () => this.escolherDisco() },
            { rotulo: tr('&Guardar no disco'), desativado: !this.ligado, acao: () => this.guardar(true) },
            { rotulo: tr('Abrir a &pasta no Explorador'), acao: () => abrir('explorador', { pasta: 'Mac' }) },
            { separador: true },
            { rotulo: tr('Re&iniciar'), desativado: !this.ligado, acao: () => this.religar(this.arquivo) },
            { separador: true },
            { rotulo: tr('Sai&r'), acao: () => this.j.fechar() },
          ],
        },
        {
          rotulo: tr('&Exibir'), itens: () => [
            { rotulo: tr('&Tamanho real'), radio: true, marcado: this.escala === 1, acao: () => this.mudarEscala(1) },
            { rotulo: tr('&Dobro do tamanho'), radio: true, marcado: this.escala === 2, acao: () => this.mudarEscala(2) },
            { rotulo: tr('&Ajustar à janela'), radio: true, marcado: this.escala === 0, acao: () => this.mudarEscala(0) },
          ],
        },
        {
          rotulo: tr('A&juda'), itens: [
            { rotulo: tr('&Como usar'), acao: () => info(tr('O Mac Plus é o PCE.js, um emulador do Macintosh da época, com a tela em preto e branco. Nada da Apple vem com o Retro Computer: ponha na pasta C:\\Mac do disco a imagem da ROM do seu Mac (um arquivo .rom, de 128 KB no Mac Plus, 256 KB no Mac SE ou 512 KB no Mac Classic), o disquete do Sistema (o System 6 ou o 7) e os disquetes dos jogos, como o SimAnt (.dsk, .img ou .image, do Disk Copy 4.2).\n\nO disco com System, Sistema ou Boot no nome vai na primeira unidade, e o Mac parte por ele; os outros entram nas unidades seguintes (até três disquetes e três discos rígidos). Dois cliques num disco do Mac também o abrem aqui.\n\nO que o Mac gravar volta para o disco ao fechar a janela (ou em Arquivo › Guardar no disco); a versão de antes de ligar o Mac fica guardada.\n\nClique na tela para o Mac receber as teclas e o mouse. A tecla Alt faz o papel da Command, e a Ctrl, o da Option. Tudo funciona sem internet.\n\nO PCE.js é de James Friend, sobre o PCE de Hampa Hug (GPL-2.0); veja ATRIBUICOES.md.'), tr('Mac Plus')) },
          ],
        },
      ],
    });
    this.aviso = h('div.dos-aviso', tr('Ligando o Mac…'));
    this.moldura = h('div.dos-moldura.mac-moldura', this.aviso);
    this.j.corpo.append(this.moldura);
    this.ouvir = (e) => this.mensagem(e);
    window.addEventListener('message', this.ouvir);
    this.semConfig = eventos.on('config', () => this.postar({ tipo: 'volume', volume: this.volume() }));
    this.j.ev.on('ativada', () => setTimeout(() => this.focar(), 0));
    new ResizeObserver(() => { if (this.escala === 0) this.ajustar(); }).observe(this.moldura);
    this.religar(arquivo);
  }

  volume() {
    const s = estadoSons();
    return s.ligado ? s.volume : 0;
  }

  postar(m, transferir) {
    if (this.quadro && this.quadro.contentWindow) this.quadro.contentWindow.postMessage(m, ORIGEM, transferir || []);
  }

  /** Um pedido ao emulador que volta com resposta (ler os discos, desligar). */
  pedir(tipo) {
    const id = ++this.n;
    return new Promise((resolve) => {
      this.pedidos.set(id, resolve);
      this.postar({ tipo, id });
      setTimeout(() => { if (this.pedidos.delete(id)) resolve(null); }, 20000);
    });
  }

  /** Só valem as mensagens do quadro do emulador, com a origem dele. */
  mensagem(e) {
    if (!this.quadro || e.source !== this.quadro.contentWindow || e.origin !== ORIGEM) return;
    const m = e.data || {};
    if (m.tipo === 'pronto') this.mandarDiscos();
    else if (m.tipo === 'ligado') {
      this.ligado = true;
      this.aviso.hidden = true;
      this.tam = { w: Number(m.w) || 512, h: Number(m.h) || 342 };
      this.ajustar();
      if (this.escala) this.encaixar();
      this.mostrarStatus('');
      this.focar();
      this.timer = setInterval(() => this.guardar(false), 120000);
    } else if (m.tipo === 'tamanho') {
      this.tam = { w: Number(m.w) || 512, h: Number(m.h) || 342 };
      this.ajustar();
      if (this.escala) this.encaixar();
    } else if (m.tipo === 'erro') {
      this.falhou(m.erro, m.registro);
    } else if (m.tipo === 'saiu') {
      if (!this.saindo) this.j.fechar();
    } else if ((m.tipo === 'discos' || m.tipo === 'desligado') && this.pedidos.has(m.id)) {
      const r = this.pedidos.get(m.id);
      this.pedidos.delete(m.id);
      r(m);
    }
  }

  /** Desliga o emulador (guardando antes) e tira o quadro. */
  async desligar() {
    if (!this.quadro) return;
    await this.guardar(false);
    await this.pedir('desligar');
    this.quadro.remove();
    this.quadro = null;
  }

  /** Liga (ou religa) o Mac com a ROM e os discos da pasta C:\Mac (e o disco escolhido). */
  async religar(arquivo) {
    await this.desligar();
    clearInterval(this.timer);
    this.ligado = false;
    this.arquivo = arquivo || '';
    if (this.falta) { this.falta.remove(); this.falta = null; }
    this.aviso.hidden = false;
    this.aviso.textContent = tr('Ligando o Mac…');
    const u = await retro.mac.abrir(this.arquivo).catch((e) => ({ ok: false, erro: e.message }));
    if (this.j.fechada) return;
    if (!u.ok) {
      this.aviso.hidden = true;
      if (u.semRom || u.semDisco) return this.mostrarFalta(u.semRom);
      await erro(tr('Não foi possível ligar o Mac: {erro}', { erro: u.erro || '?' }), tr('Mac Plus'));
      this.limpar();
      this.j.fechar(true);
      return;
    }
    this.unidade = u;
    this.foto = u.foto;
    this.modelo = MODELOS[u.modelo] || 'Mac';
    this.nomes = u.discos.map((d) => d.nome);
    // O quadro isolado: a origem do emulador, sem acesso a esta página nem à ponte.
    this.quadro = h('iframe.dos-quadro', { src: ORIGEM + '/', sandbox: 'allow-scripts allow-same-origin' });
    this.quadro.setAttribute('aria-label', tr('Mac Plus'));
    this.moldura.append(this.quadro);
    this.ajustar();
    if (this.escala) this.encaixar();
  }

  /** O que falta para ligar (a ROM ou um disco): o que pôr na pasta C:\Mac, com os botões. */
  mostrarFalta(semRom) {
    const texto = semRom
      ? tr('Falta a ROM do Mac. O Retro Computer não traz nada da Apple: ponha na pasta C:\\Mac a imagem da ROM do seu Mac (um arquivo .rom, de 128 KB no Mac Plus, 256 KB no Mac SE ou 512 KB no Mac Classic), o disquete do Sistema e os disquetes dos jogos (.dsk, .img ou .image).')
      : tr('A ROM está na pasta C:\\Mac, mas falta um disco para o Mac partir: ponha lá o disquete do Sistema (o System 6 ou o 7, em .dsk, .img ou .image) e os disquetes dos jogos.');
    this.falta = h('div.mac-falta',
      img('mac', 32),
      h('p', texto),
      h('div.mac-falta-botoes',
        h('button', { onclick: () => abrir('explorador', { pasta: 'Mac' }) }, tr('Abrir a pasta C:\\Mac')),
        h('button', { onclick: () => this.religar(this.arquivo) }, tr('Tentar de novo'))));
    this.moldura.append(this.falta);
    this.mostrarStatus('');
    if (!this.j.maximizada) ajustarAoConteudo(this.j);
  }

  mandarDiscos() {
    const u = this.unidade;
    if (!u || !u.discos) return;
    const copia = (b) => { const a = new Uint8Array(b); return a.buffer.slice(a.byteOffset, a.byteOffset + a.byteLength); };
    const rom = copia(u.rom.conteudo);
    const discos = u.discos.map((d) => ({ caminho: d.caminho, interno: d.interno, conteudo: copia(d.conteudo) }));
    this.postar({ tipo: 'volume', volume: this.volume() });
    this.postar({ tipo: 'ligar', conf: u.conf, rom, discos }, [rom, ...discos.map((d) => d.conteudo)]);
    // Os discos já foram para o emulador: a cópia daqui não precisa ficar na memória.
    u.discos = null;
    u.rom = null;
  }

  falhou(msg, registro) {
    this.aviso.textContent = '';
    const linhas = (registro || []).filter(Boolean).join('\n');
    erro(tr('Não foi possível ligar o Mac: {erro}', { erro: msg || '?' }) + (linhas ? '\n\n' + linhas : ''), tr('Mac Plus'));
    this.limpar();
    this.j.fechar(true);
  }

  limpar() {
    clearInterval(this.timer);
    window.removeEventListener('message', this.ouvir);
    this.semConfig();
    if (aberta === this) aberta = null;
  }

  focar() {
    if (!this.quadro) return;
    this.quadro.focus();
    this.postar({ tipo: 'foco' });
  }

  mostrarStatus(direita) {
    const esquerda = this.ligado ? `${this.modelo} · ${(this.nomes || []).join(', ')}` : 'C:\\Mac';
    this.j.definirStatus([esquerda, direita || '']);
  }

  /** O tamanho do quadro: a tela do Mac no tamanho real ou no dobro, ou a janela inteira. */
  ajustar() {
    if (!this.quadro) return;
    if (this.escala === 0) {
      this.quadro.style.width = '100%';
      this.quadro.style.height = '100%';
      return;
    }
    this.quadro.style.width = this.tam.w * this.escala + 'px';
    this.quadro.style.height = this.tam.h * this.escala + 'px';
  }

  mudarEscala(k) {
    this.escala = k;
    this.ajustar();
    if (k) this.encaixar();
  }

  /** No tamanho real e no dobro, a janela acompanha a tela do Mac. */
  encaixar() {
    if (this.j.maximizada) return;
    ajustarAoConteudo(this.j);
  }

  async guardar(avisar) {
    if (!this.ligado || this.guardando) return;
    this.guardando = true;
    try {
      const m = await this.pedir('ler');
      if (!m || m.erro) throw new Error((m && m.erro) || tr('O Mac não respondeu.'));
      const discos = (m.discos || []).map((d) => ({ caminho: d.caminho, conteudo: new Uint8Array(d.conteudo) }));
      const r = discos.length ? await retro.mac.guardar(this.foto, discos) : { gravados: 0, foto: this.foto };
      this.foto = r.foto;
      if (r.gravados) this.mostrarStatus(tr('Guardado às {hora}', { hora: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) }));
      if (avisar) info(r.gravados ? tr('{n} disco(s) guardado(s) no disco C:.', { n: r.gravados }) : tr('Nada mudou desde a última vez.'), tr('Mac Plus'));
    } catch (e) {
      if (avisar) erro(tr('Não foi possível guardar no disco: {erro}', { erro: e.message || e }), tr('Mac Plus'));
    } finally {
      this.guardando = false;
    }
  }

  /** Fechar a janela guarda os discos que mudaram e desliga o emulador. */
  async fechar() {
    if (this.saindo) return true;
    this.saindo = true;
    clearInterval(this.timer);
    if (this.ligado) {
      this.aviso.hidden = false;
      this.aviso.textContent = tr('Guardando os discos…');
      await this.guardar(false);
      await this.pedir('desligar');
    }
    this.limpar();
    return true;
  }

  async escolherDisco() {
    const rel = await caixaArquivo({ modo: 'abrir', titulo: tr('Ligar com outro disco'), pasta: 'Mac', tipos: [{ rotulo: tr('Discos do Mac (*.dsk, *.img, *.image)'), exts: EXTS }] });
    if (rel) this.religar(rel);
  }
}

let aberta = null;

registrarApp('mac', {
  nome: 'Mac Plus', icone: 'mac',
  abrir: (args = {}) => {
    if (aberta && !aberta.j.fechada) {
      aberta.j.focar();
      if (args.arquivo) aberta.religar(args.arquivo);
      return aberta;
    }
    aberta = new JanelaMac(args.arquivo);
    return aberta;
  },
});
