#!/usr/bin/env bash
# Exporta as folhas originais para o tamanho do aplicativo, sem suavizar os pixels.
# Uso: ferramentas/preparar-mascotes.sh PASTA_DOS_ORIGINAIS
# A pasta contém monitorzinho.png, disquetinho.png, robo.png, pastinha.png,
# ratinho.png, gato.png, cafezinho.png, esmalte.png (folhas 4 × 2) e icone.png.
set -euo pipefail
originais="${1:?Informe a pasta dos desenhos originais}"
raiz="$(cd -- "$(dirname -- "$0")/.." && pwd)"
if command -v magick >/dev/null 2>&1; then conversor=magick; else conversor=convert; fi
for nome in monitorzinho disquetinho robo pastinha ratinho gato cafezinho esmalte; do
  "$conversor" "$originais/$nome.png" -filter point -resize '512x256!' -dither None -colors 128 "$raiz/src/sistema/mascotes/$nome.png"
done
for tamanho in 16 32; do
  "$conversor" "$originais/icone.png" -filter point -resize "${tamanho}x${tamanho}!" "$raiz/src/sistema/icones/$tamanho/assistente.png"
done
