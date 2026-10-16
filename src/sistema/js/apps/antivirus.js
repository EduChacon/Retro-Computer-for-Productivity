/*
 * O Antivírus: verifica uma pasta, um arquivo, o disco C: inteiro ou um pendrive (o ClamAV no
 * Linux, o Microsoft Defender no Windows; src/principal/antivirus.js). Nada é apagado: o que for
 * achado aparece na lista, e os arquivos do disco C: podem ir para a Lixeira.
 */
import { h, img, caminhoTela } from '../util.js';
import { Janela } from '../janelas.js';
import { registrarApp } from '../sistema.js';
import { tr } from '../idioma.js';
import { erro, info } from '../dialogos.js';
import { comSenhaAdmin } from '../admin.js';
import { excluir } from '../arquivos.js';
import { tocar } from '../sons.js';

let aberta = null;

const rotuloDoAlvo = (alvo) => (alvo.tipo === 'unidade'
  ? (alvo.nome || '') + (alvo.rel ? '\\' + alvo.rel.replace(/\//g, '\\') : '')
  : caminhoTela(alvo.rel || ''));

class JanelaAntivirus {
  constructor(alvo) {
    this.alvo = alvo || { tipo: 'disco', rel: '' };
    this.achados = [];
    this.rodando = false;
    this.j = new Janela({ id: 'antivirus', titulo: tr('Antivírus'), icone: 'seguranca', largura: 460, altura: 400, status: [''] });
    this.alvoEl = h('div.campo', { style: { height: 'auto', minHeight: '20px', overflowWrap: 'anywhere', userSelect: 'text' } });
    this.barra = h('div.progresso', h('div'));
    this.situacao = h('div', { style: { minHeight: '26px', lineHeight: '13px', overflowWrap: 'anywhere' } });
    this.lista = h('div.av-lista.campo', { tabIndex: 0 });
    this.btVerificar = h('button.padrao', { on: { click: () => (this.rodando ? this.parar() : this.verificar()) } }, tr('Verificar agora'));
    this.btLixeira = h('button', { disabled: true, on: { click: () => this.mandarParaLixeira() } }, tr('Mandar para a Lixeira'));
    this.motor = h('div', { style: { color: '#404040', lineHeight: '13px', flex: '1' } });
    this.btMotor = h('button', { hidden: true });
    this.j.corpo.style.padding = '8px';
    this.j.corpo.style.display = 'flex';
    this.j.corpo.style.flexDirection = 'column';
    this.j.corpo.style.gap = '6px';
    this.j.corpo.append(
      h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center' } }, img('seguranca', 32),
        h('div', { style: { lineHeight: '13px' } }, tr('Procura vírus e outros programas nocivos nos arquivos. Nada é apagado: o que for achado aparece na lista.'))),
      h('div', tr('Verificar:')), this.alvoEl,
      this.barra, this.situacao,
      h('div', tr('Ameaças encontradas:')), this.lista,
      h('div.acoes', this.btVerificar, this.btLixeira, h('button', { on: { click: () => this.j.fechar() } }, tr('Fechar'))),
      h('hr.sulco'),
      h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, this.motor, this.btMotor),
    );
    this.paraDeOuvir = [
      retro.antivirus.aoAndar((x) => this.andar(x)),
      retro.antivirus.aoAchar((x) => this.achar(x)),
    ];
    this.j.ev.on('fechada', () => {
      for (const f of this.paraDeOuvir) f();
      if (this.rodando) retro.antivirus.parar().catch(() => { });
      aberta = null;
    });
    this.definirAlvo(this.alvo);
    this.lerMotor();
  }

  definirAlvo(alvo, comecar = false) {
    if (this.rodando) return;
    this.alvo = alvo;
    this.alvoEl.textContent = rotuloDoAlvo(alvo);
    this.achados = [];
    this.desenharLista();
    this.barra.firstChild.style.width = '0';
    this.situacao.textContent = tr('Clique em "Verificar agora" para começar.');
    if (comecar && this.disponivel) this.verificar();
  }

  async lerMotor() {
    const e = await retro.antivirus.estado().catch(() => ({ disponivel: false }));
    this.disponivel = e.disponivel;
    this.btVerificar.disabled = !e.disponivel;
    this.btMotor.hidden = true;
    if (e.disponivel && e.motor === 'clamav') {
      this.motor.textContent = e.versao && e.versao.data
        ? tr('ClamAV {versao}, definições de {data}.', { versao: e.versao.versao, data: e.versao.data })
        : tr('ClamAV {versao}.', { versao: (e.versao && e.versao.versao) || '' });
      this.mostrarBotaoMotor(tr('Atualizar as definições'), () => this.atualizarDefinicoes());
    } else if (e.disponivel) {
      this.motor.textContent = tr('Microsoft Defender, com as definições do próprio Windows.');
    } else if (e.instalavel) {
      this.motor.textContent = tr('O antivírus ClamAV não está instalado.');
      this.mostrarBotaoMotor(tr('Instalar o ClamAV'), () => this.instalar());
    } else {
      this.motor.textContent = e.sistema
        ? tr('O macOS verifica os arquivos sozinho (o XProtect); não há verificação à mão.')
        : tr('Nenhum antivírus foi encontrado neste computador.');
    }
    if (!e.disponivel) this.situacao.textContent = '';
    if (this.esperando && e.disponivel) { this.esperando = false; this.verificar(); }
  }

  mostrarBotaoMotor(texto, acao) {
    this.btMotor.textContent = texto;
    this.btMotor.hidden = false;
    this.btMotor.onclick = acao;
  }

  async instalar() {
    this.btMotor.disabled = true;
    this.motor.textContent = tr('Instalando o ClamAV… (pode levar alguns minutos)');
    const r = await comSenhaAdmin(tr('Para instalar o antivírus ClamAV, digite a senha de administrador do Linux:'), (senha) => retro.antivirus.instalar(senha));
    this.btMotor.disabled = false;
    if (r && !r.ok && !r.senhaErrada && !r.naoPode) erro(tr('Não foi possível instalar o ClamAV: {erro}', { erro: r.erro || '?' }), tr('Antivírus'));
    this.lerMotor();
  }

  async atualizarDefinicoes() {
    this.btMotor.disabled = true;
    const r = await comSenhaAdmin(tr('Para atualizar as definições do antivírus, digite a senha de administrador do Linux:'), (senha) => retro.antivirus.atualizar(senha));
    this.btMotor.disabled = false;
    if (r && r.ok && r.sozinho) info(tr('As definições já se atualizam sozinhas, pelo serviço do ClamAV.'), tr('Antivírus'));
    else if (r && !r.ok && !r.senhaErrada && !r.naoPode) erro(tr('Não foi possível atualizar as definições: {erro}', { erro: r.erro || '?' }), tr('Antivírus'));
    this.lerMotor();
  }

  andar({ n, total, arquivo }) {
    if (!this.rodando) return;
    const f = total ? Math.min(1, n / total) : 0;
    this.barra.firstChild.style.width = Math.round(f * 100) + '%';
    this.situacao.textContent = tr('Verificando: {arquivo}', { arquivo: String(arquivo || '').includes('/') && !String(arquivo).startsWith('/') ? caminhoTela(arquivo) : arquivo });
    this.j.definirStatus([tr('{n} de {total} arquivo(s) verificado(s)', { n, total: Math.max(n, total) })]);
  }

  achar(x) {
    if (!this.rodando) return;
    if (!this.achados.some((a) => a.arquivo === x.arquivo)) this.achados.push(x);
    this.desenharLista();
  }

  desenharLista() {
    this.lista.replaceChildren(...(this.achados.length ? this.achados.map((a, i) => {
      const linha = h('div.av-linha' + (a.sel ? '.sel' : ''), { title: a.arquivo },
        img(a.foi ? 'lixeira' : 'parar', 16),
        h('span.av-arquivo', a.rel ? caminhoTela(a.rel) : a.arquivo),
        h('span.av-ameaca', a.foi ? tr('Na Lixeira') : a.ameaca));
      linha.addEventListener('mousedown', () => { this.achados.forEach((b, k) => { b.sel = k === i; }); this.desenharLista(); });
      return linha;
    }) : [h('div.av-nada', this.rodando ? tr('Nenhuma até agora.') : tr('Nenhuma.'))]));
    this.btLixeira.disabled = this.rodando || !this.achados.some((a) => a.rel && !a.foi);
  }

  async verificar() {
    if (!this.disponivel) { this.esperando = true; return this.lerMotor(); }
    this.rodando = true;
    this.achados = [];
    this.desenharLista();
    this.btVerificar.textContent = tr('Parar');
    this.barra.firstChild.style.width = '0';
    this.situacao.textContent = tr('Contando os arquivos…');
    let r;
    try {
      r = await retro.antivirus.verificar(this.alvo);
    } catch (e) {
      r = { ok: false, erro: e.message, achados: [] };
    }
    this.rodando = false;
    this.btVerificar.textContent = tr('Verificar agora');
    for (const a of r.achados || []) if (!this.achados.some((b) => b.arquivo === a.arquivo)) this.achados.push(a);
    this.desenharLista();
    if (!r.ok) {
      this.situacao.textContent = tr('A verificação não terminou: {erro}', { erro: r.erro || '?' });
      return;
    }
    this.barra.firstChild.style.width = r.parado ? this.barra.firstChild.style.width : '100%';
    const n = this.achados.length;
    this.situacao.textContent = r.parado
      ? tr('Verificação interrompida: {n} arquivo(s) verificado(s).', { n: r.n || 0 })
      : n ? tr('Pronto: {n} ameaça(s) em {total} arquivo(s).', { n, total: r.n || 0 }) : tr('Pronto: nenhuma ameaça em {total} arquivo(s).', { total: r.n || 0 });
    if (!r.parado) tocar(n ? 'aviso' : 'info');
  }

  parar() { retro.antivirus.parar().catch(() => { }); }

  /** Os achados do disco C: (os escolhidos, ou todos) vão para a Lixeira, de onde ainda podem voltar. */
  async mandarParaLixeira() {
    const escolhidos = this.achados.filter((a) => a.sel && a.rel && !a.foi);
    const lista = escolhidos.length ? escolhidos : this.achados.filter((a) => a.rel && !a.foi);
    if (!lista.length) return;
    const ok = await excluir(lista.map((a) => a.rel));
    if (!ok) return;
    for (const a of lista) a.foi = true;
    this.desenharLista();
  }
}

function abrirAntivirus(args = {}) {
  if (aberta && !aberta.j.fechada) {
    aberta.j.focar();
    if (args.alvo) aberta.definirAlvo(args.alvo, true);
    return aberta;
  }
  aberta = new JanelaAntivirus(args.alvo);
  if (args.alvo) aberta.esperando = true;
  return aberta;
}

registrarApp('antivirus', { nome: 'Antivírus', icone: 'seguranca', abrir: abrirAntivirus });
