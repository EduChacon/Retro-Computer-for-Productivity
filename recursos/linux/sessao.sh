#!/bin/sh
# A sessão "Retro Computer" (o modo sistema): escolhida na tela de entrada do Linux, ela
# abre o Retro Computer como o sistema do computador, sem a área de trabalho do Linux por baixo.
# Desligar, reiniciar e suspender pelo Retro Computer valem para o computador inteiro.

AQUI=$(dirname "$(readlink -f "$0")")
APP="$AQUI/../../retro-computer"
[ -x "$APP" ] || APP=retro-computer

export RETRO_SISTEMA=1
export XDG_CURRENT_DESKTOP=RetroComputer
export XDG_SESSION_DESKTOP=retro-computer
export DESKTOP_SESSION=retro-computer

# Os nomes com acento (a "Área de trabalho") precisam de um idioma UTF-8: o da tela de entrada,
# ou o C.UTF-8 se a sessão chegar sem nenhum.
case "${LC_ALL:-${LC_CTYPE:-$LANG}}" in
  *[Uu][Tt][Ff]-8*|*[Uu][Tt][Ff]8*) ;;
  *) export LANG=C.UTF-8 ;;
esac

# O teclado: o mesmo escolhido na instalação do Linux (layout, variante e opções).
if [ -r /etc/default/keyboard ] && command -v setxkbmap >/dev/null 2>&1; then
  . /etc/default/keyboard
  setxkbmap ${XKBMODEL:+-model "$XKBMODEL"} ${XKBLAYOUT:+-layout "$XKBLAYOUT"} \
    ${XKBVARIANT:+-variant "$XKBVARIANT"} ${XKBOPTIONS:+-option "$XKBOPTIONS"} 2>/dev/null || true
fi

# O touchpad do notebook: tocar para clicar (numa sessão mínima, ele vem desligado).
if command -v xinput >/dev/null 2>&1; then
  for id in $(xinput list --id-only 2>/dev/null); do
    if xinput list-props "$id" 2>/dev/null | grep -q "libinput Tapping Enabled ("; then
      xinput set-prop "$id" "libinput Tapping Enabled" 1 2>/dev/null || true
    fi
  done
fi

# O ponteiro do Retro Computer também nos programas do Linux (o Firefox, o LibreOffice) e nas molduras do
# Openbox: a janela do Retro Computer usa o tema Adwaita (o do GTK, que o Chromium lê sozinho), e os outros
# pegavam o tema do sistema (o do Mint). O Adwaita vem com o GTK, uma dependência do pacote.
if [ -d /usr/share/icons/Adwaita/cursors ]; then
  export XCURSOR_THEME=Adwaita
fi

# A tela não apaga sozinha (o Retro Computer tem a proteção de tela própria);
# o monitor ainda economiza energia depois de 15 minutos parado.
if command -v xset >/dev/null 2>&1; then
  xset s off 2>/dev/null
  xset +dpms dpms 0 0 900 2>/dev/null
fi

# O chaveiro do Linux (GNOME Keyring), que a tela de entrada já abriu com a senha: guarda os
# cookies do Navegador, a chave do Claude e as senhas dos outros programas cifrados. Com a entrada
# direta (sem senha), ele fica trancado, e o Retro Computer pede a senha numa caixa dele (chaveiro.js).
if command -v gnome-keyring-daemon >/dev/null 2>&1; then
  eval "$(gnome-keyring-daemon --start --components=secrets,pkcs11 2>/dev/null)" || true
  export GNOME_KEYRING_CONTROL
fi

# O pedido da senha de administrador dos outros programas (o Flatpak do sistema, por exemplo).
for agente in lxpolkit /usr/lib/policykit-1-gnome/polkit-gnome-authentication-agent-1 \
  /usr/libexec/polkit-gnome-authentication-agent-1 /usr/libexec/polkit-mate-authentication-agent-1 \
  /usr/lib/x86_64-linux-gnu/polkit-mate/polkit-mate-authentication-agent-1; do
  if command -v "$agente" >/dev/null 2>&1; then "$agente" & break; fi
done

# As janelas dos programas do Linux (LibreOffice, Firefox…): um gerenciador leve, com o
# visual da época e a faixa de baixo livre para a barra de tarefas do Retro Computer.
if command -v openbox >/dev/null 2>&1; then
  # Uma cópia do rc.xml só deste usuário (a do pacote é só de leitura): o Retro Computer muda nela
  # as margens, para as janelas maximizadas encostarem na barra de tarefas, qualquer que seja a altura dela.
  RC="$AQUI/openbox/rc.xml"
  PASTA_RC="${XDG_RUNTIME_DIR:-$HOME/.cache}/retro-computer"
  if mkdir -p "$PASTA_RC" 2>/dev/null && chmod 700 "$PASTA_RC" 2>/dev/null && cp "$AQUI/openbox/rc.xml" "$PASTA_RC/openbox-rc.xml" 2>/dev/null; then
    RC="$PASTA_RC/openbox-rc.xml"
    export RETRO_OPENBOX_RC="$RC"
  fi
  XDG_DATA_DIRS="$AQUI/openbox:${XDG_DATA_DIRS:-/usr/local/share:/usr/share}" openbox --config-file "$RC" &
  # Espera o Openbox ficar pronto (até 5 segundos): aberta antes dele, a janela do Retro Computer
  # não recebe a tela cheia.
  if command -v xprop >/dev/null 2>&1; then
    i=0
    while [ "$i" -lt 50 ] && ! xprop -root _NET_SUPPORTING_WM_CHECK 2>/dev/null | grep -q "window id"; do
      sleep 0.1
      i=$((i + 1))
    done
  fi
fi

# O Retro Computer. Se ele parar com erro, abre de novo; "Sair da sessão" (código 0) volta à tela de entrada.
# O código 75 é o pedido de abrir de novo (a troca de idioma ou de usuário, o logoff).
tentativas=0
while true; do
  "$APP" --sistema
  codigo=$?
  if [ "$codigo" -eq 75 ]; then tentativas=0; continue; fi
  [ "$codigo" -eq 0 ] && break
  tentativas=$((tentativas + 1))
  [ "$tentativas" -ge 5 ] && break
  sleep 2
done
