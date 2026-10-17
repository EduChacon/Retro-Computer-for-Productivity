/*
 * A Nuvem (Linux): as contas do Google Drive, do OneDrive e do Dropbox pelo rclone. Cada conta
 * conectada aparece no Meu computador como uma unidade (ver, trazer e levar cópias); aqui ficam
 * adicionar (o login no navegador do computador), conectar, desconectar, renomear e remover.
 * Quem fala com o rclone é o processo principal (nuvem.js de lá); a tela não vê nenhuma chave.
 */
import { h, img, rotulo } from '../util.js';
import { Janela } from '../janelas.js';
import { registrarApp, abrir, avisar } from '../sistema.js';
import { erro, entrada, confirmar, ajustarAoConteudo } from '../dialogos.js';
import { comSenhaAdmin } from '../admin.js';
import { abrirMenu } from '../menus.js';
import { tr, marcar } from '../idioma.js';
import { pastaDaUnidade } from '../unidades.js';

const SERVICOS = [['drive', 'Google Drive'], ['onedrive', 'OneDrive'], ['dropbox', 'Dropbox']];
const ESTADOS = { conectada: marcar('Conectada'), conectando: marcar('Conectando…'), desconectada: marcar('Desconectada') };
let aberta = null;

const mensagemDe = (e) => String((e && e.message) || e || '').replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

class Nuvem {
  constructor() {
    this.j = new Janela({ id: 'nuvem', titulo: tr('Nuvem'), icone: 'nuvem', largura: 500, altura: 360, minLargura: 430, minAltura: 300 });
    this.escolhido = 0;
    this.contas = [];
    this.estado = null;
    this.j.corpo.classList.add('nv-corpo');
    const parar = retro.nuvem.aoMudar((lista) => { this.contas = lista || []; this.desenhar(); });
    this.j.ev.on('fechada', () => { parar(); aberta = null; });
    this.carregar();
  }

  focar() { this.j.focar(); }

  async carregar() {
    this.j.corpo.replaceChildren(h('div.ag-vazio', tr('Procurando o rclone…')));
    try { this.estado = await retro.nuvem.estado(); } catch (e) { this.estado = { disponivel: false, erro: mensagemDe(e) }; }
    this.contas = this.estado.contas || [];
    this.desenhar();
  }

  atual() { return this.contas[this.escolhido] || null; }

  /** O topo: o desenho e o que a janela faz. */
  topo() {
    return h('div.nv-topo', img('nuvem', 32), h('div',
      tr('As contas do Google Drive, do OneDrive e do Dropbox. Conectada, a conta aparece no Meu computador: abra as pastas, copie arquivos para o disco C: e leve arquivos do C: para a nuvem. Nada é apagado da nuvem por aqui.')));
  }

  desenhar() {
    const e = this.estado;
    if (!e) return;
    const filhos = [this.topo()];
    if (!e.disponivel) {
      filhos.push(h('div.nv-aviso', e.erro || tr('As contas na nuvem pelo rclone são do Linux. No Windows e no Mac, use o programa do Google Drive, do OneDrive ou do Dropbox do computador principal.')));
      this.j.corpo.replaceChildren(...filhos);
      return;
    }
    if (!e.rclone || !e.fuse) {
      filhos.push(h('div.nv-aviso', !e.rclone
        ? tr('Para conectar as contas, o Retro Computer usa o rclone, um programa livre que fala com os serviços de nuvem, e o FUSE do Linux, que mostra a nuvem como uma pasta.')
        : tr('Falta o FUSE do Linux, que mostra a nuvem como uma pasta.')));
      filhos.push(e.instalavel
        ? h('div.acoes', h('button.padrao', { type: 'button', on: { click: () => this.instalar() } }, rotulo(tr('&Instalar o rclone…'))))
        : h('div.nv-aviso', tr('Instale o rclone e o fuse3 pelo gerenciador de programas do Linux e abra esta janela de novo.')));
      this.j.corpo.replaceChildren(...filhos);
      return;
    }
    if (!e.serve) {
      filhos.push(h('div.nv-aviso', tr('O rclone deste computador é antigo ({versao}): as contas na nuvem precisam da versão 1.56 ou mais nova (a do Linux Mint 22 serve).', { versao: e.rclone })));
      this.j.corpo.replaceChildren(...filhos);
      return;
    }
    this.escolhido = Math.max(0, Math.min(this.escolhido, this.contas.length - 1));
    const lista = h('div.ag-lista.nv-lista', { tabIndex: 0 });
    lista.replaceChildren(...(this.contas.length ? this.contas.map((c, i) => h('div.ag-item' + (i === this.escolhido ? '.escolhido' : '') + (c.estado !== 'conectada' ? '.apagado' : ''), {
      on: { mousedown: () => { this.escolhido = i; this.desenhar(); }, dblclick: () => this.abrirConta() },
    }, img('nuvem', 16), h('div.ag-texto', h('b', c.nome), h('span', this.situacao(c))))) : [h('div.ag-vazio', tr('Nenhuma conta. Use Adicionar uma conta para entrar no Google Drive, no OneDrive ou no Dropbox.'))]));
    lista.addEventListener('keydown', (ev) => {
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { ev.preventDefault(); this.escolhido += ev.key === 'ArrowDown' ? 1 : -1; this.desenhar(); this.j.corpo.querySelector('.nv-lista').focus(); }
      else if (ev.key === 'Enter') { ev.preventDefault(); this.abrirConta(); }
    });
    const c = this.atual();
    const aoLigar = h('input', { type: 'checkbox', checked: !!c && c.aoLigar, disabled: !c });
    aoLigar.addEventListener('change', () => { if (c) retro.nuvem.mudar(c.id, { aoLigar: aoLigar.checked }).catch((x) => erro(mensagemDe(x))); });
    const bt = (rot, acao, { padrao = false, desativado = false } = {}) => h('button' + (padrao ? '.padrao' : ''), { type: 'button', disabled: desativado, on: { click: acao } }, rotulo(rot));
    const conectada = !!c && c.estado === 'conectada';
    filhos.push(
      lista,
      h('label.nv-opcao', aoLigar, h('span', rotulo(tr('Conectar ao &ligar o Retro Computer')))),
      h('div.acoes',
        bt(tr('&Adicionar uma conta…'), (ev) => this.menuServicos(ev.currentTarget), { padrao: true }),
        conectada
          ? bt(tr('&Desconectar'), () => this.desconectar(), {})
          : bt(tr('&Conectar'), () => this.conectar(), { desativado: !c || c.estado === 'conectando' }),
        bt(tr('A&brir'), () => this.abrirConta(), { desativado: !c || c.estado === 'conectando' }),
        bt(tr('Re&nomear…'), () => this.renomear(), { desativado: !c }),
        bt(tr('&Remover…'), () => this.remover(), { desativado: !c })),
    );
    const foco = this.j.corpo.contains(document.activeElement) && document.activeElement.classList.contains('nv-lista');
    this.j.corpo.replaceChildren(...filhos);
    if (foco) lista.focus();
  }

  situacao(c) {
    const partes = [c.servico, tr(ESTADOS[c.estado] || ESTADOS.desconectada)];
    const erros = {
      caiu: tr('a conexão caiu'), login: tr('o acesso expirou: remova e adicione de novo'), fuse: tr('falta o FUSE'),
      tempo: tr('não respondeu a tempo'), conta: tr('a conta sumiu do rclone'),
    };
    if (c.erro && c.estado !== 'conectada') partes.push(erros[c.erro] || tr('não conectou'));
    return partes.join(' · ');
  }

  menuServicos(botao) {
    const r = botao.getBoundingClientRect();
    abrirMenu(SERVICOS.map(([tipo, nome]) => ({ rotulo: nome, icone: 'nuvem', acao: () => this.adicionar(tipo, nome) })), { x: r.left, y: r.bottom });
  }

  async instalar() {
    const r = await comSenhaAdmin(tr('Para instalar o rclone e o FUSE, digite a senha de administrador do Linux:'), (senha) => retro.nuvem.instalar(senha));
    if (r && !r.ok && !r.senhaErrada && !r.naoPode) erro(tr('Não foi possível instalar o rclone: {erro}', { erro: r.erro || '?' }), tr('Nuvem'));
    this.carregar();
  }

  /** Adicionar: o login no navegador do computador, com a caixa esperando; depois, conecta. */
  async adicionar(tipo, servico) {
    const id = await caixaLogin(tipo, servico);
    if (!id) return;
    this.contas = await retro.nuvem.estado().then((e) => e.contas || []).catch(() => this.contas);
    this.escolhido = Math.max(0, this.contas.findIndex((c) => c.id === id));
    this.desenhar();
    await this.conectar(id);
  }

  async conectar(id = this.atual() && this.atual().id) {
    if (!id) return;
    try {
      await retro.nuvem.conectar(id);
      const c = this.contas.find((x) => x.id === id);
      const nome = c ? c.nome : '';
      avisar(tr('{nome} conectado', { nome }), tr('A nuvem está no Meu computador: clique para abrir.'), { icone: 'nuvem', som: null, aoClicar: () => abrir('explorador', { pasta: pastaDaUnidade('nuvem:' + id) }) });
    } catch (e) {
      erro(tr('Não foi possível conectar: {erro}', { erro: mensagemDe(e) }), tr('Nuvem'));
    }
  }

  async desconectar() {
    const c = this.atual();
    if (!c) return;
    await retro.nuvem.desconectar(c.id).catch((e) => erro(mensagemDe(e)));
  }

  async abrirConta() {
    const c = this.atual();
    if (!c) return;
    if (c.estado !== 'conectada') {
      await this.conectar(c.id);
      const agora = await retro.nuvem.estado().then((e) => (e.contas || []).find((x) => x.id === c.id)).catch(() => null);
      if (!agora || agora.estado !== 'conectada') return;
    }
    abrir('explorador', { pasta: pastaDaUnidade('nuvem:' + c.id) });
  }

  async renomear() {
    const c = this.atual();
    if (!c) return;
    const nome = await entrada({ titulo: tr('Renomear a conta'), texto: tr('O nome da conta no Meu computador:'), valor: c.nome, icone: 'nuvem' });
    if (nome && nome.trim()) retro.nuvem.renomear(c.id, nome.trim()).catch((e) => erro(mensagemDe(e)));
  }

  async remover() {
    const c = this.atual();
    if (!c) return;
    const ok = await confirmar(tr('Tirar "{nome}" do Retro Computer?\n\nOs arquivos continuam na nuvem, como estão; o acesso deste computador à conta é esquecido.', { nome: c.nome }), { titulo: tr('Remover a conta') });
    if (ok) retro.nuvem.remover(c.id).catch((e) => erro(mensagemDe(e)));
  }
}

/** A caixa do login: o navegador abre na página do serviço; ela espera e devolve o id (ou null). */
function caixaLogin(tipo, servico) {
  return new Promise((resolve) => {
    let feito = false;
    const fim = (id) => { if (feito) return; feito = true; parar(); j.fechar(true); resolve(id); };
    const j = new Janela({ titulo: tr('Entrar no {servico}', { servico }), icone: 'nuvem', dialogo: true, largura: 420, altura: 220, aoFechar: () => { if (!feito) { retro.nuvem.cancelar().catch(() => { }); feito = true; parar(); resolve(null); } } });
    const estado = h('div.ag-nota', tr('Abrindo o navegador…'));
    const deNovo = h('button', { type: 'button', disabled: true, on: { click: () => retro.nuvem.abrirLogin().catch(() => { }) } }, rotulo(tr('Abrir o &navegador de novo')));
    const cancelar = h('button', { type: 'button', on: { click: () => { retro.nuvem.cancelar().catch(() => { }); } } }, tr('Cancelar'));
    const parar = retro.nuvem.aoAutorizar(() => {
      estado.textContent = tr('Esperando você entrar na conta no navegador…');
      deNovo.disabled = false;
    });
    j.corpo.classList.add('nv-login');
    j.corpo.append(
      h('div.nv-topo', img('nuvem', 32), h('div', tr('O navegador do computador abre na página do {servico}. Entre na sua conta e permita o acesso do rclone; depois, volte para cá. A senha fica só com o {servico}.', { servico }))),
      estado,
      h('div.acoes.direita', deNovo, cancelar),
    );
    ajustarAoConteudo(j, { largura: 420 });
    retro.nuvem.adicionar(tipo).then((id) => fim(id), (e) => {
      const m = mensagemDe(e);
      if (feito) return;
      fim(null);
      // Cancelar (pela caixa ou pelo X) não é um erro.
      if (m !== tr('A conta não foi adicionada.')) erro(tr('Não foi possível adicionar a conta: {erro}', { erro: m }), tr('Nuvem'));
    });
  });
}

function abrirNuvem() {
  if (aberta) { aberta.focar(); return aberta.j; }
  aberta = new Nuvem();
  return aberta.j;
}

registrarApp('nuvem', { nome: 'Nuvem', icone: 'nuvem', abrir: abrirNuvem });
