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
conv() { # origem destino
  python3 -I "$AQUI/ferramentas/fonte-serenity.py" "$SER/$1.font" "$TMP/$1.woff2" "$1" >/dev/null
  pyftsubset "$TMP/$1.woff2" --unicodes="$UNI" --flavor=woff2 --output-file="$DEST/$2.woff2" --no-hinting 2>/dev/null
  echo "$2.woff2 ($1)"
}
conv KaticaRegular10 katica
conv KaticaBold10 katica-negrito
conv CsillaRegular10 csilla
conv CsillaBold10 csilla-negrito
rm -rf "$TMP"
