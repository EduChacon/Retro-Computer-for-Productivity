# Como usar o Retro Computer

Este documento descreve o uso no dia a dia. A arquitetura e as decisões técnicas ficam em [proposta.md](proposta.md).

## Em resumo

- O Retro Computer é um programa comum, instalado no Windows, no macOS ou no Linux (inclusive no Raspberry Pi). Ao abrir, ele ocupa a tela inteira e mostra um computador dos anos 90: área de trabalho, botão Iniciar, janelas e barra de tarefas.
- No Linux, ele também pode ser o próprio sistema do computador: a sessão "Retro Computer" da tela de entrada abre direto nele, sem a área de trabalho do Linux por baixo (seção 7). Assim, um notebook antigo ou um mini PC vira um computador retrô dedicado.
- Fala português, inglês e espanhol (Painel de controle › Idioma).
- O disco C: é uma pasta do computador principal (por padrão, `Documentos/Retro Computer`). Tudo o que se salva fica nela, visível também fora do programa.
- Os programas de trabalho (os Craft: WordCraft, GridCraft, DeckCraft, PdfCraft e outros) são instalados pela Loja de programas (no alto do menu Iniciar; no Painel de controle, "Adicionar ou remover programas") e rodam em janelas da área de trabalho. A mesma janela tem a loja do computador: o Flathub no Linux, o winget no Windows e o Homebrew no Mac.
- Vêm prontos: Navegador, E-mail, Visualizador de imagens, Reprodutor de mídia, Captura de tela, Monitor do sistema, Calculadora, Bloco de notas, Área de transferência (o histórico), Mapa de caracteres, Diário de trabalho, Foco (Pomodoro, cronômetro e temporizador), Prompt de comando, DOS e cinco jogos (Paciência, Campo Minado, Breakout, Damas e Xadrez).
- As janelas se encaixam nas bordas e nos cantos da tela, e os atalhos do Windows (Alt+Tab, a tecla do logotipo com uma letra) funcionam no Retro Computer como sistema.
- Painel de controle › Segurança mostra num lugar só a senha, o firewall, as atualizações e a privacidade.
- Várias pessoas podem dividir o mesmo Retro Computer, cada uma com a área de trabalho, a senha e o disco C: próprios (Painel de controle › Usuários).
- O Claude Code roda no Prompt de comando, nos arquivos do disco C:, e também ajusta o próprio Retro Computer quando se pede.
- Nada se perde: o que é excluído vai para a Lixeira, e cada gravação guarda a versão anterior do arquivo.

## 1. Instalar e abrir

1. Baixe o instalador do seu sistema na página de [lançamentos](https://github.com/EduChacon/Retro-Computer-for-Productivity/releases/latest): `.exe` no Windows (10 ou mais novo), `.dmg` no macOS 12 Monterey ou mais novo (`x64` para Intel, `arm64` para Apple Silicon), `.AppImage` ou `.deb` no Linux (`x86_64`/`amd64` para PC, `arm64` para o Raspberry Pi). O guia [instalacao.md](instalacao.md) explica cada caso, inclusive o de um Mac antigo.
2. Abra o Retro Computer. A área de trabalho aparece direto; a tela do BIOS e a abertura, com o som de início, voltam ao desmarcar Painel de controle › Aparência › Configurações › "Pular a tela de abertura".
3. Na primeira vez, a Ajuda abre sozinha e o disco C: é criado em `Documentos/Retro Computer`, com o arquivo `Meus documentos/Leia-me.txt` (em inglês, `Documents/Read me.txt`; em espanhol, `Mis documentos/Léame.txt`).

O Retro Computer procura a versão nova dele uma vez por dia. No Windows e no `.AppImage`, ele a baixa e oferece reiniciar para instalar; no `.deb`, a instalação pede a senha de administrador; no macOS (e no `.zip` do Windows), o aviso abre a página de download.

Sem assinatura digital (ainda não há certificado da Apple nem da Microsoft), o sistema avisa na primeira abertura:

- **macOS**: Ajustes do Sistema › Privacidade e Segurança › Abrir Mesmo Assim (até o macOS 14, também o botão direito no aplicativo › Abrir › Abrir).
- **Windows**: na tela azul do SmartScreen, "Mais informações" › "Executar assim mesmo".

O caminho para a assinatura e o custo dela estão em [instalacao.md](instalacao.md), seção 9.

**No pendrive**: com uma pasta `Retro Computer (dados)` ao lado do programa sem instalador (o `.zip` do Windows, o `.AppImage` do Linux ou o aplicativo do Mac), o Retro Computer entra no modo portátil: as configurações, os programas e o disco C: ficam nela, e nada fica no computador. O Linux Mint inteiro também pode ir num pendrive ou SSD externo; os dois caminhos estão em [instalacao.md](instalacao.md), seção 8.

## 2. O dia a dia

| Para… | Faça |
|---|---|
| Começar a trabalhar | Iniciar › Programas, a caixa de busca ao lado do Iniciar ou dois cliques num ícone da área de trabalho |
| Abrir um documento | Dois cliques nele: o programa certo abre (o `.docx` no WordCraft, o `.txt` no Bloco de notas, a foto no Visualizador de imagens) |
| Salvar | O comando Salvar do programa: na primeira vez, a caixa "Salvar como" mostra o disco C:; depois, grava direto no mesmo arquivo |
| Achar um arquivo | A caixa de busca da barra de tarefas ou Iniciar › Localizar |
| Fazer uma conta rápida | Digite na caixa de busca (`12*3,5`, `200 × 15%`, `√2`): o resultado vem primeiro, e Enter o copia |
| Pôr duas janelas lado a lado | Arraste uma até a borda da esquerda e a outra até a da direita (num canto, um quarto da tela; no alto, a tela toda) |
| Colar algo copiado antes | Logotipo + V (o histórico da área de transferência), ou Iniciar › Programas › Acessórios › Área de transferência |
| Ver maior | Ctrl + a roda do mouse (no Bloco de notas, no Navegador e no Prompt; nas pastas, o tamanho dos ícones) |
| Desfazer uma gravação | Botão direito no arquivo › Versões anteriores |
| Recuperar um arquivo excluído | Lixeira › botão direito › Restaurar |
| Concentrar-se | Iniciar › Programas › Acessórios › Foco (o "Pomodoro"), com a tela cheia (F11) |
| Imprimir | Arquivo › Imprimir (Ctrl+P) no Bloco de notas, no Visualizador de imagens e no Navegador |
| Sair de perto | Iniciar › Bloquear o computador (com uma senha em Painel de controle › Senhas) |
| Sair | Iniciar › Desligar (cada programa pergunta se há algo por salvar) |

### A área de trabalho

- **Os ícones** de início: Meu computador, Meus documentos, a Lixeira, o Navegador, o E-mail e o Claude. Painel de controle › Aparência › **Ícones** liga e desliga os do sistema (também o Prompt de comando, o Painel de controle, o Bloco de notas e o Foco), com "Restaurar o padrão".
- **Outro programa**: botão direito nele, no menu Iniciar › "Adicionar à área de trabalho" (ou "Remover da área de trabalho"); o mesmo menu fixa o programa na barra de tarefas. Botão direito num ícone da área de trabalho › "Remover da área de trabalho".
- **Atalhos nas pastas**: o ícone de um programa arrastado da área de trabalho para uma pasta (o ícone dela ou a janela aberta) vira um arquivo de atalho dentro dela e sai da área de trabalho (com Ctrl, fica nos dois lugares; solto na Lixeira, só sai da área de trabalho). O arquivo é um texto pequeno, `Calculadora.atalho`, com a chave do programa (`Programa=calculadora`), e aparece com o ícone do programa, a setinha e o nome sem o `.atalho` (que volta sozinho ao renomear). Dois cliques abrem o programa; ele só aponta para os programas que o Retro Computer conhece, nunca para um caminho, e o de um programa removido avisa.
- **Os arquivos e as pastas** da área de trabalho ficam na pasta `Área de trabalho` do disco C:.

### A barra de tarefas

- **À esquerda**: o Iniciar, a caixa de busca (programas, opções do Painel de controle e arquivos do disco C:; com Enter, pesquisa na internet) e os programas fixados (de início, o Explorador de arquivos, o Navegador, o E-mail e o Bloco de notas). Botão direito num programa › "Fixar na barra de tarefas" ou "Desafixar".
- **Os botões das janelas** mostram o nome, como na época, ou só os ícones, agrupados por programa (botão direito na barra › Botões das janelas). O clique com a roda num botão abre outra janela do programa.
- **Arrastar para reorganizar**: os fixados e os botões das janelas mudam de lugar arrastando (o botão troca com o vizinho quando o ponteiro passa do meio dele, com o contorno pontilhado). A ordem dos fixados fica guardada; a das janelas e a dos programas abertos que não estão fixados vale até fechar o Retro Computer, e as janelas novas entram no fim.
- **As propriedades** (botão direito na barra › Propriedades, ou Iniciar › Configurações › "Barra de tarefas e menu Iniciar"): a caixa de busca, a data, os botões das janelas e a ordem dos fixados.
- **A bandeja, à direita**: a rede (as redes Wi-Fi, no Linux), o volume (com a escolha da saída de som, quando há mais de uma), a bateria com o brilho da tela e a bateria do mouse e do teclado sem fio, o Bluetooth (no Linux), o sino das notificações com o "Não perturbe" e o relógio, que abre o calendário (botão direito › Mostrar a data).

### O menu Iniciar

- **Fixar um programa no alto do menu**: botão direito nele, em qualquer lugar do Iniciar › "Fixar no menu Iniciar" (ou "Desafixar do menu Iniciar").
- **Personalizar** (Iniciar › Configurações › "Barra de tarefas e menu Iniciar" › Menu Iniciar, ou botão direito no Iniciar › Propriedades): a ordem dos fixados, os itens à vista (a Loja de programas, os Documentos, as Configurações, o Localizar, a Ajuda, o Executar e o Bloquear; o Programas e o Desligar ficam sempre), os **ícones pequenos** (o menu mais baixo, sem a faixa, como a opção do Windows 95) e os documentos recentes (guardar ou não, e limpar a lista). O botão direito num item do menu › "Não mostrar no menu Iniciar" também o esconde.

### Trazer e levar arquivos

- **Trazer** do computador principal: arraste os arquivos para uma janela de pasta ou para a área de trabalho. Eles são copiados para o disco C:. Também há o menu Arquivo › "Trazer do computador principal…".
- **Levar** para o computador principal: arraste o arquivo (ou a pasta) para fora da janela do Retro Computer, até a área de trabalho ou uma pasta de lá, um site no Navegador (um anexo do e-mail) ou outro programa. É o arrastar do próprio sistema, e ele só copia: o arquivo continua no disco C: (soltar de volta numa pasta do Retro Computer move, como antes). Também há o botão direito › Enviar para › "Área de trabalho do computador principal", "Downloads do computador principal" ou "Outra pasta…".
- **Abrir a pasta lá fora**: botão direito › "Mostrar no computador principal".
- **As pastas de lá** (fora do modo sistema): Meu computador › "Computador principal" mostra a área de trabalho, os documentos, os downloads, as imagens, as músicas e os vídeos do computador principal, como um pendrive: "Copiar para Meus documentos" traz uma cópia; arrastar do disco C: para uma delas (ou "Colar aqui") leva uma cópia, com "(2)" no nome se já houver um igual. Nada é apagado nem gravado por cima lá, e a pasta do próprio disco C: não aparece nelas. Só a área de trabalho do Retro Computer as alcança (os Craft, o Navegador e o DOS, não), e a marca de "baixado da internet" vai junto na cópia levada para fora.
- **De lá para cá**: no Windows, Painel de controle › Disco C: › Computador principal › "Mostrar o Retro Computer no Enviar para do Windows" (o Explorador de Arquivos ganha Enviar para › Retro Computer); no Mac, soltar os arquivos no ícone do Retro Computer no Dock ou, no Finder, Abrir com › Retro Computer. Uma cópia vai para Meus documentos › Recebidos, e nada abre sozinho. A mesma aba cria um atalho do disco C: na área de trabalho de lá e esconde as pastas de lá; para os outros usuários do Retro Computer, elas começam escondidas (os usuários não são uma proteção).

Como o disco C: é uma pasta comum, ele também pode ficar dentro de uma pasta sincronizada (iCloud Drive, OneDrive, Google Drive, Dropbox): Painel de controle › Disco C: › "Trocar a pasta…". Assim, os documentos ficam com cópia na nuvem sem nenhum recurso extra.

### Pendrives e cartões

- Os pendrives, os cartões de memória e os discos externos aparecem em Meu computador, com o espaço livre. No Retro Computer como sistema do Linux, eles são montados sozinhos ao chegar.
- Dois cliques num arquivo do pendrive o copiam para `Meus documentos/Recebidos` e o abrem de lá; o original fica intacto. Para trazer vários: botão direito › "Copiar para Meus documentos" ou "Copiar para a Área de trabalho".
- Para levar: botão direito num arquivo do disco C: › Enviar para › o pendrive (ou Copiar e Colar). Nada é apagado nem gravado por cima no pendrive.
- Antes de tirar: botão direito no pendrive › "Remover com segurança".
- **Formatar** (botão direito no pendrive, no Linux): exFAT (lido pelo Windows, pelo Mac e pelo Linux) ou FAT32 (os aparelhos antigos), com o rótulo; pede a confirmação e a senha de administrador. Um pendrive que guarda o disco C: (o modo portátil) ou o próprio sistema não é formatado. No Windows e no Mac, a caixa leva ao Explorador de Arquivos ou ao Utilitário de Disco.

### O Explorador e as pastas compactadas

As pastas especiais têm o próprio ícone, como no Windows: Meus documentos, a Área de trabalho, o DOS e, em Meus documentos, Recebidos, o Diário de trabalho e as Capturas de tela; e as pastas de imagens, músicas, vídeos e downloads (pelo nome, nos três idiomas: "Imagens", "Músicas", "Vídeos", "Downloads"…), em Meus documentos ou no C:.

- **Exibir › Barra de pastas** (ou o botão Pastas) mostra a árvore à esquerda: o Acesso rápido, Meu computador, o disco C:, Meus documentos, a Área de trabalho, os pendrives e a Lixeira.
- **Acesso rápido**, no alto da árvore: as pastas fixadas (botão direito numa pasta › "Fixar no Acesso rápido"; no começo, a Área de trabalho e Meus documentos) e os arquivos usados por último. Uma pasta fixada renomeada ou movida pelo Retro Computer continua fixada.
- **Exibir › Painel de visualização** (Alt+P, ou o botão Visualizar) mostra à direita o arquivo escolhido, sem abrir o programa: o Word (`.docx`, convertido pelo mammoth), o texto do OpenDocument (`.odt`), o PDF (as páginas, pelo pdf.js, até 40), a primeira folha das planilhas (`.xlsx`, `.ods`, `.csv`, até 200 linhas), os textos, as fotos, os vídeos, as músicas e as páginas da internet salvas (numa moldura sem scripts e sem a internet). Numa janela estreita, o painel a alarga.
- **O endereço** fica em pedaços: cada nome leva àquela pasta. Um clique no espaço vazio ao lado (ou Alt+D, F4) vira o campo de texto.
- **Exibir › Miniaturas** mostra as fotos encolhidas.
- **O programa de cada tipo de arquivo**: botão direito num arquivo › Abrir com › "Escolher o programa…", com "Sempre usar este programa para abrir os arquivos .docx" marcado (também o programa do computador principal). A lista dos escolhidos fica em Painel de controle › Programas padrão (Mudar, Voltar ao normal e Novo tipo). Um Craft escolhido que sair do computador deixa o tipo com o programa de sempre.
- **Um `.zip` abre como pasta** (só para ver). Botão direito › "Extrair tudo…" cria uma pasta nova ao lado, sem gravar por cima de nada; os `.tar` (`.tar.gz`, `.tgz`, `.tar.xz`, `.tar.bz2`) também se extraem. Para compactar: Enviar para › Pasta compactada (zip).

### Internet

- **Navegador do Retro Computer** (Iniciar › Programas, quando o Firefox é o padrão; o E-mail e os sites instalados como programas usam sempre ele): as abas (o "+", Ctrl+T, o clique com a roda num link, Ctrl+Tab, Ctrl+W e Ctrl+Shift+T), os favoritos na barra logo abaixo do endereço (a estrela, Ctrl+D; Exibir › Barra de favoritos, Ctrl+Shift+B), pesquisa, janelas novas, zoom, Localizar e Imprimir; os downloads vão para `Meus documentos/Recebidos`. A barra de status vem escondida (Exibir › Barra de status), e o endereço do link sob o mouse aparece no canto da página. O vídeo em janela flutuante (o botão direito no vídeo, ou Exibir › Vídeo em janela flutuante, Ctrl+Shift+P) fica por cima de tudo, também com o Navegador minimizado. A câmera, o microfone, a localização, as notificações e o compartilhamento da tela pedem permissão, site a site. O "Entrar com Google/Microsoft" abre na janelinha de costume. O login do Google recusa alguns navegadores embutidos: nas páginas de login, o Navegador se apresenta como o Firefox e, se o Google recusar (a página `…/signin/rejected`), passa a se apresentar como o Chrome da mesma versão do Chromium (o agente e as marcas dele) e recomeça o login; o jeito que deu certo fica guardado. Recusado dos dois jeitos, ele sugere o Firefox de verdade como navegador padrão.
- **Firefox, o navegador padrão**: com o Firefox instalado, o ícone Navegador e os links dos programas abrem nele, com o visual do Retro Computer (o `userChrome.css` gerado a cada abertura: o cinza, as bordas em relevo, as abas retas, a fonte Katica) e um perfil próprio (o Firefox de sempre do usuário fica como está). As escolhas do Painel valem para ele: os downloads em `Meus documentos/Recebidos`, só conexões seguras, apagar os dados ao fechar e o tamanho dos pixels. No Linux, a janela dele aparece na barra de tarefas como a do Navegador. Painel de controle › Internet escolhe o navegador padrão (o Firefox, o Navegador do Retro Computer ou, fora do modo sistema, o do computador principal) e, no Linux sem o Firefox, o instala pelo Flathub.
- **Vídeos**: os sites comuns (YouTube e outros) tocam nos dois. Os serviços com proteção contra cópia (Netflix, Prime Video, Disney+, o Spotify na web) tocam só no Firefox, porque o Electron não traz o Widevine (o Firefox o baixa sozinho). Arquivos de vídeo em HEVC (H.265) e AVI também não tocam no Reprodutor de mídia.
- **E-mail**: o e-mail da web escolhido na primeira vez, numa janela própria.
- **Sites como programas**: no Navegador, Arquivo › "Instalar como programa…". O site ganha ícone, janela própria sem a barra de endereço (com o mesmo login do Navegador) e lugar no menu Iniciar, na área de trabalho e, se escolhido, na barra de tarefas. Para desinstalar: o menu Página da janela dele ou Painel de controle › Internet › Programas da internet.

### Acessórios

| Programa | O que faz |
|---|---|
| Visualizador de imagens | As fotos da pasta (setas), ampliar, ajustar, tamanho real, girar, copiar, excluir para a Lixeira, imprimir e a apresentação de slides (F5) |
| Reprodutor de mídia | Os vídeos e as músicas do disco, a fila da pasta, as legendas `.srt` e `.vtt` de mesmo nome, a velocidade, a tela cheia (Alt+Enter) e as teclas de mídia |
| Captura de tela | A tela inteira, a janela da frente ou um pedaço, com atraso opcional; tudo fica em `Meus documentos/Capturas de tela` e na área de transferência |
| Monitor do sistema (Ctrl+Shift+Esc) | Os programas abertos (finalizar e alternar), os processos do computador e o desempenho (processador e memória) |
| Foco | O Pomodoro (25/5/15 minutos, ajustáveis), o cronômetro com voltas e o temporizador; os três continuam com a janela fechada. Durante o foco, o "Não perturbe" liga sozinho e, se escolhido, os jogos ficam para as pausas |
| Diário de trabalho | Um `.txt` por dia em `Meus documentos/Diário de trabalho`: com "Anotar sozinho", a hora de cada foco concluído e de cada arquivo alterado (a primeira vez no dia, também os gravados por outros programas e pelo Claude); as notas escritas na hora. Só acrescenta linhas: o que o usuário escrever nele fica |
| Mapa de caracteres | Os acentos, os símbolos e as letras de outros alfabetos, em grupos: segurar o botão amplia, dois cliques juntam à caixa de baixo, Copiar leva à área de transferência |
| Área de transferência (logotipo + V) | Os últimos 25 textos copiados em qualquer programa: Enter cola o escolhido na posição do cursor; o "…" fixa ou exclui. Fica só na memória (nada vai para o disco), sem o que os gerenciadores de senhas marcam como secreto |
| Calculadora, Bloco de notas, Prompt de comando | Os de sempre |
| DOS | O DOSBox (do js-dos), sem internet: a unidade C: é a pasta C:\DOS do disco; dois cliques num .com, .bat ou .exe do DOS o abrem; o que mudar volta ao disco ao fechar (com a versão anterior guardada e os apagados na Lixeira) |
| Jogos | Paciência, Campo Minado, Breakout, Damas (as regras brasileiras ou as inglesas) e Xadrez, contra o computador (três níveis) ou entre duas pessoas; a partida fica guardada ao fechar |

### Senha e bloqueio

Painel de controle › Senhas cria a senha da tela de bloqueio. Com ela, Iniciar › Bloquear o computador cobre a tela até a senha ser digitada; a senha é pedida também ao abrir o Retro Computer (como no Windows, desde a 1.1) e ao voltar da suspensão (ou ao fechar a tampa) e, se escolhido, ao sair da proteção de tela. A senha fica guardada só como resumo (PBKDF2). No Linux, a senha de entrada do Linux também desbloqueia.

### Vários usuários

Painel de controle › Usuários › Novo usuário cria outra pessoa no mesmo Retro Computer. Cada usuário tem a área de trabalho, as configurações (o fundo, a barra, o menu Iniciar, os sons), os favoritos e os cookies do Navegador, o Diário, a senha da tela de bloqueio e o disco C: próprios: o disco dele é uma pasta ao lado da do usuário principal ("Retro Computer - Ana"; no modo portátil, "Disco C - Ana"), e a pasta de dados fica dentro da principal. Os programas instalados (os Craft e os do Windows) são de todos.

Com mais de um usuário, o Retro Computer pergunta quem vai usar ao abrir (dá para desligar a pergunta na mesma caixa) e pede a senha de quem tiver. Iniciar › Fazer logoff, ou a opção "Fechar todos os programas e entrar como outro usuário" da caixa Desligar, fecha os programas (cada um pergunta se há algo por salvar) e volta à tela de entrada. Tirar um usuário só o tira da lista: a pasta de dados e o disco C: dele ficam onde estão, e a caixa mostra onde. Os usuários separam as áreas de trabalho de quem divide o computador; eles não escondem os arquivos de quem usa o computador principal.

### Segurança e privacidade

Painel de controle › **Segurança** mostra o estado de cada proteção, com o botão que leva à configuração dela: a senha da tela de bloqueio, o firewall e as atualizações de segurança automáticas (no Linux) e como a chave do Claude está guardada (cifrada pelo cofre de senhas do sistema; no Linux sem chaveiro, só embaralhada, com o aviso em vermelho). A aba Privacidade tem:

- **Só conexões seguras (HTTPS)** no Navegador (ligada): os endereços `http://` abrem na versão segura; o site que não a tiver mostra um aviso, com a escolha de abri-lo assim mesmo (até fechar o Retro Computer). Os aparelhos da rede de casa (o roteador, a impressora) ficam de fora.
- **Apagar os dados de navegação ao fechar** (desligada): os cookies, os dados dos sites e os arquivos temporários do Navegador.
- **O histórico da área de transferência** (ligado).

Painel de controle › **Cópia de segurança** copia o disco C: inteiro, com a Lixeira e as versões anteriores, para outra pasta (um disco externo, um pendrive, a pasta de uma nuvem do computador principal), todo dia ou toda semana, ou na hora ("Fazer a cópia agora"). Ela fica numa pasta "Cópia do Retro Computer" dentro do destino e só acrescenta e atualiza: um arquivo excluído do disco C: continua na cópia. Com o destino desligado, a cópia espera e é feita quando ele voltar; o fim (ou o erro) aparece num aviso.

No Linux, Painel de controle › **Firewall** liga o firewall do sistema (o `ufw`, que o pacote do Retro Computer recomenda): ele recusa as conexões que chegam de outros computadores, e a internet continua como antes. Ligar e desligar pedem a senha de administrador.

**O antivírus sob demanda**: botão direito num arquivo, numa pasta, no disco C: ou num pendrive › "Verificar com o antivírus" (ou Painel de controle › Segurança › Verificar…). No Linux, ele usa o ClamAV (o `clamscan`; a janela o instala com a senha de administrador, se faltar, e atualiza as definições); no Windows, o Microsoft Defender (o `MpCmdRun`, sem deixar que ele apague nada); no macOS, o próprio sistema verifica os arquivos (o XProtect). Nada é apagado: o que for achado aparece na lista, e os do disco C: podem ir para a Lixeira.

### A tela e a energia

- **Luz noturna** (Painel de controle › Aparência › Efeitos): as cores mais quentes, com menos azul, das 20h às 7h (as horas se escolhem) ou o dia todo, na intensidade escolhida. No Retro Computer como sistema, ela vale também para os programas do Linux.
- **Cantos magnéticos** (Aparência › Efeitos, ligados): arrastar a janela até a borda a encaixa; a tecla do logotipo com as setas faz o mesmo.
- **Área da tela** (Aparência › Configurações, no Retro Computer como sistema): a resolução do monitor; se a tela nova não aparecer bem, ela volta à anterior em 15 segundos.
- **Várias telas** (Aparência › Configurações, com dois monitores): no Retro Computer como sistema, duplicar, estender ou mostrar só numa delas (pelo `xrandr`, com a mesma pergunta de manter). Estendidas, o Retro Computer fica na tela principal, a outra mostra a cor da área de trabalho, e os programas do Linux podem ir para ela. Fora do modo sistema, a lista escolhe em qual monitor o Retro Computer abre.
- **Modo de energia** (a caixa da bateria, no Linux com o `power-profiles-daemon`): economia de energia, equilibrado ou desempenho.

### Acessibilidade

Painel de controle › **Opções de acessibilidade**, com as abas da época:

- **Vídeo**: o **alto contraste** (o fundo escuro e as letras claras; as fotos, os vídeos e os programas mantêm as cores) e a **lupa**: logotipo + "+" amplia a tela inteira em volta do ponteiro (150%, 200%, 300% e 400%), logotipo + "-" diminui e logotipo + Esc fecha. O ponto debaixo do ponteiro é o mesmo de sem a lupa: para ver a beira da tela, basta levar o ponteiro até ela.
- **Mouse**: o **cursor grande** (os cursores do SerenityOS em dobro) e, no Retro Computer como sistema, as **teclas do mouse** (o teclado numérico move o ponteiro).
- **Som**: os **avisos visuais**: quando o sistema toca um som, a barra de título, a janela ativa ou a tela inteira piscam (também com os sons desligados).
- **Teclado**: no Retro Computer como sistema, as **teclas de aderência** (Shift, Ctrl, Alt e o logotipo valem para a próxima tecla; duas vezes seguidas, ficam travadas). Fora dele, valem as do computador principal (o botão abre as configurações do Windows ou do macOS).
- Para deixar tudo maior de vez: Aparência › Configurações › Tamanho dos pixels.

### Impressoras, Bluetooth e teclado

- **Painel de controle › Impressoras**: as impressoras do computador, a padrão, a fila de impressão (no Linux e no macOS, pelo CUPS), a página de teste e "Adicionar impressora…" (o configurador do sistema; no Linux sem ele, a página do CUPS no Navegador).
- **Painel de controle › Bluetooth** (no Linux): procurar, parear, conectar, desconectar e esquecer. Ao parear um teclado, o código para digitar nele aparece na tela. No Windows e no macOS, o Painel abre as configurações de Bluetooth do sistema.
- **Painel de controle › Teclado**: o layout (Português ABNT2, EUA internacional com teclas mortas e outros), um campo para testar os acentos e a aba Atalhos (com a opção do histórico da área de transferência).
- **Os acentos no EUA internacional, como no Windows**: o acento seguido da letra que serve se junta (´ + a = á, ´ + c = ç, ~ + a = ã, ^ + e = ê, ` + a = à, " + u = ü), e com qualquer outra tecla saem os dois, como no Windows: " + B = "B (as aspas antes de uma palavra), ´ + t = 't, ^ + 2 = ^2; o acento seguido de espaço sai sozinho. No Linux, o normal seria outra coisa ("¨B", "´t", "ś", "²" e, em inglês, "ć" no lugar do ç): o Retro Computer usa uma tabela própria com as regras do Windows (gravada na pasta de dados e entregue ao método de entrada do X, sem mexer em nenhum arquivo do usuário), que também vale para o Firefox e os programas abertos por ele. Nos outros layouts (o ABNT2), o ç vem do módulo "cedilla" do GTK. Quem usa o IBus ou o Fcitx, e as sessões Wayland, ficam como estão. Trocar o layout em Painel de controle › Teclado entre o EUA internacional e outro pede para abrir o Retro Computer de novo. No Windows e no macOS (o layout "EUA internacional – PC"), quem junta os acentos é o próprio sistema.
- **Painel de controle › Mouse** (no Retro Computer como sistema, pelo `xinput`): o botão principal (destro ou canhoto, com a pasta da área de teste para o clique duplo), a velocidade do ponteiro, a aceleração e a rolagem natural; na aba Touchpad, tocar para clicar, rolar e clicar com dois dedos e desligá-lo enquanto se digita ou com um mouse ligado. As escolhas voltam a cada abertura e valem também para o mouse sem fio ligado depois. Fora do modo sistema, o Painel leva às configurações do sistema (no Windows e no macOS).

## 3. Programas

A Loja de programas (no alto do menu Iniciar, ou Iniciar › Configurações › "Adicionar ou remover programas") lista, na aba "Programas recomendados", os Craft por categoria. "Instalar" baixa a versão para navegador do lançamento oficial no GitHub (de 5 MB a 20 MB cada); depois disso, o programa funciona sem internet. "Atualizar" baixa a versão mais recente, e "Remover" apaga o programa sem tocar nos documentos.

### Atualizações

Ao abrir um programa, o Retro Computer procura a versão nova dele no GitHub (no máximo uma consulta a cada 6 horas, com 5 segundos de espera; sem internet, abre na hora). O que fazer com ela fica na mesma janela, em "Ao abrir um programa":

| Opção | Efeito |
|---|---|
| atualizar sozinhos (padrão) | Instala a versão nova e só então abre o programa |
| perguntar antes de atualizar | Mostra a versão nova e a instalada e pergunta |
| não procurar atualizações | Abre sempre a versão instalada |

Além disso, uns 20 segundos depois de ligar, o Retro Computer procura as versões novas de todos os programas instalados e atualiza os que não estão abertos (ou avisa, no modo "perguntar"). Uma atualização nunca instala uma versão mais antiga, e o programa instalado de um arquivo `.zip` não é trocado sozinho. O botão "Procurar atualizações" faz a busca na hora.

Sem internet no computador, baixe o pacote `nome-web-versão.zip` em outro lugar e use "Instalar de um arquivo .zip…".

Os Craft são novos (versões 0.x). Eles já abrem e gravam os formatos de escritório, mas ainda não substituem por completo o Word, o Excel ou o Photoshop. Os arquivos ficam em formatos comuns (`.docx`, `.xlsx`, `.pptx`, `.pdf`), e por isso também abrem nos programas do computador principal.

### Programas do computador

Iniciar › Programas › "Programas do computador…" lista os programas instalados no computador principal (os `.desktop` do Linux, o menu Iniciar do Windows, os Aplicativos do macOS). Cada um pode ganhar um atalho na área de trabalho e no menu Iniciar; os de terminal abrem no Prompt de comando.

### A loja do computador (Flathub, winget e Homebrew)

A Loja de programas tem uma segunda aba com os programas do próprio computador, só de fontes oficiais: os mais usados, as categorias, a pesquisa, a ficha de cada programa, instalar, atualizar, remover e abrir. O programa novo entra nos Programas do computador.

- **Linux, "Programas do Linux"**: o Flathub, com a descrição, a captura, a versão, a licença e o tamanho. A instalação é só para o usuário (`flatpak --user`), sem senha. Sem o Flatpak, a aba explica como instalá-lo.
- **Windows, "Programas do Windows"**: o winget (o Gerenciador de Pacotes do Windows, que vem no Windows 10 e no 11), só com a fonte `winget`, o repositório oficial. A ficha vem do manifesto do programa nesse repositório (github.com/microsoft/winget-pkgs), no idioma do Retro Computer quando houver. A instalação é silenciosa; os programas que instalam para todos os usuários pedem a confirmação do Windows. Os escolhidos de cada categoria ficam guardados por um dia na pasta de dados (`loja-winget.json`), porque cada versão é uma pergunta ao winget. "Abrir" usa o atalho do menu Iniciar com o nome do pacote.
- **Mac, "Programas do Mac"**: o Homebrew (brew.sh), só os aplicativos com janela (os "casks"), com a lista, as descrições e a popularidade da interface oficial (formulae.brew.sh), guardadas por um dia (`loja-brew.json`). Sem o Homebrew, a aba o instala pelo Prompt de comando, com o instalador oficial. Os instaladores `.pkg` pedem a senha do Mac: o Retro Computer oferece continuar pelo Prompt de comando, com o mesmo comando.
- **Os ícones no Windows e no Mac**: o winget e o Homebrew não publicam ícones. O de um programa instalado é o do próprio computador (o atalho do menu Iniciar, o aplicativo da pasta Aplicativos); o dos outros, o que o site oficial do programa publica (o `apple-touch-icon`, o maior `icon` da página ou o `favicon.ico`), pedido só quando o programa aparece na lista, com o endereço guardado por um mês (`loja-icones.json`).

### Programas do Windows (no Linux, pelo WINE)

Dois cliques num `.exe` ou num `.msi` do disco C: o abrem pelo WINE: o do sistema (com um "C:" do Windows só do Retro Computer, na pasta de dados dele, `wine/`) ou, sem ele, o do Flathub (`org.winehq.Wine`), que a pergunta oferece instalar pela Loja, sem senha. Os atalhos que os instaladores criam aparecem em Iniciar › Programas › Programas do Windows (os desinstaladores ficam de fora). Nem todo programa do Windows funciona no WINE; os mais simples e os mais antigos costumam funcionar.

## 4. Claude Code

1. Dois cliques no ícone **Claude** da área de trabalho.
2. Se o Claude Code não estiver instalado, o Retro Computer oferece instalá-lo com o instalador oficial da Anthropic (o comando aparece antes de rodar).
3. Para entrar, há dois caminhos:
   - a conta da assinatura do Claude: o próprio Claude Code pede o acesso na primeira vez;
   - uma chave de API: Painel de controle › Claude › "Guardar". A chave é cifrada pelo cofre de senhas do sistema e só vai para o Prompt de comando, na variável `ANTHROPIC_API_KEY`.
4. O Claude abre na pasta `Meus documentos`. Para outra pasta, use o botão direito nela › "Abrir o Claude aqui".
5. O botão direito num arquivo › "Pedir ao Claude" abre o Claude já com o pedido: revisar o texto, resumir, traduzir (para o português, o inglês ou o espanhol) ou outro pedido escrito na hora; numa pasta, organizá-la. Antes, o Retro Computer guarda a versão de agora do arquivo (botão direito › "Versões anteriores…"), porque o Claude grava direto no disco. O pedido vai ao Claude por uma variável do terminal (`RETRO_PEDIDO`), sem passar pelo shell.
6. **O Claude ajusta o Retro Computer**: pedindo em palavras ("deixe o fundo azul-marinho", "ponha a Calculadora no menu Iniciar", "instale o WordCraft"), ele muda a aparência, a barra de tarefas, o menu Iniciar, os sons, o idioma, os atalhos e os programas, e o que ele apagar do disco vai para a Lixeira. Ele abre com um servidor MCP do próprio Retro Computer (`--mcp-config`) e um texto que explica onde ele está e as regras da casa (`--append-system-prompt-file`); o servidor fala com o Retro Computer aberto por um soquete local, com um código novo a cada abertura. A senha, a chave de API, a pasta do disco e as atualizações ficam fora do alcance dele, e o Claude Code pergunta antes de cada ajuste. Para desligar: Painel de controle › Claude › Ajustes.

7. **As cores e o idioma**: o Claude abre com o fundo claro (o Prompt de comando, com o escuro da época), e a lista da barra da janela troca entre os dois. O Retro Computer passa ao Claude Code, só para aquela sessão (`--settings`), o tema que combina com o fundo ("light" ou "dark") e o idioma do Retro Computer ("language"), a não ser que o usuário já tenha escolhido os seus no próprio Claude (`/theme`, `/config`). Com o Claude aberto, a troca de fundo vale na próxima vez que ele abrir (o `/resume` continua a conversa). A fonte é a Csilla do SerenityOS, com os símbolos que o Claude usa (as aspas curvas, o ⏺, o ⎿, as setas, o ✓ e as estrelinhas da espera) desenhados no mesmo estilo.

Exemplos de uso: "organize os arquivos desta pasta por assunto", "revise o texto de `relatorio.md`", "transforme estas anotações num roteiro".

## 5. Idioma

Painel de controle › Idioma: "Automático" (o idioma do sistema), português, inglês ou espanhol. O Retro Computer reinicia para trocar (cada programa aberto pergunta antes se há algo por salvar). Os programas que têm a interface traduzida, como o WordCraft, seguem o mesmo idioma.

As pastas do disco C: ficam com os nomes de quando foram criadas: quem começou em português continua com `Meus documentos`, mesmo depois de trocar para o inglês.

## 6. Atalhos

| Tecla | Efeito |
|---|---|
| F11 | Tela cheia ou janela |
| Ctrl+Esc | Menu Iniciar |
| F1 | Ajuda |
| Ctrl+Shift+Esc | Monitor do sistema |
| Alt+letra | Menu da janela (a letra sublinhada) |
| Enter, F2, Delete, Backspace | Abrir, renomear, excluir, subir uma pasta |
| Ctrl+C, Ctrl+X, Ctrl+V | Copiar, recortar e colar arquivos nas pastas |
| Alt+D | Digitar um endereço no Explorador |
| Ctrl+P | Imprimir (Bloco de notas, Visualizador de imagens, Navegador) |
| F5 | Apresentação de slides no Visualizador de imagens |
| Espaço, Alt+Enter | Tocar e pausar, tela cheia no Reprodutor de mídia |
| Ctrl+Shift+C, Ctrl+Shift+V | Copiar e colar no Prompt de comando (no Mac, Cmd+C e Cmd+V) |
| Botões laterais do mouse | Voltar e avançar no Meu computador e no Navegador |
| Ctrl + roda do mouse | Aumentar e diminuir o texto (Bloco de notas, Navegador, Prompt) e os ícones (nas pastas) |

No Retro Computer como sistema do Linux, valem também (com o Retro Computer como aplicativo, o Windows, o macOS e a área de trabalho do Linux ficam com boa parte delas):

| Tecla | Efeito |
|---|---|
| Logotipo | Abre e fecha o Iniciar |
| Alt+Tab, Alt+Shift+Tab | Trocar de janela (também as dos programas do Linux): a caixa com os ícones, como na época |
| Alt+F4 | Fechar a janela da frente (sem nenhuma, abre o Desligar) |
| Logotipo + setas | Encaixar a janela: metade da tela, um quarto, a tela toda, minimizar |
| Logotipo+E, R, D, M, I, S | Explorador, Executar, mostrar a área de trabalho, minimizar tudo, Painel de controle, pesquisar |
| Logotipo+V | O histórico da área de transferência |
| Logotipo+1 a 9 | Os programas fixados na barra de tarefas, na ordem |
| Logotipo+Shift+S | Capturar um pedaço da tela |
| Logotipo+L | Bloqueia o computador |
| Print Screen, Alt+Print Screen, Shift+Print Screen | Captura da tela, da janela ou de um pedaço (também com um programa do Linux na frente) |
| Volume, brilho, calculadora | Mudam o som e a tela (com o indicador acima da bandeja) e abrem a Calculadora |

## 7. Num mini computador (Raspberry Pi) e como o "sistema" do Linux

O Retro Computer tem pacotes para o Linux em ARM64 (`arm64.deb` e `arm64.AppImage`), o processador do Raspberry Pi 3, 4 e 5. Ele precisa do sistema de 64 bits (Raspberry Pi OS 64-bit).

| Aparelho | O que esperar |
|---|---|
| Raspberry Pi 5 ou 4 (4 GB ou mais) | Tudo funciona: a área de trabalho, o Bloco de notas, o Prompt, o Claude Code e os Craft (mais lentos que num PC) |
| Raspberry Pi 4 (2 GB) | A área de trabalho e o Prompt vão bem; os Craft e o Claude Code ficam no limite da memória |
| Raspberry Pi 3 (1 GB) | A área de trabalho, o Bloco de notas, o Foco e o Prompt funcionam. Os Craft precisam de WebGL2, que a placa de vídeo do Pi 3 não tem: rodam por software, muito devagar. O Claude Code pede 4 GB de memória (requisito oficial) |
| Mais fracos (Raspberry Pi Zero 2, 512 MB) | Não recomendado: o Electron sozinho já ocupa quase toda a memória |

Uma alternativa barata e mais forte que o Pi 3 é um notebook antigo ou um mini PC usado (os "thin clients" de escritório, com processador Intel ou AMD e 4 GB ou mais), que usa os pacotes `x86_64`/`amd64`.

### A sessão "Retro Computer" (o modo sistema)

1. Instale o pacote: `sudo apt install ./Retro-Computer-1.0.0-linux-amd64.deb` (no Raspberry Pi, o `arm64`). O `apt` instala junto o que o modo sistema usa (o Openbox, o NetworkManager, o som, o Flatpak, o BlueZ, o CUPS, o wmctrl, o xdotool e o udisks2).
2. Na tela de entrada do Linux, escolha a sessão **Retro Computer** e entre. O computador abre direto no Retro Computer, sem a área de trabalho do Linux por baixo.
3. Para ligar direto nele, sem a tela de entrada: Painel de controle › Aparência › Configurações › "Entrar direto no Retro Computer ao ligar" (com o LightDM, a tela de entrada do Raspberry Pi OS e de várias distribuições; pede a senha de administrador).

Na sessão:

- Iniciar › Desligar oferece desligar, reiniciar e suspender o computador de verdade, e sair da sessão (para voltar à área de trabalho do Linux).
- O teclado segue o layout do Linux (ou o escolhido em Painel de controle › Teclado); o touchpad do notebook ganha o "tocar para clicar"; as teclas do logotipo, de volume, de brilho, de calculadora e Print Screen funcionam.
- A bandeja mostra a rede Wi-Fi, o volume, a bateria e o brilho, o Bluetooth e as notificações; os avisos de bateria fraca aparecem aos 10% e aos 5%.
- **Painel de controle › Sons › Áudio**: a saída de som preferida (os alto-falantes, o fone Bluetooth, a tela pela HDMI; o que está tocando passa para ela) e o microfone preferido, com o volume e o mudo, pelo pactl (o PulseAudio ou o PipeWire). No Windows e no macOS, o botão abre as configurações de som do sistema.
- Painel de controle › **Opções de acessibilidade** › Teclado e Mouse: as teclas de aderência (Shift, Ctrl, Alt e o logotipo valem para a próxima tecla) e as teclas do mouse (o teclado numérico move o ponteiro), pelo `xkbset`, também nos programas do Linux.
- Painel de controle › **Opções de energia**: depois de quanto tempo parado a tela apaga (o DPMS, pelo `xset`) e o computador suspende, na tomada e na bateria (com um som tocando, ele espera), e o que a tampa do notebook faz (um arquivo do logind em `/etc/systemd/logind.conf.d/`, com a senha de administrador). Na volta da suspensão, a tela de bloqueio pede a senha (se houver).
- Painel de controle › **Data e hora**: a hora pela internet (o NTP) ou à mão, e a aba **Fuso horário**, pelo `timedatectl` (com a senha de administrador).
- Os programas do Linux (os da aba Programas do Linux e os outros) abrem em janelas comuns e aparecem na barra de tarefas, com os do Retro Computer: o clique traz para a frente ou minimiza, e o botão direito fixa e fecha.
- Painel de controle › **Atualizações do Linux** mostra o que há para atualizar (as de segurança marcadas), instala tudo (`apt-get upgrade`, que nunca remove pacotes, e `flatpak update`) com a senha de administrador e pode instalar sozinho as de segurança, todo dia (o `unattended-upgrades`). Um balão avisa, uma vez por dia, quando há atualizações.
- Os pendrives são montados sozinhos; ao bloquear, as janelas dos programas do Linux são minimizadas, e nenhuma fica por cima da tela de bloqueio.
- A área da tela (a resolução) e a luz noturna valem para o monitor inteiro (pelo `xrandr`); o chaveiro do Linux (o GNOME Keyring, aberto pela senha de entrada) guarda cifrados os cookies do Navegador e a chave do Claude.
- Se o Retro Computer parar com erro, a sessão o abre de novo.

Fora da sessão, o Retro Computer pode simplesmente abrir junto com o computador: Painel de controle › Aparência › Configurações › "Abrir o Retro Computer ao entrar no computador" (Windows, macOS e Linux).

## 8. Sugestões para as próximas versões

As ideias abaixo ainda não foram feitas; ficam registradas para decisão:

a) **Tema Mac clássico**, inspirado no Mac OS 9.2 (o visual "Platinum": as janelas cinza-claro com a barra de título listrada, a barra de menus no alto, a Lixeira no canto), escolhido no Painel de controle. Como em todo o projeto, nada da Apple: os ícones, as letras e as molduras são desenhados aqui (o tema "Cupertino" do SerenityOS, BSD-2-Clause, serve de ponto de partida para as cores).

b) **Papel de parede, esquemas de cores e cursores**: imagens de fundo, esquemas de cores das janelas (como os da época) e conjuntos de cursores, todos próprios ou do SerenityOS.

c) **Instaladores assinados** (o caminho e os custos estão em [instalacao.md](instalacao.md), seção "Os avisos de segurança").

d) **Áreas de trabalho virtuais** (como no Pop!_OS, no GNOME e no Windows 10): várias mesas, cada uma com as suas janelas.

e) **Enviar arquivos a outro computador da casa** (como o Warpinator do Linux Mint) e o celular ligado ao computador (como o KDE Connect).

f) **A barra de tarefas em cada monitor**: com as várias telas estendidas, uma barra em cada tela (hoje ela fica na principal).

A pesquisa das distribuições do Linux que deu origem a algumas destas ideias (e aos recursos da 1.0) está em [pesquisa-distribuicoes.md](pesquisa-distribuicoes.md).
