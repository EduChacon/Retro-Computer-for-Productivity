'use strict';
/* Descobre somente os programas publicados na lista oficial dos Craft. Não instala nada. */
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const BASE = require('../../catalogo/programas.json').programas;
const FONTE = 'https://raw.githubusercontent.com/storytold/wordcraft/main/README.md';
const INTERVALO = 6 * 3600 * 1000;
const ID = /^[a-z0-9-]{2,40}$/;
const REPO = /^(?:storytold\/[a-z0-9-]{2,40}|tangency-labs\/solidcraft)$/;

/** Só lê a tabela oficial. Não segue endereços, imagens, HTML nem instruções do documento. */
function lerLista(texto) {
  const secao = String(texto).split(/^## The Crafting Apps\s*$/m)[1]?.split(/^## /m)[0] || '';
  const lista = new Map();
  for (const linha of secao.split('\n').slice(0, 150)) {
    const nome = /\|\s*\*\*([^*\n]{2,80})\*\*\s*\|/.exec(linha)?.[1];
    const repo = /\[GitHub\]\(https:\/\/github\.com\/([^\s)]+)\)/.exec(linha)?.[1];
    if (!nome || !REPO.test(repo || '')) continue;
    const id = repo.split('/')[1]; if (!ID.test(id)) continue;
    lista.set(id, { id, nome: nome.trim(), repo });
  }
  return [...lista.values()].slice(0, 60);
}
function entrada(p) {
  if (!p || !ID.test(p.id) || !REPO.test(p.repo) || p.repo.split('/')[1] !== p.id || typeof p.nome !== 'string' || p.nome.length > 80 || !/^\d+\.\d+\.\d+(?:[.-][\w.-]+)?$/.test(p.versaoConhecida || '')) return null;
  return { id: p.id, nome: p.nome, repo: p.repo, versaoConhecida: p.versaoConhecida, icone: 'craft-auto-' + p.id, tipos: [],
    categoria: { 'pt-BR': 'Novos Craft', en: 'New Craft apps', es: 'Nuevos Craft' },
    descricao: { 'pt-BR': 'Programa da lista oficial dos Craft, com versão para navegador.', en: 'An app from the official Craft list, with a browser release.', es: 'Programa de la lista oficial de Craft, con versión para navegador.' } };
}

class CatalogoCraft {
  constructor(pasta, buscar, { agora = Date.now } = {}) {
    this.arquivo = path.join(pasta, 'catalogo-remoto.json'); this.buscar = buscar; this.agora = agora; this.extras = []; this.verificadoEm = 0; this.tentadoEm = 0;
    try {
      const c = JSON.parse(fs.readFileSync(this.arquivo, 'utf8'));
      this.extras = (Array.isArray(c.programas) ? c.programas : []).slice(0, 60).map(entrada).filter(Boolean);
      if (Number.isFinite(c.verificadoEm) && c.verificadoEm <= agora()) this.verificadoEm = c.verificadoEm;
    } catch { }
  }
  lista() { return [...BASE, ...this.extras.filter((p) => !BASE.some((b) => b.id === p.id))].map((p) => p.icone === 'programa' ? { ...p, icone: 'craft-auto-' + p.id } : p); }
  async atualizar({ forcar = false } = {}) {
    if (this.pendente) return this.pendente;
    if (!forcar && this.agora() - Math.max(this.verificadoEm, this.tentadoEm) < INTERVALO) return { atualizado: false };
    this.pendente = this.buscarNovos().finally(() => { this.pendente = null; });
    return this.pendente;
  }
  async buscarNovos() {
    this.tentadoEm = this.agora();
    try {
      const r = await this.buscar(FONTE, { signal: AbortSignal.timeout(8000), redirect: 'error' });
      if (!r.ok) throw new Error('fonte');
      const texto = await r.text(); if (texto.length > 500000) throw new Error('tamanho');
      const lista = lerLista(texto); if (!lista.length) throw new Error('formato');
      const existentes = new Map(this.extras.map((p) => [p.id, p])), antes = existentes.size;
      // A descoberta acrescenta; uma falha, remoção da lista ou limite da API não apaga os conhecidos.
      const novos = lista.filter((p) => !BASE.some((b) => b.id === p.id) && !existentes.has(p.id));
      for (let i = 0; i < novos.length; i += 3) await Promise.all(novos.slice(i, i + 3).map(async (p) => {
        try {
          const r = await this.buscar(`https://api.github.com/repos/${p.repo}/releases/latest`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'RetroComputer' }, signal: AbortSignal.timeout(5000), redirect: 'error' });
          if (!r.ok) return;
          const j = await r.json(); if (j.draft || j.prerelease) return;
          const versao = String(j.tag_name || '').replace(/^v/, '');
          const ativo = (j.assets || []).find((a) => a.name === `${p.id}-web-${versao}.zip` && a.browser_download_url === `https://github.com/${p.repo}/releases/download/${j.tag_name}/${a.name}`);
          const e = ativo && entrada({ ...p, versaoConhecida: versao }); if (e) existentes.set(e.id, e);
        } catch { }
      }));
      const programas = [...existentes.values()].slice(0, 60), verificadoEm = this.agora();
      await fsp.mkdir(path.dirname(this.arquivo), { recursive: true });
      await fsp.writeFile(this.arquivo + '.tmp', JSON.stringify({ verificadoEm, programas }));
      await fsp.rename(this.arquivo + '.tmp', this.arquivo);
      this.extras = programas; this.verificadoEm = verificadoEm;
      return { atualizado: true, novos: programas.length - antes };
    } catch { return { atualizado: false, offline: true }; }
  }
}
module.exports = { CatalogoCraft, lerLista, entrada };
