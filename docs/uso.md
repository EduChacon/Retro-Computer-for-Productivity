# Como usar o Retro Computer

Este documento descreve o uso no dia a dia. A arquitetura e as decisões técnicas ficam em [proposta.md](proposta.md).

## Em resumo

- O Retro Computer é um programa comum, instalado no Windows, no macOS ou no Linux (inclusive no Raspberry Pi). Ao abrir, ele ocupa a tela inteira e mostra um computador dos anos 90: área de trabalho, botão Iniciar, janelas e barra de tarefas.
- No Linux, ele também pode ser o próprio sistema do computador: a sessão "Retro Computer" da tela de entrada abre direto nele, sem a área de trabalho do Linux por baixo (seção 7). Assim, um notebook antigo ou um mini PC vira um computador retrô dedicado.
- Fala português, inglês e espanhol (Painel de controle › Idioma).
- O disco C: é uma pasta do computador principal (por padrão, `Documentos/Retro Computer`). Tudo o que se salva fica nela, visível também fora do programa.
- Os programas de trabalho (os Craft: WordCraft, GridCraft, DeckCraft, PdfCraft e outros) são instalados pelo "Adicionar ou remover programas" e rodam em janelas da área de trabalho. No Linux, a mesma janela instala os programas do Flathub.
- Vêm prontos: Navegador, E-mail, Visualizador de imagens, Reprodutor de mídia, Captura de tela, Monitor do sistema, Calculadora, Bloco de notas, Área de transferência (o histórico), Mapa de caracteres, Diário de trabalho, Foco (Pomodoro, cronômetro e temporizador), Prompt de comando e três jogos.
- As janelas se encaixam nas bordas e nos cantos da tela, e os atalhos do Windows (Alt+Tab, a tecla do logotipo com uma letra) funcionam no Retro Computer como sistema.
- Painel de controle › Segurança mostra num lugar só a senha, o firewall, as atualizações e a privacidade.
- O Claude Code roda no Prompt de comando, nos arquivos do disco C:.
- Nada se perde: o que é excluído vai para a Lixeira, e cada gravação guarda a versão anterior do arquivo.

## 1. Instalar e abrir

1. Baixe o instalador do seu sistema na página de [lançamentos](https://github.com/EduChacon/Retro-Computer-for-Productivity/releases/latest): `.exe` no Windows (10 ou mais novo), `.dmg` no macOS 12 Monterey ou mais novo (`x64` para Intel, `arm64` para Apple Silicon), `.AppImage` ou `.deb` no Linux (`x86_64`/`amd64` para PC, `arm64` para o Raspberry Pi). O guia [instalacao.md](instalacao.md) explica cada caso, inclusive o de um Mac antigo.
2. Abra o Retro Computer. Aparecem a tela do BIOS, a abertura e a área de trabalho, com o som de início.
3. Na primeira vez, a Ajuda abre sozinha e o disco C: é criado em `Documentos/Retro Computer`, com o arquivo `Meus documentos/Leia-me.txt` (em inglês, `Documents/Read me.txt`; em espanhol, `Mis documentos/Léame.txt`).

O Retro Computer procura a versão nova dele uma vez por dia. No Windows e no `.AppImage`, ele a baixa e oferece reiniciar para instalar; no `.deb`, a instalação pede a senha de administrador; no macOS (e no `.zip` do Windows), o aviso abre a página de download.

Sem assinatura digital (ainda não há certificado da Apple nem da Microsoft), o sistema avisa na primeira abertura:

- **macOS**: Ajustes do Sistema › Privacidade e Segurança › Abrir Mesmo Assim (até o macOS 14, também o botão direito no aplicativo › Abrir › Abrir).
- **Windows**: na tela azul do SmartScreen, "Mais informações" › "Executar assim mesmo".

O caminho para a assinatura e o custo dela estão em [instalacao.md](instalacao.md), seção 8.

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

### A barra de tarefas

- **À esquerda**: o Iniciar, a caixa de busca (programas, opções do Painel de controle e arquivos do disco C:; com Enter, pesquisa na internet) e os programas fixados (de início, o Explorador de arquivos, o Navegador, o E-mail e o Bloco de notas). Botão direito num programa › "Fixar na barra de tarefas" ou "Desafixar".
- **Os botões das janelas** mostram o nome, como na época, ou só os ícones, agrupados por programa (botão direito na barra › Botões das janelas). O clique com a roda num botão abre outra janela do programa.
- **A bandeja, à direita**: a rede (as redes Wi-Fi, no Linux), o volume, a bateria com o brilho da tela e a bateria do mouse e do teclado sem fio, o Bluetooth (no Linux), o sino das notificações com o "Não perturbe" e o relógio, que abre o calendário (botão direito › Mostrar a data).

### Trazer e levar arquivos

- **Trazer** do computador principal: arraste os arquivos para uma janela de pasta ou para a área de trabalho. Eles são copiados para o disco C:. Também há o menu Arquivo › "Trazer do computador principal…".
- **Levar** para o computador principal: botão direito › Enviar para › "Área de trabalho do computador principal", "Downloads do computador principal" ou "Outra pasta…".
- **Abrir a pasta lá fora**: botão direito › "Mostrar no computador principal".

Como o disco C: é uma pasta comum, ele também pode ficar dentro de uma pasta sincronizada (iCloud Drive, OneDrive, Google Drive, Dropbox): Painel de controle › Disco C: › "Trocar a pasta…". Assim, os documentos ficam com cópia na nuvem sem nenhum recurso extra.

### Pendrives e cartões

- Os pendrives, os cartões de memória e os discos externos aparecem em Meu computador, com o espaço livre. No Retro Computer como sistema do Linux, eles são montados sozinhos ao chegar.
- Dois cliques num arquivo do pendrive o copiam para `Meus documentos/Recebidos` e o abrem de lá; o original fica intacto. Para trazer vários: botão direito › "Copiar para Meus documentos" ou "Copiar para a Área de trabalho".
- Para levar: botão direito num arquivo do disco C: › Enviar para › o pendrive (ou Copiar e Colar). Nada é apagado nem gravado por cima no pendrive.
- Antes de tirar: botão direito no pendrive › "Remover com segurança".

### O Explorador e as pastas compactadas

- **Exibir › Barra de pastas** (ou o botão Pastas) mostra a árvore à esquerda: Meu computador, o disco C:, Meus documentos, a Área de trabalho, os pendrives e a Lixeira.
- **O endereço** fica em pedaços: cada nome leva àquela pasta. Um clique no espaço vazio ao lado (ou Alt+D, F4) vira o campo de texto.
- **Exibir › Miniaturas** mostra as fotos encolhidas.
- **Um `.zip` abre como pasta** (só para ver). Botão direito › "Extrair tudo…" cria uma pasta nova ao lado, sem gravar por cima de nada; os `.tar` (`.tar.gz`, `.tgz`, `.tar.xz`, `.tar.bz2`) também se extraem. Para compactar: Enviar para › Pasta compactada (zip).

### Internet

- **Navegador**: favoritos, pesquisa, janelas novas, zoom, Localizar e Imprimir; os downloads vão para `Meus documentos/Recebidos`. A câmera, o microfone, a localização, as notificações e o compartilhamento da tela pedem permissão, site a site. O "Entrar com Google/Microsoft" abre na janelinha de costume.
- **Vídeos**: os sites comuns (YouTube e outros) tocam no Navegador. Os serviços com proteção contra cópia (Netflix, Prime Video, Disney+, o Spotify na web) não tocam, porque o Electron não traz o Widevine; para eles, use o navegador do computador principal (no Linux como sistema, o Firefox ou o Chrome instalados pela aba Programas do Linux). Arquivos de vídeo em HEVC (H.265) e AVI também não tocam no Reprodutor de mídia.
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
| Jogos | Paciência, Campo Minado e Breakout |

### Senha e bloqueio

Painel de controle › Senhas cria a senha da tela de bloqueio. Com ela, Iniciar › Bloquear o computador cobre a tela até a senha ser digitada, e a senha pode ser pedida também ao voltar da suspensão (ou ao fechar a tampa), ao sair da proteção de tela e ao abrir o Retro Computer. A senha fica guardada só como resumo (PBKDF2). No Linux, a senha de entrada do Linux também desbloqueia.

### Segurança e privacidade

Painel de controle › **Segurança** mostra o estado de cada proteção, com o botão que leva à configuração dela: a senha da tela de bloqueio, o firewall e as atualizações de segurança automáticas (no Linux) e como a chave do Claude está guardada (cifrada pelo cofre de senhas do sistema; no Linux sem chaveiro, só embaralhada, com o aviso em vermelho). A aba Privacidade tem:

- **Só conexões seguras (HTTPS)** no Navegador (ligada): os endereços `http://` abrem na versão segura; o site que não a tiver mostra um aviso, com a escolha de abri-lo assim mesmo (até fechar o Retro Computer). Os aparelhos da rede de casa (o roteador, a impressora) ficam de fora.
- **Apagar os dados de navegação ao fechar** (desligada): os cookies, os dados dos sites e os arquivos temporários do Navegador.
- **O histórico da área de transferência** (ligado).

No Linux, Painel de controle › **Firewall** liga o firewall do sistema (o `ufw`, que o pacote do Retro Computer recomenda): ele recusa as conexões que chegam de outros computadores, e a internet continua como antes. Ligar e desligar pedem a senha de administrador.

### A tela e a energia

- **Luz noturna** (Painel de controle › Aparência › Efeitos): as cores mais quentes, com menos azul, das 20h às 7h (as horas se escolhem) ou o dia todo, na intensidade escolhida. No Retro Computer como sistema, ela vale também para os programas do Linux.
- **Cantos magnéticos** (Aparência › Efeitos, ligados): arrastar a janela até a borda a encaixa; a tecla do logotipo com as setas faz o mesmo.
- **Área da tela** (Aparência › Configurações, no Retro Computer como sistema): a resolução do monitor; se a tela nova não aparecer bem, ela volta à anterior em 15 segundos.
- **Modo de energia** (a caixa da bateria, no Linux com o `power-profiles-daemon`): economia de energia, equilibrado ou desempenho.

### Impressoras, Bluetooth e teclado

- **Painel de controle › Impressoras**: as impressoras do computador, a padrão, a fila de impressão (no Linux e no macOS, pelo CUPS), a página de teste e "Adicionar impressora…" (o configurador do sistema; no Linux sem ele, a página do CUPS no Navegador).
- **Painel de controle › Bluetooth** (no Linux): procurar, parear, conectar, desconectar e esquecer. Ao parear um teclado, o código para digitar nele aparece na tela. No Windows e no macOS, o Painel abre as configurações de Bluetooth do sistema.
- **Painel de controle › Teclado**: o layout (Português ABNT2, EUA internacional com teclas mortas e outros), um campo para testar os acentos e a aba Atalhos (com a opção do histórico da área de transferência).
- **Painel de controle › Mouse** (no Retro Computer como sistema, pelo `xinput`): o botão principal (destro ou canhoto, com a pasta da área de teste para o clique duplo), a velocidade do ponteiro, a aceleração e a rolagem natural; na aba Touchpad, tocar para clicar, rolar e clicar com dois dedos e desligá-lo enquanto se digita ou com um mouse ligado. As escolhas voltam a cada abertura e valem também para o mouse sem fio ligado depois. Fora do modo sistema, o Painel leva às configurações do sistema (no Windows e no macOS).

## 3. Programas

Iniciar › Configurações › "Adicionar ou remover programas" lista, na aba "Programas recomendados", os Craft por categoria. "Instalar" baixa a versão para navegador do lançamento oficial no GitHub (de 5 MB a 20 MB cada); depois disso, o programa funciona sem internet. "Atualizar" baixa a versão mais recente, e "Remover" apaga o programa sem tocar nos documentos.

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

### Programas do Linux (Flathub)

No Linux, "Adicionar ou remover programas" tem a aba "Programas do Linux": os mais usados e as categorias do Flathub, a pesquisa e a ficha de cada programa (descrição, captura, versão, licença e tamanho). A instalação é só para o usuário (`flatpak --user`), sem senha, e o programa novo entra nos Programas do computador. Sem o Flatpak, a aba explica como instalá-lo.

## 4. Claude Code

1. Dois cliques no ícone **Claude** da área de trabalho.
2. Se o Claude Code não estiver instalado, o Retro Computer oferece instalá-lo com o instalador oficial da Anthropic (o comando aparece antes de rodar).
3. Para entrar, há dois caminhos:
   - a conta da assinatura do Claude: o próprio Claude Code pede o acesso na primeira vez;
   - uma chave de API: Painel de controle › Claude › "Guardar". A chave é cifrada pelo cofre de senhas do sistema e só vai para o Prompt de comando, na variável `ANTHROPIC_API_KEY`.
4. O Claude abre na pasta `Meus documentos`. Para outra pasta, use o botão direito nela › "Abrir o Claude aqui".
5. O botão direito num arquivo › "Pedir ao Claude" abre o Claude já com o pedido: revisar o texto, resumir, traduzir (para o português, o inglês ou o espanhol) ou outro pedido escrito na hora; numa pasta, organizá-la. Antes, o Retro Computer guarda a versão de agora do arquivo (botão direito › "Versões anteriores…"), porque o Claude grava direto no disco. O pedido vai ao Claude por uma variável do terminal (`RETRO_PEDIDO`), sem passar pelo shell.

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
- Os programas do Linux (os da aba Programas do Linux e os outros) abrem em janelas comuns e aparecem na barra de tarefas, com os do Retro Computer: o clique traz para a frente ou minimiza, e o botão direito fixa e fecha.
- Painel de controle › **Atualizações do Linux** mostra o que há para atualizar (as de segurança marcadas), instala tudo (`apt-get upgrade`, que nunca remove pacotes, e `flatpak update`) com a senha de administrador e pode instalar sozinho as de segurança, todo dia (o `unattended-upgrades`). Um balão avisa, uma vez por dia, quando há atualizações.
- Os pendrives são montados sozinhos; ao bloquear, as janelas dos programas do Linux são minimizadas, e nenhuma fica por cima da tela de bloqueio.
- A área da tela (a resolução) e a luz noturna valem para o monitor inteiro (pelo `xrandr`); o chaveiro do Linux (o GNOME Keyring, aberto pela senha de entrada) guarda cifrados os cookies do Navegador e a chave do Claude.
- Se o Retro Computer parar com erro, a sessão o abre de novo.

Fora da sessão, o Retro Computer pode simplesmente abrir junto com o computador: Painel de controle › Aparência › Configurações › "Abrir o Retro Computer ao entrar no computador" (Windows, macOS e Linux).

## 8. Sugestões para as próximas versões

As ideias abaixo ainda não foram feitas; ficam registradas para decisão:

a) **Tema Mac clássico**, inspirado no Mac OS 9.2 (o visual "Platinum": as janelas cinza-claro com a barra de título listrada, a barra de menus no alto, a Lixeira no canto), escolhido no Painel de controle. Como em todo o projeto, nada da Apple: os ícones, as letras e as molduras são desenhados aqui (o tema "Cupertino" do SerenityOS, BSD-2-Clause, serve de ponto de partida para as cores).

b) **Várias telas**: a área de trabalho estendida por dois ou mais monitores, com a barra de tarefas em cada um.

c) **Papel de parede, esquemas de cores e cursores**: imagens de fundo, esquemas de cores das janelas (como os da época) e conjuntos de cursores, todos próprios ou do SerenityOS.

d) **Navegador focado**: uma janela de navegador com uma lista de "sites" permitidos (por exemplo, o portal do tribunal, a pesquisa de jurisprudência e o e-mail), sem abas infinitas.

h) **Cópia de segurança agendada** do disco C: para uma segunda pasta ou um disco externo.

i) **Instaladores assinados** (o caminho e os custos estão em [instalacao.md](instalacao.md), seção "Os avisos de segurança").

j) **Emulador de DOS embutido**: o motor do DOSBox (GPL) numa janela do Retro Computer, para abrir com dois cliques os jogos e programas de DOS guardados no disco C:, com o Micropolis (a versão aberta do SimCity) como exemplo. Até lá, no Linux, o DOSBox Staging pode ser instalado pela aba Programas do Linux.

k) **Áreas de trabalho virtuais** (como no Pop!_OS, no GNOME e no Windows 10): várias mesas, cada uma com as suas janelas.

l) **Programas do Windows pelo WINE** (como o "Windows App Support" do Zorin OS), junto do emulador de DOS.

m) **Enviar arquivos a outro computador da casa** (como o Warpinator do Linux Mint) e o celular ligado ao computador (como o KDE Connect).

A pesquisa das distribuições do Linux que deu origem a algumas destas ideias (e aos recursos da 1.0) está em [pesquisa-distribuicoes.md](pesquisa-distribuicoes.md).
