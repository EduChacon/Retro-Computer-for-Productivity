# Como usar o Retro Computer

Este documento descreve o uso no dia a dia. A arquitetura e as decisões técnicas ficam em [proposta.md](proposta.md).

## Em resumo

- O Retro Computer é um programa comum, instalado no Windows, no macOS ou no Linux. Ao abrir, ele ocupa a tela inteira e mostra um computador dos anos 90: área de trabalho, botão Iniciar, janelas e barra de tarefas.
- O disco C: é uma pasta do computador principal (por padrão, `Documentos/Retro Computer`). Tudo o que se salva fica nela, visível também fora do programa.
- Os programas de trabalho (os Craft: WordCraft, GridCraft, DeckCraft, PdfCraft e outros) são instalados pelo "Adicionar ou remover programas" e rodam em janelas da área de trabalho.
- O Claude Code roda no Prompt de comando, nos arquivos do disco C:.
- Nada se perde: o que é excluído vai para a Lixeira, e cada gravação guarda a versão anterior do arquivo.

## 1. Instalar e abrir

1. Baixe o instalador do seu sistema (aba "Actions" do repositório, enquanto não houver uma versão publicada): `.exe` no Windows, `.dmg` no macOS, `.AppImage` ou `.deb` no Linux.
2. Abra o Retro Computer. Aparecem a tela do BIOS, a abertura e a área de trabalho, com o som de início.
3. Na primeira vez, a Ajuda abre sozinha e o disco C: é criado em `Documentos/Retro Computer`, com o arquivo `Meus documentos/Leia-me.txt`.

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

## 5. Atalhos

| Tecla | Efeito |
|---|---|
| F11 | Tela cheia ou janela |
| Ctrl+Esc | Menu Iniciar |
| F1 | Ajuda |
| Alt+letra | Menu da janela (a letra sublinhada) |
| Enter, F2, Delete, Backspace | Abrir, renomear, excluir, subir uma pasta |
| Ctrl+C, Ctrl+X, Ctrl+V | Copiar, recortar e colar arquivos nas pastas |
| Ctrl+Shift+C, Ctrl+Shift+V | Copiar e colar no Prompt de comando (no Mac, Cmd+C e Cmd+V) |

## 6. Sugestões para as próximas versões

As ideias abaixo ainda não foram feitas; ficam registradas para decisão:

a) **Tema Mac clássico** (o System 7 da sua foto), escolhido no Painel de controle, com a barra de menus no alto e a Lixeira no canto.

b) **Navegador focado**: uma janela de navegador com uma lista de "sites" permitidos (por exemplo, o portal do tribunal, a pesquisa de jurisprudência e o e-mail), sem abas infinitas.

c) **Modo foco completo**: ao ligar o Foco, bloquear as notificações do computador principal e esconder o relógio de segundos e os atalhos que distraem.

d) **Atalhos do Claude no menu do arquivo**: botão direito num documento › "Pedir ao Claude…" (revisar, resumir, traduzir), abrindo o Claude Code já com o pedido.

e) **Diário de trabalho**: um registro automático do que foi feito no dia (arquivos editados, focos concluídos), num `.txt` do disco.

f) **Cópia de segurança agendada** do disco C: para uma segunda pasta ou um disco externo.

g) **Versão publicada** com instaladores assinados (exige as contas de desenvolvedor da Apple e da Microsoft, que são pagas).
