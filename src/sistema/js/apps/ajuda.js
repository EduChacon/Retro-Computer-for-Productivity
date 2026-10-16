/* A Ajuda: os tópicos de uso do Retro Computer, nos três idiomas. */
import { h, img } from '../util.js';
import { Janela, lista as janelas } from '../janelas.js';
import { registrarApp, abrir } from '../sistema.js';
import { tr, idiomaAtual } from '../idioma.js';

// Cada tópico tem o título e o texto em cada idioma (o português vale quando falta).
const TOPICOS = [
  {
    id: 'inicio', icone: 'logo',
    'pt-BR': ['Bem-vindo', `
<h2>O que é o Retro Computer</h2>
<p>Um computador de produtividade com o visual dos anos 90: poucas distrações, os programas de trabalho e os seus arquivos à mão.</p>
<p>Ele não é uma máquina virtual: os programas rodam no seu computador de verdade, e o disco C: é uma pasta comum dele. Por isso é leve, abre rápido e nada fica preso lá dentro.</p>
<h2>Primeiros passos</h2>
<p>1. Abra <b>Meus documentos</b> e leia o <b>Leia-me.txt</b>.</p>
<p>2. Instale os programas em <b>Iniciar › Configurações › Adicionar ou remover programas</b>.</p>
<p>3. Para a internet, use o <b>Navegador</b> e o <b>E-mail</b>, na barra de tarefas.</p>
<p>4. Para o Claude, use o ícone <b>Claude</b> na área de trabalho.</p>
<p>5. Para trabalhar sem interrupções, use o <b>Foco</b> (Iniciar › Programas › Acessórios).</p>
<p>O idioma (português, inglês ou espanhol) fica em <b>Painel de controle › Idioma</b>. Os tópicos ao lado explicam cada parte; <b>F1</b> abre esta Ajuda de qualquer lugar.</p>`],
    en: ['Welcome', `
<h2>What Retro Computer is</h2>
<p>A productivity computer with the look of the 1990s: few distractions, your work programs and your files at hand.</p>
<p>It is not a virtual machine: the programs run on your real computer, and drive C: is an ordinary folder on it. That is why it is light, starts quickly and nothing gets locked inside.</p>
<h2>First steps</h2>
<p>1. Open <b>Documents</b> and read <b>Read me.txt</b>.</p>
<p>2. Install programs from <b>Start › Settings › Add or Remove Programs</b>.</p>
<p>3. For the internet, use the <b>Browser</b> and <b>E-mail</b>, on the taskbar.</p>
<p>4. For Claude, use the <b>Claude</b> icon on the desktop.</p>
<p>5. To work without interruptions, use <b>Focus</b> (Start › Programs › Accessories).</p>
<p>The language (Portuguese, English or Spanish) is in <b>Control Panel › Language</b>. The topics on the left explain each part; <b>F1</b> opens this Help from anywhere.</p>`],
    es: ['Bienvenido', `
<h2>Qué es Retro Computer</h2>
<p>Una computadora de productividad con el aspecto de los años 90: pocas distracciones, los programas de trabajo y tus archivos a mano.</p>
<p>No es una máquina virtual: los programas se ejecutan en tu computadora real, y el disco C: es una carpeta común de ella. Por eso es liviano, abre rápido y nada queda atrapado adentro.</p>
<h2>Primeros pasos</h2>
<p>1. Abre <b>Mis documentos</b> y lee <b>Léame.txt</b>.</p>
<p>2. Instala los programas en <b>Inicio › Configuración › Agregar o quitar programas</b>.</p>
<p>3. Para internet, usa el <b>Navegador</b> y el <b>Correo</b>, en la barra de tareas.</p>
<p>4. Para Claude, usa el icono <b>Claude</b> del escritorio.</p>
<p>5. Para trabajar sin interrupciones, usa <b>Enfoque</b> (Inicio › Programas › Accesorios).</p>
<p>El idioma (portugués, inglés o español) está en <b>Panel de control › Idioma</b>. Los temas de la izquierda explican cada parte; <b>F1</b> abre esta Ayuda desde cualquier lugar.</p>`],
  },
  {
    id: 'arquivos', icone: 'disco',
    'pt-BR': ['O disco C: e os arquivos', `
<h2>Onde ficam os arquivos</h2>
<p>O disco C: é uma pasta do computador principal (veja qual em Painel de controle › Disco C:). Tudo o que você salva fica nela e pode ser aberto também fora do Retro Computer.</p>
<h2>O Explorador</h2>
<p><b>Meu computador</b> mostra o disco C:, os pendrives e a Lixeira. <b>Exibir › Barra de pastas</b> (ou o botão <b>Pastas</b>) mostra as pastas à esquerda. Cada nome do endereço, no alto, leva àquela pasta; para digitar um endereço, clique no espaço vazio ao lado (ou Alt+D). <b>Exibir › Miniaturas</b> mostra as fotos encolhidas.</p>
<h2>Trazer arquivos</h2>
<p>Arraste arquivos do computador principal para uma janela de pasta ou para a área de trabalho. Eles são copiados para o disco C:. Também dá para usar o menu Arquivo › Trazer do computador principal.</p>
<h2>Levar arquivos</h2>
<p>Botão direito no arquivo › <b>Enviar para</b> › Área de trabalho ou Downloads do computador principal. Ou <b>Mostrar no computador principal</b>, para abrir a pasta lá.</p>
<h2>Pastas compactadas</h2>
<p>Um arquivo .zip abre como uma pasta. Botão direito › <b>Extrair tudo</b> cria uma pasta nova ao lado, com o que há dentro (vale também para os .tar). Para compactar: botão direito › <b>Enviar para › Pasta compactada (zip)</b>.</p>
<h2>Nada se perde</h2>
<p><b>Excluir</b> manda para a Lixeira, de onde dá para restaurar. Os itens só somem quando você esvazia a Lixeira.</p>
<p>Cada vez que um arquivo é gravado por cima, a versão anterior fica guardada: botão direito › <b>Versões anteriores</b>.</p>
<h2>Teclas</h2>
<p>Enter abre, F2 renomeia, Delete exclui, Backspace sobe uma pasta, Ctrl+C, Ctrl+X e Ctrl+V copiam, recortam e colam.</p>`],
    en: ['Drive C: and your files', `
<h2>Where the files are</h2>
<p>Drive C: is a folder on the main computer (see which one in Control Panel › Drive C:). Everything you save stays there and can also be opened outside Retro Computer.</p>
<h2>The Explorer</h2>
<p><b>Computer</b> shows drive C:, the USB drives and the Trash. <b>View › Folders Bar</b> (or the <b>Folders</b> button) shows the folders on the left. Each name in the address at the top leads to that folder; to type an address, click the empty space next to it (or Alt+D). <b>View › Thumbnails</b> shows the pictures in small size.</p>
<h2>Bringing files in</h2>
<p>Drag files from the main computer onto a folder window or onto the desktop. They are copied to drive C:. You can also use the File › Bring from the main computer menu.</p>
<h2>Taking files out</h2>
<p>Right-click the file › <b>Send to</b> › Desktop or Downloads of the main computer. Or <b>Show on the main computer</b>, to open the folder there.</p>
<h2>Compressed folders</h2>
<p>A .zip file opens like a folder. Right-click › <b>Extract all</b> creates a new folder next to it with what is inside (it also works for .tar files). To compress: right-click › <b>Send to › Compressed folder (zip)</b>.</p>
<h2>Nothing gets lost</h2>
<p><b>Delete</b> sends items to the Trash, where they can be restored. They are only gone when you empty the Trash.</p>
<p>Every time a file is saved over, the previous version is kept: right-click › <b>Previous versions</b>.</p>
<h2>Keys</h2>
<p>Enter opens, F2 renames, Delete deletes, Backspace goes up a folder, Ctrl+C, Ctrl+X and Ctrl+V copy, cut and paste.</p>`],
    es: ['El disco C: y los archivos', `
<h2>Dónde están los archivos</h2>
<p>El disco C: es una carpeta de la computadora principal (mira cuál en Panel de control › Disco C:). Todo lo que guardas queda en ella y también se puede abrir fuera de Retro Computer.</p>
<h2>El Explorador</h2>
<p><b>Mi computadora</b> muestra el disco C:, las memorias USB y la Papelera. <b>Ver › Panel de carpetas</b> (o el botón <b>Carpetas</b>) muestra las carpetas a la izquierda. Cada nombre de la dirección, arriba, lleva a esa carpeta; para escribir una dirección, haz clic en el espacio vacío de al lado (o Alt+D). <b>Ver › Miniaturas</b> muestra las fotos en pequeño.</p>
<h2>Traer archivos</h2>
<p>Arrastra archivos de la computadora principal a una ventana de carpeta o al escritorio. Se copian al disco C:. También puedes usar el menú Archivo › Traer de la computadora principal.</p>
<h2>Llevar archivos</h2>
<p>Clic derecho en el archivo › <b>Enviar a</b> › Escritorio o Descargas de la computadora principal. O <b>Mostrar en la computadora principal</b>, para abrir la carpeta allí.</p>
<h2>Carpetas comprimidas</h2>
<p>Un archivo .zip se abre como una carpeta. Clic derecho › <b>Extraer todo</b> crea una carpeta nueva al lado con lo que hay dentro (también sirve para los .tar). Para comprimir: clic derecho › <b>Enviar a › Carpeta comprimida (zip)</b>.</p>
<h2>Nada se pierde</h2>
<p><b>Eliminar</b> manda a la Papelera, desde donde se puede restaurar. Los elementos solo desaparecen cuando vacías la Papelera.</p>
<p>Cada vez que un archivo se guarda encima, la versión anterior queda guardada: clic derecho › <b>Versiones anteriores</b>.</p>
<h2>Teclas</h2>
<p>Enter abre, F2 cambia el nombre, Supr elimina, Retroceso sube una carpeta, Ctrl+C, Ctrl+X y Ctrl+V copian, cortan y pegan.</p>`],
  },
  {
    id: 'pendrives', icone: 'removivel',
    'pt-BR': ['Pendrives e cartões', `
<h2>Onde aparecem</h2>
<p>Os pendrives, os cartões de memória e os discos externos aparecem em <b>Meu computador</b>, com o espaço livre. No Retro Computer como sistema do Linux, eles são montados sozinhos ao chegar, com um aviso.</p>
<h2>Abrir e trazer</h2>
<p>Dois cliques num arquivo do pendrive o copiam para <b>Meus documentos › Recebidos</b> e o abrem de lá; o original fica como estava. Para trazer vários, selecione-os e use o botão direito › <b>Copiar para Meus documentos</b> ou <b>Copiar para a Área de trabalho</b>.</p>
<h2>Levar</h2>
<p>Botão direito num arquivo do disco C: › <b>Enviar para</b> › o pendrive. Copiar e Colar também funcionam. Nada é apagado nem gravado por cima no pendrive.</p>
<h2>Retirar</h2>
<p>Antes de tirar o pendrive, use o botão direito nele › <b>Remover com segurança</b> e espere o aviso.</p>`],
    en: ['USB drives and cards', `
<h2>Where they show up</h2>
<p>USB drives, memory cards and external disks show up in <b>Computer</b>, with their free space. With Retro Computer as the Linux system, they are mounted automatically when plugged in, with a notice.</p>
<h2>Opening and bringing in</h2>
<p>Double-clicking a file on the USB drive copies it to <b>Documents › Received</b> and opens it from there; the original stays as it was. To bring in several files, select them and right-click › <b>Copy to Documents</b> or <b>Copy to the Desktop</b>.</p>
<h2>Taking out</h2>
<p>Right-click a file on drive C: › <b>Send to</b> › the USB drive. Copy and Paste also work. Nothing on the USB drive is deleted or overwritten.</p>
<h2>Removing</h2>
<p>Before unplugging the USB drive, right-click it › <b>Safely remove</b> and wait for the notice.</p>`],
    es: ['Memorias USB y tarjetas', `
<h2>Dónde aparecen</h2>
<p>Las memorias USB, las tarjetas de memoria y los discos externos aparecen en <b>Mi computadora</b>, con el espacio libre. Con Retro Computer como sistema de Linux, se montan solos al conectarlos, con un aviso.</p>
<h2>Abrir y traer</h2>
<p>Un doble clic en un archivo de la memoria lo copia a <b>Mis documentos › Recibidos</b> y lo abre desde allí; el original queda como estaba. Para traer varios, selecciónalos y usa el clic derecho › <b>Copiar a Mis documentos</b> o <b>Copiar al Escritorio</b>.</p>
<h2>Llevar</h2>
<p>Clic derecho en un archivo del disco C: › <b>Enviar a</b> › la memoria. Copiar y Pegar también funcionan. Nada de la memoria se borra ni se sobrescribe.</p>
<h2>Retirar</h2>
<p>Antes de sacar la memoria, usa el clic derecho en ella › <b>Quitar de forma segura</b> y espera el aviso.</p>`],
  },
  {
    id: 'barra', icone: 'relogio',
    'pt-BR': ['A barra de tarefas', `
<h2>À esquerda</h2>
<p>O botão <b>Iniciar</b>, a caixa de busca (que acha programas, opções do Painel de controle e arquivos do disco C:; com Enter, pesquisa na internet) e os programas fixados. Para fixar um programa, use o botão direito no botão da janela dele ou num ícone › <b>Fixar na barra de tarefas</b>.</p>
<p>Uma conta na caixa de busca (<b>12*3,5</b>, <b>200 × 15%</b>, <b>√2</b>) mostra o resultado primeiro; Enter o copia.</p>
<p>Os botões das janelas mostram o nome. Para ver só os ícones, agrupados por programa, use o botão direito na barra › <b>Botões das janelas</b>. A roda do mouse num botão abre outra janela do programa.</p>
<h2>A bandeja, à direita</h2>
<p><b>Rede</b>: as redes Wi-Fi, conectar e desconectar (no Linux). <b>Volume</b>: o som do computador. <b>Bateria</b>: a carga, o brilho da tela, o modo de energia (economia, equilibrado ou desempenho, no Linux) e a bateria do mouse e do teclado sem fio, com o aviso de bateria fraca. <b>Bluetooth</b>: os aparelhos sem fio (no Linux). <b>Sino</b>: as notificações e o <b>Não perturbe</b>.</p>
<p>Um clique no <b>relógio</b> abre o calendário; o botão direito nele › <b>Mostrar a data</b> põe a data embaixo da hora.</p>`],
    en: ['The taskbar', `
<h2>On the left</h2>
<p>The <b>Start</b> button, the search box (it finds programs, Control Panel options and files on drive C:; with Enter, it searches the internet) and the pinned programs. To pin a program, right-click its window button or an icon › <b>Pin to the taskbar</b>.</p>
<p>A calculation in the search box (<b>12*3.5</b>, <b>200 × 15%</b>, <b>√2</b>) shows the result first; Enter copies it.</p>
<p>The window buttons show the name. To see only the icons, grouped by program, right-click the taskbar › <b>Taskbar buttons</b>. The mouse wheel on a button opens another window of the program.</p>
<h2>The tray, on the right</h2>
<p><b>Network</b>: the Wi-Fi networks, connecting and disconnecting (on Linux). <b>Volume</b>: the computer's sound. <b>Battery</b>: the charge, the screen brightness, the power mode (power saver, balanced or performance, on Linux) and the battery of a wireless mouse or keyboard, with the low battery notice. <b>Bluetooth</b>: the wireless devices (on Linux). <b>Bell</b>: the notifications and <b>Do not disturb</b>.</p>
<p>A click on the <b>clock</b> opens the calendar; right-click it › <b>Show the date</b> to put the date under the time.</p>`],
    es: ['La barra de tareas', `
<h2>A la izquierda</h2>
<p>El botón <b>Inicio</b>, el cuadro de búsqueda (encuentra programas, opciones del Panel de control y archivos del disco C:; con Enter, busca en internet) y los programas anclados. Para anclar un programa, usa el clic derecho en el botón de su ventana o en un icono › <b>Anclar a la barra de tareas</b>.</p>
<p>Una cuenta en el cuadro de búsqueda (<b>12*3,5</b>, <b>200 × 15%</b>, <b>√2</b>) muestra el resultado primero; Enter lo copia.</p>
<p>Los botones de las ventanas muestran el nombre. Para ver solo los íconos, agrupados por programa, usa el clic derecho en la barra › <b>Botones de las ventanas</b>. La rueda del mouse en un botón abre otra ventana del programa.</p>
<h2>La bandeja, a la derecha</h2>
<p><b>Red</b>: las redes Wi-Fi, conectar y desconectar (en Linux). <b>Volumen</b>: el sonido de la computadora. <b>Batería</b>: la carga, el brillo de la pantalla, el modo de energía (ahorro, equilibrado o rendimiento, en Linux) y la batería del mouse y del teclado inalámbricos, con el aviso de batería baja. <b>Bluetooth</b>: los dispositivos inalámbricos (en Linux). <b>Campana</b>: las notificaciones y el <b>No molestar</b>.</p>
<p>Un clic en el <b>reloj</b> abre el calendario; el clic derecho en él › <b>Mostrar la fecha</b> pone la fecha debajo de la hora.</p>`],
  },
  {
    id: 'programas', icone: 'programas-caixa',
    'pt-BR': ['Programas', `
<h2>Instalar</h2>
<p>Em <b>Adicionar ou remover programas</b>, escolha o programa e clique em Instalar. Ele vem do lançamento oficial (a versão para navegador) e depois funciona sem internet.</p>
<p>Os programas recomendados são os <b>Craft</b>: WordCraft (textos .docx), GridCraft (planilhas), DeckCraft (apresentações), PdfCraft (PDF), PhotoCraft (imagens) e outros. São novos e de código aberto: alguns recursos ainda faltam.</p>
<h2>Atualizações</h2>
<p>Ao abrir um programa, o Retro Computer procura uma versão nova dele (com internet) e a instala antes de abrir. Em <b>Adicionar ou remover programas</b>, escolha entre atualizar sozinho, perguntar antes ou nunca procurar. O próprio Retro Computer também avisa quando há versão nova dele.</p>
<h2>Abrir e salvar</h2>
<p>Os comandos Abrir e Salvar dos programas usam as caixas do Retro Computer, no disco C:. Dois cliques num documento abrem o programa certo; um arquivo que veio do disco é salvo de volta no mesmo lugar.</p>
<h2>Programas do computador</h2>
<p><b>Iniciar › Programas › Programas do computador</b> lista os programas instalados no computador principal; cada um pode ganhar um atalho na área de trabalho e no menu Iniciar.</p>
<h2>Programas do Linux</h2>
<p>No Linux, Adicionar ou remover programas tem a aba <b>Programas do Linux</b>, com os programas do Flathub: pesquise, veja a ficha de cada um e instale sem senha. Eles aparecem com os Programas do computador.</p>
<h2>Sem internet?</h2>
<p>Baixe o pacote "nome-web-versão.zip" em outro lugar e use <b>Instalar de um arquivo .zip</b>.</p>`],
    en: ['Programs', `
<h2>Installing</h2>
<p>In <b>Add or Remove Programs</b>, choose the program and click Install. It comes from the official release (the browser version) and then works offline.</p>
<p>The recommended programs are the <b>Craft</b> apps: WordCraft (.docx documents), GridCraft (spreadsheets), DeckCraft (presentations), PdfCraft (PDF), PhotoCraft (images) and others. They are new and open source: some features are still missing.</p>
<h2>Updates</h2>
<p>When you open a program, Retro Computer looks for a new version of it (when online) and installs it before opening. In <b>Add or Remove Programs</b>, choose between updating automatically, asking first or never checking. Retro Computer also tells you when a new version of itself is out.</p>
<h2>Opening and saving</h2>
<p>The programs' Open and Save commands use the Retro Computer dialogs, on drive C:. Double-clicking a document opens the right program; a file that came from the disk is saved back to the same place.</p>
<h2>Computer programs</h2>
<p><b>Start › Programs › Computer programs</b> lists the programs installed on the main computer; each one can get a shortcut on the desktop and in the Start menu.</p>
<h2>Linux programs</h2>
<p>On Linux, Add or Remove Programs has the <b>Linux programs</b> tab, with the programs from Flathub: search, see each one's details and install without a password. They show up with the Computer programs.</p>
<h2>No internet?</h2>
<p>Download the "name-web-version.zip" package somewhere else and use <b>Install from a .zip file</b>.</p>`],
    es: ['Programas', `
<h2>Instalar</h2>
<p>En <b>Agregar o quitar programas</b>, elige el programa y haz clic en Instalar. Viene de la versión oficial (la versión para navegador) y después funciona sin internet.</p>
<p>Los programas recomendados son los <b>Craft</b>: WordCraft (textos .docx), GridCraft (hojas de cálculo), DeckCraft (presentaciones), PdfCraft (PDF), PhotoCraft (imágenes) y otros. Son nuevos y de código abierto: todavía faltan algunas funciones.</p>
<h2>Actualizaciones</h2>
<p>Al abrir un programa, Retro Computer busca una versión nueva (con internet) y la instala antes de abrirlo. En <b>Agregar o quitar programas</b>, elige entre actualizar solo, preguntar antes o no buscar nunca. Retro Computer también avisa cuando hay una versión nueva de sí mismo.</p>
<h2>Abrir y guardar</h2>
<p>Los comandos Abrir y Guardar de los programas usan los cuadros de Retro Computer, en el disco C:. Un doble clic en un documento abre el programa correcto; un archivo que vino del disco se guarda de vuelta en el mismo lugar.</p>
<h2>Programas de la computadora</h2>
<p><b>Inicio › Programas › Programas de la computadora</b> muestra los programas instalados en la computadora principal; cada uno puede tener un acceso directo en el escritorio y en el menú Inicio.</p>
<h2>Programas de Linux</h2>
<p>En Linux, Agregar o quitar programas tiene la pestaña <b>Programas de Linux</b>, con los programas de Flathub: busca, mira la ficha de cada uno e instala sin contraseña. Aparecen junto a los Programas de la computadora.</p>
<h2>¿Sin internet?</h2>
<p>Descarga el paquete "nombre-web-versión.zip" en otro lugar y usa <b>Instalar desde un archivo .zip</b>.</p>`],
  },
  {
    id: 'internet', icone: 'navegador',
    'pt-BR': ['Navegador e e-mail', `
<h2>O Navegador</h2>
<p>Abre os sites em janelas do Retro Computer, com favoritos, pesquisa, zoom, Localizar e Imprimir. Os downloads vão para <b>Meus documentos › Recebidos</b>. A câmera, o microfone, a localização e as notificações de cada site pedem a sua permissão; para esquecer as respostas, use Painel de controle › Internet.</p>
<p>Os endereços <b>http://</b> abrem na versão segura (https://). O site que não a tiver mostra um aviso, com a escolha de abri-lo assim mesmo; os aparelhos da rede de casa (o roteador, a impressora) ficam de fora. Para desligar: Painel de controle › Segurança › Privacidade.</p>
<h2>Vídeos e músicas</h2>
<p>Os sites de vídeo e de música comuns, como o YouTube, funcionam. Os serviços com proteção contra cópia (Netflix, Prime Video, Disney+ e o Spotify na web) não tocam no Navegador: use para eles o navegador do computador principal (no Linux, o Firefox ou o Chrome da aba Programas do Linux).</p>
<h2>O e-mail</h2>
<p>O <b>E-mail</b> abre o seu e-mail da web (escolhido na primeira vez) numa janela própria. Para trocar, use Painel de controle › Internet.</p>
<h2>Sites como programas</h2>
<p>No Navegador, <b>Arquivo › Instalar como programa</b> transforma o site aberto num programa: ele ganha ícone, janela própria (sem a barra de endereço) e lugar no menu Iniciar, na área de trabalho e, se você quiser, na barra de tarefas. Para desinstalar, use o menu <b>Página</b> da janela dele ou Painel de controle › Internet › <b>Programas da internet</b>.</p>`],
    en: ['Browser and e-mail', `
<h2>The Browser</h2>
<p>It opens websites in Retro Computer windows, with favorites, search, zoom, Find and Print. Downloads go to <b>Documents › Received</b>. Each site's access to the camera, the microphone, the location and notifications asks for your permission; to forget the answers, use Control Panel › Internet.</p>
<p><b>http://</b> addresses open in the secure version (https://). A site without one shows a warning, with the choice to open it anyway; the devices on the home network (the router, the printer) are left out. To turn this off: Control Panel › Security › Privacy.</p>
<h2>Videos and music</h2>
<p>The usual video and music sites, such as YouTube, work. Services with copy protection (Netflix, Prime Video, Disney+ and Spotify on the web) do not play in the Browser: for them, use the main computer's browser (on Linux, Firefox or Chrome from the Linux programs tab).</p>
<h2>E-mail</h2>
<p><b>E-mail</b> opens your web e-mail (chosen the first time) in a window of its own. To change it, use Control Panel › Internet.</p>
<h2>Sites as programs</h2>
<p>In the Browser, <b>File › Install as Program</b> turns the open site into a program: it gets an icon, its own window (without the address bar) and a place in the Start menu, on the desktop and, if you want, on the taskbar. To uninstall it, use the <b>Page</b> menu of its window or Control Panel › Internet › <b>Internet programs</b>.</p>`],
    es: ['Navegador y correo', `
<h2>El Navegador</h2>
<p>Abre los sitios en ventanas de Retro Computer, con favoritos, búsqueda, zoom, Buscar e Imprimir. Las descargas van a <b>Mis documentos › Recibidos</b>. La cámara, el micrófono, la ubicación y las notificaciones de cada sitio piden tu permiso; para olvidar las respuestas, usa Panel de control › Internet.</p>
<p>Las direcciones <b>http://</b> se abren en la versión segura (https://). El sitio que no la tenga muestra un aviso, con la opción de abrirlo de todos modos; los aparatos de la red de casa (el router, la impresora) quedan fuera. Para desactivarlo: Panel de control › Seguridad › Privacidad.</p>
<h2>Videos y música</h2>
<p>Los sitios de video y de música comunes, como YouTube, funcionan. Los servicios con protección contra copia (Netflix, Prime Video, Disney+ y Spotify en la web) no se reproducen en el Navegador: para ellos, usa el navegador de la computadora principal (en Linux, Firefox o Chrome de la pestaña Programas de Linux).</p>
<h2>El correo</h2>
<p>El <b>Correo</b> abre tu correo de la web (elegido la primera vez) en una ventana propia. Para cambiarlo, usa Panel de control › Internet.</p>
<h2>Sitios como programas</h2>
<p>En el Navegador, <b>Archivo › Instalar como programa</b> convierte el sitio abierto en un programa: recibe un icono, ventana propia (sin la barra de dirección) y lugar en el menú Inicio, en el escritorio y, si quieres, en la barra de tareas. Para desinstalarlo, usa el menú <b>Página</b> de su ventana o Panel de control › Internet › <b>Programas de internet</b>.</p>`],
  },
  {
    id: 'acessorios', icone: 'pasta-programas',
    'pt-BR': ['Acessórios e jogos', `
<h2>Em Iniciar › Programas › Acessórios</h2>
<p><b>Visualizador de imagens</b>: as fotos da pasta, uma a uma (com as setas), ampliar, girar, imprimir e a apresentação de slides (F5).</p>
<p><b>Reprodutor de mídia</b>: os vídeos e as músicas do disco, com as legendas .srt ou .vtt de mesmo nome e a tela cheia (Alt+Enter).</p>
<p><b>Captura de tela</b>: a tela inteira, a janela da frente ou um pedaço escolhido com o mouse. As capturas ficam em <b>Meus documentos › Capturas de tela</b> e vão também para a área de transferência.</p>
<p><b>Monitor do sistema</b> (Ctrl+Shift+Esc): os programas abertos, os processos e o uso do processador e da memória; finaliza um programa travado.</p>
<p><b>Área de transferência</b> (logotipo + V): os últimos 25 textos copiados em qualquer programa; Enter cola o escolhido na posição do cursor, e o "…" de cada um fixa ou exclui. A lista fica só na memória e some ao fechar o Retro Computer.</p>
<p><b>Mapa de caracteres</b>: os acentos, os símbolos (§, º, “ ”, –, €…) e as letras de outros alfabetos, em grupos. Segurar o botão sobre um caractere o amplia; dois cliques o juntam à caixa de baixo, e Copiar o leva à área de transferência.</p>
<p><b>Calculadora</b>, <b>Bloco de notas</b> (com Imprimir, Ctrl+P) e <b>Prompt de comando</b>.</p>
<h2>Jogos</h2>
<p>Paciência, Campo Minado e Breakout, para as pausas.</p>`],
    en: ['Accessories and games', `
<h2>In Start › Programs › Accessories</h2>
<p><b>Image Viewer</b>: the pictures in the folder, one by one (with the arrow keys), zoom, rotate, print and the slide show (F5).</p>
<p><b>Media Player</b>: the videos and music on the disk, with the .srt or .vtt subtitles of the same name and full screen (Alt+Enter).</p>
<p><b>Screenshot</b>: the whole screen, the front window or a piece chosen with the mouse. Screenshots are kept in <b>Documents › Screenshots</b> and also go to the clipboard.</p>
<p><b>System Monitor</b> (Ctrl+Shift+Esc): the open programs, the processes and the processor and memory use; it ends a program that froze.</p>
<p><b>Clipboard</b> (logo + V): the last 25 texts copied in any program; Enter pastes the chosen one where the cursor was, and the "…" of each one pins or deletes it. The list stays in memory only and is gone when Retro Computer closes.</p>
<p><b>Character Map</b>: accents, symbols (§, º, “ ”, –, €…) and the letters of other alphabets, in groups. Holding the button on a character enlarges it; a double-click adds it to the box below, and Copy sends it to the clipboard.</p>
<p><b>Calculator</b>, <b>Notepad</b> (with Print, Ctrl+P) and <b>Command Prompt</b>.</p>
<h2>Games</h2>
<p>Solitaire, Minesweeper and Breakout, for the breaks.</p>`],
    es: ['Accesorios y juegos', `
<h2>En Inicio › Programas › Accesorios</h2>
<p><b>Visor de imágenes</b>: las fotos de la carpeta, una a una (con las flechas), ampliar, girar, imprimir y la presentación de diapositivas (F5).</p>
<p><b>Reproductor multimedia</b>: los videos y la música del disco, con los subtítulos .srt o .vtt del mismo nombre y la pantalla completa (Alt+Enter).</p>
<p><b>Captura de pantalla</b>: la pantalla entera, la ventana del frente o un trozo elegido con el mouse. Las capturas quedan en <b>Mis documentos › Capturas de pantalla</b> y también van al portapapeles.</p>
<p><b>Monitor del sistema</b> (Ctrl+Shift+Esc): los programas abiertos, los procesos y el uso del procesador y de la memoria; finaliza un programa que se colgó.</p>
<p><b>Portapapeles</b> (logotipo + V): los últimos 25 textos copiados en cualquier programa; Enter pega el elegido donde estaba el cursor, y el "…" de cada uno lo ancla o lo elimina. La lista queda solo en la memoria y desaparece al cerrar Retro Computer.</p>
<p><b>Mapa de caracteres</b>: los acentos, los símbolos (§, º, “ ”, –, €…) y las letras de otros alfabetos, en grupos. Mantener el botón sobre un carácter lo amplía; el doble clic lo agrega al cuadro de abajo, y Copiar lo lleva al portapapeles.</p>
<p><b>Calculadora</b>, <b>Bloc de notas</b> (con Imprimir, Ctrl+P) y <b>Línea de comandos</b>.</p>
<h2>Juegos</h2>
<p>Solitario, Buscaminas y Breakout, para las pausas.</p>`],
  },
  {
    id: 'claude', icone: 'claude',
    'pt-BR': ['Claude Code', `
<h2>O que é</h2>
<p>O Claude Code é o assistente da Anthropic que trabalha nos seus arquivos pelo terminal: escreve, revisa, organiza pastas, programa e responde perguntas.</p>
<h2>Como usar</h2>
<p>Clique duas vezes no ícone <b>Claude</b>. Ele abre no Prompt de comando, na pasta Meus documentos. Para outra pasta, use o botão direito nela › <b>Abrir o Claude aqui</b>.</p>
<h2>Instalação e acesso</h2>
<p>Na primeira vez, o Retro Computer oferece instalar o Claude Code com o instalador oficial. Para entrar, use a conta da sua assinatura do Claude (o Claude Code pede) ou guarde uma chave de API em Painel de controle › Claude.</p>
<p>A chave é cifrada pelo cofre de senhas do sistema e só é entregue ao Prompt de comando.</p>`],
    en: ['Claude Code', `
<h2>What it is</h2>
<p>Claude Code is Anthropic's assistant that works on your files from the terminal: it writes, reviews, organizes folders, programs and answers questions.</p>
<h2>How to use it</h2>
<p>Double-click the <b>Claude</b> icon. It opens in the Command Prompt, in the Documents folder. For another folder, right-click it › <b>Open Claude here</b>.</p>
<h2>Installation and access</h2>
<p>The first time, Retro Computer offers to install Claude Code with the official installer. To sign in, use your Claude subscription account (Claude Code asks for it) or store an API key in Control Panel › Claude.</p>
<p>The key is encrypted by the system's password vault and is only handed to the Command Prompt.</p>`],
    es: ['Claude Code', `
<h2>Qué es</h2>
<p>Claude Code es el asistente de Anthropic que trabaja en tus archivos desde la terminal: escribe, revisa, organiza carpetas, programa y responde preguntas.</p>
<h2>Cómo usarlo</h2>
<p>Haz doble clic en el icono <b>Claude</b>. Se abre en la Línea de comandos, en la carpeta Mis documentos. Para otra carpeta, clic derecho en ella › <b>Abrir Claude aquí</b>.</p>
<h2>Instalación y acceso</h2>
<p>La primera vez, Retro Computer ofrece instalar Claude Code con el instalador oficial. Para entrar, usa la cuenta de tu suscripción de Claude (Claude Code la pide) o guarda una clave de API en Panel de control › Claude.</p>
<p>La clave se cifra con el almacén de contraseñas del sistema y solo se entrega a la Línea de comandos.</p>`],
  },
  {
    id: 'foco', icone: 'foco',
    'pt-BR': ['Foco (Pomodoro)', `
<h2>Trabalhar em blocos</h2>
<p>A aba <b>Pomodoro</b> alterna blocos de trabalho (25 minutos) com pausas curtas (5 minutos) e, a cada quatro blocos, uma pausa longa (15 minutos). Os tempos podem ser mudados.</p>
<p>O tempo aparece na bandeja, ao lado do relógio, mesmo com a janela fechada. No fim de cada fase, um som e um aviso.</p>
<h2>Cronômetro e temporizador</h2>
<p>A aba <b>Cronômetro</b> marca as voltas; a aba <b>Temporizador</b> conta de alguns segundos a horas, com atalhos de 1 a 60 minutos, e avisa com som e balão quando acaba. Os dois continuam com a janela fechada.</p>
<p>Dica: marque <b>Minimizar as outras janelas no começo do foco</b> e use a tela cheia (F11).</p>`],
    en: ['Focus (Pomodoro)', `
<h2>Working in blocks</h2>
<p>The <b>Pomodoro</b> tab alternates blocks of work (25 minutes) with short breaks (5 minutes) and, every four blocks, a long break (15 minutes). The times can be changed.</p>
<p>The time shows in the tray, next to the clock, even with the window closed. At the end of each phase, a sound and a notice.</p>
<h2>Stopwatch and timer</h2>
<p>The <b>Stopwatch</b> tab records laps; the <b>Timer</b> tab counts from a few seconds to hours, with shortcuts from 1 to 60 minutes, and tells you with a sound and a balloon when it ends. Both keep going with the window closed.</p>
<p>Tip: check <b>Minimize the other windows when a focus block starts</b> and use full screen (F11).</p>`],
    es: ['Enfoque (Pomodoro)', `
<h2>Trabajar en bloques</h2>
<p>La pestaña <b>Pomodoro</b> alterna bloques de trabajo (25 minutos) con pausas cortas (5 minutos) y, cada cuatro bloques, una pausa larga (15 minutos). Los tiempos se pueden cambiar.</p>
<p>El tiempo aparece en la bandeja, junto al reloj, incluso con la ventana cerrada. Al final de cada fase, un sonido y un aviso.</p>
<h2>Cronómetro y temporizador</h2>
<p>La pestaña <b>Cronómetro</b> marca las vueltas; la pestaña <b>Temporizador</b> cuenta de unos segundos a horas, con atajos de 1 a 60 minutos, y avisa con sonido y globo cuando termina. Los dos siguen con la ventana cerrada.</p>
<p>Consejo: marca <b>Minimizar las otras ventanas al comenzar el enfoque</b> y usa la pantalla completa (F11).</p>`],
  },
  {
    id: 'painel', icone: 'painel',
    'pt-BR': ['Painel de controle', `
<h2>Configurações</h2>
<p><b>Aparência</b>: a cor e o padrão do fundo, a proteção de tela (Voando pelas estrelas, Linhas coloridas ou Relógio), os efeitos (os cantos magnéticos das janelas e a luz noturna, com menos azul à noite), a tela cheia, o tamanho dos pixels (para as letras ficarem nítidas em qualquer monitor), a área da tela (a resolução, no Retro Computer como sistema) e abrir o Retro Computer ao entrar no computador.</p>
<p><b>Disco C:</b>: a pasta do disco no computador principal, o espaço livre e a troca de pasta.</p>
<p><b>Claude</b>: a instalação do Claude Code e a chave de API.</p>
<p><b>Internet</b>: o e-mail, a pesquisa, em qual navegador os links abrem, as permissões dos sites e os programas da internet.</p>
<p><b>Idioma</b>: português, inglês ou espanhol (o Retro Computer reinicia para trocar).</p>
<p><b>Segurança</b>: o estado das proteções (a senha, o firewall, as atualizações, a chave do Claude) e a privacidade (só conexões seguras no Navegador, apagar os dados de navegação ao fechar, o histórico da área de transferência).</p>
<p><b>Senhas</b>: a senha da tela de bloqueio e quando pedi-la.</p>
<p><b>Bluetooth</b>: procurar, parear, conectar e esquecer mouses, teclados e fones sem fio (no Windows e no macOS, abre as configurações do sistema).</p>
<p><b>Firewall</b> e <b>Atualizações do Linux</b> (só no Linux): recusar as conexões que chegam de fora e as atualizações de segurança do Linux e dos programas da Loja.</p>
<p><b>Impressoras</b>: as impressoras, a padrão, a fila de impressão e a página de teste.</p>
<p><b>Teclado</b>: o layout (Português ABNT2, EUA internacional com teclas mortas e outros), um campo para testar os acentos e a aba <b>Atalhos</b>.</p>
<p><b>Mouse</b>: no Retro Computer como sistema, o botão principal (destro ou canhoto, com uma pasta para testar o clique duplo), a velocidade do ponteiro, a aceleração e a rolagem natural; na aba <b>Touchpad</b>, tocar para clicar, rolar e clicar com dois dedos e desligá-lo enquanto se digita ou com um mouse ligado. As escolhas valem também para o mouse sem fio ligado depois. Fora do modo sistema, o mouse segue as configurações do computador principal.</p>
<p><b>Sons</b>, <b>Data e hora</b>, <b>Adicionar ou remover programas</b>, <b>Foco</b> e <b>Sobre o Retro Computer</b>.</p>`],
    en: ['Control Panel', `
<h2>Settings</h2>
<p><b>Appearance</b>: the background color and pattern, the screen saver (Flying through the stars, Colored lines or Clock), the effects (the magnetic corners of the windows and the night light, with less blue at night), full screen, the pixel size (so the letters stay sharp on any monitor), the screen area (the resolution, with Retro Computer as the system) and opening Retro Computer when signing in to the computer.</p>
<p><b>Drive C:</b>: the disk folder on the main computer, the free space and changing the folder.</p>
<p><b>Claude</b>: installing Claude Code and the API key.</p>
<p><b>Internet</b>: e-mail, search, where links open, site permissions and the internet programs.</p>
<p><b>Language</b>: Portuguese, English or Spanish (Retro Computer restarts to switch).</p>
<p><b>Security</b>: the status of the protections (the password, the firewall, the updates, the Claude key) and privacy (secure connections only in the Browser, deleting the browsing data on closing, the clipboard history).</p>
<p><b>Passwords</b>: the lock screen password and when to ask for it.</p>
<p><b>Bluetooth</b>: finding, pairing, connecting and forgetting wireless mice, keyboards and headphones (on Windows and macOS, it opens the system settings).</p>
<p><b>Firewall</b> and <b>Linux Updates</b> (Linux only): refusing the connections that come from outside, and the security updates for Linux and for the programs from the Store.</p>
<p><b>Printers</b>: the printers, the default one, the print queue and the test page.</p>
<p><b>Keyboard</b>: the layout (Brazilian ABNT2, US international with dead keys and others), a field to try the accents and the <b>Shortcuts</b> tab.</p>
<p><b>Mouse</b>: with Retro Computer as the system, the primary button (right- or left-handed, with a folder to try the double-click), the pointer speed, acceleration and natural scrolling; on the <b>Touchpad</b> tab, tap to click, two-finger scrolling and clicking, and turning it off while typing or when a mouse is connected. The choices also apply to a wireless mouse connected later. Outside system mode, the mouse follows the main computer's settings.</p>
<p><b>Sounds</b>, <b>Date and Time</b>, <b>Add or Remove Programs</b>, <b>Focus</b> and <b>About Retro Computer</b>.</p>`],
    es: ['Panel de control', `
<h2>Configuración</h2>
<p><b>Apariencia</b>: el color y el patrón del fondo, el protector de pantalla (Volando entre estrellas, Líneas de colores o Reloj), los efectos (las esquinas magnéticas de las ventanas y la luz nocturna, con menos azul de noche), la pantalla completa, el tamaño de los píxeles (para que las letras queden nítidas en cualquier monitor), el área de la pantalla (la resolución, con Retro Computer como sistema) y abrir Retro Computer al entrar en la computadora.</p>
<p><b>Disco C:</b>: la carpeta del disco en la computadora principal, el espacio libre y el cambio de carpeta.</p>
<p><b>Claude</b>: la instalación de Claude Code y la clave de API.</p>
<p><b>Internet</b>: el correo, la búsqueda, dónde abrir los enlaces, los permisos de los sitios y los programas de internet.</p>
<p><b>Idioma</b>: portugués, inglés o español (Retro Computer se reinicia para cambiarlo).</p>
<p><b>Seguridad</b>: el estado de las protecciones (la contraseña, el firewall, las actualizaciones, la clave de Claude) y la privacidad (solo conexiones seguras en el Navegador, borrar los datos de navegación al cerrar, el historial del portapapeles).</p>
<p><b>Contraseñas</b>: la contraseña de la pantalla de bloqueo y cuándo pedirla.</p>
<p><b>Bluetooth</b>: buscar, emparejar, conectar y olvidar mouses, teclados y auriculares inalámbricos (en Windows y macOS, abre la configuración del sistema).</p>
<p><b>Firewall</b> y <b>Actualizaciones de Linux</b> (solo en Linux): rechazar las conexiones que llegan de fuera y las actualizaciones de seguridad de Linux y de los programas de la Tienda.</p>
<p><b>Impresoras</b>: las impresoras, la predeterminada, la cola de impresión y la página de prueba.</p>
<p><b>Teclado</b>: la distribución (portugués ABNT2, EE. UU. internacional con teclas muertas y otras), un campo para probar los acentos y la pestaña <b>Atajos</b>.</p>
<p><b>Mouse</b>: con Retro Computer como sistema, el botón principal (diestro o zurdo, con una carpeta para probar el doble clic), la velocidad del puntero, la aceleración y el desplazamiento natural; en la pestaña <b>Panel táctil</b>, tocar para hacer clic, desplazar y hacer clic con dos dedos y desactivarlo mientras se escribe o con un mouse conectado. Las opciones valen también para el mouse inalámbrico conectado después. Fuera del modo sistema, el mouse sigue la configuración de la computadora principal.</p>
<p><b>Sonidos</b>, <b>Fecha y hora</b>, <b>Agregar o quitar programas</b>, <b>Enfoque</b> y <b>Acerca de Retro Computer</b>.</p>`],
  },
  {
    id: 'senha', icone: 'cadeado',
    'pt-BR': ['Senha e bloqueio', `
<h2>Bloquear o computador</h2>
<p>Com uma senha (Painel de controle › Senhas), <b>Iniciar › Bloquear o computador</b> cobre a tela até a senha ser digitada. Nenhuma tecla passa para os programas por trás, e as tentativas erradas seguidas demoram cada vez mais.</p>
<h2>Quando pedir a senha</h2>
<p>Além do bloqueio pelo Iniciar, a senha pode ser pedida ao voltar da suspensão (ou ao fechar a tampa), ao sair da proteção de tela e ao abrir o Retro Computer.</p>
<p>No Linux, a senha de entrada do Linux também desbloqueia, para o caso de esquecer a do Retro Computer. No Retro Computer como sistema, a tecla do logotipo + L bloqueia.</p>`],
    en: ['Password and lock', `
<h2>Locking the computer</h2>
<p>With a password (Control Panel › Passwords), <b>Start › Lock the Computer</b> covers the screen until the password is typed. No key reaches the programs behind it, and repeated wrong attempts take longer and longer.</p>
<h2>When to ask for the password</h2>
<p>Besides locking from Start, the password can be asked when waking from sleep (or closing the lid), when leaving the screen saver and when opening Retro Computer.</p>
<p>On Linux, the Linux login password also unlocks, in case you forget the Retro Computer one. With Retro Computer as the system, the logo key + L locks.</p>`],
    es: ['Contraseña y bloqueo', `
<h2>Bloquear la computadora</h2>
<p>Con una contraseña (Panel de control › Contraseñas), <b>Inicio › Bloquear la computadora</b> cubre la pantalla hasta que se escribe la contraseña. Ninguna tecla llega a los programas de detrás, y los intentos fallidos seguidos tardan cada vez más.</p>
<h2>Cuándo pedir la contraseña</h2>
<p>Además del bloqueo desde Inicio, la contraseña se puede pedir al volver de la suspensión (o al cerrar la tapa), al salir del protector de pantalla y al abrir Retro Computer.</p>
<p>En Linux, la contraseña de entrada de Linux también desbloquea, por si olvidas la de Retro Computer. Con Retro Computer como sistema, la tecla del logotipo + L bloquea.</p>`],
  },
  {
    id: 'seguranca', icone: 'seguranca',
    'pt-BR': ['Segurança e privacidade', `
<h2>A Central de segurança</h2>
<p><b>Painel de controle › Segurança</b> mostra, num lugar só, a senha da tela de bloqueio, o firewall e as atualizações de segurança automáticas (no Linux) e como a chave do Claude está guardada. O que estiver em vermelho merece uma olhada; cada linha tem o botão que leva à configuração dela.</p>
<h2>Privacidade</h2>
<p>Na aba <b>Privacidade</b>: só conexões seguras (HTTPS) no Navegador, apagar os dados de navegação (os cookies, os dados dos sites e os arquivos temporários) ao fechar o Retro Computer e guardar ou não o histórico da área de transferência.</p>
<h2>O firewall</h2>
<p>No Linux, <b>Painel de controle › Firewall</b> liga o firewall do sistema (o ufw): ele recusa as conexões que outros computadores tentam abrir neste, e a internet continua como antes. Ligar e desligar pedem a senha de administrador.</p>`],
    en: ['Security and privacy', `
<h2>The Security Center</h2>
<p><b>Control Panel › Security</b> shows, in one place, the lock screen password, the firewall and the automatic security updates (on Linux) and how the Claude key is stored. Whatever is in red deserves a look; each line has the button that leads to its settings.</p>
<h2>Privacy</h2>
<p>On the <b>Privacy</b> tab: secure connections only (HTTPS) in the Browser, deleting the browsing data (cookies, site data and temporary files) when Retro Computer closes, and keeping the clipboard history or not.</p>
<h2>The firewall</h2>
<p>On Linux, <b>Control Panel › Firewall</b> turns on the system firewall (ufw): it refuses the connections that other computers try to open to this one, and the internet keeps working as before. Turning it on and off asks for the administrator password.</p>`],
    es: ['Seguridad y privacidad', `
<h2>El Centro de seguridad</h2>
<p><b>Panel de control › Seguridad</b> muestra, en un solo lugar, la contraseña de la pantalla de bloqueo, el firewall y las actualizaciones de seguridad automáticas (en Linux) y cómo está guardada la clave de Claude. Lo que esté en rojo merece una mirada; cada línea tiene el botón que lleva a su configuración.</p>
<h2>Privacidad</h2>
<p>En la pestaña <b>Privacidad</b>: solo conexiones seguras (HTTPS) en el Navegador, borrar los datos de navegación (las cookies, los datos de los sitios y los archivos temporales) al cerrar Retro Computer y guardar o no el historial del portapapeles.</p>
<h2>El firewall</h2>
<p>En Linux, <b>Panel de control › Firewall</b> activa el firewall del sistema (ufw): rechaza las conexiones que otras computadoras intentan abrir con esta, e internet sigue igual que antes. Activarlo y desactivarlo piden la contraseña de administrador.</p>`],
  },
  {
    id: 'linux', icone: 'computador',
    'pt-BR': ['Linux como sistema', `
<h2>A sessão Retro Computer</h2>
<p>No Linux, o pacote .deb acrescenta a sessão <b>Retro Computer</b> à tela de entrada: escolhida ela, o computador abre direto no Retro Computer, sem a área de trabalho do Linux por baixo. Em Painel de controle › Aparência › Configurações, dá para entrar direto nela ao ligar, sem a tela de entrada.</p>
<h2>O que muda</h2>
<ul>
<li>Desligar oferece desligar, reiniciar e suspender o computador de verdade, e sair da sessão.</li>
<li>Os programas do Linux (os da aba Programas do Linux e os outros) aparecem na barra de tarefas, com os do Retro Computer.</li>
<li>A tecla do logotipo abre o Iniciar; as teclas de volume, de brilho e de calculadora funcionam; Print Screen tira a captura de tela.</li>
<li>Painel de controle › <b>Atualizações do Linux</b> instala as atualizações (com a senha de administrador) e pode instalar sozinho as de segurança, todo dia.</li>
<li>Os pendrives são montados sozinhos, e o teclado segue o layout de Painel de controle › Teclado.</li>
</ul>
<p>Para voltar à área de trabalho do Linux: Desligar › Sair da sessão, e escolha outra sessão na tela de entrada.</p>`],
    en: ['Linux as the system', `
<h2>The Retro Computer session</h2>
<p>On Linux, the .deb package adds the <b>Retro Computer</b> session to the login screen: when you choose it, the computer opens straight into Retro Computer, without the Linux desktop underneath. In Control Panel › Appearance › Settings, you can enter it directly at power-on, without the login screen.</p>
<h2>What changes</h2>
<ul>
<li>Shut Down offers to really turn off, restart and suspend the computer, and to sign out.</li>
<li>Linux programs (those from the Linux programs tab and the others) show up on the taskbar, next to Retro Computer's.</li>
<li>The logo key opens Start; the volume, brightness and calculator keys work; Print Screen takes a screenshot.</li>
<li>Control Panel › <b>Linux Updates</b> installs the updates (with the administrator password) and can install the security ones automatically every day.</li>
<li>USB drives are mounted automatically, and the keyboard follows the layout in Control Panel › Keyboard.</li>
</ul>
<p>To go back to the Linux desktop: Shut Down › Sign out, and choose another session on the login screen.</p>`],
    es: ['Linux como sistema', `
<h2>La sesión Retro Computer</h2>
<p>En Linux, el paquete .deb agrega la sesión <b>Retro Computer</b> a la pantalla de inicio de sesión: al elegirla, la computadora abre directo en Retro Computer, sin el escritorio de Linux debajo. En Panel de control › Apariencia › Configuración, se puede entrar directo en ella al encender, sin la pantalla de inicio de sesión.</p>
<h2>Qué cambia</h2>
<ul>
<li>Apagar ofrece apagar, reiniciar y suspender la computadora de verdad, y cerrar la sesión.</li>
<li>Los programas de Linux (los de la pestaña Programas de Linux y los demás) aparecen en la barra de tareas, junto a los de Retro Computer.</li>
<li>La tecla del logotipo abre Inicio; las teclas de volumen, brillo y calculadora funcionan; Impr Pant toma la captura de pantalla.</li>
<li>Panel de control › <b>Actualizaciones de Linux</b> instala las actualizaciones (con la contraseña de administrador) y puede instalar solas las de seguridad, todos los días.</li>
<li>Las memorias USB se montan solas, y el teclado sigue la distribución de Panel de control › Teclado.</li>
</ul>
<p>Para volver al escritorio de Linux: Apagar › Cerrar la sesión, y elige otra sesión en la pantalla de inicio de sesión.</p>`],
  },
  {
    id: 'atalhos', icone: 'executar',
    'pt-BR': ['Teclas de atalho', `
<h2>Em qualquer lugar</h2>
<p><b>F11</b>: tela cheia ou janela. <b>Ctrl+Esc</b>: menu Iniciar. <b>Alt+letra</b>: abre o menu da janela. <b>F1</b>: esta Ajuda. <b>Ctrl+Shift+Esc</b>: Monitor do sistema.</p>
<h2>As janelas</h2>
<p>Arraste a janela até a borda da esquerda ou da direita (metade da tela), até um canto (um quarto) ou até o alto (a tela toda). <b>Ctrl + a roda do mouse</b> aumenta e diminui o texto no Bloco de notas, no Navegador e no Prompt, e o tamanho dos ícones nas pastas.</p>
<h2>No Retro Computer como sistema</h2>
<p><b>Tecla do logotipo</b>: menu Iniciar. <b>Alt+Tab</b>: trocar de janela (também as do Linux). <b>Alt+F4</b>: fechar a janela. <b>Logotipo + as setas</b>: encaixar a janela. <b>Logotipo + E</b>: Explorador; <b>R</b>: Executar; <b>D</b>: mostrar a área de trabalho; <b>M</b>: minimizar tudo; <b>I</b>: Painel de controle; <b>S</b>: pesquisar; <b>V</b>: área de transferência; <b>L</b>: bloquear; <b>1 a 9</b>: os programas fixados na barra; <b>Shift+S</b>: capturar um pedaço da tela. <b>Print Screen</b>: captura da tela inteira; <b>Alt+Print Screen</b>: da janela; <b>Shift+Print Screen</b>: de um pedaço. As teclas de volume, de brilho e de calculadora também valem.</p>
<p>Com o Retro Computer como aplicativo, o Windows, o macOS e a área de trabalho do Linux ficam com boa parte destas teclas; vale o que eles deixarem passar.</p>
<h2>Nas pastas</h2>
<p><b>Enter</b> abre, <b>F2</b> renomeia, <b>Delete</b> exclui, <b>Backspace</b> sobe, <b>F5</b> atualiza, <b>Ctrl+A</b> seleciona tudo, <b>Alt+D</b> digita um endereço.</p>
<h2>Nas fotos, nos vídeos e nas músicas</h2>
<p>No Visualizador de imagens, as setas passam as fotos e <b>F5</b> começa a apresentação. No Reprodutor de mídia, <b>Espaço</b> toca e pausa, as setas avançam e voltam, e <b>Alt+Enter</b> põe na tela cheia.</p>
<h2>No Prompt de comando</h2>
<p><b>Ctrl+Shift+C</b> copia e <b>Ctrl+Shift+V</b> cola (no Mac, Cmd+C e Cmd+V). O botão direito também tem Copiar e Colar.</p>
<h2>Mouse</h2>
<p>Os botões laterais voltam e avançam no Meu computador e no Navegador.</p>`],
    en: ['Shortcut keys', `
<h2>Anywhere</h2>
<p><b>F11</b>: full screen or window. <b>Ctrl+Esc</b>: Start menu. <b>Alt+letter</b>: opens the window's menu. <b>F1</b>: this Help. <b>Ctrl+Shift+Esc</b>: System Monitor.</p>
<h2>Windows</h2>
<p>Drag a window to the left or right edge (half of the screen), to a corner (a quarter) or to the top (the whole screen). <b>Ctrl + the mouse wheel</b> makes the text bigger and smaller in Notepad, the Browser and the Command Prompt, and the icons in folders.</p>
<h2>With Retro Computer as the system</h2>
<p><b>Logo key</b>: Start menu. <b>Alt+Tab</b>: switch windows (the Linux ones too). <b>Alt+F4</b>: close the window. <b>Logo + the arrow keys</b>: dock the window. <b>Logo + E</b>: Explorer; <b>R</b>: Run; <b>D</b>: show the desktop; <b>M</b>: minimize all; <b>I</b>: Control Panel; <b>S</b>: search; <b>V</b>: clipboard; <b>L</b>: lock; <b>1 to 9</b>: the programs pinned to the taskbar; <b>Shift+S</b>: capture a piece of the screen. <b>Print Screen</b>: screenshot of the whole screen; <b>Alt+Print Screen</b>: of the window; <b>Shift+Print Screen</b>: of a piece. The volume, brightness and calculator keys also work.</p>
<p>With Retro Computer as an application, Windows, macOS and the Linux desktop keep many of these keys; what they let through works.</p>
<h2>In folders</h2>
<p><b>Enter</b> opens, <b>F2</b> renames, <b>Delete</b> deletes, <b>Backspace</b> goes up, <b>F5</b> refreshes, <b>Ctrl+A</b> selects all, <b>Alt+D</b> types an address.</p>
<h2>In pictures, videos and music</h2>
<p>In the Image Viewer, the arrow keys move through the pictures and <b>F5</b> starts the slide show. In the Media Player, <b>Space</b> plays and pauses, the arrow keys skip forward and back, and <b>Alt+Enter</b> goes full screen.</p>
<h2>In the Command Prompt</h2>
<p><b>Ctrl+Shift+C</b> copies and <b>Ctrl+Shift+V</b> pastes (on a Mac, Cmd+C and Cmd+V). The right-click menu also has Copy and Paste.</p>
<h2>Mouse</h2>
<p>The side buttons go back and forward in Computer and in the Browser.</p>`],
    es: ['Teclas de acceso rápido', `
<h2>En cualquier lugar</h2>
<p><b>F11</b>: pantalla completa o ventana. <b>Ctrl+Esc</b>: menú Inicio. <b>Alt+letra</b>: abre el menú de la ventana. <b>F1</b>: esta Ayuda. <b>Ctrl+Shift+Esc</b>: Monitor del sistema.</p>
<h2>Las ventanas</h2>
<p>Arrastra la ventana hasta el borde izquierdo o derecho (la mitad de la pantalla), hasta una esquina (un cuarto) o hasta arriba (la pantalla entera). <b>Ctrl + la rueda del mouse</b> agranda y achica el texto en el Bloc de notas, en el Navegador y en la Línea de comandos, y los íconos en las carpetas.</p>
<h2>Con Retro Computer como sistema</h2>
<p><b>Tecla del logotipo</b>: menú Inicio. <b>Alt+Tab</b>: cambiar de ventana (también las de Linux). <b>Alt+F4</b>: cerrar la ventana. <b>Logotipo + las flechas</b>: acoplar la ventana. <b>Logotipo + E</b>: Explorador; <b>R</b>: Ejecutar; <b>D</b>: mostrar el escritorio; <b>M</b>: minimizar todo; <b>I</b>: Panel de control; <b>S</b>: buscar; <b>V</b>: portapapeles; <b>L</b>: bloquear; <b>1 a 9</b>: los programas anclados en la barra; <b>Shift+S</b>: capturar un trozo de la pantalla. <b>Impr Pant</b>: captura de la pantalla entera; <b>Alt+Impr Pant</b>: de la ventana; <b>Shift+Impr Pant</b>: de un trozo. Las teclas de volumen, brillo y calculadora también funcionan.</p>
<p>Con Retro Computer como aplicación, Windows, macOS y el escritorio de Linux se quedan con buena parte de estas teclas; vale lo que ellos dejen pasar.</p>
<h2>En las carpetas</h2>
<p><b>Enter</b> abre, <b>F2</b> cambia el nombre, <b>Supr</b> elimina, <b>Retroceso</b> sube, <b>F5</b> actualiza, <b>Ctrl+A</b> selecciona todo, <b>Alt+D</b> escribe una dirección.</p>
<h2>En las fotos, los videos y la música</h2>
<p>En el Visor de imágenes, las flechas pasan las fotos y <b>F5</b> inicia la presentación. En el Reproductor multimedia, <b>Espacio</b> reproduce y pausa, las flechas avanzan y retroceden, y <b>Alt+Enter</b> pone la pantalla completa.</p>
<h2>En la Línea de comandos</h2>
<p><b>Ctrl+Shift+C</b> copia y <b>Ctrl+Shift+V</b> pega (en Mac, Cmd+C y Cmd+V). El clic derecho también tiene Copiar y Pegar.</p>
<h2>Mouse</h2>
<p>Los botones laterales retroceden y avanzan en Mi computadora y en el Navegador.</p>`],
  },
  {
    id: 'desligar', icone: 'desligar',
    'pt-BR': ['Desligar', `
<h2>Desligar o computador</h2>
<p><b>Iniciar › Desligar</b> fecha os programas (cada um pergunta se há algo por salvar) e sai do Retro Computer. Os arquivos ficam no disco C:.</p>
<p><b>Reiniciar</b> recarrega a área de trabalho. <b>Sair da tela cheia</b> mostra o Retro Computer numa janela do computador principal.</p>
<p>No Retro Computer como sistema do Linux, as opções são desligar, reiniciar e suspender o computador e sair da sessão.</p>
<p>Para sair de perto sem fechar nada, use <b>Iniciar › Bloquear o computador</b>.</p>`],
    en: ['Shut Down', `
<h2>Shutting down the computer</h2>
<p><b>Start › Shut Down</b> closes the programs (each one asks if there is anything to save) and quits Retro Computer. The files stay on drive C:.</p>
<p><b>Restart</b> reloads the desktop. <b>Leave full screen</b> shows Retro Computer in a window of the main computer.</p>
<p>With Retro Computer as the Linux system, the options are to turn off, restart and suspend the computer, and to sign out.</p>
<p>To step away without closing anything, use <b>Start › Lock the Computer</b>.</p>`],
    es: ['Apagar', `
<h2>Apagar la computadora</h2>
<p><b>Inicio › Apagar</b> cierra los programas (cada uno pregunta si hay algo por guardar) y sale de Retro Computer. Los archivos quedan en el disco C:.</p>
<p><b>Reiniciar</b> recarga el escritorio. <b>Salir de la pantalla completa</b> muestra Retro Computer en una ventana de la computadora principal.</p>
<p>Con Retro Computer como sistema de Linux, las opciones son apagar, reiniciar y suspender la computadora, y cerrar la sesión.</p>
<p>Para alejarte sin cerrar nada, usa <b>Inicio › Bloquear la computadora</b>.</p>`],
  },
];

/** O título e o texto do tópico no idioma de agora. */
const doIdioma = (t) => t[idiomaAtual()] || t['pt-BR'];

function abrirAjuda(args = {}) {
  let j = janelas.find((x) => x.id === 'ajuda');
  if (!j) {
    j = new Janela({ id: 'ajuda', titulo: tr('Ajuda do Retro Computer'), icone: 'ajuda', largura: 640, altura: 440 });
    const indice = h('div.lista-arquivos.vista-lista', { style: { width: '190px', flex: 'none', flexWrap: 'nowrap', height: 'auto' } });
    const texto = h('div.lista-arquivos.texto-ajuda', { style: { flex: '1', padding: '6px 12px' } });
    j.corpo.style.flexDirection = 'row';
    j.corpo.style.gap = '6px';
    j.corpo.style.padding = '6px';
    j.corpo.append(indice, texto);
    j.mostrar = (id) => {
      const t = TOPICOS.find((x) => x.id === id) || TOPICOS[0];
      indice.replaceChildren(...TOPICOS.map((x) => {
        const el = h('div.item' + (x.id === t.id ? '.sel' : ''), h('div.icone', img(x.icone, 16)), h('div.rotulo', doIdioma(x)[0]));
        el.addEventListener('mousedown', () => j.mostrar(x.id));
        return el;
      }));
      texto.innerHTML = doIdioma(t)[1];
      texto.scrollTop = 0;
    };
  }
  j.focar();
  j.mostrar(args.topico || 'inicio');
  return j;
}

registrarApp('ajuda', { nome: 'Ajuda', icone: 'ajuda', abrir: abrirAjuda });
export { abrir };
