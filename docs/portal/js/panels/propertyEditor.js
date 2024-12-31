#!/usr/bin/env node
import { 
  FieldControl, ModalDialog, sleep
} from '../nanolab.js';

/*
 * Introspective panel for displaying and editing graph node properties.
 * This will build the UI controls for all properties of one node.
 */
export class PropertyEditor {
  /*
   * Args:
   *   db (GraphTags) -- The previously loaded graph DB containing the index.
   *   key (str) -- The resource/model/service to use from the registry index.
   *   show (bool) -- Display the launcher dialog upon create (default=true)
   */
  constructor({db, key, id, show=true}) {
    this.db = db;
    this.id = id ?? `${key}-property-editor`;
    this.key = key;
    this.key_org = key;
    
    if( !(this.key in this.db.index) ) {
      console.error(`could not find '${this.key}' trying to open model setup`);
      return;
    }

    console.log(`[PropertyEditor] Opening settings for '${this.key}'`);
    let html = `<div class="flex flex-column"><div>`;
    this.children = this.db.children[this.key];

    // presets menu (if this resource has children)
    if( this.children.length > 0 ) {
      html += `
        <label for="${this.id}-preset-select">Preset</label>
        <select id="${this.id}-preset-select" style="margin-right: 10px; font-size: 1em;"> 
      `;

      for( const child_key of this.children )
        html += `<option value="${child_key}">${this.db.index[child_key].name}</option>`;

      html += `</select>`;
    }

    // dynamic header & main panel
    html += `<span id="${this.id}-link-group">
          </span>
        </div>
      <div id="${this.id}-launch-panel">
    </div></div>`;

    this.dialog = new ModalDialog({
      id: `${this.id}-dialog`, 
      title: this.db.index[this.key].name, 
      body: html
    });
    
    if( this.children.length > 0 ) {
      this.key = this.children[0];

      document.getElementById(`${this.id}-preset-select`).addEventListener('change', (evt) => {
                console.log(`[PropertyEditor] Changing to preset ${evt.target.value}`, evt, this);
                this.key = evt.target.value;
                this.refresh();
              });
    }
      
    this.refresh();

    if( show ?? true )
      this.dialog.show();
  }

  /*
   * update dynamic elements on selection changes
   */
  refresh(args={}) {
    const key = args.key ?? this.key;
    const model = this.db.flat[key];
    const panel = document.getElementById(`${this.id}-launch-panel`);
    const links = document.getElementById(`${this.id}-link-group`);
    const fields = this.db.props[key];

    console.log(`[PropertyEditor] Refreshing configuration:\n  key=${key}\n  fields=${fields}`);
    let html = ``;

    for( let link_name in model.links ) {
      const link = model.links[link_name];
      html += `<a href="${link.url}" title="${link.url}" class="btn-${link.color} btn-md" target="_blank">${link.name}</a>`;
    }

    links.innerHTML = html;

    // panel with configurable settings
    html = `<div class="flex flex-column"><div>`;

    for( let field_key of fields ) {
      const field = this.db.flat[field_key];
      const value = this.db.flat[key][field_key];
      const type_key = this.db.parents[field_key][0];
      //html += `<p><b>${field.name}</b>&nbsp;(${type_key})<code>${value}</code></p>`;
      html += FieldControl({key: field_key, value: value, db: this.db});
    }
    
    html += `</div></div>`;
    panel.innerHTML = html;

    for( let control of panel.getElementsByClassName("field-control") ) {
      control.addEventListener('change', this.setField.bind(this));

      control.addEventListener('keydown', (evt) => {
        const event_key = control.dataset.key;
        console.log(`[PropertyEditor] Value of ${event_key} (id=${control.id}) changed to '${control.value}'`);
        
        /*if( event_key == 'url' ) {
          panel.getElementById()
        }*/
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
