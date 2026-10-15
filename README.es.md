# Retro Computer

[English](README.md) · [Português](README.pt-BR.md) · **Español**

Una computadora retro para la productividad: el escritorio de una PC de los años 90, con tus programas de trabajo, tus archivos y Claude Code, sin las distracciones de la computadora de hoy. Funciona en Windows, macOS y Linux (incluida la Raspberry Pi). Código abierto (licencia MIT).

- **Versión:** 0.2.0 · [Descargar](https://github.com/EduChacon/Retro-Computer-for-Productivity/releases/latest)
- **Idiomas:** español, inglés y portugués (Panel de control › Idioma)

![El escritorio y el menú Inicio](docs/img/es/inicio.png)

## Qué hace

- **Un escritorio de los años 90**: botón Inicio, barra de tareas, ventanas que se arrastran y cambian de tamaño, iconos, menús, la Papelera y el cuadro Apagar, con letras e iconos nítidos en cualquier monitor.
- **El disco C: es una carpeta de tu computadora** (`Documentos/Retro Computer`): lo que guardas también se ve fuera del programa. Para traer archivos, arrástralos a una ventana; para llevarlos, usa "Enviar a".
- **Nada se pierde**: eliminar manda a la Papelera, y cada vez que guardas se conserva la versión anterior del archivo.
- **Programas de trabajo**: los [Craft](https://artcraft.run/) de código abierto (WordCraft para textos `.docx`, GridCraft para hojas de cálculo, DeckCraft para presentaciones, PdfCraft, PhotoCraft y otros), instalados desde su versión oficial para navegador y ejecutándose dentro de las ventanas. Sus cuadros Abrir y Guardar usan el disco C:.
- **Siempre actualizado**: al abrir un programa, Retro Computer busca la versión nueva y la instala antes (o pregunta, o no busca, como prefieras). También avisa cuando sale una versión nueva de Retro Computer.
- **Claude Code** en la Línea de comandos, trabajando en tus archivos, con tu suscripción de Claude o con una clave de API guardada en el almacén de contraseñas del sistema.
- **Enfoque (Pomodoro)**, Bloc de notas, Buscar, Ejecutar, Panel de control, protector de pantalla y Ayuda.

| | |
|---|---|
| ![WordCraft en una ventana](docs/img/es/wordcraft.png) | ![Agregar o quitar programas](docs/img/es/programas.png) |

## Instalar

Descarga el instalador de tu sistema en la [última versión](https://github.com/EduChacon/Retro-Computer-for-Productivity/releases/latest):

| Sistema | Archivo |
|---|---|
| Windows | `Retro-Computer-…-win-x64.exe` (instalador) o `…-win-x64.zip` |
| macOS | `…-mac-arm64.dmg` (Apple Silicon) o `…-mac-x64.dmg` (Intel) |
| Linux (PC) | `…-linux-amd64.deb` o `…-linux-x86_64.AppImage` |
| Linux (Raspberry Pi, 64 bits) | `…-linux-arm64.deb` o `…-linux-arm64.AppImage` |

Los instaladores todavía no tienen firma digital, por eso el sistema pide una confirmación la primera vez:

- **macOS**: clic derecho en la aplicación › Abrir › Abrir (o Ajustes del Sistema › Privacidad y seguridad › Abrir igualmente).
- **Windows**: en la pantalla de SmartScreen, "Más información" › "Ejecutar de todas formas".

### En una Raspberry Pi o una mini PC

Retro Computer puede abrirse solo al encender el aparato, en pantalla completa, como una computadora retro dedicada: mira [la guía de uso (en portugués), sección 7](docs/uso.md#7-num-mini-computador-raspberry-pi-e-como-o-sistema-do-linux). En resumen: en la Raspberry Pi 4 o 5 (4 GB o más) funciona todo; en la Raspberry Pi 3 (1 GB) funcionan el escritorio, el Bloc de notas, Enfoque y la Línea de comandos, pero los Craft (que necesitan WebGL2) van muy lentos y Claude Code pide 4 GB de memoria.

## Desarrollar

```
npm install      # instala las dependencias (y compila la terminal para Electron)
npm start        # abre Retro Computer
npm test         # pruebas: disco, idiomas y actualizaciones
```

El código y la guía para desarrolladores están en portugués: [AGENTS.md](AGENTS.md). Las traducciones están en [`src/sistema/idiomas/`](src/sistema/idiomas/), y `node ferramentas/textos.js` muestra las que faltan.

## Créditos

Iconos y fuentes del sistema de [SerenityOS](https://github.com/SerenityOS/serenity) (BSD-2-Clause), con dibujos propios del proyecto; terminal con xterm.js y node-pty; aplicación hecha con Electron. Los Craft son del ArtCraft Team y se descargan de sus versiones oficiales. Detalles en [ATRIBUICOES.md](ATRIBUICOES.md).

El aspecto rinde homenaje a las computadoras personales de los años 90; no se usa ningún icono, fuente, sonido ni imagen de Microsoft ni de Apple.
