/*
 * Discos: os pendrives, os cartões de memória e os HDs ligados pela USB, inteiros, com as partições:
 * formatar, gravar uma imagem que liga outro computador (.iso ou .img, como a do Linux Mint, com a
 * cópia conferida no fim) e remover com segurança (src/principal/discos.js). Na outra aba, o espaço
 * do disco C: e a limpeza (a Lixeira, as versões anteriores antigas e os arquivos temporários). Nada
 * é apagado sem a confirmação, e nunca o disco que guarda o C: ou o próprio programa.
 */
import { h, img, tamanho, nomeDe, rotulo } from '../util.js';
import { Janela } from '../janelas.js';
import { registrarApp, abrir, estado, pastaDocs, avisar } from '../sistema.js';
import { tr, marcar, localidade } from '../idioma.js';
import { caixaArquivo, confirmar, erro, info } from '../dialogos.js';
import { formatarDoDisco, nomeDoDisco, nomeDoVolume, textoDoErro, textoDaConfirmacao, comPermissao } from '../formatar.js';
import { esvaziarLixeira } from '../mesa.js';
import { abrirMenu } from '../menus.js';

let aberta = null;

const FASES = {
  preparar: marcar('Preparando o pendrive…'),
  gravar: marcar('Gravando a imagem…'),
  conferir: marcar('Conferindo a cópia…'),
  inicio: marcar('Terminando…'),
};

const pct = (v) => `${Math.round(v * 100).toLocaleString(localidade())}%`;

/** "cerca de 3 min" (ou "menos de 1 min"). */
function falta(segundos) {
  if (!Number.isFinite(segundos) || segundos <= 0) return '';
  const m = Math.round(segundos / 60);
  return m < 1 ? tr('falta menos de 1 min') : tr('faltam cerca de {m} min', { m });
}

class JanelaDiscos {
  constructor({ aba = 0 } = {}) {
    this.discos = [];
    this.sel = null; // a chave da linha escolhida: "d:<id>" (o disco) ou "v:<id>:<n>" (um volume dele)
    this.gravacao = null;
    this.j = new Janela({
      id: 'discos',
      titulo: tr('Discos'),
      icone: 'discos',
      largura: 500,
      altura: 520,
      classe: 'discos',
      menus: this.menus(),
      status: [''],
      aoFechar: () => this.podeFechar(),
    });
    this.montarUnidades();
    this.montarEspaco();
    this.abasEl = h('div.abas');
    this.paineis = [this.pUnidades, this.pEspaco];
    this.j.corpo.append(this.abasEl, h('div.mon-paineis', ...this.paineis));
    this.paraDeOuvir = [
      retro.unidades.aoMudar(() => { if (!this.gravacao) this.carregar(); }),
      retro.discos.aoAndar((a) => this.andar(a)),
    ];
    this.j.ev.on('fechada', () => { for (const f of this.paraDeOuvir) f(); aberta = null; });
    this.j.el.addEventListener('keydown', (e) => { if (e.key === 'F5') { e.preventDefault(); this.atualizar(); } });
    this.mostrarAba(aba);
    this.carregar();
  }

  menus() {
    return [
      {
        rotulo: tr('&Arquivo'), itens: () => {
          const d = this.discoSel();
          const ocupado = !!this.gravacao;
          return [
            { rotulo: tr('&Formatar…'), desativado: !d || d.emUso || ocupado, acao: () => this.formatar() },
            { rotulo: tr('&Gravar imagem…'), desativado: !d || d.emUso || ocupado, acao: () => this.gravarImagem() },
            { rotulo: tr('Remover com &segurança'), desativado: !d || ocupado, acao: () => this.remover() },
            { separador: true },
            { rotulo: tr('Ferramenta de &discos do sistema'), acao: () => this.ferramentaDoSistema() },
            { separador: true },
            { rotulo: tr('Sai&r'), acao: () => this.j.fechar() },
          ];
        },
      },
      {
        rotulo: tr('E&xibir'), itens: () => [
          { rotulo: tr('&Pendrives e cartões'), marcado: this.aba === 0, acao: () => this.mostrarAba(0) },
          { rotulo: tr('&Espaço em disco'), marcado: this.aba === 1, acao: () => this.mostrarAba(1) },
          { separador: true },
          { rotulo: tr('&Atualizar'), atalho: 'F5', acao: () => this.atualizar() },
        ],
      },
      {
        rotulo: tr('Aj&uda'), itens: () => [
          { rotulo: tr('&Tópicos da Ajuda'), icone: 'ajuda', acao: () => abrir('ajuda', { topico: 'discos' }) },
        ],
      },
    ];
  }

  mostrarAba(i) {
    this.aba = i;
    const nomes = [tr('Pendrives e cartões'), tr('Espaço em disco')];
    this.abasEl.replaceChildren(...nomes.map((t, k) => {
      const el = h('div' + (k === i ? '.ativa' : ''), t);
      el.addEventListener('mousedown', () => this.mostrarAba(k));
      return el;
    }));
    this.paineis.forEach((p, k) => { p.hidden = k !== i; });
    if (i === 1 && !this.uso) this.carregarUso();
  }

  atualizar() {
    if (this.aba === 1) this.carregarUso();
    else this.carregar();
  }

  /* ---------- Os pendrives e cartões ---------- */

  montarUnidades() {
    this.corpoLista = h('div.mon-corpo', { tabIndex: 0 });
    this.corpoLista.addEventListener('keydown', (e) => this.teclas(e));
    const col = (t, largura, numero) => h('div', { class: numero ? 'numero' : '', style: { width: largura ? largura + 'px' : '', flex: largura ? 'none' : '1' } }, t);
    this.tabela = h('div.mon-tabela', h('div.mon-cab', col(tr('Nome')), col(tr('Sistema'), 80), col(tr('Capacidade'), 84, true)), this.corpoLista);
    this.vazio = h('div.dsc-vazio', { hidden: true });
    this.btFormatar = h('button', { on: { click: () => this.formatar() } }, tr('Formatar…'));
    this.btGravar = h('button', { on: { click: () => this.gravarImagem() } }, tr('Gravar imagem…'));
    this.btRemover = h('button', { on: { click: () => this.remover() } }, tr('Remover com segurança'));
    // O andamento da gravação (escondido fora dela).
    this.gFase = h('div');
    this.gBarra = h('div');
    this.gNumeros = h('div', { style: { color: '#404040', minHeight: '13px' } });
    this.btParar = h('button', { on: { click: () => this.parar() } }, tr('Parar'));
    this.gTitulo = h('legend');
    this.pGravacao = h('fieldset.dsc-gravacao', { hidden: true }, this.gTitulo,
      this.gFase, h('div.progresso', this.gBarra),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, h('div', { style: { flex: '1' } }, this.gNumeros), this.btParar));
    this.pUnidades = h('div.mon-painel',
      h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center' } }, img('removivel', 32),
        h('div', { style: { lineHeight: '13px' } }, tr('Os pendrives, os cartões de memória e os HDs ligados pela USB. Formatar e gravar uma imagem apagam tudo o que estiver no disco escolhido.'))),
      h('div.dsc-lista', this.tabela, this.vazio),
      this.pGravacao,
      h('div.acoes', this.btFormatar, this.btGravar, this.btRemover, h('div', { style: { flex: '1' } }),
        h('button', { on: { click: () => this.carregar() } }, rotulo(tr('&Atualizar')))));
  }

  async carregar() {
    this.j.definirStatus([tr('Procurando os discos…')]);
    const r = await retro.discos.listar().catch((e) => ({ discos: [], erro: e.message }));
    this.discos = r.discos || [];
    this.erroLista = r.erro || null;
    if (this.sel && !this.linhas().some((l) => l.chave === this.sel)) this.sel = null;
    if (!this.sel && this.discos.length) this.sel = 'd:' + this.discos[0].id;
    this.desenhar();
  }

  /** As linhas da lista: cada disco e, embaixo dele, as partições. */
  linhas() {
    const r = [];
    for (const d of this.discos) {
      r.push({ chave: 'd:' + d.id, d, v: null });
      d.volumes.forEach((v, n) => r.push({ chave: `v:${d.id}:${n}`, d, v }));
    }
    return r;
  }

  desenhar() {
    const linhas = this.linhas();
    this.vazio.hidden = !!linhas.length;
    this.tabela.hidden = !linhas.length;
    this.vazio.replaceChildren(img('removivel', 32), h('div', this.erroLista
      ? tr('Não foi possível ler os discos: {erro}', { erro: this.erroLista })
      : tr('Nenhum pendrive ou cartão de memória conectado. Conecte um e clique em Atualizar.')));
    this.corpoLista.replaceChildren(...linhas.map((l) => {
      const { d, v } = l;
      const cel = (t, largura, numero) => h('div', { class: numero ? 'numero' : '', style: { width: largura ? largura + 'px' : '', flex: largura ? 'none' : '1' } }, t);
      const nome = v
        ? h('span', { style: { paddingLeft: '20px' } }, nomeDoVolume(v))
        : h('span', { style: { fontWeight: 'bold' } }, d.nome || tr('Disco removível'));
      const el = h('div.mon-linha' + (l.chave === this.sel ? '.sel' : '') + (d.emUso ? '.apagada' : ''),
        cel([v ? null : img('removivel', 16), nome], 0),
        cel(v ? v.sistema || (v.id ? '' : tr('sem letra')) : d.emUso ? tr('em uso') : '', 80),
        cel(tamanho(v ? v.tamanho : d.tamanho), 84, true));
      el.title = d.emUso ? tr('Este disco guarda o disco C:, os dados ou o próprio Retro Computer e não pode ser apagado.') : '';
      el.addEventListener('mousedown', () => this.escolher(l.chave));
      el.addEventListener('dblclick', () => { if (v && v.id && v.raiz) abrir('explorador', { pasta: '::computador' }); });
      el.addEventListener('contextmenu', (e) => { e.preventDefault(); this.escolher(l.chave); this.menuDaLinha(e); });
      return el;
    }));
    this.atualizarBotoes();
    const n = this.discos.length;
    this.j.definirStatus([n ? tr('{n} disco(s) externo(s)', { n }) : '']);
  }

  escolher(chave) {
    this.sel = chave;
    const linhas = this.linhas();
    [...this.corpoLista.children].forEach((el, i) => el.classList.toggle('sel', linhas[i] && linhas[i].chave === chave));
    this.atualizarBotoes();
  }

  teclas(e) {
    const linhas = this.linhas();
    const i = linhas.findIndex((l) => l.chave === this.sel);
    let n = null;
    if (e.key === 'ArrowDown') n = Math.min(linhas.length - 1, i + 1);
    else if (e.key === 'ArrowUp') n = Math.max(0, i - 1);
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = linhas.length - 1;
    else return;
    e.preventDefault();
    if (linhas[n]) {
      this.escolher(linhas[n].chave);
      this.corpoLista.children[n].scrollIntoView({ block: 'nearest' });
    }
  }

  linhaSel() { return this.linhas().find((l) => l.chave === this.sel) || null; }
  discoSel() { const l = this.linhaSel(); return l ? l.d : null; }

  atualizarBotoes() {
    const d = this.discoSel();
    const ocupado = !!this.gravacao;
    this.btFormatar.disabled = !d || d.emUso || ocupado;
    this.btGravar.disabled = !d || d.emUso || ocupado;
    this.btRemover.disabled = !d || ocupado;
  }

  menuDaLinha(e) {
    abrirMenu(this.menus()[0].itens().slice(0, 3), { x: e.clientX, y: e.clientY });
  }

  formatar() {
    const l = this.linhaSel();
    if (!l || l.d.emUso || this.gravacao) return;
    formatarDoDisco(l.d, l.v, { aoTerminar: () => this.carregar() });
  }

  async gravarImagem() {
    const d = this.discoSel();
    if (!d || d.emUso || this.gravacao) return;
    const titulo = tr('Gravar imagem');
    const rel = await caixaArquivo({
      modo: 'abrir', titulo: tr('Escolha a imagem'), pasta: pastaDocs(),
      tipos: [{ rotulo: tr('Imagens de disco (*.iso, *.img)'), exts: ['iso', 'img', 'raw'] }],
    });
    if (!rel) return;
    if (!/\.(iso|img|raw)$/i.test(rel)) return erro(textoDoErro({ tipo: true }), titulo);
    const st = await retro.disco.info(rel).catch(() => null);
    if (st && d.tamanho && st.tamanho > d.tamanho) return erro(textoDoErro({ pequeno: true }), titulo);
    const ok = await confirmar(tr('AVISO: gravar {imagem} vai apagar TODOS os arquivos de {disco}.\n\nDepois de gravado, o pendrive liga outro computador com o que está na imagem.\n\nPara gravar, clique em Sim. Para sair, clique em Não.',
      { imagem: nomeDe(rel), disco: nomeDoDisco(d) }), { titulo, tipo: 'aviso' });
    if (!ok) return;
    this.comecarGravacao(d, rel, st ? st.tamanho : 0);
    const r = await comPermissao(tr('Para gravar a imagem no pendrive, digite a senha de administrador do Linux:'), (senha) => {
      this.gFase.textContent = textoDaConfirmacao() || tr(FASES.preparar);
      return retro.discos.gravar(d.id, rel, senha).catch((e) => ({ ok: false, erro: e.message }));
    });
    this.terminarGravacao();
    if (r && r.ok) {
      const win = estado.config.plataforma === 'win32';
      avisar(tr('Imagem gravada'), nomeDoDisco(d), { icone: 'removivel', som: null });
      await info(tr('A imagem foi gravada e conferida. O pendrive já pode ligar outro computador.')
        + (win ? '\n\n' + tr('Se o Windows perguntar se quer formatar o pendrive, clique em Cancelar: ele não lê o formato da imagem, e isso é normal.') : ''), titulo);
    } else {
      const t = textoDoErro(r, { gravar: true });
      if (t) erro(t, titulo);
    }
    this.carregar();
  }

  comecarGravacao(d, rel, total) {
    this.gravacao = { inicio: Date.now(), total, amostras: [], fase: '' };
    this.gTitulo.textContent = tr('{imagem} para {disco}', { imagem: nomeDe(rel), disco: nomeDoDisco(d) });
    this.gFase.textContent = tr(FASES.preparar);
    this.gBarra.style.width = '0%';
    this.gNumeros.textContent = '';
    this.btParar.disabled = false;
    this.pGravacao.hidden = false;
    this.atualizarBotoes();
  }

  terminarGravacao() {
    this.gravacao = null;
    this.pGravacao.hidden = true;
    this.atualizarBotoes();
  }

  /** O andamento: a fase, a barra (de cada fase), o que já foi e o tempo que falta. */
  andar(a) {
    const g = this.gravacao;
    if (!g || !a) return;
    const total = a.total || g.total || 0;
    if (a.fase !== g.fase) { g.fase = a.fase; g.amostras = []; }
    const agora = Date.now();
    g.amostras.push([agora, a.feito]);
    while (g.amostras.length > 2 && agora - g.amostras[0][0] > 8000) g.amostras.shift();
    this.gFase.textContent = tr(FASES[a.fase] || FASES.preparar);
    const parte = total ? Math.min(1, a.feito / total) : 0;
    this.gBarra.style.width = (a.fase === 'inicio' ? 100 : parte * 100) + '%';
    if (a.fase === 'gravar' || a.fase === 'conferir') {
      const [t0, f0] = g.amostras[0];
      const ritmo = agora > t0 ? ((a.feito - f0) / (agora - t0)) * 1000 : 0;
      const partes = [tr('{feito} de {total} ({pct})', { feito: tamanho(a.feito), total: tamanho(total), pct: pct(parte) })];
      if (ritmo > 0) partes.push(tr('{v}/s', { v: tamanho(ritmo) }), falta((total - a.feito) / ritmo));
      this.gNumeros.textContent = partes.filter(Boolean).join(' · ');
    } else this.gNumeros.textContent = '';
  }

  async parar() {
    if (!this.gravacao) return;
    const ok = await confirmar(tr('Parar a gravação? O pendrive fica sem nada legível até ser gravado de novo ou formatado.'), { titulo: tr('Gravar imagem'), tipo: 'aviso' });
    if (!ok || !this.gravacao) return;
    this.btParar.disabled = true;
    this.gFase.textContent = tr('Parando…');
    retro.discos.parar().catch(() => { });
  }

  async podeFechar() {
    if (!this.gravacao) return true;
    const ok = await confirmar(tr('A gravação da imagem ainda não terminou. Parar a gravação e fechar?'), { titulo: tr('Discos'), tipo: 'aviso' });
    if (ok) await retro.discos.parar().catch(() => { });
    return ok;
  }

  /** Remove com segurança todas as partições à vista do disco (o pendrive pode sair depois). */
  async remover() {
    const d = this.discoSel();
    if (!d || this.gravacao) return;
    const montados = d.volumes.filter((v) => v.id && v.raiz);
    // No Linux, cada partição montada sai (e o pendrive é desligado); nos outros, uma basta (o disco sai todo).
    const comId = d.volumes.filter((v) => v.id);
    const lista = estado.config.plataforma === 'linux' ? (montados.length ? montados : comId.slice(0, 1)) : (montados.length ? montados : comId).slice(0, 1);
    for (const v of lista) {
      const r = await retro.unidades.ejetar(v.id).catch((e) => ({ ok: false, erro: e.message }));
      // "unidade": a partição já saiu da lista (o disco saiu todo com a de antes).
      if (r.ok || /unidade/.test(r.erro || '')) continue;
      return erro(r.ocupado
        ? tr('{unidade} ainda está em uso. Feche os arquivos e as janelas dele e tente de novo.', { unidade: nomeDoVolume(v) })
        : tr('Não foi possível remover {unidade}: {erro}', { unidade: nomeDoVolume(v), erro: r.erro || '?' }), tr('Discos'));
    }
    avisar(tr('Pode tirar {unidade}', { unidade: nomeDoDisco(d) }), tr('O disco removível pode ser retirado com segurança.'), { icone: 'removivel' });
    this.carregar();
  }

  async ferramentaDoSistema() {
    const ok = await retro.unidades.formatarNoSistema().catch(() => false);
    if (!ok) erro(tr('A ferramenta de discos do sistema não foi encontrada. No Linux, ela é o programa "Discos" do GNOME (gnome-disk-utility), que a Loja de programas instala.'), tr('Discos'));
  }

  /* ---------- O espaço do disco C: ---------- */

  montarEspaco() {
    this.ePizza = h('div.dsc-pizza');
    this.eLegenda = h('div.dsc-legenda');
    this.eOcupa = h('div.dsc-ocupa.campo');
    this.eLimpeza = h('div.dsc-limpeza');
    this.eTotal = h('div', { style: { flex: '1' } });
    this.btLimpar = h('button', { disabled: true, on: { click: () => this.limpar() } }, tr('Limpar…'));
    this.pEspaco = h('div.mon-painel', { style: { overflowY: 'auto' } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } }, img('disco', 32), h('b', tr('Disco local (C:)'))),
      h('div', { style: { display: 'flex', gap: '14px', alignItems: 'center' } }, this.ePizza, this.eLegenda),
      h('div', tr('O que ocupa o disco C:')), this.eOcupa,
      h('fieldset', { style: { margin: '2px 0 0' } }, h('legend', tr('Limpeza de disco')),
        h('div', { style: { lineHeight: '13px', marginBottom: '6px' } }, tr('Apaga de vez o que não faz falta. Os seus arquivos não são tocados.')),
        this.eLimpeza,
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' } }, this.eTotal, this.btLimpar)));
  }

  async carregarUso() {
    this.eOcupa.replaceChildren(h('div', { style: { padding: '4px' } }, tr('Calculando…')));
    this.uso = await retro.discos.uso().catch(() => null);
    this.desenharUso();
  }

  desenharUso() {
    const u = this.uso;
    if (!u) {
      this.eOcupa.replaceChildren(h('div', { style: { padding: '4px' } }, tr('Não foi possível medir o disco.')));
      return;
    }
    const esp = u.espaco || { total: 0, livre: 0 };
    const outros = Math.max(0, esp.total - esp.livre - u.total);
    const fatia = (v) => (esp.total ? (v / esp.total) * 360 : 0);
    const a = fatia(u.total);
    const b = a + fatia(outros);
    this.ePizza.style.background = `conic-gradient(#0000ff 0 ${a}deg, #808080 ${a}deg ${b}deg, #ff00ff ${b}deg 360deg)`;
    const quadro = (cor) => h('div', { style: { width: '12px', height: '12px', background: cor, boxShadow: 'inset 0 0 0 1px #000' } });
    // Cada texto num elemento próprio: soltos, os textos vizinhos se juntariam numa casa só da grade.
    const linha = (cor, rot, t) => [cor ? quadro(cor) : h('div'), h('span', rot), h('span', tamanho(t))];
    this.eLegenda.replaceChildren(
      ...linha('#0000ff', tr('Disco C:'), u.total),
      ...linha('#808080', tr('Outros arquivos do computador'), outros),
      ...linha('#ff00ff', tr('Espaço livre'), esp.livre),
      ...linha(null, tr('Capacidade'), esp.total));
    // O que ocupa: as pastas de cima, os arquivos soltos, a Lixeira e as versões anteriores.
    const itens = u.pastas.filter((p) => !p.oculta).map((p) => [p.nome, p.tamanho, 'pasta']);
    const ocultas = u.pastas.filter((p) => p.oculta).reduce((s, p) => s + p.tamanho, 0);
    if (u.soltos + ocultas) itens.push([tr('Outros arquivos'), u.soltos + ocultas, 'documento']);
    itens.push([tr('Lixeira'), u.lixeira, u.lixeira ? 'lixeira-cheia' : 'lixeira'], [tr('Versões anteriores'), u.versoes, 'copia']);
    const maior = Math.max(1, ...itens.map((x) => x[1]));
    this.eOcupa.replaceChildren(...itens.map(([nome, t, icone]) => h('div.dsc-ocupa-linha', img(icone, 16), h('span.dsc-ocupa-nome', nome),
      h('div.dsc-ocupa-barra', h('div', { style: { width: Math.max(t ? 1 : 0, (t / maior) * 100) + '%' } })), h('span.dsc-ocupa-tam', tamanho(t)))));
    if (u.incompleto) this.eOcupa.append(h('div', { style: { padding: '2px 4px', color: '#404040' } }, tr('(muitos arquivos: a conta parou no meio)')));
    // A limpeza: cada item com o tamanho; o que tem zero fica desmarcado.
    const opcoes = [
      ['lixeira', tr('Lixeira'), u.lixeira],
      ['versoes', tr('Versões anteriores com mais de 30 dias'), u.antigas],
      ['cache', tr('Arquivos temporários da Internet'), u.cache],
      ['miniaturas', tr('Miniaturas do Explorador'), u.miniaturas],
    ];
    this.marcas = new Map();
    this.eLimpeza.replaceChildren(...opcoes.map(([id, rot, t]) => {
      const chk = h('input', { type: 'checkbox', checked: t > 0 && id !== 'miniaturas', disabled: !t });
      chk.addEventListener('change', () => this.somarLimpeza());
      this.marcas.set(id, { chk, t, rot });
      return h('label.dsc-limpeza-linha', chk, h('span', { style: { flex: '1' } }, rot), h('span', tamanho(t)));
    }));
    this.somarLimpeza();
  }

  somarLimpeza() {
    let soma = 0;
    for (const m of this.marcas.values()) if (m.chk.checked) soma += m.t;
    this.eTotal.textContent = tr('Espaço a liberar: {t}', { t: tamanho(soma) });
    this.btLimpar.disabled = !soma;
  }

  async limpar() {
    const marcados = [...this.marcas.entries()].filter(([, m]) => m.chk.checked);
    if (!marcados.length) return;
    // A Lixeira tem a caixa própria (a mesma do Explorador).
    const outros = marcados.filter(([id]) => id !== 'lixeira');
    const comLixeira = marcados.some(([id]) => id === 'lixeira');
    if (outros.length) {
      const ok = await confirmar(tr('Estes itens serão apagados de vez:\n\n{lista}\n\nDeseja continuar?', { lista: outros.map(([, m]) => '• ' + m.rot).join('\n') }), { titulo: tr('Limpeza de disco'), tipo: 'aviso' });
      if (!ok) return;
    }
    this.btLimpar.disabled = true;
    const antes = this.uso;
    if (comLixeira) await esvaziarLixeira();
    const r = outros.length ? await retro.discos.limpar(outros.map(([id]) => id)).catch((e) => ({ erro: e.message })) : null;
    if (r && r.erro) erro(tr('Não foi possível limpar: {erro}', { erro: r.erro }), tr('Limpeza de disco'));
    await this.carregarUso();
    const soma = (u) => (u ? u.lixeira + u.antigas + u.cache + u.miniaturas : 0);
    const liberado = Math.max(0, soma(antes) - soma(this.uso));
    if (liberado) info(tr('Foram liberados {t}.', { t: tamanho(liberado) }), tr('Limpeza de disco'));
  }
}

registrarApp('discos', {
  nome: marcar('Discos'),
  icone: 'discos',
  abrir: (args = {}) => {
    if (aberta) {
      aberta.j.focar();
      if (args.aba != null) aberta.mostrarAba(args.aba);
      return aberta.j;
    }
    aberta = new JanelaDiscos(args);
    return aberta.j;
  },
});
