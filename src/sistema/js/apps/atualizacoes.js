/*
 * As atualizações do Linux (no Retro Computer como sistema): o que há para atualizar (com as
 * de segurança marcadas), procurar de novo, instalar tudo (o Linux e os programas do Flathub),
 * as atualizações de segurança automáticas e o aviso de reiniciar. Uma vez por dia, um balão
 * avisa quando há atualizações.
 */
import { h, img } from '../util.js';
import { Janela } from '../janelas.js';
import { registrarApp, estado, avisar, abrir } from '../sistema.js';
import { erro } from '../dialogos.js';
import { comSenhaAdmin } from '../admin.js';
import { tr, marcar } from '../idioma.js';

let aberta = null;

function textoResumo(r) {
  const seg = r.apt.filter((p) => p.seguranca).length;
  if (!r.apt.length && !r.flatpak.length) return tr('O Linux e os programas estão em dia.');
  return tr('{n} atualizações do Linux ({s} de segurança) e {f} dos programas.', { n: r.apt.length, s: seg, f: r.flatpak.length });
}

class Atualizacoes {
  constructor() {
    this.j = new Janela({ titulo: tr('Atualizações do Linux'), icone: 'atualizacoes', largura: 460, altura: 440, classe: 'atualizacoes', minimizavel: true, maximizavel: false });
    this.resumo = h('div.atl-resumo');
    this.lista = h('div.atl-lista');
    this.registro = h('pre.atl-registro', { hidden: true });
    this.reinicio = h('div.atl-reinicio', { hidden: true },
      img('msg-aviso', 32), h('div', tr('Algumas atualizações só valem depois de reiniciar o computador.')),
      h('button', { type: 'button', on: { click: () => abrir('desligar') } }, tr('Reiniciar…')));
    this.chkAuto = h('input', { type: 'checkbox', on: { change: () => this.mudarAutomaticas() } });
    this.btProcurar = h('button', { type: 'button', on: { click: () => this.procurar() } }, tr('Procurar agora'));
    this.btInstalar = h('button.padrao', { type: 'button', on: { click: () => this.instalar() } }, tr('Instalar as atualizações'));
    this.j.corpo.style.padding = '8px';
    this.j.corpo.append(
      h('div.atl-cabeca', img('atualizacoes', 32), h('div', tr('As atualizações corrigem falhas de segurança e problemas do Linux e dos programas instalados pela Loja. Instalar pede a senha de administrador.'))),
      this.resumo, this.lista, this.registro, this.reinicio,
      h('label.atl-auto', this.chkAuto, h('span', tr('Instalar sozinho as atualizações de segurança, todo dia'))),
      h('div.acoes.direita', this.btProcurar, this.btInstalar, h('button', { type: 'button', on: { click: () => this.j.fechar() } }, tr('Fechar'))));
    this.largar = retro.atualizacoesLinux.aoAndamento((s) => this.andamento(s));
    this.j.ev.on('fechada', () => { this.largar(); aberta = null; });
    this.carregar();
  }

  async carregar(r) {
    this.resumo.textContent = tr('Lendo…');
    r = r || await retro.atualizacoesLinux.listar().catch(() => ({ disponivel: false }));
    this.dados = r;
    if (!r.disponivel) {
      this.resumo.textContent = tr('As atualizações deste sistema são feitas pelo próprio sistema.');
      this.lista.replaceChildren();
      for (const b of [this.btProcurar, this.btInstalar, this.chkAuto]) b.disabled = true;
      return;
    }
    this.resumo.textContent = textoResumo(r);
    const linhas = [
      ...r.apt.sort((a, b) => (b.seguranca - a.seguranca) || a.nome.localeCompare(b.nome)).map((p) => h('div.atl-item',
        img(p.seguranca ? 'cadeado' : 'programa', 16), h('span.atl-nome', p.nome), h('span.atl-versao', `${p.de} → ${p.versao}`),
        p.seguranca ? h('span.atl-seg', tr('Segurança')) : null)),
      ...r.flatpak.map((p) => h('div.atl-item', img('programas-caixa', 16), h('span.atl-nome', p.nome), h('span.atl-versao', p.versao))),
    ];
    this.lista.replaceChildren(...(linhas.length ? linhas : [h('div.atl-vazia', tr('Nada para atualizar.'))]));
    this.btInstalar.disabled = !linhas.length;
    this.btProcurar.disabled = false;
    this.chkAuto.disabled = false;
    this.chkAuto.checked = !!r.automaticas;
    this.reinicio.hidden = !r.reiniciar;
  }

  andamento(s) {
    this.registro.hidden = false;
    this.registro.textContent = (this.registro.textContent + s).slice(-20000);
    this.registro.scrollTop = this.registro.scrollHeight;
  }

  ocupar(v) {
    for (const b of [this.btProcurar, this.btInstalar, this.chkAuto]) b.disabled = v;
    this.j.el.classList.toggle('ocupada', v);
  }

  explicar(r) {
    if (!r || r.ok || r.senhaErrada || r.naoPode) return;
    erro(r.ocupado ? tr('O Linux já está fazendo outra atualização. Tente de novo em alguns minutos.') : tr('A atualização não terminou: {erro}', { erro: r.erro || '?' }), tr('Atualizações do Linux'));
  }

  async procurar() {
    this.ocupar(true);
    this.resumo.textContent = tr('Procurando atualizações…');
    const r = await comSenhaAdmin(tr('Para procurar atualizações, digite a senha de administrador do Linux:'), (s) => retro.atualizacoesLinux.procurar(s));
    this.ocupar(false);
    this.explicar(r);
    this.carregar(r && r.ok ? r : undefined);
  }

  async instalar() {
    this.ocupar(true);
    this.registro.textContent = '';
    this.resumo.textContent = tr('Instalando… Não desligue o computador.');
    const r = await comSenhaAdmin(tr('Para instalar as atualizações, digite a senha de administrador do Linux:'), (s) => retro.atualizacoesLinux.instalar(s));
    this.ocupar(false);
    this.explicar(r);
    if (r && r.ok) avisar(tr('Atualizações do Linux'), r.reiniciar ? tr('Atualizações instaladas. Reinicie o computador para terminar.') : tr('Atualizações instaladas.'), { icone: 'atualizacoes', som: null });
    this.carregar();
  }

  async mudarAutomaticas() {
    const ligar = this.chkAuto.checked;
    this.ocupar(true);
    const texto = ligar ? tr('Para ligar as atualizações de segurança automáticas, digite a senha de administrador do Linux:') : tr('Para desligar as atualizações de segurança automáticas, digite a senha de administrador do Linux:');
    const r = await comSenhaAdmin(texto, (s) => retro.atualizacoesLinux.automaticas(ligar, s));
    this.ocupar(false);
    this.explicar(r);
    this.carregar();
  }
}

function abrirAtualizacoes() {
  if (aberta && !aberta.j.fechada) { aberta.j.focar(); return aberta; }
  aberta = new Atualizacoes();
  return aberta;
}

registrarApp('atualizacoes', { nome: marcar('Atualizações do Linux'), icone: 'atualizacoes', abrir: abrirAtualizacoes });

/* O aviso uma vez por dia (só no Retro Computer como sistema do Linux). */
const AVISO_MS = 24 * 3600 * 1000;
let ultimoAviso = 0;
async function olharAtualizacoes() {
  if (!(estado.config && estado.config.modoSistema) || Date.now() - ultimoAviso < AVISO_MS) return;
  const r = await retro.atualizacoesLinux.listar().catch(() => null);
  if (!r || !r.disponivel || (!r.apt.length && !r.flatpak.length)) return;
  ultimoAviso = Date.now();
  const seg = r.apt.filter((p) => p.seguranca).length;
  avisar(tr('Atualizações do Linux'), seg ? tr('{n} atualizações de segurança esperando. Clique para instalar.', { n: seg }) : tr('Há atualizações do Linux e dos programas. Clique para ver.'), {
    icone: 'atualizacoes', ms: 12000, aoClicar: () => abrirAtualizacoes(),
  });
}
setTimeout(olharAtualizacoes, 2 * 60 * 1000);
setInterval(olharAtualizacoes, 60 * 60 * 1000);

export { olharAtualizacoes };
