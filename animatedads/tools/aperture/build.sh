#!/bin/zsh
# Rebuild an Aperture property set: all 6 sizes, video + carousel, zipped.
# Usage: build.sh <ap|pw|ew> [sizes...]
# Photos/video/bg for each unit must already be in its dist folder; this regenerates index.html and re-zips.
set -e
HERE=${0:a:h}; ROOT=${HERE:h:h}
SET=$1; shift
case $SET in
  ap) DIST=$ROOT/dist/aperture;     PRE=APERTURE_ParqueDasNacoes; NAME="Parque das Nações"; ALT="Parque das Nações"; LANG=pt; CTA="Agendar visita"; URL="https://www.apertureglobal.com/" ;;
  pw) DIST=$ROOT/dist/priorywalk;   PRE=APERTURE_PrioryWalk;      NAME="Priory Walk";       ALT="Priory Walk, Kensington"; LANG=en; CTA="Schedule a viewing"; URL="https://www.apertureglobal.com/priorywalkkensington" ;;
  ew) DIST=$ROOT/dist/embassyworks; PRE=APERTURE_EmbassyWorks;    NAME="The Penthouse";     ALT="The Penthouse, Embassy Works"; LANG=en; CTA="Schedule a viewing"; URL="https://www.apertureglobal.com/thepenthouseembassyworks" ;;
  *) print "usage: build.sh <ap|pw|ew> [sizes...]"; exit 1 ;;
esac
SIZES=("$@"); [[ ${#SIZES} -eq 0 ]] && SIZES=(768x1024 1024x768 480x320 970x250 320x480 300x600)
for sz in $SIZES; do for v in 1 0; do
  k=carousel; [[ $v == 1 ]] && k=video
  D=$DIST/${PRE}_${sz}_${k}; [[ -d $D ]] || { print "  skip (no folder) $D"; continue; }
  (cd $D && AP_SIZE=$sz AP_VIDEO=$v AP_SET=$SET AP_LANG=$LANG AP_NAME=$NAME AP_ALT=$ALT AP_CTA=$CTA AP_URL=$URL python3 $HERE/ap_compose_sizes.py >/dev/null)
  rm -f $D.zip; (cd $D && zip -q -r -X ../${PRE}_${sz}_${k}.zip . -x '.DS_Store')
  SZ=$(stat -f %z $D.zip); [[ $SZ -le 700000 ]] && print "  ok   ${sz} ${k} ${SZ}" || print "  OVER ${sz} ${k} ${SZ}"
done; done
