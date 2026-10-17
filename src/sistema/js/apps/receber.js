/*
 * Receber do celular: a janela liga o servidor da rede local (src/principal/receber.js) e mostra o
 * código QR e o endereço para o celular abrir. Cada aparelho novo é aceito aqui; os arquivos entram
 * em Meus documentos › Recebidos. Fechar a janela desliga o servidor.
 */
import { h, img, rotulo, caminhoTela, nomeDe, tamanho } from '../util.js';
import { Janela } from '../janelas.js';
import { registrarApp, estado, abrir, avisarRecebido } from '../sistema.js';
import { mensagem, erro, ajustarAoConteudo } from '../dialogos.js';
import { tocar } from '../sons.js';
import { tr } from '../idioma.js';

let aberta = null;

/** "um iPhone", "um celular Android"… pelo que o navegador do aparelho diz de si. */
function aparelhoDe(ua) {
  const u = String(ua || '');
  if (/iPhone/i.test(u)) return tr('um iPhone');
  if (/iPad/i.test(u)) return tr('um iPad');
  if (/Android/i.test(u)) return /Mobile/i.test(u) ? tr('um celular Android') : tr('um tablet Android');
  if (/Windows|Macintosh|Linux|CrOS/i.test(u)) return tr('um computador');
  return tr('um aparelho');
}

/** O código QR num canvas: cada ponto vira um quadrado de `escala` pixels, com a margem branca de 4 pontos. */
function desenharQr(canvas, { n, pontos }, escala = 4) {
  const lado = (n + 8) * escala;
  canvas.width = lado;
  canvas.height = lado;
  const c = canvas.getContext('2d');
  c.fillStyle = '#fff';
  c.fillRect(0, 0, lado, lado);
  c.fillStyle = '#000';
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (pontos[r * n + k] === '1') c.fillRect((k + 4) * escala, (r + 4) * escala, escala, escala);
}

class JanelaReceber {
  constructor() {
    this.j = new Janela({ id: 'receber', titulo: tr('Receber do celular'), icone: 'celular', largura: 500, altura: 360, redimensionavel: false, maximizavel: false, status: [''] });
    this.qr = h('canvas.rec-qr', { width: 148, height: 148 });
    this.endereco = h('div.rec-endereco');
    this.estadoEl = h('div.rec-estado');
    this.lista = h('div.rec-lista');
    this.selRede = h('select', { on: { change: () => this.ligar(this.selRede.value) } });
    this.linhaRede = h('div.rec-rede', { hidden: true }, h('label', rotulo(tr('&Rede:'))), h('div.select-caixa', this.selRede));
    this.btLigar = h('button', { type: 'button', hidden: true, on: { click: () => this.ligar() } }, rotulo(tr('&Ligar de novo')));
    this.aviso = h('div.rec-aviso', { hidden: true });
    this.j.corpo.classList.add('rec-corpo');
    this.j.corpo.append(
      h('div.rec-topo',
        h('div.rec-qr-caixa', this.qr),
        h('div.rec-passos',
          h('ol',
            h('li', tr('Ligue o celular na mesma rede Wi-Fi deste computador.')),
            h('li', tr('Aponte a câmera do celular para o código ou digite o endereço no navegador dele:'))),
          this.endereco,
          h('div.rec-pasta', tr('Os arquivos vão para {pasta}. Nada é apagado nem gravado por cima.', { pasta: caminhoTela(this.pasta()) })),
          this.linhaRede, this.aviso)),
      this.estadoEl,
      this.lista,
      h('div.acoes',
        this.btLigar,
        h('button', { type: 'button', on: { click: () => abrir('explorador', { pasta: this.pasta() }) } }, rotulo(tr('Abrir a &pasta'))),
        h('button.padrao', { type: 'button', on: { click: () => this.j.fechar() } }, rotulo(tr('&Parar e fechar')))),
    );
    this.parar = [
      retro.receber.aoPedido((p) => this.pedido(p)),
      retro.receber.aoArquivo((a) => this.arquivo(a)),
      retro.receber.aoFim((f) => this.fim(f)),
    ];
    this.j.ev.on('fechada', () => {
      for (const p of this.parar) p();
      retro.receber.parar().catch(() => { });
      aberta = null;
    });
    ajustarAoConteudo(this.j, { largura: 500 });
    this.ligar();
    this.avisarFirewall();
  }

  pasta() {
    const p = estado.config.pastas || {};
    return `${p.documentos || 'Meus documentos'}/${p.recebidos || 'Recebidos'}`;
  }

  async ligar(ip) {
    this.btLigar.hidden = true;
    this.estadoEl.textContent = tr('Ligando…');
    try {
      if (ip) await retro.receber.parar();
      const info = await retro.receber.iniciar(ip);
      const qr = await retro.receber.qr(info.url);
      if (qr) desenharQr(this.qr, qr);
      this.qr.classList.remove('apagado');
      this.endereco.textContent = info.url;
      this.selRede.replaceChildren(...info.enderecos.map((x) => h('option', { value: x, selected: x === info.ip }, x)));
      this.linhaRede.hidden = info.enderecos.length < 2;
      this.estadoEl.textContent = tr('Aguardando o celular…');
      this.j.definirStatus(tr('Ligado em {ip}, porta {porta} · desliga sozinho depois de 15 minutos sem uso', { ip: info.ip, porta: info.porta }));
    } catch (e) {
      this.qr.classList.add('apagado');
      this.endereco.textContent = '';
      this.estadoEl.textContent = e.message || String(e);
      this.btLigar.hidden = false;
    }
  }

  async avisarFirewall() {
    // No Linux com o firewall ligado, o celular não chega (o Windows e o Mac perguntam sozinhos).
    if (estado.config.plataforma !== 'linux' || !retro.firewall) return;
    const f = await retro.firewall.estado().catch(() => null);
    if (f && f.ligado) {
      this.aviso.hidden = false;
      this.aviso.textContent = tr('O firewall deste computador está ligado e pode não deixar o celular chegar. Se o celular não abrir a página, desligue o firewall enquanto recebe (Painel de controle › Firewall) e ligue-o de novo depois.');
    }
  }

  async pedido({ ip, aparelho }) {
    tocar('pergunta');
    this.j.focar();
    const v = await mensagem({
      titulo: tr('Receber do celular'), tipo: 'pergunta',
      texto: tr('{aparelho} (endereço {ip}) quer mandar arquivos para este computador.\n\nAceite só se for o seu celular, ou de alguém que você conhece.', { aparelho: aparelhoDe(aparelho).replace(/^./, (c) => c.toUpperCase()), ip }),
      botoes: [{ texto: tr('&Aceitar'), valor: true }, { texto: tr('&Recusar'), valor: false, padrao: true }],
    });
    await retro.receber.aprovar(ip, v === true).catch(() => { });
    this.estadoEl.textContent = v === true ? tr('{ip} aceito: os arquivos aparecem aqui quando chegarem.', { ip }) : tr('{ip} recusado.', { ip });
  }

  arquivo({ rel, nome, tamanho: t }) {
    this.estadoEl.textContent = tr('Recebido: {nome}', { nome });
    this.lista.prepend(h('div.rec-item', { title: caminhoTela(rel), on: { dblclick: () => abrir('explorador', { pasta: this.pasta(), selecionar: rel }) } },
      img('arquivo', 16), h('span', nomeDe(rel)), h('span.rec-tam', tamanho(t))));
    avisarRecebido(rel);
  }

  fim({ motivo }) {
    if (motivo === 'fechado') return;
    // Desligado: o endereço velho não vale mais.
    this.qr.classList.add('apagado');
    this.endereco.textContent = '';
    this.j.definirStatus(tr('Desligado'));
    this.btLigar.hidden = false;
    if (motivo === 'tentativas') {
      this.estadoEl.textContent = tr('Desligado: houve muitas tentativas com o código errado. Ligue de novo para ter um código novo.');
      erro(tr('O Receber do celular foi desligado: alguém tentou entrar com o código errado muitas vezes.\n\nLigue de novo para ter um código novo.'));
    } else {
      this.estadoEl.textContent = tr('Desligado depois de 15 minutos sem uso.');
    }
  }
}

function abrirReceber() {
  if (aberta) { aberta.j.focar(); return aberta.j; }
  aberta = new JanelaReceber();
  return aberta.j;
}

registrarApp('receber', { nome: 'Receber do celular', icone: 'celular', abrir: abrirReceber });
