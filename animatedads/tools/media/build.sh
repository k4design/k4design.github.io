#!/bin/zsh
# Compile the Swift media/snapshot tools into tools/bin. Needs Xcode command line tools.
# Usage: tools/media/build.sh [toolname ...]   (default: all)
set -e
HERE=${0:a:h}; BIN=${HERE:h}/bin; mkdir -p $BIN
TOOLS=("$@"); [[ ${#TOOLS} -eq 0 ]] && TOOLS=(seqenc seqenc_multipass mp4frames bgenc still snap wordpath probe2 wkprobe fontq psnr dur)
for t in $TOOLS; do
  print -n "  $t ... "
  swiftc -O -parse-as-library=0 -o $BIN/$t $HERE/$t.swift 2>/dev/null \
    || swiftc -O -o $BIN/$t $HERE/$t.swift
  print "ok"
done
print "built ${#TOOLS} tools into $BIN"
