# Retro Computer

[English](README.md) · **Português** · [Español](README.es.md)

Um computador retrô para produtividade: a área de trabalho de um PC dos anos 90, com os programas de trabalho, os seus arquivos e o Claude Code, sem as distrações do computador de hoje. Funciona no Windows, no macOS e no Linux (inclusive no Raspberry Pi). Código aberto (licença MIT).

- **Versão:** 0.2.0 · [Baixar](https://github.com/EduChacon/Retro-Computer-for-Productivity/releases/latest)
- **Idiomas:** português, inglês e espanhol (Painel de controle › Idioma)
- **Como usar:** [docs/uso.md](docs/uso.md) · **Arquitetura e decisões:** [docs/proposta.md](docs/proposta.md)

![A área de trabalho e o menu Iniciar](docs/img/iniciar.png)

## O que ele faz

- **Área de trabalho dos anos 90**: botão Iniciar, barra de tarefas, janelas que se arrastam e redimensionam, ícones, menus, a Lixeira e a caixa de Desligar, com letras e ícones nítidos em qualquer monitor.
- **O disco C: é uma pasta do seu computador** (`Documentos/Retro Computer`): o que você salva fica visível também fora do programa. Para trazer arquivos, arraste-os para uma janela; para levar, use "Enviar para".
- **Nada se perde**: excluir manda para a Lixeira, e cada gravação guarda a versão anterior do arquivo.
- **Programas de trabalho**: os [Craft](https://artcraft.run/) de código aberto (WordCraft para textos `.docx`, GridCraft para planilhas, DeckCraft para apresentações, PdfCraft, PhotoCraft e outros), instalados da versão oficial para navegador e rodando dentro das janelas. As caixas "Abrir" e "Salvar" deles usam o disco C:.
- **Sempre atualizado**: ao abrir um programa, o Retro Computer procura a versão nova e a instala antes (ou pergunta, ou não procura, como você escolher). Ele também avisa quando sai uma versão nova dele mesmo.
- **Claude Code** no Prompt de comando, nos seus arquivos, com a conta da assinatura ou com uma chave de API guardada no cofre de senhas do sistema.
- **Foco (Pomodoro)**, Bloco de notas, Localizar, Executar, Painel de controle, proteção de tela e Ajuda.

| | |
|---|---|
| ![WordCraft numa janela](docs/img/wordcraft.png) | ![A caixa Salvar como, no disco C:](docs/img/salvar-como.png) |
| ![O Claude Code no Prompt de comando](docs/img/claude.png) | ![O menu do botão direito](docs/img/menu-arquivo.png) |
| ![Adicionar ou remover programas, com a atualização](docs/img/programas.png) | ![Desligar o computador](docs/img/desligar.png) |

## Instalar

Baixe o instalador do seu sistema no [último lançamento](https://github.com/EduChacon/Retro-Computer-for-Productivity/releases/latest):

| Sistema | Arquivo |
|---|---|
| Windows | `Retro-Computer-…-win-x64.exe` (instalador) ou `…-win-x64.zip` |
| macOS | `…-mac-arm64.dmg` (Apple Silicon) ou `…-mac-x64.dmg` (Intel) |
| Linux (PC) | `…-linux-amd64.deb` ou `…-linux-x86_64.AppImage` |
| Linux (Raspberry Pi, 64 bits) | `…-linux-arm64.deb` ou `…-linux-arm64.AppImage` |

Os instaladores ainda não têm assinatura digital: na primeira abertura, o sistema pede uma confirmação (veja [docs/uso.md](docs/uso.md)).

### No Raspberry Pi ou num mini PC

O Retro Computer pode abrir sozinho quando o aparelho liga, em tela cheia, como um computador retrô dedicado: veja [docs/uso.md, seção 7](docs/uso.md#7-num-mini-computador-raspberry-pi-e-como-o-sistema-do-linux). Em resumo: no Raspberry Pi 4 ou 5 (4 GB ou mais), tudo funciona; no Raspberry Pi 3 (1 GB), funcionam a área de trabalho, o Bloco de notas, o Foco e o Prompt, mas os Craft (que precisam de WebGL2) ficam muito lentos e o Claude Code pede 4 GB de memória.

## Desenvolver

```
npm install      # instala as dependências (e compila o terminal para o Electron)
npm start        # abre o Retro Computer
npm test         # testes do disco, dos idiomas e das atualizações
```

O guia para quem programa (pessoas ou agentes de IA) está em [AGENTS.md](AGENTS.md).

## Créditos

Ícones e fontes de sistema do [SerenityOS](https://github.com/SerenityOS/serenity) (BSD-2-Clause), com desenhos próprios do projeto; terminal com xterm.js e node-pty; aplicativo em Electron. Os Craft são do ArtCraft Team e são baixados dos lançamentos oficiais. Detalhes em [ATRIBUICOES.md](ATRIBUICOES.md).

O visual homenageia os computadores pessoais dos anos 90; nenhum ícone, fonte, som ou imagem da Microsoft ou da Apple é usado.
