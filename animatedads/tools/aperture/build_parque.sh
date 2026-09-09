#!/bin/zsh
# Build the Parque das Nações set in both languages, on the current template.
# Usage: build_parque.sh [sizes...]
set -e
HERE=${0:a:h}; ROOT=${HERE:h:h}
MEDIA=${AP_MEDIA:?set AP_MEDIA to the make_media.py output dir}
DIST=$ROOT/dist/parque; mkdir -p $DIST
SRC=$ROOT/dist/aperture      # bg.jpg per size comes from the original build
SIZES=("$@"); [[ ${#SIZES} -eq 0 ]] && SIZES=(768x1024 1024x768 480x320 970x250 320x480 300x600)
for lang in en pt; do
  if [[ $lang == en ]]; then SET=pnen; L=en; CTA="Schedule a viewing"; ALT="Parque das Nações"
  else SET=pnpt; L=pt; CTA="Agendar visita"; ALT="Parque das Nações"; fi
  for sz in $SIZES; do for v in 1 0; do
    k=carousel; [[ $v == 1 ]] && k=video
    D=$DIST/APERTURE_ParqueDasNacoes_${sz}_${k}_${lang}
    rm -rf $D; mkdir -p $D
    cp $SRC/APERTURE_ParqueDasNacoes_${sz}_carousel/bg.jpg $D/bg.jpg
    cp $MEDIA/photos/$sz/photo*.jpg $D/
    [[ $v == 1 ]] && cp $MEDIA/video/$sz.mp4 $D/video.mp4
    (cd $D && AP_SIZE=$sz AP_VIDEO=$v AP_SET=$SET AP_LANG=$L AP_NAME="Parque das Nações" \
       AP_ALT=$ALT AP_CTA=$CTA AP_URL="https://www.apertureglobal.com/" \
       python3 $HERE/ap_compose_sizes.py >/dev/null)
    rm -f $D.zip; (cd $D && zip -q -r -X $D.zip . -x '.DS_Store')
    SZ=$(stat -f %z $D.zip)
    [[ $SZ -le 700000 ]] && print "  ok   ${sz} ${k} ${lang} ${SZ}" || print "  OVER ${sz} ${k} ${lang} ${SZ}"
  done; done
done
