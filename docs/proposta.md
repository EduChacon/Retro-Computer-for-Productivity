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
│   ├── idioma.js      os textos do processo principal e os nomes das pastas em cada idioma
│   ├── servir.js      o disco em trechos (vídeo) e as miniaturas das fotos
│   ├── compactados.js ver, extrair e criar .zip (yauzl, yazl); extrair .tar
│   ├── unidades.js    os pendrives e cartões (lsblk/udisksctl, Win32_LogicalDisk, /Volumes)
│   ├── aplicativos.js os programas do computador principal (.desktop, menu Iniciar, Aplicativos)
│   ├── loja.js        os programas do Linux pelo Flathub (flatpak --user)
│   ├── lojas.js       a mesma loja no Windows (winget) e no Mac (Homebrew)
│   ├── atualizador.js a atualização do próprio Retro Computer (electron-updater)
│   ├── bandeja.js     o volume, o brilho e o Wi-Fi do computador
│   ├── bloqueio.js    a senha da tela de bloqueio (PBKDF2)
│   ├── monitor.js     o processador, a memória e os processos
│   ├── impressoras.js as impressoras, a padrão e a fila (CUPS, PowerShell)
│   ├── bluetooth.js   parear e conectar pelo bluetoothctl (BlueZ)
│   ├── sistema-linux.js        o modo sistema: energia, sessão, teclado, senha de administrador
│   ├── atualizacoes-linux.js   apt e flatpak, as atualizações de segurança automáticas
│   ├── janelas-linux.js        as janelas dos programas do Linux (wmctrl, xprop, xdotool)
│   └── main.js        a janela, os protocolos e a ponte com a área de trabalho
├── a área de trabalho (página)        src/sistema/  → sistema://retro/
│   ├── janelas, menus, barra de tarefas, bandeja, ícones, diálogos, tela de bloqueio
│   ├── idiomas/       en.json e es.json (o português é a chave)
│   └── apps/          Meu computador (Explorador), Lixeira, Bloco de notas, Painel de controle,
│                      Adicionar ou remover programas (e a Loja), Navegador, E-mail, Prompt,
│                      Claude, Foco, Calculadora, Visualizador de imagens, Reprodutor de mídia,
│                      Captura de tela, Monitor do sistema, Atualizações do Linux, jogos, Ajuda…
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

### As atualizações

- **Os programas**: ao abrir um Craft, a janela procura a versão nova (a consulta fica guardada por 6 horas em `programas/atualizacoes.json`, com 5 segundos de espera no máximo) e, conforme a escolha do usuário, instala antes de abrir, pergunta ou não procura. Uns 20 segundos depois de ligar, a mesma busca roda para todos os instalados, sem mexer nos abertos.
- **Uma atualização nunca volta atrás**: `instalar(id, …, { atualizar: true })` só aceita uma versão maior que a instalada e não usa a versão conhecida do catálogo quando a internet falha. O programa instalado de um `.zip` (versão `local`) não é trocado sozinho.
- **O próprio Retro Computer**: o último lançamento de `EduChacon/Retro-Computer-for-Productivity` é consultado uma vez por dia pelo `electron-updater` (os arquivos `latest*.yml` e `.blockmap` sobem com o lançamento). No Windows e no `.AppImage`, a versão nova é baixada e instalada ao reiniciar; no `.deb`, a instalação pede a senha de administrador; no macOS (sem assinatura, a troca automática não é aceita) e no `.zip` do Windows, o aviso abre a página de download.
- **O Linux** (no modo sistema): Painel de controle › Atualizações do Linux usa o `apt` (`upgrade`, que nunca remove pacotes, com as configurações do usuário mantidas) e o `flatpak update --user`; as atualizações de segurança automáticas são as do `unattended-upgrades`.

### Os idiomas

- O texto em português é a chave: `tr('Abrir {nome}', { nome })` na área de trabalho e no processo principal, com os catálogos `src/sistema/idiomas/en.json` e `es.json`. `marcar('…')` marca os textos de tabelas que são traduzidos na hora de mostrar.
- `ferramentas/textos.js` acha todos os `tr()` e `marcar()` do código, e o teste `testes/idiomas.test.js` falha se faltar uma tradução, sobrar uma ou as `{variáveis}` não baterem.
- O idioma vem da configuração (`idioma`: automático, pt-BR, en ou es). Escolhido um idioma, o Electron abre com a opção `--lang`, e os Craft que têm tradução (o WordCraft, por exemplo) seguem o mesmo idioma. Trocar o idioma reinicia o aplicativo.
- As pastas do disco são criadas com os nomes do idioma da primeira vez e guardadas na configuração (`pastas`); trocar o idioma não renomeia nada.

### O disco C:

- É uma pasta do computador principal (`Documentos/Retro Computer`), que pode ser trocada (inclusive por uma pasta sincronizada na nuvem).
- Os caminhos nunca saem dela (verificação em `disco.js`, com testes).
- Excluir move para `.lixeira/` com o lugar de origem; só "Esvaziar Lixeira" apaga.
- Gravar por cima guarda a versão anterior em `.versoes/` (até 20 por arquivo).
- A gravação é atômica (arquivo temporário e troca de nome).

### O Claude Code

O Prompt de comando é um terminal de verdade (node-pty e xterm.js) com o shell do computador principal, aberto numa pasta do disco. O ícone Claude abre o mesmo terminal com o comando `claude`. A chave de API, se houver, é guardada pelo `safeStorage` do Electron (Keychain no macOS, DPAPI no Windows, o chaveiro do Linux) e entregue só ao terminal.

### O modo sistema no Linux

O pacote `.deb` instala a sessão "Retro Computer" em `/usr/share/xsessions`. O script da sessão (`recursos/linux/sessao.sh`) aplica o teclado do sistema, o "tocar para clicar" do touchpad, a economia de energia do monitor, o agente de senha do sistema (lxpolkit) e um gerenciador de janelas leve (Openbox, com o tema "Retro" e a faixa da barra de tarefas livre) para os programas do Linux, e abre o Retro Computer de novo se ele parar com erro. Com `RETRO_SISTEMA=1`:

- a tela cheia fica fixa; Desligar vale para o computador (`systemctl`, pelo logind) e oferece sair da sessão;
- as teclas do logotipo, de volume, de brilho, de calculadora e Print Screen e os atalhos do Windows (Alt+Tab, Alt+F4, a tecla do logotipo com uma letra, um número ou uma seta, lidos em `src/principal/atalhos.js`) são atalhos globais, mesmo com um programa do Linux na frente; os que mostram algo do Retro Computer o trazem para a frente;
- as janelas dos programas do Linux entram na barra de tarefas (o `wmctrl` lista, o `xprop` diz a ativa e, com o `-spy`, avisa na hora quando a lista muda, o `xdotool` minimiza e cola), ligadas ao programa do menu pela classe da janela; a tecla do logotipo com as setas as encaixa (`wmctrl -e`, na área útil e com a moldura descontada);
- a resolução e a luz noturna passam pelo `xrandr` (a troca de resolução volta à anterior em 15 segundos sem confirmação);
- o chaveiro do Linux (`--password-store=gnome-libsecret`, com o `gnome-keyring-daemon` da sessão) guarda cifrados os cookies do Navegador e a chave do Claude;
- os pendrives são montados sozinhos (`udisksctl`);
- a senha de administrador é pedida numa caixa do Retro Computer e passada ao `sudo -S`, sem ficar guardada.

### O Navegador

Cada janela do Navegador é um `<webview>` numa sessão própria (só `http` e `https`, sem Node), com um preload isolado que repassa os atalhos e os botões laterais do mouse. Com "Só conexões seguras" (ligado), o `webRequest` troca o `http://` das páginas por `https://` (menos a rede de casa); se a versão segura falha ou manda de volta para o `http`, a janela mostra o aviso e só abre a outra com a escolha do usuário (`src/principal/https.js`). As permissões (câmera, microfone, localização, notificações, área de transferência, compartilhamento da tela) passam por uma caixa do Retro Computer; os sites instalados como programas usam a mesma sessão, numa janela sem a barra de endereço. O Electron não traz o Widevine: os serviços de vídeo com proteção contra cópia não tocam.

### O visual

- Bordas em relevo de dois pixels, a barra de título azul-marinho, a barra de tarefas e o menu Iniciar com a faixa lateral, como nos computadores da época.
- Ícones do SerenityOS (BSD-2-Clause), com as pastas recoloridas de amarelo, e desenhos próprios (o computador, o disquete do botão Iniciar, a caixa de programas, o tomate do Foco, a pena do processador de texto, o pendrive, a impressora, o Bluetooth, o Breakout e os ícones da bandeja).
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
| 6. Inglês e espanhol; atualizações ao abrir; lançamentos no GitHub; Linux ARM64 (Raspberry Pi) | Feita (0.2.0) |
| 7. Navegador e e-mail, calculadora, jogos, programas do computador, atualização do próprio aplicativo | Feita (1.0) |
| 8. Bandeja (rede, volume, bateria, brilho, notificações), barra de tarefas com busca e programas fixados, tela de bloqueio | Feita (1.0) |
| 9. Modo sistema no Linux: sessão própria, teclado, mouse e toque, Loja (Flathub), atualizações, programas do Linux na barra | Feita (1.0) |
| 10. Ferramentas: pendrives, pastas compactadas, Visualizador de imagens, Reprodutor de mídia, Captura de tela, Monitor do sistema, sites como programas, Explorador com árvore e miniaturas, impressoras, Bluetooth | Feita (1.0) |
| 11. Cantos magnéticos e atalhos do Windows, resolução da tela, Ctrl+roda para o zoom | Feita (1.0) |
| 12. Da pesquisa das distribuições ([pesquisa-distribuicoes.md](pesquisa-distribuicoes.md)): histórico da área de transferência, luz noturna, modos de energia, firewall, contas na busca; a Central de segurança e a auditoria; a abertura mais leve | Feita (1.0) |
| 13. O trabalho do dia a dia: o Firefox como navegador padrão (com o visual da época), a área de trabalho e o menu Iniciar personalizáveis, o painel de visualização e o Acesso rápido do Explorador, o Diário de trabalho, a cópia de segurança, o modo foco completo, o Mapa de caracteres e o "Pedir ao Claude" | Feita (1.0) |
| 14. O computador completo: som, energia, data e hora, acessibilidade, várias telas, o modo portátil, o antivírus, os programas do Windows (WINE), o DOS, as Damas e o Xadrez, vários usuários e o Claude que ajusta o Retro Computer (o servidor MCP) | Feita (1.0) |
| 15. Tema Mac clássico (o Mac OS 9.2), áreas de trabalho virtuais, papel de parede e esquemas de cores, a barra de tarefas em cada monitor | Sugestões ([uso.md](uso.md), seção 8) |

## Riscos conhecidos

- Os Craft são novos (0.x): faltam recursos em relação aos programas comerciais.
- Os Craft precisam de WebGPU ou WebGL2. Sem placa de vídeo utilizável, o Retro Computer liga o WebGL2 por software (mais lento); se nem isso funcionar, a janela explica o motivo.
- Sem certificados, os instaladores do macOS e do Windows mostram um aviso na primeira abertura.
- No macOS, o aplicativo aberto pelo Finder não herda o PATH do terminal; por isso o Prompt abre o shell como "login", que lê o perfil do usuário.
- O que depende do aparelho no Linux (o pareamento do Bluetooth, o CUPS, o `apt`, o `ufw`, o `powerprofilesctl`, o `xrandr`, a captura de tela pelo `desktopCapturer` no modo sistema) foi testado com saídas simuladas (as variáveis `RETRO_*_FALSO(S)` e os testes de leitura); o uso num notebook de verdade pode pedir ajustes. A barra de tarefas com as janelas do Linux, o encaixe e as teclas globais foram testados também com o openbox e janelas de verdade (no Xvfb, com o `xdotool`).
- O modo sistema supõe o X11 (Openbox). Numa sessão Wayland, a lista das janelas do Linux e os atalhos globais não funcionam.
