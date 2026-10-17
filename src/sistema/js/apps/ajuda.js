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
<p>Os ícones da área de trabalho se escolhem em <b>Painel de controle › Aparência › Ícones</b>; para pôr outro programa nela, use o botão direito nele, no menu Iniciar › <b>Adicionar à área de trabalho</b>. Arrastado para uma pasta, o ícone de um programa vira um <b>atalho</b> dentro dela (com Ctrl, fica também na área de trabalho); dois cliques no atalho abrem o programa.</p>
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
<p>The desktop icons are chosen in <b>Control Panel › Appearance › Icons</b>; to put another program on it, right-click the program in the Start menu › <b>Add to the desktop</b>. Dragged into a folder, a program's icon becomes a <b>shortcut</b> in it (with Ctrl, it also stays on the desktop); double-clicking the shortcut opens the program.</p>
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
<p>Los iconos del escritorio se eligen en <b>Panel de control › Apariencia › Iconos</b>; para poner otro programa en él, haz clic derecho en el programa, en el menú Inicio › <b>Agregar al escritorio</b>. Arrastrado a una carpeta, el icono de un programa se convierte en un <b>acceso directo</b> dentro de ella (con Ctrl, también se queda en el escritorio); un doble clic en el acceso directo abre el programa.</p>
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
<p>Arraste o arquivo para fora da janela do Retro Computer: para a área de trabalho ou uma pasta do computador principal, para um site no Navegador (um anexo do e-mail) ou para outro programa. Vai uma cópia; o arquivo continua no disco C:. Também dá para usar o botão direito no arquivo › <b>Enviar para</b> › Área de trabalho ou Downloads do computador principal, ou <b>Mostrar no computador principal</b>, para abrir a pasta lá.</p>
<h2>O computador principal</h2>
<p>Em <b>Meu computador › Computador principal</b> ficam a área de trabalho, os documentos, os downloads, as imagens, as músicas e os vídeos do computador principal. Funcionam como um pendrive: botão direito › <b>Copiar para Meus documentos</b> traz uma cópia, e arrastar um arquivo do disco C: para uma dessas pastas (ou <b>Colar aqui</b>) leva uma cópia. Nada é apagado nem gravado por cima lá.</p>
<p>De lá para cá: no Windows, ligue em <b>Painel de controle › Disco C: › Computador principal</b> o Retro Computer no <b>Enviar para</b> do Explorador de Arquivos; no Mac, solte os arquivos no ícone do Retro Computer no Dock ou use <b>Abrir com › Retro Computer</b> no Finder. Uma cópia vai para Meus documentos › Recebidos. A mesma aba cria um atalho do disco C: na área de trabalho de lá e esconde essas pastas (para os outros usuários do Retro Computer, elas começam escondidas).</p>
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
<p>Drag the file out of the Retro Computer window: onto the main computer's desktop or one of its folders, onto a website in the Browser (an e-mail attachment) or onto another program. A copy goes; the file stays on drive C:. You can also right-click the file › <b>Send to</b> › Desktop or Downloads of the main computer, or <b>Show on the main computer</b>, to open the folder there.</p>
<h2>The main computer</h2>
<p><b>Computer › Main computer</b> shows the main computer's desktop, documents, downloads, pictures, music and videos. They work like a USB drive: right-click › <b>Copy to Documents</b> brings a copy, and dragging a file from drive C: onto one of these folders (or <b>Paste here</b>) takes a copy there. Nothing is deleted or overwritten there.</p>
<p>From there to here: on Windows, turn on Retro Computer in the File Explorer <b>Send to</b> menu in <b>Control Panel › Drive C: › Main computer</b>; on a Mac, drop the files on the Retro Computer icon in the Dock or use <b>Open With › Retro Computer</b> in the Finder. A copy goes to Documents › Received. The same tab creates a drive C: shortcut on its desktop and hides these folders (for the other Retro Computer users, they start hidden).</p>
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
<p>Arrastra el archivo fuera de la ventana de Retro Computer: al escritorio o a una carpeta de la computadora principal, a un sitio en el Navegador (un adjunto del correo) o a otro programa. Va una copia; el archivo sigue en el disco C:. También puedes usar el clic derecho en el archivo › <b>Enviar a</b> › Escritorio o Descargas de la computadora principal, o <b>Mostrar en la computadora principal</b>, para abrir la carpeta allí.</p>
<h2>La computadora principal</h2>
<p>En <b>Mi computadora › Computadora principal</b> están el escritorio, los documentos, las descargas, las imágenes, la música y los videos de la computadora principal. Funcionan como una memoria USB: clic derecho › <b>Copiar a Mis documentos</b> trae una copia, y arrastrar un archivo del disco C: a una de esas carpetas (o <b>Pegar aquí</b>) lleva una copia. Nada se borra ni se sobrescribe allí.</p>
<p>De allá para acá: en Windows, activa Retro Computer en <b>Enviar a</b> del Explorador de archivos en <b>Panel de control › Disco C: › Computadora principal</b>; en Mac, suelta los archivos en el icono de Retro Computer en el Dock o usa <b>Abrir con › Retro Computer</b> en el Finder. Una copia va a Mis documentos › Recibidos. La misma pestaña crea un acceso directo al disco C: en su escritorio y oculta esas carpetas (para los demás usuarios de Retro Computer, empiezan ocultas).</p>
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
<p><b>Formatar</b> (botão direito no pendrive): apaga tudo o que há nele e o prepara em exFAT (o Windows, o Mac e o Linux leem) ou FAT32 (os aparelhos antigos). Pede a confirmação e, no Linux, a senha de administrador; no Windows e no Mac, o próprio sistema confirma. O programa <b>Discos</b> faz o mesmo e também grava imagens (veja o tópico Discos).</p>`],
    en: ['USB drives and cards', `
<h2>Where they show up</h2>
<p>USB drives, memory cards and external disks show up in <b>Computer</b>, with their free space. With Retro Computer as the Linux system, they are mounted automatically when plugged in, with a notice.</p>
<h2>Opening and bringing in</h2>
<p>Double-clicking a file on the USB drive copies it to <b>Documents › Received</b> and opens it from there; the original stays as it was. To bring in several files, select them and right-click › <b>Copy to Documents</b> or <b>Copy to the Desktop</b>.</p>
<h2>Taking out</h2>
<p>Right-click a file on drive C: › <b>Send to</b> › the USB drive. Copy and Paste also work. Nothing on the USB drive is deleted or overwritten.</p>
<h2>Removing</h2>
<p>Before unplugging the USB drive, right-click it › <b>Safely remove</b> and wait for the notice.</p>
<p><b>Format</b> (right-click the USB drive): deletes everything on it and prepares it as exFAT (Windows, Mac and Linux read it) or FAT32 (old devices). It asks for confirmation and, on Linux, the administrator password; on Windows and Mac, the system itself confirms. The <b>Disks</b> program does the same and also writes images (see the Disks topic).</p>`],
    es: ['Memorias USB y tarjetas', `
<h2>Dónde aparecen</h2>
<p>Las memorias USB, las tarjetas de memoria y los discos externos aparecen en <b>Mi computadora</b>, con el espacio libre. Con Retro Computer como sistema de Linux, se montan solos al conectarlos, con un aviso.</p>
<h2>Abrir y traer</h2>
<p>Un doble clic en un archivo de la memoria lo copia a <b>Mis documentos › Recibidos</b> y lo abre desde allí; el original queda como estaba. Para traer varios, selecciónalos y usa el clic derecho › <b>Copiar a Mis documentos</b> o <b>Copiar al Escritorio</b>.</p>
<h2>Llevar</h2>
<p>Clic derecho en un archivo del disco C: › <b>Enviar a</b> › la memoria. Copiar y Pegar también funcionan. Nada de la memoria se borra ni se sobrescribe.</p>
<h2>Retirar</h2>
<p>Antes de sacar la memoria, usa el clic derecho en ella › <b>Quitar de forma segura</b> y espera el aviso.</p>
<p><b>Formatear</b> (clic derecho en la memoria): borra todo lo que hay en ella y la prepara en exFAT (la leen Windows, Mac y Linux) o FAT32 (los aparatos antiguos). Pide la confirmación y, en Linux, la contraseña de administrador; en Windows y en Mac, el propio sistema confirma. El programa <b>Discos</b> hace lo mismo y también graba imágenes (mira el tema Discos).</p>`],
  },
  {
    id: 'discos', icone: 'discos',
    'pt-BR': ['Discos', `
<h2>O programa Discos</h2>
<p>Em <b>Iniciar › Programas › Acessórios › Discos</b>. Na aba <b>Pendrives e cartões</b> aparecem os pendrives, os cartões de memória e os HDs ligados pela USB, inteiros, com as partições embaixo de cada um (também a que não tem letra nem nome, como a de um pendrive com o Linux gravado). O disco do sistema e o que guarda o disco C: ou o próprio Retro Computer (o modo portátil) aparecem apagados e não podem ser apagados.</p>
<h2>Formatar</h2>
<p>Escolha o pendrive (ou uma partição dele) e clique em <b>Formatar…</b>: o exFAT é lido pelo Windows, pelo Mac e pelo Linux; o FAT32 serve aos aparelhos antigos (com arquivos de até 4 GB); no Windows, há também o NTFS. <b>Usar o pendrive inteiro</b> apaga todas as partições e cria uma só: é assim que um pendrive que recebeu uma imagem volta ao normal. No Linux, a senha de administrador é pedida; no Windows, aparece o aviso do próprio Windows; no Mac, a senha do Mac, se ele pedir.</p>
<h2>Gravar uma imagem</h2>
<p><b>Gravar imagem…</b> grava uma imagem .iso ou .img (como a do Linux Mint, para instalar o Linux num notebook) no pendrive inteiro, e depois confere a cópia, pedaço a pedaço. Tudo o que havia no pendrive é apagado. A imagem precisa estar no disco C: (o Navegador guarda o que baixa em Meus documentos › Recebidos); a compactada (.zip, .xz) precisa ser extraída antes. A barra mostra o andamento e o tempo que falta; <b>Parar</b> interrompe (o pendrive fica sem nada legível até ser gravado de novo ou formatado). Pronto, o pendrive liga outro computador. No Windows, se ele perguntar se quer formatar o pendrive, clique em <b>Cancelar</b>: ele não lê o formato da imagem, e isso é normal.</p>
<h2>Espaço em disco</h2>
<p>A aba <b>Espaço em disco</b> mostra quanto o disco C: ocupa, as pastas que mais ocupam e o espaço livre. A <b>Limpeza de disco</b> apaga de vez, depois da confirmação, só o que você marcar: a Lixeira, as versões anteriores com mais de 30 dias, os arquivos temporários da Internet (o cache do Navegador) e as miniaturas do Explorador (que voltam a ser feitas quando precisar). Os seus arquivos não são tocados.</p>
<p>Para o que o programa não faz (mexer nas partições à mão, por exemplo), <b>Arquivo › Ferramenta de discos do sistema</b> abre a do próprio sistema.</p>`],
    en: ['Disks', `
<h2>The Disks program</h2>
<p>In <b>Start › Programs › Accessories › Disks</b>. The <b>USB drives and cards</b> tab shows the USB drives, memory cards and hard disks connected by USB, whole, with the partitions under each one (also the one with no letter or name, like on a USB drive with Linux written to it). The system disk and the one that holds drive C: or Retro Computer itself (portable mode) appear grayed out and cannot be erased.</p>
<h2>Formatting</h2>
<p>Choose the USB drive (or a partition of it) and click <b>Format…</b>: exFAT is read by Windows, Mac and Linux; FAT32 suits old devices (with files of up to 4 GB); on Windows, there is also NTFS. <b>Use the whole USB drive</b> deletes all the partitions and creates a single one: that is how a USB drive that received an image goes back to normal. On Linux, the administrator password is requested; on Windows, Windows's own prompt appears; on Mac, the Mac password, if it asks.</p>
<h2>Writing an image</h2>
<p><b>Write image…</b> writes an .iso or .img image (like Linux Mint's, to install Linux on a laptop) to the whole USB drive, and then verifies the copy, piece by piece. Everything that was on the USB drive is deleted. The image must be on drive C: (the Browser keeps what it downloads in Documents › Received); a compressed one (.zip, .xz) must be extracted first. The bar shows the progress and the time left; <b>Stop</b> interrupts it (the USB drive is left with nothing readable until it is written again or formatted). When it is done, the USB drive starts another computer. On Windows, if it asks whether you want to format the USB drive, click <b>Cancel</b>: it cannot read the image's format, and that is normal.</p>
<h2>Disk space</h2>
<p>The <b>Disk space</b> tab shows how much drive C: takes up, the folders that take up the most and the free space. <b>Disk Cleanup</b> permanently deletes, after confirmation, only what you check: the Trash, previous versions older than 30 days, temporary Internet files (the Browser cache) and the Explorer thumbnails (which are made again when needed). Your files are not touched.</p>
<p>For what the program does not do (editing partitions by hand, for example), <b>File › System disk tool</b> opens the system's own.</p>`],
    es: ['Discos', `
<h2>El programa Discos</h2>
<p>En <b>Inicio › Programas › Accesorios › Discos</b>. La pestaña <b>Memorias USB y tarjetas</b> muestra las memorias USB, las tarjetas de memoria y los discos duros conectados por USB, enteros, con las particiones debajo de cada uno (también la que no tiene letra ni nombre, como la de una memoria con Linux grabado). El disco del sistema y el que guarda el disco C: o el propio Retro Computer (el modo portátil) aparecen atenuados y no se pueden borrar.</p>
<h2>Formatear</h2>
<p>Elige la memoria (o una partición de ella) y haz clic en <b>Formatear…</b>: exFAT lo leen Windows, Mac y Linux; FAT32 sirve para los aparatos antiguos (con archivos de hasta 4 GB); en Windows, también está NTFS. <b>Usar la memoria entera</b> borra todas las particiones y crea una sola: así una memoria que recibió una imagen vuelve a la normalidad. En Linux, se pide la contraseña de administrador; en Windows, aparece el aviso del propio Windows; en Mac, la contraseña del Mac, si la pide.</p>
<h2>Grabar una imagen</h2>
<p><b>Grabar imagen…</b> graba una imagen .iso o .img (como la de Linux Mint, para instalar Linux en una laptop) en la memoria entera, y después comprueba la copia, pedazo a pedazo. Todo lo que había en la memoria se borra. La imagen tiene que estar en el disco C: (el Navegador guarda lo que descarga en Mis documentos › Recibidos); la comprimida (.zip, .xz) hay que extraerla antes. La barra muestra el avance y el tiempo que falta; <b>Detener</b> la interrumpe (la memoria queda sin nada legible hasta que se grabe de nuevo o se formatee). Lista, la memoria arranca otra computadora. En Windows, si pregunta si quieres formatear la memoria, haz clic en <b>Cancelar</b>: no lee el formato de la imagen, y eso es normal.</p>
<h2>Espacio en disco</h2>
<p>La pestaña <b>Espacio en disco</b> muestra cuánto ocupa el disco C:, las carpetas que más ocupan y el espacio libre. La <b>Limpieza de disco</b> borra para siempre, después de la confirmación, solo lo que marques: la Papelera, las versiones anteriores de más de 30 días, los archivos temporales de Internet (la caché del Navegador) y las miniaturas del Explorador (que se vuelven a hacer cuando hace falta). Tus archivos no se tocan.</p>
<p>Para lo que el programa no hace (modificar las particiones a mano, por ejemplo), <b>Archivo › Herramienta de discos del sistema</b> abre la del propio sistema.</p>`],
  },
  {
    id: 'pdf', icone: 'pdf',
    'pt-BR': ['PDF, digitalização e OCR', `
<h2>Salvar como PDF</h2>
<p>No Bloco de notas, no Visualizador de imagens e no Navegador, <b>Arquivo › Salvar como PDF…</b> grava a página (a mesma da impressão) num PDF do disco C:, sem impressora nenhuma. O papel segue o país: o Carta nos Estados Unidos, no Canadá e no México; o A4 nos outros.</p>
<h2>As ferramentas de PDF</h2>
<p>O botão direito num PDF › <b>Ferramentas de PDF</b>: <b>Separar as páginas</b> (um PDF por página, numa pasta nova ao lado), <b>Extrair páginas…</b> (as páginas escolhidas, como 1-3, 5, num PDF novo) e <b>Girar</b>. Numa imagem, <b>Converter em PDF</b>; em vários arquivos escolhidos, <b>Combinar em um PDF…</b>. A janela <b>Ferramentas de PDF</b> (Iniciar › Programas › Acessórios) põe os PDFs e as imagens na ordem que você quiser antes de combinar. O original não muda; só o Girar grava por cima, e o arquivo de antes fica em <b>Versões anteriores</b>. Os PDFs com senha ou protegidos contra mudanças não podem ser mudados aqui.</p>
<h2>Copiar o texto (OCR)</h2>
<p>O botão direito numa foto, numa digitalização ou num PDF › <b>Copiar o texto (OCR)…</b> (no Visualizador de imagens, em <b>Editar</b>): o texto aparece numa janela, de onde se copia ou se salva como .txt. Escolha o idioma do texto (português, inglês ou espanhol) para os acentos saírem certos. Nos PDFs, as páginas que já têm texto dão o texto delas; as digitalizadas são lidas pelo OCR. Tudo acontece neste computador, sem internet; confira o texto reconhecido antes de usar.</p>
<h2>Digitalizar</h2>
<p>Em <b>Iniciar › Programas › Acessórios › Digitalizar</b>: escolha o scanner, a cor e a resolução e clique em <b>Digitalizar</b>, uma página por vez. As páginas se juntam na lista; depois, <b>Salvar…</b> grava tudo num PDF ou como imagens, e <b>Depois, copiar o texto (OCR)</b> abre o texto do PDF em seguida. No Linux, os scanners de rede (Wi-Fi) e os da USB funcionam pelo SANE (os pacotes "sane-utils" e "sane-airscan"); no Windows, pelo próprio Windows. No Mac, que não deixa outro programa usar o scanner, o botão abre a <b>Captura de Imagem</b> do sistema.</p>`],
    en: ['PDF, scanning and OCR', `
<h2>Save as PDF</h2>
<p>In Notepad, the Image Viewer and the Browser, <b>File › Save as PDF…</b> saves the page (the same as the printout) to a PDF on drive C:, with no printer at all. The paper follows the country: Letter in the United States, Canada and Mexico; A4 elsewhere.</p>
<h2>The PDF tools</h2>
<p>Right-click a PDF › <b>PDF tools</b>: <b>Split into pages</b> (one PDF per page, in a new folder next to it), <b>Extract pages…</b> (the chosen pages, such as 1-3, 5, in a new PDF) and <b>Rotate</b>. On an image, <b>Convert to PDF</b>; on several chosen files, <b>Combine into one PDF…</b>. The <b>PDF Tools</b> window (Start › Programs › Accessories) puts the PDFs and images in the order you want before combining. The original does not change; only Rotate saves over it, and the previous file stays in <b>Previous versions</b>. PDFs with a password or protected against changes cannot be changed here.</p>
<h2>Copy the text (OCR)</h2>
<p>Right-click a photo, a scan or a PDF › <b>Copy the text (OCR)…</b> (in the Image Viewer, under <b>Edit</b>): the text appears in a window, where you can copy it or save it as .txt. Choose the language of the text (Portuguese, English or Spanish) so the accents come out right. In PDFs, the pages that already have text give their text; the scanned ones are read by OCR. Everything happens on this computer, without the internet; check the recognized text before using it.</p>
<h2>Scan</h2>
<p>In <b>Start › Programs › Accessories › Scan</b>: choose the scanner, the color and the resolution and click <b>Scan</b>, one page at a time. The pages gather in the list; then <b>Save…</b> saves them all in a PDF or as images, and <b>Then copy the text (OCR)</b> opens the PDF's text right after. On Linux, network (Wi-Fi) and USB scanners work through SANE (the "sane-utils" and "sane-airscan" packages); on Windows, through Windows itself. On the Mac, which does not let other programs use the scanner, the button opens the system's <b>Image Capture</b>.</p>`],
    es: ['PDF, escaneo y OCR', `
<h2>Guardar como PDF</h2>
<p>En el Bloc de notas, el Visor de imágenes y el Navegador, <b>Archivo › Guardar como PDF…</b> guarda la página (la misma de la impresión) en un PDF del disco C:, sin ninguna impresora. El papel sigue el país: Carta en Estados Unidos, Canadá y México; A4 en los demás.</p>
<h2>Las herramientas de PDF</h2>
<p>Clic derecho en un PDF › <b>Herramientas de PDF</b>: <b>Separar las páginas</b> (un PDF por página, en una carpeta nueva al lado), <b>Extraer páginas…</b> (las páginas elegidas, como 1-3, 5, en un PDF nuevo) y <b>Girar</b>. En una imagen, <b>Convertir en PDF</b>; en varios archivos elegidos, <b>Combinar en un PDF…</b>. La ventana <b>Herramientas de PDF</b> (Inicio › Programas › Accesorios) pone los PDF y las imágenes en el orden que quieras antes de combinar. El original no cambia; solo Girar guarda encima, y el archivo anterior queda en <b>Versiones anteriores</b>. Los PDF con contraseña o protegidos contra cambios no se pueden cambiar aquí.</p>
<h2>Copiar el texto (OCR)</h2>
<p>Clic derecho en una foto, un escaneo o un PDF › <b>Copiar el texto (OCR)…</b> (en el Visor de imágenes, en <b>Edición</b>): el texto aparece en una ventana, desde donde se copia o se guarda como .txt. Elige el idioma del texto (portugués, inglés o español) para que los acentos salgan bien. En los PDF, las páginas que ya tienen texto dan su texto; las escaneadas las lee el OCR. Todo ocurre en esta computadora, sin internet; revisa el texto reconocido antes de usarlo.</p>
<h2>Escanear</h2>
<p>En <b>Inicio › Programas › Accesorios › Escanear</b>: elige el escáner, el color y la resolución y haz clic en <b>Escanear</b>, una página a la vez. Las páginas se juntan en la lista; después, <b>Guardar…</b> guarda todo en un PDF o como imágenes, y <b>Después, copiar el texto (OCR)</b> abre el texto del PDF a continuación. En Linux, los escáneres de red (Wi-Fi) y los USB funcionan con SANE (los paquetes "sane-utils" y "sane-airscan"); en Windows, con el propio Windows. En el Mac, que no deja que otro programa use el escáner, el botón abre <b>Captura de Imagen</b> del sistema.</p>`],
  },
  {
    id: 'busca', icone: 'localizar',
    'pt-BR': ['Procurar e visualizar', `
<h2>Procurar dentro dos arquivos</h2>
<p>A caixa de busca da barra de tarefas e o <b>Localizar</b> (campo <b>Contendo</b>) também procuram dentro dos documentos: textos, Word, OpenDocument, planilhas, apresentações e PDFs. A busca acha sem acento e sem diferença de maiúsculas, com todas as palavras; para uma frase exata, use aspas ("prazo de quinze dias"). O trecho achado aparece embaixo do nome.</p>
<p>O texto de cada documento fica guardado só neste computador, na pasta de dados do Retro Computer, e se refaz aos poucos quando um arquivo muda. Em <b>Painel de controle › Disco C: › Busca</b>, você desliga a busca pelo conteúdo, e o texto guardado é apagado.</p>
<h2>As abas do Explorador</h2>
<p><b>Ctrl+T</b> abre uma aba nova, <b>Ctrl+W</b> fecha a aba, e <b>Ctrl+Tab</b> passa para a próxima. O botão direito numa pasta tem <b>Abrir em nova aba</b>. Cada aba guarda a pasta e o caminho dela (Voltar e Avançar).</p>
<h2>A visualização rápida</h2>
<p>A <b>barra de espaço</b> num arquivo do Explorador abre a visualização rápida, grande: fotos, PDFs, textos, Word, planilhas, músicas e vídeos. As setas passam para o arquivo do lado, <b>Enter</b> abre no programa, e a barra de espaço ou o <b>Esc</b> fecham.</p>`],
    en: ['Search and preview', `
<h2>Searching inside files</h2>
<p>The taskbar search box and <b>Find</b> (the <b>Containing</b> field) also look inside documents: text files, Word, OpenDocument, spreadsheets, presentations and PDFs. The search finds words without accents and regardless of capitals, with all the words; for an exact phrase, use quotation marks ("within fifteen days"). The excerpt found appears under the name.</p>
<p>The text of each document is stored only on this computer, in the Retro Computer data folder, and is updated bit by bit when a file changes. In <b>Control Panel › Drive C: › Search</b>, you can turn off content search, and the stored text is deleted.</p>
<h2>Explorer tabs</h2>
<p><b>Ctrl+T</b> opens a new tab, <b>Ctrl+W</b> closes the tab, and <b>Ctrl+Tab</b> moves to the next one. Right-clicking a folder offers <b>Open in new tab</b>. Each tab keeps its own folder and path (Back and Forward).</p>
<h2>Quick look</h2>
<p>The <b>space bar</b> on a file in Explorer opens the quick look, in a big window: photos, PDFs, text files, Word, spreadsheets, music and videos. The arrows move to the file next to it, <b>Enter</b> opens it in its program, and the space bar or <b>Esc</b> close it.</p>`],
    es: ['Buscar y visualizar', `
<h2>Buscar dentro de los archivos</h2>
<p>El cuadro de búsqueda de la barra de tareas y <b>Buscar</b> (el campo <b>Con el texto</b>) también buscan dentro de los documentos: textos, Word, OpenDocument, hojas de cálculo, presentaciones y PDF. La búsqueda encuentra sin acentos y sin diferencia de mayúsculas, con todas las palabras; para una frase exacta, usa comillas ("plazo de quince días"). El fragmento encontrado aparece debajo del nombre.</p>
<p>El texto de cada documento se guarda solo en esta computadora, en la carpeta de datos de Retro Computer, y se rehace poco a poco cuando un archivo cambia. En <b>Panel de control › Disco C: › Búsqueda</b>, desactivas la búsqueda por contenido, y el texto guardado se borra.</p>
<h2>Las pestañas del Explorador</h2>
<p><b>Ctrl+T</b> abre una pestaña nueva, <b>Ctrl+W</b> cierra la pestaña, y <b>Ctrl+Tab</b> pasa a la siguiente. El clic derecho en una carpeta tiene <b>Abrir en una nueva pestaña</b>. Cada pestaña guarda su carpeta y su camino (Atrás y Adelante).</p>
<h2>La vista rápida</h2>
<p>La <b>barra espaciadora</b> en un archivo del Explorador abre la vista rápida, grande: fotos, PDF, textos, Word, hojas de cálculo, música y videos. Las flechas pasan al archivo de al lado, <b>Enter</b> lo abre en su programa, y la barra espaciadora o <b>Esc</b> la cierran.</p>`],
  },
  {
    id: 'agenda', icone: 'calendario',
    'pt-BR': ['Agenda e notas autoadesivas', `
<h2>A Agenda</h2>
<p><b>Iniciar › Programas › Acessórios › Agenda</b> mostra o mês à esquerda e os eventos do dia à direita (ou os dos próximos 30 dias). <b>Novo evento</b> (ou dois cliques num dia) pede o título, o local, o começo e o fim (ou o dia todo), a repetição (todo dia, toda semana, todo mês ou todo ano, até uma data), o lembrete e as anotações. Num evento que se repete, mudar ou excluir pergunta se é <b>só esta ocorrência</b> ou todas.</p>
<p>Os eventos ficam em <b>Meus documentos › Agenda.ics</b>, o mesmo formato do Google Agenda, do Outlook e do Calendário do Mac. Cada mudança guarda a versão anterior. Abrir outro arquivo .ics (de um convite, por exemplo) importa os eventos dele para a Agenda, sem mudar o arquivo de origem.</p>
<p>O calendário do relógio marca os dias com eventos e mostra os de hoje; um clique num dia abre a Agenda nele. No Prompt, o Claude também vê e marca compromissos na Agenda.</p>
<h2>Os lembretes</h2>
<p>Na hora do lembrete, mesmo com a Agenda fechada, aparece a janela dos lembretes, com um som: <b>Adiar</b> (de 5 minutos a 1 hora) ou <b>Descartar</b>. Com o "Não perturbe" ligado, o lembrete fica só no sino da bandeja.</p>
<h2>Os calendários da internet</h2>
<p>Em <b>Arquivo › Calendários da internet</b>, <b>Adicionar</b> assina um calendário pelo endereço dele no formato iCal (.ics, começando com https:// ou webcal://): o do Google Agenda (nas configurações do calendário, o "Endereço secreto no formato iCal"), o do Outlook (Publicar o calendário), o dos feriados, o da escola. Os eventos dele aparecem na Agenda e no calendário do relógio com um globo, só para ler: dois cliques mostram os detalhes e <b>Copiar para a Agenda</b>, que faz uma cópia sua. A Agenda baixa o calendário de novo a cada hora e guarda uma cópia, que vale sem internet.</p>
<p>Na mesma janela, cada calendário pode <b>Mostrar os lembretes</b> (desligado, de início), ficar escondido (<b>Mostrar na Agenda</b>), ser renomeado, atualizado na hora ou removido. O endereço fica guardado só neste computador e não aparece na tela: quem tiver o endereço secreto do Google Agenda vê a sua agenda.</p>
<h2>As notas autoadesivas</h2>
<p><b>Iniciar › Programas › Acessórios › Notas autoadesivas</b> (ou o botão direito na área de trabalho › <b>Nova nota autoadesiva</b>) põe um papel amarelo na área de trabalho. Escreva nele: a nota grava sozinha. O <b>+</b> cria outra, o <b>…</b> muda a cor e abre a nota no Bloco de notas, e o <b>×</b> manda a nota para a Lixeira. Arraste pela faixa de cima e mude o tamanho pelo canto.</p>
<p>As notas ficam atrás das janelas; pelo Iniciar, elas vêm para a frente até o próximo clique fora delas (ou o <b>Esc</b>). Cada nota é um arquivo de texto em <b>Meus documentos › Notas autoadesivas</b>.</p>`],
    en: ['Calendar and sticky notes', `
<h2>The Calendar</h2>
<p><b>Start › Programs › Accessories › Calendar</b> shows the month on the left and the day's events on the right (or those of the next 30 days). <b>New event</b> (or double-clicking a day) asks for the title, the location, the start and the end (or all day), the repetition (every day, week, month or year, until a date), the reminder and the notes. On an event that repeats, changing or deleting it asks whether it is <b>only this occurrence</b> or all of them.</p>
<p>The events are kept in <b>Documents › Calendar.ics</b>, the same format as Google Calendar, Outlook and the Mac Calendar. Each change keeps the previous version. Opening another .ics file (from an invitation, for example) imports its events into the Calendar, without changing the original file.</p>
<p>The clock's calendar marks the days with events and shows today's; clicking a day opens the Calendar on it. In the Command Prompt, Claude can also see and add appointments to the Calendar.</p>
<h2>Reminders</h2>
<p>At the reminder's time, even with the Calendar closed, the reminders window appears, with a sound: <b>Snooze</b> (from 5 minutes to 1 hour) or <b>Dismiss</b>. With "Do not disturb" on, the reminder stays only in the tray's bell.</p>
<h2>Internet calendars</h2>
<p>In <b>File › Internet calendars</b>, <b>Add</b> subscribes to a calendar by its address in iCal format (.ics, starting with https:// or webcal://): Google Calendar's (in the calendar's settings, the "Secret address in iCal format"), Outlook's (Publish a calendar), the holidays, the school's. Its events appear in the Calendar and in the clock's calendar with a globe, read-only: a double-click shows the details and <b>Copy to the Calendar</b>, which makes a copy of your own. The Calendar downloads it again every hour and keeps a copy, which works without the internet.</p>
<p>In the same window, each calendar can <b>Show reminders</b> (off at first), be hidden (<b>Show in the Calendar</b>), renamed, updated right away or removed. The address is kept only on this computer and does not appear on the screen: anyone with Google Calendar's secret address can see your calendar.</p>
<h2>Sticky notes</h2>
<p><b>Start › Programs › Accessories › Sticky Notes</b> (or right-clicking the desktop › <b>New sticky note</b>) puts a yellow paper on the desktop. Write on it: the note saves itself. The <b>+</b> creates another, the <b>…</b> changes the color and opens the note in Notepad, and the <b>×</b> sends the note to the Trash. Drag it by the top strip and resize it by the corner.</p>
<p>The notes stay behind the windows; from Start, they come to the front until the next click outside them (or <b>Esc</b>). Each note is a text file in <b>Documents › Sticky Notes</b>.</p>`],
    es: ['Agenda y notas adhesivas', `
<h2>La Agenda</h2>
<p><b>Inicio › Programas › Accesorios › Agenda</b> muestra el mes a la izquierda y los eventos del día a la derecha (o los de los próximos 30 días). <b>Nuevo evento</b> (o doble clic en un día) pide el título, el lugar, el comienzo y el fin (o todo el día), la repetición (todos los días, semanas, meses o años, hasta una fecha), el recordatorio y las notas. En un evento que se repite, cambiar o eliminar pregunta si es <b>solo esta vez</b> o todas.</p>
<p>Los eventos quedan en <b>Mis documentos › Agenda.ics</b>, el mismo formato de Google Calendar, Outlook y el Calendario del Mac. Cada cambio guarda la versión anterior. Abrir otro archivo .ics (de una invitación, por ejemplo) importa sus eventos a la Agenda, sin cambiar el archivo de origen.</p>
<p>El calendario del reloj marca los días con eventos y muestra los de hoy; un clic en un día abre la Agenda en él. En la Línea de comandos, Claude también ve y anota citas en la Agenda.</p>
<h2>Los recordatorios</h2>
<p>A la hora del recordatorio, aun con la Agenda cerrada, aparece la ventana de los recordatorios, con un sonido: <b>Posponer</b> (de 5 minutos a 1 hora) o <b>Descartar</b>. Con "No molestar" activado, el recordatorio queda solo en la campana de la bandeja.</p>
<h2>Los calendarios de internet</h2>
<p>En <b>Archivo › Calendarios de internet</b>, <b>Agregar</b> te suscribe a un calendario por su dirección en formato iCal (.ics, que empieza con https:// o webcal://): el de Google Calendar (en la configuración del calendario, la "Dirección secreta en formato iCal"), el de Outlook (Publicar un calendario), el de los feriados, el de la escuela. Sus eventos aparecen en la Agenda y en el calendario del reloj con un globo, solo para leer: el doble clic muestra los detalles y <b>Copiar a la Agenda</b>, que hace una copia tuya. La Agenda descarga el calendario de nuevo cada hora y guarda una copia, que vale sin internet.</p>
<p>En la misma ventana, cada calendario puede <b>Mostrar los recordatorios</b> (desactivado al principio), quedar oculto (<b>Mostrar en la Agenda</b>), cambiar de nombre, actualizarse en el momento o quitarse. La dirección se guarda solo en esta computadora y no aparece en la pantalla: quien tenga la dirección secreta de Google Calendar ve tu agenda.</p>
<h2>Las notas adhesivas</h2>
<p><b>Inicio › Programas › Accesorios › Notas adhesivas</b> (o el clic derecho en el escritorio › <b>Nueva nota adhesiva</b>) pone un papel amarillo en el escritorio. Escribe en él: la nota se guarda sola. El <b>+</b> crea otra, el <b>…</b> cambia el color y abre la nota en el Bloc de notas, y la <b>×</b> manda la nota a la Papelera. Arrástrala por la franja de arriba y cambia el tamaño por la esquina.</p>
<p>Las notas quedan detrás de las ventanas; desde Inicio, vienen al frente hasta el próximo clic fuera de ellas (o <b>Esc</b>). Cada nota es un archivo de texto en <b>Mis documentos › Notas adhesivas</b>.</p>`],
  },
  {
    id: 'celular', icone: 'celular',
    'pt-BR': ['Receber do celular', `
<h2>Mandar fotos e arquivos do celular</h2>
<p><b>Iniciar › Programas › Acessórios › Receber do celular</b> mostra um código QR. Com o celular na mesma rede Wi-Fi do computador, aponte a câmera do celular para o código (ou digite o endereço no navegador dele). O computador pergunta se aceita aquele aparelho; aceito, o celular escolhe as fotos e os arquivos, e eles chegam em <b>Meus documentos › Recebidos</b>, sem gravar por cima de nada.</p>
<h2>A segurança</h2>
<p>Nada sai do computador: o celular só manda. O endereço tem um código que muda a cada vez, só funciona na rede local e só enquanto a janela está aberta (ela desliga sozinha depois de 15 minutos sem uso). Um aparelho só manda depois de aceito, e muitas tentativas com o código errado desligam tudo. Aceite só o seu celular, ou o de alguém que você conhece.</p>
<p>No Windows e no Mac, o sistema pode perguntar, na primeira vez, se o Retro Computer pode receber conexões da rede: permita só nas redes particulares. No Linux com o firewall ligado, o celular pode não chegar.</p>`],
    en: ['Receive from Phone', `
<h2>Sending photos and files from the phone</h2>
<p><b>Start › Programs › Accessories › Receive from Phone</b> shows a QR code. With the phone on the same Wi-Fi network as the computer, point the phone's camera at the code (or type the address in its browser). The computer asks whether to accept that device; once accepted, the phone chooses the photos and files, and they arrive in <b>Documents › Received</b>, without overwriting anything.</p>
<h2>Security</h2>
<p>Nothing leaves the computer: the phone only sends. The address has a code that changes every time, works only on the local network and only while the window is open (it turns itself off after 15 minutes without use). A device sends only after it is accepted, and many attempts with the wrong code turn everything off. Accept only your phone, or that of someone you know.</p>
<p>On Windows and on the Mac, the system may ask, the first time, whether Retro Computer can receive network connections: allow it only on private networks. On Linux with the firewall on, the phone may not reach it.</p>`],
    es: ['Recibir del celular', `
<h2>Mandar fotos y archivos del celular</h2>
<p><b>Inicio › Programas › Accesorios › Recibir del celular</b> muestra un código QR. Con el celular en la misma red Wi-Fi de la computadora, apunta la cámara del celular al código (o escribe la dirección en su navegador). La computadora pregunta si acepta ese aparato; aceptado, el celular elige las fotos y los archivos, y llegan a <b>Mis documentos › Recibidos</b>, sin sobrescribir nada.</p>
<h2>La seguridad</h2>
<p>Nada sale de la computadora: el celular solo manda. La dirección tiene un código que cambia cada vez, solo funciona en la red local y solo mientras la ventana está abierta (se apaga sola tras 15 minutos sin uso). Un aparato solo manda después de aceptado, y muchos intentos con el código equivocado apagan todo. Acepta solo tu celular, o el de alguien que conoces.</p>
<p>En Windows y en el Mac, el sistema puede preguntar, la primera vez, si Retro Computer puede recibir conexiones de la red: permítelo solo en las redes privadas. En Linux con el firewall encendido, el celular puede no llegar.</p>`],
  },
  {
    id: 'barra', icone: 'relogio',
    'pt-BR': ['A barra de tarefas', `
<h2>À esquerda</h2>
<p>O botão <b>Iniciar</b>, a caixa de busca (que acha programas, opções do Painel de controle e arquivos do disco C:; com Enter, pesquisa na internet) e os programas fixados. Para fixar um programa, use o botão direito no botão da janela dele ou num ícone › <b>Fixar na barra de tarefas</b>. Para mudar a ordem, arraste os botões (os fixados e os das janelas) para o lugar que quiser: a ordem dos fixados fica guardada.</p>
<p>Uma conta na caixa de busca (<b>12*3,5</b>, <b>200 × 15%</b>, <b>√2</b>) mostra o resultado primeiro; Enter o copia.</p>
<p>Os botões das janelas mostram o nome. Para ver só os ícones, agrupados por programa, use o botão direito na barra › <b>Botões das janelas</b>. A roda do mouse num botão abre outra janela do programa.</p>
<h2>O menu Iniciar do seu jeito</h2>
<p>O botão direito em qualquer programa do Iniciar › <b>Fixar no menu Iniciar</b> põe o programa no alto do menu. Em <b>Configurações › Barra de tarefas e menu Iniciar</b> (ou no botão direito no Iniciar › <b>Propriedades</b>), você muda a ordem dos fixados, escolhe os itens à vista (a Loja, os Documentos, o Localizar…), liga os <b>ícones pequenos</b> e limpa ou desliga a lista dos documentos recentes. O botão direito num item do menu › <b>Não mostrar no menu Iniciar</b> também o esconde.</p>
<h2>A bandeja, à direita</h2>
<p><b>Rede</b>: as redes Wi-Fi, conectar e desconectar (no Linux). <b>Volume</b>: o som do computador e, com mais de uma saída (os alto-falantes, um fone, a tela pela HDMI), a escolha dela; o microfone fica em Painel de controle › Sons › Áudio. <b>Bateria</b>: a carga, o brilho da tela, o modo de energia (economia, equilibrado ou desempenho, no Linux) e a bateria do mouse e do teclado sem fio, com o aviso de bateria fraca. <b>Bluetooth</b>: os aparelhos sem fio (no Linux). <b>Sino</b>: as notificações e o <b>Não perturbe</b>.</p>
<p>Um clique no <b>relógio</b> abre o calendário; o botão direito nele › <b>Mostrar a data</b> põe a data embaixo da hora. Em <b>Configurações › Barra de tarefas e menu Iniciar</b> › <b>Ícones da bandeja</b>, você escolhe quais ícones ficam à vista.</p>
<h2>Com dois monitores</h2>
<p>Com <b>Usar as duas telas na tela cheia</b> (Painel de controle › Aparência › Configurações, no Windows e no Mac), a área de trabalho cobre os dois monitores, e cada tela tem a sua barra de tarefas: a da tela principal mostra todas as janelas, os fixados, a busca e a bandeja; a da outra tem o Iniciar, os botões das janelas que estão nela e o relógio. Para ter a barra só na principal, desmarque <b>Mostrar a barra de tarefas em todas as telas</b> em <b>Configurações › Barra de tarefas e menu Iniciar</b> (ou no botão direito na barra).</p>`],
    en: ['The taskbar', `
<h2>On the left</h2>
<p>The <b>Start</b> button, the search box (it finds programs, Control Panel options and files on drive C:; with Enter, it searches the internet) and the pinned programs. To pin a program, right-click its window button or an icon › <b>Pin to the taskbar</b>. To change the order, drag the buttons (the pinned ones and the window buttons) where you want them: the order of the pinned ones is saved.</p>
<p>A calculation in the search box (<b>12*3.5</b>, <b>200 × 15%</b>, <b>√2</b>) shows the result first; Enter copies it.</p>
<p>The window buttons show the name. To see only the icons, grouped by program, right-click the taskbar › <b>Taskbar buttons</b>. The mouse wheel on a button opens another window of the program.</p>
<h2>The Start menu your way</h2>
<p>Right-click any program in Start › <b>Pin to Start</b> to put it at the top of the menu. In <b>Settings › Taskbar and Start Menu</b> (or right-click Start › <b>Properties</b>), you change the order of the pinned programs, choose the items you see (the Store, Documents, Find…), turn on <b>small icons</b> and clear or turn off the list of recent documents. Right-clicking an item of the menu › <b>Don't Show in the Start Menu</b> also hides it.</p>
<h2>The tray, on the right</h2>
<p><b>Network</b>: the Wi-Fi networks, connecting and disconnecting (on Linux). <b>Volume</b>: the computer's sound and, with more than one output (the speakers, headphones, the screen through HDMI), the choice of it; the microphone is in Control Panel › Sounds › Audio. <b>Battery</b>: the charge, the screen brightness, the power mode (power saver, balanced or performance, on Linux) and the battery of a wireless mouse or keyboard, with the low battery notice. <b>Bluetooth</b>: the wireless devices (on Linux). <b>Bell</b>: the notifications and <b>Do not disturb</b>.</p>
<p>A click on the <b>clock</b> opens the calendar; right-click it › <b>Show the date</b> to put the date under the time. In <b>Settings › Taskbar and Start Menu</b> › <b>Tray icons</b>, you choose which icons stay in view.</p>
<h2>With two monitors</h2>
<p>With <b>Use both screens in full screen</b> (Control Panel › Appearance › Settings, on Windows and Mac), the desktop covers both monitors, and each screen has its own taskbar: the one on the main screen shows every window, the pinned programs, the search and the tray; the one on the other has Start, the buttons of the windows on it and the clock. To have the taskbar only on the main screen, uncheck <b>Show the taskbar on all screens</b> in <b>Settings › Taskbar and Start Menu</b> (or right-click the taskbar).</p>`],
    es: ['La barra de tareas', `
<h2>A la izquierda</h2>
<p>El botón <b>Inicio</b>, el cuadro de búsqueda (encuentra programas, opciones del Panel de control y archivos del disco C:; con Enter, busca en internet) y los programas anclados. Para anclar un programa, usa el clic derecho en el botón de su ventana o en un icono › <b>Anclar a la barra de tareas</b>. Para cambiar el orden, arrastra los botones (los anclados y los de las ventanas) adonde quieras: el orden de los anclados se guarda.</p>
<p>Una cuenta en el cuadro de búsqueda (<b>12*3,5</b>, <b>200 × 15%</b>, <b>√2</b>) muestra el resultado primero; Enter lo copia.</p>
<p>Los botones de las ventanas muestran el nombre. Para ver solo los íconos, agrupados por programa, usa el clic derecho en la barra › <b>Botones de las ventanas</b>. La rueda del mouse en un botón abre otra ventana del programa.</p>
<h2>El menú Inicio a tu manera</h2>
<p>El clic derecho en cualquier programa de Inicio › <b>Anclar a Inicio</b> pone el programa arriba del menú. En <b>Configuración › Barra de tareas y menú Inicio</b> (o con el clic derecho en Inicio › <b>Propiedades</b>), cambias el orden de los anclados, eliges los elementos a la vista (la Tienda, los Documentos, Buscar…), activas los <b>íconos pequeños</b> y vacías o desactivas la lista de los documentos recientes. El clic derecho en un elemento del menú › <b>No mostrar en el menú Inicio</b> también lo oculta.</p>
<h2>La bandeja, a la derecha</h2>
<p><b>Red</b>: las redes Wi-Fi, conectar y desconectar (en Linux). <b>Volumen</b>: el sonido de la computadora y, con más de una salida (los altavoces, unos auriculares, la pantalla por HDMI), la elección de ella; el micrófono está en Panel de control › Sonidos › Audio. <b>Batería</b>: la carga, el brillo de la pantalla, el modo de energía (ahorro, equilibrado o rendimiento, en Linux) y la batería del mouse y del teclado inalámbricos, con el aviso de batería baja. <b>Bluetooth</b>: los dispositivos inalámbricos (en Linux). <b>Campana</b>: las notificaciones y el <b>No molestar</b>.</p>
<p>Un clic en el <b>reloj</b> abre el calendario; el clic derecho en él › <b>Mostrar la fecha</b> pone la fecha debajo de la hora. En <b>Configuración › Barra de tareas y menú Inicio</b> › <b>Iconos de la bandeja</b>, eliges qué iconos quedan a la vista.</p>
<h2>Con dos monitores</h2>
<p>Con <b>Usar las dos pantallas en pantalla completa</b> (Panel de control › Apariencia › Configuración, en Windows y en Mac), el escritorio cubre los dos monitores, y cada pantalla tiene su barra de tareas: la de la pantalla principal muestra todas las ventanas, los anclados, la búsqueda y la bandeja; la de la otra tiene Inicio, los botones de las ventanas que están en ella y el reloj. Para tener la barra solo en la principal, desmarca <b>Mostrar la barra de tareas en todas las pantallas</b> en <b>Configuración › Barra de tareas y menú Inicio</b> (o con el clic derecho en la barra).</p>`],
  },
  {
    id: 'areas', icone: 'barra-tarefas',
    'pt-BR': ['Áreas de trabalho e emojis', `
<h2>Várias áreas de trabalho</h2>
<p>Como no Windows de hoje, as janelas podem ficar em áreas de trabalho separadas: uma para um trabalho, outra para o e-mail, por exemplo. <b>Logotipo+Ctrl+D</b> cria uma área nova (ou o botão direito na barra de tarefas › <b>Nova área de trabalho</b>), <b>Logotipo+Ctrl+← e →</b> trocam de área, e <b>Logotipo+Ctrl+F4</b> fecha a de agora: as janelas dela vão para a área do lado. A barra de tarefas e o Alt+Tab mostram só as janelas da área à vista; com mais de uma área, os botões <b>1</b>, <b>2</b>… ficam ao lado da bandeja (no tema Mac, ao lado do relógio).</p>
<p>Para levar uma janela para outra área, use o botão direito no botão dela na barra › <b>Mover para</b>. Ao ligar de novo, as áreas e as janelas de cada uma voltam.</p>
<h2>A Visão das tarefas</h2>
<p><b>Logotipo+Tab</b> (ou o botão direito na barra › <b>Visão das tarefas</b>) mostra uma coluna por área, com as janelas dela. Um clique numa janela vai até ela; arrastar uma janela para outra coluna a leva para aquela área.</p>
<h2>O painel de emojis</h2>
<p><b>Logotipo+.</b> (ou <b>Logotipo+;</b>, ou Iniciar › Programas › Acessórios › <b>Emojis</b>) abre o painel. Procure pelo nome, em português, inglês ou espanhol, sem precisar dos acentos (<b>coracao</b>, <b>gato</b>), ou escolha uma categoria; um clique põe o emoji no texto que você está escrevendo, no Bloco de notas, num programa, no Prompt ou no Navegador. Sem campo nenhum, ele vai para a área de transferência. Os usados há pouco ficam na primeira aba, e a barra de título arrasta o painel. Os desenhos são os da fonte Noto Color Emoji, que vai junto com o Retro Computer: o emoji do painel é o mesmo que aparece no texto, no Windows, no Mac e no Linux.</p>`],
    en: ['Desktops and emoji', `
<h2>Several desktops</h2>
<p>As in today's Windows, windows can stay on separate desktops: one for a piece of work, another for e-mail, for example. <b>Logo+Ctrl+D</b> creates a new desktop (or right-click the taskbar › <b>New desktop</b>), <b>Logo+Ctrl+← and →</b> switch desktops, and <b>Logo+Ctrl+F4</b> closes the current one: its windows go to the desktop beside it. The taskbar and Alt+Tab show only the windows of the desktop in view; with more than one desktop, the <b>1</b>, <b>2</b>… buttons stay next to the tray (in the Mac theme, next to the clock).</p>
<p>To take a window to another desktop, right-click its button on the taskbar › <b>Move to</b>. When you turn it on again, the desktops and the windows of each one come back.</p>
<h2>Task View</h2>
<p><b>Logo+Tab</b> (or right-click the taskbar › <b>Task View</b>) shows one column per desktop, with its windows. A click on a window goes to it; dragging a window to another column takes it to that desktop.</p>
<h2>The emoji panel</h2>
<p><b>Logo+.</b> (or <b>Logo+;</b>, or Start › Programs › Accessories › <b>Emoji</b>) opens the panel. Search by name, in English, Portuguese or Spanish, without needing the accents (<b>heart</b>, <b>cat</b>), or choose a category; a click puts the emoji in the text you are writing, in Notepad, in a program, in the Command Prompt or in the Browser. With no field at all, it goes to the clipboard. The recently used ones stay on the first tab, and the title bar drags the panel. The drawings are those of the Noto Color Emoji font, which comes with Retro Computer: the emoji in the panel is the same one that appears in the text, on Windows, Mac and Linux.</p>`],
    es: ['Escritorios y emojis', `
<h2>Varios escritorios</h2>
<p>Como en el Windows de hoy, las ventanas pueden quedar en escritorios separados: uno para un trabajo, otro para el correo, por ejemplo. <b>Logotipo+Ctrl+D</b> crea un escritorio nuevo (o el clic derecho en la barra de tareas › <b>Nuevo escritorio</b>), <b>Logotipo+Ctrl+← y →</b> cambian de escritorio, y <b>Logotipo+Ctrl+F4</b> cierra el actual: sus ventanas pasan al escritorio de al lado. La barra de tareas y el Alt+Tab muestran solo las ventanas del escritorio a la vista; con más de un escritorio, los botones <b>1</b>, <b>2</b>… quedan junto a la bandeja (en el tema Mac, junto al reloj).</p>
<p>Para llevar una ventana a otro escritorio, usa el clic derecho en su botón en la barra › <b>Mover a</b>. Al encender de nuevo, los escritorios y las ventanas de cada uno vuelven.</p>
<h2>La Vista de tareas</h2>
<p><b>Logotipo+Tab</b> (o el clic derecho en la barra › <b>Vista de tareas</b>) muestra una columna por escritorio, con sus ventanas. Un clic en una ventana va hasta ella; arrastrar una ventana a otra columna la lleva a ese escritorio.</p>
<h2>El panel de emojis</h2>
<p><b>Logotipo+.</b> (o <b>Logotipo+;</b>, o Inicio › Programas › Accesorios › <b>Emojis</b>) abre el panel. Busca por el nombre, en español, portugués o inglés, sin necesitar los acentos (<b>corazon</b>, <b>gato</b>), o elige una categoría; un clic pone el emoji en el texto que estás escribiendo, en el Bloc de notas, en un programa, en la Línea de comandos o en el Navegador. Sin ningún campo, va al portapapeles. Los usados recientemente quedan en la primera pestaña, y la barra de título arrastra el panel. Los dibujos son los de la fuente Noto Color Emoji, que viene con Retro Computer: el emoji del panel es el mismo que aparece en el texto, en Windows, Mac y Linux.</p>`],
  },
  {
    id: 'tema', icone: 'aparencia',
    'pt-BR': ['Temas e esquemas de cores', `
<h2>Os esquemas de cores</h2>
<p>Em Painel de controle › Aparência › <b>Tema</b> › <b>Esquema de cores</b>, como no Windows da época, você escolhe as cores das janelas, dos botões, dos títulos e da seleção, com a prévia ao lado: o de sempre (<b>Retro Computer</b>), sete claros (Areia, Ardósia, Berinjela, Musgo, Oceano, Tijolo e Rosa antigo) e quatro escuros (Noite, Meia-noite, Fósforo verde e Âmbar), que deixam as janelas, os campos e as listas escuros, com o texto claro. Os documentos na visualização continuam em papel branco. Os esquemas valem para o PC clássico; o Mac clássico tem as cores próprias.</p>
<h2>O modo escuro à noite</h2>
<p>Logo abaixo, marque <b>Trocar à noite para</b> e escolha o esquema da noite (um dos escuros, como o Noite): de dia fica o esquema escolhido acima, e à noite, o outro, com o fundo de sempre de cada um. A noite vai <b>do pôr ao nascer do sol</b>, pela cidade de referência do fuso horário do computador (em São Paulo, para o fuso America/Sao_Paulo), sem perguntar onde você está; ao lado aparecem as horas de hoje. Se preferir, escolha <b>Das</b> … <b>às</b> … para horas fixas. A luz noturna (Painel de controle › Aparência › Efeitos) também pode ir do pôr ao nascer do sol.</p>
<h2>O tema Mac clássico</h2>
<p>Em Painel de controle › Aparência › <b>Tema</b>, escolha <b>Mac clássico</b> e clique em OK; para voltar, escolha <b>PC clássico</b>. O tema é inspirado no Mac OS 9: o cinza-claro, o título listrado e a barra de menus no alto. O fundo de sempre de um tema vira o do outro (um fundo escolhido por você fica como está), e cada usuário tem o seu tema.</p>
<h2>A barra de menus, no alto</h2>
<p>À esquerda, o <b>logotipo</b> abre o menu Iniciar (os programas, os documentos, as configurações, o Localizar e o Desligar); a tecla do logotipo faz o mesmo. Depois vêm os <b>menus da janela da frente</b> (Arquivo, Editar, Exibir…). Com a área de trabalho na frente (um clique na mesa), aparecem os dela, com o <b>Especial</b> › <b>Esvaziar a Lixeira</b>. À direita, como no Mac da época, ficam só o relógio (que abre o calendário) e o <b>menu dos programas abertos</b>, que mostra o da frente, troca de um para outro, oculta (minimiza) e mostra de novo.</p>
<h2>As janelas</h2>
<p>A caixa da esquerda do título fecha a janela; as da direita aumentam a janela e a <b>recolhem</b>, deixando só a barra de título à vista. O duplo clique no título também recolhe e abre de novo.</p>
<h2>A Faixa de controle</h2>
<p>No canto de baixo, à esquerda, ficam os programas fixados na barra de tarefas (Painel de controle › Barra de tarefas e menu Iniciar), a <b>lupa da busca</b> (um clique abre o campo) e os ícones da bandeja: a rede, o volume, a bateria e as notificações. Como no Mac da época, ela começa recolhida, só com a ponta à vista: um clique na ponta a abre, e outro a recolhe. Em Painel de controle › Barra de tarefas e menu Iniciar, você a deixa aberta e escolhe os ícones dela.</p>
<h2>A área de trabalho</h2>
<p>Os ícones começam do canto de cima, à direita, e a Lixeira fica no canto de baixo; as posições de cada tema ficam guardadas à parte. Os ícones do tema são desenhos próprios do Retro Computer, no estilo da época.</p>`],
    en: ['Themes and color schemes', `
<h2>Color schemes</h2>
<p>In Control Panel › Appearance › <b>Theme</b> › <b>Color scheme</b>, as in the Windows of the time, you choose the colors of the windows, the buttons, the titles and the selection, with a preview beside it: the usual one (<b>Retro Computer</b>), seven light ones (Sand, Slate, Eggplant, Moss, Ocean, Brick and Old rose) and four dark ones (Night, Midnight, Green phosphor and Amber), which make the windows, the fields and the lists dark, with light text. Documents in the preview stay on white paper. The schemes apply to the Classic PC; the Classic Mac has its own colors.</p>
<h2>Dark mode at night</h2>
<p>Just below, check <b>Switch at night to</b> and choose the night scheme (one of the dark ones, such as Night): during the day the scheme chosen above stays, and at night the other one, each with its usual background. The night goes <b>from sunset to sunrise</b>, going by the reference city of the computer's time zone (São Paulo, for the America/Sao_Paulo time zone), without asking where you are; today's times appear beside it. If you prefer, choose <b>From</b> … <b>to</b> … for fixed hours. The night light (Control Panel › Appearance › Effects) can also go from sunset to sunrise.</p>
<h2>The Classic Mac theme</h2>
<p>In Control Panel › Appearance › <b>Theme</b>, choose <b>Classic Mac</b> and click OK; to go back, choose <b>Classic PC</b>. The theme is inspired by Mac OS 9: the light gray, the striped title and the menu bar at the top. One theme's usual background becomes the other's (a background you chose stays as it is), and each user has their own theme.</p>
<h2>The menu bar, at the top</h2>
<p>On the left, the <b>logo</b> opens the Start menu (the programs, the documents, the settings, Find and Shut Down); the logo key does the same. Then come the <b>menus of the front window</b> (File, Edit, View…). With the desktop in front (a click on it), its own menus appear, with <b>Special</b> › <b>Empty Trash</b>. On the right, as on the Mac of the time, there are only the clock (which opens the calendar) and the <b>menu of the open programs</b>, which shows the front one, switches from one to another, hides (minimizes) and shows again.</p>
<h2>The windows</h2>
<p>The box on the left of the title closes the window; the ones on the right enlarge the window and <b>collapse</b> it, leaving only the title bar in view. A double-click on the title also collapses it and opens it again.</p>
<h2>The Control Strip</h2>
<p>In the bottom left corner are the programs pinned to the taskbar (Control Panel › Taskbar and Start Menu), the <b>search magnifier</b> (a click opens the box) and the tray icons: the network, the volume, the battery and the notifications. As on the Mac of the time, it starts collapsed, with only its end in view: a click on the end opens it, and another collapses it. In Control Panel › Taskbar and Start Menu, you keep it open and choose its icons.</p>
<h2>The desktop</h2>
<p>The icons start from the top right corner, and the Trash stays in the bottom corner; each theme's positions are kept separately. The theme's icons are Retro Computer's own drawings, in the style of the time.</p>`],
    es: ['Temas y colores', `
<h2>Las combinaciones de colores</h2>
<p>En Panel de control › Apariencia › <b>Tema</b> › <b>Combinación de colores</b>, como en el Windows de la época, eliges los colores de las ventanas, los botones, los títulos y la selección, con la vista previa al lado: la de siempre (<b>Retro Computer</b>), siete claras (Arena, Pizarra, Berenjena, Musgo, Océano, Ladrillo y Rosa antiguo) y cuatro oscuras (Noche, Medianoche, Fósforo verde y Ámbar), que dejan oscuras las ventanas, los campos y las listas, con el texto claro. Los documentos en la vista previa siguen en papel blanco. Las combinaciones valen para el PC clásico; el Mac clásico tiene sus propios colores.</p>
<h2>El modo oscuro de noche</h2>
<p>Justo debajo, marca <b>Cambiar de noche a</b> y elige la combinación de la noche (una de las oscuras, como Noche): de día queda la elegida arriba, y de noche, la otra, cada una con su fondo de siempre. La noche va <b>desde la puesta hasta la salida del sol</b>, según la ciudad de referencia de la zona horaria de la computadora (São Paulo, para la zona America/Sao_Paulo), sin preguntar dónde estás; al lado aparecen las horas de hoy. Si prefieres, elige <b>De</b> … <b>a</b> … para horas fijas. La luz nocturna (Panel de control › Apariencia › Efectos) también puede ir desde la puesta hasta la salida del sol.</p>
<h2>El tema Mac clásico</h2>
<p>En Panel de control › Apariencia › <b>Tema</b>, elige <b>Mac clásico</b> y haz clic en Aceptar; para volver, elige <b>PC clásico</b>. El tema está inspirado en Mac OS 9: el gris claro, el título con rayas y la barra de menús arriba. El fondo de siempre de un tema pasa a ser el del otro (un fondo que elegiste queda como está), y cada usuario tiene su tema.</p>
<h2>La barra de menús, arriba</h2>
<p>A la izquierda, el <b>logotipo</b> abre el menú Inicio (los programas, los documentos, la configuración, Buscar y Apagar); la tecla del logotipo hace lo mismo. Después vienen los <b>menús de la ventana del frente</b> (Archivo, Edición, Ver…). Con el escritorio al frente (un clic en él), aparecen los suyos, con <b>Especial</b> › <b>Vaciar la Papelera</b>. A la derecha, como en la Mac de la época, solo están el reloj (que abre el calendario) y el <b>menú de los programas abiertos</b>, que muestra el del frente, cambia de uno a otro, oculta (minimiza) y muestra de nuevo.</p>
<h2>Las ventanas</h2>
<p>La casilla de la izquierda del título cierra la ventana; las de la derecha agrandan la ventana y la <b>contraen</b>, dejando solo la barra de título a la vista. El doble clic en el título también la contrae y la abre de nuevo.</p>
<h2>La Tira de control</h2>
<p>En la esquina de abajo a la izquierda están los programas anclados a la barra de tareas (Panel de control › Barra de tareas y menú Inicio), la <b>lupa de la búsqueda</b> (un clic abre el campo) y los iconos de la bandeja: la red, el volumen, la batería y las notificaciones. Como en la Mac de la época, empieza contraída, solo con el extremo a la vista: un clic en el extremo la abre, y otro la contrae. En Panel de control › Barra de tareas y menú Inicio, la dejas abierta y eliges sus iconos.</p>
<h2>El escritorio</h2>
<p>Los iconos empiezan desde la esquina de arriba a la derecha, y la Papelera queda en la esquina de abajo; las posiciones de cada tema se guardan por separado. Los iconos del tema son dibujos propios de Retro Computer, al estilo de la época.</p>`],
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
<p>Para escolher o programa de um tipo de arquivo: botão direito no arquivo › <b>Abrir com › Escolher o programa…</b>, com a caixa <b>Sempre usar este programa</b> marcada (também o programa do computador principal). Os escolhidos ficam em <b>Painel de controle › Programas padrão</b>, que os muda ou os volta ao normal.</p>
<h2>Programas do computador</h2>
<p><b>Iniciar › Programas › Programas do computador</b> lista os programas instalados no computador principal; cada um pode ganhar um atalho na área de trabalho e no menu Iniciar.</p>
<h2>A loja do computador</h2>
<p>Adicionar ou remover programas tem uma segunda aba com os programas do próprio computador, só de fontes oficiais: pesquise, veja a ficha de cada um, instale, atualize e remova. Eles aparecem com os Programas do computador.</p>
<ul><li>No Linux, <b>Programas do Linux</b>: os do Flathub, instalados sem senha.</li>
<li>No Windows, <b>Programas do Windows</b>: os do winget, o repositório oficial de programas do Windows. Alguns pedem a confirmação do Windows para instalar.</li>
<li>No Mac, <b>Programas do Mac</b>: os do Homebrew (brew.sh), que vão para a pasta Aplicativos. Sem o Homebrew, a aba o instala pelo Prompt de comando; os programas que pedem a senha do Mac terminam a instalação por lá.</li></ul>
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
<p>To choose the program for a file type: right-click the file › <b>Open with › Choose program…</b>, with <b>Always use this program</b> checked (the main computer's program is an option too). The choices are listed in <b>Control Panel › Default programs</b>, which changes them or restores the default.</p>
<h2>Computer programs</h2>
<p><b>Start › Programs › Computer programs</b> lists the programs installed on the main computer; each one can get a shortcut on the desktop and in the Start menu.</p>
<h2>The computer's store</h2>
<p>Add or Remove Programs has a second tab with programs for the computer itself, from official sources only: search, see each one's details, install, update and remove. They show up with the Computer programs.</p>
<ul><li>On Linux, <b>Linux programs</b>: the ones from Flathub, installed without a password.</li>
<li>On Windows, <b>Windows Programs</b>: the ones from winget, the official Windows program repository. Some ask for Windows confirmation to install.</li>
<li>On the Mac, <b>Mac programs</b>: the ones from Homebrew (brew.sh), which go to the Applications folder. Without Homebrew, the tab installs it through the Command Prompt; programs that ask for the Mac password finish installing there.</li></ul>
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
<p>Para elegir el programa de un tipo de archivo: clic derecho en el archivo › <b>Abrir con › Elegir el programa…</b>, con <b>Usar siempre este programa</b> marcado (también el programa de la computadora principal). Los elegidos quedan en <b>Panel de control › Programas predeterminados</b>, que los cambia o los restablece.</p>
<h2>Programas de la computadora</h2>
<p><b>Inicio › Programas › Programas de la computadora</b> muestra los programas instalados en la computadora principal; cada uno puede tener un acceso directo en el escritorio y en el menú Inicio.</p>
<h2>La tienda de la computadora</h2>
<p>Agregar o quitar programas tiene una segunda pestaña con los programas de la propia computadora, solo de fuentes oficiales: busca, mira la ficha de cada uno, instala, actualiza y quita. Aparecen junto a los Programas de la computadora.</p>
<ul><li>En Linux, <b>Programas de Linux</b>: los de Flathub, instalados sin contraseña.</li>
<li>En Windows, <b>Programas de Windows</b>: los de winget, el repositorio oficial de programas de Windows. Algunos piden la confirmación de Windows para instalarse.</li>
<li>En el Mac, <b>Programas de Mac</b>: los de Homebrew (brew.sh), que van a la carpeta Aplicaciones. Sin Homebrew, la pestaña lo instala por la Línea de comandos; los programas que piden la contraseña del Mac terminan de instalarse ahí.</li></ul>
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
<p>Abre os sites em janelas do Retro Computer, com favoritos, pesquisa, zoom, Localizar e Imprimir. Os downloads vão para <b>Meus documentos › Recebidos</b>.</p>
<p><b>As abas</b>: o <b>+</b> (ou Ctrl+T) abre uma aba nova; o clique com a roda num link (ou o botão direito › <b>Abrir o link em nova aba</b>) a abre por trás. Ctrl+Tab passa de uma para outra, Ctrl+W fecha a aba e Ctrl+Shift+T reabre a última fechada. <b>Os favoritos</b>: a estrela do endereço (ou Ctrl+D) guarda a página na <b>barra de favoritos</b>, logo abaixo do endereço (Exibir › Barra de favoritos, Ctrl+Shift+B, a mostra ou esconde); o que não cabe fica no <b>»</b>. Para mudar a ordem, arraste os favoritos na barra. O fundo da página inicial (a das abas novas) muda em Painel de controle › Internet › <b>Página inicial</b>: a cor e o padrão, como os da área de trabalho. A barra de status, embaixo, vem escondida (Exibir › Barra de status); sem ela, o endereço do link sob o mouse aparece no canto da página.</p>
<p><b>O vídeo em janela flutuante</b>: o botão direito no vídeo › <b>Assistir em janela flutuante</b>, ou Exibir › <b>Vídeo em janela flutuante</b> (Ctrl+Shift+P), põe o vídeo numa janelinha que fica por cima de tudo, também com o Navegador minimizado. A mesma opção o devolve à página. A câmera, o microfone, a localização e as notificações de cada site pedem a sua permissão; para esquecer as respostas, use Painel de controle › Internet.</p>
<p>Os endereços <b>http://</b> abrem na versão segura (https://). O site que não a tiver mostra um aviso, com a escolha de abri-lo assim mesmo; os aparelhos da rede de casa (o roteador, a impressora) ficam de fora. Para desligar: Painel de controle › Segurança › Privacidade.</p>
<p><b>O login do Google</b>: o Google recusa alguns navegadores embutidos em aplicativos. Se ele recusar, o Navegador tenta de novo sozinho, de outro jeito; se recusar outra vez, use o Firefox como navegador padrão (Painel de controle › Internet).</p>
<h2>Vídeos e músicas</h2>
<p>Os sites de vídeo e de música comuns, como o YouTube, funcionam nos dois. Os serviços com proteção contra cópia (Netflix, Prime Video, Disney+ e o Spotify na web) tocam só no Firefox. Quando um site pede o vídeo protegido no Navegador do Retro Computer, a faixa amarela no alto da página oferece abri-lo no Firefox (ou, sem ele, no navegador do computador); <b>Não avisar neste site</b> a desliga para aquele site.</p>
<h2>O e-mail</h2>
<p>O <b>E-mail</b> abre o seu e-mail da web (escolhido na primeira vez) numa janela própria. Para trocar, use Painel de controle › Internet.</p>
<h2>Sites como programas</h2>
<p>No Navegador do Retro Computer (Iniciar › Programas, quando o Firefox é o padrão), <b>Arquivo › Instalar como programa</b> transforma o site aberto num programa: ele ganha ícone, janela própria (sem a barra de endereço) e lugar no menu Iniciar, na área de trabalho e, se você quiser, na barra de tarefas. Para desinstalar, use o menu <b>Página</b> da janela dele ou Painel de controle › Internet › <b>Programas da internet</b>.</p>`],
    en: ['Browser and e-mail', `
<h2>Firefox, the default browser</h2>
<p>With Firefox installed on the computer, the <b>Browser</b> icon and the programs' links open in it, with Retro Computer's look (the gray, the straight tabs, the period font) and a profile of its own: downloads go to <b>Documents › Received</b>, and the choices in Control Panel › Security also apply to it. It plays protected videos (Netflix, Prime Video, Disney+, Spotify on the web). To choose another one, use Control Panel › Internet; on Linux without Firefox, the same place installs it.</p>
<h2>Retro Computer's Browser</h2>
<p>It opens websites in Retro Computer windows, with favorites, search, zoom, Find and Print. Downloads go to <b>Documents › Received</b>.</p>
<p><b>Tabs</b>: the <b>+</b> (or Ctrl+T) opens a new tab; clicking a link with the wheel (or right-click › <b>Open link in new tab</b>) opens it behind. Ctrl+Tab moves between them, Ctrl+W closes the tab and Ctrl+Shift+T reopens the last one closed. <b>Favorites</b>: the star in the address (or Ctrl+D) keeps the page on the <b>favorites bar</b>, right below the address (View › Favorites bar, Ctrl+Shift+B, shows or hides it); what does not fit goes to <b>»</b>. To change the order, drag the favorites on the bar. The background of the home page (the one new tabs show) changes in Control Panel › Internet › <b>Home page</b>: the color and the pattern, like the desktop ones. The status bar at the bottom starts hidden (View › Status bar); without it, the address of the link under the mouse appears in the corner of the page.</p>
<p><b>Picture in picture</b>: right-click the video › <b>Watch in Picture in Picture</b>, or View › <b>Picture in Picture</b> (Ctrl+Shift+P), puts the video in a small window that stays on top of everything, also with the Browser minimized. The same option brings it back to the page. Each site's access to the camera, the microphone, the location and notifications asks for your permission; to forget the answers, use Control Panel › Internet.</p>
<p><b>http://</b> addresses open in the secure version (https://). A site without one shows a warning, with the choice to open it anyway; the devices on the home network (the router, the printer) are left out. To turn this off: Control Panel › Security › Privacy.</p>
<p><b>Google sign-in</b>: Google refuses some browsers built into apps. If it refuses, the Browser tries again on its own, another way; if it refuses again, use Firefox as the default browser (Control Panel › Internet).</p>
<h2>Videos and music</h2>
<p>The usual video and music sites, such as YouTube, work in both. Services with copy protection (Netflix, Prime Video, Disney+ and Spotify on the web) play only in Firefox. When a site asks for protected video in the Retro Computer Browser, the yellow bar at the top of the page offers to open it in Firefox (or, without it, in the computer's browser); <b>Don't warn on this site</b> turns it off for that site.</p>
<h2>E-mail</h2>
<p><b>E-mail</b> opens your web e-mail (chosen the first time) in a window of its own. To change it, use Control Panel › Internet.</p>
<h2>Sites as programs</h2>
<p>In Retro Computer's Browser (Start › Programs, when Firefox is the default), <b>File › Install as Program</b> turns the open site into a program: it gets an icon, its own window (without the address bar) and a place in the Start menu, on the desktop and, if you want, on the taskbar. To uninstall it, use the <b>Page</b> menu of its window or Control Panel › Internet › <b>Internet programs</b>.</p>`],
    es: ['Navegador y correo', `
<h2>Firefox, el navegador predeterminado</h2>
<p>Con Firefox instalado en la computadora, el icono <b>Navegador</b> y los enlaces de los programas se abren en él, con el aspecto de Retro Computer (el gris, las pestañas rectas, la fuente de la época) y un perfil propio: las descargas van a <b>Mis documentos › Recibidos</b>, y las opciones de Panel de control › Seguridad también valen para él. Reproduce los videos protegidos (Netflix, Prime Video, Disney+, Spotify en la web). Para elegir otro, usa Panel de control › Internet; en Linux sin Firefox, el mismo lugar lo instala.</p>
<h2>El Navegador de Retro Computer</h2>
<p>Abre los sitios en ventanas de Retro Computer, con favoritos, búsqueda, zoom, Buscar e Imprimir. Las descargas van a <b>Mis documentos › Recibidos</b>.</p>
<p><b>Las pestañas</b>: el <b>+</b> (o Ctrl+T) abre una pestaña nueva; el clic con la rueda en un enlace (o el clic derecho › <b>Abrir el enlace en una nueva pestaña</b>) la abre detrás. Ctrl+Tab pasa de una a otra, Ctrl+W cierra la pestaña y Ctrl+Shift+T reabre la última cerrada. <b>Los favoritos</b>: la estrella de la dirección (o Ctrl+D) guarda la página en la <b>barra de favoritos</b>, justo debajo de la dirección (Ver › Barra de favoritos, Ctrl+Shift+B, la muestra u oculta); lo que no cabe queda en el <b>»</b>. Para cambiar el orden, arrastra los favoritos en la barra. El fondo de la página de inicio (la de las pestañas nuevas) cambia en Panel de control › Internet › <b>Página de inicio</b>: el color y el patrón, como los del escritorio. La barra de estado, abajo, viene oculta (Ver › Barra de estado); sin ella, la dirección del enlace bajo el ratón aparece en la esquina de la página.</p>
<p><b>El vídeo en ventana flotante</b>: el clic derecho en el vídeo › <b>Ver en ventana flotante</b>, o Ver › <b>Vídeo en ventana flotante</b> (Ctrl+Shift+P), pone el vídeo en una ventanita que queda encima de todo, también con el Navegador minimizado. La misma opción lo devuelve a la página. La cámara, el micrófono, la ubicación y las notificaciones de cada sitio piden tu permiso; para olvidar las respuestas, usa Panel de control › Internet.</p>
<p>Las direcciones <b>http://</b> se abren en la versión segura (https://). El sitio que no la tenga muestra un aviso, con la opción de abrirlo de todos modos; los aparatos de la red de casa (el router, la impresora) quedan fuera. Para desactivarlo: Panel de control › Seguridad › Privacidad.</p>
<p><b>El inicio de sesión de Google</b>: Google rechaza algunos navegadores integrados en aplicaciones. Si lo rechaza, el Navegador lo intenta de nuevo solo, de otra forma; si lo rechaza otra vez, usa Firefox como navegador predeterminado (Panel de control › Internet).</p>
<h2>Videos y música</h2>
<p>Los sitios de video y de música comunes, como YouTube, funcionan en los dos. Los servicios con protección contra copia (Netflix, Prime Video, Disney+ y Spotify en la web) se reproducen solo en Firefox. Cuando un sitio pide video protegido en el Navegador de Retro Computer, la barra amarilla en la parte de arriba de la página ofrece abrirlo en Firefox (o, sin él, en el navegador de la computadora); <b>No avisar en este sitio</b> la desactiva para ese sitio.</p>
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
<p>O <b>DOS</b> (em Acessórios) é o DOSBox, um emulador do computador da época, sem internet. A unidade C: dele é a pasta <b>C:\\DOS</b> do disco: ponha lá os seus programas e jogos do DOS e digite o nome para abri-los. Dois cliques num programa do DOS (.com, .bat ou um .exe do DOS) também o abrem. O que mudar volta para o disco ao fechar a janela, com a versão anterior guardada e os apagados na Lixeira.</p>
<h2>Mac Plus</h2>
<p>O <b>Mac Plus</b> (em Acessórios) é o PCE.js, um emulador do Macintosh da época, em preto e branco e sem internet, para jogos como o SimAnt. Nada da Apple vem com o Retro Computer: ponha na pasta <b>C:\\Mac</b> a imagem da ROM do seu Mac (um arquivo .rom: 128 KB no Mac Plus, 256 KB no Mac SE ou 512 KB no Mac Classic), o disquete do Sistema (o System 6 ou o 7) e os disquetes dos jogos (.dsk, .img ou .image, do Disk Copy 4.2). O disco com <b>System</b>, <b>Sistema</b> ou <b>Boot</b> no nome vai na primeira unidade, e o Mac parte por ele; dois cliques num disco do Mac o abrem junto. A tecla Alt faz o papel da Command, e a Ctrl, o da Option. O que o Mac gravar volta para o disco ao fechar a janela, com a versão de antes de ligá-lo guardada.</p>
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
<p><b>DOS</b> (in Accessories) is DOSBox, an emulator of the computers of the time, without the internet. Its drive C: is the <b>C:\\DOS</b> folder on the disk: put your DOS programs and games there and type the name to open them. Double-clicking a DOS program (.com, .bat or a DOS .exe) also opens it. Whatever changes goes back to the disk when you close the window, with the previous version kept and deleted files in the Trash.</p>
<h2>Mac Plus</h2>
<p><b>Mac Plus</b> (in Accessories) is PCE.js, an emulator of the Macintosh of the time, in black and white and without the internet, for games such as SimAnt. Nothing from Apple comes with Retro Computer: put in the <b>C:\\Mac</b> folder the ROM image of your Mac (a .rom file: 128 KB for the Mac Plus, 256 KB for the Mac SE or 512 KB for the Mac Classic), the System floppy (System 6 or 7) and the floppies of your games (.dsk, .img or .image, from Disk Copy 4.2). The disk with <b>System</b> or <b>Boot</b> in its name goes into the first drive, and the Mac starts from it; double-clicking a Mac disk opens it as well. The Alt key works as Command, and Ctrl as Option. What the Mac writes goes back to the disk when you close the window, with the version from before it was started kept.</p>
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
<p>El <b>DOS</b> (en Accesorios) es el DOSBox, un emulador de la computadora de la época, sin internet. Su unidad C: es la carpeta <b>C:\\DOS</b> del disco: pon allí tus programas y juegos del DOS y escribe el nombre para abrirlos. Un doble clic en un programa del DOS (.com, .bat o un .exe del DOS) también lo abre. Lo que cambie vuelve al disco al cerrar la ventana, con la versión anterior guardada y los borrados en la Papelera.</p>
<h2>Mac Plus</h2>
<p>El <b>Mac Plus</b> (en Accesorios) es PCE.js, un emulador del Macintosh de la época, en blanco y negro y sin internet, para juegos como SimAnt. Nada de Apple viene con Retro Computer: pon en la carpeta <b>C:\\Mac</b> la imagen de la ROM de tu Mac (un archivo .rom: 128 KB en el Mac Plus, 256 KB en el Mac SE o 512 KB en el Mac Classic), el disquete del Sistema (el System 6 o el 7) y los disquetes de los juegos (.dsk, .img o .image, de Disk Copy 4.2). El disco con <b>System</b>, <b>Sistema</b> o <b>Boot</b> en el nombre va en la primera unidad, y el Mac arranca desde él; un doble clic en un disco del Mac lo abre también. La tecla Alt hace de Command, y Ctrl, de Option. Lo que el Mac grabe vuelve al disco al cerrar la ventana, con la versión de antes de encenderlo guardada.</p>
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
<p>O Claude abre com o fundo claro e responde no idioma do Retro Computer. A lista da barra da janela troca para o fundo escuro (o Claude acompanha na próxima vez que abrir); a outra lista muda o tamanho da letra.</p>
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
<p>Claude opens with a light background and answers in the Retro Computer language. The list in the window's toolbar switches to the dark background (Claude follows the next time it opens); the other list changes the text size.</p>
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
<p>Claude se abre con el fondo claro y responde en el idioma de Retro Computer. La lista de la barra de la ventana cambia al fondo oscuro (Claude lo sigue la próxima vez que se abra); la otra lista cambia el tamaño de la letra.</p>
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
<p><b>Aparência</b>: a cor e o padrão do fundo, o <b>papel de parede</b> com uma imagem sua (<b>Procurar…</b> escolhe uma do disco C:, e o ajuste a deixa centralizada, lado a lado ou preenchendo a tela; o botão direito numa imagem do Explorador › <b>Usar como papel de parede</b> faz o mesmo), a proteção de tela (Voando pelas estrelas, Linhas coloridas ou Relógio), os efeitos (os cantos magnéticos das janelas e a luz noturna, com menos azul à noite), a tela cheia, o tamanho dos pixels (de 1 a 4, com os tamanhos do meio, como o 1,5; os inteiros deixam as letras mais nítidas), a área da tela (a resolução, no Retro Computer como sistema), as <b>várias telas</b> (com dois monitores: duplicar, estender ou usar uma só, no Retro Computer como sistema; fora dele, em qual monitor o Retro Computer fica, ou <b>as duas telas na tela cheia</b>, com uma barra de tarefas em cada uma) e abrir o Retro Computer ao entrar no computador.</p>
<p><b>Disco C:</b>: a pasta do disco no computador principal, o espaço livre e a troca de pasta.</p>
<p><b>Claude</b>: a instalação do Claude Code e a chave de API.</p>
<p><b>Internet</b>: o e-mail, a pesquisa, em qual navegador os links abrem, as permissões dos sites e os programas da internet.</p>
<p><b>Idioma</b>: português, inglês ou espanhol (o Retro Computer reinicia para trocar). Na aba <b>Ortografia</b>, o corretor dos campos de texto: as palavras erradas ficam sublinhadas em vermelho, e o botão direito nelas mostra as sugestões e o <b>Adicionar ao dicionário</b>. Ele começa no idioma da interface; marque outros para escrever em mais de um. Os dicionários vão junto com o Retro Computer, sem internet (no Mac, o corretor é o do próprio Mac).</p>
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
<p><b>Appearance</b>: the background color and pattern, the <b>wallpaper</b> with an image of your own (<b>Browse…</b> picks one from drive C:, and the fit leaves it centered, tiled or filling the screen; right-clicking an image in the Explorer › <b>Set as desktop background</b> does the same), the screen saver (Flying through the stars, Colored lines or Clock), the effects (the magnetic corners of the windows and the night light, with less blue at night), full screen, the pixel size (from 1 to 4, with the sizes in between, like 1.5; the whole ones keep the letters sharper), the screen area (the resolution, with Retro Computer as the system), <b>multiple screens</b> (with two monitors: duplicate, extend or use only one, with Retro Computer as the system; otherwise, which monitor Retro Computer stays on, or <b>both screens in full screen</b>, with a taskbar on each) and opening Retro Computer when signing in to the computer.</p>
<p><b>Drive C:</b>: the disk folder on the main computer, the free space and changing the folder.</p>
<p><b>Claude</b>: installing Claude Code and the API key.</p>
<p><b>Internet</b>: e-mail, search, where links open, site permissions and the internet programs.</p>
<p><b>Language</b>: Portuguese, English or Spanish (Retro Computer restarts to switch). On the <b>Spelling</b> tab, the spell checker of the text fields: misspelled words are underlined in red, and a right-click on them shows the suggestions and <b>Add to dictionary</b>. It starts in the language of the interface; check others to write in more than one. The dictionaries come with Retro Computer, without the internet (on the Mac, the spell checker is the Mac's own).</p>
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
<p><b>Apariencia</b>: el color y el patrón del fondo, el <b>fondo de escritorio</b> con una imagen tuya (<b>Examinar…</b> elige una del disco C:, y el ajuste la deja centrada, en mosaico o rellenando la pantalla; el clic derecho en una imagen del Explorador › <b>Establecer como fondo de escritorio</b> hace lo mismo), el protector de pantalla (Volando entre estrellas, Líneas de colores o Reloj), los efectos (las esquinas magnéticas de las ventanas y la luz nocturna, con menos azul de noche), la pantalla completa, el tamaño de los píxeles (de 1 a 4, con los tamaños intermedios, como el 1,5; los enteros dejan las letras más nítidas), el área de la pantalla (la resolución, con Retro Computer como sistema), las <b>varias pantallas</b> (con dos monitores: duplicar, extender o usar solo una, con Retro Computer como sistema; si no, en qué monitor queda Retro Computer, o <b>las dos pantallas en pantalla completa</b>, con una barra de tareas en cada una) y abrir Retro Computer al entrar en la computadora.</p>
<p><b>Disco C:</b>: la carpeta del disco en la computadora principal, el espacio libre y el cambio de carpeta.</p>
<p><b>Claude</b>: la instalación de Claude Code y la clave de API.</p>
<p><b>Internet</b>: el correo, la búsqueda, dónde abrir los enlaces, los permisos de los sitios y los programas de internet.</p>
<p><b>Idioma</b>: portugués, inglés o español (Retro Computer se reinicia para cambiarlo). En la pestaña <b>Ortografía</b>, el corrector de los campos de texto: las palabras mal escritas quedan subrayadas en rojo, y el clic derecho en ellas muestra las sugerencias y <b>Agregar al diccionario</b>. Empieza en el idioma de la interfaz; marca otros para escribir en más de uno. Los diccionarios vienen con Retro Computer, sin internet (en Mac, el corrector es el de la propia Mac).</p>
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
<p>Com uma senha, ela é pedida ao abrir o Retro Computer (como no Windows) e ao voltar da suspensão (ou ao fechar a tampa); também pode ser pedida ao sair da proteção de tela. Cada um desses momentos se liga e se desliga em Painel de controle › Senhas.</p>
<p>No Linux, a senha de entrada do Linux também desbloqueia, para o caso de esquecer a do Retro Computer. No Retro Computer como sistema, a tecla do logotipo + L bloqueia.</p>`],
    en: ['Password and lock', `
<h2>Locking the computer</h2>
<p>With a password (Control Panel › Passwords), <b>Start › Lock the Computer</b> covers the screen until the password is typed. No key reaches the programs behind it, and repeated wrong attempts take longer and longer.</p>
<h2>When to ask for the password</h2>
<p>With a password, it is asked when Retro Computer opens (as on Windows) and when waking from sleep (or closing the lid); it can also be asked when leaving the screen saver. Each of these moments is turned on and off in Control Panel › Passwords.</p>
<p>On Linux, the Linux login password also unlocks, in case you forget the Retro Computer one. With Retro Computer as the system, the logo key + L locks.</p>`],
    es: ['Contraseña y bloqueo', `
<h2>Bloquear la computadora</h2>
<p>Con una contraseña (Panel de control › Contraseñas), <b>Inicio › Bloquear la computadora</b> cubre la pantalla hasta que se escribe la contraseña. Ninguna tecla llega a los programas de detrás, y los intentos fallidos seguidos tardan cada vez más.</p>
<h2>Cuándo pedir la contraseña</h2>
<p>Con una contraseña, se pide al abrir Retro Computer (como en Windows) y al volver de la suspensión (o al cerrar la tapa); también se puede pedir al salir del protector de pantalla. Cada uno de estos momentos se activa y se desactiva en Panel de control › Contraseñas.</p>
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
<p><b>Tecla do logotipo</b>: menu Iniciar. <b>Alt+Tab</b>: trocar de janela (também as do Linux). <b>Alt+F4</b>: fechar a janela. <b>Logotipo + as setas</b>: encaixar a janela. <b>Logotipo + E</b>: Explorador; <b>R</b>: Executar; <b>D</b>: mostrar a área de trabalho; <b>M</b>: minimizar tudo; <b>I</b>: Painel de controle; <b>S</b>: pesquisar; <b>V</b>: área de transferência; <b>L</b>: bloquear; <b>1 a 9</b>: os programas fixados na barra; <b>Shift+S</b>: capturar um pedaço da tela; <b>"+" e "-"</b>: a lupa (<b>Esc</b> a fecha); <b>"." ou ";"</b>: os emojis; <b>Tab</b>: a Visão das tarefas; <b>Ctrl+D</b>: uma área de trabalho nova; <b>Ctrl+← e →</b>: trocar de área; <b>Ctrl+F4</b>: fechar a área. <b>Print Screen</b>: captura da tela inteira; <b>Alt+Print Screen</b>: da janela; <b>Shift+Print Screen</b>: de um pedaço. As teclas de volume, de brilho e de calculadora também valem.</p>
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
<p><b>Logo key</b>: Start menu. <b>Alt+Tab</b>: switch windows (the Linux ones too). <b>Alt+F4</b>: close the window. <b>Logo + the arrow keys</b>: dock the window. <b>Logo + E</b>: Explorer; <b>R</b>: Run; <b>D</b>: show the desktop; <b>M</b>: minimize all; <b>I</b>: Control Panel; <b>S</b>: search; <b>V</b>: clipboard; <b>L</b>: lock; <b>1 to 9</b>: the programs pinned to the taskbar; <b>Shift+S</b>: capture a piece of the screen; <b>"+" and "-"</b>: the magnifier (<b>Esc</b> closes it); <b>"." or ";"</b>: emoji; <b>Tab</b>: Task View; <b>Ctrl+D</b>: a new desktop; <b>Ctrl+← and →</b>: switch desktops; <b>Ctrl+F4</b>: close the desktop. <b>Print Screen</b>: screenshot of the whole screen; <b>Alt+Print Screen</b>: of the window; <b>Shift+Print Screen</b>: of a piece. The volume, brightness and calculator keys also work.</p>
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
<p><b>Tecla del logotipo</b>: menú Inicio. <b>Alt+Tab</b>: cambiar de ventana (también las de Linux). <b>Alt+F4</b>: cerrar la ventana. <b>Logotipo + las flechas</b>: acoplar la ventana. <b>Logotipo + E</b>: Explorador; <b>R</b>: Ejecutar; <b>D</b>: mostrar el escritorio; <b>M</b>: minimizar todo; <b>I</b>: Panel de control; <b>S</b>: buscar; <b>V</b>: portapapeles; <b>L</b>: bloquear; <b>1 a 9</b>: los programas anclados en la barra; <b>Shift+S</b>: capturar un trozo de la pantalla; <b>"+" y "-"</b>: la lupa (<b>Esc</b> la cierra); <b>"." o ";"</b>: los emojis; <b>Tab</b>: la Vista de tareas; <b>Ctrl+D</b>: un escritorio nuevo; <b>Ctrl+← y →</b>: cambiar de escritorio; <b>Ctrl+F4</b>: cerrar el escritorio. <b>Impr Pant</b>: captura de la pantalla entera; <b>Alt+Impr Pant</b>: de la ventana; <b>Shift+Impr Pant</b>: de un trozo. Las teclas de volumen, brillo y calculadora también funcionan.</p>
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
<p>Para sair de perto sem fechar nada, use <b>Iniciar › Bloquear o computador</b>.</p>
<h2>Ao ligar de novo</h2>
<p>As janelas que estavam abertas voltam, no mesmo lugar: o Explorador na mesma pasta, o Bloco de notas com o mesmo arquivo, o Navegador no mesmo endereço. Para abrir sempre com a área de trabalho limpa, desmarque <b>Painel de controle › Aparência › Configurações › Reabrir as janelas que estavam abertas</b>.</p>`],
    en: ['Shut Down', `
<h2>Shutting down the computer</h2>
<p><b>Start › Shut Down</b> closes the programs (each one asks if there is anything to save) and quits Retro Computer. The files stay on drive C:.</p>
<p><b>Restart</b> reloads the desktop. <b>Leave full screen</b> shows Retro Computer in a window of the main computer.</p>
<p>With Retro Computer as the Linux system, the options are to turn off, restart and suspend the computer, and to sign out.</p>
<p>With more than one user (Control Panel › Users), the box also offers <b>Close all programs and log on as a different user</b>.</p>
<p>To step away without closing anything, use <b>Start › Lock the Computer</b>.</p>
<h2>When you turn it on again</h2>
<p>The windows that were open come back, in the same place: Explorer in the same folder, Notepad with the same file, the Browser at the same address. To always start with a clean desktop, uncheck <b>Control Panel › Appearance › Settings › Reopen the windows that were open</b>.</p>`],
    es: ['Apagar', `
<h2>Apagar la computadora</h2>
<p><b>Inicio › Apagar</b> cierra los programas (cada uno pregunta si hay algo por guardar) y sale de Retro Computer. Los archivos quedan en el disco C:.</p>
<p><b>Reiniciar</b> recarga el escritorio. <b>Salir de la pantalla completa</b> muestra Retro Computer en una ventana de la computadora principal.</p>
<p>Con Retro Computer como sistema de Linux, las opciones son apagar, reiniciar y suspender la computadora, y cerrar la sesión.</p>
<p>Con más de un usuario (Panel de control › Usuarios), el cuadro también ofrece <b>Cerrar todos los programas y entrar como otro usuario</b>.</p>
<p>Para alejarte sin cerrar nada, usa <b>Inicio › Bloquear la computadora</b>.</p>
<h2>Al encender de nuevo</h2>
<p>Las ventanas que estaban abiertas vuelven, en el mismo lugar: el Explorador en la misma carpeta, el Bloc de notas con el mismo archivo, el Navegador en la misma dirección. Para empezar siempre con el escritorio limpio, desmarca <b>Panel de control › Apariencia › Configuración › Volver a abrir las ventanas que estaban abiertas</b>.</p>`],
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
