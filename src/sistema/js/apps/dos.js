/*
 * O DOS: o DOSBox do projeto js-dos (o pacote "emulators", GPL-2.0, sem modificação) numa
 * janela, sem internet. O emulador roda num quadro isolado, em dos://emulador (src/dos/), sem a
 * ponte com o processo principal; esta janela conversa com ele só por mensagens. A unidade C: é a
 * pasta C:\DOS do disco (ou a pasta do programa aberto com dois cliques): os arquivos vão para o
 * emulador ao ligar e voltam ao disco ao fechar a janela (ou em Arquivo › Guardar no disco), pelo
 * processo principal (src/principal/dos.js), com a versão anterior guardada e o que o DOS apagou
 * na Lixeira.
 */
import { h } from '../util.js';
import { Janela } from '../janelas.js';
import { registrarApp, abrir, eventos } from '../sistema.js';
import { erro, info, ajustarAoConteudo, caixaArquivo } from '../dialogos.js';
import { tr } from '../idioma.js';
import { estado as estadoSons } from '../sons.js';

const ORIGEM = 'dos://emulador';
const caminhoTela = (rel) => 'C:\\' + String(rel || '').replace(/\//g, '\\');

class JanelaDos {
  constructor(arquivo) {
    this.escala = 1;
    this.tam = { w: 640, h: 400 };
    this.pedidos = new Map();
    this.n = 0;
    this.j = new Janela({
      id: 'dos', titulo: tr('DOS'), icone: 'dos', largura: 660, altura: 560, classe: 'dos', status: ['', ''],
      aoFechar: () => this.fechar(),
      menus: [
        {
          rotulo: tr('&Arquivo'), itens: () => [
            { rotulo: tr('&Abrir um programa…'), acao: () => this.escolherPrograma() },
            { rotulo: tr('&Guardar no disco'), desativado: !this.ligado, acao: () => this.guardar(true) },
            { rotulo: tr('Abrir a &pasta no Explorador'), acao: () => abrir('explorador', { pasta: this.pasta || 'DOS' }) },
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
            { rotulo: tr('&Como usar'), acao: () => info(tr('O DOS é o DOSBox, um emulador do computador da época, com o prompt "C:\\>". A unidade C: dele é a pasta C:\\DOS do disco do Retro Computer: ponha lá os seus programas e jogos do DOS (copie-os pelo Explorador) e digite o nome do programa para abri-lo. Dois cliques num programa do DOS (.com, .bat ou um .exe do DOS) também o abrem.\n\nO que mudar lá dentro volta para o disco ao fechar a janela (ou em Arquivo › Guardar no disco): os arquivos regravados guardam a versão anterior, e os apagados vão para a Lixeira.\n\nO teclado é o americano. Clique na tela para o DOS receber as teclas; o comando EXIT fecha a janela. Tudo funciona sem internet.\n\nO DOSBox é do projeto js-dos (GPL-2.0); veja ATRIBUICOES.md.'), tr('DOS')) },
          ],
        },
      ],
    });
    this.aviso = h('div.dos-aviso', tr('Ligando o DOS…'));
    this.moldura = h('div.dos-moldura', this.aviso);
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

  /** Um pedido ao emulador que volta com resposta (ler os arquivos, desligar). */
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
    if (m.tipo === 'pronto') this.mandarArquivos();
    else if (m.tipo === 'ligado') {
      this.ligado = true;
      this.aviso.hidden = true;
      this.mostrarStatus('');
      this.focar();
      this.timer = setInterval(() => this.guardar(false), 120000);
    } else if (m.tipo === 'tamanho') {
      this.tam = { w: Number(m.w) || 640, h: Number(m.h) || 400 };
      this.ajustar();
      if (this.escala) this.encaixar();
    } else if (m.tipo === 'erro') {
      this.falhou(m.erro);
    } else if (m.tipo === 'saiu') {
      // O EXIT do DOS: guarda e fecha a janela.
      if (!this.saindo) this.j.fechar();
    } else if ((m.tipo === 'arquivos' || m.tipo === 'desligado') && this.pedidos.has(m.id)) {
      const r = this.pedidos.get(m.id);
      this.pedidos.delete(m.id);
      r(m);
    }
  }

  /** Liga (ou religa) o DOS com a unidade C: do programa escolhido (ou C:\DOS). */
  async religar(arquivo) {
    if (this.quadro) {
      await this.guardar(false);
      await this.pedir('desligar');
      this.quadro.remove();
      this.quadro = null;
    }
    clearInterval(this.timer);
    this.ligado = false;
    this.arquivo = arquivo || '';
    this.aviso.hidden = false;
    this.aviso.textContent = tr('Ligando o DOS…');
    const u = await retro.dos.abrir(this.arquivo).catch((e) => ({ ok: false, erro: e.message }));
    if (this.j.fechada) return;
    if (!u.ok) {
      this.aviso.textContent = '';
      if (u.grande) await erro(tr('A pasta {pasta} é grande demais para o DOS (mais de {mb} MB). Ponha o programa numa pasta menor, como C:\\DOS.', { pasta: caminhoTela(u.pasta), mb: Math.round(u.limite / 1048576) }), tr('DOS'));
      else await erro(tr('Não foi possível ligar o DOS: {erro}', { erro: u.erro || '?' }), tr('DOS'));
      this.limpar();
      this.j.fechar(true);
      return;
    }
    this.unidade = u;
    this.pasta = u.pasta;
    this.foto = u.foto;
    // O quadro isolado: a origem do emulador, sem acesso a esta página nem à ponte.
    this.quadro = h('iframe.dos-quadro', { src: ORIGEM + '/', sandbox: 'allow-scripts allow-same-origin' });
    this.quadro.setAttribute('aria-label', tr('DOS'));
    this.moldura.append(this.quadro);
    this.ajustar();
    if (this.escala) this.encaixar();
  }

  mandarArquivos() {
    const u = this.unidade;
    if (!u || !u.arquivos) return;
    const arquivos = u.arquivos.map((a) => {
      const b = new Uint8Array(a.conteudo);
      return { caminho: a.caminho, conteudo: b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) };
    });
    this.postar({ tipo: 'volume', volume: this.volume() });
    this.postar({ tipo: 'ligar', conf: u.conf, arquivos }, arquivos.map((a) => a.conteudo));
    // Os arquivos já foram para o emulador: a cópia daqui não precisa ficar na memória.
    u.arquivos = null;
  }

  falhou(msg) {
    this.aviso.textContent = '';
    erro(tr('Não foi possível ligar o DOS: {erro}', { erro: msg || '?' }), tr('DOS'));
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
    this.j.definirStatus([tr('C: = {pasta}', { pasta: caminhoTela(this.pasta) }), direita || '']);
  }

  /** O tamanho do quadro: a tela do DOS em 4:3 (no tamanho real ou no dobro), ou a janela inteira. */
  ajustar() {
    if (!this.quadro) return;
    if (this.escala === 0) {
      this.quadro.style.width = '100%';
      this.quadro.style.height = '100%';
      return;
    }
    const largura = (this.tam.w <= 360 ? this.tam.w * 2 : this.tam.w) * this.escala;
    this.quadro.style.width = largura + 'px';
    this.quadro.style.height = Math.round(largura * 0.75) + 'px';
  }

  mudarEscala(k) {
    this.escala = k;
    this.ajustar();
    if (k) this.encaixar();
  }

  /** No tamanho real e no dobro, a janela acompanha a tela do DOS. */
  encaixar() {
    if (this.j.maximizada) return;
    ajustarAoConteudo(this.j);
  }

  async guardar(avisar) {
    if (!this.ligado || this.guardando) return;
    this.guardando = true;
    try {
      const m = await this.pedir('ler');
      if (!m || m.erro) throw new Error((m && m.erro) || tr('O DOS não respondeu.'));
      const r = await retro.dos.guardar(this.pasta, this.foto, m.arquivos.map((a) => ({ caminho: a.caminho, conteudo: new Uint8Array(a.conteudo) })), m.pastas);
      this.foto = r.foto;
      if (r.gravados || r.lixeira) this.mostrarStatus(tr('Guardado às {hora}', { hora: new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) }));
      if (avisar) info(r.gravados || r.lixeira ? tr('{n} arquivo(s) guardado(s) no disco; {m} na Lixeira.', { n: r.gravados, m: r.lixeira }) : tr('Nada mudou desde a última vez.'), tr('DOS'));
    } catch (e) {
      if (avisar) erro(tr('Não foi possível guardar no disco: {erro}', { erro: e.message || e }), tr('DOS'));
    } finally {
      this.guardando = false;
    }
  }

  /** Fechar a janela guarda o que mudou e desliga o emulador. */
  async fechar() {
    if (this.saindo) return true;
    this.saindo = true;
    clearInterval(this.timer);
    if (this.ligado) {
      this.aviso.hidden = false;
      this.aviso.textContent = tr('Guardando os arquivos…');
      await this.guardar(false);
      await this.pedir('desligar');
    }
    this.limpar();
    return true;
  }

  async escolherPrograma() {
    const rel = await caixaArquivo({ modo: 'abrir', titulo: tr('Abrir um programa'), pasta: this.pasta || 'DOS', tipos: [{ rotulo: tr('Programas do DOS (*.exe, *.com, *.bat)'), exts: ['exe', 'com', 'bat'] }] });
    if (rel) this.religar(rel);
  }
}

let aberta = null;

registrarApp('dos', {
  nome: 'DOS', icone: 'dos',
  abrir: (args = {}) => {
    if (aberta && !aberta.j.fechada) {
      aberta.j.focar();
      if (args.arquivo) aberta.religar(args.arquivo);
      return aberta;
    }
    aberta = new JanelaDos(args.arquivo);
    return aberta;
  },
});
