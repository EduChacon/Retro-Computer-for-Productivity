'use strict';
/*
 * Receber do celular: um servidor HTTP pequeno, só na rede local e só enquanto a janela do Receber
 * está aberta. O celular abre o endereço (pelo código QR), o computador pergunta se aceita aquele
 * aparelho e, aceito, ele manda arquivos, que entram numa pasta do disco C: (Meus documentos ›
 * Recebidos › Do celular), sem gravar por cima de nada.
 *
 * A segurança:
 *  - o endereço tem um código de uso único (8 letras, 40 bits); 20 pedidos errados encerram;
 *  - só aceita os endereços da rede local (10/8, 172.16/12, 192.168/16) e escuta só no da rede;
 *  - cada aparelho novo precisa ser aceito no computador;
 *  - o servidor não lê nada do disco: só a página de envio (feita aqui, com a CSP fechada) e o envio;
 *  - limites de tamanho por arquivo, por sessão e do espaço livre; termina depois de 15 minutos parado.
 */
const http = require('node:http');
const os = require('node:os');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const LETRAS = 'abcdefghjkmnpqrstuvwxyz23456789'; // sem as que se confundem (i, l, o, 0, 1)
const MAX_ARQUIVO = 4 * 1024 * 1024 * 1024;
const MAX_SESSAO = 20 * 1024 * 1024 * 1024;
const FOLGA = 512 * 1024 * 1024; // o disco nunca fica com menos que isso livre
const MAX_ERROS = 20;
const PARADO = 15 * 60 * 1000;
const MAX_APARELHOS = 8;

/** O IPv4 é de uma rede local? */
function ehLocal(ip) {
  const m = /^(?:::ffff:)?(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(String(ip || ''));
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

/** Os endereços desta máquina nas redes locais (o Wi-Fi e o cabo), o primeiro é o sugerido. */
function enderecosLocais(interfaces = os.networkInterfaces()) {
  const r = [];
  for (const [nome, lista] of Object.entries(interfaces || {})) {
    for (const i of lista || []) {
      if ((i.family === 'IPv4' || i.family === 4) && !i.internal && ehLocal(i.address)) r.push({ nome, ip: i.address });
    }
  }
  // As interfaces de máquinas virtuais e contêineres vão para o fim.
  const virtual = (n) => /^(docker|br-|veth|virbr|vmnet|vboxnet|tun|tap|utun|zt|tailscale)/i.test(n);
  return r.sort((x, y) => virtual(x.nome) - virtual(y.nome));
}

/** O código do endereço: 8 letras sem as que se confundem. */
function novoCodigo() {
  const b = crypto.randomBytes(8);
  let s = '';
  for (let i = 0; i < 8; i++) s += LETRAS[b[i] % LETRAS.length];
  return s;
}

/** O nome de um arquivo que chega: só o nome (sem pastas), sem os caracteres proibidos, até 120. */
function nomeSeguro(nome) {
  let n = String(nome || '').split(/[\\/]/).pop();
  n = n.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '').replace(/^[.\s]+/, '').replace(/[.\s]+$/, '').trim();
  if (/^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i.test(n)) n = '_' + n;
  if (n.length > 120) {
    const ext = path.extname(n).slice(0, 12);
    n = n.slice(0, 120 - ext.length) + ext;
  }
  return n || 'arquivo';
}

const escapar = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** A página de envio, para o celular: sem nada de fora, com o roteiro só pelo nonce. */
function pagina({ textos, nonce, codigo }) {
  const t = (k) => escapar(textos[k] || k);
  return `<!doctype html><html lang="${escapar(textos.lang || 'pt-BR')}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${t('titulo')}</title>
<style nonce="${nonce}">
body{margin:0;font:16px/1.4 system-ui,sans-serif;background:#008080;color:#000}
main{max-width:520px;margin:16px auto;padding:0 12px}
.caixa{background:#c0c0c0;border:2px solid;border-color:#fff #404040 #404040 #fff;padding:12px}
h1{font-size:18px;margin:0 0 8px;background:#000080;color:#fff;padding:4px 8px}
label.botao,button{display:block;width:100%;box-sizing:border-box;margin:10px 0;padding:14px;font-size:17px;text-align:center;
background:#c0c0c0;border:2px solid;border-color:#fff #404040 #404040 #fff;color:#000}
input{display:none}#estado{margin:8px 0;font-weight:bold}ul{padding-left:18px;margin:6px 0}li{word-break:break-all}
.ok{color:#006000}.erro{color:#a00000}progress{width:100%;height:18px}
</style></head><body><main><div class="caixa"><h1>${t('titulo')}</h1>
<p id="estado">${t('aguardando')}</p>
<div id="envio" hidden><label class="botao" for="arquivos">${t('escolher')}</label><input id="arquivos" type="file" multiple>
<progress id="barra" max="1" value="0" hidden></progress><ul id="lista"></ul></div>
<p>${t('rodape')}</p></div></main>
<script nonce="${nonce}">
(function(){
var base='/${codigo}/';var T=${JSON.stringify({ aprovado: textos.aprovado, recusado: textos.recusado, enviando: textos.enviando, enviado: textos.enviado, falhou: textos.falhou, encerrado: textos.encerrado })};
var estado=document.getElementById('estado'),envio=document.getElementById('envio'),lista=document.getElementById('lista'),barra=document.getElementById('barra');
var fim=false;
function ver(){if(fim)return;fetch(base+'estado',{cache:'no-store'}).then(function(r){return r.json()}).then(function(j){
if(j.estado==='aprovado'){estado.textContent=T.aprovado;envio.hidden=false;}
else if(j.estado==='recusado'){estado.textContent=T.recusado;fim=true;return;}
setTimeout(ver,j.estado==='aprovado'?5000:1500);}).catch(function(){estado.textContent=T.encerrado;fim=true;});}
ver();
function um(f){return new Promise(function(ok){var li=document.createElement('li');li.textContent=f.name+' — '+T.enviando;lista.appendChild(li);
var x=new XMLHttpRequest();x.open('PUT',base+'arquivo?nome='+encodeURIComponent(f.name));
x.upload.onprogress=function(e){if(e.lengthComputable){barra.hidden=false;barra.value=e.loaded/e.total;}};
x.onload=function(){var r={};try{r=JSON.parse(x.responseText)}catch(e){}
if(x.status===200){li.textContent=f.name+' — '+T.enviado;li.className='ok';}else{li.textContent=f.name+' — '+(r.erro||T.falhou);li.className='erro';}barra.hidden=true;ok();};
x.onerror=function(){li.textContent=f.name+' — '+T.falhou;li.className='erro';barra.hidden=true;ok();};x.send(f);});}
document.getElementById('arquivos').addEventListener('change',function(e){var fs=[].slice.call(e.target.files);e.target.value='';
fs.reduce(function(p,f){return p.then(function(){return um(f)})},Promise.resolve());});
})();
</script></body></html>`;
}

class Receber {
  /**
   * @param {object} o
   * @param {() => import('./disco').Disco} o.disco
   * @param {() => string} o.pasta  a pasta do disco C: onde os arquivos entram (caminho interno)
   * @param {(evento: string, dados: object) => void} o.avisar  manda para a área de trabalho
   * @param {() => object} o.textos  os textos da página do celular, no idioma
   * @param {(ip: string) => boolean} [o.local]  quem pode chegar (os testes aceitam também o 127.0.0.1)
   * @param {() => Array<{nome: string, ip: string}>} [o.enderecos]  onde escutar
   */
  constructor({ disco, pasta, avisar, textos, local = ehLocal, enderecos = enderecosLocais }) {
    Object.assign(this, { disco, pasta, avisar, textos, local, enderecos });
    this.servidor = null;
  }

  ligado() { return !!this.servidor; }

  /** Liga o servidor no endereço escolhido (ou no primeiro da rede local). Devolve o endereço para o QR. */
  async iniciar({ ip } = {}) {
    if (this.servidor) return this.info();
    const locais = this.enderecos();
    const escolhido = (ip && locais.find((x) => x.ip === ip)) || locais[0];
    if (!escolhido) { const e = new Error('sem-rede'); e.codigo = 'semRede'; throw e; }
    this.ip = escolhido.ip;
    this.codigo = novoCodigo();
    this.erros = 0;
    this.recebidos = 0;
    this.bytes = 0;
    this.aparelhos = new Map(); // ip → 'aguardando' | 'aprovado' | 'recusado'
    this.enviando = 0;
    const s = http.createServer((req, res) => this.atender(req, res).catch(() => { try { this.responder(res, 500, { erro: 'erro' }); } catch { } }));
    s.headersTimeout = 20000;
    s.requestTimeout = 0; // um vídeo grande demora; o tempo parado é o do socket
    s.timeout = 120000;
    s.maxHeadersCount = 40;
    await new Promise((ok, falha) => { s.once('error', falha); s.listen(0, this.ip, ok); });
    this.servidor = s;
    this.porta = s.address().port;
    this.mexer();
    return this.info();
  }

  info() {
    return { ligado: !!this.servidor, url: this.servidor ? `http://${this.ip}:${this.porta}/${this.codigo}/` : null, ip: this.ip, porta: this.porta, pasta: this.pasta(), recebidos: this.recebidos, enderecos: this.enderecos().map((x) => x.ip) };
  }

  parar(motivo = 'parado') {
    if (!this.servidor) return;
    const s = this.servidor;
    this.servidor = null;
    clearTimeout(this.relogio);
    s.close();
    if (s.closeAllConnections) s.closeAllConnections();
    this.avisar('fim', { motivo });
  }

  /** Mais 15 minutos a partir de agora (cada pedido certo conta). */
  mexer() {
    clearTimeout(this.relogio);
    this.relogio = setTimeout(() => this.parar('parado'), PARADO);
    if (this.relogio.unref) this.relogio.unref();
  }

  /** A resposta do computador para um aparelho que pediu para enviar. */
  aprovar(ip, sim) {
    if (!this.servidor || this.aparelhos.get(ip) !== 'aguardando') return false;
    this.aparelhos.set(ip, sim ? 'aprovado' : 'recusado');
    return true;
  }

  responder(res, status, corpo, tipo = 'application/json; charset=utf-8') {
    res.writeHead(status, {
      'Content-Type': tipo,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'DENY',
      ...(res.csp ? { 'Content-Security-Policy': res.csp } : {}),
    });
    res.end(typeof corpo === 'string' ? corpo : JSON.stringify(corpo));
  }

  errado(req, res) {
    this.erros++;
    this.responder(res, 404, { erro: 'nao' });
    // Muitos pedidos errados: alguém está tentando adivinhar o código.
    if (this.erros >= MAX_ERROS) this.parar('tentativas');
  }

  async atender(req, res) {
    const ip = String(req.socket.remoteAddress || '').replace(/^::ffff:/, '');
    if (!this.local(ip)) { req.socket.destroy(); return; }
    const u = new URL(req.url, 'http://x');
    // O ícone que o navegador do celular pede sozinho não é uma tentativa errada.
    if (/^\/(favicon\.ico|apple-touch-icon[\w.-]*\.png)$/.test(u.pathname)) return this.responder(res, 404, { erro: 'nao' });
    const partes = u.pathname.split('/').filter(Boolean);
    if (partes[0] !== this.codigo || partes.length > 2) return this.errado(req, res);
    const acao = partes[1] || '';
    // A página e os envios contam como uso (a consulta do estado, que a página faz sozinha, não).
    if (acao !== 'estado') this.mexer();
    if (req.method === 'GET' && acao === '') {
      if (!this.aparelhos.has(ip)) {
        if (this.aparelhos.size >= MAX_APARELHOS) return this.responder(res, 429, { erro: 'muitos' });
        this.aparelhos.set(ip, 'aguardando');
        this.avisar('pedido', { ip, aparelho: String(req.headers['user-agent'] || '').slice(0, 200) });
      }
      const nonce = crypto.randomBytes(12).toString('base64');
      res.csp = `default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; connect-src 'self'; img-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'`;
      return this.responder(res, 200, pagina({ textos: this.textos(), nonce, codigo: this.codigo }), 'text/html; charset=utf-8');
    }
    if (req.method === 'GET' && acao === 'estado') return this.responder(res, 200, { estado: this.aparelhos.get(ip) || 'aguardando' });
    if (req.method === 'PUT' && acao === 'arquivo') return this.receberArquivo(req, res, ip, u.searchParams.get('nome'));
    return this.errado(req, res);
  }

  async receberArquivo(req, res, ip, nome) {
    const t = this.textos();
    if (this.aparelhos.get(ip) !== 'aprovado') return this.responder(res, 403, { erro: t.naoAprovado });
    const tamanho = Number(req.headers['content-length']);
    if (!Number.isFinite(tamanho) || tamanho < 0) return this.responder(res, 411, { erro: t.falhou });
    if (tamanho > MAX_ARQUIVO) return this.responder(res, 413, { erro: t.grande });
    if (this.bytes + tamanho > MAX_SESSAO) return this.responder(res, 413, { erro: t.sessao });
    if (this.enviando >= 4) return this.responder(res, 429, { erro: t.falhou });
    const disco = this.disco();
    const pasta = this.pasta();
    await fsp.mkdir(disco.real(pasta), { recursive: true });
    try {
      const st = await fsp.statfs(disco.real(pasta));
      if (st.bavail * st.bsize < tamanho + FOLGA) return this.responder(res, 507, { erro: t.semEspaco });
    } catch { /* sem statfs: segue, o limite por arquivo vale */ }
    this.enviando++;
    const limpo = nomeSeguro(nome);
    const tmp = path.join(disco.real(pasta), `.~recebendo-${crypto.randomBytes(6).toString('hex')}.tmp`);
    let escritos = 0;
    try {
      await new Promise((ok, falha) => {
        const saida = fs.createWriteStream(tmp, { flags: 'wx', mode: 0o644 });
        req.on('data', (b) => {
          escritos += b.length;
          // Mais que o anunciado: para no meio.
          if (escritos > tamanho) { req.destroy(); saida.destroy(new Error('maior')); }
        });
        req.on('close', () => { if (!req.complete) saida.destroy(new Error('interrompido')); });
        req.pipe(saida);
        saida.on('finish', ok);
        saida.on('error', falha);
        req.on('error', falha);
      });
      if (escritos !== tamanho) throw new Error('incompleto');
      // O nome livre na hora de pôr no lugar: nada é gravado por cima.
      const final = await disco.nomeLivre(pasta, limpo);
      const rel = `${pasta}/${final}`;
      await fsp.link(tmp, disco.real(rel)).then(() => fsp.unlink(tmp), async (e) => {
        // Sem links (o FAT de um pendrive): renomear, conferindo antes que o nome continua livre.
        if (e.code === 'EEXIST') throw e;
        if (fs.existsSync(disco.real(rel))) throw new Error('existe');
        await fsp.rename(tmp, disco.real(rel));
      });
      this.recebidos++;
      this.bytes += escritos;
      this.avisar('arquivo', { rel, nome: final, tamanho: escritos, ip });
      return this.responder(res, 200, { ok: true, nome: final });
    } catch {
      await fsp.unlink(tmp).catch(() => { });
      if (!res.headersSent && !res.destroyed) this.responder(res, 400, { erro: t.falhou });
      return null;
    } finally {
      this.enviando--;
    }
  }
}

module.exports = { Receber, ehLocal, enderecosLocais, nomeSeguro, novoCodigo, pagina, LETRAS, MAX_ERROS };
