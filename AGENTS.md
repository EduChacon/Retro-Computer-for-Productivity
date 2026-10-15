# Guia para agentes de IA — Retro Computer

Leia antes de mexer no código. Complementa o [README](README.md), o [docs/uso.md](docs/uso.md) (o uso no dia a dia) e o [docs/proposta.md](docs/proposta.md) (a arquitetura e as decisões).

## O que é

Um computador retrô para produtividade: um aplicativo Electron (Windows, macOS e Linux) com a área de trabalho no estilo do PC dos anos 90, o disco C: numa pasta comum do computador principal, os programas Craft instalados da versão oficial para navegador e o Claude Code no Prompt de comando.

- **Dono:** EduChacon (repositório `EduChacon/Retro-Computer-for-Productivity`), código aberto, licença MIT.
- **Idioma:** tudo em português do Brasil, com acentos, inclusive os comentários do código, os nomes, os commits e as mensagens.

## Regras que não se negociam

1. **Nada da Microsoft nem da Apple.** Nenhum ícone, fonte, som, logotipo ou papel de parede deles, nem "só por enquanto". Os ícones vêm do SerenityOS (BSD-2-Clause) ou são desenhos próprios (`ferramentas/icones.py`); as fontes vêm do SerenityOS (`ferramentas/fontes.sh`); os sons são sintetizados (`src/sistema/js/sons.js`). Todo recurso novo de terceiros entra em [ATRIBUICOES.md](ATRIBUICOES.md) no mesmo commit.
2. **Os Craft não entram no repositório nem no instalador.** Eles são baixados do lançamento oficial na hora da instalação (`src/principal/programas.js`), sem modificação.
3. **Nada se perde.** O disco nunca apaga sem pedido do usuário: excluir vai para a Lixeira, gravar por cima guarda a versão anterior. Um caminho do disco nunca sai da pasta dele (`Disco.real`).
4. **Não apague arquivos do repositório.** O que precisar sair vai para `_to_delete/` (ignorado pelo Git), e a exclusão fica a critério do dono.
5. **A chave de API não aparece** na área de trabalho, no disco, nos registros nem nos commits; ela só vai para o terminal (`ANTHROPIC_API_KEY`).
6. **Antes de recurso novo grande, pergunte.** "Tem como…?" às vezes é só uma pergunta.

## Estrutura

```
src/principal/         o processo principal (Node)
  main.js              a janela, os protocolos sistema:// e programa://, a ponte (ipc)
  preload.js           window.retro: o que a área de trabalho pode pedir
  disco.js             o disco C: (caminhos, lixeira, versões, importar, exportar, buscar)
  programas.js         o catálogo, instalar (GitHub ou .zip), servir os programas
  terminal.js          o Prompt de comando (node-pty) e achar o "claude"
  config.js            as configurações (config.json) e a chave cifrada
src/adaptador/adaptador.js   entra em cada programa: Abrir/Salvar → caixas do disco
src/sistema/           a área de trabalho (página servida em sistema://retro/)
  index.html, estilo.css, fontes/, icones/{16,32}/
  js/util.js           h() para criar elementos, caminhos, tipos de arquivo
  js/janelas.js        o gerenciador de janelas
  js/menus.js          menus suspensos e barra de menus
  js/dialogos.js       mensagem, confirmar, entrada, Abrir, Salvar como, Propriedades
  js/vista.js          a vista de ícones (seleção, laço, teclado, arrastar e soltar)
  js/arquivos.js       operações com arquivos e o menu do botão direito
  js/mesa.js           a área de trabalho; js/barra.js a barra de tarefas e o Iniciar
  js/sistema.js        o estado, os programas, abrir arquivos, recentes, avisos
  js/aparencia.js      fundo (cor e padrão 8×8) e o tamanho dos pixels
  js/sons.js           os sons sintetizados
  js/inicio.js         a abertura (BIOS, marca) e a montagem
  js/apps/             explorador, bloco, craft, prompt (e Claude), programas, painel,
                       diversos (Executar, Localizar, Desligar), foco, protecao, ajuda
catalogo/programas.json      os programas conhecidos (id, repo, tipos de arquivo, ícone)
ferramentas/           icones.py, fontes.sh, fonte-serenity.py
testes/                disco.test.js (npm test) e capturas.mjs (Playwright + Electron)
docs/                  uso.md, proposta.md, img/
.github/workflows/compilar.yml   testes e instaladores dos três sistemas
```

## Rodar, testar e compilar

```
npm install                 # instala e compila o node-pty para o Electron
npm start                   # abre o Retro Computer
npm test                    # testes do disco (node:test)
xvfb-run -a node testes/capturas.mjs SAIDA geral    # capturas (Linux sem tela)
npx electron-builder --linux dir --publish never     # empacotar sem instalar
```

Variáveis úteis: `RETRO_DADOS` (pasta das configurações), `RETRO_DISCO` (pasta do disco C:), `RETRO_JANELA=1` (sem tela cheia), `RETRO_RAPIDO=1` (sem a abertura), `RETRO_ZIP` (no roteiro de capturas: instala pacotes `.zip` antes), `RETRO_EXECUTAVEL` (testa o aplicativo empacotado). Como administrador (root), o Electron precisa de `--no-sandbox` (o roteiro de capturas já passa).

Roteiros de capturas: `geral` (as telas principais), `craft` (o WordCraft: abrir, salvar, salvar de novo, abrir; precisa de `RETRO_ZIP`), `claude` (o Claude Code no Prompt), `mais` (detalhes, Lixeira, Executar, Localizar, Foco, Ajuda), `lixo` (o ícone da Lixeira), `boot` (com `RETRO_BOOT=1`).

Ao criar um recurso, acrescente um teste em `testes/` quando a regra for do processo principal e um roteiro (ou um passo) em `testes/capturas.mjs` quando for da tela. Olhe as capturas antes de dar por pronto.

## Como editar

- Prefira a ferramenta de edição ou scripts de troca de texto que conferem se acharam o trecho. Não use `t.replace(a, b)` com texto em JavaScript (os padrões `$&` e `$'` corrompem o arquivo); use a função.
- Comentários curtos em português, explicando o porquê.
- A área de trabalho não tem empacotador: são módulos ES carregados direto (`src/sistema/js`). O processo principal é CommonJS.
- Um programa novo da área de trabalho é um módulo em `js/apps/` que chama `registrarApp(id, { nome, icone, abrir })` e é importado em `js/inicio.js`.
- Um tipo de arquivo novo: `TIPOS` em `js/util.js` (ícone e descrição) e, se um programa o abre, `tipos` no `catalogo/programas.json`.
- Ícones: rode `python3 -I ferramentas/icones.py PASTA_DO_SERENITY` (com a raiz de um clone do SerenityOS); os desenhos próprios ficam no próprio roteiro, ponto a ponto.

## O que o dono gosta

- Visual fiel à época, bem acabado e coerente; capturas do que foi feito.
- Foco no trabalho: poucas distrações, tudo à mão.
- Nada perdido e arquivos sempre acessíveis fora do programa.
