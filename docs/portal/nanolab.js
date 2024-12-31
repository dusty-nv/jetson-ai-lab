/*
 * Module loader / init (todo: minimize)
 */
import { exists, include } from "./js/nanolab.js";

import './dist/jquery/jquery.js';
import './dist/select2/select2.js';

if( exists(document) ) { // browser mode
  include(
    './dist/select2/select2.css',
    './dist/bootstrap-icons/bootstrap-icons.css',
    './css/flex.css', 
    './css/button.css', 
    './css/card.css', 
    './css/modal.css',
    './css/select.css',
  );
}

export * from "./js/nanolab.js";