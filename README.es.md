# Retro Computer

[English](README.md) · [Português](README.pt-BR.md) · **Español**

Una computadora retro para la productividad: el escritorio de una PC de los años 90, con tus programas de trabajo, tus archivos y Claude Code, sin las distracciones de la computadora de hoy. Funciona en Windows, macOS y Linux (incluida la Raspberry Pi), y en Linux puede ser el sistema completo de la computadora, convirtiendo una laptop vieja o una mini PC en una computadora retro dedicada. Código abierto (licencia MIT).

- **Versión:** 1.0.0 · [Descargar](https://github.com/EduChacon/Retro-Computer-for-Productivity/releases/latest)
- **Idiomas:** español, inglés y portugués (Panel de control › Idioma)

![El escritorio y el menú Inicio](docs/img/es/inicio.png)

## Qué hace

- **Un escritorio de los años 90**: botón Inicio, barra de tareas, ventanas que se arrastran y cambian de tamaño, iconos, menús, la Papelera y el cuadro Apagar, con letras e iconos nítidos en cualquier monitor.
- **Una barra de tareas como la de hoy**: el cuadro de búsqueda y los programas anclados junto a Inicio; la bandeja con el Wi-Fi, el volumen, la batería y el brillo, el Bluetooth, las notificaciones y el calendario; y la pantalla de bloqueo con contraseña.
- **El disco C: es una carpeta de tu computadora** (`Documentos/Retro Computer`): lo que guardas también se ve fuera del programa. Para traer archivos, arrástralos a una ventana; para llevarlos, usa "Enviar a". El Explorador tiene el panel de carpetas, la dirección en la que se puede hacer clic y las miniaturas; las memorias USB y las tarjetas aparecen en Mi computadora, y los `.zip` se abren como carpetas.
- **Nada se pierde**: eliminar manda a la Papelera, y cada vez que guardas se conserva la versión anterior del archivo.
- **Programas de trabajo**: los [Craft](https://artcraft.run/) de código abierto (WordCraft para textos `.docx`, GridCraft para hojas de cálculo, DeckCraft para presentaciones, PdfCraft, PhotoCraft y otros), instalados desde su versión oficial para navegador y ejecutándose dentro de las ventanas. Sus cuadros Abrir y Guardar usan el disco C:. Los programas instalados en la computadora también se abren desde Inicio, y en Linux "Agregar o quitar programas" instala además los programas de Flathub.
- **Siempre actualizado**: al abrir un programa, Retro Computer busca la versión nueva y la instala antes (o pregunta, o no busca, como prefieras). Retro Computer también se actualiza solo.
- **Claude Code** en la Línea de comandos, trabajando en tus archivos, con tu suscripción de Claude o con una clave de API guardada en el almacén de contraseñas del sistema.
- **Internet**: el Navegador (cámara, micrófono y notificaciones solo con tu permiso) y tu correo de la web en una ventana; cualquier sitio se puede instalar como programa.
- **Herramientas incluidas**: Visor de imágenes, Reproductor multimedia, Captura de pantalla, Monitor del sistema, Calculadora, Bloc de notas, Enfoque (Pomodoro, cronómetro y temporizador), impresoras, Buscar, Ejecutar, Panel de control, protector de pantalla, Ayuda y tres juegos (Solitario, Buscaminas y Breakout).
- **Linux como sistema**: la sesión "Retro Computer" de la pantalla de inicio de sesión abre directo en él; Apagar apaga la computadora de verdad, los programas de Linux aparecen en la barra de tareas, las actualizaciones de seguridad se instalan desde el Panel de control, y las teclas del logotipo, de volumen, de brillo e Impr Pant funcionan.

| | |
|---|---|
| ![WordCraft en una ventana](docs/img/es/wordcraft.png) | ![Agregar o quitar programas](docs/img/es/programas.png) |
| ![El Explorador con el panel de carpetas y las miniaturas](docs/img/es/explorador.png) | ![El Reproductor multimedia](docs/img/es/reproductor.png) |

## Instalar

Descarga el instalador de tu sistema en la [última versión](https://github.com/EduChacon/Retro-Computer-for-Productivity/releases/latest):

| Sistema | Archivo |
|---|---|
| Windows | `Retro-Computer-…-win-x64.exe` (instalador) o `…-win-x64.zip` |
| macOS 12 o más nuevo | `…-mac-arm64.dmg` (Apple Silicon) o `…-mac-x64.dmg` (Intel) |
| Linux (PC) | `…-linux-amd64.deb` o `…-linux-x86_64.AppImage` |
| Linux (Raspberry Pi, 64 bits) | `…-linux-arm64.deb` o `…-linux-arm64.AppImage` |

Los instaladores todavía no tienen firma digital, por eso el sistema pide una confirmación la primera vez:

- **macOS**: clic derecho en la aplicación › Abrir › Abrir (o Ajustes del Sistema › Privacidad y seguridad › Abrir igualmente).
- **Windows**: en la pantalla de SmartScreen, "Más información" › "Ejecutar de todas formas".

### Como sistema de Linux (una laptop vieja, una Raspberry Pi o una mini PC)

Instala el paquete `.deb` (`sudo apt install ./Retro-Computer-1.0.0-linux-amd64.deb`, o el `arm64` en la Raspberry Pi) y elige la sesión **Retro Computer** en la pantalla de inicio de sesión: la computadora abre directo en Retro Computer, sin el escritorio de Linux debajo. Mira [la guía de uso (en portugués), sección 7](docs/uso.md#7-num-mini-computador-raspberry-pi-e-como-o-sistema-do-linux). En la Raspberry Pi 4 o 5 (4 GB o más) funciona todo; en la Raspberry Pi 3 (1 GB) funcionan el escritorio, el Bloc de notas, Enfoque y la Línea de comandos, pero los Craft (que necesitan WebGL2) van muy lentos y Claude Code pide 4 GB de memoria.

## Desarrollar

```
npm install      # instala las dependencias (y compila la terminal para Electron)
npm start        # abre Retro Computer
npm test         # las pruebas
```

El código y la guía para desarrolladores están en portugués: [AGENTS.md](AGENTS.md). Las traducciones están en [`src/sistema/idiomas/`](src/sistema/idiomas/), y `node ferramentas/textos.js` muestra las que faltan.

## Créditos

Iconos y fuentes del sistema de [SerenityOS](https://github.com/SerenityOS/serenity) (BSD-2-Clause), con dibujos propios del proyecto; terminal con xterm.js y node-pty; los `.zip` con yauzl y yazl; la actualización de la aplicación con electron-updater; aplicación hecha con Electron. Los programas de Linux vienen de Flathub. Los Craft son del ArtCraft Team y se descargan de sus versiones oficiales. Detalles en [ATRIBUICOES.md](ATRIBUICOES.md).

El aspecto rinde homenaje a las computadoras personales de los años 90; no se usa ningún icono, fuente, sonido ni imagen de Microsoft ni de Apple.
