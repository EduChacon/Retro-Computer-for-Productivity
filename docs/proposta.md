# Proposta e arquitetura do Retro Computer

## O pedido

Um programa para Linux, Windows e macOS que imite a estética de um computador antigo (PC ou Mac dos anos 90), focado em produtividade, em que se possam instalar programas como os Craft (WordCraft, ArtCraft e outros), sem perder o que se faz, levando e trazendo arquivos do computador principal, e com o Claude Code à mão. Tudo bem acabado e de código aberto. O tema escolhido para começar foi o PC (Windows 95).

## A decisão principal: recriar a aparência, não emular o sistema

| Caminho | Por que não (ou por que sim) |
|---|---|
| Emular o Windows 95 ou o Mac OS de verdade (como o aplicativo "windows95") | Dentro deles não rodam o WordCraft, o Claude Code nem um navegador atual; o sistema, os ícones e as fontes originais pertencem à Microsoft e à Apple. |
| Máquina virtual com um Linux moderno | Pesa gigabytes, demora a ligar e fica sem aceleração de vídeo no Mac e no Windows, o que prejudica os Craft. |
| **Programa próprio com o visual da época (escolhido)** | Leve, abre em segundos, usa a placa de vídeo do computador, e o disco é uma pasta comum. |

## Como funciona

```
Retro Computer (Electron)
├── processo principal (Node)          src/principal/
│   ├── disco.js       o disco C: = uma pasta comum; lixeira e versões
│   ├── programas.js   baixa e instala os Craft; serve programa://<id>/
│   ├── terminal.js    o Prompt de comando (node-pty)
│   ├── config.js      as configurações e a chave de API (cofre do sistema)
│   └── main.js        a janela, os protocolos e a ponte com a área de trabalho
├── a área de trabalho (página)        src/sistema/  → sistema://retro/
│   ├── janelas, menus, barra de tarefas, ícones, diálogos
│   └── apps/          Meu computador, Lixeira, Bloco de notas, Painel de controle,
│                      Adicionar ou remover programas, Prompt, Claude, Foco, Ajuda…
└── o adaptador                        src/adaptador/adaptador.js
    entra na página de cada programa instalado e troca as caixas
    Abrir e Salvar do navegador pelas do disco C:
```

### Os programas (os Craft)

Os Craft são de código aberto (MIT ou Apache-2.0), escritos em Rust, e cada lançamento oficial no GitHub traz uma versão para navegador (`nome-web-versão.zip`, WebAssembly). O Retro Computer:

1. descobre a última versão (pela API do GitHub ou, sem ela, pelo endereço `releases/latest`);
2. baixa o pacote oficial e o extrai em `<dados do aplicativo>/programas/<id>/`;
3. serve o programa em `programa://<id>/`, uma origem isolada por programa;
4. insere o adaptador antes dos scripts da página.

Os pacotes não são redistribuídos pelo Retro Computer: cada instalação vem do lançamento oficial, sem modificação (as marcas dos Craft pedem que versões modificadas não usem os nomes deles).

### Abrir e salvar no disco

Os Craft para navegador abrem arquivos por um `<input type=file>` e salvam pelo `showSaveFilePicker` (ou por um download). O adaptador substitui os dois:

- **Abrir**: o clique no `<input type=file>` vira a caixa "Abrir" do disco; o arquivo escolhido volta para o programa como se viesse do navegador.
- **Salvar**: o `showSaveFilePicker` vira a caixa "Salvar como" do disco. Um arquivo que veio do disco é gravado de volta no mesmo lugar, sem perguntar.
- **Dois cliques num documento**: o programa abre, e o adaptador "solta" o arquivo sobre a tela dele (o mesmo caminho de arrastar um arquivo).
- **Fechar com alterações não salvas**: o adaptador pergunta aos ouvintes de `beforeunload` da página, e a janela avisa antes de fechar.

Testado com o WordCraft 0.7.0: abrir um `.md` do disco, salvar como `.docx` (a caixa do disco), salvar de novo (grava direto e guarda a versão anterior) e abrir pela caixa "Abrir".

### O disco C:

- É uma pasta do computador principal (`Documentos/Retro Computer`), que pode ser trocada (inclusive por uma pasta sincronizada na nuvem).
- Os caminhos nunca saem dela (verificação em `disco.js`, com testes).
- Excluir move para `.lixeira/` com o lugar de origem; só "Esvaziar Lixeira" apaga.
- Gravar por cima guarda a versão anterior em `.versoes/` (até 20 por arquivo).
- A gravação é atômica (arquivo temporário e troca de nome).

### O Claude Code

O Prompt de comando é um terminal de verdade (node-pty e xterm.js) com o shell do computador principal, aberto numa pasta do disco. O ícone Claude abre o mesmo terminal com o comando `claude`. A chave de API, se houver, é guardada pelo `safeStorage` do Electron (Keychain no macOS, DPAPI no Windows, o chaveiro do Linux) e entregue só ao terminal.

### O visual

- Bordas em relevo de dois pixels, a barra de título azul-marinho, a barra de tarefas e o menu Iniciar com a faixa lateral, como nos computadores da época.
- Ícones do SerenityOS (BSD-2-Clause), com as pastas recoloridas de amarelo, e desenhos próprios (o computador, o disquete do botão Iniciar, a caixa de programas, o tomate do Foco, a pena do processador de texto).
- Fontes de bitmap do SerenityOS (Katica na interface, Csilla no Prompt), convertidas para WOFF2 com os acentos do português.
- O tamanho dos pixels é sempre um número inteiro de pixels da tela, para as letras ficarem nítidas.
- Sons sintetizados na hora; nenhum som, ícone ou fonte da Microsoft ou da Apple.

## Etapas

| Etapa | Situação |
|---|---|
| 0. Prova de conceito (área de trabalho, WordCraft numa janela, salvar no disco) | Feita |
| 1. Área de trabalho completa (janelas, menus, explorador, Lixeira, versões, Bloco de notas, Painel) | Feita |
| 2. Catálogo de programas (instalar, atualizar, remover, instalar de .zip) | Feita |
| 3. Prompt de comando e Claude Code (chave no cofre do sistema) | Feita |
| 4. Foco, proteção de tela, Ajuda, Executar, Localizar, Desligar | Feita |
| 5. Instaladores para os três sistemas (GitHub Actions) | Feita, sem assinatura digital |
| 6. Tema Mac clássico, navegador focado, modo foco completo | Sugestões ([uso.md](uso.md), seção 6) |

## Riscos conhecidos

- Os Craft são novos (0.x): faltam recursos em relação aos programas comerciais.
- Os Craft precisam de WebGPU ou WebGL2. Sem placa de vídeo utilizável, o Retro Computer liga o WebGL2 por software (mais lento); se nem isso funcionar, a janela explica o motivo.
- Sem certificados, os instaladores do macOS e do Windows mostram um aviso na primeira abertura.
- No macOS, o aplicativo aberto pelo Finder não herda o PATH do terminal; por isso o Prompt abre o shell como "login", que lê o perfil do usuário.
