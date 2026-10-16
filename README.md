# Retro Computer

**English** · [Português](README.pt-BR.md) · [Español](README.es.md)

A retro computer for productivity: the desktop of a 1990s PC, with your work programs, your files and Claude Code, without the distractions of today's computer. It runs on Windows, macOS and Linux (including the Raspberry Pi), and on Linux it can be the computer's whole system, turning an old laptop or a mini PC into a dedicated retro computer. Open source (MIT license).

- **Version:** 1.0.0 · [Download](https://github.com/EduChacon/Retro-Computer-for-Productivity/releases/latest)
- **Languages:** English, Portuguese and Spanish (Control Panel › Language)

![The desktop and the Start menu](docs/img/en/start.png)

## What it does

- **A 1990s desktop**: Start button, taskbar, windows you can drag and resize, icons, menus, the Trash and the Shut Down dialog, with sharp letters and icons on any monitor.
- **A taskbar like today's**: the search box and the pinned programs next to Start; the tray with Wi-Fi, volume, battery and brightness, Bluetooth, notifications and the calendar; and a lock screen with a password.
- **Drive C: is a folder on your computer** (`Documents/Retro Computer`): what you save is also visible outside the program. To bring files in, drag them onto a window; to take them out, use "Send to". The Explorer has a folders bar, a clickable address and thumbnails; USB drives and memory cards show up in Computer, and `.zip` files open like folders.
- **Nothing gets lost**: deleting sends items to the Trash, and every save keeps the previous version of the file.
- **Work programs**: the open source [Craft](https://artcraft.run/) apps (WordCraft for `.docx` documents, GridCraft for spreadsheets, DeckCraft for presentations, PdfCraft, PhotoCraft and more), installed from their official browser builds and running inside the windows. Their Open and Save dialogs use drive C:. The programs installed on your computer open from Start too, and on Linux, Add or Remove Programs also installs programs from Flathub.
- **Always up to date**: when you open a program, Retro Computer checks for a new version and installs it first (or asks, or never checks: your choice). Retro Computer also updates itself.
- **Claude Code** in the Command Prompt, working on your files, with your Claude subscription or an API key kept in the system's password vault.
- **Internet**: a Browser (camera, microphone and notifications only with your permission) and your web E-mail in a window; any site can be installed as a program.
- **Built-in tools**: Image Viewer, Media Player, Screenshot, System Monitor, Calculator, Notepad, Focus (Pomodoro, stopwatch and timer), printers, Find, Run, Control Panel, screen saver, Help, and three games (Solitaire, Minesweeper and Breakout).
- **Linux as the system**: the "Retro Computer" session on the login screen opens straight into it; Shut Down really turns off the computer, Linux programs show up on the taskbar, security updates install from the Control Panel, and the logo, volume, brightness and Print Screen keys work.

| | |
|---|---|
| ![WordCraft in a window](docs/img/en/wordcraft.png) | ![The Save As dialog, on drive C:](docs/img/en/save-as.png) |
| ![Claude Code in the Command Prompt](docs/img/en/claude.png) | ![The right-click menu](docs/img/en/file-menu.png) |
| ![Add or Remove Programs](docs/img/en/programs.png) | ![Choosing the language](docs/img/en/language.png) |
| ![The Explorer with the folders bar and thumbnails](docs/img/en/explorer.png) | ![The Media Player](docs/img/en/media-player.png) |

## Install

Download the installer for your system from the [latest release](https://github.com/EduChacon/Retro-Computer-for-Productivity/releases/latest):

| System | File |
|---|---|
| Windows | `Retro-Computer-…-win-x64.exe` (installer) or `…-win-x64.zip` |
| macOS 12 or newer | `…-mac-arm64.dmg` (Apple Silicon) or `…-mac-x64.dmg` (Intel) |
| Linux (PC) | `…-linux-amd64.deb` or `…-linux-x86_64.AppImage` |
| Linux (Raspberry Pi, 64-bit) | `…-linux-arm64.deb` or `…-linux-arm64.AppImage` |

The installers are not digitally signed yet, so the system asks for confirmation the first time:

- **macOS**: right-click the app › Open › Open (or System Settings › Privacy & Security › Open Anyway).
- **Windows**: on the SmartScreen screen, "More info" › "Run anyway".

### As the Linux system (an old laptop, a Raspberry Pi or a mini PC)

Install the `.deb` package (`sudo apt install ./Retro-Computer-1.0.0-linux-amd64.deb`, or `arm64` on a Raspberry Pi) and choose the **Retro Computer** session on the login screen: the computer opens straight into Retro Computer, without the Linux desktop underneath. See [the usage guide (in Portuguese), section 7](docs/uso.md#7-num-mini-computador-raspberry-pi-e-como-o-sistema-do-linux). On a Raspberry Pi:

- **Raspberry Pi 4 or 5 (4 GB or more)**: everything works, including the Craft apps and Claude Code.
- **Raspberry Pi 3 (1 GB)**: the desktop, Notepad, Focus and the Command Prompt work; the Craft apps need WebGL2, which the Pi 3's graphics chip lacks (they run in software, very slowly), and Claude Code officially needs 4 GB of memory.

## Develop

```
npm install      # installs the dependencies (and builds the terminal for Electron)
npm start        # opens Retro Computer
npm test         # the tests
```

The code and the developer guide are written in Portuguese; see [AGENTS.md](AGENTS.md) (for people and AI agents). Translations live in [`src/sistema/idiomas/`](src/sistema/idiomas/), and `node ferramentas/textos.js` lists any missing ones.

## Credits

System icons and fonts from [SerenityOS](https://github.com/SerenityOS/serenity) (BSD-2-Clause), plus the project's own drawings; terminal by xterm.js and node-pty; `.zip` files by yauzl and yazl; self-updates by electron-updater; application built with Electron. The Linux programs come from Flathub. The Craft apps are by the ArtCraft Team and are downloaded from their official releases. Details in [ATRIBUICOES.md](ATRIBUICOES.md).

The look pays tribute to the personal computers of the 1990s; no icon, font, sound or image from Microsoft or Apple is used.
