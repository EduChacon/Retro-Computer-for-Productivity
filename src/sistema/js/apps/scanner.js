/*
 * Digitalizar (Iniciar › Programas › Acessórios): o scanner escolhido digitaliza uma página por vez
 * (src/principal/scanner.js); as páginas se juntam na lista e vão para o disco C: num PDF só ou como
 * imagens, e o PDF pode seguir direto para o Copiar o texto (OCR). No Mac, que não deixa outro
 * programa usar o scanner, o botão abre a Captura de Imagem do sistema.
 */
import { h, img, rotulo } from '../util.js';
import { Janela } from '../janelas.js';
import { registrarApp, abrir, abrirArquivo, avisar, pastaDocs } from '../sistema.js';
import { tr, marcar } from '../idioma.js';
import { caixaArquivo, erro, confirmar } from '../dialogos.js';
import { tocar } from '../sons.js';
import { limparNome } from '../pdf.js';

let aberta = null;

const CORES = [
  { id: 'cor', rotulo: marcar('Colorido') },
  { id: 'cinza', rotulo: marcar('Tons de cinza') },
  { id: 'pb', rotulo: marcar('Preto e branco') },
];
const FORMATOS = [
  { id: 'pdf', rotulo: marcar('PDF (todas as páginas num arquivo)') },
  { id: 'jpg', rotulo: marcar('Imagens JPG (uma por página)') },
  { id: 'png', rotulo: marcar('Imagens PNG (uma por página)') },
];

/** Os bytes de uma página em outro formato (o JPG deixa a foto colorida bem menor que o PNG). */
async function converter(png, tipo) {
  if (tipo === 'png') return png;
  const bmp = await createImageBitmap(new Blob([png], { type: 'image/png' }));
  const c = document.createElement('canvas');
  c.width = bmp.width;
  c.height = bmp.height;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, c.width, c.height);
  g.drawImage(bmp, 0, 0);
  bmp.close();
  const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.88));
  c.width = c.height = 0;
  return new Uint8Array(await blob.arrayBuffer());
}

class Digitalizar {
  constructor() {
    this.paginas = []; // { png, url, cor }
    this.sel = -1;
    this.rodando = false;
    this.j = new Janela({ id: 'scanner', titulo: tr('Digitalizar'), icone: 'scanner', largura: 600, altura: 460, status: [''], aoFechar: () => this.podeFechar() });
    this.scanner = h('select', { on: { change: () => this.lerOpcoes() } });
    this.cor = h('select', CORES.map((c) => h('option', { value: c.id }, tr(c.rotulo))));
    this.dpi = h('select');
    this.origem = h('select');
    this.linhaOrigem = h('div.scn-linha', h('label', tr('Origem:')), h('div.select-caixa', this.origem));
    this.formato = h('select', FORMATOS.map((f) => h('option', { value: f.id }, tr(f.rotulo))));
    this.ocr = h('input', { type: 'checkbox', id: 'scn-ocr' });
    this.btDigitalizar = h('button.padrao', { on: { click: () => (this.rodando ? this.parar() : this.digitalizar()) } }, tr('Digitalizar'));
    this.btAtualizar = h('button', { on: { click: () => this.listar() } }, rotulo(tr('&Atualizar')));
    this.btRemover = h('button', { on: { click: () => this.remover() } }, tr('Remover a página'));
    this.btSalvar = h('button', { on: { click: () => this.salvar() } }, tr('Salvar…'));
    this.aviso = h('div.scn-aviso');
    this.lista = h('div.scn-paginas.campo', { tabIndex: 0, on: { keydown: (e) => { if (e.key === 'Delete') this.remover(); } } });
    this.opcoesEl = h('div.scn-opcoes',
      h('div.scn-linha', h('label', tr('Scanner:')), h('div.select-caixa', this.scanner)),
      h('div.scn-linha', h('label', tr('Cor:')), h('div.select-caixa', this.cor)),
      h('div.scn-linha', h('label', tr('Resolução:')), h('div.select-caixa', this.dpi)),
      this.linhaOrigem,
      h('div.acoes', this.btDigitalizar, this.btAtualizar),
    );
    this.j.corpo.classList.add('scn-corpo');
    this.j.corpo.append(
      h('div.scn-topo', img('scanner', 32), h('div', tr('Digitalize uma página de cada vez; elas se juntam na lista. Depois, salve tudo num PDF ou como imagens no disco C:.'))),
      h('div.scn-meio', h('div.scn-esq', this.opcoesEl, this.aviso), h('div.scn-dir', this.lista, h('div.acoes', this.btRemover))),
      h('hr.sulco'),
      h('div.scn-linha', h('label', tr('Salvar como:')), h('div.select-caixa', { style: { flex: '1' } }, this.formato)),
      h('div.scn-fim', h('label.scn-check', { htmlFor: 'scn-ocr' }, this.ocr, tr('Depois, copiar o texto (OCR)')), this.btSalvar, h('button', { on: { click: () => this.j.fechar() } }, tr('Fechar'))),
    );
    this.j.ev.on('fechada', () => {
      if (this.rodando) retro.scanner.parar().catch(() => { });
      for (const p of this.paginas) URL.revokeObjectURL(p.url);
      aberta = null;
    });
    this.desenhar();
    this.listar();
  }

  situacao(t) { this.j.definirStatus(t); }

  async podeFechar() {
    if (!this.paginas.length) return true;
    return confirmar(tr('As páginas digitalizadas ainda não foram salvas. Fechar mesmo assim?'), { titulo: tr('Digitalizar') });
  }

  async listar() {
    this.btAtualizar.disabled = true;
    this.situacao(tr('Procurando os scanners…'));
    let r;
    try { r = await retro.scanner.listar(); } catch (e) { r = { disponivel: false, motivo: e.message, scanners: [] }; }
    this.btAtualizar.disabled = false;
    this.scanners = r.scanners || [];
    this.scanner.replaceChildren(...this.scanners.map((s) => h('option', { value: s.id }, s.nome)));
    this.aviso.replaceChildren();
    if (!r.disponivel && r.motivo === 'mac') {
      this.aviso.append(h('div', tr('No Mac, a digitalização é feita pela Captura de Imagem do sistema. Salve a imagem em Downloads e traga-a pelo Meu computador › Computador principal.')),
        h('button', { on: { click: () => retro.scanner.doSistema().catch((e) => erro(e.message)) } }, tr('Abrir a Captura de Imagem')));
    } else if (!r.disponivel && r.motivo === 'sem-sane') {
      this.aviso.append(h('div', tr('O programa de digitalização do Linux (o SANE) não está instalado. No Linux Mint e no Ubuntu, ele vem com os pacotes "sane-utils" e "sane-airscan".')));
    } else if (!this.scanners.length) {
      this.aviso.append(h('div', tr('Nenhum scanner encontrado. Ligue o scanner (ou conecte-o à mesma rede Wi-Fi) e clique em Atualizar.')),
        h('button', { on: { click: () => retro.scanner.doSistema().catch(() => erro(tr('Nenhum programa de digitalização do sistema foi encontrado.'))) } }, tr('Programa de digitalização do sistema')));
    }
    this.situacao(this.scanners.length ? tr('{n} scanner(s) encontrado(s).', { n: this.scanners.length }) : '');
    await this.lerOpcoes();
  }

  async lerOpcoes() {
    const id = this.scanner.value;
    let o = { modos: ['cor', 'cinza', 'pb'], resolucoes: [150, 200, 300], origens: [] };
    if (id) o = await retro.scanner.opcoes(id).catch(() => o);
    for (const op of this.cor.options) op.disabled = !o.modos.includes(op.value);
    if (this.cor.selectedOptions[0] && this.cor.selectedOptions[0].disabled) this.cor.value = o.modos[0] || 'cor';
    const atual = Number(this.dpi.value) || 200;
    this.dpi.replaceChildren(...o.resolucoes.map((r) => h('option', { value: String(r) }, tr('{n} dpi', { n: r }))));
    this.dpi.value = String(o.resolucoes.includes(atual) ? atual : o.resolucoes.reduce((a, b) => (Math.abs(b - 200) < Math.abs(a - 200) ? b : a), o.resolucoes[0] || 200));
    this.origem.replaceChildren(...o.origens.map((s) => h('option', { value: s }, s)));
    this.linhaOrigem.hidden = !o.origens.length;
    this.desenhar();
  }

  async digitalizar() {
    const id = this.scanner.value;
    if (!id) return;
    this.rodando = true;
    this.desenhar();
    this.situacao(tr('Digitalizando a página {n}… (pode levar um minuto)', { n: this.paginas.length + 1 }));
    try {
      const { png } = await retro.scanner.digitalizar(id, { cor: this.cor.value, dpi: Number(this.dpi.value), origem: this.origem.value });
      const bytes = new Uint8Array(png);
      this.paginas.push({ png: bytes, url: URL.createObjectURL(new Blob([bytes], { type: 'image/png' })), cor: this.cor.value });
      this.sel = this.paginas.length - 1;
      tocar('info');
      this.situacao(tr('{n} página(s) digitalizada(s).', { n: this.paginas.length }));
    } catch (e) {
      this.situacao('');
      if (e.codigo !== 'parado') erro(tr('Não foi possível digitalizar: {erro}', { erro: e.codigo === 'ocupado' ? tr('o scanner ainda está trabalhando.') : e.message }), tr('Digitalizar'));
    } finally {
      this.rodando = false;
      this.desenhar();
    }
  }

  parar() {
    retro.scanner.parar().catch(() => { });
  }

  remover() {
    if (this.sel < 0 || this.rodando) return;
    const [p] = this.paginas.splice(this.sel, 1);
    URL.revokeObjectURL(p.url);
    this.sel = Math.min(this.sel, this.paginas.length - 1);
    this.desenhar();
  }

  desenhar() {
    this.lista.replaceChildren(...this.paginas.map((p, i) => h('div.scn-pagina' + (i === this.sel ? '.sel' : ''), {
      on: { mousedown: () => { this.sel = i; this.desenhar(); this.lista.focus(); } },
    }, h('img', { src: p.url, alt: '', draggable: false }), h('div', tr('Página {n}', { n: i + 1 })))));
    if (!this.paginas.length) this.lista.append(h('div.scn-vazio', tr('As páginas digitalizadas aparecem aqui.')));
    const tem = !!this.scanner.value;
    this.btDigitalizar.textContent = this.rodando ? tr('Parar') : tr('Digitalizar');
    this.btDigitalizar.disabled = !tem;
    for (const el of [this.scanner, this.cor, this.dpi, this.origem, this.btAtualizar]) el.disabled = this.rodando;
    this.btRemover.disabled = this.rodando || this.sel < 0;
    this.btSalvar.disabled = this.rodando || !this.paginas.length;
  }

  async salvar() {
    const formato = this.formato.value;
    const rel = await caixaArquivo({
      modo: 'salvar', titulo: tr('Salvar a digitalização'), pasta: pastaDocs(),
      nome: limparNome(tr('Digitalização')) + '.' + formato,
      tipos: [formato === 'pdf' ? { rotulo: tr('Documento PDF (*.pdf)'), exts: ['pdf'] } : { rotulo: formato === 'jpg' ? 'JPEG (*.jpg)' : 'PNG (*.png)', exts: [formato] }],
    });
    if (!rel) return;
    const destino = new RegExp(`\\.${formato}$`, 'i').test(rel) ? rel : `${rel}.${formato}`;
    this.btSalvar.disabled = true;
    this.situacao(tr('Salvando…'));
    try {
      const salvos = [];
      if (formato === 'pdf') {
        // O preto e branco vai em PNG (fica nítido e pequeno); a cor e o cinza, em JPG.
        const itens = [];
        for (const p of this.paginas) itens.push(p.cor === 'pb' ? { png: p.png } : { jpg: await converter(p.png, 'jpg') });
        await retro.pdf.combinar(itens, destino);
        salvos.push(destino);
      } else {
        const base = destino.replace(/\.[^./]+$/, '');
        for (const [i, p] of this.paginas.entries()) {
          const nome = this.paginas.length > 1 ? `${base} (${i + 1}).${formato}` : destino;
          await retro.disco.gravar(nome, await converter(p.png, formato));
          salvos.push(nome);
        }
      }
      for (const p of this.paginas) URL.revokeObjectURL(p.url);
      this.paginas = [];
      this.sel = -1;
      this.desenhar();
      this.situacao(tr('Salvo.'));
      avisar(tr('Digitalização salva'), salvos.length > 1 ? tr('{n} imagens', { n: salvos.length }) : salvos[0].split('/').pop(), { icone: 'scanner', som: null, aoClicar: () => abrirArquivo(salvos[0]) });
      if (this.ocr.checked) abrir('ocr', { arquivo: salvos[0] });
    } catch (e) {
      this.situacao('');
      erro(tr('Não foi possível salvar: {erro}', { erro: e.message }), tr('Digitalizar'));
    } finally {
      this.desenhar();
    }
  }
}

function abrirDigitalizar() {
  if (aberta) { aberta.j.focar(); return aberta.j; }
  aberta = new Digitalizar();
  return aberta.j;
}

registrarApp('scanner', { nome: marcar('Digitalizar'), icone: 'scanner', abrir: abrirDigitalizar });
