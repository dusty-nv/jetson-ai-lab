/*
 * Controls for changing strings, numbers, bools, and selections.
 */
function FieldControl(args) {
  const key = args.key;
  const value = args.value;
  const registry = args.registry;

  const field = registry.flat[key];
  const type_key = registry.map[key].parents[0];
  const children = registry.map[key].children;

  const multiple = args.multiple ?? field.multiple;
  const multiline = args.multiline ?? field.multiline;
  const value_html = exists(value) ? `value="${value}"` : "";

  const id = args.id ?? `${key}-${type_key}-control`;

  let html = `
    <div style="margin-bottom: 10px;">
      <label for="${id}" class="form-label">${field.name}</label>
  `;
  
  console.log('FIELD', field, 'TYPE_KEY', type_key, 'CHILDREN', children);

  if( type_key == 'select' ) {
    var multiple_html = multiple ? 'multiple="multiple"' : '';

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
    
    html += `<br/><select id="${id}" ${multiple_html}>\n`;
    
    for( let child_key of children ) {
      if( child_key == value )
        var selected = ` selected="selected"`;
      else
        var selected = '';

      html += `  <option value="${child_key}" ${selected}>${registry.index[child_key].name}</option>\n`;
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
    html += `<textarea id="${id}" rows=${multiline}>${value}</textarea>`;
  }
  else if( type_key == 'color' ) {
    html += `<input id="${id}" type="color" ${value_html}/>`;
  }
  else {
    let type = type_key;

    if( args.password )
      type = 'password';
      
    // TODO:  hyperlinks in text
    // https://stackoverflow.com/questions/3060055/link-in-input-text-field
    html += `<input id="${id}" type="${type}" ${value_html}>`;
  }

  html += `</div>`;
  console.log(`Generated ${type_key} control for '${key}' (id=${id})\n  ${html}`);
  return html;
}

  

/*
 * Web dialog for remotely controlling resource settings.
 */
class FieldEditor {
  /*
   * Args:
   *   key (str) -- The resource/model/service to use from the registry index.
   *   registry -- The previously loaded Registry instance containing the index.
   *   show (bool) -- Display the launcher dialog upon create (default=true)
   */
  constructor(args) {
    this.id = args.id ?? `${args.key}-launcher`;
    this.key = args.key;
    this.key_org = args.key;
    this.registry = args.registry;
    
    if( !(this.key in this.registry.index) ) {
      console.error(`could not find '${this.key}' trying to open model setup`);
      return;
    }

    console.log(`Opening launch configuration for ${this.key}`);
    let html = `<div class="flex flex-column"><div>`;
    this.children = this.registry.map[this.key].children;

    // presets menu (if this resource has children)
    if( this.children.length > 0 ) {
      html += `
        <label for="${this.id}-preset-select">Preset</label>
        <select id="${this.id}-preset-select" style="margin-right: 10px; font-size: 1em;"> 
      `;

      for( const child_key of this.children )
        html += `<option value="${child_key}">${this.registry.index[child_key].name}</option>`;

      html += `</select>`;
    }

    // dynamic header & main panel
    html += `<span id="${this.id}-link-group">
          </span>
        </div>
      <div id="${this.id}-launch-panel">
    </div></div>`;

    this.dialog = new ModalDialog(
      `${this.id}-dialog`, 
      this.registry.index[this.key].name, 
      html
    );
    
    if( this.children.length > 0 )
      this.key = this.children[0];

    this.refresh();

    if( args.show ?? true )
      this.dialog.show();
  }

  /*
   * update dynamic elements on selection changes
   */
  refresh(args={}) {
    const key = args.key ?? this.key;
    const model = this.registry.flat[key];
    const panel = document.getElementById(`${this.id}-launch-panel`);
    const links = document.getElementById(`${this.id}-link-group`);
    const fields = this.registry.fields[key];

    console.log(`Refreshing launcher for configuration:\n  key=${key}\n  fields=${fields}`);
    let html = ``;

    for( let link_name in model.links ) {
      const link = model.links[link_name];
      html += `<a href="${link.url}" title="${link.url}" class="btn-${link.color} btn-md" target="_blank">${link.name}</a>`;
    }

    links.innerHTML = html;

    // panel with configurable settings
    html = `<div class="flex flex-column"><div>`;

    for( let field_key of fields ) {
      const field = this.registry.flat[field_key];
      const value = this.registry.flat[key][field_key];
      const type_key = this.registry.map[field_key].parents[0];
      //html += `<p><b>${field.name}</b>&nbsp;(${type_key})<code>${value}</code></p>`;
      html += FieldControl({key: field_key, value: value, registry: this.registry});
    }
    
    html += `</div></div>`;
    panel.innerHTML = html;
    return html;
  }
}
