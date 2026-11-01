# Como usar o Retro Computer

Este documento descreve o uso no dia a dia. A arquitetura e as decisões técnicas ficam em [proposta.md](proposta.md).

## Em resumo

- O Retro Computer é um programa comum, instalado no Windows, no macOS ou no Linux (inclusive no Raspberry Pi). Ao abrir, ele ocupa a tela inteira e mostra um computador dos anos 90: área de trabalho, botão Iniciar, janelas e barra de tarefas.
- No Linux, ele também pode ser o próprio sistema do computador: a sessão "Retro Computer" da tela de entrada abre direto nele, sem a área de trabalho do Linux por baixo (seção 7). Assim, um notebook antigo ou um mini PC vira um computador retrô dedicado.
- Fala português, inglês e espanhol (Painel de controle › Idioma).
- O disco C: é uma pasta do computador principal (por padrão, `Documentos/Retro Computer`). Tudo o que se salva fica nela, visível também fora do programa.
- Os programas de trabalho (os Craft: WordCraft, GridCraft, DeckCraft, PdfCraft e outros) são instalados pela Loja de programas (no alto do menu Iniciar; no Painel de controle, "Adicionar ou remover programas") e rodam em janelas da área de trabalho. A mesma janela tem a loja do computador: o Flathub no Linux, o winget no Windows e o Homebrew no Mac.
- Vêm prontos: Navegador, E-mail, Visualizador de imagens, Reprodutor de mídia, Captura de tela, Monitor do sistema, Calculadora, Bloco de notas, Área de transferência (o histórico), Mapa de caracteres, Diário de trabalho, Foco (Pomodoro, cronômetro e temporizador), Leitor de PDF, Ferramentas de PDF, Digitalizar (o scanner), o Copiar o texto (OCR), Agenda, Notas autoadesivas, Receber do celular, Emojis, Prompt de comando, DOS, Mac Plus e cinco jogos (Paciência, Campo Minado, Breakout, Damas e Xadrez).
- A busca da barra de tarefas e o Localizar acham também pelo texto de dentro dos documentos (seção 2, "O Explorador").
- A Agenda guarda os compromissos num `.ics` do disco C:, com lembretes; as notas autoadesivas ficam na área de trabalho; as fotos do celular chegam pela rede local; e as janelas abertas voltam ao ligar de novo (seção 2, "Agenda, notas e celular").
- As janelas podem ficar em várias áreas de trabalho (Logotipo+Ctrl+D), com a Visão das tarefas (Logotipo+Tab); o painel de emojis abre com Logotipo+.; e o PC clássico tem esquemas de cores, também escuros, que podem trocar sozinhos no pôr do sol (seção 2, "A barra de tarefas" e "A área de trabalho").
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
| Marcar um compromisso | Iniciar › Programas › Acessórios › Agenda › Novo evento (ou um clique num dia do calendário do relógio) |
| Anotar algo rápido | Botão direito na área de trabalho › Nova nota autoadesiva |
| Passar fotos do celular | Iniciar › Programas › Acessórios › Receber do celular, e a câmera do celular no código QR |
| Sair de perto | Iniciar › Bloquear o computador (com uma senha em Painel de controle › Senhas) |
| Sair | Iniciar › Desligar (cada programa pergunta se há algo por salvar; as janelas abertas voltam na próxima vez) |

### A área de trabalho

- **Os ícones** de início: Meu computador, Meus documentos, a Lixeira, o Navegador, o E-mail e o Claude. Painel de controle › Aparência › **Ícones** liga e desliga os do sistema (também o Prompt de comando, o Painel de controle, o Bloco de notas e o Foco), com "Restaurar o padrão".
- **Outro programa**: botão direito nele, no menu Iniciar › "Adicionar à área de trabalho" (ou "Remover da área de trabalho"); o mesmo menu fixa o programa na barra de tarefas. Botão direito num ícone da área de trabalho › "Remover da área de trabalho".
- **Atalhos nas pastas**: o ícone de um programa arrastado da área de trabalho para uma pasta (o ícone dela ou a janela aberta) vira um arquivo de atalho dentro dela e sai da área de trabalho (com Ctrl, fica nos dois lugares; solto na Lixeira, só sai da área de trabalho). O arquivo é um texto pequeno, `Calculadora.atalho`, com a chave do programa (`Programa=calculadora`), e aparece com o ícone do programa, a setinha e o nome sem o `.atalho` (que volta sozinho ao renomear). Dois cliques abrem o programa; ele só aponta para os programas que o Retro Computer conhece, nunca para um caminho, e o de um programa removido avisa.
- **Os arquivos e as pastas** da área de trabalho ficam na pasta `Área de trabalho` do disco C:.
- **As cores**: Painel de controle › Aparência › Tema › **Esquema de cores**, com a prévia. Além do de sempre (Retro Computer), há sete claros (Areia, Ardósia, Berinjela, Musgo, Oceano, Tijolo e Rosa antigo) e quatro escuros (Noite, Meia-noite, Fósforo verde e Âmbar), que deixam as janelas, os campos e as listas escuros, com o texto claro. O fundo de sempre acompanha o esquema (um fundo escolhido pelo usuário fica). Os esquemas valem para o PC clássico; o Mac clássico tem as cores dele.
- **O modo escuro à noite**: no mesmo lugar, **Trocar à noite para** põe outro esquema (um escuro, como o Noite) do pôr ao nascer do sol, pela cidade de referência do fuso horário do computador (São Paulo, no fuso America/Sao_Paulo), sem perguntar onde o computador está; as horas de hoje aparecem ao lado. Também dá para escolher horas fixas (das 19h às 7h, por exemplo). O fundo de sempre de cada esquema acompanha a troca.

### A barra de tarefas

- **À esquerda**: o Iniciar, a caixa de busca (programas, opções do Painel de controle e arquivos do disco C:; com Enter, pesquisa na internet) e os programas fixados (de início, o Explorador de arquivos, o Navegador, o E-mail e o Bloco de notas). Botão direito num programa › "Fixar na barra de tarefas" ou "Desafixar".
- **Os botões das janelas** mostram o nome, como na época, ou só os ícones, agrupados por programa (botão direito na barra › Botões das janelas). O clique com a roda num botão abre outra janela do programa.
- **Arrastar para reorganizar**: os fixados e os botões das janelas mudam de lugar arrastando (o botão troca com o vizinho quando o ponteiro passa do meio dele, com o contorno pontilhado). A ordem dos fixados fica guardada; a das janelas e a dos programas abertos que não estão fixados vale até fechar o Retro Computer, e as janelas novas entram no fim.
- **As áreas de trabalho**: Logotipo+Ctrl+D (ou o botão direito na barra › Nova área de trabalho) cria uma área nova, Logotipo+Ctrl+← e → trocam de área, e Logotipo+Ctrl+F4 fecha a de agora (as janelas dela vão para a área do lado). A barra e o Alt+Tab mostram só as janelas da área à vista; com mais de uma, os botões 1, 2… ficam ao lado da bandeja (no tema Mac, ao lado do relógio). O botão direito no botão de uma janela › Mover para leva a janela para outra área. Até oito áreas; o Reabrir ao ligar devolve as áreas e cada janela para a sua. As janelas dos programas do Linux (no modo sistema) ficam em todas.
- **A Visão das tarefas** (Logotipo+Tab, ou o botão direito na barra): uma coluna por área, com as janelas dela; o clique leva à janela, e arrastar uma janela para outra coluna a leva para aquela área.
- **As propriedades** (botão direito na barra › Propriedades, ou Iniciar › Configurações › "Barra de tarefas e menu Iniciar"): a caixa de busca, a data, os botões das janelas e a ordem dos fixados.
- **A bandeja, à direita**: a rede (as redes Wi-Fi, no Linux), o volume (com a escolha da saída de som, quando há mais de uma), a bateria com o brilho da tela e a bateria do mouse e do teclado sem fio, o Bluetooth (no Linux), o sino das notificações com o "Não perturbe" e o relógio, que abre o calendário (botão direito › Mostrar a data). Em Painel de controle › Barra de tarefas e menu Iniciar › Ícones da bandeja, cada ícone pode ficar à vista ou escondido.

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
- **Formatar** (botão direito no pendrive): exFAT (lido pelo Windows, pelo Mac e pelo Linux), FAT32 (os aparelhos antigos) ou, no Windows, NTFS, com o rótulo; "Usar o pendrive inteiro" apaga todas as partições e cria uma só. Pede a confirmação e, no Linux, a senha de administrador; no Windows e no Mac, o próprio sistema confirma. Um pendrive que guarda o disco C: (o modo portátil) ou o próprio sistema não é formatado.

### A nuvem (Linux)

Iniciar › Programas › Acessórios › Nuvem conecta as contas do Google Drive, do OneDrive e do Dropbox pelo [rclone](https://rclone.org/) (1.56 ou mais novo) e pelo FUSE do Linux; sem eles, a janela oferece instalá-los pelo apt, com a senha de administrador.

- **Adicionar uma conta**: o navegador do computador abre na página do serviço, e o rclone recebe a autorização em `127.0.0.1` (a senha fica só com o serviço). As chaves de acesso ficam num `rclone.conf` só do Retro Computer, na pasta de dados do usuário (`nuvem/`, só para ele), separado do rclone do computador; a área de trabalho não as vê. Cancelar o login não deixa nada pela metade.
- **Conectada**, a conta aparece em Meu computador e na barra de pastas e funciona como um pendrive: dois cliques copiam o arquivo para `Meus documentos/Recebidos` e o abrem de lá; "Copiar para Meus documentos" traz uma cópia; arrastar do disco C: (ou "Colar aqui") leva uma cópia, com "(2)" no nome se já houver um igual. Nada é apagado nem gravado por cima na nuvem por aqui. As cópias vão direto para o serviço, sem fila guardada: desconectar logo depois de levar um arquivo não o perde.
- **Desconectar** (o botão direito na conta ou a janela Nuvem) tira a conta do Meu computador; "Conectar ao ligar o Retro Computer" a conecta na abertura. Sair, desligar ou trocar de usuário desconecta todas. Se a conexão cair, um aviso diz qual conta saiu.
- **Remover** esquece o acesso deste computador (a conta sai do `rclone.conf`); os arquivos continuam na nuvem.
- No Windows e no Mac, a janela só explica: lá, o programa do serviço no computador principal já põe as pastas dele em Meu computador › Computador principal.

### Discos

Iniciar › Programas › Acessórios › Discos (ou Painel de controle › Disco C: › Limpeza de disco…).

- **Pendrives e cartões**: os pendrives, os cartões e os HDs ligados pela USB, inteiros, com as partições (também as sem letra, como as de um pendrive com o Linux gravado). Formatar, remover com segurança e **Gravar imagem…**: uma `.iso` ou `.img` do disco C: (como a do Linux Mint) vai para o pendrive inteiro e é conferida pedaço a pedaço, com o andamento e o tempo que falta; Parar interrompe. Depois de gravado, o pendrive liga outro computador.
- **Espaço em disco**: quanto o disco C: ocupa, as pastas que mais ocupam e o espaço livre do computador. A **Limpeza de disco** apaga de vez, depois da confirmação, só o que for marcado: a Lixeira, as versões anteriores com mais de 30 dias, os arquivos temporários da Internet e as miniaturas do Explorador.
- Arquivo › Ferramenta de discos do sistema abre a do próprio sistema (o Gerenciamento de disco do Windows, o Utilitário de Disco do Mac, o Discos do GNOME), para o que o programa não faz.

### PDF, digitalização e OCR

- **Leitor de PDF** (Acessórios; dois cliques num PDF o abrem, e os outros programas que abrem PDFs ficam em Abrir com): as páginas pelo pdf.js, desenhadas só quando chegam perto da tela; a roda e o Page Up/Page Down passam as páginas; Ctrl+0 ajusta à largura, Ctrl+1 mostra no tamanho real, Ctrl+G vai a uma página; o texto se seleciona e se copia. **Destacar** pinta o texto selecionado (amarelo, verde, azul ou rosa; Ctrl+H com o texto já selecionado) e **Nota** põe uma nota no lugar do clique (arrastar move, dois cliques editam). A lista das marcas, à esquerda, leva a cada uma; o botão direito muda a cor, edita ou apaga; Ctrl+Z desfaz. Salvar (Ctrl+S) grava as marcas no próprio PDF, como anotações comuns (Highlight e Text, com a aparência pronta, que os outros leitores mostram), e guarda o arquivo de antes em Versões anteriores; Salvar como… grava uma cópia. O Leitor só tira as marcas que ele mostra (os destaques e as notas): as outras anotações e os formulários ficam como estavam. Num PDF com assinatura digital, ele avisa antes de gravar por cima (a assinatura deixa de valer; a versão assinada fica guardada); os PDFs protegidos contra mudanças só se leem, e os que pedem senha a pedem ao abrir.
- **Salvar como PDF**: no Bloco de notas, no Visualizador de imagens e no Navegador, Arquivo › Salvar como PDF… grava a página (a mesma da impressão) num PDF do disco C:, sem impressora. O papel segue o país (o Carta nos Estados Unidos, no Canadá e no México; o A4 nos outros).
- **Ferramentas de PDF**: o botão direito num PDF › Ferramentas de PDF separa as páginas (um PDF por página, numa pasta nova ao lado), extrai algumas (como `1-3, 5`) num PDF novo e gira todas; numa imagem, converte em PDF; em vários arquivos escolhidos, combina num PDF só. A janela Ferramentas de PDF (Acessórios) põe os PDFs e as imagens na ordem antes de combinar. O original não muda; o Girar grava por cima e guarda a versão anterior. Os PDFs com senha ou protegidos são recusados com aviso.
- **Copiar o texto (OCR)**: o botão direito numa foto, numa digitalização ou num PDF (no Visualizador de imagens, Editar) mostra o texto numa janela, para copiar ou salvar como `.txt`, em português, inglês ou espanhol. Nos PDFs, as páginas com texto dão o texto delas; as digitalizadas passam pelo OCR (o Tesseract), sem internet.
- **Digitalizar** (Acessórios): o scanner, a cor (colorido, tons de cinza, preto e branco) e a resolução; uma página por vez, e as páginas vão juntas para um PDF ou como imagens, com o OCR em seguida, se marcado. No Linux, pelo SANE (os scanners de rede pelo eSCL: os pacotes `sane-utils` e `sane-airscan`); no Windows, pelo WIA; no Mac, o botão abre a Captura de Imagem do sistema.
- O que lê arquivos de fora (o pdf-lib, o Tesseract, o pdf.js da busca) roda num processo separado, com tempo e memória limitados: um arquivo malfeito não trava a área de trabalho.

### Agenda, notas e celular

- **Agenda** (Acessórios): o mês à esquerda e os eventos do dia (ou dos próximos 30 dias) à direita. Cada evento tem o título, o local, o começo e o fim (ou o dia todo), a repetição (todo dia, toda semana, todo mês ou todo ano, até uma data), o lembrete e as anotações; num evento que se repete, mudar ou excluir pergunta se é só esta ocorrência ou todas. As setas passam o dia, Page Up e Page Down o mês, Home volta a hoje.
- **O arquivo**: `Meus documentos/Agenda.ics` (em inglês, `Documents/Calendar.ics`), o formato do Google Agenda, do Outlook e do Calendário do Mac; cada mudança guarda a versão anterior, e o arquivo mudado por outro programa é lido de novo antes de gravar. Abrir outro `.ics` importa os eventos dele (os do mesmo evento são atualizados; o arquivo de origem não muda). As repetições finas que a Agenda não sabe abrir (a última sexta-feira do mês, por exemplo) voltam no arquivo como vieram.
- **Os lembretes** aparecem mesmo com a Agenda fechada, numa janela com Adiar (de 5 minutos a 1 hora) e Descartar, e com o som do sino; com o "Não perturbe", só no sino da bandeja. O calendário do relógio marca os dias com eventos e mostra os de hoje; um clique num dia abre a Agenda nele. O Claude do Prompt vê e marca compromissos (agenda_ver e agenda_marcar).
- **Os calendários da internet** (Agenda › Arquivo › Calendários da internet): assinar um calendário pelo endereço `.ics` (`https://` ou `webcal://`), como o "Endereço secreto no formato iCal" do Google Agenda, o calendário publicado do Outlook ou o dos feriados. Os eventos aparecem na Agenda e no calendário do relógio com um globo, só para ler (dois cliques mostram os detalhes e Copiar para a Agenda faz uma cópia que se edita); os lembretes deles só com a opção do calendário. O processo principal baixa cada um a cada hora, só por https (um redirecionamento para http:// é recusado), sem cookies, com até 5 MB e 20 segundos, e guarda a cópia na pasta de dados do usuário, para valer sem internet. O endereço fica só no `config.json`: a área de trabalho, os registros e o Claude veem só o nome do site. Os horários marcados com o fuso de outro lugar vêm para a hora daqui.
- **Notas autoadesivas** (Acessórios, ou o botão direito na área de trabalho): papeizinhos entre os ícones e as janelas. Cada nota é um `.txt` em `Meus documentos/Notas autoadesivas`, que grava sozinho enquanto se escreve (a versão anterior fica, no máximo uma a cada dez minutos); o + cria outra, o … muda a cor (amarela, verde, azul, rosa, lilás ou branca) e abre no Bloco de notas, e o × manda a nota para a Lixeira. Pelo Iniciar, as notas vêm para a frente das janelas até o próximo clique fora delas ou o Esc.
- **Receber do celular** (Acessórios): o código QR (e o endereço) para o celular abrir, no mesmo Wi-Fi. O computador pergunta se aceita cada aparelho novo; aceito, as fotos e os arquivos entram em `Meus documentos/Recebidos`, sem gravar por cima de nada. O servidor só existe com a janela aberta, só na rede local, com um código novo a cada vez; desliga depois de 15 minutos sem uso ou de 20 tentativas com o código errado; não lê nada do computador; e aceita até 4 GB por arquivo e 20 GB por vez. No Linux com o firewall ligado, o celular pode não chegar.
- **Reabrir ao ligar**: as janelas abertas voltam na abertura seguinte, no mesmo lugar e do mesmo tamanho (o Explorador na pasta, o Bloco de notas, o Visualizador e o Reprodutor com o arquivo, o Navegador no endereço da aba; com "apagar os dados ao fechar", na página inicial). O Prompt, o Claude, o DOS e o Mac Plus ficam de fora. Painel de controle › Aparência › Configurações › "Reabrir as janelas que estavam abertas" desliga.

### O Explorador e as pastas compactadas

As pastas especiais têm o próprio ícone, como no Windows: Meus documentos, a Área de trabalho, o DOS e, em Meus documentos, Recebidos, o Diário de trabalho e as Capturas de tela; e as pastas de imagens, músicas, vídeos e downloads (pelo nome, nos três idiomas: "Imagens", "Músicas", "Vídeos", "Downloads"…), em Meus documentos ou no C:.

- **Exibir › Barra de pastas** (ou o botão Pastas) mostra a árvore à esquerda: o Acesso rápido, Meu computador, o disco C:, Meus documentos, a Área de trabalho, os pendrives e a Lixeira.
- **Acesso rápido**, no alto da árvore: as pastas fixadas (botão direito numa pasta › "Fixar no Acesso rápido"; no começo, a Área de trabalho e Meus documentos) e os arquivos usados por último. Uma pasta fixada renomeada ou movida pelo Retro Computer continua fixada.
- **Exibir › Painel de visualização** (Alt+P, ou o botão Visualizar) mostra à direita o arquivo escolhido, sem abrir o programa: o Word (`.docx`, convertido pelo mammoth), o texto do OpenDocument (`.odt`), o PDF (as páginas, pelo pdf.js, até 40), a primeira folha das planilhas (`.xlsx`, `.ods`, `.csv`, até 200 linhas), os textos, as fotos, os vídeos, as músicas e as páginas da internet salvas (numa moldura sem scripts e sem a internet). Numa janela estreita, o painel a alarga.
- **O endereço** fica em pedaços: cada nome leva àquela pasta. Um clique no espaço vazio ao lado (ou Alt+D, F4) vira o campo de texto.
- **Exibir › Miniaturas** mostra as fotos encolhidas.
- **As abas**: Ctrl+T abre uma aba nova, Ctrl+W fecha a aba, Ctrl+Tab (ou Ctrl+Page Down) passa para a próxima, e o botão direito numa pasta tem "Abrir em nova aba". Cada aba guarda a pasta e o histórico dela; a faixa das abas só aparece com duas ou mais.
- **A visualização rápida**: a barra de espaço num arquivo abre o painel de visualização grande; as setas passam para o arquivo do lado (a seleção vai junto), Enter abre no programa, e a barra de espaço ou o Esc fecham.
- **A busca pelo conteúdo**: a caixa de busca da barra de tarefas ("Dentro dos arquivos", com o trecho achado) e o Localizar (o campo "Contendo") procuram dentro dos textos, do Word, do OpenDocument, das planilhas, das apresentações e dos PDFs, sem acento e sem diferença de maiúsculas, com todas as palavras (ou a frase entre aspas). O texto de cada documento fica num índice na pasta de dados do usuário, refeito aos poucos quando o disco muda; Painel de controle › Disco C: › Busca o desliga, e desligar apaga o índice.
- **O programa de cada tipo de arquivo**: botão direito num arquivo › Abrir com › "Escolher o programa…", com "Sempre usar este programa para abrir os arquivos .docx" marcado (também o programa do computador principal). A lista dos escolhidos fica em Painel de controle › Programas padrão (Mudar, Voltar ao normal e Novo tipo). Um Craft escolhido que sair do computador deixa o tipo com o programa de sempre.
- **Um `.zip` abre como pasta** (só para ver). Botão direito › "Extrair tudo…" cria uma pasta nova ao lado, sem gravar por cima de nada; os `.tar` (`.tar.gz`, `.tgz`, `.tar.xz`, `.tar.bz2`) também se extraem. Para compactar: Enviar para › Pasta compactada (zip).

### Internet

- **Navegador do Retro Computer** (Iniciar › Programas, quando o Firefox é o padrão; sem o Firefox, também o E-mail e os sites instalados como programas): as abas (o "+", Ctrl+T, o clique com a roda num link, Ctrl+Tab, Ctrl+W e Ctrl+Shift+T), os favoritos na barra logo abaixo do endereço (a estrela, Ctrl+D; Exibir › Barra de favoritos, Ctrl+Shift+B; arrastar muda a ordem), a página inicial das abas novas (o fundo azul com losangos; a cor e o padrão mudam em Painel de controle › Internet › Página inicial, à parte dos da área de trabalho), pesquisa, janelas novas, zoom, Localizar e Imprimir; os downloads vão para `Meus documentos/Recebidos`. A barra de status vem escondida (Exibir › Barra de status), e o endereço do link sob o mouse aparece no canto da página. A tela cheia de um site ocupa a tela inteira, também a de um vídeo de outro site dentro da página (o Vimeo numa página de curso), e o Esc sai dela. O vídeo em janela flutuante (o botão direito no vídeo, ou Exibir › Vídeo em janela flutuante, Ctrl+Shift+P) fica por cima de tudo, também com o Navegador minimizado. A câmera, o microfone, a localização, as notificações e o compartilhamento da tela pedem permissão, site a site. O "Entrar com Google/Microsoft" abre na janelinha de costume. O login do Google recusa alguns navegadores embutidos: nas páginas de login, o Navegador se apresenta como o Firefox e, se o Google recusar (a página `…/signin/rejected`), passa a se apresentar como o Chrome da mesma versão do Chromium (o agente e as marcas dele) e recomeça o login; o jeito que deu certo fica guardado. Recusado dos dois jeitos, ele sugere o Firefox de verdade como navegador padrão.
- **Firefox, o navegador padrão**: com o Firefox instalado, o ícone Navegador e os links dos programas abrem nele, com o visual do Navegador do Retro Computer (o `userChrome.css` gerado a cada abertura: a barra de menus, as abas retas, os ícones de 16 pontos, o campo do endereço afundado, a barra de favoritos, o cinza, as bordas em relevo e a fonte Katica; quem esconder a barra de menus ou a de favoritos pelo próprio Firefox não as vê voltar) e um perfil próprio (o Firefox de sempre do usuário fica como está). As escolhas do Painel valem para ele: os downloads em `Meus documentos/Recebidos`, só conexões seguras, apagar os dados ao fechar e o tamanho dos pixels (o mesmo da área de trabalho, sem aumentar além dele). No Linux, a janela dele aparece na barra de tarefas como a do Navegador. Painel de controle › Internet escolhe o navegador padrão (o Firefox, o Navegador do Retro Computer ou, fora do modo sistema, o do computador principal) e, no Linux sem o Firefox, o instala pelo Flathub.
- **Vídeos**: os sites comuns (YouTube e outros) tocam nos dois. Os serviços com proteção contra cópia (Netflix, Prime Video, Disney+, o Spotify na web) tocam só no Firefox, porque o Electron não traz o Widevine (o Firefox o baixa sozinho). Quando a página pede o Widevine (ou o PlayReady, ou o FairPlay) no Navegador do Retro Computer e recebe a recusa, a faixa amarela no alto da página oferece abri-la no Firefox (sem ele, no navegador do computador principal; no modo sistema, instalar o Firefox); "Não avisar neste site" a desliga para aquele endereço. Na página de um vídeo comum do YouTube, a faixa não aparece. Arquivos de vídeo em HEVC (H.265) e AVI também não tocam no Reprodutor de mídia.
- **E-mail**: o e-mail da web escolhido na primeira vez, numa janela própria.
- **Sites como programas**: no Navegador do Retro Computer, Arquivo › "Instalar como programa…". O site ganha ícone, janela própria sem a barra de endereço (com o mesmo login do Navegador) e lugar no menu Iniciar, na área de trabalho e, se escolhido, na barra de tarefas. Com o Firefox como navegador padrão, o programa e o E-mail abrem numa janela nova do Firefox, com os logins de lá (o Google recusa o login no navegador embutido). Para desinstalar: o menu Página da janela dele ou Painel de controle › Internet › Programas da internet.

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
| Leitor de PDF | Ler os PDFs, destacar trechos e pôr notas, com o original guardado como versão anterior (mais na seção "PDF, digitalização e OCR") |
| Ferramentas de PDF | Combinar PDFs e imagens na ordem escolhida; com um PDF escolhido, separar, extrair páginas e girar (mais na seção "PDF, digitalização e OCR") |
| Digitalizar | O scanner de mesa ou o multifuncional: as páginas, uma por vez, num PDF ou como imagens, com o OCR em seguida |
| Agenda | Os compromissos, com a repetição e os lembretes, num `.ics` do disco C: (mais na seção "Agenda, notas e celular") |
| Notas autoadesivas | Os papeizinhos da área de trabalho, cada um num `.txt` |
| Receber do celular | As fotos e os arquivos do celular pela rede local, com o código QR |
| Emojis (Logotipo+. ou Logotipo+;, ou o botão direito num campo de texto › Emojis…) | O painel de emojis: a busca pelo nome em português, inglês e espanhol (sem precisar dos acentos), as categorias e os usados há pouco; um clique põe o emoji no campo com o foco (um campo, um programa, o Prompt ou o Navegador) e, sem campo, na área de transferência. Os desenhos são os da fonte Noto Color Emoji, que vai junto com o Retro Computer e também desenha os emojis nos campos de texto |
| Calculadora, Bloco de notas, Prompt de comando | Os de sempre |
| DOS | O DOSBox (do js-dos), sem internet: a unidade C: é a pasta C:\DOS do disco; dois cliques num .com, .bat ou .exe do DOS o abrem; o que mudar volta ao disco ao fechar (com a versão anterior guardada e os apagados na Lixeira). No Linux, com o DOSBox do próprio Linux instalado (o DOSBox Staging da Loja ou `sudo apt install dosbox`), ele roda nele, bem mais rápido, numa cópia da pasta que volta ao disco do mesmo jeito (Opções › Usar o DOSBox do Linux) |
| Mac Plus | O PCE.js, um emulador do Macintosh da época, em preto e branco e sem internet, para jogos como o SimAnt. Nada da Apple vem junto: a pasta C:\Mac recebe a ROM do Mac do usuário (o arquivo .rom de 128 KB do Mac Plus, de 256 KB do Mac SE ou de 512 KB do Mac Classic), o disquete do Sistema (o System 6 ou o 7) e os dos jogos (.dsk, .img ou .image, do Disk Copy 4.2). O disco com System, Sistema ou Boot no nome vai na primeira unidade; dois cliques num .dsk ou .image abrem o Mac com ele. A tecla Alt é a Command, e a Ctrl, a Option. O que o Mac gravar volta ao disco ao fechar (a versão de antes de ligar o Mac fica guardada) |
| Jogos | Paciência, Campo Minado, Breakout, Damas (as regras brasileiras ou as inglesas) e Xadrez, contra o computador (três níveis) ou entre duas pessoas; a partida fica guardada ao fechar |

### Senha e bloqueio

Painel de controle › Senhas cria a senha da tela de bloqueio. Com ela, Iniciar › Bloquear o computador cobre a tela até a senha ser digitada; a senha é pedida também ao abrir o Retro Computer (como no Windows, desde a 1.1) e ao voltar da suspensão (ou ao fechar a tampa) e, se escolhido, ao sair da proteção de tela. A senha fica guardada só como resumo (PBKDF2). No Linux, a senha de entrada do Linux também desbloqueia.

No Retro Computer como sistema (desde a 2.0), a senha de entrada do Linux basta para bloquear, mesmo sem a do Retro Computer (só com a conta do Linux com senha, pelo `passwd -S`; sem ela, nada bloqueia): ao fechar a tampa (também com a tampa em "Não fazer nada"), antes de suspender, na volta da suspensão e ao sair da proteção de tela (o padrão no modo sistema; Painel de controle › Senhas o desliga). A suspensão espera a tela de bloqueio aparecer (uma trava "delay" do logind, pelo `systemd-inhibit`, de até 2 segundos), para a área de trabalho não aparecer por um instante ao abrir a tampa. O "Pedir ao abrir" continua só com a senha do Retro Computer: a do Linux acabou de ser pedida na tela de entrada (com a entrada automática, crie uma senha do Retro Computer para pedir ao ligar).

Com a entrada automática (Painel de controle › Aparência › Configurações › entrar direto no Retro Computer), o chaveiro do Linux, o GNOME Keyring, que guarda os cookies do Navegador e a chave do Claude, fica trancado: nenhuma senha foi digitada na tela de entrada. Desde a 2.0.1, o Retro Computer vê isso ao abrir, sem perguntar nada ao chaveiro, e pede a senha de entrada do Linux numa caixa dele (o "Chaveiro do Linux"); com ela, o chaveiro abre pelo mesmo caminho da tela de entrada. A senha que desbloqueia a tela de bloqueio também o abre. Cancelada a caixa, nada pede a senha por trás: a chave do Claude espera (Painel de controle › Claude › Abrir o chaveiro…), e a Central de segurança mostra "Chaveiro trancado". Antes, a caixa do próprio Linux aparecia e parava o Retro Computer até ser respondida: a tela não se redesenhava, e arrastar a caixa deixava rastros.

### Vários usuários

Painel de controle › Usuários › Novo usuário cria outra pessoa no mesmo Retro Computer. Cada usuário tem a área de trabalho, as configurações (o fundo, a barra, o menu Iniciar, os sons), os favoritos e os cookies do Navegador, o Diário, a senha da tela de bloqueio e o disco C: próprios: o disco dele é uma pasta ao lado da do usuário principal ("Retro Computer - Ana"; no modo portátil, "Disco C - Ana"), e a pasta de dados fica dentro da principal. Os programas instalados (os Craft e os do Windows) são de todos.

Com mais de um usuário, o Retro Computer pergunta quem vai usar ao abrir (dá para desligar a pergunta na mesma caixa) e pede a senha de quem tiver. Iniciar › Fazer logoff, ou a opção "Fechar todos os programas e entrar como outro usuário" da caixa Desligar, fecha os programas (cada um pergunta se há algo por salvar) e volta à tela de entrada. Tirar um usuário só o tira da lista: a pasta de dados e o disco C: dele ficam onde estão, e a caixa mostra onde. Os usuários separam as áreas de trabalho de quem divide o computador; eles não escondem os arquivos de quem usa o computador principal.

### Segurança e privacidade

Painel de controle › **Segurança** mostra o estado de cada proteção, com o botão que leva à configuração dela: a senha da tela de bloqueio, o firewall e as atualizações de segurança automáticas (no Linux) e como a chave do Claude está guardada (cifrada pelo cofre de senhas do sistema; no Linux sem chaveiro, só embaralhada, com o aviso em vermelho). A aba Privacidade tem:

- **Só conexões seguras (HTTPS)** no Navegador (ligada): os endereços `http://` abrem na versão segura; o site que não a tiver mostra um aviso, com a escolha de abri-lo assim mesmo (até fechar o Retro Computer). Os aparelhos da rede de casa (o roteador, a impressora) ficam de fora.
- **Bloquear propagandas e rastreadores** no Navegador (ligada): os pedidos às redes de anúncios e de rastreamento conhecidas são cancelados, e os espaços vazios dos anúncios somem da página. A página aberta nunca é bloqueada, só o que ela carrega. Se um site não funcionar bem, Exibir › Permitir as propagandas neste site o deixa de fora (e recarrega a página); Exibir › Bloquear propagandas liga e desliga tudo. Os anúncios dentro dos vídeos do YouTube, que vêm do próprio YouTube, podem continuar. Com o Firefox como navegador, vale a proteção contra rastreamento dele.
- **Apagar os dados de navegação ao fechar** (desligada): os cookies, os dados dos sites e os arquivos temporários do Navegador.
- **O histórico da área de transferência** (ligado).

Painel de controle › **Cópia de segurança** copia o disco C: inteiro, com a Lixeira e as versões anteriores, para outra pasta (um disco externo, um pendrive, a pasta de uma nuvem do computador principal), todo dia ou toda semana, ou na hora ("Fazer a cópia agora"). Ela fica numa pasta "Cópia do Retro Computer" dentro do destino e só acrescenta e atualiza: um arquivo excluído do disco C: continua na cópia. Com o destino desligado, a cópia espera e é feita quando ele voltar; o fim (ou o erro) aparece num aviso.

No Linux, Painel de controle › **Firewall** liga o firewall do sistema (o `ufw`, que o pacote do Retro Computer recomenda): ele recusa as conexões que chegam de outros computadores, e a internet continua como antes. Ligar e desligar pedem a senha de administrador.

**O antivírus sob demanda**: botão direito num arquivo, numa pasta, no disco C: ou num pendrive › "Verificar com o antivírus" (ou Painel de controle › Segurança › Verificar…). No Linux, ele usa o ClamAV (o `clamscan`; a janela o instala com a senha de administrador, se faltar, e atualiza as definições); no Windows, o Microsoft Defender (o `MpCmdRun`, sem deixar que ele apague nada); no macOS, o próprio sistema verifica os arquivos (o XProtect). Nada é apagado: o que for achado aparece na lista, e os do disco C: podem ir para a Lixeira.

### A tela e a energia

- **Tema** (Painel de controle › Aparência › Tema): o **PC clássico**, o de sempre, ou o **Mac clássico**, inspirado no Mac OS 9.2. No Mac clássico, a barra de tarefas dá lugar à barra de menus no alto da tela: o logotipo abre o menu Iniciar (a tecla do logotipo também); os menus da janela da frente sobem para ela (com a área de trabalho na frente, os dela: Arquivo, Editar, Exibir, Especial, com o Esvaziar a Lixeira, e Ajuda); e, à direita, como no Mac da época, ficam só o relógio e o menu dos programas abertos (o da frente, a troca entre eles, Ocultar, que minimiza, e Mostrar todas). As janelas têm o título listrado, a caixa de fechar à esquerda e as de aumentar e recolher à direita; o duplo clique no título recolhe a janela (só o título fica). No canto de baixo, à esquerda, a Faixa de controle traz os programas fixados na barra de tarefas, a lupa da busca (um clique abre o campo) e os ícones da bandeja (a rede, o volume, a bateria e as notificações); como no Mac da época, ela começa recolhida, só com a ponta à vista, e abre com um clique na ponta (ou fica aberta, pelo Painel › Barra de tarefas e menu Iniciar). Os ícones da mesa começam do canto de cima, à direita, com a Lixeira no de baixo (as posições de cada tema ficam à parte), e o tema tem ícones próprios, desenhados ponto a ponto no estilo da época (`ferramentas/icones-mac.py`). Ao trocar de tema, o fundo de sempre de um vira o do outro; um fundo escolhido pelo usuário fica. Cada usuário tem o seu tema.
- **Papel de parede** (Painel de controle › Aparência › Plano de fundo): a cor, o padrão 8×8 e, se quiser, uma imagem sua. "Procurar…" escolhe uma imagem do disco C: (PNG, JPEG, GIF, WebP ou BMP, conferida pelo conteúdo, até 50 MB), e o "Ajuste" a deixa centralizada (um pixel dela por pixel do monitor, com a cor e o padrão em volta), lado a lado ou preenchendo a tela sem deformar. O botão direito numa imagem do Explorador › "Usar como papel de parede" faz o mesmo. O Retro Computer guarda uma cópia na pasta de dados do usuário (`papeis-de-parede`): o fundo continua se o arquivo do disco for movido ou apagado, e "Remover…" tira só a cópia. Cada usuário tem os seus.
- **Luz noturna** (Painel de controle › Aparência › Efeitos): as cores mais quentes, com menos azul, do pôr ao nascer do sol (pelo fuso horário, como o modo escuro), das 20h às 7h (as horas se escolhem) ou o dia todo, na intensidade escolhida. No Retro Computer como sistema, ela vale também para os programas do Linux.
- **Cantos magnéticos** (Aparência › Efeitos, ligados): arrastar a janela até a borda a encaixa; a tecla do logotipo com as setas faz o mesmo. No Retro Computer como sistema, valem também nas janelas dos programas do Linux (o Firefox, o LibreOffice): o contorno aparece na borda, e a janela encaixa ao soltar; arrastada de novo, volta ao tamanho de antes.
- **Área da tela** (Aparência › Configurações, no Retro Computer como sistema): a resolução do monitor; se a tela nova não aparecer bem, ela volta à anterior em 15 segundos.
- **Várias telas** (Aparência › Configurações, com dois monitores): no Retro Computer como sistema, duplicar, estender ou mostrar só numa delas (pelo `xrandr`, com a mesma pergunta de manter). Estendidas, o Retro Computer fica na tela principal, a outra mostra a cor da área de trabalho, e os programas do Linux podem ir para ela. Fora do modo sistema (Windows e Mac), a lista escolhe em qual monitor o Retro Computer abre, ou "Usar as duas telas na tela cheia" faz a área de trabalho cobrir todos os monitores: os ícones ficam na tela principal; cada tela tem o papel de parede inteiro e a sua barra de tarefas (Painel › Barra de tarefas › "Mostrar a barra de tarefas em todas as telas", ligada por padrão: a da principal mostra todas as janelas, os fixados, a busca e a bandeja; a de cada outra tela, o Iniciar, as janelas que estão nela e o relógio); as janelas vão de uma tela para a outra arrastadas e maximizam e encaixam na tela em que estão; e o vídeo em tela cheia fica no monitor do ponteiro. No Windows, a área de trabalho cobre os monitores sem a tela cheia do sistema (a tela cheia do Windows prende a janela num monitor só), com a barra de título acima deles, fora da vista; com monitores de escalas diferentes (o notebook a 125% e o monitor a 175%), o Retro Computer abre de novo e mede as duas telas em pixels de verdade. No Mac, a janela só cobre os dois monitores com "Monitores têm Spaces separados" desligado em Ajustes do Sistema › Mesa e Dock.
- **Modo de energia** (a caixa da bateria, no Linux com o `power-profiles-daemon`): economia de energia, equilibrado ou desempenho.

### Acessibilidade

Painel de controle › **Opções de acessibilidade**, com as abas da época:

- **Vídeo**: o **alto contraste** (o fundo escuro e as letras claras; as fotos, os vídeos e os programas mantêm as cores) e a **lupa**: logotipo + "+" amplia a tela inteira em volta do ponteiro (150%, 200%, 300% e 400%), logotipo + "-" diminui e logotipo + Esc fecha. O ponto debaixo do ponteiro é o mesmo de sem a lupa: para ver a beira da tela, basta levar o ponteiro até ela.
- **Mouse**: o **cursor grande** (os cursores do SerenityOS em dobro) e, no Retro Computer como sistema, as **teclas do mouse** (o teclado numérico move o ponteiro).
- **Som**: os **avisos visuais**: quando o sistema toca um som, a barra de título, a janela ativa ou a tela inteira piscam (também com os sons desligados).
- **Teclado**: no Retro Computer como sistema, as **teclas de aderência** (Shift, Ctrl, Alt e o logotipo valem para a próxima tecla; duas vezes seguidas, ficam travadas). Fora dele, valem as do computador principal (o botão abre as configurações do Windows ou do macOS).
- Para deixar tudo maior de vez: Aparência › Configurações › Tamanho dos pixels (de 1 a 4, com os do meio: 1,25, 1,5, 1,75 e 2,5; cada opção mostra a área que a tela fica tendo; os inteiros deixam as letras mais nítidas).

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

### Os Craft instalados no Windows

No Windows, a aba **Craft do Windows** mostra os Craft instalados no próprio Windows pelos instaladores oficiais (`.msi`), fora do Retro Computer, com a versão de cada um. Eles não se atualizam sozinhos; aqui, "Atualizar" faz o mesmo que se faz à mão:

1. Reconhece no registro do Windows os Craft do catálogo do fabricante oficial (Learning Machines LLC) e o processador do instalado (x64, x86 ou ARM64, pelo próprio executável).
2. Compara a versão com o último lançamento oficial no GitHub (a busca fica guardada por 6 horas) e baixa o `.msi` desse processador.
3. Confere o resumo SHA-256 publicado pelo GitHub (sem ele, nada é instalado) e a assinatura digital do Windows, que tem que ser a do mesmo fabricante do programa instalado.
4. O Windows pede a confirmação de administrador (os Craft se instalam para todos os usuários). O processo de administrador copia o instalador para uma pasta que só o administrador muda, confere de novo o resumo e a assinatura e roda o instalador oficial, sem modificação.

Nunca volta uma versão nem instala um Craft que não estava instalado, e as cópias portáteis (`.zip`) ficam de fora. Feche o programa antes de atualizar. Uns 20 segundos depois de ligar, o Retro Computer avisa quando há versão nova (com "não procurar atualizações", não procura).

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

O corretor ortográfico (Painel de controle › Idioma › Ortografia) sublinha as palavras erradas nos campos de texto: no Bloco de notas, nas notas, na Agenda, no Navegador e nos programas Craft. O botão direito na palavra mostra as sugestões e o "Adicionar ao dicionário", com o Recortar, o Copiar e o Colar. Ele começa no idioma da interface, e dá para marcar mais de um (português, inglês e espanhol). Os dicionários são os do Hunspell que o Chromium usa, e vão junto com o Retro Computer: nada é baixado. No Mac, o corretor é o do próprio Mac, que reconhece o idioma sozinho.

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
| Ctrl+T, Ctrl+W, Ctrl+Tab | Abrir, fechar e trocar as abas do Explorador (e do Navegador) |
| Barra de espaço | A visualização rápida do arquivo escolhido no Explorador (as setas passam para o do lado) |
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
| Logotipo+Tab | A Visão das tarefas (as áreas de trabalho e as janelas de cada uma) |
| Logotipo+Ctrl+D, Logotipo+Ctrl+← e →, Logotipo+Ctrl+F4 | Criar uma área de trabalho, trocar de área e fechar a de agora |
| Logotipo+. ou Logotipo+; | O painel de emojis |
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
- Os programas do Linux (os da aba Programas do Linux e os outros) abrem em janelas comuns e aparecem na barra de tarefas, com os do Retro Computer: o clique traz para a frente ou minimiza, e o botão direito fixa e fecha. O ponteiro do mouse é o mesmo da área de trabalho também dentro deles e nas bordas das janelas (não o do tema do Linux).
- As teclas de função do computador portátil valem com qualquer janela na frente, também a de um programa do Linux: o brilho da tela, a **luz do teclado** (no MacBook, F5 e F6; a tecla de acender e apagar dos outros; o deslizante fica também na caixa da bateria, na bandeja), a mídia (voltar, tocar ou pausar e avançar vão para o programa que está tocando: o Firefox, o Navegador, o Reprodutor de mídia), a Visão das tarefas (o F3 do MacBook), o Iniciar (o F4) e a Calculadora. O Openbox pega as teclas e as passa ao Retro Computer. O **botão de ligar** abre a caixa Desligar, em vez de desligar de uma vez sem salvar nada; com a tela bloqueada, ele suspende o computador. Segurar o botão por alguns segundos ainda desliga à força.
- Painel de controle › **Atualizações do Linux** mostra o que há para atualizar (as de segurança marcadas), instala tudo (`apt-get upgrade`, que nunca remove pacotes, e `flatpak update`) com a senha de administrador e pode instalar sozinho as de segurança, todo dia (o `unattended-upgrades`). Um balão avisa, uma vez por dia, quando há atualizações.
- Os pendrives são montados sozinhos; ao bloquear, as janelas dos programas do Linux são minimizadas, e nenhuma fica por cima da tela de bloqueio.
- A área da tela (a resolução) e a luz noturna valem para o monitor inteiro (pelo `xrandr`); o chaveiro do Linux (o GNOME Keyring, aberto pela senha de entrada) guarda cifrados os cookies do Navegador e a chave do Claude.
- Se o Retro Computer parar com erro, a sessão o abre de novo.

Fora da sessão, o Retro Computer pode simplesmente abrir junto com o computador: Painel de controle › Aparência › Configurações › "Abrir o Retro Computer ao entrar no computador" (Windows, macOS e Linux).

## 8. Sugestões para as próximas versões

As ideias abaixo ainda não foram feitas; ficam registradas para decisão:

a) **Mais ícones no tema Mac clássico** (o tema entrou na 1.4): os programas que ainda usam o ícone do tema do PC (os acessórios, os jogos, os Craft), desenhados no mesmo estilo.

b) **Esquemas de cores e cursores**: esquemas de cores das janelas (como os da época) e conjuntos de cursores, todos próprios ou do SerenityOS (as imagens próprias como papel de parede entraram na 1.2).

c) **Instaladores assinados** (o caminho e os custos estão em [instalacao.md](instalacao.md), seção "Os avisos de segurança").

d) **Áreas de trabalho virtuais** (como no Pop!_OS, no GNOME e no Windows 10): várias mesas, cada uma com as suas janelas.

e) **Enviar arquivos a outro computador da casa** (como o Warpinator do Linux Mint) e o celular ligado ao computador (como o KDE Connect).

f) **As várias telas no Retro Computer como sistema**: com as telas estendidas, a área de trabalho e a barra de tarefas nas duas, como as duas telas na tela cheia do Windows e do Mac (hoje o Retro Computer fica na principal, e a outra é dos programas do Linux).

A pesquisa das distribuições do Linux que deu origem a algumas destas ideias (e aos recursos da 1.0) está em [pesquisa-distribuicoes.md](pesquisa-distribuicoes.md).
## Aprender a programar

Em **Iniciar › Programas › Acessórios › Laboratório de programação**, escolha C, C++, C#, Python, Rust ou Java. C tem sete lições, com explicações e desafios: mensagens, variáveis, entrada, decisões, repetições, funções, vetores e ponteiros. As outras linguagens têm exemplos editáveis e um desafio inicial.

O botão **Preparar linguagem** procura a ferramenta e mostra o que instalar:

| Linguagem | Ferramenta |
|---|---|
| C e C++ | GCC ou Clang: Command Line Tools no Mac (`xcode-select --install`), MSYS2 UCRT64 no Windows, `build-essential` no Debian/Ubuntu/Mint |
| C# | .NET SDK 6 ou mais novo, de `dotnet.microsoft.com/download` |
| Python | Python 3, de `python.org`, ou `sudo apt install python3` no Linux |
| Rust | Rust com rustup, de `rustup.rs`; no Windows, também as ferramentas de C++ pedidas pelo instalador |
| Java | JDK, como o Eclipse Temurin de `adoptium.net`, com `javac` e `java` no PATH ou `JAVA_HOME` definido |

No Mac M4, escolha as ferramentas **Arm64**. No Windows, para C/C++, instale o MSYS2 na pasta padrão e execute `pacman -S mingw-w64-ucrt-x86_64-gcc` no terminal UCRT64. Depois de instalar uma linguagem e mudar o PATH, feche e abra o Retro Computer.

Escreva o código no editor, preencha **Entrada do programa** com os dados que ele vai ler e pressione **F5**. A saída, os avisos e os erros aparecem embaixo. A entrada é enviada inteira e depois fechada; para uma conversa interativa ou um projeto maior, use o **Prompt de comando** com as mesmas ferramentas. Em Java, a classe pública precisa se chamar `Main`.

**Ctrl+S** guarda um arquivo comum do disco C:. Gravar de novo mantém a versão anterior; abrir um arquivo `.c`, `.cpp`, `.cc`, `.cxx`, `.cs`, `.py`, `.rs` ou `.java` seleciona a linguagem correspondente. Nada depende de uma conta ou de um serviço de compilação na internet. Os compiladores e interpretadores são instalados à parte.

Os exercícios usam a biblioteca padrão, sem dependências externas ou projetos de vários arquivos. Cada execução usa uma pasta temporária nova: os arquivos criados pelo exercício nela são temporários. O código-fonte só fica permanente quando salvo no disco C:. Há um prazo de 30 segundos para compilar, cinco segundos para executar, saída limitada a 64 KiB e o botão **Parar**. Esses limites não são uma sandbox: o programa tem as permissões do usuário no computador. Execute apenas código em que confia.

## Codex

O **Codex**, no menu Iniciar e na área de trabalho padrão, abre o Codex CLI numa janela retrô, como o Claude Code. Ele começa em Meus documentos; no botão direito de uma pasta, **Abrir o Codex aqui** começa nessa pasta. A fonte, o fundo claro ou escuro, Copiar e Colar funcionam como no Prompt.

Se o CLI não estiver instalado, a janela mostra o comando e o botão **Instalar agora**. No Windows, usa `winget install --id OpenAI.Codex --exact --source winget`, com o executável oficial da OpenAI e a verificação do pacote pelo winget. Isso evita a incompatibilidade do instalador PowerShell com `OSArchitecture`. Se o winget estiver ausente, instale ou atualize o **Instalador de Aplicativo** pela Microsoft Store. No Mac e no Linux, usa o instalador oficial da OpenAI. Depois de concluir a instalação, abra o ícone Codex novamente. Não é preciso instalar o aplicativo de desktop da OpenAI: esta integração usa o CLI nativo no Windows, no Mac e no Linux. O instalador oficial também serve para atualizar o CLI; no Windows, use `winget upgrade --id OpenAI.Codex --exact --source winget`. O Retro também procura os caminhos de instalação do winget e do instalador autônomo antes de o aplicativo reler o PATH.

Na primeira abertura, siga o login do próprio Codex com sua conta do ChatGPT. **Conta e opções…** oferece **Entrar**, **Entrar com código…** e **Retomar conversa**. O login com código pode exigir que você o habilite nas configurações de segurança da conta; o login normal continua disponível. Credenciais e sessões ficam com o Codex, fora do disco C:; o Retro Computer não lê os arquivos de autenticação nem usa a chave do Claude. Os métodos disponíveis e os limites de uso seguem a sua conta. Veja a [documentação oficial](https://developers.openai.com/codex/cli).

No botão direito de um arquivo, **Pedir ao Codex** oferece revisar, resumir, traduzir ou escrever outro pedido. A versão de agora é guardada antes de abrir o agente. Para pastas, há também um pedido de organização. O pedido chega como texto, mesmo com aspas ou símbolos do terminal.

Em **Conta e opções…**, **Permitir que o Codex ajuste o Retro Computer** conecta o mesmo servidor MCP usado pelo Claude: aparência, atalhos, programas e Agenda, com as mesmas restrições. Desmarcar vale para as próximas janelas; feche uma sessão já aberta para retirar o acesso dela. As configurações temporárias não mudam o config.toml do Codex. As permissões de execução e as confirmações continuam sendo as do CLI; nenhuma proteção é desligada pelo Retro Computer.

## Dot da OpenAI

**Dot**, no Iniciar e na área de trabalho padrão, dá acesso ao agente sempre ativo da sua conta do ChatGPT, além do Codex. **Abrir meu Dot** abre `https://chatgpt.com/dots` no **Navegador integrado do Retro Computer**, mesmo quando os outros links estão configurados para um navegador externo. É o seu Dot existente, com o login e as condições de acesso da sua conta na página oficial. A ajuda também abre dentro do Retro. A página permanece isolada da ponte de comandos do sistema, como os outros sites. O recurso depende da disponibilidade do Dot na conta e região.

Para o Dot trabalhar no computador local, use **Abrir o aplicativo ChatGPT**. No aplicativo oficial, entre na sua conta e vá ao perfil do Dot › **Computadores › Seu computador › Permitir acesso**. Revise a confirmação nessa tela e mantenha o computador conectado e o ChatGPT aberto enquanto ele trabalha. Se o aplicativo não estiver instalado, a janela explica como obtê-lo em `chatgpt.com/download`.

**Mostrar a pasta do disco C:** abre a pasta real dos seus documentos. Ela pode ser usada nas tarefas do Dot depois que você autorizar a conexão no ChatGPT. O acesso à conversa pelo navegador não concede acesso aos arquivos do computador e a conexão do Codex não concede acesso ao Dot. O Retro Computer não lê credenciais nem altera as autorizações da sua conta.

Este é um acesso ao serviço oficial e um guia para a conexão local, sem uma API privada ou um runtime de Dot dentro do Retro Computer. As conexões, tarefas e permissões do Dot permanecem no ChatGPT. Veja [a documentação oficial da conexão](https://learn.chatgpt.com/docs/dots/computers-and-apps).
