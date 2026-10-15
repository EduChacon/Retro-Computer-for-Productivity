# Retro Computer

Um computador retrô para produtividade: a área de trabalho de um PC dos anos 90, com os programas de trabalho, os seus arquivos e o Claude Code, sem as distrações do computador de hoje. Funciona no Windows, no macOS e no Linux. Código aberto (licença MIT).

- **Versão:** 0.1.0 (primeira versão de teste)
- **Como usar:** [docs/uso.md](docs/uso.md) · **Arquitetura e decisões:** [docs/proposta.md](docs/proposta.md)

![A área de trabalho e o menu Iniciar](docs/img/iniciar.png)

## O que ele faz

- **Área de trabalho dos anos 90**: botão Iniciar, barra de tarefas, janelas que se arrastam e redimensionam, ícones, menus, a Lixeira e a caixa de Desligar, com letras e ícones nítidos em qualquer monitor.
- **O disco C: é uma pasta do seu computador** (`Documentos/Retro Computer`): o que você salva fica visível também fora do programa. Para trazer arquivos, arraste-os para uma janela; para levar, use "Enviar para".
- **Nada se perde**: excluir manda para a Lixeira, e cada gravação guarda a versão anterior do arquivo.
- **Programas de trabalho**: os [Craft](https://artcraft.run/) de código aberto (WordCraft para textos `.docx`, GridCraft para planilhas, DeckCraft para apresentações, PdfCraft, PhotoCraft e outros), instalados da versão oficial para navegador e rodando dentro das janelas. As caixas "Abrir" e "Salvar" deles usam o disco C:.
- **Claude Code** no Prompt de comando, nos seus arquivos, com a conta da assinatura ou com uma chave de API guardada no cofre de senhas do sistema.
- **Foco (Pomodoro)**, Bloco de notas, Localizar, Executar, Painel de controle, proteção de tela e Ajuda.

| | |
|---|---|
| ![WordCraft numa janela](docs/img/wordcraft.png) | ![A caixa Salvar como, no disco C:](docs/img/salvar-como.png) |
| ![O Claude Code no Prompt de comando](docs/img/claude.png) | ![O menu do botão direito](docs/img/menu-arquivo.png) |
| ![Adicionar ou remover programas](docs/img/programas.png) | ![Desligar o computador](docs/img/desligar.png) |

## Instalar

Os instaladores de cada sistema são gerados a cada atualização, na aba **Actions** do GitHub (execução "Compilar" › Artifacts): `.exe` (Windows), `.dmg` (macOS, Intel e Apple Silicon), `.AppImage` e `.deb` (Linux). Eles ainda não têm assinatura digital: na primeira abertura, o sistema pede uma confirmação (veja [docs/uso.md](docs/uso.md)).

## Desenvolver

```
npm install      # instala as dependências (e compila o terminal para o Electron)
npm start        # abre o Retro Computer
npm test         # testes do disco
```

O guia para quem programa (pessoas ou agentes de IA) está em [AGENTS.md](AGENTS.md).

## Créditos

Ícones e fontes de sistema do [SerenityOS](https://github.com/SerenityOS/serenity) (BSD-2-Clause), com desenhos próprios do projeto; terminal com xterm.js e node-pty; aplicativo em Electron. Os Craft são do ArtCraft Team e são baixados dos lançamentos oficiais. Detalhes em [ATRIBUICOES.md](ATRIBUICOES.md).

O visual homenageia os computadores pessoais dos anos 90; nenhum ícone, fonte, som ou imagem da Microsoft ou da Apple é usado.
