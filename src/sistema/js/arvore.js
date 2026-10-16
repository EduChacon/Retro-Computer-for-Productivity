/*
 * A árvore de pastas do Explorador (Exibir › Barra de pastas): o Acesso rápido (as pastas
 * fixadas), Meu computador, o disco C: com as pastas, Meus documentos, a Lixeira e os pendrives. As pastas abrem quando são
 * expandidas (nada é lido antes); a pasta da janela fica marcada e com o caminho aberto.
 */
import { h, img, paiDe } from './util.js';
import { pastaDocs, pastaMesa, iconeDaPasta } from './sistema.js';
import { listarUnidades, nomeUnidade, pastaDaUnidade, lerPastaUnidade } from './unidades.js';
import { lerPastaZip } from './compactados.js';
import { tr } from './idioma.js';
import { fixadas } from './acesso.js';

const ordenar = (a, b) => a.localeCompare(b, 'pt-BR', { numeric: true, sensitivity: 'base' });

/** O caminho de nós até uma pasta: ['::computador', '', 'Meus documentos', 'Meus documentos/Projeto']. */
export function caminhoNaArvore(pasta) {
  if (pasta === '::acesso') return ['::acesso'];
  if (pasta === '::computador') return ['::computador'];
  if (pasta === '::lixeira') return ['::computador', '::lixeira'];
  const zip = lerPastaZip(pasta);
  if (zip) return caminhoNaArvore(paiDe(zip.rel));
  const un = lerPastaUnidade(pasta);
  if (un) {
    const partes = un.rel ? un.rel.split('/') : [];
    return ['::computador', pastaDaUnidade(un.id), ...partes.map((_, i) => pastaDaUnidade(un.id, partes.slice(0, i + 1).join('/')))];
  }
  const partes = String(pasta || '').split('/').filter(Boolean);
  return ['::computador', '', ...partes.map((_, i) => partes.slice(0, i + 1).join('/'))];
}

export class Arvore {
  /** aoEscolher(pasta): abrir a pasta na janela. */
  constructor({ aoEscolher }) {
    this.aoEscolher = aoEscolher;
    this.nos = new Map(); // pasta → { el, filhosEl, aberto, carregado, botao }
    this.atual = null;
    this.el = h('div.arvore', { tabIndex: 0, role: 'tree' });
    this.el.addEventListener('keydown', (e) => this.teclas(e));
    const acesso = this.criarNo({ pasta: '::acesso', rotulo: tr('Acesso rápido'), icone: 'favoritos', temFilhos: true }, 0);
    this.raiz = this.criarNo({ pasta: '::computador', rotulo: tr('Meu computador'), icone: 'computador', temFilhos: true }, 0);
    this.el.append(acesso.linha, acesso.filhosEl, this.raiz.linha, this.raiz.filhosEl);
    this.abrirNo('::acesso');
    this.abrirNo('::computador');
  }

  criarNo({ pasta, rotulo, icone, temFilhos }, nivel) {
    const botao = h('span.arv-botao' + (temFilhos ? '' : '.vazio'), temFilhos ? '+' : '');
    const linha = h('div.arv-linha', { style: { paddingLeft: 2 + nivel * 16 + 'px' }, role: 'treeitem' }, botao, img(icone, 16), h('span.arv-rotulo', rotulo));
    const filhosEl = h('div.arv-filhos', { hidden: true });
    const no = { pasta, linha, filhosEl, botao, nivel, aberto: false, carregado: false, temFilhos };
    this.nos.set(pasta, no);
    botao.addEventListener('mousedown', (e) => { e.stopPropagation(); e.preventDefault(); this.alternar(pasta); });
    linha.addEventListener('mousedown', (e) => { if (e.button === 0) this.escolher(pasta); });
    linha.addEventListener('dblclick', () => this.alternar(pasta));
    return no;
  }

  /** Os filhos de uma pasta da árvore. */
  async filhosDe(pasta) {
    // As pastas fixadas que ainda existem, como atalhos (a árvore de verdade é a do C:).
    if (pasta === '::acesso') {
      const infos = await Promise.all(fixadas().map((rel) => retro.disco.info(rel).catch(() => null)));
      return infos.filter((f) => f && f.pasta).map((f) => ({
        pasta: f.rel, rotulo: f.nome || 'C:', icone: f.rel ? iconeDaPasta(f.rel) : 'disco', temFilhos: true, atalho: true, prefixo: '★',
      }));
    }
    if (pasta === '::computador') {
      const unidades = await listarUnidades();
      return [
        { pasta: '', rotulo: tr('Disco local (C:)'), icone: 'disco', temFilhos: true },
        { pasta: pastaDocs(), rotulo: tr('Meus documentos'), icone: 'documentos', temFilhos: true, atalho: true },
        { pasta: pastaMesa(), rotulo: pastaMesa(), icone: 'pasta-mesa', temFilhos: true, atalho: true },
        ...unidades.filter((u) => u.montada).map((u) => ({ pasta: pastaDaUnidade(u.id), rotulo: nomeUnidade(u), icone: 'removivel', temFilhos: true })),
        { pasta: '::lixeira', rotulo: tr('Lixeira'), icone: 'lixeira', temFilhos: false },
      ];
    }
    const un = lerPastaUnidade(pasta);
    const lista = un
      ? (await retro.unidades.pasta(un.id, un.rel).catch(() => [])).filter((f) => f.pasta).map((f) => ({ pasta: pastaDaUnidade(un.id, f.rel), nome: f.nome }))
      : (await retro.disco.listar(pasta).catch(() => [])).filter((f) => f.pasta).map((f) => ({ pasta: f.rel, nome: f.nome }));
    return lista.sort((a, b) => ordenar(a.nome, b.nome)).map((f) => ({ pasta: f.pasta, rotulo: f.nome, icone: un ? 'pasta' : iconeDaPasta(f.pasta), temFilhos: true }));
  }

  async abrirNo(pasta) {
    const no = this.nos.get(pasta);
    if (!no || !no.temFilhos) return;
    // Dois pedidos ao mesmo tempo (o clique e o revelar): uma leitura só.
    if (!no.carregado && !no.lendo) no.lendo = this.carregarNo(no).finally(() => { no.lendo = null; });
    if (no.lendo) await no.lendo;
    if (!no.temFilhos) return;
    no.aberto = true;
    no.filhosEl.hidden = false;
    no.botao.textContent = '−';
  }

  async carregarNo(no) {
    const pasta = no.pasta;
    {
      const filhos = await this.filhosDe(pasta);
      no.carregado = true;
      no.filhosEl.replaceChildren();
      for (const f of filhos) {
        // Os atalhos (Meus documentos, Área de trabalho) são pastas do C:; a árvore de verdade é a do C:.
        const chave = f.atalho ? (f.prefixo || '@') + f.pasta : f.pasta;
        if (this.nos.has(chave) && !f.atalho) continue;
        const filho = this.criarNo({ ...f, pasta: chave }, no.nivel + 1);
        if (f.atalho) {
          filho.atalhoDe = f.pasta;
          filho.botao.className = 'arv-botao vazio';
          filho.botao.textContent = '';
          filho.temFilhos = false;
        }
        no.filhosEl.append(filho.linha, filho.filhosEl);
      }
      if (!filhos.length) {
        no.temFilhos = false;
        no.botao.className = 'arv-botao vazio';
        no.botao.textContent = '';
      }
    }
  }

  fecharNo(pasta) {
    const no = this.nos.get(pasta);
    if (!no) return;
    no.aberto = false;
    no.filhosEl.hidden = true;
    if (no.temFilhos) no.botao.textContent = '+';
  }

  alternar(pasta) {
    const no = this.nos.get(pasta);
    if (!no) return;
    if (no.aberto) this.fecharNo(pasta);
    else this.abrirNo(pasta);
  }

  escolher(pasta) {
    const no = this.nos.get(pasta);
    this.aoEscolher(no && no.atalhoDe != null ? no.atalhoDe : pasta);
  }

  /** Marca a pasta da janela e abre o caminho até ela. */
  async revelar(pasta) {
    const caminho = caminhoNaArvore(pasta);
    for (const p of caminho.slice(0, -1)) await this.abrirNo(p);
    const alvo = this.nos.get(caminho[caminho.length - 1]) || this.nos.get('@' + pasta);
    if (this.atual) this.atual.linha.classList.remove('sel');
    this.atual = alvo || null;
    if (alvo) {
      alvo.linha.classList.add('sel');
      alvo.linha.scrollIntoView({ block: 'nearest' });
    }
  }

  /** Uma pasta mudou no disco: os filhos dela são lidos de novo (se já foram). */
  async recarregar(pasta) {
    const no = this.nos.get(pasta);
    if (!no || !no.carregado) return;
    for (const k of [...this.nos.keys()]) {
      // Os atalhos (os de Meu computador, com "@", e os do Acesso rápido, com "★") são de outro nó.
      const deOutro = k.startsWith('::') || k.startsWith('@') || k.startsWith('★');
      if (k !== pasta && (pasta === '' ? !deOutro : pasta === '::acesso' ? k.startsWith('★') : k.startsWith(pasta + '/'))) this.nos.delete(k);
    }
    const aberto = no.aberto;
    no.carregado = false;
    no.temFilhos = true;
    await this.abrirNo(pasta);
    if (!aberto) this.fecharNo(pasta);
    if (this.atual && !this.el.contains(this.atual.linha)) this.atual = null;
  }

  teclas(e) {
    const linhas = [...this.el.querySelectorAll('.arv-linha')].filter((l) => l.offsetParent);
    const i = this.atual ? linhas.indexOf(this.atual.linha) : -1;
    const noDe = (linha) => [...this.nos.values()].find((n) => n.linha === linha);
    let alvo = null;
    if (e.key === 'ArrowDown') alvo = linhas[Math.min(linhas.length - 1, i + 1)];
    else if (e.key === 'ArrowUp') alvo = linhas[Math.max(0, i - 1)];
    else if (e.key === 'ArrowRight' && this.atual) { this.abrirNo(this.atual.pasta); e.preventDefault(); return; }
    else if (e.key === 'ArrowLeft' && this.atual) { this.fecharNo(this.atual.pasta); e.preventDefault(); return; }
    else return;
    e.preventDefault();
    const no = alvo && noDe(alvo);
    if (no) this.escolher(no.pasta);
  }
}

