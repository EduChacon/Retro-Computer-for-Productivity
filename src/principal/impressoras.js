'use strict';
/*
 * As impressoras: a lista vem do próprio Chromium (as do sistema, em qualquer sistema); a
 * padrão muda pelo "lpoptions" (Linux e macOS, sem senha: vale para o usuário) ou pelo
 * PowerShell (Windows); a fila de impressão, pelo "lpstat" e pelo "cancel" do CUPS.
 * Adicionar uma impressora abre o configurador do sistema (no Linux, o do CUPS ou a página
 * dele em http://localhost:631).
 *
 * Imprimir (o Bloco de notas, o Visualizador de imagens, a página de teste): o HTML vai para
 * uma janela escondida e o Chromium mostra a caixa de impressão do sistema.
 */
const fs = require('node:fs');
const { execFile, spawn } = require('node:child_process');

function rodar(cmd, args, { timeout = 10000, env = {} } = {}) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout, windowsHide: true, env: { ...process.env, LC_ALL: 'C', ...env } }, (erro, saida, serr) => {
      if (erro) { erro.saida = String(serr || saida || '').trim(); return reject(erro); }
      resolve(String(saida));
    });
  });
}

/** O estado da impressora (o número do CUPS/IPP: 3 pronta, 4 imprimindo, 5 parada). */
function situacao(p) {
  const s = Number((p.options && p.options['printer-state']) || p.status || 3);
  return s === 4 ? 'imprimindo' : s === 5 ? 'parada' : 'pronta';
}

/** O que a área de trabalho mostra de cada impressora. */
function resumo(p) {
  const o = p.options || {};
  return {
    nome: p.name,
    rotulo: p.displayName || o['printer-info'] || p.name,
    descricao: p.description || o['printer-make-and-model'] || '',
    local: o['printer-location'] || '',
    padrao: !!p.isDefault,
    situacao: situacao(p),
  };
}

/** "lpstat -o" → [{ id, impressora, usuario, tamanho, quando }] */
function lerFila(texto) {
  const r = [];
  for (const linha of String(texto).split('\n')) {
    const m = /^(\S+)-(\d+)\s+(\S+)\s+(\d+)\s+(.+?)\s*$/.exec(linha);
    if (m) r.push({ id: `${m[1]}-${m[2]}`, impressora: m[1], usuario: m[3], tamanho: Number(m[4]), quando: m[5] });
  }
  return r;
}

// Sem espaços, barras, aspas (também as curvas, que o PowerShell lê como aspas) e cifrão.
const nomeValido = (n) => typeof n === 'string' && /^[^\s/'"`$\\\u2018-\u201F]{1,127}$/.test(n);

class Impressoras {
  constructor({ plataforma = process.platform, webContents = () => null, BrowserWindow, shell } = {}) {
    this.plataforma = plataforma;
    this.wc = webContents;
    this.BrowserWindow = BrowserWindow;
    this.shell = shell;
  }

  async listar() {
    const wc = this.wc();
    if (!wc) return [];
    const lista = await wc.getPrintersAsync().catch(() => []);
    return lista.map(resumo);
  }

  async definirPadrao(nome) {
    if (!nomeValido(nome)) return { ok: false, erro: 'nome' };
    try {
      if (this.plataforma === 'win32') {
        await rodar('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', '(New-Object -ComObject WScript.Network).SetDefaultPrinter($env:RETRO_IMPRESSORA)'], { env: { RETRO_IMPRESSORA: nome } });
      } else {
        await rodar('lpoptions', ['-d', nome]);
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, erro: String(e.saida || e.message).split('\n')[0] };
    }
  }

  async fila(nome) {
    if (this.plataforma === 'win32') return { disponivel: false, trabalhos: [] };
    try {
      const args = nomeValido(nome) ? ['-o', nome] : ['-o'];
      return { disponivel: true, trabalhos: lerFila(await rodar('lpstat', args)) };
    } catch (e) {
      // Sem trabalhos, o lpstat às vezes sai com erro; sem o CUPS, não há fila.
      return { disponivel: fs.existsSync('/usr/bin/lpstat') || fs.existsSync('/usr/sbin/lpstat'), trabalhos: [] };
    }
  }

  async cancelar(id) {
    if (!/^[^\s/'"`$\\]+-\d+$/.test(String(id || ''))) return { ok: false, erro: 'id' };
    try {
      await rodar('cancel', [id]);
      return { ok: true };
    } catch (e) {
      return { ok: false, erro: String(e.saida || e.message).split('\n')[0] };
    }
  }

  /** O jeito do sistema de adicionar uma impressora. Devolve { como: 'programa'|'pagina'|'sistema' }. */
  async adicionar() {
    if (this.plataforma === 'win32') {
      await this.shell.openExternal('ms-settings:printers');
      return { como: 'sistema' };
    }
    if (this.plataforma === 'darwin') {
      await this.shell.openExternal('x-apple.systempreferences:com.apple.Print-Scanner-Settings.extension');
      return { como: 'sistema' };
    }
    for (const prog of ['/usr/bin/system-config-printer', '/usr/bin/gnome-control-center']) {
      if (fs.existsSync(prog)) {
        const args = prog.endsWith('gnome-control-center') ? ['printers'] : [];
        spawn(prog, args, { detached: true, stdio: 'ignore' }).unref();
        return { como: 'programa' };
      }
    }
    // Sem um configurador instalado: a página do CUPS (aberta no Navegador).
    return { como: 'pagina', url: 'http://localhost:631/admin' };
  }

  /**
   * Imprime um HTML (já pronto para o papel). Com "dispositivo", vai direto para ela (a página
   * de teste); sem, o sistema mostra a caixa de impressão para escolher.
   */
  imprimirHtml(html, { dispositivo = null, titulo = 'Retro Computer' } = {}) {
    return new Promise((resolve) => {
      const w = new this.BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, javascript: false } });
      const fim = (r) => { if (!w.isDestroyed()) w.destroy(); resolve(r); };
      w.webContents.once('did-finish-load', () => {
        w.setTitle(titulo);
        const o = dispositivo ? { silent: true, deviceName: dispositivo, printBackground: true } : { silent: false, printBackground: true };
        w.webContents.print(o, (ok, motivo) => fim({ ok, motivo: ok ? null : motivo }));
      });
      w.webContents.once('did-fail-load', () => fim({ ok: false, motivo: 'carregar' }));
      w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    });
  }

  /**
   * O PDF de um HTML pronto para o papel (o mesmo da impressão), sem impressora nenhuma: o
   * "Salvar como PDF" dos programas. As margens são as do @page da página.
   */
  pdfDeHtml(html, { pagina = 'A4' } = {}) {
    return new Promise((resolve, reject) => {
      const w = new this.BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, javascript: false } });
      const fim = () => { if (!w.isDestroyed()) w.destroy(); };
      // A página fica onde está: nada de navegar nem de abrir janelas (um "meta refresh", por exemplo).
      w.webContents.on('will-navigate', (e) => e.preventDefault());
      w.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      w.webContents.once('did-finish-load', () => {
        w.webContents.printToPDF({ printBackground: true, pageSize: pagina, margins: { top: 0, bottom: 0, left: 0, right: 0 } })
          .then((dados) => { fim(); resolve(dados); }, (e) => { fim(); reject(e); });
      });
      w.webContents.once('did-fail-load', () => { fim(); reject(new Error('carregar')); });
      w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    });
  }
}

/** O tamanho do papel do país (o Carta nos Estados Unidos, no Canadá e no México; o A4 nos outros). */
const papelDoPais = (pais) => (['US', 'CA', 'MX'].includes(String(pais || '').toUpperCase()) ? 'Letter' : 'A4');

/** Para os testes e as capturas (RETRO_IMPRESSORAS_FALSAS=1): duas impressoras e uma fila. */
class ImpressorasFalsas extends Impressoras {
  constructor(o) {
    super(o);
    this.padrao = 'Escritorio';
    this.trabalhos = [{ id: 'Escritorio-12', impressora: 'Escritorio', usuario: 'eu', tamanho: 20480, quando: 'Thu 15 Oct 2026 10:12:00' }];
    this.impressos = [];
  }

  async listar() {
    return [
      { nome: 'Escritorio', rotulo: 'Escritório (Laser)', descricao: 'HP LaserJet (IPP Everywhere)', local: 'Sala', padrao: this.padrao === 'Escritorio', situacao: 'pronta' },
      { nome: 'Casa', rotulo: 'Casa (Jato de tinta)', descricao: 'Epson (driverless)', local: '', padrao: this.padrao === 'Casa', situacao: 'parada' },
    ];
  }

  async definirPadrao(nome) { this.padrao = nome; return { ok: true }; }

  async fila(nome) { return { disponivel: true, trabalhos: this.trabalhos.filter((j) => !nome || j.impressora === nome) }; }

  async cancelar(id) { this.trabalhos = this.trabalhos.filter((j) => j.id !== id); return { ok: true }; }

  async adicionar() { return { como: 'pagina', url: 'http://localhost:631/admin' }; }

  async imprimirHtml(html, o = {}) { this.impressos.push({ html, ...o }); return { ok: true, falso: true }; }
}

module.exports = { Impressoras, ImpressorasFalsas, lerFila, resumo, situacao, nomeValido, papelDoPais };
