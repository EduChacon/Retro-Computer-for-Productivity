# Como usar o Retro Computer

Este documento descreve o uso no dia a dia. A arquitetura e as decisões técnicas ficam em [proposta.md](proposta.md).

## Em resumo

- O Retro Computer é um programa comum, instalado no Windows, no macOS ou no Linux (inclusive no Raspberry Pi). Ao abrir, ele ocupa a tela inteira e mostra um computador dos anos 90: área de trabalho, botão Iniciar, janelas e barra de tarefas.
- Fala português, inglês e espanhol (Painel de controle › Idioma).
- O disco C: é uma pasta do computador principal (por padrão, `Documentos/Retro Computer`). Tudo o que se salva fica nela, visível também fora do programa.
- Os programas de trabalho (os Craft: WordCraft, GridCraft, DeckCraft, PdfCraft e outros) são instalados pelo "Adicionar ou remover programas" e rodam em janelas da área de trabalho.
- O Claude Code roda no Prompt de comando, nos arquivos do disco C:.
- Ao abrir um programa, o Retro Computer procura a versão nova dele e a instala antes (dá para pedir que pergunte antes ou que não procure).
- Nada se perde: o que é excluído vai para a Lixeira, e cada gravação guarda a versão anterior do arquivo.

## 1. Instalar e abrir

1. Baixe o instalador do seu sistema na página de [lançamentos](https://github.com/EduChacon/Retro-Computer-for-Productivity/releases/latest): `.exe` no Windows, `.dmg` no macOS (`x64` para Intel, `arm64` para Apple Silicon), `.AppImage` ou `.deb` no Linux (`x86_64`/`amd64` para PC, `arm64` para o Raspberry Pi).
2. Abra o Retro Computer. Aparecem a tela do BIOS, a abertura e a área de trabalho, com o som de início.
3. Na primeira vez, a Ajuda abre sozinha e o disco C: é criado em `Documentos/Retro Computer`, com o arquivo `Meus documentos/Leia-me.txt` (em inglês, `Documents/Read me.txt`; em espanhol, `Mis documentos/Léame.txt`).

O Retro Computer avisa, uma vez por versão, quando há uma versão nova dele: o aviso abre a página de download.

Sem assinatura digital (ainda não há certificado da Apple nem da Microsoft), o sistema avisa na primeira abertura:

- **macOS**: clique com o botão direito no aplicativo › Abrir › Abrir (ou Ajustes do Sistema › Privacidade e Segurança › Abrir mesmo assim).
- **Windows**: na tela azul do SmartScreen, "Mais informações" › "Executar assim mesmo".

## 2. O dia a dia

| Para… | Faça |
|---|---|
| Começar a trabalhar | Iniciar › Programas, ou dois cliques num ícone da área de trabalho |
| Abrir um documento | Dois cliques nele: o programa certo abre (o `.docx` no WordCraft, o `.txt` no Bloco de notas) |
| Salvar | O comando Salvar do programa: na primeira vez, a caixa "Salvar como" mostra o disco C:; depois, grava direto no mesmo arquivo |
| Achar um arquivo | Iniciar › Localizar |
| Desfazer uma gravação | Botão direito no arquivo › Versões anteriores |
| Recuperar um arquivo excluído | Lixeira › botão direito › Restaurar |
| Concentrar-se | Iniciar › Programas › Acessórios › Foco (o "Pomodoro"), com a tela cheia (F11) |
| Sair | Iniciar › Desligar (cada programa pergunta se há algo por salvar) |

### Trazer e levar arquivos

- **Trazer** do computador principal: arraste os arquivos para uma janela de pasta ou para a área de trabalho. Eles são copiados para o disco C:. Também há o menu Arquivo › "Trazer do computador principal…".
- **Levar** para o computador principal: botão direito › Enviar para › "Área de trabalho do computador principal", "Downloads do computador principal" ou "Outra pasta…".
- **Abrir a pasta lá fora**: botão direito › "Mostrar no computador principal".

Como o disco C: é uma pasta comum, ele também pode ficar dentro de uma pasta sincronizada (iCloud Drive, OneDrive, Google Drive, Dropbox): Painel de controle › Disco C: › "Trocar a pasta…". Assim, os documentos ficam com cópia na nuvem sem nenhum recurso extra.

## 3. Programas

Iniciar › Configurações › "Adicionar ou remover programas" lista os Craft por categoria. "Instalar" baixa a versão para navegador do lançamento oficial no GitHub (de 5 MB a 20 MB cada); depois disso, o programa funciona sem internet. "Atualizar" baixa a versão mais recente, e "Remover" apaga o programa sem tocar nos documentos.

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

## 4. Claude Code

1. Dois cliques no ícone **Claude** da área de trabalho.
2. Se o Claude Code não estiver instalado, o Retro Computer oferece instalá-lo com o instalador oficial da Anthropic (o comando aparece antes de rodar).
3. Para entrar, há dois caminhos:
   - a conta da assinatura do Claude: o próprio Claude Code pede o acesso na primeira vez;
   - uma chave de API: Painel de controle › Claude › "Guardar". A chave é cifrada pelo cofre de senhas do sistema e só vai para o Prompt de comando, na variável `ANTHROPIC_API_KEY`.
4. O Claude abre na pasta `Meus documentos`. Para outra pasta, use o botão direito nela › "Abrir o Claude aqui".

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
| Alt+letra | Menu da janela (a letra sublinhada) |
| Enter, F2, Delete, Backspace | Abrir, renomear, excluir, subir uma pasta |
| Ctrl+C, Ctrl+X, Ctrl+V | Copiar, recortar e colar arquivos nas pastas |
| Ctrl+Shift+C, Ctrl+Shift+V | Copiar e colar no Prompt de comando (no Mac, Cmd+C e Cmd+V) |

## 7. Num mini computador (Raspberry Pi) e como o "sistema" do Linux

O Retro Computer tem pacotes para o Linux em ARM64 (`arm64.deb` e `arm64.AppImage`), o processador do Raspberry Pi 3, 4 e 5. Ele precisa do sistema de 64 bits (Raspberry Pi OS 64-bit).

| Aparelho | O que esperar |
|---|---|
| Raspberry Pi 5 ou 4 (4 GB ou mais) | Tudo funciona: a área de trabalho, o Bloco de notas, o Prompt, o Claude Code e os Craft (mais lentos que num PC) |
| Raspberry Pi 4 (2 GB) | A área de trabalho e o Prompt vão bem; os Craft e o Claude Code ficam no limite da memória |
| Raspberry Pi 3 (1 GB) | A área de trabalho, o Bloco de notas, o Foco e o Prompt funcionam. Os Craft precisam de WebGL2, que a placa de vídeo do Pi 3 não tem: rodam por software, muito devagar. O Claude Code pede 4 GB de memória (requisito oficial) |
| Mais fracos (Raspberry Pi Zero 2, 512 MB) | Não recomendado: o Electron sozinho já ocupa quase toda a memória |

Uma alternativa barata e mais forte que o Pi 3 é um mini PC usado (os "thin clients" de escritório, com processador Intel ou AMD e 4 GB ou mais), que usa os pacotes `x86_64`/`amd64`.

### Abrir sozinho ao ligar

O Retro Computer já abre em tela cheia. Para o aparelho ligar direto nele, como se fosse o sistema:

1. Instale o pacote: `sudo apt install ./Retro-Computer-0.2.0-linux-arm64.deb` (no PC, o `amd64`).
2. Ligue o início automático da sessão: no Raspberry Pi OS, `sudo raspi-config` › System Options › Boot / Auto Login › Desktop Autologin.
3. Ponha o Retro Computer na abertura da sessão:
   ```
   mkdir -p ~/.config/autostart
   cp /usr/share/applications/retro-computer.desktop ~/.config/autostart/
   ```
4. Reinicie. O aparelho liga, entra na sessão e abre o Retro Computer em tela cheia.

Nesse jeito, Iniciar › Desligar fecha o Retro Computer e volta à área de trabalho do Linux (que fica por baixo). Desligar o aparelho de verdade pelo Retro Computer, sem a área de trabalho do Linux por baixo, é uma das sugestões da seção 8.

## 8. Sugestões para as próximas versões

As ideias abaixo ainda não foram feitas; ficam registradas para decisão:

a) **Tema Mac clássico** (o System 7 da sua foto), escolhido no Painel de controle, com a barra de menus no alto e a Lixeira no canto.

b) **Navegador focado**: uma janela de navegador com uma lista de "sites" permitidos (por exemplo, o portal do tribunal, a pesquisa de jurisprudência e o e-mail), sem abas infinitas.

c) **Modo foco completo**: ao ligar o Foco, bloquear as notificações do computador principal e esconder o relógio de segundos e os atalhos que distraem.

d) **Atalhos do Claude no menu do arquivo**: botão direito num documento › "Pedir ao Claude…" (revisar, resumir, traduzir), abrindo o Claude Code já com o pedido.

e) **Diário de trabalho**: um registro automático do que foi feito no dia (arquivos editados, focos concluídos), num `.txt` do disco.

f) **Cópia de segurança agendada** do disco C: para uma segunda pasta ou um disco externo.

g) **Instaladores assinados** (exige as contas de desenvolvedor da Apple e da Microsoft, que são pagas).

h) **Modo sistema no Linux**: uma sessão própria (escolhida na tela de entrada, sem a área de trabalho do Linux por baixo), em que Desligar e Reiniciar desligam e reiniciam o aparelho de verdade, para usar um mini computador como um "computador retrô" dedicado.
