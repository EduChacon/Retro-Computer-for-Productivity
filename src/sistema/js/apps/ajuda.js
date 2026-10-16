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
<p>2. Instale os programas pela <b>Loja de programas</b>, no alto do menu Iniciar.</p>
<p>3. Para a internet, use o <b>Navegador</b> e o <b>E-mail</b>, na barra de tarefas.</p>
<p>4. Para o Claude, use o ícone <b>Claude</b> na área de trabalho.</p>
<p>Os ícones da área de trabalho se escolhem em <b>Painel de controle › Aparência › Ícones</b>; para pôr outro programa nela, use o botão direito nele, no menu Iniciar › <b>Adicionar à área de trabalho</b>.</p>
<p>5. Para trabalhar sem interrupções, use o <b>Foco</b> (Iniciar › Programas › Acessórios).</p>
<p>O idioma (português, inglês ou espanhol) fica em <b>Painel de controle › Idioma</b>. Os tópicos ao lado explicam cada parte; <b>F1</b> abre esta Ajuda de qualquer lugar.</p>`],
    en: ['Welcome', `
<h2>What Retro Computer is</h2>
<p>A productivity computer with the look of the 1990s: few distractions, your work programs and your files at hand.</p>
<p>It is not a virtual machine: the programs run on your real computer, and drive C: is an ordinary folder on it. That is why it is light, starts quickly and nothing gets locked inside.</p>
<h2>First steps</h2>
<p>1. Open <b>Documents</b> and read <b>Read me.txt</b>.</p>
<p>2. Install programs from the <b>Program Store</b>, at the top of the Start menu.</p>
<p>3. For the internet, use the <b>Browser</b> and <b>E-mail</b>, on the taskbar.</p>
<p>4. For Claude, use the <b>Claude</b> icon on the desktop.</p>
<p>The desktop icons are chosen in <b>Control Panel › Appearance › Icons</b>; to put another program on it, right-click the program in the Start menu › <b>Add to the desktop</b>.</p>
<p>5. To work without interruptions, use <b>Focus</b> (Start › Programs › Accessories).</p>
<p>The language (Portuguese, English or Spanish) is in <b>Control Panel › Language</b>. The topics on the left explain each part; <b>F1</b> opens this Help from anywhere.</p>`],
    es: ['Bienvenido', `
<h2>Qué es Retro Computer</h2>
<p>Una computadora de productividad con el aspecto de los años 90: pocas distracciones, los programas de trabajo y tus archivos a mano.</p>
<p>No es una máquina virtual: los programas se ejecutan en tu computadora real, y el disco C: es una carpeta común de ella. Por eso es liviano, abre rápido y nada queda atrapado adentro.</p>
<h2>Primeros pasos</h2>
<p>1. Abre <b>Mis documentos</b> y lee <b>Léame.txt</b>.</p>
<p>2. Instala los programas desde la <b>Tienda de programas</b>, arriba en el menú Inicio.</p>
<p>3. Para internet, usa el <b>Navegador</b> y el <b>Correo</b>, en la barra de tareas.</p>
<p>4. Para Claude, usa el icono <b>Claude</b> del escritorio.</p>
<p>Los iconos del escritorio se eligen en <b>Panel de control › Apariencia › Iconos</b>; para poner otro programa en él, haz clic derecho en el programa, en el menú Inicio › <b>Agregar al escritorio</b>.</p>
<p>5. Para trabajar sin interrupciones, usa <b>Enfoque</b> (Inicio › Programas › Accesorios).</p>
<p>El idioma (portugués, inglés o español) está en <b>Panel de control › Idioma</b>. Los temas de la izquierda explican cada parte; <b>F1</b> abre esta Ayuda desde cualquier lugar.</p>`],
  },
  {
    id: 'arquivos', icone: 'disco',
    'pt-BR': ['O disco C: e os arquivos', `
<h2>Onde ficam os arquivos</h2>
<p>O disco C: é uma pasta do computador principal (veja qual em Painel de controle › Disco C:). Tudo o que você salva fica nela e pode ser aberto também fora do Retro Computer.</p>
<p><b>No pendrive</b>: com uma pasta chamada <b>Retro Computer (dados)</b> ao lado do programa (o do .zip do Windows, o AppImage do Linux ou o aplicativo do Mac), as configurações, os programas e o disco C: ficam nela, e o pendrive leva tudo de um computador para outro.</p>
<h2>O Explorador</h2>
<p><b>Meu computador</b> mostra o disco C:, os pendrives e a Lixeira. <b>Exibir › Barra de pastas</b> (ou o botão <b>Pastas</b>) mostra as pastas à esquerda. Cada nome do endereço, no alto, leva àquela pasta; para digitar um endereço, clique no espaço vazio ao lado (ou Alt+D). <b>Exibir › Miniaturas</b> mostra as fotos encolhidas.</p>
<h2>Painel de visualização</h2>
<p><b>Exibir › Painel de visualização</b> (ou Alt+P, ou o botão <b>Visualizar</b>) mostra à direita o arquivo escolhido, sem abri-lo: documentos do Word (.docx) e do OpenDocument (.odt), PDF (as páginas), planilhas (.xlsx, .ods e .csv: a primeira folha), textos, fotos, vídeos e músicas. A divisória entre os dois lados se arrasta.</p>
<h2>Acesso rápido</h2>
<p>No alto da barra de pastas, o <b>Acesso rápido</b> reúne as pastas fixadas e os arquivos usados por último. Para fixar uma pasta: botão direito nela › <b>Fixar no Acesso rápido</b> (e, para tirar, <b>Desafixar</b>).</p>
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
<p><b>On a USB drive</b>: with a folder named <b>Retro Computer (dados)</b> next to the program (the one from the Windows .zip, the Linux AppImage or the Mac app), the settings, the programs and drive C: stay in it, and the USB drive takes everything from one computer to another.</p>
<h2>The Explorer</h2>
<p><b>Computer</b> shows drive C:, the USB drives and the Trash. <b>View › Folders Bar</b> (or the <b>Folders</b> button) shows the folders on the left. Each name in the address at the top leads to that folder; to type an address, click the empty space next to it (or Alt+D). <b>View › Thumbnails</b> shows the pictures in small size.</p>
<h2>Preview pane</h2>
<p><b>View › Preview Pane</b> (or Alt+P, or the <b>Preview</b> button) shows the chosen file on the right without opening it: Word (.docx) and OpenDocument (.odt) documents, PDF (the pages), spreadsheets (.xlsx, .ods and .csv: the first sheet), texts, pictures, videos and music. The divider between the two sides can be dragged.</p>
<h2>Quick access</h2>
<p>At the top of the folders bar, <b>Quick access</b> gathers the pinned folders and the files used last. To pin a folder: right-click it › <b>Pin to Quick access</b> (and, to remove it, <b>Unpin</b>).</p>
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
<p><b>En una memoria USB</b>: con una carpeta llamada <b>Retro Computer (dados)</b> junto al programa (el del .zip de Windows, el AppImage de Linux o la aplicación de Mac), la configuración, los programas y el disco C: quedan en ella, y la memoria lleva todo de una computadora a otra.</p>
<h2>El Explorador</h2>
<p><b>Mi computadora</b> muestra el disco C:, las memorias USB y la Papelera. <b>Ver › Panel de carpetas</b> (o el botón <b>Carpetas</b>) muestra las carpetas a la izquierda. Cada nombre de la dirección, arriba, lleva a esa carpeta; para escribir una dirección, haz clic en el espacio vacío de al lado (o Alt+D). <b>Ver › Miniaturas</b> muestra las fotos en pequeño.</p>
<h2>Panel de vista previa</h2>
<p><b>Ver › Panel de vista previa</b> (o Alt+P, o el botón <b>Vista previa</b>) muestra a la derecha el archivo elegido, sin abrirlo: documentos de Word (.docx) y de OpenDocument (.odt), PDF (las páginas), hojas de cálculo (.xlsx, .ods y .csv: la primera hoja), textos, fotos, videos y música. El separador entre los dos lados se puede arrastrar.</p>
<h2>Acceso rápido</h2>
<p>Arriba del panel de carpetas, el <b>Acceso rápido</b> reúne las carpetas fijadas y los archivos usados por último. Para fijar una carpeta: clic derecho en ella › <b>Fijar en Acceso rápido</b> (y, para quitarla, <b>Dejar de fijar</b>).</p>
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
<p>Antes de tirar o pendrive, use o botão direito nele › <b>Remover com segurança</b> e espere o aviso.</p>
<p><b>Formatar</b> (botão direito no pendrive, no Linux): apaga tudo o que há nele e o prepara em exFAT (o Windows, o Mac e o Linux leem) ou FAT32 (os aparelhos antigos). Pede a confirmação e a senha de administrador; no Windows e no Mac, a caixa mostra o caminho do próprio sistema.</p>`],
    en: ['USB drives and cards', `
<h2>Where they show up</h2>
<p>USB drives, memory cards and external disks show up in <b>Computer</b>, with their free space. With Retro Computer as the Linux system, they are mounted automatically when plugged in, with a notice.</p>
<h2>Opening and bringing in</h2>
<p>Double-clicking a file on the USB drive copies it to <b>Documents › Received</b> and opens it from there; the original stays as it was. To bring in several files, select them and right-click › <b>Copy to Documents</b> or <b>Copy to the Desktop</b>.</p>
<h2>Taking out</h2>
<p>Right-click a file on drive C: › <b>Send to</b> › the USB drive. Copy and Paste also work. Nothing on the USB drive is deleted or overwritten.</p>
<h2>Removing</h2>
<p>Before unplugging the USB drive, right-click it › <b>Safely remove</b> and wait for the notice.</p>
<p><b>Format</b> (right-click the USB drive, on Linux): deletes everything on it and prepares it as exFAT (Windows, Mac and Linux read it) or FAT32 (old devices). It asks for confirmation and the administrator password; on Windows and Mac, the box shows the system's own way.</p>`],
    es: ['Memorias USB y tarjetas', `
<h2>Dónde aparecen</h2>
<p>Las memorias USB, las tarjetas de memoria y los discos externos aparecen en <b>Mi computadora</b>, con el espacio libre. Con Retro Computer como sistema de Linux, se montan solos al conectarlos, con un aviso.</p>
<h2>Abrir y traer</h2>
<p>Un doble clic en un archivo de la memoria lo copia a <b>Mis documentos › Recibidos</b> y lo abre desde allí; el original queda como estaba. Para traer varios, selecciónalos y usa el clic derecho › <b>Copiar a Mis documentos</b> o <b>Copiar al Escritorio</b>.</p>
<h2>Llevar</h2>
<p>Clic derecho en un archivo del disco C: › <b>Enviar a</b> › la memoria. Copiar y Pegar también funcionan. Nada de la memoria se borra ni se sobrescribe.</p>
<h2>Retirar</h2>
<p>Antes de sacar la memoria, usa el clic derecho en ella › <b>Quitar de forma segura</b> y espera el aviso.</p>
<p><b>Formatear</b> (clic derecho en la memoria, en Linux): borra todo lo que hay en ella y la prepara en exFAT (la leen Windows, Mac y Linux) o FAT32 (los aparatos antiguos). Pide la confirmación y la contraseña de administrador; en Windows y en Mac, la ventana muestra el camino del propio sistema.</p>`],
  },
  {
    id: 'barra', icone: 'relogio',
    'pt-BR': ['A barra de tarefas', `
<h2>À esquerda</h2>
<p>O botão <b>Iniciar</b>, a caixa de busca (que acha programas, opções do Painel de controle e arquivos do disco C:; com Enter, pesquisa na internet) e os programas fixados. Para fixar um programa, use o botão direito no botão da janela dele ou num ícone › <b>Fixar na barra de tarefas</b>.</p>
<p>Uma conta na caixa de busca (<b>12*3,5</b>, <b>200 × 15%</b>, <b>√2</b>) mostra o resultado primeiro; Enter o copia.</p>
<p>Os botões das janelas mostram o nome. Para ver só os ícones, agrupados por programa, use o botão direito na barra › <b>Botões das janelas</b>. A roda do mouse num botão abre outra janela do programa.</p>
<h2>O menu Iniciar do seu jeito</h2>
<p>O botão direito em qualquer programa do Iniciar › <b>Fixar no menu Iniciar</b> põe o programa no alto do menu. Em <b>Configurações › Barra de tarefas e menu Iniciar</b> (ou no botão direito no Iniciar › <b>Propriedades</b>), você muda a ordem dos fixados, escolhe os itens à vista (a Loja, os Documentos, o Localizar…), liga os <b>ícones pequenos</b> e limpa ou desliga a lista dos documentos recentes. O botão direito num item do menu › <b>Não mostrar no menu Iniciar</b> também o esconde.</p>
<h2>A bandeja, à direita</h2>
<p><b>Rede</b>: as redes Wi-Fi, conectar e desconectar (no Linux). <b>Volume</b>: o som do computador e, com mais de uma saída (os alto-falantes, um fone, a tela pela HDMI), a escolha dela; o microfone fica em Painel de controle › Sons › Áudio. <b>Bateria</b>: a carga, o brilho da tela, o modo de energia (economia, equilibrado ou desempenho, no Linux) e a bateria do mouse e do teclado sem fio, com o aviso de bateria fraca. <b>Bluetooth</b>: os aparelhos sem fio (no Linux). <b>Sino</b>: as notificações e o <b>Não perturbe</b>.</p>
<p>Um clique no <b>relógio</b> abre o calendário; o botão direito nele › <b>Mostrar a data</b> põe a data embaixo da hora.</p>`],
    en: ['The taskbar', `
<h2>On the left</h2>
<p>The <b>Start</b> button, the search box (it finds programs, Control Panel options and files on drive C:; with Enter, it searches the internet) and the pinned programs. To pin a program, right-click its window button or an icon › <b>Pin to the taskbar</b>.</p>
<p>A calculation in the search box (<b>12*3.5</b>, <b>200 × 15%</b>, <b>√2</b>) shows the result first; Enter copies it.</p>
<p>The window buttons show the name. To see only the icons, grouped by program, right-click the taskbar › <b>Taskbar buttons</b>. The mouse wheel on a button opens another window of the program.</p>
<h2>The Start menu your way</h2>
<p>Right-click any program in Start › <b>Pin to Start</b> to put it at the top of the menu. In <b>Settings › Taskbar and Start Menu</b> (or right-click Start › <b>Properties</b>), you change the order of the pinned programs, choose the items you see (the Store, Documents, Find…), turn on <b>small icons</b> and clear or turn off the list of recent documents. Right-clicking an item of the menu › <b>Don't Show in the Start Menu</b> also hides it.</p>
<h2>The tray, on the right</h2>
<p><b>Network</b>: the Wi-Fi networks, connecting and disconnecting (on Linux). <b>Volume</b>: the computer's sound and, with more than one output (the speakers, headphones, the screen through HDMI), the choice of it; the microphone is in Control Panel › Sounds › Audio. <b>Battery</b>: the charge, the screen brightness, the power mode (power saver, balanced or performance, on Linux) and the battery of a wireless mouse or keyboard, with the low battery notice. <b>Bluetooth</b>: the wireless devices (on Linux). <b>Bell</b>: the notifications and <b>Do not disturb</b>.</p>
<p>A click on the <b>clock</b> opens the calendar; right-click it › <b>Show the date</b> to put the date under the time.</p>`],
    es: ['La barra de tareas', `
<h2>A la izquierda</h2>
<p>El botón <b>Inicio</b>, el cuadro de búsqueda (encuentra programas, opciones del Panel de control y archivos del disco C:; con Enter, busca en internet) y los programas anclados. Para anclar un programa, usa el clic derecho en el botón de su ventana o en un icono › <b>Anclar a la barra de tareas</b>.</p>
<p>Una cuenta en el cuadro de búsqueda (<b>12*3,5</b>, <b>200 × 15%</b>, <b>√2</b>) muestra el resultado primero; Enter lo copia.</p>
<p>Los botones de las ventanas muestran el nombre. Para ver solo los íconos, agrupados por programa, usa el clic derecho en la barra › <b>Botones de las ventanas</b>. La rueda del mouse en un botón abre otra ventana del programa.</p>
<h2>El menú Inicio a tu manera</h2>
<p>El clic derecho en cualquier programa de Inicio › <b>Anclar a Inicio</b> pone el programa arriba del menú. En <b>Configuración › Barra de tareas y menú Inicio</b> (o con el clic derecho en Inicio › <b>Propiedades</b>), cambias el orden de los anclados, eliges los elementos a la vista (la Tienda, los Documentos, Buscar…), activas los <b>íconos pequeños</b> y vacías o desactivas la lista de los documentos recientes. El clic derecho en un elemento del menú › <b>No mostrar en el menú Inicio</b> también lo oculta.</p>
<h2>La bandeja, a la derecha</h2>
<p><b>Red</b>: las redes Wi-Fi, conectar y desconectar (en Linux). <b>Volumen</b>: el sonido de la computadora y, con más de una salida (los altavoces, unos auriculares, la pantalla por HDMI), la elección de ella; el micrófono está en Panel de control › Sonidos › Audio. <b>Batería</b>: la carga, el brillo de la pantalla, el modo de energía (ahorro, equilibrado o rendimiento, en Linux) y la batería del mouse y del teclado inalámbricos, con el aviso de batería baja. <b>Bluetooth</b>: los dispositivos inalámbricos (en Linux). <b>Campana</b>: las notificaciones y el <b>No molestar</b>.</p>
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
<p>Baixe o pacote "nome-web-versão.zip" em outro lugar e use <b>Instalar de um arquivo .zip</b>.</p>
<h2>Programas do Windows (no Linux)</h2>
<p>Dois cliques num <b>.exe</b> ou num <b>.msi</b> do disco C: o abrem pelo WINE. Sem o WINE, o Retro Computer oferece instalá-lo pela Loja (o Flathub, sem a senha). Os programas instalados aparecem em <b>Iniciar › Programas › Programas do Windows</b>. Nem todo programa do Windows funciona no WINE.</p>`],
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
<p>Download the "name-web-version.zip" package somewhere else and use <b>Install from a .zip file</b>.</p>
<h2>Windows programs (on Linux)</h2>
<p>Double-clicking an <b>.exe</b> or an <b>.msi</b> on drive C: opens it through WINE. Without WINE, Retro Computer offers to install it from the Store (Flathub, no password). The installed programs appear in <b>Start › Programs › Windows Programs</b>. Not every Windows program works in WINE.</p>`],
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
<p>Descarga el paquete "nombre-web-versión.zip" en otro lugar y usa <b>Instalar desde un archivo .zip</b>.</p>
<h2>Programas de Windows (en Linux)</h2>
<p>Doble clic en un <b>.exe</b> o un <b>.msi</b> del disco C: lo abre con WINE. Sin WINE, Retro Computer ofrece instalarlo desde la Tienda (Flathub, sin contraseña). Los programas instalados aparecen en <b>Inicio › Programas › Programas de Windows</b>. No todos los programas de Windows funcionan en WINE.</p>`],
  },
  {
    id: 'internet', icone: 'navegador',
    'pt-BR': ['Navegador e e-mail', `
<h2>O Firefox, o navegador padrão</h2>
<p>Com o Firefox instalado no computador, o ícone <b>Navegador</b> e os links dos programas abrem nele, com o visual do Retro Computer (o cinza, as abas retas, a fonte da época) e um perfil próprio: os downloads vão para <b>Meus documentos › Recebidos</b>, e as escolhas de Painel de controle › Segurança valem também para ele. Ele toca os vídeos com proteção (Netflix, Prime Video, Disney+, o Spotify na web). Para escolher outro, use Painel de controle › Internet; no Linux sem o Firefox, o mesmo lugar o instala.</p>
<h2>O Navegador do Retro Computer</h2>
<p>Abre os sites em janelas do Retro Computer, com favoritos, pesquisa, zoom, Localizar e Imprimir. Os downloads vão para <b>Meus documentos › Recebidos</b>. A câmera, o microfone, a localização e as notificações de cada site pedem a sua permissão; para esquecer as respostas, use Painel de controle › Internet.</p>
<p>Os endereços <b>http://</b> abrem na versão segura (https://). O site que não a tiver mostra um aviso, com a escolha de abri-lo assim mesmo; os aparelhos da rede de casa (o roteador, a impressora) ficam de fora. Para desligar: Painel de controle › Segurança › Privacidade.</p>
<h2>Vídeos e músicas</h2>
<p>Os sites de vídeo e de música comuns, como o YouTube, funcionam nos dois. Os serviços com proteção contra cópia (Netflix, Prime Video, Disney+ e o Spotify na web) tocam só no Firefox.</p>
<h2>O e-mail</h2>
<p>O <b>E-mail</b> abre o seu e-mail da web (escolhido na primeira vez) numa janela própria. Para trocar, use Painel de controle › Internet.</p>
<h2>Sites como programas</h2>
<p>No Navegador do Retro Computer (Iniciar › Programas, quando o Firefox é o padrão), <b>Arquivo › Instalar como programa</b> transforma o site aberto num programa: ele ganha ícone, janela própria (sem a barra de endereço) e lugar no menu Iniciar, na área de trabalho e, se você quiser, na barra de tarefas. Para desinstalar, use o menu <b>Página</b> da janela dele ou Painel de controle › Internet › <b>Programas da internet</b>.</p>`],
    en: ['Browser and e-mail', `
<h2>Firefox, the default browser</h2>
<p>With Firefox installed on the computer, the <b>Browser</b> icon and the programs' links open in it, with Retro Computer's look (the gray, the straight tabs, the period font) and a profile of its own: downloads go to <b>Documents › Received</b>, and the choices in Control Panel › Security also apply to it. It plays protected videos (Netflix, Prime Video, Disney+, Spotify on the web). To choose another one, use Control Panel › Internet; on Linux without Firefox, the same place installs it.</p>
<h2>Retro Computer's Browser</h2>
<p>It opens websites in Retro Computer windows, with favorites, search, zoom, Find and Print. Downloads go to <b>Documents › Received</b>. Each site's access to the camera, the microphone, the location and notifications asks for your permission; to forget the answers, use Control Panel › Internet.</p>
<p><b>http://</b> addresses open in the secure version (https://). A site without one shows a warning, with the choice to open it anyway; the devices on the home network (the router, the printer) are left out. To turn this off: Control Panel › Security › Privacy.</p>
<h2>Videos and music</h2>
<p>The usual video and music sites, such as YouTube, work in both. Services with copy protection (Netflix, Prime Video, Disney+ and Spotify on the web) play only in Firefox.</p>
<h2>E-mail</h2>
<p><b>E-mail</b> opens your web e-mail (chosen the first time) in a window of its own. To change it, use Control Panel › Internet.</p>
<h2>Sites as programs</h2>
<p>In Retro Computer's Browser (Start › Programs, when Firefox is the default), <b>File › Install as Program</b> turns the open site into a program: it gets an icon, its own window (without the address bar) and a place in the Start menu, on the desktop and, if you want, on the taskbar. To uninstall it, use the <b>Page</b> menu of its window or Control Panel › Internet › <b>Internet programs</b>.</p>`],
    es: ['Navegador y correo', `
<h2>Firefox, el navegador predeterminado</h2>
<p>Con Firefox instalado en la computadora, el icono <b>Navegador</b> y los enlaces de los programas se abren en él, con el aspecto de Retro Computer (el gris, las pestañas rectas, la fuente de la época) y un perfil propio: las descargas van a <b>Mis documentos › Recibidos</b>, y las opciones de Panel de control › Seguridad también valen para él. Reproduce los videos protegidos (Netflix, Prime Video, Disney+, Spotify en la web). Para elegir otro, usa Panel de control › Internet; en Linux sin Firefox, el mismo lugar lo instala.</p>
<h2>El Navegador de Retro Computer</h2>
<p>Abre los sitios en ventanas de Retro Computer, con favoritos, búsqueda, zoom, Buscar e Imprimir. Las descargas van a <b>Mis documentos › Recibidos</b>. La cámara, el micrófono, la ubicación y las notificaciones de cada sitio piden tu permiso; para olvidar las respuestas, usa Panel de control › Internet.</p>
<p>Las direcciones <b>http://</b> se abren en la versión segura (https://). El sitio que no la tenga muestra un aviso, con la opción de abrirlo de todos modos; los aparatos de la red de casa (el router, la impresora) quedan fuera. Para desactivarlo: Panel de control › Seguridad › Privacidad.</p>
<h2>Videos y música</h2>
<p>Los sitios de video y de música comunes, como YouTube, funcionan en los dos. Los servicios con protección contra copia (Netflix, Prime Video, Disney+ y Spotify en la web) se reproducen solo en Firefox.</p>
<h2>El correo</h2>
<p>El <b>Correo</b> abre tu correo de la web (elegido la primera vez) en una ventana propia. Para cambiarlo, usa Panel de control › Internet.</p>
<h2>Sitios como programas</h2>
<p>En el Navegador de Retro Computer (Inicio › Programas, cuando Firefox es el predeterminado), <b>Archivo › Instalar como programa</b> convierte el sitio abierto en un programa: recibe un icono, ventana propia (sin la barra de dirección) y lugar en el menú Inicio, en el escritorio y, si quieres, en la barra de tareas. Para desinstalarlo, usa el menú <b>Página</b> de su ventana o Panel de control › Internet › <b>Programas de internet</b>.</p>`],
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
<p><b>Diário de trabalho</b>: um arquivo de texto por dia, em Meus documentos › Diário de trabalho. Com <b>Anotar sozinho</b>, ele registra a hora de cada foco concluído e de cada arquivo alterado (a primeira vez no dia); <b>Escrever uma nota…</b> acrescenta uma linha sua. O diário só acrescenta linhas: o que você escrever nele fica.</p>
<p><b>Mapa de caracteres</b>: os acentos, os símbolos (§, º, “ ”, –, €…) e as letras de outros alfabetos, em grupos. Segurar o botão sobre um caractere o amplia; dois cliques o juntam à caixa de baixo, e Copiar o leva à área de transferência.</p>
<p><b>Calculadora</b>, <b>Bloco de notas</b> (com Imprimir, Ctrl+P) e <b>Prompt de comando</b>.</p>
<h2>DOS</h2>
<p>O <b>DOS</b> (em Acessórios) é o DOSBox, um emulador do computador da época, sem internet. A unidade C: dele é a pasta <b>C:\DOS</b> do disco: ponha lá os seus programas e jogos do DOS e digite o nome para abri-los. Dois cliques num programa do DOS (.com, .bat ou um .exe do DOS) também o abrem. O que mudar volta para o disco ao fechar a janela, com a versão anterior guardada e os apagados na Lixeira.</p>
<h2>Jogos</h2>
<p>Paciência, Campo Minado e Breakout, para as pausas.</p>
<p><b>Damas</b> (as regras brasileiras ou as inglesas, em Jogo › Regras) e <b>Xadrez</b>: contra o computador, em três níveis, ou entre duas pessoas no mesmo computador. Clique na peça e depois na casa (ou arraste); Jogo › Desfazer (Ctrl+Z) volta o último lance. A partida fica guardada: fechar a janela não a perde.</p>`],
    en: ['Accessories and games', `
<h2>In Start › Programs › Accessories</h2>
<p><b>Image Viewer</b>: the pictures in the folder, one by one (with the arrow keys), zoom, rotate, print and the slide show (F5).</p>
<p><b>Media Player</b>: the videos and music on the disk, with the .srt or .vtt subtitles of the same name and full screen (Alt+Enter).</p>
<p><b>Screenshot</b>: the whole screen, the front window or a piece chosen with the mouse. Screenshots are kept in <b>Documents › Screenshots</b> and also go to the clipboard.</p>
<p><b>System Monitor</b> (Ctrl+Shift+Esc): the open programs, the processes and the processor and memory use; it ends a program that froze.</p>
<p><b>Clipboard</b> (logo + V): the last 25 texts copied in any program; Enter pastes the chosen one where the cursor was, and the "…" of each one pins or deletes it. The list stays in memory only and is gone when Retro Computer closes.</p>
<p><b>Work journal</b>: one text file per day, in Documents › Work journal. With <b>Record automatically</b>, it notes the time of each focus block completed and of each file changed (the first time in the day); <b>Write a note…</b> adds a line of your own. The journal only adds lines: whatever you write in it stays.</p>
<p><b>Character Map</b>: accents, symbols (§, º, “ ”, –, €…) and the letters of other alphabets, in groups. Holding the button on a character enlarges it; a double-click adds it to the box below, and Copy sends it to the clipboard.</p>
<p><b>Calculator</b>, <b>Notepad</b> (with Print, Ctrl+P) and <b>Command Prompt</b>.</p>
<h2>DOS</h2>
<p><b>DOS</b> (in Accessories) is DOSBox, an emulator of the computers of the time, without the internet. Its drive C: is the <b>C:\DOS</b> folder on the disk: put your DOS programs and games there and type the name to open them. Double-clicking a DOS program (.com, .bat or a DOS .exe) also opens it. Whatever changes goes back to the disk when you close the window, with the previous version kept and deleted files in the Trash.</p>
<h2>Games</h2>
<p>Solitaire, Minesweeper and Breakout, for the breaks.</p>
<p><b>Checkers</b> (Brazilian draughts or American checkers, in Game › Rules) and <b>Chess</b>: against the computer, at three levels, or between two people on the same computer. Click a piece and then the square (or drag it); Game › Undo (Ctrl+Z) takes back the last move. The game is saved: closing the window does not lose it.</p>`],
    es: ['Accesorios y juegos', `
<h2>En Inicio › Programas › Accesorios</h2>
<p><b>Visor de imágenes</b>: las fotos de la carpeta, una a una (con las flechas), ampliar, girar, imprimir y la presentación de diapositivas (F5).</p>
<p><b>Reproductor multimedia</b>: los videos y la música del disco, con los subtítulos .srt o .vtt del mismo nombre y la pantalla completa (Alt+Enter).</p>
<p><b>Captura de pantalla</b>: la pantalla entera, la ventana del frente o un trozo elegido con el mouse. Las capturas quedan en <b>Mis documentos › Capturas de pantalla</b> y también van al portapapeles.</p>
<p><b>Monitor del sistema</b> (Ctrl+Shift+Esc): los programas abiertos, los procesos y el uso del procesador y de la memoria; finaliza un programa que se colgó.</p>
<p><b>Portapapeles</b> (logotipo + V): los últimos 25 textos copiados en cualquier programa; Enter pega el elegido donde estaba el cursor, y el "…" de cada uno lo ancla o lo elimina. La lista queda solo en la memoria y desaparece al cerrar Retro Computer.</p>
<p><b>Diario de trabajo</b>: un archivo de texto por día, en Mis documentos › Diario de trabajo. Con <b>Anotar solo</b>, registra la hora de cada enfoque completado y de cada archivo modificado (la primera vez en el día); <b>Escribir una nota…</b> agrega una línea tuya. El diario solo agrega líneas: lo que escribas en él se queda.</p>
<p><b>Mapa de caracteres</b>: los acentos, los símbolos (§, º, “ ”, –, €…) y las letras de otros alfabetos, en grupos. Mantener el botón sobre un carácter lo amplía; el doble clic lo agrega al cuadro de abajo, y Copiar lo lleva al portapapeles.</p>
<p><b>Calculadora</b>, <b>Bloc de notas</b> (con Imprimir, Ctrl+P) y <b>Línea de comandos</b>.</p>
<h2>DOS</h2>
<p>El <b>DOS</b> (en Accesorios) es el DOSBox, un emulador de la computadora de la época, sin internet. Su unidad C: es la carpeta <b>C:\DOS</b> del disco: pon allí tus programas y juegos del DOS y escribe el nombre para abrirlos. Un doble clic en un programa del DOS (.com, .bat o un .exe del DOS) también lo abre. Lo que cambie vuelve al disco al cerrar la ventana, con la versión anterior guardada y los borrados en la Papelera.</p>
<h2>Juegos</h2>
<p>Solitario, Buscaminas y Breakout, para las pausas.</p>
<p><b>Damas</b> (las reglas brasileñas o las inglesas, en Juego › Reglas) y <b>Ajedrez</b>: contra la computadora, en tres niveles, o entre dos personas en la misma computadora. Haz clic en la pieza y luego en la casilla (o arrástrala); Juego › Deshacer (Ctrl+Z) vuelve la última jugada. La partida queda guardada: cerrar la ventana no la pierde.</p>`],
  },
  {
    id: 'claude', icone: 'claude',
    'pt-BR': ['Claude Code', `
<h2>O que é</h2>
<p>O Claude Code é o assistente da Anthropic que trabalha nos seus arquivos pelo terminal: escreve, revisa, organiza pastas, programa e responde perguntas.</p>
<h2>Como usar</h2>
<p>Clique duas vezes no ícone <b>Claude</b>. Ele abre no Prompt de comando, na pasta Meus documentos. Para outra pasta, use o botão direito nela › <b>Abrir o Claude aqui</b>.</p>
<p>O botão direito num arquivo › <b>Pedir ao Claude</b> abre o Claude já com o pedido: revisar o texto, resumir, traduzir ou outro pedido escrito na hora (numa pasta: organizá-la). Antes, o Retro Computer guarda a versão de agora do arquivo, em <b>Versões anteriores…</b>.</p>
<h2>O Claude ajusta o Retro Computer</h2>
<p>Peça em palavras: "deixe o fundo azul-marinho", "ponha a Calculadora no menu Iniciar", "instale o WordCraft", "desligue os sons". O Claude muda a aparência, a barra de tarefas, o menu Iniciar, os sons, os atalhos e os programas, e o que ele apagar do disco vai para a Lixeira. O Claude Code pergunta antes de cada ajuste. A senha, a chave de API, a pasta do disco e as atualizações ficam só com você. Para desligar: Painel de controle › Claude › Ajustes.</p>
<h2>Instalação e acesso</h2>
<p>Na primeira vez, o Retro Computer oferece instalar o Claude Code com o instalador oficial. Para entrar, use a conta da sua assinatura do Claude (o Claude Code pede) ou guarde uma chave de API em Painel de controle › Claude.</p>
<p>A chave é cifrada pelo cofre de senhas do sistema e só é entregue ao Prompt de comando.</p>`],
    en: ['Claude Code', `
<h2>What it is</h2>
<p>Claude Code is Anthropic's assistant that works on your files from the terminal: it writes, reviews, organizes folders, programs and answers questions.</p>
<h2>How to use it</h2>
<p>Double-click the <b>Claude</b> icon. It opens in the Command Prompt, in the Documents folder. For another folder, right-click it › <b>Open Claude here</b>.</p>
<p>Right-clicking a file › <b>Ask Claude</b> opens Claude with the request already made: review the text, summarize, translate or another request typed on the spot (on a folder: organize it). First, Retro Computer keeps the current version of the file, in <b>Previous versions…</b>.</p>
<h2>Claude adjusts the Retro Computer</h2>
<p>Ask in words: "make the background navy blue", "put the Calculator in the Start menu", "install WordCraft", "turn off the sounds". Claude changes the appearance, the taskbar, the Start menu, the sounds, the shortcuts and the programs, and whatever it deletes from the disk goes to the Trash. Claude Code asks before each adjustment. The password, the API key, the disk folder and the updates stay with you. To turn it off: Control Panel › Claude › Adjustments.</p>
<h2>Installation and access</h2>
<p>The first time, Retro Computer offers to install Claude Code with the official installer. To sign in, use your Claude subscription account (Claude Code asks for it) or store an API key in Control Panel › Claude.</p>
<p>The key is encrypted by the system's password vault and is only handed to the Command Prompt.</p>`],
    es: ['Claude Code', `
<h2>Qué es</h2>
<p>Claude Code es el asistente de Anthropic que trabaja en tus archivos desde la terminal: escribe, revisa, organiza carpetas, programa y responde preguntas.</p>
<h2>Cómo usarlo</h2>
<p>Haz doble clic en el icono <b>Claude</b>. Se abre en la Línea de comandos, en la carpeta Mis documentos. Para otra carpeta, clic derecho en ella › <b>Abrir Claude aquí</b>.</p>
<p>El clic derecho en un archivo › <b>Pedir a Claude</b> abre Claude con el pedido ya hecho: revisar el texto, resumir, traducir u otro pedido escrito en el momento (en una carpeta: organizarla). Antes, Retro Computer guarda la versión actual del archivo, en <b>Versiones anteriores…</b>.</p>
<h2>Claude ajusta el Retro Computer</h2>
<p>Pídelo con palabras: "pon el fondo azul marino", "pon la Calculadora en el menú Inicio", "instala WordCraft", "apaga los sonidos". Claude cambia la apariencia, la barra de tareas, el menú Inicio, los sonidos, los accesos directos y los programas, y lo que borre del disco va a la Papelera. Claude Code pregunta antes de cada ajuste. La contraseña, la clave de API, la carpeta del disco y las actualizaciones quedan contigo. Para desactivarlo: Panel de control › Claude › Ajustes.</p>
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
<p><b>Durante o foco</b> (não nas pausas): o <b>Não perturbe</b> liga sozinho (os avisos esperam no sino, e o do fim do foco aparece), e, se marcado, os jogos ficam para as pausas.</p>
<h2>Cronômetro e temporizador</h2>
<p>A aba <b>Cronômetro</b> marca as voltas; a aba <b>Temporizador</b> conta de alguns segundos a horas, com atalhos de 1 a 60 minutos, e avisa com som e balão quando acaba. Os dois continuam com a janela fechada.</p>
<p>Dica: marque <b>Minimizar as outras janelas no começo do foco</b> e use a tela cheia (F11).</p>`],
    en: ['Focus (Pomodoro)', `
<h2>Working in blocks</h2>
<p>The <b>Pomodoro</b> tab alternates blocks of work (25 minutes) with short breaks (5 minutes) and, every four blocks, a long break (15 minutes). The times can be changed.</p>
<p>The time shows in the tray, next to the clock, even with the window closed. At the end of each phase, a sound and a notice.</p>
<p><b>During focus</b> (not during the breaks): <b>Do not disturb</b> turns on by itself (notifications wait in the bell, and the one at the end of the focus block shows), and, if checked, the games are left for the breaks.</p>
<h2>Stopwatch and timer</h2>
<p>The <b>Stopwatch</b> tab records laps; the <b>Timer</b> tab counts from a few seconds to hours, with shortcuts from 1 to 60 minutes, and tells you with a sound and a balloon when it ends. Both keep going with the window closed.</p>
<p>Tip: check <b>Minimize the other windows when a focus block starts</b> and use full screen (F11).</p>`],
    es: ['Enfoque (Pomodoro)', `
<h2>Trabajar en bloques</h2>
<p>La pestaña <b>Pomodoro</b> alterna bloques de trabajo (25 minutos) con pausas cortas (5 minutos) y, cada cuatro bloques, una pausa larga (15 minutos). Los tiempos se pueden cambiar.</p>
<p>El tiempo aparece en la bandeja, junto al reloj, incluso con la ventana cerrada. Al final de cada fase, un sonido y un aviso.</p>
<p><b>Durante el enfoque</b> (no en las pausas): <b>No molestar</b> se activa solo (los avisos esperan en la campana, y el del final del enfoque aparece), y, si está marcado, los juegos quedan para las pausas.</p>
<h2>Cronómetro y temporizador</h2>
<p>La pestaña <b>Cronómetro</b> marca las vueltas; la pestaña <b>Temporizador</b> cuenta de unos segundos a horas, con atajos de 1 a 60 minutos, y avisa con sonido y globo cuando termina. Los dos siguen con la ventana cerrada.</p>
<p>Consejo: marca <b>Minimizar las otras ventanas al comenzar el enfoque</b> y usa la pantalla completa (F11).</p>`],
  },
  {
    id: 'painel', icone: 'painel',
    'pt-BR': ['Painel de controle', `
<h2>Configurações</h2>
<p><b>Aparência</b>: a cor e o padrão do fundo, a proteção de tela (Voando pelas estrelas, Linhas coloridas ou Relógio), os efeitos (os cantos magnéticos das janelas e a luz noturna, com menos azul à noite), a tela cheia, o tamanho dos pixels (para as letras ficarem nítidas em qualquer monitor), a área da tela (a resolução, no Retro Computer como sistema), as <b>várias telas</b> (com dois monitores: duplicar, estender ou usar uma só, no Retro Computer como sistema; fora dele, em qual monitor o Retro Computer fica) e abrir o Retro Computer ao entrar no computador.</p>
<p><b>Disco C:</b>: a pasta do disco no computador principal, o espaço livre e a troca de pasta.</p>
<p><b>Claude</b>: a instalação do Claude Code e a chave de API.</p>
<p><b>Internet</b>: o e-mail, a pesquisa, em qual navegador os links abrem, as permissões dos sites e os programas da internet.</p>
<p><b>Idioma</b>: português, inglês ou espanhol (o Retro Computer reinicia para trocar).</p>
<p><b>Segurança</b>: o estado das proteções (a senha, o firewall, as atualizações, a chave do Claude) e a privacidade (só conexões seguras no Navegador, apagar os dados de navegação ao fechar, o histórico da área de transferência).</p>
<p><b>Senhas</b>: a senha da tela de bloqueio e quando pedi-la.</p>
<p><b>Usuários</b>: as pessoas que usam este computador, cada uma com a área de trabalho, as configurações e o disco C: próprios.</p>
<p><b>Bluetooth</b>: procurar, parear, conectar e esquecer mouses, teclados e fones sem fio (no Windows e no macOS, abre as configurações do sistema).</p>
<p><b>Firewall</b> e <b>Atualizações do Linux</b> (só no Linux): recusar as conexões que chegam de fora e as atualizações de segurança do Linux e dos programas da Loja.</p>
<p><b>Impressoras</b>: as impressoras, a padrão, a fila de impressão e a página de teste.</p>
<p><b>Teclado</b>: o layout (Português ABNT2, EUA internacional com teclas mortas e outros), um campo para testar os acentos e a aba <b>Atalhos</b>. No EUA internacional, os acentos se juntam como no Windows: ´ + c = ç, e as aspas antes de uma palavra (" + B) saem como aspas, também no Linux.</p>
<p><b>Cópia de segurança</b>: o disco C: inteiro (com a Lixeira e as versões anteriores) vai para outra pasta (um disco externo, um pendrive, a pasta de uma nuvem), todo dia ou toda semana, ou na hora. A cópia só acrescenta e atualiza: nada é apagado nela. Com o destino desligado, ela espera e é feita quando ele voltar.</p>
<p><b>Mouse</b>: no Retro Computer como sistema, o botão principal (destro ou canhoto, com uma pasta para testar o clique duplo), a velocidade do ponteiro, a aceleração e a rolagem natural; na aba <b>Touchpad</b>, tocar para clicar, rolar e clicar com dois dedos e desligá-lo enquanto se digita ou com um mouse ligado. As escolhas valem também para o mouse sem fio ligado depois. Fora do modo sistema, o mouse segue as configurações do computador principal.</p>
<p><b>Sons</b>: os sons do sistema e, na aba <b>Áudio</b>, a saída de som e o microfone preferidos.</p>
<p><b>Opções de acessibilidade</b>: o alto contraste (fundo escuro e letras claras), a lupa (logotipo + "+" amplia a tela em volta do ponteiro, logotipo + "-" diminui e logotipo + Esc fecha), o cursor grande, os avisos visuais (a janela ou a tela piscam quando o sistema toca um som) e, com o Retro Computer como sistema, as teclas de aderência e as teclas do mouse.</p>
<p><b>Opções de energia</b> (com o Retro Computer como sistema): depois de quanto tempo parado a tela apaga e o computador suspende, na tomada e na bateria (com um som tocando, ele não suspende), e o que a tampa do notebook faz.</p>
<p><b>Data e hora</b>: com o Retro Computer como sistema, acertar a hora pela internet ou à mão e escolher o fuso horário (pede a senha de administrador). <b>Adicionar ou remover programas</b>, <b>Foco</b> e <b>Sobre o Retro Computer</b>.</p>`],
    en: ['Control Panel', `
<h2>Settings</h2>
<p><b>Appearance</b>: the background color and pattern, the screen saver (Flying through the stars, Colored lines or Clock), the effects (the magnetic corners of the windows and the night light, with less blue at night), full screen, the pixel size (so the letters stay sharp on any monitor), the screen area (the resolution, with Retro Computer as the system), <b>multiple screens</b> (with two monitors: duplicate, extend or use only one, with Retro Computer as the system; otherwise, which monitor Retro Computer stays on) and opening Retro Computer when signing in to the computer.</p>
<p><b>Drive C:</b>: the disk folder on the main computer, the free space and changing the folder.</p>
<p><b>Claude</b>: installing Claude Code and the API key.</p>
<p><b>Internet</b>: e-mail, search, where links open, site permissions and the internet programs.</p>
<p><b>Language</b>: Portuguese, English or Spanish (Retro Computer restarts to switch).</p>
<p><b>Security</b>: the status of the protections (the password, the firewall, the updates, the Claude key) and privacy (secure connections only in the Browser, deleting the browsing data on closing, the clipboard history).</p>
<p><b>Passwords</b>: the lock screen password and when to ask for it.</p>
<p><b>Users</b>: the people who use this computer, each with their own desktop, settings and C: drive.</p>
<p><b>Bluetooth</b>: finding, pairing, connecting and forgetting wireless mice, keyboards and headphones (on Windows and macOS, it opens the system settings).</p>
<p><b>Firewall</b> and <b>Linux Updates</b> (Linux only): refusing the connections that come from outside, and the security updates for Linux and for the programs from the Store.</p>
<p><b>Printers</b>: the printers, the default one, the print queue and the test page.</p>
<p><b>Keyboard</b>: the layout (Brazilian ABNT2, US international with dead keys and others), a field to try the accents and the <b>Shortcuts</b> tab. On US international, the accents combine as on Windows: ´ + c = ç, and quotes before a word (" + B) come out as quotes, also on Linux.</p>
<p><b>Backup</b>: the whole disk C: (with the Trash and the previous versions) goes to another folder (an external drive, a USB drive, a cloud folder), every day or every week, or right away. The backup only adds and updates: nothing is deleted in it. With the destination disconnected, it waits and is made when it comes back.</p>
<p><b>Mouse</b>: with Retro Computer as the system, the primary button (right- or left-handed, with a folder to try the double-click), the pointer speed, acceleration and natural scrolling; on the <b>Touchpad</b> tab, tap to click, two-finger scrolling and clicking, and turning it off while typing or when a mouse is connected. The choices also apply to a wireless mouse connected later. Outside system mode, the mouse follows the main computer's settings.</p>
<p><b>Sounds</b>: the system sounds and, on the <b>Audio</b> tab, the preferred sound output and microphone.</p>
<p><b>Accessibility Options</b>: high contrast (dark background and light letters), the magnifier (logo + "+" magnifies the screen around the pointer, logo + "-" reduces it and logo + Esc closes it), the large cursor, visual alerts (the window or the screen flash when the system plays a sound) and, with Retro Computer as the system, sticky keys and mouse keys.</p>
<p><b>Power Options</b> (with Retro Computer as the system): after how long idle the screen turns off and the computer suspends, plugged in and on battery (with a sound playing, it does not suspend), and what the laptop lid does.</p>
<p><b>Date and Time</b>: with Retro Computer as the system, setting the time from the internet or by hand and choosing the time zone (it asks for the administrator password). <b>Add or Remove Programs</b>, <b>Focus</b> and <b>About Retro Computer</b>.</p>`],
    es: ['Panel de control', `
<h2>Configuración</h2>
<p><b>Apariencia</b>: el color y el patrón del fondo, el protector de pantalla (Volando entre estrellas, Líneas de colores o Reloj), los efectos (las esquinas magnéticas de las ventanas y la luz nocturna, con menos azul de noche), la pantalla completa, el tamaño de los píxeles (para que las letras queden nítidas en cualquier monitor), el área de la pantalla (la resolución, con Retro Computer como sistema), las <b>varias pantallas</b> (con dos monitores: duplicar, extender o usar solo una, con Retro Computer como sistema; si no, en qué monitor queda Retro Computer) y abrir Retro Computer al entrar en la computadora.</p>
<p><b>Disco C:</b>: la carpeta del disco en la computadora principal, el espacio libre y el cambio de carpeta.</p>
<p><b>Claude</b>: la instalación de Claude Code y la clave de API.</p>
<p><b>Internet</b>: el correo, la búsqueda, dónde abrir los enlaces, los permisos de los sitios y los programas de internet.</p>
<p><b>Idioma</b>: portugués, inglés o español (Retro Computer se reinicia para cambiarlo).</p>
<p><b>Seguridad</b>: el estado de las protecciones (la contraseña, el firewall, las actualizaciones, la clave de Claude) y la privacidad (solo conexiones seguras en el Navegador, borrar los datos de navegación al cerrar, el historial del portapapeles).</p>
<p><b>Contraseñas</b>: la contraseña de la pantalla de bloqueo y cuándo pedirla.</p>
<p><b>Usuarios</b>: las personas que usan esta computadora, cada una con su propio escritorio, su configuración y su disco C:.</p>
<p><b>Bluetooth</b>: buscar, emparejar, conectar y olvidar mouses, teclados y auriculares inalámbricos (en Windows y macOS, abre la configuración del sistema).</p>
<p><b>Firewall</b> y <b>Actualizaciones de Linux</b> (solo en Linux): rechazar las conexiones que llegan de fuera y las actualizaciones de seguridad de Linux y de los programas de la Tienda.</p>
<p><b>Impresoras</b>: las impresoras, la predeterminada, la cola de impresión y la página de prueba.</p>
<p><b>Teclado</b>: la distribución (portugués ABNT2, EE. UU. internacional con teclas muertas y otras), un campo para probar los acentos y la pestaña <b>Atajos</b>. En EE. UU. internacional, los acentos se combinan como en Windows: ´ + c = ç, y las comillas antes de una palabra (" + B) salen como comillas, también en Linux.</p>
<p><b>Copia de seguridad</b>: el disco C: entero (con la Papelera y las versiones anteriores) va a otra carpeta (un disco externo, una memoria USB, la carpeta de una nube), todos los días o todas las semanas, o en el momento. La copia solo agrega y actualiza: nada se borra en ella. Con el destino desconectado, espera y se hace cuando vuelva.</p>
<p><b>Mouse</b>: con Retro Computer como sistema, el botón principal (diestro o zurdo, con una carpeta para probar el doble clic), la velocidad del puntero, la aceleración y el desplazamiento natural; en la pestaña <b>Panel táctil</b>, tocar para hacer clic, desplazar y hacer clic con dos dedos y desactivarlo mientras se escribe o con un mouse conectado. Las opciones valen también para el mouse inalámbrico conectado después. Fuera del modo sistema, el mouse sigue la configuración de la computadora principal.</p>
<p><b>Sonidos</b>: los sonidos del sistema y, en la pestaña <b>Audio</b>, la salida de sonido y el micrófono preferidos.</p>
<p><b>Opciones de accesibilidad</b>: el alto contraste (fondo oscuro y letras claras), la lupa (logotipo + "+" amplía la pantalla alrededor del puntero, logotipo + "-" la reduce y logotipo + Esc la cierra), el cursor grande, los avisos visuales (la ventana o la pantalla parpadean cuando el sistema reproduce un sonido) y, con Retro Computer como sistema, las teclas especiales y las teclas del mouse.</p>
<p><b>Opciones de energía</b> (con Retro Computer como sistema): después de cuánto tiempo inactiva se apaga la pantalla y se suspende la computadora, enchufada y con batería (con un sonido en reproducción, no se suspende), y qué hace la tapa del portátil.</p>
<p><b>Fecha y hora</b>: con Retro Computer como sistema, ajustar la hora por internet o a mano y elegir la zona horaria (pide la contraseña de administrador). <b>Agregar o quitar programas</b>, <b>Enfoque</b> y <b>Acerca de Retro Computer</b>.</p>`],
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
    id: 'usuarios', icone: 'usuarios',
    'pt-BR': ['Vários usuários', `
<h2>Um computador para a família ou para a equipe</h2>
<p>Em <b>Painel de controle › Usuários</b>, <b>Novo usuário</b> cria outra pessoa no mesmo Retro Computer. Cada usuário tem a área de trabalho, o fundo, a barra de tarefas, o menu Iniciar, os favoritos e os cookies do Navegador, o Diário, a senha e o <b>disco C:</b> próprios (uma pasta ao lado da do usuário principal, como "Retro Computer - Ana"). Os programas instalados são de todos.</p>
<h2>Entrar e sair</h2>
<p>Com mais de um usuário, o Retro Computer pergunta quem vai usar ao abrir: escolha o nome e, se ele tiver senha, digite-a. Para trocar, use <b>Iniciar › Fazer logoff</b> ou, na caixa <b>Desligar</b>, <b>Fechar todos os programas e entrar como outro usuário</b>: os programas fecham (cada um pergunta se há algo por salvar) e a tela de entrada volta.</p>
<p>A senha de cada usuário é a da tela de bloqueio dele: entre com o usuário e vá a <b>Painel de controle › Senhas</b>. No Linux, a senha de entrada do Linux também serve, para o caso de esquecer.</p>
<h2>Tirar um usuário</h2>
<p><b>Tirar</b> só tira o nome da lista: nada é apagado. Os documentos continuam no disco C: dele (a caixa mostra onde), e a pasta pode ser aberta pelo computador principal. O usuário principal e o que está em uso não saem.</p>
<p>Os usuários separam as áreas de trabalho e os documentos de quem divide o computador; eles não escondem os arquivos de quem usa o computador principal.</p>`],
    en: ['Several users', `
<h2>One computer for the family or the team</h2>
<p>In <b>Control Panel › Users</b>, <b>New User</b> adds another person to the same Retro Computer. Each user has their own desktop, background, taskbar, Start menu, Browser favorites and cookies, Work Log, password and <b>C: drive</b> (a folder next to the main user's, like "Retro Computer - Ana"). The installed programs are shared by everyone.</p>
<h2>Logging on and off</h2>
<p>With more than one user, Retro Computer asks who is using it when it opens: choose the name and, if it has a password, type it. To switch, use <b>Start › Log Off</b> or, in the <b>Shut Down</b> box, <b>Close all programs and log on as a different user</b>: the programs close (each one asks if there is anything to save) and the logon screen comes back.</p>
<p>Each user's password is their lock screen password: log on as the user and go to <b>Control Panel › Passwords</b>. On Linux, the Linux login password also works, in case it is forgotten.</p>
<h2>Removing a user</h2>
<p><b>Remove</b> only takes the name off the list: nothing is deleted. The documents stay on that user's C: drive (the box shows where), and the folder can be opened from the main computer. The main user and the one in use cannot be removed.</p>
<p>Users keep apart the desktops and documents of the people who share the computer; they do not hide the files from whoever uses the main computer.</p>`],
    es: ['Varios usuarios', `
<h2>Una computadora para la familia o el equipo</h2>
<p>En <b>Panel de control › Usuarios</b>, <b>Nuevo usuario</b> agrega otra persona al mismo Retro Computer. Cada usuario tiene su propio escritorio, fondo, barra de tareas, menú Inicio, favoritos y cookies del Navegador, Diario, contraseña y <b>disco C:</b> (una carpeta junto a la del usuario principal, como "Retro Computer - Ana"). Los programas instalados son de todos.</p>
<h2>Entrar y salir</h2>
<p>Con más de un usuario, Retro Computer pregunta quién lo va a usar al abrir: elige el nombre y, si tiene contraseña, escríbela. Para cambiar, usa <b>Inicio › Cerrar sesión</b> o, en el cuadro <b>Apagar</b>, <b>Cerrar todos los programas y entrar como otro usuario</b>: los programas se cierran (cada uno pregunta si hay algo por guardar) y vuelve la pantalla de entrada.</p>
<p>La contraseña de cada usuario es la de su pantalla de bloqueo: entra con el usuario y ve a <b>Panel de control › Contraseñas</b>. En Linux, la contraseña de entrada de Linux también sirve, por si la olvidas.</p>
<h2>Quitar un usuario</h2>
<p><b>Quitar</b> solo saca el nombre de la lista: no se borra nada. Los documentos siguen en el disco C: de ese usuario (el cuadro muestra dónde), y la carpeta se puede abrir desde la computadora principal. El usuario principal y el que está en uso no se pueden quitar.</p>
<p>Los usuarios separan los escritorios y los documentos de quienes comparten la computadora; no esconden los archivos de quien usa la computadora principal.</p>`],
  },
  {
    id: 'seguranca', icone: 'seguranca',
    'pt-BR': ['Segurança e privacidade', `
<h2>A Central de segurança</h2>
<p><b>Painel de controle › Segurança</b> mostra, num lugar só, a senha da tela de bloqueio, o firewall e as atualizações de segurança automáticas (no Linux) e como a chave do Claude está guardada. O que estiver em vermelho merece uma olhada; cada linha tem o botão que leva à configuração dela.</p>
<h2>Privacidade</h2>
<p>Na aba <b>Privacidade</b>: só conexões seguras (HTTPS) no Navegador, apagar os dados de navegação (os cookies, os dados dos sites e os arquivos temporários) ao fechar o Retro Computer e guardar ou não o histórico da área de transferência.</p>
<h2>O firewall</h2>
<p>No Linux, <b>Painel de controle › Firewall</b> liga o firewall do sistema (o ufw): ele recusa as conexões que outros computadores tentam abrir neste, e a internet continua como antes. Ligar e desligar pedem a senha de administrador.</p>
<h2>O antivírus</h2>
<p>Botão direito num arquivo, numa pasta, no disco C: ou num pendrive › <b>Verificar com o antivírus</b> (ou Painel de controle › Segurança › Verificar…). No Linux, ele usa o ClamAV (a janela o instala, com a senha de administrador, se faltar); no Windows, o Microsoft Defender. Nada é apagado: o que for achado aparece na lista, e o botão <b>Mandar para a Lixeira</b> tira os do disco C: do caminho.</p>`],
    en: ['Security and privacy', `
<h2>The Security Center</h2>
<p><b>Control Panel › Security</b> shows, in one place, the lock screen password, the firewall and the automatic security updates (on Linux) and how the Claude key is stored. Whatever is in red deserves a look; each line has the button that leads to its settings.</p>
<h2>Privacy</h2>
<p>On the <b>Privacy</b> tab: secure connections only (HTTPS) in the Browser, deleting the browsing data (cookies, site data and temporary files) when Retro Computer closes, and keeping the clipboard history or not.</p>
<h2>The firewall</h2>
<p>On Linux, <b>Control Panel › Firewall</b> turns on the system firewall (ufw): it refuses the connections that other computers try to open to this one, and the internet keeps working as before. Turning it on and off asks for the administrator password.</p>
<h2>The antivirus</h2>
<p>Right-click a file, a folder, drive C: or a USB drive › <b>Scan for viruses</b> (or Control Panel › Security › Scan…). On Linux, it uses ClamAV (the window installs it, with the administrator password, if it is missing); on Windows, Microsoft Defender. Nothing is deleted: what is found appears in the list, and the <b>Send to the Trash</b> button moves the ones on drive C: out of the way.</p>`],
    es: ['Seguridad y privacidad', `
<h2>El Centro de seguridad</h2>
<p><b>Panel de control › Seguridad</b> muestra, en un solo lugar, la contraseña de la pantalla de bloqueo, el firewall y las actualizaciones de seguridad automáticas (en Linux) y cómo está guardada la clave de Claude. Lo que esté en rojo merece una mirada; cada línea tiene el botón que lleva a su configuración.</p>
<h2>Privacidad</h2>
<p>En la pestaña <b>Privacidad</b>: solo conexiones seguras (HTTPS) en el Navegador, borrar los datos de navegación (las cookies, los datos de los sitios y los archivos temporales) al cerrar Retro Computer y guardar o no el historial del portapapeles.</p>
<h2>El firewall</h2>
<p>En Linux, <b>Panel de control › Firewall</b> activa el firewall del sistema (ufw): rechaza las conexiones que otras computadoras intentan abrir con esta, e internet sigue igual que antes. Activarlo y desactivarlo piden la contraseña de administrador.</p>
<h2>El antivirus</h2>
<p>Clic derecho en un archivo, una carpeta, el disco C: o una memoria USB › <b>Analizar con el antivirus</b> (o Panel de control › Seguridad › Analizar…). En Linux, usa ClamAV (la ventana lo instala, con la contraseña de administrador, si falta); en Windows, Microsoft Defender. Nada se borra: lo que se encuentre aparece en la lista, y el botón <b>Enviar a la Papelera</b> aparta los del disco C:.</p>`],
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
<p><b>Tecla do logotipo</b>: menu Iniciar. <b>Alt+Tab</b>: trocar de janela (também as do Linux). <b>Alt+F4</b>: fechar a janela. <b>Logotipo + as setas</b>: encaixar a janela. <b>Logotipo + E</b>: Explorador; <b>R</b>: Executar; <b>D</b>: mostrar a área de trabalho; <b>M</b>: minimizar tudo; <b>I</b>: Painel de controle; <b>S</b>: pesquisar; <b>V</b>: área de transferência; <b>L</b>: bloquear; <b>1 a 9</b>: os programas fixados na barra; <b>Shift+S</b>: capturar um pedaço da tela; <b>"+" e "-"</b>: a lupa (<b>Esc</b> a fecha). <b>Print Screen</b>: captura da tela inteira; <b>Alt+Print Screen</b>: da janela; <b>Shift+Print Screen</b>: de um pedaço. As teclas de volume, de brilho e de calculadora também valem.</p>
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
<p><b>Logo key</b>: Start menu. <b>Alt+Tab</b>: switch windows (the Linux ones too). <b>Alt+F4</b>: close the window. <b>Logo + the arrow keys</b>: dock the window. <b>Logo + E</b>: Explorer; <b>R</b>: Run; <b>D</b>: show the desktop; <b>M</b>: minimize all; <b>I</b>: Control Panel; <b>S</b>: search; <b>V</b>: clipboard; <b>L</b>: lock; <b>1 to 9</b>: the programs pinned to the taskbar; <b>Shift+S</b>: capture a piece of the screen; <b>"+" and "-"</b>: the magnifier (<b>Esc</b> closes it). <b>Print Screen</b>: screenshot of the whole screen; <b>Alt+Print Screen</b>: of the window; <b>Shift+Print Screen</b>: of a piece. The volume, brightness and calculator keys also work.</p>
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
<p><b>Tecla del logotipo</b>: menú Inicio. <b>Alt+Tab</b>: cambiar de ventana (también las de Linux). <b>Alt+F4</b>: cerrar la ventana. <b>Logotipo + las flechas</b>: acoplar la ventana. <b>Logotipo + E</b>: Explorador; <b>R</b>: Ejecutar; <b>D</b>: mostrar el escritorio; <b>M</b>: minimizar todo; <b>I</b>: Panel de control; <b>S</b>: buscar; <b>V</b>: portapapeles; <b>L</b>: bloquear; <b>1 a 9</b>: los programas anclados en la barra; <b>Shift+S</b>: capturar un trozo de la pantalla; <b>"+" y "-"</b>: la lupa (<b>Esc</b> la cierra). <b>Impr Pant</b>: captura de la pantalla entera; <b>Alt+Impr Pant</b>: de la ventana; <b>Shift+Impr Pant</b>: de un trozo. Las teclas de volumen, brillo y calculadora también funcionan.</p>
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
<p>Com mais de um usuário (Painel de controle › Usuários), a caixa também oferece <b>Fechar todos os programas e entrar como outro usuário</b>.</p>
<p>Para sair de perto sem fechar nada, use <b>Iniciar › Bloquear o computador</b>.</p>`],
    en: ['Shut Down', `
<h2>Shutting down the computer</h2>
<p><b>Start › Shut Down</b> closes the programs (each one asks if there is anything to save) and quits Retro Computer. The files stay on drive C:.</p>
<p><b>Restart</b> reloads the desktop. <b>Leave full screen</b> shows Retro Computer in a window of the main computer.</p>
<p>With Retro Computer as the Linux system, the options are to turn off, restart and suspend the computer, and to sign out.</p>
<p>With more than one user (Control Panel › Users), the box also offers <b>Close all programs and log on as a different user</b>.</p>
<p>To step away without closing anything, use <b>Start › Lock the Computer</b>.</p>`],
    es: ['Apagar', `
<h2>Apagar la computadora</h2>
<p><b>Inicio › Apagar</b> cierra los programas (cada uno pregunta si hay algo por guardar) y sale de Retro Computer. Los archivos quedan en el disco C:.</p>
<p><b>Reiniciar</b> recarga el escritorio. <b>Salir de la pantalla completa</b> muestra Retro Computer en una ventana de la computadora principal.</p>
<p>Con Retro Computer como sistema de Linux, las opciones son apagar, reiniciar y suspender la computadora, y cerrar la sesión.</p>
<p>Con más de un usuario (Panel de control › Usuarios), el cuadro también ofrece <b>Cerrar todos los programas y entrar como otro usuario</b>.</p>
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
