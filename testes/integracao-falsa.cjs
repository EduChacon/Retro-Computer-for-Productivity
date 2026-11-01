'use strict';
/* Registro local de teste; o modo real do Windows usa o auxiliar do pacote e uma janela própria. */
const fs = require('node:fs');
const { spawn } = require('node:child_process');
const id = 'retro:janela-de-teste';
exports.plataforma = process.env.RETRO_INTEGRACAO_MODO || 'win32';
const pedidos = []; let permitido = exports.plataforma !== 'darwin', associada = false;
function anotar(acao, dados = {}) { pedidos.push({ acao, dados }); if (process.env.RETRO_INTEGRACAO_RELATORIO) fs.writeFileSync(process.env.RETRO_INTEGRACAO_RELATORIO, JSON.stringify(pedidos)); }
exports.aplicativos = ({ aplicativos }) => Object.assign(Object.create(aplicativos), {
  listar: () => [{ id, nome: 'Programa de teste', terminal: false }],
  achar: (chave) => chave === id ? { id, nome: 'Programa de teste', arquivo: process.env.RETRO_INTEGRACAO_EXE || '/programa-de-teste.exe' } : null,
  icone: async () => null,
  alvoIntegracao: (chave) => chave === id ? (process.env.RETRO_INTEGRACAO_EXE || '/programa-de-teste.exe') : null,
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
    if (acao === 'listar') return [{ id: 'janela-local', titulo: 'Documento de teste' }];
    if (acao === 'consultar') return { aberta: true };
    if (acao === 'associar') associada = true;
    if (acao === 'soltar') associada = false;
    return { ok: true, associada };
  },
  encerrar() { anotar('encerrar'); },
});
