# Guia para agentes de IA — Retro Computer

Leia antes de mexer no código. Complementa o [README](README.md), o [docs/uso.md](docs/uso.md) (o uso no dia a dia) e o [docs/proposta.md](docs/proposta.md) (a arquitetura e as decisões).

## O que é

Um computador retrô para produtividade: um aplicativo Electron (Windows, macOS e Linux) com a área de trabalho no estilo do PC dos anos 90, o disco C: numa pasta comum do computador principal, os programas Craft instalados da versão oficial para navegador e o Claude Code no Prompt de comando. No Linux, ele também é o sistema do computador (o "modo sistema": a sessão "Retro Computer" da tela de entrada, com `RETRO_SISTEMA=1`), pensado para um notebook antigo ou um mini PC.

- **Dono:** EduChacon (repositório `EduChacon/Retro-Computer-for-Productivity`), código aberto, licença MIT.
- **Idioma:** o código, os comentários, os nomes, os commits e a documentação em português do Brasil, com acentos. A interface fala português, inglês e espanhol (veja "Idiomas"). A página do GitHub é em inglês (`README.md`, com `README.pt-BR.md` e `README.es.md`), assim como as notas dos lançamentos (`docs/lancamentos/`).

## Regras que não se negociam

1. **Nada da Microsoft nem da Apple.** Nenhum ícone, fonte, som, logotipo ou papel de parede deles, nem "só por enquanto". Os ícones vêm do SerenityOS (BSD-2-Clause) ou são desenhos próprios (`ferramentas/icones.py`); as fontes vêm do SerenityOS (`ferramentas/fontes.sh`); os sons são sintetizados (`src/sistema/js/sons.js`). Todo recurso novo de terceiros entra em [ATRIBUICOES.md](ATRIBUICOES.md) no mesmo commit.
2. **Os Craft não entram no repositório nem no instalador.** Eles são baixados do lançamento oficial na hora da instalação (`src/principal/programas.js`), sem modificação.
3. **Nada se perde.** O disco nunca apaga sem pedido do usuário: excluir vai para a Lixeira, gravar por cima guarda a versão anterior. Um caminho do disco nunca sai da pasta dele (`Disco.real`).
4. **Não apague arquivos do repositório.** O que precisar sair vai para `_to_delete/` (ignorado pelo Git), e a exclusão fica a critério do dono.
5. **A chave de API não aparece** na área de trabalho, no disco, nos registros nem nos commits; ela só vai para o terminal (`ANTHROPIC_API_KEY`).
6. **Antes de recurso novo grande, pergunte.** "Tem como…?" às vezes é só uma pergunta.
7. **Todo texto da interface passa por `tr()`**, com a tradução em `src/sistema/idiomas/en.json` e `es.json`. O `npm test` falha se faltar uma.
8. **Uma atualização nunca volta atrás nem perde nada**: só instala versão maior que a instalada (`instalar(…, { atualizar: true })`) e não troca o que veio de um `.zip`.

## Estrutura

```
src/principal/         o processo principal (Node)
  main.js              a janela, os protocolos sistema:// e programa://, a ponte (ipc)
  preload.js           window.retro: o que a área de trabalho pode pedir
  disco.js             o disco C: (caminhos, lixeira, versões, importar, exportar, buscar)
  programas.js         o catálogo, instalar (GitHub ou .zip), servir os programas
  terminal.js          o Prompt de comando (node-pty) e achar o "claude"
  config.js            as configurações (config.json) e a chave cifrada
  idioma.js            tr() do processo principal, os nomes das pastas em cada idioma
  servir.js            sistema://retro/disco/ (em trechos, para o vídeo) e /miniatura/ (cache)
  compactados.js       .zip (yauzl, yazl) e .tar: ver, extrair sem gravar por cima, compactar
  unidades.js          pendrives e cartões (lsblk/udisksctl, Win32_LogicalDisk, /Volumes)
  aplicativos.js       os programas do computador principal (.desktop, menu Iniciar, Aplicativos)
  loja.js              os programas do Linux pelo Flathub (flatpak --user)
  lojas.js             a mesma loja no Windows (o winget, só a fonte oficial) e no Mac (os casks do Homebrew)
  atualizador.js       a atualização do próprio Retro Computer (electron-updater)
  bandeja.js           o volume, o brilho e o Wi-Fi (wpctl/pactl/amixer, nmcli, PowerShell)
  bloqueio.js          a senha da tela de bloqueio (só o resumo PBKDF2)
  monitor.js           o processador, a memória e os processos (ps ou PowerShell)
  impressoras.js       as impressoras, a padrão, a fila (lpoptions/lpstat/cancel) e imprimir
  bluetooth.js         o bluetoothctl: ligar, procurar, parear (a conversa), conectar
  sistema-linux.js     o modo sistema: energia (systemctl), sessão, teclado, sudo (comoAdmin)
  atualizacoes-linux.js  apt e flatpak; as atualizações de segurança automáticas
  janelas-linux.js     as janelas dos programas do Linux (wmctrl, xprop -spy, xdotool)
  atalhos.js           os atalhos do Windows: de uma tecla para a ação (Alt+Tab, Alt+F4, o logotipo)
  tela.js              a resolução e a luz noturna do modo sistema (xrandr)
  mouse.js             o mouse e o touchpad do modo sistema (xinput e libinput)
  diario.js            o Diário de trabalho: um .txt por dia, só acrescentando linhas
  copia.js             a cópia de segurança do disco C: (só acrescenta e atualiza)
  firefox.js           o Firefox do computador como navegador padrão (perfil próprio, user.js e userChrome.css)
  visualizar.js        o que o painel de visualização lê: o Word (mammoth), as planilhas e o .odt
  som.js               a saída de som e o microfone preferidos (pactl)
  energia.js           as opções de energia do modo sistema (xset, o tempo parado, a tampa pelo logind)
  datahora.js          a data, a hora e o fuso do modo sistema (timedatectl)
  acessibilidade.js    as teclas de aderência e as do mouse do modo sistema (xkbset)
  portatil.js          o modo portátil: a pasta "Retro Computer (dados)" ao lado do programa
  perfis.js            os vários usuários: o registro, a pasta de dados e o disco C: de cada um, a troca e o logoff
  antivirus.js         o antivírus sob demanda (o clamscan no Linux, o MpCmdRun no Windows); nada é apagado
  wine.js              os programas do Windows no Linux (o WINE do sistema ou o do Flathub) e os atalhos deles
  dos.js               o DOS: a unidade C: (a pasta C:\DOS) vai para o emulador e volta; serve dos://emulador
  mcp.js               o Claude ajusta o Retro Computer: as ferramentas, o que pode mudar, o soquete com código
  mcp-retro.js         o servidor MCP que o Claude Code roda (o Electron como Node), sem dependências
  transferencia.js     o histórico da área de transferência (só na memória)
  firewall.js          o firewall do Linux (ufw)
  https.js             só conexões seguras no Navegador (http:// vira https://)
  teclado.js           os acentos no Linux como no Windows (a tabela do EUA internacional pelo XIM; o "cedilla" do GTK nos outros layouts)
  executaveis.js       os arquivos que rodam como programa (recusados nos downloads dos Craft; com aviso ao abrir lá fora)
  navegador-preload.js entra nas páginas do Navegador (atalhos e botões laterais do mouse)
src/adaptador/adaptador.js   entra em cada programa: Abrir/Salvar → caixas do disco
src/dos/               a página do emulador do DOS (o js-dos), servida em dos://emulador: num quadro isolado,
                       sem a ponte e sem internet, com o eval só ali (a área de trabalho não o permite)
src/sistema/           a área de trabalho (página servida em sistema://retro/)
  index.html, estilo.css, fontes/, icones/{16,32}/
  idiomas/en.json, es.json   as traduções (a chave é o texto em português)
  js/idioma.js         tr(), marcar(), carregarIdioma(), localidade()
  js/util.js           h() para criar elementos, caminhos, tipos de arquivo
  js/janelas.js        o gerenciador de janelas (e os cantos magnéticos)
  js/atalhos.js        o Alt+Tab e as ações da tecla do logotipo
  js/luz-noturna.js    a luz noturna (o xrandr no modo sistema; fora dele, um filtro)
  js/conta.js          as contas da caixa de busca (um leitor próprio, sem eval)
  js/menus.js          menus suspensos e barra de menus
  js/dialogos.js       mensagem, confirmar, entrada, Abrir, Salvar como, Propriedades
  js/vista.js          a vista de ícones (seleção, laço, teclado, arrastar e soltar)
  js/arquivos.js       operações com arquivos e o menu do botão direito
  js/mesa.js           a área de trabalho; js/barra.js a barra de tarefas e o Iniciar
  js/barra-extras.js   o calendário do relógio e a caixa de busca
  js/bandeja.js        a bandeja (rede, volume, bateria, brilho, notificações, teclas)
  js/sistema.js        o estado, os programas, abrir arquivos, recentes, avisos
  js/aparencia.js      fundo (cor e padrão 8×8) e o tamanho dos pixels
  js/sons.js           os sons sintetizados
  js/inicio.js         a abertura (BIOS, marca) e a montagem
  js/controles.js      o controle deslizante
  js/arvore.js         a barra de pastas do Explorador
  js/visualizar.js     o painel de visualização do Explorador (o PDF pelo pdf.js, em vendor/pdfjs/)
  js/acesso.js         as pastas fixadas do Acesso rápido
  js/acessibilidade.js o alto contraste, o cursor grande, os avisos visuais dos sons e a lupa
  js/formatar.js       a caixa de formatar o pendrive (Linux; no Windows e no Mac, o caminho do sistema)
  js/wine.js           abrir um .exe ou um .msi pelo WINE (e oferecer instalá-lo)
  js/perfis.js         a tela de entrada (os usuários e a senha) e o usuário em uso
  js/mcp.js            o lado da tela do servidor MCP (os programas, os atalhos, os avisos, as configurações na hora)
  js/jogos/            as Damas e o Xadrez: as regras sem a tela (damas.js, xadrez.js, testadas no Node),
                       o computador num Worker (pensar.js, computador.js), o tabuleiro, as peças e a janela comum
  js/compactados.js, unidades.js, webapps.js, impressao.js, bluetooth.js, bloqueio.js,
  janelas-nativas.js, nativos.js, atualizacao.js, admin.js   o lado da tela de cada recurso
  js/apps/             explorador, bloco, craft, prompt (e Claude), programas, loja, painel,
                       navegador, calculadora, imagens, midia, captura, monitor, atualizacoes,
                       nativos, paciencia, campominado, breakout, damas, xadrez, dos, transferencia, caracteres, diario, antivirus,
                       diversos (Executar, Localizar, Desligar), foco, protecao, ajuda
catalogo/programas.json      os programas conhecidos (id, repo, tipos de arquivo, ícone; a categoria e a descrição nos três idiomas)
recursos/linux/        a sessão do modo sistema (sessao.sh, o tema do Openbox, o .desktop) e os scripts do .deb
ferramentas/           icones.py, fontes.sh, fonte-serenity.py, textos.js (as traduções que faltam)
testes/                *.test.js (npm test: o disco, os idiomas, as atualizações e a leitura das saídas
                       de cada ferramenta do sistema) e capturas.mjs (Playwright + Electron)
docs/                  uso.md, proposta.md, instalacao.md (o guia de cada computador), pesquisa-distribuicoes.md,
                       img/ (img/en e img/es para os READMEs), lancamentos/ (notas, em inglês)
.github/workflows/compilar.yml   testes e instaladores (Windows, macOS, Linux PC e ARM64) a cada push
.github/workflows/publicar.yml   na main, com versão nova no package.json: compila e cria o lançamento vX.Y.Z
```

## Rodar, testar e compilar

```
npm install                 # instala e compila o node-pty para o Electron
npm start                   # abre o Retro Computer
npm test                    # os testes (node:test)
node ferramentas/textos.js  # as traduções que faltam ou sobram
xvfb-run -a node testes/capturas.mjs SAIDA geral    # capturas (Linux sem tela)
npx electron-builder --linux dir --publish never     # empacotar sem instalar
```

Variáveis úteis: `RETRO_DADOS` (pasta das configurações), `RETRO_DISCO` (pasta do disco C:), `RETRO_JANELA=1` (sem tela cheia), `RETRO_RAPIDO=1` (sem a abertura), `RETRO_IDIOMA=en` ou `es` (o idioma, por cima da configuração), `RETRO_SISTEMA=1` (o modo sistema), `RETRO_ZIP` (no roteiro de capturas: instala pacotes `.zip` antes), `RETRO_FALSA_VERSAO=9.9.9` (no roteiro de capturas: finge que a busca achou essa versão), `RETRO_SEM_BOAS_VINDAS=1` (sem a Ajuda e o balão da primeira vez), `RETRO_EXECUTAVEL` (testa o aplicativo empacotado), `RETRO_SEM_RELANCAR=1` (a troca de usuário, o logoff e a troca de idioma só fecham o aplicativo, com o código 75, sem abri-lo de novo: o roteiro `perfis` o abre).

As ferramentas do sistema têm versões de mentira, para os testes e as capturas sem o aparelho: `RETRO_ENERGIA_FALSA=1` (desligar, reiniciar e suspender só são anotados, assim como o `xset` e a tampa das Opções de energia, cuja senha de teste é "certa": use-a sempre com `RETRO_SISTEMA=1` fora de um computador dedicado), `RETRO_DATAHORA_FALSA=1` (o `timedatectl`; a senha de teste é "certa"), `RETRO_ACESSIBILIDADE_FALSA=1` (o `xkbset`), `RETRO_ANTIVIRUS_FALSO=1` (um verificador que acha o arquivo de teste EICAR), `RETRO_WINE_FALSO=1` (o WINE só anota o que abriria), `RETRO_BANDEJA_FALSA=1` (volume, brilho, bateria e Wi-Fi), `RETRO_LOJA_FALSA=1` (o Flathub de verdade, o flatpak de mentira; com `winget`, a loja do Windows, com os manifestos de verdade e o winget de mentira; com `brew`, a do Mac, com a lista do Homebrew de verdade e o brew de mentira), `RETRO_UNIDADES_FALSAS=<pasta>` (um pendrive), `RETRO_COMPUTADOR_FALSO=<pasta>` (as pastas do computador principal: `desktop`, `documents`, `downloads`… dentro dela), `RETRO_IMPRESSORAS_FALSAS=1`, `RETRO_BLUETOOTH_FALSO=1`, `RETRO_ATUALIZACOES_FALSAS=1` (a senha de teste é "certa"), `RETRO_JANELAS_FALSAS=1` (dois programas do Linux abertos), `RETRO_TELA_FALSA=1` (a resolução de um notebook de 1440 × 900; com `2`, também um monitor pela HDMI, para as várias telas), `RETRO_MOUSE_FALSO=1` (um mouse sem fio e o touchpad de um notebook), `RETRO_SOM_FALSO=1` (três saídas de som e dois microfones), `RETRO_FIREFOX=<caminho>` (um Firefox de outro lugar, como o baixado do site, para os testes), `RETRO_CLAUDE_FALSO=<script>` (um "claude" de mentira), `RETRO_FIREWALL_FALSO=1` (a senha de teste é "certa") e `RETRO_MIDIA_FALSA=1` (a câmera e o microfone do Chromium). Como administrador (root), o Electron precisa de `--no-sandbox` (o roteiro de capturas já passa).

Roteiros de capturas (todos aceitam `RETRO_IDIOMA`):

- as telas: `geral`, `mais` (detalhes, Lixeira, Executar, Localizar, Foco, Ajuda), `ajuda` (os tópicos da Ajuda), `idioma` (a troca de idioma e o Sobre), `lixo` (o ícone da Lixeira), `boot` (com `RETRO_BOOT=1`), `pastas` (as pastas especiais com os próprios ícones: o C: e Meus documentos), `vitrine` (o Xadrez no meio de uma partida, para os READMEs; a tela de entrada dos READMEs sai do roteiro `perfis`);
- os programas: `craft` (o WordCraft: abrir, salvar, salvar de novo, abrir; precisa de `RETRO_ZIP`), `atualizar` (a atualização ao abrir; precisa de `RETRO_ZIP` e `RETRO_FALSA_VERSAO`), `autoatualizar` (a do próprio aplicativo, com `RETRO_EXECUTAVEL`), `nativos`, `loja` (com `RETRO_LOJA_FALSA=1`, `winget` ou `brew`), `claude`;
- a internet: `navegador`, `permissoes` (com `RETRO_MIDIA_FALSA=1`), `webapps`;
- as ferramentas: `calculadora`, `jogos`, `dos` (um .COM feito na hora aberto com dois cliques, os comandos e o arquivo de volta ao disco; com `RETRO_DOOM` apontando para o .zip do Doom shareware, que nunca entra no repositório, o jogo de verdade), `tabuleiro` (as Damas e o Xadrez: a tomada obrigatória, a resposta do computador, as regras inglesas, a promoção, o xeque-mate, a partida guardada e as pretas embaixo), `ferramentas` (Visualizador e Reprodutor; os vídeos de exemplo são feitos pelo ffmpeg, se houver), `compactados`, `capturaMonitor`, `explorador`, `focoAbas`, `arrastar` (arrastar e soltar sobre o ícone de uma pasta, para dentro de uma pasta aberta e na área de trabalho, pelo arrastar simulado do Playwright, e renomear na área de trabalho), `atalhos` (o ícone de um programa da área de trabalho solto numa pasta vira um arquivo `.atalho`, que abre o programa e mantém a extensão ao renomear), `arrastarReal` (o mesmo com o mouse de verdade, pelo `xdotool`, com o zoom de `RETRO_ZOOM_TESTE`: o arrastar simulado não passa pelo do sistema e não pegava o defeito da 1.0.0), `barraFerramentas` (a barra do Explorador numa janela estreita), `loginGoogle` (precisa da internet: o Navegador como o Firefox no login do Google), `unidades`, `computador` (Meu computador › Computador principal: trazer, levar sem gravar por cima, a recusa fora da pasta, um arquivo mandado por uma segunda abertura, como o "Enviar para" do Windows, e o desligar no Painel; o próprio roteiro faz o computador principal de mentira), `padroes` (o programa padrão de cada tipo: Abrir com › Escolher o programa… e o Painel › Programas padrão; com `RETRO_ZIP`, o .md sai do WordCraft para o Bloco de notas);
- a barra e o sistema: `barra`, `fixados`, `reorganizar` (arrastar os botões da barra com o mouse: as janelas, os fixados e os ícones agrupados, sem o clique de soltar abrir nada), `bandeja` (com `RETRO_BANDEJA_FALSA=1`), `bloqueio`, `sistema` (com `RETRO_SISTEMA=1` e `RETRO_ENERGIA_FALSA=1`), `impressoras`, `bluetooth`, `atualizacoesLinux` e `janelasLinux` (cada um com a sua variável de mentira);
- o teclado: `acentos` (todos os acentos do português e os casos em que o Windows escreve o sinal e a letra — " + B, ´ + t, ^ + 2 — no Bloco de notas, na caixa de busca, no nome de um arquivo, no Prompt e no Navegador, pelo `xdotool`, com cada resultado comparado ao do Windows; rode com `LANG=en_US.UTF-8` e com `pt_BR.UTF-8`; num contêiner sem os idiomas, `localedef -i en_US -f UTF-8 PASTA/en_US.UTF-8` e `LOCPATH=PASTA`; o Xvfb não aplica a variante "intl", por isso o roteiro põe `RETRO_TECLADO=us:intl`, que finge o layout) e `cedilha` (só o ç);
- a segurança: `auditoria` (sem fotos: um programa Craft de mentira tenta rodar um .svg do disco com a ponte, abrir a área de trabalho num quadro e ler a pasta de dados por `programa://../`; tem que terminar com "AUDITORIA: ok");
- os usuários: `perfis` (o Painel › Usuários, um nome repetido, o logoff pelo Iniciar, a tela de entrada, a área de trabalho e o disco C: de outro usuário, a troca pela caixa Desligar e a senha errada e a certa na tela de entrada; o roteiro abre o Retro Computer de novo a cada troca);
- as janelas e o teclado: `iniciar` (o menu Iniciar configurável: fixar, esconder um item, as propriedades, os ícones pequenos e o botão direito no Iniciar), `encaixe` (os cantos magnéticos, o Alt+Tab, o Alt+F4 e o Ctrl+roda), `resolucao` (com `RETRO_SISTEMA=1`, `RETRO_ENERGIA_FALSA=1` e `RETRO_TELA_FALSA=1`), `variasTelas` (o mesmo, com `RETRO_TELA_FALSA=2`), `mouse` (com `RETRO_MOUSE_FALSO=1`), `caracteres` (o Mapa de caracteres), `caixas` (confere se cada caixa do Painel cabe sem rolar, sem fotos), `mesa` (a área de trabalho padrão, o botão direito no Iniciar e a aba Ícones), `diario` (o Diário de trabalho), `copia` (a cópia de segurança para uma pasta temporária), `firefox` (com `RETRO_SISTEMA=1`, `RETRO_ENERGIA_FALSA=1`, `RETRO_FIREFOX` e o openbox: o Firefox aberto pelo ícone do Navegador, fotografado pelo `import`; o Firefox fica aberto, então rode com `timeout`), `claudeAjusta` (o roteiro faz o papel do Claude Code: roda o servidor MCP com o config gravado e pede o fundo, um atalho no Iniciar e um aviso), `pedirClaude` (o "Pedir ao Claude" do botão direito, com `RETRO_CLAUDE_FALSO` apontando para um script que mostra o pedido recebido), `wine` (o instalador do Windows e Iniciar › Programas › Programas do Windows; com `RETRO_WINE_FALSO=1`), `antivirus` (a verificação de uma pasta com o arquivo de teste EICAR, a Lixeira e a caixa de formatar o pendrive; com `RETRO_ANTIVIRUS_FALSO=1`), `acessibilidade` (as abas, o alto contraste com o cursor grande, a lupa e o aviso visual; com `RETRO_SISTEMA=1`, `RETRO_ENERGIA_FALSA=1` e `RETRO_ACESSIBILIDADE_FALSA=1`), `energia` (as Opções de energia e a Data e hora do modo sistema; com `RETRO_SISTEMA=1`, `RETRO_ENERGIA_FALSA=1` e `RETRO_DATAHORA_FALSA=1`), `som` (a aba Áudio das Propriedades de Sons e a saída na caixa do volume; com `RETRO_SOM_FALSO=1` e `RETRO_BANDEJA_FALSA=1`), `visualizar` (o painel de visualização com um .docx, um PDF, uma planilha, um CSV, um texto e uma foto feitos na hora; e o Acesso rápido);
- o que veio das distribuições: `produtividade` (o histórico da área de transferência, a conta na busca, a luz noturna, o modo de energia, o firewall e a aba Atalhos; com `RETRO_BANDEJA_FALSA=1` e `RETRO_FIREWALL_FALSO=1`) e `seguranca` (a Central de segurança e o aviso do site sem HTTPS; com `RETRO_FIREWALL_FALSO=1` e `RETRO_ATUALIZACOES_FALSAS=1`, e a internet).

As teclas simuladas pelo Playwright não passam pelo `before-input-event` do Electron: os roteiros mandam a ação como o processo principal a manda (`tecla('alternar')`), e a leitura das teclas fica em `src/principal/atalhos.js`, testada à parte. Para o modo sistema com janelas do Linux de verdade, o Xvfb com o openbox, o `xdotool key` e o `import -window root` (ImageMagick) funcionam.

Ao criar um recurso, acrescente um teste em `testes/` quando a regra for do processo principal e um roteiro (ou um passo) em `testes/capturas.mjs` quando for da tela. Olhe as capturas antes de dar por pronto.

## Idiomas

- Na área de trabalho: `import { tr } from '../idioma.js'` e `tr('Não foi possível abrir {nome}.', { nome })`. Nunca monte frases juntando pedaços traduzidos: a ordem das palavras muda de um idioma para outro. Em tabelas de módulo (lidas antes do idioma carregar), use `marcar('…')` e traduza na hora de mostrar com `tr(item.rotulo)`.
- No processo principal: `const { tr } = require('./idioma')`.
- Depois de mudar textos, rode `node ferramentas/textos.js`, acrescente as traduções que faltam em `en.json` e `es.json` (na ordem das chaves, `--chaves` lista todas) e tire as que sobram. Os `&` marcam a letra sublinhada dos menus: escolha letras que não se repitam no mesmo menu.
- Nomes de referência: Iniciar = Start / Inicio; Meu computador = Computer / Mi computadora; Meus documentos = Documents / Mis documentos; Lixeira = Trash / Papelera; Prompt de comando = Command Prompt / Línea de comandos; Bloco de notas = Notepad / Bloc de notas; Foco = Focus / Enfoque; computador principal = main computer / computadora principal.
- A Ajuda (`js/apps/ajuda.js`) e as descrições do catálogo (`catalogo/programas.json`) têm o texto de cada idioma no próprio lugar.

## Publicar uma versão

1. Suba a versão no `package.json` (e no `package-lock.json`) e na linha "Version" dos três READMEs.
2. Escreva as notas em inglês em `docs/lancamentos/vX.Y.Z.md`.
3. Teste (`npm test`, as capturas nos três idiomas), faça o commit e o push na branch de trabalho, e espere o fluxo "Compilar" passar nos quatro sistemas.
4. Leve o commit para a `main` (`git push origin <commit>:main`). O fluxo "Publicar" vê que a versão do `package.json` ainda não tem lançamento, compila os instaladores (Windows, macOS, Linux PC e ARM64) e cria o lançamento `vX.Y.Z`, com a etiqueta. Sem versão nova, ele não faz nada. Não é preciso enviar etiquetas (nas sessões na nuvem, o envio de etiquetas é recusado).
5. O Retro Computer instalado avisa os usuários da versão nova (consulta o último lançamento uma vez por dia).

## Como editar

- Prefira a ferramenta de edição ou scripts de troca de texto que conferem se acharam o trecho. Não use `t.replace(a, b)` com texto em JavaScript (os padrões `$&` e `$'` corrompem o arquivo); use a função.
- Comentários curtos em português, explicando o porquê.
- A área de trabalho não tem empacotador: são módulos ES carregados direto (`src/sistema/js`). O processo principal é CommonJS.
- Um programa novo da área de trabalho é um módulo em `js/apps/` que chama `registrarApp(id, { nome, icone, abrir })`. Em `js/inicio.js`, ele entra com `registrarPreguicoso` (só carrega quando abre, ou com o computador parado depois da abertura); só vai num `import` direto quando faz algo ao carregar (ouve o processo principal, tem relógio próprio) ou abre arquivos pelo tipo (`tipos`). Para entrar no Iniciar, ele vai em `itensProgramas` (`js/barra.js`); para a Ajuda, um tópico em `js/apps/ajuda.js`, nos três idiomas.
- A ponte (`tratar` em `main.js`) só atende o quadro principal da área de trabalho (`sistema://retro`): os programas Craft falam por mensagens com `craft.js`, e as páginas do Navegador, com o `navegador-preload.js`.
- O `userChrome.css` do Firefox (`firefox.js`) não pode ter `@namespace`: com ele, o Firefox 158 ignora o arquivo inteiro. Os nomes das peças da interface mudam de uma versão para outra; para conferir, abra o `browser/omni.ja` do Firefox (é um zip) e procure no `chrome/browser/skin/classic/browser/`.
- Desde o Electron 44, a área de transferência do processo principal é assíncrona (`await clipboard.readText()`, `clipboard.write([new ClipboardItem(…)])`); não há mais `writeImage` nem `availableFormats`.
- Um recurso que depende de uma ferramenta do sistema (o `bluetoothctl`, o `apt`, o `wmctrl`…) fica numa classe do processo principal com as funções de leitura das saídas exportadas (testadas em `testes/`) e uma versão de mentira ligada por uma variável `RETRO_*`, para as capturas. As ações de administrador passam por `comoAdmin` (`sistema-linux.js`), com a senha pedida pela caixa do Retro Computer (`js/admin.js`).
- Toda tecla do Electron que a área de trabalho também usa precisa ser conferida em `main.js` (o `before-input-event`): o F11, por exemplo, é da tela cheia do aplicativo.
- Um tipo de arquivo novo: `TIPOS` em `js/util.js` (ícone e descrição) e, se um programa o abre, `tipos` no `catalogo/programas.json`.
- Ícones: rode `python3 -I ferramentas/icones.py PASTA_DO_SERENITY` (com a raiz de um clone do SerenityOS); os desenhos próprios ficam no próprio roteiro, ponto a ponto. Os cursores grandes: `python3 -I ferramentas/cursores.py PASTA_DO_SERENITY`.
- Uma ferramenta nova do Claude (o servidor MCP) entra em `FERRAMENTAS` (`mcp.js`), com o que fazer em `executarMcp` (`main.js`) ou no `js/mcp.js` (o que só a tela sabe). Uma configuração nova que o Claude possa mudar entra em `PERMITIDAS`; nunca a senha, a chave, o disco ou as atualizações.
- Os vários usuários (`perfis.js`): cada perfil tem a própria pasta de dados (o `userData`, trocado logo no começo do `main.js`, antes de ler o idioma), e o principal fica com a de sempre. O que é de todos (os programas instalados, o WINE) usa `BASE_DADOS`; o resto, `app.getPath('userData')`. A trava de uma instância só fica na pasta principal. Trocar de usuário, fazer logoff e trocar de idioma passam por `reabrirApp()`: com a "próxima abertura" (`abertura.json`, que vale uma vez e por dois minutos) e o `app.relaunch()`; na sessão do Linux (`--sistema`), o código 75, que o `sessao.sh` entende como "abrir de novo" (o `relaunch` abriria fora da sessão).
- A segurança (a auditoria da 1.0, com os testes em `testes/auditoria.test.js`): os arquivos do disco em `sistema://retro/disco/` e `/miniatura/` saem com a CSP `sandbox` (`soConteudo`), para um .svg ou um .html nunca rodar com a origem da área de trabalho; a janela só navega para `sistema://retro/index.html` e nenhum quadro abre `sistema://` (`will-frame-navigate`); `programa://<id>` só serve um programa instalado (o Chromium entrega `..` como nome); o download dos Craft confere o SHA-256 publicado pelo GitHub; um Craft lê a área de transferência só com a permissão do usuário (`permissoesProgramas`); `Disco.real` segue os links até o fim; os arquivos que o administrador copia para o sistema saem de `temporario()` (`sistema-linux.js`). Ao mexer nesses lugares, rode o roteiro `auditoria`.
- As pastas do computador principal (`PastasDoComputador` em `unidades.js`, os ids `pc:…` nas rotas dos pendrives) só existem fora do modo sistema e só para a área de trabalho; para os outros usuários, começam escondidas (`foraVisivel` em `main.js`). A pasta do disco C: nunca aparece nelas nem vai ou volta por elas (trazer de dentro dela viraria mover no disco). O que o computador principal manda (a linha de comando da segunda abertura e o `open-file` do Mac) só é copiado para Recebidos, depois de a área de trabalho avisar que está pronta (`computador:pronto`); nada abre sozinho. A cópia levada para fora leva a marca de "baixado da internet" (`copiarMarcas`).
- Arrastar e soltar: os arquivos e as pastas do disco saem pelo arrastar do sistema (`comecarArrastoNativo` em `arquivos.js`, `webContents.startDrag` em `main.js`), que também solta fora do Retro Computer e só copia; soltos de volta numa pasta daqui, chegam como arquivos de fora, e `relsDoArrasto` reconhece que são os do disco (e move). No Linux sem um idioma UTF-8 o Chromium perde os acentos dos caminhos, e fica o arrastar de dentro (`arrastoSistema` em `config:obter`). O Playwright só imita o arrastar do navegador: o roteiro `arrastar` o liga (`window.__retro.arrastoSimulado`), e o `arrastarReal` confere o do sistema, com uma janela de mentira ao lado que recebe o arquivo. Todo lugar que aceita uma soltura aceita o `dragenter` e o `dragover` (o Chromium responde ao sistema pelo `dragenter` ao trocar de elemento, e um `dragenter` recusado logo antes de soltar faz o Windows e o X desistirem), e a marca de "por cima" não muda o tamanho de nada. Confira com o roteiro `arrastarReal`, não só com o `arrastar`.
- O DOS (o pacote `emulators`, GPL-2.0) vai sem modificação. Ele avalia o próprio código com `eval`, que a área de trabalho não permite: por isso roda em `dos://emulador` (um quadro com `sandbox`, sem a ponte, com a CSP própria de `dos.js` e sem internet) e só conversa por mensagens, com a origem conferida dos dois lados. Não afrouxe a CSP do `index.html` por causa dele.
- Os cursores do `estilo.css` são escritos como `cursor: var(--cur-default, default)` (o `--cur-…` é o cursor grande da Acessibilidade); um cursor novo segue o mesmo formato.

## O que o dono gosta

- Visual fiel à época, bem acabado e coerente; capturas do que foi feito.
- Usar o Retro Computer como o sistema de um notebook antigo (com mouse e teclado sem fio, teclado em EUA internacional): o que funciona no Windows de hoje deve ter um equivalente aqui.
- Foco no trabalho: poucas distrações, tudo à mão.
- Nada perdido e arquivos sempre acessíveis fora do programa.
