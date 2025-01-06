#!/usr/bin/env node
import { 
  PropertyField, PropertyLabel, ModalDialog, CodeEditor,
  ConfigGenerator, escapeHTML, exists, nonempty, sleep,
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

    if( !(this.key in this.db.index) )
      throw new Error(`could not find '${this.key}' trying to open property editor`);

    // generate children ID's from parent ID
    this.ids = {};

    for( const k of ['container', 'header-extensions', 'preset-menu', 'dialog', 'table', 'code_panel', 'code_editor'])
      this.ids[k.replace('-','_')] = `${this.id}-${k}`;

    console.log(`[PropertyEditor] creating new property editor (ID='${this.id}) with children IDs:`, this.ids);

    // get flattened objects and headers (optional)
    const obj = this.db.flat[this.key];

    this.header_class = obj.header;
    this.has_header = exists(this.header_class);
    this.children = this.db.children[this.key];

    // create dialog and placeholder for dynamic content
    console.log(`[Property Editor] Opening settings for '${this.key}'`);

    let html = `<div id="${this.ids.container}" class="flex flex-row" style="width: 100%;">`;
    let header = `<div id="${this.ids.header_extensions}" style="width: 45%;"></div>`;
    let menu = ``;

    // presets menu (if this resource has children)
    if( this.children.length > 0 ) {
      //menu += `<label for="${this.id}-preset-select" style="margin-right: 5px;">Preset</label>`;
      menu += `
        <select id="${this.ids.preset_menu}" class="property-presets" 
          ${this.has_header ? 'style="font-size: 14px; font-weight: 600; letter-spacing: 0.5px"' : 
                              'style="margin-right: 10px; width: 100%;"'}
        >`;

      for( const child_key of this.children )
        menu += `<option value="${child_key}" ${(key === child_key) ? 'selected' : ''}>${this.db.index[child_key].name}</option>\n`;

      menu += `</select>`;
    }

    // create dialog
    this.dialog = new ModalDialog({
      id: this.ids.dialog, 
      title: exists(obj.title) ? obj.title : obj.name, 
      body: html,
      menu: menu,
      header: this.has_header ? header : '',
      classes: this.has_header ? `modal-header-extensions ${this.header_class}` : ''
    });
    
    // select from child instances
    if( this.children.length > 0 ) {
      this.key = this.children[0];
      document.getElementById(this.ids.preset_menu).addEventListener('change', (evt) => {
        console.log(`[Property Editor] Changing to preset ${evt.target.value}`, evt, this);
        this.key = evt.target.value;
        this.refresh();
      });
    }
      
    // generate html
    this.refresh();

    //sleep(100); // FIXME (flashing header image during load)
    //const self = this;
    //setTimeout(() => {self.dialog.show();}, 1000);

    // it would seem it automatically shows by default
    /*if( show ?? true ) {
      this.dialog.show();
    } */
  }

  /*
   * update dynamic elements on selection changes
   */
  refresh({key=null}={}) {
    if( exists(key) )
      this.key = key;

    key ??= this.key;

    const obj = this.db.flat[key];
    const self = this; // used in inline event handlers
    const fields = this.db.props[key];
 
    console.log(`[Property Editor] Refreshing configuration:\n  key=${key}\n  fields=${fields}`);

    let html = `<div class="flex flex-row" style="flex-grow: 1;"><div style="flex: 1 1 0px;">`;
    let menu = ``;
    let header = ``;
    
    /*if( exists(obj.thumbnail) ) {
      html += `<img src="${obj.thumbnail}" style="max-width: 300px; max-height: 150px">`; // when styled from CSS, gets overriden by .md-typeset
    }*/

    html += `<table id="${this.ids.table}" class="property-table">`;

    // tags / links
    if( nonempty(obj.links) ) {
      if( this.has_header ) {
        header += '<div style="margin-left: 10px">';
        for( const link_name in obj.links ) {
          const link = obj.links[link_name];
          header += `<a href="${link.url}" title="${link.url}" class="btn-oval" target="_blank">${link.name}</a>`;
        }
        header += '</div>';
      }
      else {
        const style = `style="padding-top: 5px; padding-bottom: 10px;"`;
        html += `<tr><td ${style}>Tags</td><td ${style}>`;
        for( const link_name in obj.links ) {
          const link = obj.links[link_name];
          html += `<a href="${link.url}" title="${link.url}" class="btn-${link.color} btn-md" target="_blank">${link.name}</a>`;
        }
        html += `</td></tr>\n`;
      }
    }

    // property fields
    for( let field_key of fields ) {
      const args = {
        db: this.db,
        key: field_key,
        value: this.db.flat[key][field_key],
        id: `${field_key}-control`,
      };
      html += `<tr><td style="white-space: nowrap;">${PropertyLabel(args)}</td><td style="width: 99%;">${PropertyField(args)}</td></tr>`;
    }

    header += `
      <table class="tag-oval monospace" style="min-width: 255px; border: 1px solid rgba(255,255,255,0.1);" title="This table shows the decode tokens/second during inference.\nThe GPU memory usage is an estimate as reported by the inference API.">
        <tr>
          <td align="center"><b>AGX Orin</b></td>
          <td align="center"><b>Nano Super</b></td>
          <td align="center"><b>Memory</b></td>
        </tr>
        <tr>
          <td align="center">32.1 t/s</td>
          <td align="center">19.2 t/s</td>
          <td align="center">3264 MB</td>
        </tr>
      </table>`;

    html += `
        </table>
      </div>
      <div id="${this.ids.code_panel}" style="margin-left: 10px; height: 400px; width: 500px;"> <!-- flex: 1 1 0px; max-height: 400px; -->
      </div>
    </div>`;

    let panel = document.getElementById(this.ids.container);
    panel.innerHTML = html;

    // add header graphics
    if( this.has_header )
      document.getElementById(this.ids.header_extensions).innerHTML = header;

    // create code panel
    this.codeEditor = new CodeEditor({
      id: this.ids.code_editor,
      parent: document.getElementById(this.ids.code_panel)
    });

    this.updateCode();

    // bind handlers to update the property values
    for( let control of panel.getElementsByClassName("property-field") ) {
      const event_key = control.dataset.key;
      control.addEventListener('change', this.setProperty.bind(this));
      control.addEventListener('keydown', (evt) => {
        console.log(`[Property Editor] Value of ${event_key} (id=${control.id}) changed to '${control.value}'`);
        if( event_key == 'url' )
          self.updateURL({id: evt.target.id, url: evt.target.value});
      });

      if( event_key == 'url' )
        this.updateURL({id: control.id, url: control.value});
    }
  }

  setProperty(args={}) {
    const id = args.target.id;
    const event_key = args.target.dataset.key;
    console.log(`[Property Editor] Value of ${event_key} (id=${id}) changed to '${args.target.value}'`);
    if( event_key == 'url' ) {
      panel.getElementById(`${id}-link`).href = control.value;
    }
    this.updateCode();
  }

  updateURL({id,url}) {
    if( !url.startsWith('http') && !url.startsWith('www') )
      url = 'http://' + url;

    let link = document.getElementById(`${id}-link`);
    link.href = url;
    link.title = url;
    console.log(`[Property Editor] Updated link (${id}) to ${url}`);
    //this.updateCode();
  }

  updateCode() {
    this.codeEditor.refresh(ConfigGenerator({db: this.db, key: this.key}));
  }
}
