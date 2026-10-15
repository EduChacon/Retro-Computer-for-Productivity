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
<p>3. Para o Claude, use o ícone <b>Claude</b> na área de trabalho.</p>
<p>4. Para trabalhar sem interrupções, use o <b>Foco</b> (Iniciar › Programas › Acessórios).</p>
<p>O idioma (português, inglês ou espanhol) fica em <b>Painel de controle › Idioma</b>.</p>`],
    en: ['Welcome', `
<h2>What Retro Computer is</h2>
<p>A productivity computer with the look of the 1990s: few distractions, your work programs and your files at hand.</p>
<p>It is not a virtual machine: the programs run on your real computer, and drive C: is an ordinary folder on it. That is why it is light, starts quickly and nothing gets locked inside.</p>
<h2>First steps</h2>
<p>1. Open <b>Documents</b> and read <b>Read me.txt</b>.</p>
<p>2. Install programs from <b>Start › Settings › Add or Remove Programs</b>.</p>
<p>3. For Claude, use the <b>Claude</b> icon on the desktop.</p>
<p>4. To work without interruptions, use <b>Focus</b> (Start › Programs › Accessories).</p>
<p>The language (Portuguese, English or Spanish) is in <b>Control Panel › Language</b>.</p>`],
    es: ['Bienvenido', `
<h2>Qué es Retro Computer</h2>
<p>Una computadora de productividad con el aspecto de los años 90: pocas distracciones, los programas de trabajo y tus archivos a mano.</p>
<p>No es una máquina virtual: los programas se ejecutan en tu computadora real, y el disco C: es una carpeta común de ella. Por eso es liviano, abre rápido y nada queda atrapado adentro.</p>
<h2>Primeros pasos</h2>
<p>1. Abre <b>Mis documentos</b> y lee <b>Léame.txt</b>.</p>
<p>2. Instala los programas en <b>Inicio › Configuración › Agregar o quitar programas</b>.</p>
<p>3. Para Claude, usa el icono <b>Claude</b> del escritorio.</p>
<p>4. Para trabajar sin interrupciones, usa <b>Enfoque</b> (Inicio › Programas › Accesorios).</p>
<p>El idioma (portugués, inglés o español) está en <b>Panel de control › Idioma</b>.</p>`],
  },
  {
    id: 'arquivos', icone: 'disco',
    'pt-BR': ['O disco C: e os arquivos', `
<h2>Onde ficam os arquivos</h2>
<p>O disco C: é uma pasta do computador principal (veja qual em Painel de controle › Disco C:). Tudo o que você salva fica nela e pode ser aberto também fora do Retro Computer.</p>
<h2>Trazer arquivos</h2>
<p>Arraste arquivos do computador principal para uma janela de pasta ou para a área de trabalho. Eles são copiados para o disco C:. Também dá para usar o menu Arquivo › Trazer do computador principal.</p>
<h2>Levar arquivos</h2>
<p>Botão direito no arquivo › <b>Enviar para</b> › Área de trabalho ou Downloads do computador principal. Ou <b>Mostrar no computador principal</b>, para abrir a pasta lá.</p>
<h2>Nada se perde</h2>
<p><b>Excluir</b> manda para a Lixeira, de onde dá para restaurar. Os itens só somem quando você esvazia a Lixeira.</p>
<p>Cada vez que um arquivo é gravado por cima, a versão anterior fica guardada: botão direito › <b>Versões anteriores</b>.</p>
<h2>Teclas</h2>
<p>Enter abre, F2 renomeia, Delete exclui, Backspace sobe uma pasta, Ctrl+C, Ctrl+X e Ctrl+V copiam, recortam e colam.</p>`],
    en: ['Drive C: and your files', `
<h2>Where the files are</h2>
<p>Drive C: is a folder on the main computer (see which one in Control Panel › Drive C:). Everything you save stays there and can also be opened outside Retro Computer.</p>
<h2>Bringing files in</h2>
<p>Drag files from the main computer onto a folder window or onto the desktop. They are copied to drive C:. You can also use the File › Bring from the main computer menu.</p>
<h2>Taking files out</h2>
<p>Right-click the file › <b>Send to</b> › Desktop or Downloads of the main computer. Or <b>Show on the main computer</b>, to open the folder there.</p>
<h2>Nothing gets lost</h2>
<p><b>Delete</b> sends items to the Trash, where they can be restored. They are only gone when you empty the Trash.</p>
<p>Every time a file is saved over, the previous version is kept: right-click › <b>Previous versions</b>.</p>
<h2>Keys</h2>
<p>Enter opens, F2 renames, Delete deletes, Backspace goes up a folder, Ctrl+C, Ctrl+X and Ctrl+V copy, cut and paste.</p>`],
    es: ['El disco C: y los archivos', `
<h2>Dónde están los archivos</h2>
<p>El disco C: es una carpeta de la computadora principal (mira cuál en Panel de control › Disco C:). Todo lo que guardas queda en ella y también se puede abrir fuera de Retro Computer.</p>
<h2>Traer archivos</h2>
<p>Arrastra archivos de la computadora principal a una ventana de carpeta o al escritorio. Se copian al disco C:. También puedes usar el menú Archivo › Traer de la computadora principal.</p>
<h2>Llevar archivos</h2>
<p>Clic derecho en el archivo › <b>Enviar a</b> › Escritorio o Descargas de la computadora principal. O <b>Mostrar en la computadora principal</b>, para abrir la carpeta allí.</p>
<h2>Nada se pierde</h2>
<p><b>Eliminar</b> manda a la Papelera, desde donde se puede restaurar. Los elementos solo desaparecen cuando vacías la Papelera.</p>
<p>Cada vez que un archivo se guarda encima, la versión anterior queda guardada: clic derecho › <b>Versiones anteriores</b>.</p>
<h2>Teclas</h2>
<p>Enter abre, F2 cambia el nombre, Supr elimina, Retroceso sube una carpeta, Ctrl+C, Ctrl+X y Ctrl+V copian, cortan y pegan.</p>`],
  },
  {
    id: 'programas', icone: 'programas-caixa',
    'pt-BR': ['Programas', `
<h2>Instalar</h2>
<p>Em <b>Adicionar ou remover programas</b>, escolha o programa e clique em Instalar. Ele vem do lançamento oficial (a versão para navegador) e depois funciona sem internet.</p>
<p>Os programas disponíveis são os <b>Craft</b>: WordCraft (textos .docx), GridCraft (planilhas), DeckCraft (apresentações), PdfCraft (PDF), PhotoCraft (imagens) e outros. São novos e de código aberto: alguns recursos ainda faltam.</p>
<h2>Atualizações</h2>
<p>Ao abrir um programa, o Retro Computer procura uma versão nova dele (com internet) e a instala antes de abrir. Em <b>Adicionar ou remover programas</b>, escolha entre atualizar sozinho, perguntar antes ou nunca procurar.</p>
<h2>Abrir e salvar</h2>
<p>Os comandos Abrir e Salvar dos programas usam as caixas do Retro Computer, no disco C:. Dois cliques num documento abrem o programa certo; um arquivo que veio do disco é salvo de volta no mesmo lugar.</p>
<h2>Sem internet?</h2>
<p>Baixe o pacote "nome-web-versão.zip" em outro lugar e use <b>Instalar de um arquivo .zip</b>.</p>`],
    en: ['Programs', `
<h2>Installing</h2>
<p>In <b>Add or Remove Programs</b>, choose the program and click Install. It comes from the official release (the browser version) and then works offline.</p>
<p>The available programs are the <b>Craft</b> apps: WordCraft (.docx documents), GridCraft (spreadsheets), DeckCraft (presentations), PdfCraft (PDF), PhotoCraft (images) and others. They are new and open source: some features are still missing.</p>
<h2>Updates</h2>
<p>When you open a program, Retro Computer looks for a new version of it (when online) and installs it before opening. In <b>Add or Remove Programs</b>, choose between updating automatically, asking first or never checking.</p>
<h2>Opening and saving</h2>
<p>The programs' Open and Save commands use the Retro Computer dialogs, on drive C:. Double-clicking a document opens the right program; a file that came from the disk is saved back to the same place.</p>
<h2>No internet?</h2>
<p>Download the "name-web-version.zip" package somewhere else and use <b>Install from a .zip file</b>.</p>`],
    es: ['Programas', `
<h2>Instalar</h2>
<p>En <b>Agregar o quitar programas</b>, elige el programa y haz clic en Instalar. Viene de la versión oficial (la versión para navegador) y después funciona sin internet.</p>
<p>Los programas disponibles son los <b>Craft</b>: WordCraft (textos .docx), GridCraft (hojas de cálculo), DeckCraft (presentaciones), PdfCraft (PDF), PhotoCraft (imágenes) y otros. Son nuevos y de código abierto: todavía faltan algunas funciones.</p>
<h2>Actualizaciones</h2>
<p>Al abrir un programa, Retro Computer busca una versión nueva (con internet) y la instala antes de abrirlo. En <b>Agregar o quitar programas</b>, elige entre actualizar solo, preguntar antes o no buscar nunca.</p>
<h2>Abrir y guardar</h2>
<p>Los comandos Abrir y Guardar de los programas usan los cuadros de Retro Computer, en el disco C:. Un doble clic en un documento abre el programa correcto; un archivo que vino del disco se guarda de vuelta en el mismo lugar.</p>
<h2>¿Sin internet?</h2>
<p>Descarga el paquete "nombre-web-versión.zip" en otro lugar y usa <b>Instalar desde un archivo .zip</b>.</p>`],
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
<p>O Foco alterna blocos de trabalho (25 minutos) com pausas curtas (5 minutos) e, a cada quatro blocos, uma pausa longa (15 minutos). Os tempos podem ser mudados.</p>
<p>O tempo aparece na bandeja, ao lado do relógio, mesmo com a janela fechada. No fim de cada fase, um som e um aviso.</p>
<p>Dica: marque <b>Minimizar as outras janelas no começo do foco</b> e use a tela cheia (F11).</p>`],
    en: ['Focus (Pomodoro)', `
<h2>Working in blocks</h2>
<p>Focus alternates blocks of work (25 minutes) with short breaks (5 minutes) and, every four blocks, a long break (15 minutes). The times can be changed.</p>
<p>The time shows in the tray, next to the clock, even with the window closed. At the end of each phase, a sound and a notice.</p>
<p>Tip: check <b>Minimize the other windows when a focus block starts</b> and use full screen (F11).</p>`],
    es: ['Enfoque (Pomodoro)', `
<h2>Trabajar en bloques</h2>
<p>Enfoque alterna bloques de trabajo (25 minutos) con pausas cortas (5 minutos) y, cada cuatro bloques, una pausa larga (15 minutos). Los tiempos se pueden cambiar.</p>
<p>El tiempo aparece en la bandeja, junto al reloj, incluso con la ventana cerrada. Al final de cada fase, un sonido y un aviso.</p>
<p>Consejo: marca <b>Minimizar las otras ventanas al comenzar el enfoque</b> y usa la pantalla completa (F11).</p>`],
  },
  {
    id: 'painel', icone: 'painel',
    'pt-BR': ['Painel de controle', `
<h2>Configurações</h2>
<p><b>Aparência</b>: a cor e o padrão do fundo, a proteção de tela, a tela cheia e o tamanho dos pixels (para as letras ficarem nítidas em qualquer monitor).</p>
<p><b>Disco C:</b>: a pasta do disco no computador principal, o espaço livre e a troca de pasta.</p>
<p><b>Claude</b>: a instalação do Claude Code e a chave de API.</p>
<p><b>Idioma</b>: português, inglês ou espanhol (o Retro Computer reinicia para trocar).</p>
<p><b>Sons</b>: ligar, desligar e o volume.</p>
<p><b>Programas</b>: instalar, remover e as atualizações.</p>`],
    en: ['Control Panel', `
<h2>Settings</h2>
<p><b>Appearance</b>: the background color and pattern, the screen saver, full screen and the pixel size (so the letters stay sharp on any monitor).</p>
<p><b>Drive C:</b>: the disk folder on the main computer, the free space and changing the folder.</p>
<p><b>Claude</b>: installing Claude Code and the API key.</p>
<p><b>Language</b>: Portuguese, English or Spanish (Retro Computer restarts to switch).</p>
<p><b>Sounds</b>: on, off and the volume.</p>
<p><b>Programs</b>: installing, removing and updates.</p>`],
    es: ['Panel de control', `
<h2>Configuración</h2>
<p><b>Apariencia</b>: el color y el patrón del fondo, el protector de pantalla, la pantalla completa y el tamaño de los píxeles (para que las letras queden nítidas en cualquier monitor).</p>
<p><b>Disco C:</b>: la carpeta del disco en la computadora principal, el espacio libre y el cambio de carpeta.</p>
<p><b>Claude</b>: la instalación de Claude Code y la clave de API.</p>
<p><b>Idioma</b>: portugués, inglés o español (Retro Computer se reinicia para cambiarlo).</p>
<p><b>Sonidos</b>: activar, desactivar y el volumen.</p>
<p><b>Programas</b>: instalar, quitar y las actualizaciones.</p>`],
  },
  {
    id: 'atalhos', icone: 'executar',
    'pt-BR': ['Teclas de atalho', `
<h2>Em qualquer lugar</h2>
<p><b>F11</b>: tela cheia ou janela. <b>Ctrl+Esc</b>: menu Iniciar. <b>Alt+letra</b>: abre o menu da janela. <b>F1</b>: esta Ajuda.</p>
<h2>Nas pastas</h2>
<p><b>Enter</b> abre, <b>F2</b> renomeia, <b>Delete</b> exclui, <b>Backspace</b> sobe, <b>F5</b> atualiza, <b>Ctrl+A</b> seleciona tudo.</p>
<h2>No Prompt de comando</h2>
<p><b>Ctrl+Shift+C</b> copia e <b>Ctrl+Shift+V</b> cola (no Mac, Cmd+C e Cmd+V). O botão direito também tem Copiar e Colar.</p>`],
    en: ['Shortcut keys', `
<h2>Anywhere</h2>
<p><b>F11</b>: full screen or window. <b>Ctrl+Esc</b>: Start menu. <b>Alt+letter</b>: opens the window's menu. <b>F1</b>: this Help.</p>
<h2>In folders</h2>
<p><b>Enter</b> opens, <b>F2</b> renames, <b>Delete</b> deletes, <b>Backspace</b> goes up, <b>F5</b> refreshes, <b>Ctrl+A</b> selects all.</p>
<h2>In the Command Prompt</h2>
<p><b>Ctrl+Shift+C</b> copies and <b>Ctrl+Shift+V</b> pastes (on a Mac, Cmd+C and Cmd+V). The right-click menu also has Copy and Paste.</p>`],
    es: ['Teclas de acceso rápido', `
<h2>En cualquier lugar</h2>
<p><b>F11</b>: pantalla completa o ventana. <b>Ctrl+Esc</b>: menú Inicio. <b>Alt+letra</b>: abre el menú de la ventana. <b>F1</b>: esta Ayuda.</p>
<h2>En las carpetas</h2>
<p><b>Enter</b> abre, <b>F2</b> cambia el nombre, <b>Supr</b> elimina, <b>Retroceso</b> sube, <b>F5</b> actualiza, <b>Ctrl+A</b> selecciona todo.</p>
<h2>En la Línea de comandos</h2>
<p><b>Ctrl+Shift+C</b> copia y <b>Ctrl+Shift+V</b> pega (en Mac, Cmd+C y Cmd+V). El clic derecho también tiene Copiar y Pegar.</p>`],
  },
  {
    id: 'desligar', icone: 'desligar',
    'pt-BR': ['Desligar', `
<h2>Desligar o computador</h2>
<p><b>Iniciar › Desligar</b> fecha os programas (cada um pergunta se há algo por salvar) e sai do Retro Computer. Os arquivos ficam no disco C:.</p>
<p><b>Reiniciar</b> recarrega a área de trabalho. <b>Sair da tela cheia</b> mostra o Retro Computer numa janela do computador principal.</p>`],
    en: ['Shut Down', `
<h2>Shutting down the computer</h2>
<p><b>Start › Shut Down</b> closes the programs (each one asks if there is anything to save) and quits Retro Computer. The files stay on drive C:.</p>
<p><b>Restart</b> reloads the desktop. <b>Leave full screen</b> shows Retro Computer in a window of the main computer.</p>`],
    es: ['Apagar', `
<h2>Apagar la computadora</h2>
<p><b>Inicio › Apagar</b> cierra los programas (cada uno pregunta si hay algo por guardar) y sale de Retro Computer. Los archivos quedan en el disco C:.</p>
<p><b>Reiniciar</b> recarga el escritorio. <b>Salir de la pantalla completa</b> muestra Retro Computer en una ventana de la computadora principal.</p>`],
  },
];

/** O título e o texto do tópico no idioma de agora. */
const doIdioma = (t) => t[idiomaAtual()] || t['pt-BR'];

function abrirAjuda(args = {}) {
  let j = janelas.find((x) => x.id === 'ajuda');
  if (!j) {
    j = new Janela({ id: 'ajuda', titulo: tr('Ajuda do Retro Computer'), icone: 'ajuda', largura: 580, altura: 400 });
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
