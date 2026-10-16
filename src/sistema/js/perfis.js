/*
 * Os vários perfis (usuários): a tela de entrada ao ligar (quando há mais de um usuário, ou
 * depois do logoff), o nome de quem está usando e a lista que o Painel › Usuários mostra. Cada
 * perfil tem as configurações e o disco C: próprios; quem confere a senha e abre o Retro Computer
 * de novo com outro usuário é o processo principal (src/principal/perfis.js).
 */
import { h, img, rotulo } from './util.js';
import { tr } from './idioma.js';
import { tocar } from './sons.js';
import { abrir } from './sistema.js';

let info = { atual: 'principal', lista: [{ id: 'principal', nome: '', atual: true, temSenha: false }], perguntar: true, logon: false, entrou: false };

export const perfisInfo = () => info;
export const variosPerfis = () => info.lista.length > 1;
/** O nome para mostrar (o principal sem nome é "Principal"). */
export const nomeDoPerfil = (p) => (p && p.nome) || tr('Principal');
export const perfilAtual = () => info.lista.find((p) => p.atual) || info.lista[0];

export async function carregarPerfis() {
  info = await retro.perfis.estado().catch(() => info);
  return info;
}

/** Depois de criar, renomear ou tirar um usuário (o processo principal devolve a lista nova). */
export function atualizarPerfis(novo) {
  if (novo) info = novo;
  document.dispatchEvent(new CustomEvent('retro-perfis'));
}

/**
 * A tela de entrada: a lista dos usuários e a senha do escolhido. Com o usuário deste perfil, a
 * promessa se resolve e a área de trabalho aparece; com outro, o Retro Computer abre de novo já
 * nele (a promessa não se resolve).
 */
export function telaDeEntrada() {
  return new Promise((resolve) => {
    let sel = Math.max(0, info.lista.findIndex((p) => p.atual));
    const lista = h('div.campo.ent-lista', { tabIndex: 0, role: 'listbox', 'aria-label': tr('Nome do usuário:') });
    const campo = h('input', { type: 'password', autocomplete: 'off', spellcheck: false, 'aria-label': tr('Senha:') });
    const linhaSenha = h('div.bloq-linha.ent-senha', h('span', tr('Senha:')), campo);
    const aviso = h('div.bloq-aviso');
    const ok = h('button.padrao', { type: 'button' }, tr('OK'));
    const desligar = h('button', { type: 'button' }, rotulo(tr('&Desligar…')));
    const caixa = h('div.ent-caixa',
      h('div.titulo', h('span.texto', tr('Entrar no Retro Computer'))),
      h('div.ent-faixa', img('logo', 32), h('div', h('b', 'Retro Computer'), h('span', tr('para produtividade')))),
      h('div.ent-corpo',
        h('div.ent-texto', tr('Escolha o seu nome de usuário. Se ele tiver senha, digite-a e clique em OK.')),
        lista, linhaSenha, aviso,
        h('div.acoes.direita', ok, desligar)));
    const tela = h('div#entrada', caixa);
    document.getElementById('tela').append(tela);

    const escolhido = () => info.lista[sel];
    const desenhar = () => {
      lista.replaceChildren(...info.lista.map((p, i) => {
        const linha = h('div.ent-usuario' + (i === sel ? '.sel' : ''), { role: 'option', 'aria-selected': String(i === sel) },
          img('usuario', 32), h('span', nomeDoPerfil(p)), p.temSenha ? img('cadeado', 16) : null);
        linha.addEventListener('mousedown', () => { escolher(i); });
        linha.addEventListener('dblclick', () => entrar());
        return linha;
      }));
      const p = escolhido();
      campo.disabled = !p.temSenha;
      linhaSenha.classList.toggle('apagada', !p.temSenha);
      const linhaSel = lista.children[sel];
      if (linhaSel) linhaSel.scrollIntoView({ block: 'nearest' });
    };
    const escolher = (i) => {
      if (i < 0 || i >= info.lista.length) return;
      if (i !== sel) { campo.value = ''; aviso.textContent = ''; }
      sel = i;
      desenhar();
      setTimeout(() => (escolhido().temSenha ? campo : lista).focus(), 0);
    };

    let conferindo = false;
    const entrar = async () => {
      if (conferindo) return;
      const p = escolhido();
      conferindo = true;
      ok.disabled = desligar.disabled = true;
      aviso.textContent = p.temSenha ? tr('Conferindo…') : '';
      const r = await retro.perfis.entrar(p.id, campo.value).catch(() => ({ ok: false }));
      conferindo = false;
      ok.disabled = desligar.disabled = false;
      if (r.ok && r.reabrindo) {
        // O Retro Computer abre de novo, já com o outro usuário.
        caixa.replaceChildren(h('div.ent-aguarde', img('usuario', 32), h('div', tr('Entrando como {nome}…', { nome: nomeDoPerfil(p) }))));
        return;
      }
      if (r.ok) {
        window.removeEventListener('keydown', teclas, true);
        tela.remove();
        info = { ...info, logon: false, entrou: true };
        resolve(p);
        return;
      }
      tocar('erro');
      aviso.textContent = r.senhaErrada ? tr('A senha não está certa. Tente de novo.') : tr('Não foi possível entrar.');
      campo.value = '';
      (p.temSenha ? campo : lista).focus();
    };
    ok.addEventListener('click', entrar);
    desligar.addEventListener('click', () => abrir('desligar', { entrada: true }));
    // As setas escolhem o usuário; o Enter entra (como na caixa da época).
    const teclas = (e) => {
      if (!tela.isConnected || document.querySelector('#camada-modal .janela')) return;
      if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); entrar(); return; }
      // As setas trocam de usuário também com o foco no campo da senha.
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        escolher(sel + (e.key === 'ArrowDown' ? 1 : -1));
      }
    };
    window.addEventListener('keydown', teclas, true);
    desenhar();
    setTimeout(() => (escolhido().temSenha ? campo : lista).focus(), 0);
  });
}
