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
  transferencia.js     o histórico da área de transferência (só na memória)
  firewall.js          o firewall do Linux (ufw)
  https.js             só conexões seguras no Navegador (http:// vira https://)
  navegador-preload.js entra nas páginas do Navegador (atalhos e botões laterais do mouse)
src/adaptador/adaptador.js   entra em cada programa: Abrir/Salvar → caixas do disco
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
  js/compactados.js, unidades.js, webapps.js, impressao.js, bluetooth.js, bloqueio.js,
  janelas-nativas.js, nativos.js, atualizacao.js, admin.js   o lado da tela de cada recurso
  js/apps/             explorador, bloco, craft, prompt (e Claude), programas, loja, painel,
                       navegador, calculadora, imagens, midia, captura, monitor, atualizacoes,
                       nativos, paciencia, campominado, breakout, transferencia,
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

Variáveis úteis: `RETRO_DADOS` (pasta das configurações), `RETRO_DISCO` (pasta do disco C:), `RETRO_JANELA=1` (sem tela cheia), `RETRO_RAPIDO=1` (sem a abertura), `RETRO_IDIOMA=en` ou `es` (o idioma, por cima da configuração), `RETRO_SISTEMA=1` (o modo sistema), `RETRO_ZIP` (no roteiro de capturas: instala pacotes `.zip` antes), `RETRO_FALSA_VERSAO=9.9.9` (no roteiro de capturas: finge que a busca achou essa versão), `RETRO_SEM_BOAS_VINDAS=1` (sem a Ajuda e o balão da primeira vez), `RETRO_EXECUTAVEL` (testa o aplicativo empacotado).

As ferramentas do sistema têm versões de mentira, para os testes e as capturas sem o aparelho: `RETRO_ENERGIA_FALSA=1` (desligar, reiniciar e suspender só são anotados: use-a sempre com `RETRO_SISTEMA=1` fora de um computador dedicado), `RETRO_BANDEJA_FALSA=1` (volume, brilho, bateria e Wi-Fi), `RETRO_LOJA_FALSA=1` (o Flathub de verdade, o flatpak de mentira), `RETRO_UNIDADES_FALSAS=<pasta>` (um pendrive), `RETRO_IMPRESSORAS_FALSAS=1`, `RETRO_BLUETOOTH_FALSO=1`, `RETRO_ATUALIZACOES_FALSAS=1` (a senha de teste é "certa"), `RETRO_JANELAS_FALSAS=1` (dois programas do Linux abertos), `RETRO_TELA_FALSA=1` (a resolução de um notebook de 1440 × 900), `RETRO_FIREWALL_FALSO=1` (a senha de teste é "certa") e `RETRO_MIDIA_FALSA=1` (a câmera e o microfone do Chromium). Como administrador (root), o Electron precisa de `--no-sandbox` (o roteiro de capturas já passa).

Roteiros de capturas (todos aceitam `RETRO_IDIOMA`):

- as telas: `geral`, `mais` (detalhes, Lixeira, Executar, Localizar, Foco, Ajuda), `ajuda` (os tópicos da Ajuda), `idioma` (a troca de idioma e o Sobre), `lixo` (o ícone da Lixeira), `boot` (com `RETRO_BOOT=1`);
- os programas: `craft` (o WordCraft: abrir, salvar, salvar de novo, abrir; precisa de `RETRO_ZIP`), `atualizar` (a atualização ao abrir; precisa de `RETRO_ZIP` e `RETRO_FALSA_VERSAO`), `autoatualizar` (a do próprio aplicativo, com `RETRO_EXECUTAVEL`), `nativos`, `loja` (com `RETRO_LOJA_FALSA=1`), `claude`;
- a internet: `navegador`, `permissoes` (com `RETRO_MIDIA_FALSA=1`), `webapps`;
- as ferramentas: `calculadora`, `jogos`, `ferramentas` (Visualizador e Reprodutor; os vídeos de exemplo são feitos pelo ffmpeg, se houver), `compactados`, `capturaMonitor`, `explorador`, `focoAbas`, `unidades`;
- a barra e o sistema: `barra`, `fixados`, `bandeja` (com `RETRO_BANDEJA_FALSA=1`), `bloqueio`, `sistema` (com `RETRO_SISTEMA=1` e `RETRO_ENERGIA_FALSA=1`), `impressoras`, `bluetooth`, `atualizacoesLinux` e `janelasLinux` (cada um com a sua variável de mentira);
- as janelas e o teclado: `encaixe` (os cantos magnéticos, o Alt+Tab, o Alt+F4 e o Ctrl+roda), `resolucao` (com `RETRO_SISTEMA=1`, `RETRO_ENERGIA_FALSA=1` e `RETRO_TELA_FALSA=1`);
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
- Desde o Electron 44, a área de transferência do processo principal é assíncrona (`await clipboard.readText()`, `clipboard.write([new ClipboardItem(…)])`); não há mais `writeImage` nem `availableFormats`.
- Um recurso que depende de uma ferramenta do sistema (o `bluetoothctl`, o `apt`, o `wmctrl`…) fica numa classe do processo principal com as funções de leitura das saídas exportadas (testadas em `testes/`) e uma versão de mentira ligada por uma variável `RETRO_*`, para as capturas. As ações de administrador passam por `comoAdmin` (`sistema-linux.js`), com a senha pedida pela caixa do Retro Computer (`js/admin.js`).
- Toda tecla do Electron que a área de trabalho também usa precisa ser conferida em `main.js` (o `before-input-event`): o F11, por exemplo, é da tela cheia do aplicativo.
- Um tipo de arquivo novo: `TIPOS` em `js/util.js` (ícone e descrição) e, se um programa o abre, `tipos` no `catalogo/programas.json`.
- Ícones: rode `python3 -I ferramentas/icones.py PASTA_DO_SERENITY` (com a raiz de um clone do SerenityOS); os desenhos próprios ficam no próprio roteiro, ponto a ponto.

## O que o dono gosta

- Visual fiel à época, bem acabado e coerente; capturas do que foi feito.
- Usar o Retro Computer como o sistema de um notebook antigo (com mouse e teclado sem fio, teclado em EUA internacional): o que funciona no Windows de hoje deve ter um equivalente aqui.
- Foco no trabalho: poucas distrações, tudo à mão.
- Nada perdido e arquivos sempre acessíveis fora do programa.
