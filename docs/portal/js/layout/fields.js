/*
 * Controls for changing strings, numbers, bools, and drop-downs.
 * These have the `.field-control` class applied for selecting from the DOM.
 */
function FieldControl(args) {
  const key = args.key;
  const value = args.value;
  const registry = args.registry;

  const field = registry.flat[key];
  const type_key = registry.parents[key][0];
  const children = registry.children[key];

  const multiple = args.multiple ?? field.multiple;
  const multiline = args.multiline ?? field.multiline;
  const value_html = exists(value) ? `value="${value}"` : "";

  const id = args.id ?? `${key}-control`;
  const data = `data-key="${key}"`;

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
    html += `<textarea id="${id}" class="field-control" rows=${multiline} ${data}>${value}</textarea>`;
  }
  else if( type_key == 'color' ) {
    html += `<input id="${id}" class="field-control" type="color" ${value_html} ${data}/>`;
  }
  else {
    let type = type_key;

    if( args.password )
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
    this.id = args.id ?? `${args.key}-config`;
    this.key = args.key;
    this.key_org = args.key;
    this.registry = args.registry;
    
    if( !(this.key in this.registry.index) ) {
      console.error(`could not find '${this.key}' trying to open model setup`);
      return;
    }

    console.log(`Opening launch configuration for ${this.key}`);
    let html = `<div class="flex flex-column"><div>`;
    this.children = this.registry.children[this.key];

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
    
    if( this.children.length > 0 ) {
      this.key = this.children[0];

      document.getElementById(`${this.id}-preset-select`)
              .addEventListener('change', (evt) => {
                console.log(`Changing to preset ${evt.target.value}`, evt, this);
                this.key = evt.target.value;
                this.refresh();
              });
    }
      
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
    const fields = this.registry.props[key];

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
      const type_key = this.registry.parents[field_key][0];
      //html += `<p><b>${field.name}</b>&nbsp;(${type_key})<code>${value}</code></p>`;
      html += FieldControl({key: field_key, value: value, registry: this.registry});
    }
    
    html += `</div></div>`;
    panel.innerHTML = html;

    for( let control of panel.getElementsByClassName("field-control") ) {
      control.addEventListener('change', this.setField.bind(this));

      control.addEventListener('keydown', (evt) => {
        const event_key = control.dataset.key;
        console.log(`Value of ${event_key} (id=${control.id}) changed to '${control.value}'`);
        
        if( event_key == 'url' ) {
          panel.getElementById()
        }
      });
    }
  }

  setField(args={}) {
    const id = args.target.id;
    const event_key = args.target.dataset.key;
    console.log(`Value of ${event_key} (id=${id}) changed to '${args.target.value}'`);
    if( event_key == 'url' ) {
      panel.getElementById(`${id}-link`).href = control.value;
    }
  }
}
