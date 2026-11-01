'use strict';
/* Formulários MCP: só dados tipados, sem HTML, execução de esquema ou busca de referências. */
const { tr } = require('./idioma');
const objeto = (v) => v && typeof v === 'object' && !Array.isArray(v);
const tem = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

function formulario(schema) {
  if (!objeto(schema) || schema.type !== 'object' || !objeto(schema.properties)) return null;
  if (Object.keys(schema).some((k) => !['$schema', 'type', 'properties', 'required', 'additionalProperties', 'title', 'description'].includes(k))) return null;
  const entradas = Object.entries(schema.properties);
  if (entradas.length > 32 || (schema.required && (!Array.isArray(schema.required) || schema.required.some((k) => !tem(schema.properties, k))))) return null;
  const campos = [];
  for (const [id, s] of entradas) {
    if (!objeto(s) || id.length > 200 || Object.keys(s).some((k) => !['type', 'title', 'description', 'minLength', 'maxLength', 'format', 'default', 'minimum', 'maximum', 'minItems', 'maxItems', 'items', 'enum', 'enumNames', 'oneOf'].includes(k))) return null;
    for (const k of ['minLength', 'maxLength', 'minimum', 'maximum', 'minItems', 'maxItems']) if (tem(s, k) && (typeof s[k] !== 'number' || !Number.isFinite(s[k]))) return null;
    const c = { id, titulo: String(s.title || id).slice(0, 300), descricao: String(s.description || '').slice(0, 2000), tipo: s.type, obrigatorio: !!schema.required?.includes(id) };
    for (const k of ['minLength', 'maxLength', 'minimum', 'maximum', 'minItems', 'maxItems', 'format']) if (tem(s, k)) c[k] = s[k];
    const itens = s.type === 'array' ? s.items : s;
    if (s.type === 'array' && (!objeto(itens) || Object.keys(itens).some((k) => !['type', 'enum', 'enumNames', 'anyOf'].includes(k)))) return null;
    const titulos = c.tipo === 'array' ? itens?.anyOf : itens?.oneOf;
    if (itens && ((tem(itens, 'enum') && !Array.isArray(itens.enum)) || (tem(itens, 'enumNames') && !Array.isArray(itens.enumNames)) || (titulos !== undefined && (!Array.isArray(titulos) || titulos.some((o) => !objeto(o) || Object.keys(o).some((k) => !['const', 'title'].includes(k))))))) return null;
    if (itens?.enum || titulos) {
      const opcoes = itens.enum?.map((v, i) => ({ valor: v, titulo: itens.enumNames?.[i] || v })) || titulos.map((o) => ({ valor: o.const, titulo: o.title || o.const }));
      if (!opcoes.length || opcoes.length > 64 || opcoes.some((o) => typeof o.valor !== 'string' || o.valor.length > 4000)) return null;
      c.opcoes = opcoes.map((o) => ({ valor: o.valor, titulo: String(o.titulo).slice(0, 300) }));
    }
    if (!['string', 'number', 'integer', 'boolean', 'array'].includes(c.tipo) || (c.tipo === 'array' && (!c.opcoes || ![undefined, 'string'].includes(itens.type))) || (c.opcoes && !['array', 'string'].includes(c.tipo))) return null;
    if (s.minLength > 4000 || ![undefined, 'email', 'uri', 'date', 'date-time'].includes(s.format)) return null;
    if (tem(s, 'default')) { try { validar([c], { [id]: s.default }); c.padrao = s.default; } catch { } }
    campos.push(c);
  }
  return campos;
}

function validar(campos, respostas) {
  if (!objeto(respostas) || Object.keys(respostas).some((k) => !campos.some((c) => c.id === k))) throw new Error(tr('Resposta do formulário inválida.'));
  const r = Object.create(null);
  for (const c of campos) {
    const v = respostas[c.id];
    const ausente = !tem(respostas, c.id) || v === undefined;
    if (ausente && !c.obrigatorio) continue;
    let ok = !ausente;
    if (c.tipo === 'string') {
      ok &&= typeof v === 'string' && [...v].length <= Math.min(c.maxLength ?? 4000, 4000) && [...v].length >= (c.minLength ?? 0);
      if (ok && c.format === 'email') ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      if (ok && c.format === 'uri') { try { new URL(v); } catch { ok = false; } }
      if (ok && c.format === 'date') ok = /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v + 'T00:00:00Z').toISOString().startsWith(v);
      if (ok && c.format === 'date-time') ok = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(v) && Number.isFinite(Date.parse(v));
      if (ok && c.opcoes) ok = c.opcoes.some((o) => o.valor === v);
    } else if (c.tipo === 'boolean') ok &&= typeof v === 'boolean';
    else if (c.tipo === 'array') ok &&= Array.isArray(v) && v.length <= Math.min(c.maxItems ?? 64, 64) && v.length >= (c.minItems ?? 0) && new Set(v).size === v.length && v.every((x) => c.opcoes.some((o) => o.valor === x));
    else ok &&= typeof v === 'number' && Number.isFinite(v) && (c.tipo !== 'integer' || Number.isInteger(v)) && v >= (c.minimum ?? -Infinity) && v <= (c.maximum ?? Infinity);
    if (!ok) throw new Error(tr('Confira o campo “{campo}” antes de permitir.', { campo: c.titulo }));
    r[c.id] = v;
  }
  if (JSON.stringify(r).length > 64000) throw new Error(tr('Resposta do formulário inválida.'));
  return r;
}

function enderecoAutorizacao(valor) {
  try {
    const u = new URL(valor);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
    if (u.username || u.password || (u.protocol !== 'https:' && !(u.protocol === 'http:' && local))) return null;
    return u.href;
  } catch { return null; }
}

module.exports = { formulario, validar, enderecoAutorizacao };
