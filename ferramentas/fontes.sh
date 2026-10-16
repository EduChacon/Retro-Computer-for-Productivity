#!/usr/bin/env bash
# Converte as fontes de bitmap do SerenityOS (BSD-2-Clause) para WOFF2, só com o
# alfabeto latino e os símbolos usados. Precisa de: pip install fonttools brotli
# Uso: ferramentas/fontes.sh PASTA_DO_SERENITY
set -euo pipefail
SER="$1/Base/res/fonts"
AQUI="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$AQUI/src/sistema/fontes"
TMP="$(mktemp -d)"
mkdir -p "$DEST"
UNI="U+0020-007E,U+00A0-024F,U+2010-2027,U+2030-203A,U+20AC,U+2122,U+2190-2199,U+2500-257F,U+2580-259F,U+25A0-25FF,U+2713,U+2714,U+2022"
# O Prompt também leva os símbolos do Claude Code (desenhos próprios em ferramentas/glifos-terminal.py).
UNI_TERM="$UNI,U+2234,U+23BF,U+23F5,U+23F8,U+23FA,U+2713-2718,U+2722,U+2733,U+2736,U+273B,U+273D,U+276F"
conv() { # origem destino caracteres [opções do fonte-serenity.py]
  local origem="$1" destino="$2" uni="$3"
  shift 3
  python3 -I "$AQUI/ferramentas/fonte-serenity.py" "$SER/$origem.font" "$TMP/$origem.woff2" "$origem" "$@" >/dev/null
  pyftsubset "$TMP/$origem.woff2" --unicodes="$uni" --flavor=woff2 --output-file="$DEST/$destino.woff2" --no-hinting 2>/dev/null
  echo "$destino.woff2 ($origem)"
}
conv KaticaRegular10 katica "$UNI"
conv KaticaBold10 katica-negrito "$UNI"
conv CsillaRegular10 csilla "$UNI_TERM" --proprios
# O negrito da Csilla não tem as aspas, as setas e as molduras: vêm da regular, engrossadas.
conv CsillaBold10 csilla-negrito "$UNI_TERM" --proprios --negrito --de "$SER/CsillaRegular10.font"
rm -rf "$TMP"
