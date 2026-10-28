'use strict';
/*
 * O bloqueio de propagandas e rastreadores do Navegador (Painel › Segurança › Privacidade e
 * Exibir › Bloquear propagandas), ligado por padrão. Duas partes, sem baixar listas de fora:
 * - os pedidos às redes de anúncios e de rastreamento conhecidas (DOMINIOS) são cancelados;
 * - os espaços que sobram na página (os quadros vazios dos anúncios) são escondidos pelo CSS.
 * A página que o usuário abre nunca é bloqueada (só o que ela carrega), e um site pode ficar de
 * fora (Exibir › Permitir as propagandas neste site), para quando o bloqueio atrapalhar.
 */

// As redes de anúncios e de rastreamento: o domínio e todos os subdomínios dele. Ficam de fora
// os que os sites usam para funcionar (os logins, o reCAPTCHA, as fontes, as bibliotecas).
const DOMINIOS = new Set([
  // Google
  'doubleclick.net', 'googlesyndication.com', 'googleadservices.com', 'googletagservices.com',
  'google-analytics.com', 'adservice.google.com', 'adservice.google.com.br',
  'pagead2.googlesyndication.com', '2mdn.net', 'admob.com',
  // Amazon, Microsoft, Meta, X, TikTok, LinkedIn, Pinterest, Snap, Reddit
  'amazon-adsystem.com', 'assoc-amazon.com', 'bat.bing.com', 'clarity.ms', 'ads.linkedin.com', 'px.ads.linkedin.com',
  'analytics.tiktok.com', 'ads.tiktok.com', 'ads-api.tiktok.com', 'ads-twitter.com', 'analytics.twitter.com', 'static.ads-twitter.com',
  'ct.pinterest.com', 'tr.snapchat.com', 'sc-static.net', 'alb.reddit.com', 'events.redditmedia.com',
  // Redes de anúncios e leilões
  'adnxs.com', 'adsrvr.org', 'criteo.com', 'criteo.net', 'rubiconproject.com', 'pubmatic.com', 'openx.net',
  'casalemedia.com', 'indexww.com', 'smartadserver.com', 'teads.tv', 'teads.com', 'yieldmo.com', 'sharethrough.com',
  'triplelift.com', '3lift.com', 'media.net', 'contextweb.com', 'bidswitch.net', 'adform.net', 'adformdsp.net',
  'spotxchange.com', 'spotx.tv', 'springserve.com', 'lijit.com', 'sovrn.com', 'gumgum.com', 'districtm.io',
  'adsafeprotected.com', 'moatads.com', 'doubleverify.com', 'serving-sys.com', 'flashtalking.com', 'adition.com',
  'outbrain.com', 'outbrainimg.com', 'taboola.com', 'taboolasyndication.com', 'revcontent.com', 'mgid.com',
  'zemanta.com', 'adblade.com', 'content.ad', 'propellerads.com', 'popads.net', 'popcash.net', 'exoclick.com',
  'juicyads.com', 'adcash.com', 'hilltopads.net', 'adsterra.com', 'admaven.com', 'onclickads.net',
  'advertising.com', 'adtechus.com', 'yieldlab.net', 'adhigh.net', 'adkernel.com', 'adtelligent.com',
  'rtbhouse.com', 'creativecdn.com', 'smaato.net', 'inmobi.com', 'mopub.com', 'applovin.com', 'unityads.unity3d.com',
  'vidoomy.com', 'seedtag.com', 'richaudience.com', 'improvedigital.com', '360yield.com', 'e-planning.net',
  'smilewanted.com', 'onetag-sys.com', 'connectad.io', 'adnami.io', 'ad.gt', 'amxrtb.com', 'adpushup.com',
  'adligature.com', 'admixer.net', 'adriver.ru', 'yandex.ru/ads', 'an.yandex.ru',
  // Brasil
  'navdmp.com', 'navegg.com', 'tailtarget.com', 'adsplay.com.br', 'jsuol.com.br', 'tm.uol.com.br', 'ads.globo.com',
  'adserver.globo.com', 'horizon.globo.com', 'zedo.com', 'netshoes.com.br/ads',
  // Rastreamento e medição
  'scorecardresearch.com', 'quantserve.com', 'quantcount.com', 'chartbeat.com', 'chartbeat.net', 'hotjar.com',
  'mouseflow.com', 'crazyegg.com', 'fullstory.com', 'mixpanel.com', 'segment.io', 'segment.com', 'amplitude.com',
  'heap.io', 'heapanalytics.com', 'newrelic.com', 'nr-data.net', 'krxd.net', 'bluekai.com', 'exelator.com',
  'demdex.net', 'omtrdc.net', 'everesttech.net','mathtag.com', 'rlcdn.com', 'tapad.com',
  'agkn.com', 'adsymptotic.com', 'crwdcntrl.net', 'lotame.com', 'eyeota.net', 'id5-sync.com', 'liadm.com',
  'liveintent.com','tealiumiq.com', 'bounceexchange.com', 'bouncex.net', 'permutive.com',
  'permutive.app', 'parsely.com', 'parse.ly', 'comscore.com', 'imrworldwide.com', 'nielsen.com',
  'branch.io', 'app.link', 'adjust.com', 'appsflyer.com', 'kochava.com', 'onesignal.com', 'pushcrew.com',
  'pushengage.com', 'sail-horizon.com', 'mookie1.com', 'turn.com', 'bidr.io', 'dotomi.com', 'dpbolvw.net',
  'emxdgt.com', 'gwallet.com', 'sitescout.com', 'simpli.fi', 'semasio.net', 'statcounter.com', 'yandex.ru/metrika',
  'mc.yandex.ru', 'hm.baidu.com', 'cnzz.com',
  // Os avisos de "notificações" e janelas que se abrem sozinhas
  'push.express', 'izooto.com', 'subscribers.com', 'notix.io', 'pushwoosh.com',
]);

// Os caminhos de anúncio dentro de sites que não se pode bloquear inteiros (o YouTube, o Facebook).
// Os gerenciadores de etiquetas (o Google Tag Manager, o Tealium) e o IMA dos vídeos ficam de fora
// da lista de domínios: sem eles, alguns sites e tocadores de vídeo param de funcionar.
const CAMINHOS = [
  /^https?:\/\/(www\.)?youtube\.com\/(pagead\/|api\/stats\/ads|ptracking|get_midroll_)/,
  /^https?:\/\/(www\.)?google\.com(\.br)?\/(pagead\/|adsense\/)/,
  /^https?:\/\/(www\.)?facebook\.com\/tr[/?]/,
  /^https?:\/\/[^/]+\/(ads|adserver|adframe)\/[^?]*\.(js|gif)(\?|$)/,
];

// Os espaços dos anúncios na página: só seletores próprios de anúncio, para não esconder o conteúdo.
const CSS_ESCONDER = `${[
  'ins.adsbygoogle', '.adsbygoogle', '[id^="google_ads_iframe"]', '[id^="div-gpt-ad"]', '[data-google-query-id]',
  'iframe[src*="doubleclick.net"]', 'iframe[src*="googlesyndication.com"]', 'iframe[src*="amazon-adsystem.com"]',
  '[id^="taboola-"]', '.trc_related_container', '.OUTBRAIN', '.ob-widget', '[data-widget-id^="AR_"]',
  '.mgid-widget', '[id^="mgid_"]', '[id^="rcjsload"]', '.teads-inread', '[data-ad-slot]', '[data-adunit]',
  '.ad-slot', '.ad-container', '.ad-wrapper', '.adunit', '.ad-banner', '.banner-ad', '.publicidade',
  '.publicidade-container', '[class^="publicidade-"]','[id^="banner-publicidade"]',
  // O YouTube: os anúncios da lista, da página inicial e ao lado do vídeo
  'ytd-ad-slot-renderer', 'ytd-in-feed-ad-layout-renderer', 'ytd-promoted-sparkles-web-renderer', 'ytd-display-ad-renderer',
  'ytd-promoted-video-renderer', 'ytd-banner-promo-renderer', '#masthead-ad', '#player-ads', '.ytd-merch-shelf-renderer',
].join(',\n')} { display: none !important; }\n`;

/** O nome do site sem o "www." (a chave das exceções). */
function siteDe(url) {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return h.startsWith('www.') ? h.slice(4) : h;
  } catch { return ''; }
}

/** O endereço é de uma rede de anúncios ou de rastreamento? */
function ehPropaganda(url) {
  let u;
  try { u = new URL(url); } catch { return false; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:' && u.protocol !== 'wss:' && u.protocol !== 'ws:') return false;
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  // O domínio e cada um dos de cima (a.b.doubleclick.net → b.doubleclick.net → doubleclick.net).
  const partes = host.split('.');
  for (let i = 0; i < partes.length - 1; i++) {
    const d = partes.slice(i).join('.');
    if (DOMINIOS.has(d)) return true;
    // As entradas com caminho (yandex.ru/ads): o domínio e o começo do caminho.
    if (DOMINIOS.has(d + '/' + u.pathname.split('/')[1])) return true;
  }
  return CAMINHOS.some((r) => r.test(url));
}

/** O site está entre os que o usuário deixou de fora (ele ou um dos de cima)? */
function permitido(site, permitidos = []) {
  if (!site) return false;
  const lista = new Set(permitidos.map((s) => String(s).toLowerCase()));
  const partes = site.split('.');
  for (let i = 0; i < partes.length - 1; i++) if (lista.has(partes.slice(i).join('.'))) return true;
  return false;
}

/**
 * Bloquear este pedido? A página principal nunca (o usuário pediu para abri-la, até a de um anúncio
 * clicado); o resto, quando o bloqueio está ligado, o site da página não está entre os de fora e o
 * endereço é de anúncio ou de rastreamento.
 */
function bloquear({ url, tipo, pagina }, { ligado = true, permitidos = [] } = {}) {
  if (!ligado || tipo === 'mainFrame') return false;
  if (pagina && permitido(siteDe(pagina), permitidos)) return false;
  return ehPropaganda(url);
}

module.exports = { DOMINIOS, CSS_ESCONDER, siteDe, ehPropaganda, permitido, bloquear };
