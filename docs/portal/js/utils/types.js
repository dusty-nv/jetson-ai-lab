/*
 * Assorted typing functions and conversions.
 */
export function exists(x) {
  return (x !== null && x !== undefined);
}

export function is_string(x) {
  if( typeof x === 'string' || x instanceof String )
    return true;
  else
    return false;
}

export function is_list(x) {
  return Array.isArray(x);
}

export function as_list(x) {
  if( !exists(x) )
    return [] 
  return x;
}

export function as_element(x) {
  if( !exists(x) )
    return x;

  if( is_string(x) )
    return document.getElementById(x);

  return x;
}

export function len(x) {
  if( is_list(x) )
    return x.length;
  else
    return Object.keys(x).length;
}