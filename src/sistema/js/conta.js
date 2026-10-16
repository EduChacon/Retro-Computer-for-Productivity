/*
 * As contas da caixa de busca (como no KRunner do KDE, na busca do GNOME e na do Windows):
 * "12*3,5", "(1+2)^3", "200 × 15%", "√2". Um leitor próprio (nada de eval): números com
 * ponto ou vírgula decimal, + − × ÷ (e * /), ^ para potência, % para porcentagem,
 * √ para raiz quadrada e parênteses. Sem nenhum import, para os testes no Node.
 */

const OPERADORES = /[+\-*/×÷^%√−·:]/;

function lerTokens(texto) {
  const s = String(texto).replace(/\s+/g, '').replace(/−/g, '-').replace(/[×·]/g, '*').replace(/[÷:]/g, '/');
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.,]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.,]/.test(s[j])) j++;
      const bruto = s.slice(i, j);
      // Um só separador decimal (ponto ou vírgula); "1.000.000" não é uma conta.
      if ((bruto.match(/[.,]/g) || []).length > 1 || !/[0-9]/.test(bruto)) return null;
      tokens.push({ t: 'n', v: Number(bruto.replace(',', '.')) });
      i = j;
    } else if ('+-*/^%()√'.includes(c)) {
      tokens.push({ t: c });
      i++;
    } else {
      return null;
    }
  }
  return tokens;
}

/*
 * A gramática (do menor para o maior grau):
 *   soma    = produto (("+" | "-") produto)*
 *   produto = unario (("*" | "/") unario)*
 *   unario  = ("-" | "+") unario | potencia
 *   potencia = posfixo ("^" unario)?          (à direita: 2^3^2 = 2^9)
 *   posfixo = primario "%"*
 *   primario = numero | "(" soma ")" | "√" unario
 */
function analisar(tokens) {
  let p = 0;
  const ver = () => tokens[p] && tokens[p].t;
  const comer = (t) => { if (ver() !== t) throw new Error('esperava ' + t); p++; };

  function soma() {
    let v = produto();
    while (ver() === '+' || ver() === '-') {
      const op = tokens[p++].t;
      const d = produto();
      v = op === '+' ? v + d : v - d;
    }
    return v;
  }
  function produto() {
    let v = unario();
    while (ver() === '*' || ver() === '/') {
      const op = tokens[p++].t;
      const d = unario();
      if (op === '/' && d === 0) throw new Error('divisão por zero');
      v = op === '*' ? v * d : v / d;
    }
    return v;
  }
  function unario() {
    if (ver() === '-') { p++; return -unario(); }
    if (ver() === '+') { p++; return unario(); }
    return potencia();
  }
  function potencia() {
    const b = posfixo();
    if (ver() === '^') { p++; return b ** unario(); }
    return b;
  }
  function posfixo() {
    let v = primario();
    while (ver() === '%') { p++; v /= 100; }
    return v;
  }
  function primario() {
    const t = ver();
    if (t === 'n') return tokens[p++].v;
    if (t === '(') {
      p++;
      const v = soma();
      comer(')');
      return v;
    }
    if (t === '√') {
      p++;
      const v = unario();
      if (v < 0) throw new Error('raiz de negativo');
      return Math.sqrt(v);
    }
    throw new Error('inesperado');
  }

  const v = soma();
  if (p !== tokens.length) throw new Error('sobrou');
  return v;
}

/**
 * O resultado da conta, ou null quando o texto não é uma conta (um número sozinho, uma
 * palavra, um parêntese a mais) ou não tem resultado (divisão por zero).
 */
export function calcular(texto) {
  const s = String(texto || '').trim();
  if (!s || s.length > 200 || !OPERADORES.test(s.replace(/^[+-]/, ''))) return null;
  // Uma data (2024-10-16, 16/10/2024) é procurada como texto, não subtraída nem dividida.
  if (/^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}$/.test(s)) return null;
  const tokens = lerTokens(s);
  if (!tokens || !tokens.some((k) => k.t === 'n')) return null;
  try {
    const v = analisar(tokens);
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/** O resultado arredondado (12 algarismos significativos: 0,1 + 0,2 dá 0,3). */
export function arredondar(v) {
  if (!Number.isFinite(v)) return v;
  const r = Number(v.toPrecision(12));
  return Object.is(r, -0) ? 0 : r;
}
