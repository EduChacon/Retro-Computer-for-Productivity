/* Acesso ao Dot da conta do ChatGPT, com a conexão local pelo aplicativo oficial. */
import { h, img } from '../util.js';
import { Janela } from '../janelas.js';
import { registrarApp } from '../sistema.js';
import { erro, info } from '../dialogos.js';
import { tr } from '../idioma.js';

const ENDERECO = 'https://chatgpt.com/dots';
const AJUDA = 'https://learn.chatgpt.com/docs/dots/computers-and-apps';
let atual = null;

function abrirDot() {
  if (atual && !atual.fechada) { atual.focar(); return atual; }
  const j = new Janela({ titulo: 'Dot', icone: 'internet', largura: 500, altura: 360, classe: 'dot' });
  atual = j;
  j.corpo.style.padding = '12px';
  const abrir = (url) => retro.sistema.abrirLink(url).catch((e) => erro(e.message, 'Dot'));
  const chatgpt = async () => {
    try {
      const lista = await retro.nativos.listar(false);
      const app = lista.find((p) => /^chatgpt(?:\s+desktop)?$/i.test(p.nome || ''));
      if (app) await retro.nativos.abrir(app.id);
      else await info(tr('Instale o aplicativo oficial do ChatGPT em chatgpt.com/download. Depois, abra o perfil do Dot › Computadores › Seu computador › Permitir acesso.'), 'Dot');
    } catch (e) { erro(e.message, 'Dot'); }
  };
  j.corpo.append(
    h('div.mensagem', img('internet', 32), h('div.texto.texto-ajuda',
      h('b', tr('Seu Dot da OpenAI')),
      h('p', tr('Converse com o Dot da sua conta pelo acesso oficial do ChatGPT. O login é feito no navegador; a disponibilidade depende da sua conta e região.')),
      h('p', tr('Para o Dot trabalhar neste computador: abra o aplicativo oficial do ChatGPT, entre na sua conta e acesse o perfil do Dot › Computadores › Seu computador › Permitir acesso. Mantenha o aplicativo aberto enquanto ele trabalha.')),
      h('p', tr('Abrir a conversa não conecta o computador. A autorização local é controlada pelo ChatGPT e é separada da conexão do Codex.')),
    )),
    h('div.acoes',
      h('button.padrao', { on: { click: () => abrir(ENDERECO) } }, tr('Abrir meu Dot')),
      h('button', { on: { click: chatgpt } }, tr('Abrir o aplicativo ChatGPT')),
    ),
    h('div.acoes',
      h('button', { on: { click: () => retro.disco.mostrar('').catch((e) => erro(e.message, 'Dot')) } }, tr('Mostrar a pasta do disco C:')),
      h('button', { on: { click: () => abrir(AJUDA) } }, tr('Ajuda oficial')),
    ),
  );
  return j;
}

registrarApp('dot', { nome: 'Dot', icone: 'internet', abrir: abrirDot });
