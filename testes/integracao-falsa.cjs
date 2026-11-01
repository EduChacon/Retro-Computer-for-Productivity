'use strict';
/* Registro local de teste; o modo real do Windows usa o auxiliar do pacote e uma janela própria. */
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const id = 'retro:janela-de-teste';
const nome = process.env.RETRO_INTEGRACAO_NOME || 'Programa de teste';
exports.plataforma = process.env.RETRO_INTEGRACAO_MODO || 'win32';
const pedidos = []; let permitido = exports.plataforma !== 'darwin', associada = false;
function anotar(acao, dados = {}) { pedidos.push({ acao, dados }); if (process.env.RETRO_INTEGRACAO_RELATORIO) fs.writeFileSync(process.env.RETRO_INTEGRACAO_RELATORIO, JSON.stringify(pedidos)); }
exports.aplicativos = ({ aplicativos }) => Object.assign(Object.create(aplicativos), {
  listar: () => [{ id, nome, terminal: false }],
  achar: (chave) => chave === id ? { id, nome, arquivo: process.env.RETRO_INTEGRACAO_ATALHO || process.env.RETRO_INTEGRACAO_EXE || '/programa-de-teste.exe' } : null,
  icone: async () => null,
  alvoIntegracao: (chave) => chave !== id ? null : exports.plataforma === 'darwin' ? '/programa-de-teste.app' : { atalho: process.env.RETRO_INTEGRACAO_ATALHO || '/programa-de-teste.lnk', arquivo: process.env.RETRO_INTEGRACAO_EXE || '/programa-de-teste.exe' },
  abrir: async (chave) => {
    if (chave !== id) throw new Error('programa desconhecido'); anotar('abrir');
    if (process.env.RETRO_INTEGRACAO_REAL) { const p = spawn(process.env.RETRO_INTEGRACAO_EXE, [process.env.RETRO_INTEGRACAO_JANELA], { stdio: 'ignore' }); p.unref(); }
    return { ok: true };
  },
});
if (!process.env.RETRO_INTEGRACAO_REAL) exports.ponte = () => ({
  pedir: async (acao, dados) => {
    anotar(acao, dados);
    if (acao === 'estado') return { permitido };
    if (acao === 'permitir') { permitido = true; return { permitido }; }
    if (acao === 'abrirPrograma') return { abertura: 'abertura-local' };
    if (['listar', 'listarAbertura'].includes(acao)) return [{ id: 'janela-local', titulo: 'Documento de teste' }];
    if (acao === 'consultar') return { aberta: true };
    if (acao === 'associar') {
      if (process.env.RETRO_INTEGRACAO_ELEVADA) {
        const { tr } = require('../src/principal/idioma');
        const { TEXTOS } = require('../src/principal/janelas-integradas');
        const e = new Error(tr(TEXTOS.elevado)); e.codigo = 'elevado'; throw e;
      }
      associada = true;
    }
    if (acao === 'soltar') associada = false;
    return { ok: true, associada };
  },
  encerrar() { anotar('encerrar'); },
});
