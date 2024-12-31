#!/usr/bin/env bash
# https://www.forbeslindesay.co.uk/post/46324645400/standalone-browserify-builds
set -ex

ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

function bundle() {
  local MODULE=$1
  local WORKDIR="/tmp/browserify"
  local IMPORT="$WORKDIR/import.js"

  docker run -it --rm -v $ROOT:/dist -w $WORKDIR \
    node:latest /bin/bash -c "\
      set -ex ; \
      echo \"const $MODULE = require('$MODULE'); module.exports = $MODULE;\" > $IMPORT && \
      cat $IMPORT && \
      npm install -g browserify && \
      npm install $MODULE && \
      browserify $IMPORT --standalone $MODULE -o /dist/$MODULE/$MODULE.js && \
      echo \"Done browserify of $MODULE\" && \
      ls -ll /dist/$MODULE"
}

if [ "$#" -gt 0 ]; then
    bundle "$@"
    exit 0 
fi

bundle "composerize"