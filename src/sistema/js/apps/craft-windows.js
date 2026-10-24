/*
 * A aba "Craft do Windows" de Adicionar ou remover programas (só no Windows): os Craft instalados no
 * próprio Windows pelos instaladores oficiais, fora do Retro Computer. Ela mostra a versão de cada um,
 * procura as novas e atualiza pelo instalador oficial (src/principal/craft-windows.js), com a
 * confirmação do Windows. Na abertura, um aviso quando houver versão nova.
 */
import { h, img, tamanho } from '../util.js';
import { abrir, avisar, estado } from '../sistema.js';
import { erro, info } from '../dialogos.js';
import { tr } from '../idioma.js';

export class AbaCraftWindows {
  constructor() {
    this.lista = [];
    this.sel = null;
    this.ocupado = false;
    this.carregado = false;
    this.listaEl = h('div.lista-arquivos', { style: { padding: '2px', flex: '1' } });
    this.estadoEl = h('div', { style: { minHeight: '13px' } }, '');
    this.barra = h('div.progresso', { hidden: true }, h('div'));
    this.btAtualizar = h('button', { disabled: true, on: { click: () => this.atualizar() } }, tr('Atualizar'));
    this.btProcurar = h('button', { on: { click: () => this.procurar(true) } }, tr('Procurar atualizações'));
    this.el = h('div.aba-programas',
      h('div', { style: { display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '8px' } },
        img('programas-caixa', 32),
        h('div', { style: { lineHeight: '14px' } },
          tr('Os Craft instalados no Windows pelos instaladores oficiais. A atualização baixa o instalador da versão nova do lançamento oficial, confere o resumo publicado e a assinatura digital, e o Windows pede a confirmação de administrador. Feche o programa antes de atualizar.'))),
      this.listaEl,
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' } },
        h('div', { style: { flex: '1' } }), this.btProcurar, this.btAtualizar),
      h('div', { style: { marginTop: '8px' } }, this.estadoEl, this.barra));
    this.paraDeOuvir = retro.craftWindows.aoProgresso((id, p) => this.progresso(id, p));
  }

  /** Ao mostrar a aba pela primeira vez: a lista (com a busca guardada de algumas horas). */
  mostrar() {
    if (!this.carregado) { this.carregado = true; this.procurar(false); }
  }

  fechar() {
    if (this.paraDeOuvir) this.paraDeOuvir();
  }

  async procurar(forcar) {
    this.btProcurar.disabled = true;
    this.estadoEl.textContent = tr('Procurando os Craft instalados no Windows…');
    try {
      this.lista = await retro.craftWindows.verificar({ forcar });
      const novas = this.lista.filter((x) => x.temAtualizacao).length;
      this.estadoEl.textContent = !this.lista.length ? ''
        : novas ? tr('{n} atualização(ões) disponível(is).', { n: novas })
          : tr('Todos os programas estão na versão mais recente.');
    } catch {
      this.lista = [];
      this.estadoEl.textContent = tr('Não foi possível procurar atualizações (sem internet?).');
    } finally {
      this.btProcurar.disabled = false;
    }
    this.desenhar();
  }

  desenhar() {
    if (!this.lista.length) {
      this.listaEl.replaceChildren(h('div', { style: { padding: '8px', lineHeight: '14px', color: 'var(--texto-meio)' } },
        tr('Nenhum Craft instalado no Windows. Os instaladores oficiais (.msi) ficam na página de lançamentos de cada Craft no GitHub; os Craft do Retro Computer ficam na aba Programas recomendados.')));
      this.selecionar(null);
      return;
    }
    this.linhas = new Map();
    this.listaEl.replaceChildren(...this.lista.map((x) => {
      let det = x.temAtualizacao
        ? tr('Instalado: versão {versao} · atualização disponível: {nova}', { versao: x.versao, nova: x.nova })
        : tr('Instalado: versão {versao}', { versao: x.versao });
      if (x.erro) det += ' · ' + tr('não foi possível procurar a versão nova');
      else if (x.semInstalador) det += ' · ' + tr('o lançamento não tem o instalador do Windows');
      const detEl = h('div.det', det);
      if (x.temAtualizacao) detEl.style.color = 'var(--sucesso)';
      const el = h('div.linha-programa', img(x.icone || 'programa', 32), h('div.info', h('div.nome', x.nome), h('div.desc', tr('No Windows ({arq})', { arq: x.arq })), detEl));
      el.addEventListener('mousedown', () => this.selecionar(x.id));
      el.addEventListener('dblclick', () => { if (x.temAtualizacao) this.atualizar(); });
      this.linhas.set(x.id, el);
      return el;
    }));
    const primeiro = this.lista.find((x) => x.temAtualizacao) || this.lista[0];
    this.selecionar(this.lista.some((x) => x.id === this.sel) ? this.sel : primeiro.id);
  }

  selecionar(id) {
    this.sel = id;
    for (const [k, el] of this.linhas || []) el.classList.toggle('sel', k === id);
    const x = this.lista.find((y) => y.id === id);
    this.btAtualizar.disabled = this.ocupado || !x || !x.temAtualizacao;
  }

  progresso(id, p) {
    if (id !== this.atualizando) return;
    const nome = (this.lista.find((x) => x.id === id) || {}).nome || id;
    const barra = this.barra.firstChild;
    this.barra.hidden = false;
    if (p.etapa === 'versao') { this.estadoEl.textContent = tr('Procurando a versão mais recente do {programa}…', { programa: nome }); barra.style.width = '2%'; }
    if (p.etapa === 'baixando') {
      const pct = p.total ? Math.round((p.recebido / p.total) * 100) : 0;
      this.estadoEl.textContent = p.total
        ? tr('Baixando o {programa} {versao}… {recebido} de {total}', { programa: nome, versao: p.versao, recebido: tamanho(p.recebido), total: tamanho(p.total) })
        : tr('Baixando o {programa} {versao}… {recebido}', { programa: nome, versao: p.versao, recebido: tamanho(p.recebido) });
      barra.style.width = Math.max(3, Math.min(90, pct * 0.9)) + '%';
    }
    if (p.etapa === 'instalando') { this.estadoEl.textContent = tr('Confirme no Windows para instalar o {programa} {versao}…', { programa: nome, versao: p.versao }); barra.style.width = '93%'; }
    if (p.etapa === 'pronto') barra.style.width = '100%';
  }

  async atualizar() {
    const x = this.lista.find((y) => y.id === this.sel);
    if (!x || !x.temAtualizacao || this.ocupado) return;
    this.ocupado = true;
    this.atualizando = x.id;
    this.selecionar(x.id);
    this.btProcurar.disabled = true;
    try {
      const r = await retro.craftWindows.atualizar(x.id);
      if (r && r.ok) {
        this.estadoEl.textContent = tr('{programa} {versao} instalado.', { programa: x.nome, versao: r.versao });
        avisar(tr('Programa atualizado'), tr('{programa} {versao} está instalado no Windows.', { programa: x.nome, versao: r.versao }), { icone: x.icone });
        if (r.reiniciar) info(tr('O {programa} {versao} foi instalado. O Windows termina a atualização na próxima vez que o computador reiniciar.', { programa: x.nome, versao: r.versao }), tr('Craft do Windows'));
      } else if (r && r.cancelado) {
        this.estadoEl.textContent = tr('A atualização foi cancelada. Nada foi mudado.');
      } else {
        this.estadoEl.textContent = tr('A atualização não foi concluída.');
        erro(tr('Não foi possível atualizar o {programa}:\n{erro}', { programa: x.nome, erro: (r && r.erro) || '?' }), tr('Craft do Windows'));
      }
    } finally {
      this.ocupado = false;
      this.atualizando = null;
      this.btProcurar.disabled = false;
      setTimeout(() => { this.barra.hidden = true; }, 1200);
      // A lista de novo, pelo que o Windows diz agora (a versão instalada sai do registro).
      const estadoAntes = this.estadoEl.textContent;
      await this.procurar(false);
      this.estadoEl.textContent = estadoAntes;
    }
  }
}

/**
 * Na abertura (só no Windows): procura as versões novas dos Craft instalados no Windows (a busca fica
 * guardada por algumas horas) e avisa. Com "não procurar atualizações" em Adicionar ou remover
 * programas, não procura.
 */
export async function avisarCraftWindows() {
  const modo = (estado.config && estado.config.atualizacoes) || 'automatico';
  if (modo === 'nunca' || !(await retro.craftWindows.disponivel().catch(() => false))) return;
  let lista = [];
  try { lista = (await retro.craftWindows.verificar({})).filter((x) => x.temAtualizacao); } catch { return; }
  if (!lista.length) return;
  avisar(tr('Craft do Windows'), lista.length === 1
    ? tr('Há uma versão nova do {programa} para o Windows ({versao}). Clique para atualizar.', { programa: lista[0].nome, versao: lista[0].nova })
    : tr('{n} Craft do Windows com versão nova. Clique para atualizar.', { n: lista.length }),
  { icone: lista[0].icone, aoClicar: () => abrir('programas', { aba: 'craft' }), ms: 12000 });
}
