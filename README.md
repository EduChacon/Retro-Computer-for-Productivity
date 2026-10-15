# Retro Computer

**English** · [Português](README.pt-BR.md) · [Español](README.es.md)

A retro computer for productivity: the desktop of a 1990s PC, with your work programs, your files and Claude Code, without the distractions of today's computer. It runs on Windows, macOS and Linux (including the Raspberry Pi). Open source (MIT license).

- **Version:** 0.2.0 · [Download](https://github.com/EduChacon/Retro-Computer-for-Productivity/releases/latest)
- **Languages:** English, Portuguese and Spanish (Control Panel › Language)

![The desktop and the Start menu](docs/img/en/start.png)

## What it does

- **A 1990s desktop**: Start button, taskbar, windows you can drag and resize, icons, menus, the Trash and the Shut Down dialog, with sharp letters and icons on any monitor.
- **Drive C: is a folder on your computer** (`Documents/Retro Computer`): what you save is also visible outside the program. To bring files in, drag them onto a window; to take them out, use "Send to".
- **Nothing gets lost**: deleting sends items to the Trash, and every save keeps the previous version of the file.
- **Work programs**: the open source [Craft](https://artcraft.run/) apps (WordCraft for `.docx` documents, GridCraft for spreadsheets, DeckCraft for presentations, PdfCraft, PhotoCraft and more), installed from their official browser builds and running inside the windows. Their Open and Save dialogs use drive C:.
- **Always up to date**: when you open a program, Retro Computer checks for a new version and installs it first (or asks, or never checks: your choice). It also tells you when a new version of Retro Computer itself is out.
- **Claude Code** in the Command Prompt, working on your files, with your Claude subscription or an API key kept in the system's password vault.
- **Focus (Pomodoro)**, Notepad, Find, Run, Control Panel, screen saver and Help.

| | |
|---|---|
| ![WordCraft in a window](docs/img/en/wordcraft.png) | ![The Save As dialog, on drive C:](docs/img/en/save-as.png) |
| ![Claude Code in the Command Prompt](docs/img/en/claude.png) | ![The right-click menu](docs/img/en/file-menu.png) |
| ![Add or Remove Programs](docs/img/en/programs.png) | ![Choosing the language](docs/img/en/language.png) |

## Install

Download the installer for your system from the [latest release](https://github.com/EduChacon/Retro-Computer-for-Productivity/releases/latest):

| System | File |
|---|---|
| Windows | `Retro-Computer-…-win-x64.exe` (installer) or `…-win-x64.zip` |
| macOS | `…-mac-arm64.dmg` (Apple Silicon) or `…-mac-x64.dmg` (Intel) |
| Linux (PC) | `…-linux-amd64.deb` or `…-linux-x86_64.AppImage` |
| Linux (Raspberry Pi, 64-bit) | `…-linux-arm64.deb` or `…-linux-arm64.AppImage` |

The installers are not digitally signed yet, so the system asks for confirmation the first time:

- **macOS**: right-click the app › Open › Open (or System Settings › Privacy & Security › Open Anyway).
- **Windows**: on the SmartScreen screen, "More info" › "Run anyway".

### On a Raspberry Pi or a mini PC

Retro Computer can start by itself when the device is turned on, full screen, like a dedicated retro computer: see [the usage guide (in Portuguese), section 7](docs/uso.md#7-num-mini-computador-raspberry-pi-e-como-o-sistema-do-linux). In short:

- **Raspberry Pi 4 or 5 (4 GB or more)**: everything works, including the Craft apps and Claude Code.
- **Raspberry Pi 3 (1 GB)**: the desktop, Notepad, Focus and the Command Prompt work; the Craft apps need WebGL2, which the Pi 3's graphics chip lacks (they run in software, very slowly), and Claude Code officially needs 4 GB of memory.

## Develop

```
npm install      # installs the dependencies (and builds the terminal for Electron)
npm start        # opens Retro Computer
npm test         # tests: disk, languages and updates
```

The code and the developer guide are written in Portuguese; see [AGENTS.md](AGENTS.md) (for people and AI agents). Translations live in [`src/sistema/idiomas/`](src/sistema/idiomas/), and `node ferramentas/textos.js` lists any missing ones.

## Credits

System icons and fonts from [SerenityOS](https://github.com/SerenityOS/serenity) (BSD-2-Clause), plus the project's own drawings; terminal by xterm.js and node-pty; application built with Electron. The Craft apps are by the ArtCraft Team and are downloaded from their official releases. Details in [ATRIBUICOES.md](ATRIBUICOES.md).

The look pays tribute to the personal computers of the 1990s; no icon, font, sound or image from Microsoft or Apple is used.
