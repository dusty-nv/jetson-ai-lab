#!/usr/bin/env node
import { 
  PropertyField, PropertyLabel, ModalDialog, 
  escapeHTML, exists, nonempty, sleep,
} from '../nanolab.js';

import '../../dist/composerize/composerize.js';
import '../../dist/prism/prism.js';

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
      throw new Error(`could not find '${this.key}' trying to open model setup`);

    const obj = this.db.flat[this.key];

    this.header_class = obj.header; // extended headers
    this.has_header = exists(this.header_class);
    this.children = this.db.children[this.key];

    // create dialog and placeholder for dynamic content
    console.log(`[Property Editor] Opening settings for '${this.key}'`);

    let html = `<div id="${this.id}-container" class="flex flex-row" style="width: 100%;">`;
    let header = `<div id="${this.id}-header-extensions" style="width: 45%;"></div>`;
    let menu = ``;

    // presets menu (if this resource has children)
    if( this.children.length > 0 ) {
      //menu += `<label for="${this.id}-preset-select" style="margin-right: 5px;">Preset</label>`;
      menu += `
        <select id="${this.id}-preset-menu" class="property-presets" 
          ${this.has_header ? '' : 'style="margin-right: 10px; width: 100%;"'}
        >`;

      for( const child_key of this.children )
        menu += `<option value="${child_key}" ${(key === child_key) ? 'selected' : ''}>${this.db.index[child_key].name}</option>\n`;

      menu += `</select>`;
    }

    // create dialog
    this.dialog = new ModalDialog({
      id: `${this.id}-dialog`, 
      title: exists(obj.title) ? obj.title : obj.name, 
      body: html,
      menu: menu,
      header: this.has_header ? header : '',
      classes: this.has_header ? `modal-header-extensions ${this.header_class}` : ''
    });
    
    // select from child instances
    if( this.children.length > 0 ) {
      this.key = this.children[0];
      document.getElementById(`${this.id}-preset-menu`).addEventListener('change', (evt) => {
        console.log(`[Property Editor] Changing to preset ${evt.target.value}`, evt, this);
        this.key = evt.target.value;
        this.refresh();
      });
    }
      
    // generate html
    this.refresh();

    sleep(100); // FIXME (flashing header image during load)

    if( show ?? true )
      this.dialog.show();
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

    let html = `<div class="flex flex-row" style="flex-grow: 1;"><div style="flex-grow: 1;">`;
    let menu = ``;
    let header = ``;
    
    /*if( exists(obj.thumbnail) ) {
      html += `<img src="${obj.thumbnail}" style="max-width: 300px; max-height: 150px">`; // when styled from CSS, gets overriden by .md-typeset
    }*/

    html += `<table id="${this.id}-table" class="property-table">`;

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

    this.cmd = composerize('docker run -it --rm ubuntu:latest', null, 'latest', 2);
    this.cmd = this.cmd.substring(this.cmd.indexOf("\n") + 1);

    // dynamic header & main panel
    html += `
        </table>
      </div>
      <div id="${this.id}-launch-panel" style="margin-left: 10px; flex-grow: 1;">
        <div>
          <div id="${this.id}-code-tabs" class="btn-group">
            <input type="radio" id="toggle-on2" name="toggle2" checked><label for="toggle-on2">docker run</label><input type="radio" id="toggle-off2" name="toggle2"><label for="toggle-off2">docker compose</label><input type="radio" id="${this.id}-btn-copy" name="toggle2"><label for="${this.id}-btn-copy"><i class="bi bi-copy" title="Copy code to clipboard."></i></label>
          </div>
          <div class="code-container" id="${this.id}-code-container">
            <pre><code class="language-yaml">${this.cmd}</code></pre>
          </div>
        </div>
      </div>
    </div>`;

    let panel = document.getElementById(`${this.id}-container`);
    panel.innerHTML = html;

    if( this.has_header )
      document.getElementById(`${this.id}-header-extensions`).innerHTML = header;

    /*document.getElementById(`${this.id}-btn-copy`).addEventListener('click', (evt) => {
      console.log(`[Property Editor] Copying text from code block to clipboard`);
      navigator.clipboard.writeText(this.cmd);
    });*/

    Prism.highlightAllUnder(document.getElementById(`${this.id}-code-container`));

    for( let control of panel.getElementsByClassName("property-field") ) {
      const event_key = control.dataset.key;

      control.addEventListener('change', this.setProperty.bind(this));
      control.addEventListener('keydown', (evt) => {
        console.log(`[Property Editor] Value of ${event_key} (id=${control.id}) changed to '${control.value}'`);
        if( event_key == 'url' ) {
          self.updateURL({id: evt.target.id, url: evt.target.value});
        }
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
  }

  updateURL({id,url}) {
    if( !url.startsWith('http') && !url.startsWith('www') )
      url = 'http://' + url;

    let link = document.getElementById(`${id}-link`);
    link.href = url;
    link.title = url;
    console.log(`[Property Editor] Updated link (${id}) to ${url}`);
  }
}
