/* A Ajuda: os tópicos de uso do Retro Computer. */
import { h, img } from '../util.js';
import { Janela, lista as janelas } from '../janelas.js';
import { registrarApp, abrir } from '../sistema.js';

const TOPICOS = [
  {
    id: 'inicio', titulo: 'Bem-vindo', icone: 'logo', html: `
<h2>O que é o Retro Computer</h2>
<p>Um computador de produtividade com o visual dos anos 90: poucas distrações, os programas de trabalho e os seus arquivos à mão.</p>
<p>Ele não é uma máquina virtual: os programas rodam no seu computador de verdade, e o disco C: é uma pasta comum dele. Por isso é leve, abre rápido e nada fica preso lá dentro.</p>
<h2>Primeiros passos</h2>
<p>1. Abra <b>Meus documentos</b> e leia o <b>Leia-me.txt</b>.</p>
<p>2. Instale os programas em <b>Iniciar › Configurações › Adicionar ou remover programas</b>.</p>
<p>3. Para o Claude, use o ícone <b>Claude</b> na área de trabalho.</p>
<p>4. Para trabalhar sem interrupções, use o <b>Foco</b> (Iniciar › Programas › Acessórios).</p>`,
  },
  {
    id: 'arquivos', titulo: 'O disco C: e os arquivos', icone: 'disco', html: `
<h2>Onde ficam os arquivos</h2>
<p>O disco C: é uma pasta do computador principal (veja qual em Painel de controle › Disco C:). Tudo o que você salva fica nela e pode ser aberto também fora do Retro Computer.</p>
<h2>Trazer arquivos</h2>
<p>Arraste arquivos do computador principal para uma janela de pasta ou para a área de trabalho. Eles são copiados para o disco C:. Também dá para usar o menu Arquivo › Trazer do computador principal.</p>
<h2>Levar arquivos</h2>
<p>Botão direito no arquivo › <b>Enviar para</b> › Área de trabalho ou Downloads do computador principal. Ou <b>Mostrar no computador principal</b>, para abrir a pasta lá.</p>
<h2>Nada se perde</h2>
<p><b>Excluir</b> manda para a Lixeira, de onde dá para restaurar. Os itens só somem quando você esvazia a Lixeira.</p>
<p>Cada vez que um arquivo é gravado por cima, a versão anterior fica guardada: botão direito › <b>Versões anteriores</b>.</p>
<h2>Teclas</h2>
<p>Enter abre, F2 renomeia, Delete exclui, Backspace sobe uma pasta, Ctrl+C, Ctrl+X e Ctrl+V copiam, recortam e colam.</p>`,
  },
  {
    id: 'programas', titulo: 'Programas', icone: 'programas-caixa', html: `
<h2>Instalar</h2>
<p>Em <b>Adicionar ou remover programas</b>, escolha o programa e clique em Instalar. Ele vem do lançamento oficial (a versão para navegador) e depois funciona sem internet.</p>
<p>Os programas disponíveis são os <b>Craft</b>: WordCraft (textos .docx), GridCraft (planilhas), DeckCraft (apresentações), PdfCraft (PDF), PhotoCraft (imagens) e outros. São novos e de código aberto: alguns recursos ainda faltam.</p>
<h2>Abrir e salvar</h2>
<p>Os comandos Abrir e Salvar dos programas usam as caixas do Retro Computer, no disco C:. Dois cliques num documento abrem o programa certo; um arquivo que veio do disco é salvo de volta no mesmo lugar.</p>
<h2>Sem internet?</h2>
<p>Baixe o pacote "nome-web-versão.zip" em outro lugar e use <b>Instalar de um arquivo .zip</b>.</p>`,
  },
  {
    id: 'claude', titulo: 'Claude Code', icone: 'claude', html: `
<h2>O que é</h2>
<p>O Claude Code é o assistente da Anthropic que trabalha nos seus arquivos pelo terminal: escreve, revisa, organiza pastas, programa e responde perguntas.</p>
<h2>Como usar</h2>
<p>Clique duas vezes no ícone <b>Claude</b>. Ele abre no Prompt de comando, na pasta Meus documentos. Para outra pasta, use o botão direito nela › <b>Abrir o Claude aqui</b>.</p>
<h2>Instalação e acesso</h2>
<p>Na primeira vez, o Retro Computer oferece instalar o Claude Code com o instalador oficial. Para entrar, use a conta da sua assinatura do Claude (o Claude Code pede) ou guarde uma chave de API em Painel de controle › Claude.</p>
<p>A chave é cifrada pelo cofre de senhas do sistema e só é entregue ao Prompt de comando.</p>`,
  },
  {
    id: 'foco', titulo: 'Foco (Pomodoro)', icone: 'foco', html: `
<h2>Trabalhar em blocos</h2>
<p>O Foco alterna blocos de trabalho (25 minutos) com pausas curtas (5 minutos) e, a cada quatro blocos, uma pausa longa (15 minutos). Os tempos podem ser mudados.</p>
<p>O tempo aparece na bandeja, ao lado do relógio, mesmo com a janela fechada. No fim de cada fase, um som e um aviso.</p>
<p>Dica: marque <b>Minimizar as outras janelas no começo do foco</b> e use a tela cheia (F11).</p>`,
  },
  {
    id: 'painel', titulo: 'Painel de controle', icone: 'painel', html: `
<h2>Configurações</h2>
<p><b>Aparência</b>: a cor e o padrão do fundo, a proteção de tela, a tela cheia e o tamanho dos pixels (para as letras ficarem nítidas em qualquer monitor).</p>
<p><b>Disco C:</b>: a pasta do disco no computador principal, o espaço livre e a troca de pasta.</p>
<p><b>Claude</b>: a instalação do Claude Code e a chave de API.</p>
<p><b>Sons</b>: ligar, desligar e o volume.</p>`,
  },
  {
    id: 'atalhos', titulo: 'Teclas de atalho', icone: 'executar', html: `
<h2>Em qualquer lugar</h2>
<p><b>F11</b>: tela cheia ou janela. <b>Ctrl+Esc</b>: menu Iniciar. <b>Alt+letra</b>: abre o menu da janela.</p>
<h2>Nas pastas</h2>
<p><b>Enter</b> abre, <b>F2</b> renomeia, <b>Delete</b> exclui, <b>Backspace</b> sobe, <b>F5</b> atualiza, <b>Ctrl+A</b> seleciona tudo.</p>
<h2>No Prompt de comando</h2>
<p><b>Ctrl+Shift+C</b> copia e <b>Ctrl+Shift+V</b> cola (no Mac, Cmd+C e Cmd+V). O botão direito também tem Copiar e Colar.</p>`,
  },
  {
    id: 'desligar', titulo: 'Desligar', icone: 'desligar', html: `
<h2>Desligar o computador</h2>
<p><b>Iniciar › Desligar</b> fecha os programas (cada um pergunta se há algo por salvar) e sai do Retro Computer. Os arquivos ficam no disco C:.</p>
<p><b>Reiniciar</b> recarrega a área de trabalho. <b>Sair da tela cheia</b> mostra o Retro Computer numa janela do computador principal.</p>`,
  },
];

function abrirAjuda(args = {}) {
  let j = janelas.find((x) => x.id === 'ajuda');
  if (!j) {
    j = new Janela({ id: 'ajuda', titulo: 'Ajuda do Retro Computer', icone: 'ajuda', largura: 560, altura: 400 });
    const indice = h('div.lista-arquivos.vista-lista', { style: { width: '170px', flex: 'none', flexWrap: 'nowrap', height: 'auto' } });
    const texto = h('div.lista-arquivos.texto-ajuda', { style: { flex: '1', padding: '6px 12px' } });
    j.corpo.style.flexDirection = 'row';
    j.corpo.style.gap = '6px';
    j.corpo.style.padding = '6px';
    j.corpo.append(indice, texto);
    j.mostrar = (id) => {
      const t = TOPICOS.find((x) => x.id === id) || TOPICOS[0];
      indice.replaceChildren(...TOPICOS.map((x) => {
        const el = h('div.item' + (x.id === t.id ? '.sel' : ''), h('div.icone', img(x.icone, 16)), h('div.rotulo', x.titulo));
        el.addEventListener('mousedown', () => j.mostrar(x.id));
        return el;
      }));
      texto.innerHTML = t.html;
      texto.scrollTop = 0;
    };
  }
  j.focar();
  j.mostrar(args.topico || 'inicio');
  return j;
}

registrarApp('ajuda', { nome: 'Ajuda', icone: 'ajuda', abrir: abrirAjuda });
export { abrir };
