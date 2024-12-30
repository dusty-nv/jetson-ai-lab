/*
 * Introspective panel for displaying and editing graph node properties.
 * This will build the UI controls for all properties of one node.
 */
class PropertyEditor {
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
