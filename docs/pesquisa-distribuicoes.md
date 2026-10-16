# As distribuições do Linux: o que o Retro Computer aproveitou

Para a 1.0, o dono pediu uma pesquisa dos sistemas baseados no Linux mais usados, para trazer o que fosse bom para a produtividade sem tirar o caráter do projeto (a estética da época, o foco no trabalho, nada perdido). Esta página resume o que cada um tem de marcante e o que foi feito com isso.

## O que entrou na 1.0

| Recurso | A inspiração | No Retro Computer |
|---|---|---|
| Cantos magnéticos (metade, quarto, tela toda) e a tecla do logotipo com as setas | Zorin OS (os quartos da tela), Pop!_OS, Windows | Arrastar a janela até a borda; Painel › Aparência › Efeitos |
| Histórico da área de transferência | KDE (Klipper), extensões do GNOME, Windows 10 | Logotipo + V; Acessórios › Área de transferência |
| Luz noturna | Linux Mint, GNOME, KDE | Painel › Aparência › Efeitos |
| Modos de energia (economia, equilibrado, desempenho) | Zorin OS, GNOME, Fedora (o power-profiles-daemon) | A caixa da bateria, na bandeja |
| Firewall com um clique | Ubuntu e Linux Mint (o ufw e o gufw) | Painel › Firewall |
| Contas na caixa de busca | KRunner do KDE, a busca do GNOME | A caixa de busca da barra de tarefas |
| Central de segurança (o estado de cada proteção) | A Central de Segurança do Windows XP | Painel › Segurança |
| Só conexões seguras (HTTPS) e apagar os dados de navegação ao fechar | Tails (o navegador "esquecido" e só HTTPS), os navegadores de hoje | Painel › Segurança › Privacidade |
| O chaveiro do Linux guardando as senhas | GNOME Keyring (Ubuntu, Mint) | O modo sistema o usa sozinho |
| Resolução da tela com a confirmação de 15 segundos | Todos (e o Windows 95) | Painel › Aparência › Configurações |
| Guia de instalação para computadores antigos e o Broadcom do MacBook | O Gerenciador de drivers do Linux Mint | [instalacao.md](instalacao.md) |

Já existiam antes e seguem a mesma linha: o gerenciador de atualizações com as de segurança automáticas (Linux Mint, Ubuntu), a loja do Flathub (Linux Mint, Fedora, Bazzite), os pendrives montados sozinhos, a tela de bloqueio, o Bluetooth e as impressoras, as versões e a Lixeira (que fazem, para os arquivos, o papel do Timeshift).

## Para depois da 1.0 (sugestões em [uso.md](uso.md), seção 8)

- **Áreas de trabalho virtuais** (Pop!_OS COSMIC, GNOME, o Windows 10): várias mesas, cada uma com as suas janelas.
- **Programas do Windows pelo WINE** (o "Windows App Support" do Zorin OS) e os jogos do DOS (o DOSBox), juntos num "emulador" da época.
- **Enviar arquivos para outro computador da casa** (o Warpinator do Linux Mint) e o celular ligado ao computador (KDE Connect).
- **O Mapa de caracteres** (o do Windows 95 e o do GNOME), para os acentos e os símbolos.

## O que ficou de fora, e por quê

| Sistemas | O que eles têm de especial | Por que não entrou |
|---|---|---|
| Debian, Red Hat, AlmaLinux, Rocky Linux | A estabilidade e o suporte longo, para servidores e empresas | Não é um recurso da área de trabalho: o Retro Computer roda em cima deles |
| Arch Linux, CachyOS | Sempre a versão mais nova (rolling release), o sistema otimizado para o processador | Escolhas do sistema de baixo; a otimização do Retro Computer foi feita nele mesmo (a abertura mais leve, menos consultas) |
| Fedora Silverblue, Bluefin, Bazzite, SteamOS | O sistema imutável, que se atualiza inteiro e volta atrás | O modo sistema funciona neles, mas o modelo é do sistema de baixo |
| NixOS | O sistema inteiro descrito num arquivo de configuração | Fora do propósito (a configuração do Retro Computer já é um arquivo só, o config.json) |
| openSUSE | O YaST (um painel de controle completo) e as fotos do sistema (Snapper) | O Painel de controle cobre o que se usa no dia a dia; as fotos do sistema são do sistema de baixo |
| TrueNAS, Proxmox, ZimaOS, Umbrel, Runtipi | Servidores de arquivos, máquinas virtuais e programas para a casa | São sistemas para servidores, sem tela |
| Kali Linux, Parrot OS, BlackArch | As ferramentas de testes de invasão | Fora do propósito (podem ser instaladas pela Loja ou pelo Prompt) |
| Tails, Qubes OS, Whonix | O sistema que esquece tudo, o isolamento em máquinas virtuais, a rede pelo Tor | Ficaram as ideias que cabem num computador de trabalho (só HTTPS, apagar os dados de navegação, o histórico só na memória); o resto pede um sistema inteiro feito para isso |
| Nobara, Bazzite, SteamOS | Os jogos (Steam, Proton, os controladores de vídeo) | Fora do propósito: o foco é o trabalho (os jogos da época continuam: Paciência, Campo Minado, Breakout) |
| Ubuntu (snap), Linux Mint (Cinnamon), Zorin OS (os "layouts") | Os formatos de pacote e as áreas de trabalho que imitam o Windows e o macOS | O Retro Computer é a própria área de trabalho; os programas vêm do Flathub |

## Fontes

- Linux Mint 22.3: <https://ostechnix.com/linux-mint-22-3-zena-whats-new-upgrade-guide/>
- Zorin OS 17: <https://blog.zorin.com/2023/12/20/zorin-os-17-has-arrived/>
- Pop!_OS 24.04 com o COSMIC: <https://linuxiac.com/pop_os-24-04-lts-launches-with-cosmic-desktop-1-0-stable/>
