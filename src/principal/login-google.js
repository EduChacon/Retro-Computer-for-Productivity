'use strict';
/*
 * O login do Google no Navegador. O Google recusa os navegadores que reconhece como embutidos num
 * aplicativo ("Esse navegador ou app pode não ser seguro"). Nas páginas de login, o Navegador tem
 * dois jeitos de se apresentar, e troca sozinho de um para o outro quando o Google recusa:
 *
 *   firefox  como o Firefox: o agente dele, sem as "client hints" e sem o navigator.userAgentData
 *            do Chromium (o Firefox não tem nenhum dos dois);
 *   chrome   como o Chrome desta mesma versão do Chromium: o agente reduzido do Chrome e as marcas
 *            dele (com o "Google Chrome") nas client hints e no navigator.userAgentData, sem o "Electron".
 *
 * O jeito que deu certo fica guardado (navegador.loginGoogle). Se os dois forem recusados, a janela
 * sugere o Firefox de verdade como navegador padrão (Painel de controle › Internet).
 * Funções puras, testadas em testes/login-google.test.js; main.js as liga à sessão do Navegador.
 */

const LOGIN_GOOGLE = /^https:\/\/accounts\.google\.com\//i;
// A página "Não foi possível fazer login" (…/signin/rejected, …/v3/signin/rejected).
const RECUSADO = /^https:\/\/accounts\.google\.com\/(?:[^?#]*\/)?rejected(?:[/?#]|$)/i;
const MODOS = ['firefox', 'chrome'];

const modoValido = (m) => (MODOS.includes(m) ? m : 'firefox');
const outroModo = (m) => (modoValido(m) === 'firefox' ? 'chrome' : 'firefox');

function agenteFirefox(plataforma = process.platform, arq = process.arch) {
  const so = plataforma === 'win32' ? 'Windows NT 10.0; Win64; x64'
    : plataforma === 'darwin' ? 'Macintosh; Intel Mac OS X 10.15'
      : arq === 'arm64' ? 'X11; Linux aarch64' : 'X11; Linux x86_64';
  return `Mozilla/5.0 (${so}; rv:150.0) Gecko/20100101 Firefox/150.0`;
}

/** O agente reduzido do Chrome (o que o Chrome manda hoje: só a versão maior, a plataforma congelada). */
function agenteChrome(versao, plataforma = process.platform) {
  const maior = String(versao || '').split('.')[0] || '152';
  const so = plataforma === 'win32' ? 'Windows NT 10.0; Win64; x64'
    : plataforma === 'darwin' ? 'Macintosh; Intel Mac OS X 10_15_7' : 'X11; Linux x86_64';
  return `Mozilla/5.0 (${so}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${maior}.0.0.0 Safari/537.36`;
}

/*
 * As marcas das client hints como o próprio Chromium as monta (user_agent_utils.cc): a marca de
 * enfeite ("GREASE", que muda com a versão maior), o Chromium e, no Chrome, o "Google Chrome", numa
 * ordem que também vem da versão maior. Assim, a lista é a mesma que o Chrome dessa versão manda.
 */
const SINAIS = [' ', '(', ':', '-', '.', '/', ')', ';', '=', '?', '_'];
const VERSOES_ENFEITE = ['8', '99', '24'];

function marcasDe(versao, completa, comChrome) {
  const v = String(versao || '152');
  const maior = Number(v.split('.')[0]) || 152;
  const enfeite = { brand: `Not${SINAIS[maior % 11]}A${SINAIS[(maior + 1) % 11]}Brand`, version: VERSOES_ENFEITE[maior % 3] };
  if (completa) enfeite.version += '.0.0.0';
  const chromium = { brand: 'Chromium', version: completa ? v : String(maior) };
  const r = [];
  if (!comChrome) {
    const o = [[0, 1], [1, 0]][maior % 2];
    r[o[0]] = enfeite; r[o[1]] = chromium;
    return r;
  }
  const o = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]][maior % 6];
  r[o[0]] = enfeite; r[o[1]] = chromium; r[o[2]] = { brand: 'Google Chrome', version: chromium.version };
  return r;
}

/** As marcas do Chrome ({ brand, version }), com a versão maior ou a completa. */
const marcasChrome = (versao, completa = false) => marcasDe(versao, completa, true);
/** As do Chromium sozinho (as que o Navegador manda por si; para conferir a regra). */
const marcasChromium = (versao, completa = false) => marcasDe(versao, completa, false);

const listaMarcas = (ms) => ms.map((m) => `"${m.brand}";v="${m.version}"`).join(', ');

/** Os cabeçalhos de um pedido às páginas de login, no jeito escolhido. */
function cabecalhosLogin(cab, modo, { versao, plataforma = process.platform, arq = process.arch } = {}) {
  const r = {};
  for (const [k, v] of Object.entries(cab || {})) if (!/^user-agent$/i.test(k)) r[k] = v;
  if (modoValido(modo) === 'chrome') {
    r['User-Agent'] = agenteChrome(versao, plataforma);
    for (const k of Object.keys(r)) {
      if (/^sec-ch-ua$/i.test(k)) r[k] = listaMarcas(marcasChrome(versao));
      else if (/^sec-ch-ua-full-version-list$/i.test(k)) r[k] = listaMarcas(marcasChrome(versao, true));
      else if (/^sec-ch-ua-full-version$/i.test(k)) r[k] = `"${versao}"`;
    }
    return r;
  }
  r['User-Agent'] = agenteFirefox(plataforma, arq);
  for (const k of Object.keys(r)) if (/^sec-ch-ua/i.test(k)) delete r[k];
  return r;
}

/** O agente da página (navigator.userAgent) no jeito escolhido. */
const agenteLogin = (modo, { versao, plataforma = process.platform, arq = process.arch } = {}) => (
  modoValido(modo) === 'chrome' ? agenteChrome(versao, plataforma) : agenteFirefox(plataforma, arq));

/**
 * O que a página de login enxerga por JavaScript, no jeito escolhido: no Firefox, sem o
 * navigator.userAgentData; no Chrome, as marcas dele (no próprio NavigatorUAData, que continua o mesmo).
 */
function scriptLogin(modo, versao) {
  if (modoValido(modo) !== 'chrome') {
    return "try { Object.defineProperty(Navigator.prototype, 'userAgentData', { get: () => undefined, configurable: true }); } catch (e) { }";
  }
  const curtas = JSON.stringify(marcasChrome(versao));
  const longas = JSON.stringify(marcasChrome(versao, true));
  return `(() => { try {
    const ua = navigator.userAgentData; if (!ua) return;
    const proto = Object.getPrototypeOf(ua);
    const curtas = ${curtas}, longas = ${longas};
    const copia = (l) => l.map((m) => ({ brand: m.brand, version: m.version }));
    Object.defineProperty(proto, 'brands', { get: () => copia(curtas), configurable: true, enumerable: true });
    const alta = proto.getHighEntropyValues;
    Object.defineProperty(proto, 'getHighEntropyValues', { configurable: true, writable: true, value: function (dicas) {
      return alta.call(this, dicas).then((r) => Object.assign({}, r, { brands: copia(curtas) },
        r.fullVersionList ? { fullVersionList: copia(longas) } : {}, r.uaFullVersion ? { uaFullVersion: ${JSON.stringify(String(versao))} } : {}));
    } });
    const json = proto.toJSON;
    if (json) Object.defineProperty(proto, 'toJSON', { configurable: true, writable: true, value: function () { return Object.assign({}, json.call(this), { brands: copia(curtas) }); } });
  } catch (e) { } })()`;
}

/**
 * Acompanha um fluxo de login numa aba: guarda o primeiro endereço do login (para recomeçar dele) e
 * os jeitos já recusados. recusado() devolve o próximo jeito a tentar, ou null quando os dois já foram.
 */
class FluxoLogin {
  constructor() { this.inicio = null; this.recusados = new Set(); }

  /** Uma navegação da aba (o quadro principal). */
  navegou(url) {
    if (!LOGIN_GOOGLE.test(url || '')) { this.inicio = null; this.recusados.clear(); return; }
    if (!this.inicio && !RECUSADO.test(url)) this.inicio = url;
  }

  recusado(modo) {
    this.recusados.add(modoValido(modo));
    const outro = outroModo(modo);
    return this.inicio && !this.recusados.has(outro) ? outro : null;
  }
}

module.exports = { LOGIN_GOOGLE, RECUSADO, MODOS, modoValido, outroModo, agenteFirefox, agenteChrome, marcasChrome, marcasChromium, cabecalhosLogin, agenteLogin, scriptLogin, FluxoLogin };
