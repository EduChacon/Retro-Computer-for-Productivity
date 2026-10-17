#!/bin/sh
# Grava uma imagem (.iso ou .img) num pendrive ou cartão inteiro e confere a cópia, no Linux e no Mac.
# O Retro Computer roda este arquivo como administrador (o sudo no Linux; a senha do Mac pelo
# osascript) e acompanha o andamento na pasta $4: "fase" (preparar, gravar, conferir, inicio),
# "erros" (o que o dd escreve, com os bytes copiados) e, no fim, "fim" (ok, parado ou o erro). Um
# arquivo "parar" na mesma pasta interrompe.
#
# O primeiro MiB (com a tabela de partições) é zerado antes e gravado só no fim, depois de conferido o
# resto: assim o sistema não monta o pendrive no meio da cópia (nem grava nada nele).
#
#   $1 a imagem   $2 o disco inteiro (/dev/sdb, /dev/disk4)   $3 o tamanho da imagem, em bytes
#   $4 a pasta do andamento   $5 linux, mac ou teste (um arquivo comum no lugar do disco)
IMG=$1
DEV=$2
TAM=$3
P=$4
SO=$5
MIB=1048576

[ -d "$P" ] || exit 1

fim() {
  printf '%s\n' "$1" > "$P/fim.tmp" && mv -f "$P/fim.tmp" "$P/fim"
  exit 0
}
fase() { printf '%s\n' "$1" > "$P/fase"; }
ultimo() { tr '\r' '\n' < "$P/erros" | grep -v '^ *$' | tail -n 1; }

case "$TAM" in '' | *[!0-9]*) fim 'erro tamanho' ;; esac
[ -f "$IMG" ] || fim 'erro imagem'

GRAVA=
LEIA=
case "$SO" in
  linux)
    case "$DEV" in /dev/sd[a-z] | /dev/sd[a-z][a-z] | /dev/mmcblk[0-9] | /dev/mmcblk[0-9][0-9]) ;; *) fim 'erro disco' ;; esac
    [ -b "$DEV" ] || fim 'erro disco'
    # Nada do disco pode ficar montado (o administrador desmonta o que sobrou).
    for m in $(grep "^$DEV" /proc/mounts | cut -d ' ' -f 1); do umount "$m" 2> /dev/null; done
    grep -q "^$DEV" /proc/mounts && fim 'erro montado'
    ESC=$DEV
    LER=$DEV
    GRAVA='conv=fsync status=progress'
    # A leitura direta, sem o cache: confere o que está no pendrive, não o que ficou na memória.
    LEIA='iflag=direct status=progress'
    ;;
  mac)
    case "$DEV" in /dev/disk[0-9] | /dev/disk[0-9][0-9]) ;; *) fim 'erro disco' ;; esac
    diskutil unmountDisk "$DEV" > /dev/null 2>&1
    mount | grep -q "^$DEV" && fim 'erro montado'
    RAW=/dev/r${DEV#/dev/}
    # O disco "cru" é muito mais rápido, mas só aceita setores inteiros.
    ESC=$DEV
    [ $((TAM % 4096)) -eq 0 ] && ESC=$RAW
    LER=$RAW
    ;;
  teste)
    [ -f "$DEV" ] || fim 'erro disco'
    ESC=$DEV
    LER=$DEV
    GRAVA=conv=notrunc
    ;;
  *) fim 'erro sistema' ;;
esac

# Roda uma das funções abaixo em segundo plano, de olho no "parar"; o código de saída é o dela. O
# andamento do dd: no Linux, o status=progress; no Mac, o sinal INFO a cada segundo.
correr() {
  rm -f "$P/st"
  : > "$P/erros"
  ( "$1"; echo $? > "$P/st" ) &
  pid=$!
  while [ ! -s "$P/st" ]; do
    if [ -e "$P/parar" ]; then
      pkill -P "$pid" 2> /dev/null
      kill "$pid" 2> /dev/null
      wait "$pid" 2> /dev/null
      fim parado
    fi
    [ "$SO" = mac ] && pkill -INFO -P "$pid" -x dd 2> /dev/null
    sleep 1
  done
  wait "$pid" 2> /dev/null
  return "$(cat "$P/st")"
}

RESTO=$((TAM - MIB))
BLOCOS=$(((RESTO + MIB - 1) / MIB))
# shellcheck disable=SC2086 # GRAVA e LEIA são listas de opções do dd
gravar_resto() { dd if="$IMG" of="$ESC" bs=$MIB skip=1 seek=1 $GRAVA 2> "$P/erros"; }
# shellcheck disable=SC2086
conferir_resto() { dd if="$LER" bs=$MIB skip=1 count=$BLOCOS $LEIA 2> "$P/erros" | head -c "$RESTO" | cmp -s - "$IMG" 0 $MIB; }

fase preparar
# shellcheck disable=SC2086
dd if=/dev/zero of="$ESC" bs=$MIB count=1 $GRAVA 2> "$P/erros" || fim "erro gravar $(ultimo)"
if [ "$TAM" -gt "$MIB" ]; then
  fase gravar
  correr gravar_resto || fim "erro gravar $(ultimo)"
  sync
  fase conferir
  correr conferir_resto || fim 'erro conferir'
  INICIO=$MIB
else
  INICIO=$TAM
fi

# Por último, o primeiro MiB: a partir dele, o sistema vê as partições novas.
fase inicio
head -c "$INICIO" "$IMG" > "$P/inicio"
# shellcheck disable=SC2086
dd if="$P/inicio" of="$ESC" bs=$MIB count=1 $GRAVA 2> "$P/erros" || fim "erro gravar $(ultimo)"
sync
# shellcheck disable=SC2086
dd if="$LER" bs=$MIB count=1 $LEIA 2> /dev/null | head -c "$INICIO" | cmp -s - "$P/inicio" || fim 'erro conferir'
rm -f "$P/inicio"
[ "$SO" = linux ] && blockdev --rereadpt "$DEV" 2> /dev/null
fim ok
