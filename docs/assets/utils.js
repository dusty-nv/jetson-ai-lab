function exists(x) {
  return (x !== null && x !== undefined);
}

function capitalize(x) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function is_string(x) {
  if( typeof x === 'string' || x instanceof String )
    return true;
  else
    return false;
}

function as_list(x) {
  if( !exists(x) )
    return []
  
  return x;
}

function as_element(x) {
  if( !exists(x) )
    return x;

  if( is_string(x) )
    return document.getElementById(x);

  return x;
}

function strToWeb(option) {
  if( option == 'api' )
    return 'API';
  else
    return capitalize(option);
}

// https://stackoverflow.com/a/6234804
function escapeHTML(unsafe) {
  return unsafe
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
    .replaceAll('\n', '<br/>');
}