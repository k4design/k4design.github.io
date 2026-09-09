#!/bin/zsh
# Rebuild every AgentWhoKnows unit (lite + HD, all sizes) from the compose scripts, re-zip, re-render backups, refresh the preview.
# Usage: awk_regen_all.sh [sizes...]   (default: all)  e.g. awk_regen_all.sh 300x250 728x90
set -e
HERE=${0:a:h}
ROOT=${HERE:h:h}          # animatedads/
SC=$HERE                 # the composers live beside this script
BIN=${AD_BIN:-$ROOT/tools/bin}
PORT=${AD_PORT:-8801}
cd $ROOT/dist/awk
typeset -A T; T=( v1 "house exterior" v2 "construction_ext" v3 "newconstruction_2" v4 "agentwhoknows_c" v5 "kitchen" )
SIZES=("$@"); [[ ${#SIZES} -eq 0 ]] && SIZES=(300x250 728x90 320x50 160x600 300x600 970x250 970x90)
pack() {  # pack <folder> <w> <h> [snap_ms]
  local D=$1 w=$2 h=$3 ms=${4:-13500} lim=204800; [[ $D == *_HD ]] && lim=700000
  rm -f $D.zip; (cd $D && zip -q -r -X ../$D.zip . -x '.DS_Store'); local SZ=$(stat -f %z $D.zip)
  [[ $SZ -le $lim ]] || echo "  OVER $D $SZ"
  $BIN/snap "http://localhost:$PORT/dist/awk/$D/index.html" ${D}_backup.jpg $ms 0.9 $w $h >/dev/null
}
hdtwin() { local B=$1; [[ -d ${B}_HD ]] && sed 's#</title># · HD</title>#' $B/index.html > ${B}_HD/index.html; }
for size in $SIZES; do
  w=${size%x*}; h=${size#*x}
  case $size in
  300x250)
    for v in v1 v1c v1k; do B=AWK_NC_CC_EXT_300x250_$v; t="AgentWhoKnows 300x250"; [[ $v != v1 ]] && t="$t ($v)"
      ehl=""; [[ $v == v1k ]] && ehl="#c8861a"
      (cd $B && AWK_EHL_COLOR=${ehl:-#ffffff} python3 $SC/awk_compose.py >/dev/null); sed -i '' "s#<title>[^<]*</title>#<title>$t</title>#" $B/index.html; hdtwin $B; pack $B 300 250; pack ${B}_HD 300 250; done
    (cd AWK_NC_CC_EXT_300x250_v2 && AWK_FINAL_FULL=0 python3 $SC/awk_compose_v2.py >/dev/null); sed -i '' "s#<title>[^<]*</title>#<title>AgentWhoKnows 300x250 (frames)</title>#" AWK_NC_CC_EXT_300x250_v2/index.html; hdtwin AWK_NC_CC_EXT_300x250_v2; pack AWK_NC_CC_EXT_300x250_v2 300 250; pack AWK_NC_CC_EXT_300x250_v2_HD 300 250
    (cd AWK_NC_CC_EXT_300x250_v3 && AWK_VIDEO_W=340 AWK_PAN=0 AWK_REFRAME_PX=0 AWK_FINAL_FULL=1 AWK_Q_STYLE=accent python3 $SC/awk_compose_v2.py >/dev/null); sed -i '' "s#<title>[^<]*</title>#<title>AgentWhoKnows 300x250 (frames, v3)</title>#" AWK_NC_CC_EXT_300x250_v3/index.html; hdtwin AWK_NC_CC_EXT_300x250_v3; pack AWK_NC_CC_EXT_300x250_v3 300 250; pack AWK_NC_CC_EXT_300x250_v3_HD 300 250
    for v in v2c v2k; do B=AWK_NC_CC_EXT_300x250_$v; (cd $B && AWK_FINAL_FULL=1 AWK_Q_STYLE=accent python3 $SC/awk_compose_v2.py >/dev/null); sed -i '' "s#<title>[^<]*</title>#<title>AgentWhoKnows 300x250 (frames, $v)</title>#" $B/index.html; hdtwin $B; pack $B 300 250; pack ${B}_HD 300 250; done ;;
  728x90)
    for v in v1 v2 v3 v4 v5; do B=AWK_NC_CC_EXT_728x90_$v; (cd $B && AWK_TITLE="AgentWhoKnows 728x90 ($v · ${T[$v]})" python3 $SC/awk_compose_728.py >/dev/null); hdtwin $B; pack $B 728 90 13000; pack ${B}_HD 728 90 13000; done ;;
  320x50)
    for v in v1 v2 v3 v4 v5; do B=AWK_NC_CC_EXT_320x50_$v; (cd $B && AWK_TITLE="AgentWhoKnows 320x50 ($v · ${T[$v]})" python3 $SC/awk_compose_320.py >/dev/null); hdtwin $B; pack $B 320 50; pack ${B}_HD 320 50; done ;;
  970x90)
    for v in v1 v3 v4 v5; do D=AWK_NC_CC_EXT_970x90_${v}_HD; (cd $D && AWK_TITLE="AgentWhoKnows 970x90 ($v · ${T[$v]}) · HD" python3 $SC/awk_compose_970x90.py >/dev/null); pack $D 970 90 13000; done ;;
  160x600|300x600|970x250)
    for v in v1 v3 v4 v5; do D=AWK_NC_CC_EXT_${size}_${v}_HD; (cd $D && AWK_SIZE=$size AWK_TITLE="AgentWhoKnows $size ($v · ${T[$v]}) · HD" python3 $SC/awk_compose_big.py >/dev/null); pack $D $w $h; done ;;
  esac
  echo "$size done"
done
python3 make-preview.py | tail -1
