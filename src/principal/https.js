'use strict';
/*
 * Só conexões seguras no Navegador (Painel › Segurança, como o "modo somente HTTPS" dos
 * navegadores de hoje): um endereço http:// vira https://. Se o site não tiver a versão segura,
 * o Navegador avisa e só abre a outra se o usuário quiser (e aí, só aquele site, até fechar).
 * Os aparelhos da casa (o roteador, a impressora), que quase nunca têm HTTPS, ficam de fora.
 */

/** O endereço é de um aparelho da rede de casa (ou do próprio computador)? */
function ehRedeLocal(host) {
  const h = String(host || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!h || h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.lan') || h.endsWith('.home.arpa')) return true;
  if (h === '::1' || /^f[cd][0-9a-f]{2}:/.test(h) || /^fe80:/.test(h)) return true;
  const ip = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (!ip) return !h.includes('.'); // um nome sem ponto ("roteador", "nas") é da rede de casa
  const [a, b] = [Number(ip[1]), Number(ip[2])];
  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
}

/**
 * O endereço seguro para um http:// (ou null, quando fica como está: não é http, é da rede de
 * casa ou o usuário já escolheu abrir aquele site sem segurança).
 */
function paraHttps(url, liberados = new Set()) {
  let u;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== 'http:' || ehRedeLocal(u.hostname) || liberados.has(u.host.toLowerCase())) return null;
  u.protocol = 'https:';
  // A porta 80 é a do http; na versão segura, a padrão (443).
  if (u.port === '80') u.port = '';
  return u.toString();
}

/**
 * Lembra os endereços trocados por pouco tempo: quando a versão segura falha (ou manda de volta
 * para o http, o que daria voltas sem fim), o Navegador sabe qual era o endereço de antes.
 */
class Subidos {
  constructor({ agora = () => Date.now(), validade = 60000 } = {}) {
    this.agora = agora;
    this.validade = validade;
    this.mapa = new Map(); // https → { http, em }
  }

  guardar(seguro, http) {
    this.limpar();
    this.mapa.set(seguro, { http, em: this.agora() });
  }

  /** O http de antes de um https que acabou de ser trocado. */
  deOnde(seguro) {
    const r = this.mapa.get(seguro);
    return r && this.agora() - r.em < this.validade ? r.http : null;
  }

  /** Um http que já foi trocado há pouco e voltou: o site manda de volta para o http. */
  voltou(http) {
    for (const r of this.mapa.values()) if (r.http === http && this.agora() - r.em < 10000) return true;
    return false;
  }

  limpar() {
    const t = this.agora();
    for (const [k, r] of this.mapa) if (t - r.em >= this.validade) this.mapa.delete(k);
  }
}

module.exports = { ehRedeLocal, paraHttps, Subidos };
