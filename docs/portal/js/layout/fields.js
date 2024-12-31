#!/usr/bin/env node
import { 
  exists
} from '../nanolab.js';

/*
 * Controls for changing strings, numbers, bools, and drop-downs.
 * These have the `.field-control` class applied for selecting from the DOM.
 */
export function FieldControl({
  db, key, value, id=null, 
  multiple=null, multiline=null, 
  password=null
}) {
  const field = db.flat[key];
  const type_key = db.parents[key][0];
  const children = db.children[key];

  const data = `data-key="${key}"`;
  const value_html = exists(value) ? `value="${value}"` : "";

  id ??= `${key}-control`;
  multiple ??= field.multiple;
  multiline ??= field.multiline;
  password ??= field.password;
  
  let html = `
    <div style="margin-bottom: 10px;">
      <label for="${id}" class="form-label">${field.name}</label>
  `;

  //console.log('FIELD', field, 'TYPE_KEY', type_key, 'CHILDREN', children);

  if( type_key == 'select' ) {
    let multiple_html = multiple ? 'multiple="multiple"' : '';

      /*var options = param['options'];
      if( options.length > 8 )
        select2_args[id] = {};
      else
        select2_args[id] = {minimumResultsForSearch: Infinity};
    }
    else if( has_suggestions ) {
      var options = param['suggestions'];
      select2_args[id] = {tags: true, placeholder: 'enter'}; //tags: true, placeholder: 'enter'};
    }*/
    
    html += `<select id="${id}" class="field-control" ${data} ${multiple_html}>\n`;
    
    for( let child_key of children ) {
      if( child_key == value )
        var selected = ` selected="selected"`;
      else
        var selected = '';

      html += `  <option value="${child_key}" ${selected}>${db.index[child_key].name}</option>\n`;
    }
    
    html += `</select>\n`;
  }
  /*else if( 'suggestions' in param ) {
    const list_id = `${id}_list`;
    var input_html = `<input id="${id}" type="${type}" class="form-control" list="${list_id}"/>`;
    
    input_html += `<datalist id="${list_id}">`;
    
    for( i in param['suggestions'] ) {
      input_html += `<option>${param['suggestions'][i]}</option>`;
    }
    
    input_html += `</datalist>`; 
  }*/
  else if( exists(multiline) ) { // form-control
    html += `<textarea id="${id}" class="field-control" rows=${multiline} ${data}>${value}</textarea>`;
  }
  else if( type_key == 'color' ) {
    html += `<input id="${id}" class="field-control" type="color" ${value_html} ${data}/>`;
  }
  else {
    let type = type_key;

    if( password )
      type = 'password';
      
    // https://stackoverflow.com/questions/3060055/link-in-input-text-field
    if( key == 'url' || type_key == 'url' ) {
      html += `<sup><a id="${id}-link" class="field-link bi bi-box-arrow-up-right" target="_blank"></a></sup>`;
    }

    html += `<input id="${id}" class="field-control" type="${type}" ${value_html}>`;
  }

  html += `</div>`;
  //console.log(`Generated ${type_key} control for '${key}' (id=${id})\n  ${html}`);
  return html;
}