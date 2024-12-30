/*
 * Search and navigate through registry resources
 */
import { 
  GraphTags, exists, include, is_string, is_list, as_element, htmlToNode 
} from '../nanolab.js';

export class GraphBrowser {
  /*
   * Create HTML elements and add them to parent, if provided.
   * Required args: registry, parent
   * Optional args: id, tags, layout, filter_tags, filter_op)
   */
  constructor(args) {
    this.id = args.id ?? 'graph-browser';
    this.node = null;
    this.parent = as_element(args.parent);
    this.layout = args.layout ?? 'grid';
    this.registry = args.registry;
    this.filter_tags = args.filter_tags ?? [];
    this.filter_op = args.filter_op ?? 'and';
    
    this.init();
    this.filter();
  }
  
  /*
   * Combine the steps of fetching the json and building the browser
   * @see RegistryBrowser constructor for arguments
   */
  static async load(args) {
    args.url ??= '/assets/registry.json';
    args.registry = await GraphDB.load(args.url);
    return new GraphBrowser(args);
  }

  /*
   * Query the registry for resources that have matching tags.
   * This changes the filtering tags and mode (between 'or' and 'and')
   */
  filter(args={}) {
    console.log('Applying filters for query:', args);
    if( 'tags' in args )
      this.filter_tags = args.tags;
    if( 'op' in args )
      this.filter_op = args.op;
    this.filtered = this.registry.query({
      where: 'parents',
      in: [this.filter_tags]
    });
    if( args.update ?? true )
      this.update();
    return this.filtered;
  }

  /*
   * Generate the static html template for the dynamic elements
   */
  init() {
    const select2_id = `${this.id}-select-tags`;
    const self = this; // use in nested functions

    let html = `
      <div class="flex flex-column">
        <div class="flex flex-row">
          <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
          <style>
            .select2-tree-option:before { content: "- "; }
    `;

    for( let i=1; i < 10; i++ ) {
      html += `.select2-tree-depth-${i} { padding-left: ${i}em; } \n`
    }
    
    html += `
      </style>
      <select id="${select2_id}" class="${this.id}-select2" multiple style="flex-grow: 1;">
    `;

    html += this.gatherReduce({
      key: this.registry.roots,
      func: (key, data, depth) => {
      return `<option class="select2-tree-option select2-tree-depth-${depth}" 
        ${self.filter_tags.includes(key) ? "selected" : ""} 
        value="${key}">${self.registry.index[key].name}</option>`
        + data;
    }});

    const filter_op_help = "OR will search for any of the tags.\nAND will search for resources having all the tags."
    const browser_layout_help = "Grid or list layout"

    html += `</select>
          <div style="margin-left: 10px;" title="${filter_op_help}">
            <input id="toggle-on" class="toggle toggle-left" name="toggle" value="true" type="radio" ${this.filter_op == "and" ? "checked" : ""}>
            <label for="toggle-on" class="toggle-btn">And</label>
            <input id="toggle-off" class="toggle toggle-right" name="toggle" value="false" type="radio" ${this.filter_op == "or" ? "checked" : ""}>
            <label for="toggle-off" class="toggle-btn">Or</label>
          </div>
          <div style="margin-left: 10px;" title="${browser_layout_help}">
            <input id="toggle-on-grid" class="toggle toggle-left" name="toggle2" value="true" type="radio" checked>
            <label for="toggle-on-grid" class="toggle-btn bi bi-grid-3x3-gap-fill"></label>
            <input id="toggle-off-grid" class="toggle toggle-right" name="toggle2" value="false" type="radio"}>
            <label for="toggle-off-grid" class="toggle-btn bi bi-list-ul"></label>
          </div>
        </div>
        <div id="${this.id}-card-container">
    `;

    html += `</div></div>`;

    this.node = htmlToNode(html.trim());
    this.parent.appendChild(this.node);

    $(`#toggle-on`).on('click', () => self.filter({op: 'and'})); 
    $(`#toggle-off`).on('click', () => self.filter({op: 'or'})); 

    $(`#${select2_id}`).select2({
      allowClear: true,
      tags: true,
      tokenSeparators: [',', ' '],
      placeholder: 'Select tags to filter',
      templateResult: function (data) { 
        // https://stackoverflow.com/a/30948247
        if (!data.element) {
          return data.text;
        }
    
        var $element = $(data.element);
        var $wrapper = $('<span></span>');

        $wrapper.addClass($element[0].className);
        $wrapper.text(data.text);
    
        return $wrapper;
      }
    });

    $(`#${select2_id}`).on('change', (evt) => {
      const tags = Array.from(evt.target.selectedOptions)
                        .map(({ value }) => value);
      console.log('User changed search tags:', tags);
      self.filter({tags: tags});
    });
  }

  /*
   * Generates HTML for grid view
   */
  layoutGrid(key, data, depth) {
    const name = this.registry.index[key].name;
    console.log('LAYOUT_GRID  key', key, 'name', name, 'data', data, 'depth', depth);
    if( depth == 0 ) {
      return data;
    }
    else if( depth == 1 ) {
      return `
        <div>
          <h1>${name}</h1>
          <div class="flex flex-row">
            ${data}
          </div>
        </div>`;
    }
    else if( depth == 2 ) {
      return `
        <div class="card align-top" id="${key}_card">
          <div class="card-body">
            <span class="card-title">${name}</span>
            ${data}
          </div>
        </div>`;
    }
    else if( depth == 3 ) {
      for( let tag of this.registry.flat[key].tags ) {
        const resource = this.registry.index[tag];
        if( resource.pin ) {
          data = data + `
            <button data-model="${key}" class="btn-green btn-sm btn-open-model">${resource.name}</button>
          `;
        }
      }
      return `
        <div class="card-sm align-top" id="${key}_card">
          <div class="card-body-sm">
            <div class="card-title-sm">${name}</div>
            ${data}
          </div>
        </div>`;
    }
    return data;
  }

  /*
   * Generate the templated html and add elements to the dom
   */
  update(index) {
    if( !exists(index) )
      index = this.filtered;

    console.log('Updating layout with:', index);

    // reset dynamic cards
    let card_container = $(`#${this.id}-card-container`);
    card_container.empty(); 

    // layout functions
    const layouts = {
      grid: this.layoutGrid.bind(this)
    };

    if( !(this.layout in layouts) ) {
      console.error(`Unsupported layout requested:  '${this.layout}`);
      return;
    }

    // generate dynamic content
    let html = `<div style="margin-top: 15px;">`;

    html += this.gatherReduce({
      key: this.registry.roots, 
      func: layouts[this.layout]
    });

    html += `</div>`;

    /*for( key in index ) {
      const res = index[key];

      html += `
        <div class="card-sm align-top" id="${key}">
          <div class="card-body-sm">
            <div class="card-title-sm">${res.name}</div>`;

      html += `</div></div>`;
    }*/

    card_container.html(html);

    $('.btn-open-model').on('click', (evt) => {
      console.log(`Opening launcher dialog`, evt);
      const dialog = new PropertyEditor({
        key: evt.target.dataset.model,
        registry: this.registry,
      });
    });
    
    /*for( let button of node.getElementsByClassName("btn-open-model") ) {
      button.addEventListener('click', this.onModelOpen.bind(this));
    }*/
  }

  /*
   * Recursively walk resource tree to generate web controls.
   * The callback function should return html for that element.
   */
  gatherReduce(args) {
    if( !exists(args.key) || !exists(args.func) ) {
      console.error(`RegistryBrowser.gatherReduce() requires 'key' and 'func' arguments`, args);
      return;
    }
    args.data = '';
    if( is_string(args.key) ) {
      for( let child of this.registry.children[args.key] )
        args.data += this.gatherReduce({
          key: child, 
          func: args.func,
          depth: args.depth+1,
          data: '',
        });
      return args.func(args.key, args.data, args.depth ?? 0);
    }
    else {
      for( let root in args.key ) {
        if( is_list(args.key) ) // list[key] instead of dict[key]
          root = args.key[root]; 
        args.data += this.gatherReduce({
          key: root, 
          func: args.func,
          depth: args.depth ?? 0,
          data: '',
        });
      }
    }
    return args.data;
  }

  /*
   * Remove this from the DOM
   */
  remove() {
    if( !exists(this.node) )
      return;

    this.node.remove();
    this.node = null;
  }
}






/*    
    fetch(ModelRegistry.JSON_PATH)
    .then(response => response.json())
    .then(registry => {
        console.log('Model Registry', registry);
        this.registry = registry;

        for( let model_type_id in registry ) {
          const model_type = registry[model_type_id];

          let html = `
            <div id="${model_type_id}" style="margin-bottom: 25px;">
              <div class="group-title">${model_type.name}</div>
              <div class="flex flex-row">`;

          for(let group_id in model_type.groups) {
            const group = model_type.groups[group_id];

            html += `
              <div class="card align-top" id="${group_id}">
                <div class="card-body">
                  <span class="card-title">${group.name}</span>`;
            
            for( let model_id in group.models ) {
              const model = group.models[model_id];

              html += `
                <div class="card-sm align-top" id="${model_id}">
                  <div class="card-body-sm">
                    <div class="card-title-sm">${model.name}</div>`;
                  
              for( let idx in model.devices ) {
                html += `<button data-model="${model_id}" class="btn-green btn-sm btn-open-model">${model.devices[idx]}</button>`;
              }
              
              html += `</div></div>`;
            }
              
            html += `</div></div>`;
          };

          html += `</div></div>`;
          let node = htmlToNode(html.trim());

          for( let button of node.getElementsByClassName("btn-open-model") ) {
            button.addEventListener('click', this.onModelOpen.bind(this));
          }

          parent.appendChild(node);
        }});
  }

  findModel(model) {
    for( let model_type_id in this.registry ) {
      const model_type = this.registry[model_type_id];
      for( let group_id in model_type.groups ) {
        const group = model_type.groups[group_id];
        for( let model_id in group.models ) {
          if( model == model_id ) {
            return group.models[model_id];
          }
        }    
      }
    }

    console.warn(`could not find model ${model}`);
  }

  findConfig(config) {
    for( let model_type_id in this.registry ) {
      const model_type = this.registry[model_type_id];
      for( let group_id in model_type.groups ) {
        const group = model_type.groups[group_id];
        for( let model_id in group.models ) {
          const model = group.models[model_id];
          for( let model_config of model.configs ) {
            const hasKeys = function() {
              for( key in config ) {
                if( !(key in model_config) )
                  return false;
                if( config[key] != model_config[key] )
                  return false;
              }
              return true;
            }

            if( hasKeys )
              return model_config;
          }
        }    
      }
    }

    console.warning(`could not find model config for ${config}`);
  }

  convertForWeb(option) {
    if( option == 'api' )
      return 'API';
    else
      return capitalize(option);
  }

  onModelOpen(evt) {
    const model_id = evt.target.dataset.model;
    console.log(`[OPEN] ${model_id}`, evt, this);
    const model = this.findModel(model_id);
    console.log(model);

    let html = `
      <div class="flex flex-column">
        <div>
          <select style="margin-right: 10px;"> 
    `;

    for( let link_name in model.links ) {
      const link = model.links[link_name];
      console.log('link', link_name, link);
      html += `<a href="${link.url}" class="btn-${link.color} btn-med" target="_blank">${link_name}</a>`;
    }

    const style = `margin-top: 10px; margin-right: 5px;`;
    html += `</div><div style="margin-top: 15px;">`;
    var options = {};

    for( const config of model.configs ) {
      for( const key in config ) {
        const value = config[key];

        if( key == "url" )
          continue;

        if( !(key in options) )
          options[key] = [];

        if( !options[key].includes(value) )
          options[key].push(value);
      }
    }

    for( const key in options ) {
      html += `<span style="color: #222222; text-shadow: none; margin-right: 5px; font-weight: 500;">${this.convertForWeb(key)}</span>`;
      html += `<select style="margin-right: 10px;" class="model-config-select" data-key="${key}" data-model="${model_id}">`;
      for( const value of options[key] )
        html += `<option value="${value}">${value}</option>`;
      html += `</select>`;
    }
    
    html += "</div></div>";

    let dialog = new ModalDialog(`${model_id}_modal`, model_id, html);
    dialog.show();
    
    //$(`.model-config-select`).select2();
    $(`.model-config-select`).each(function() { 
      $(this).on("change", function(evt) {
        console.log('select CHANGED', evt, $(this), 'VALUE=', this.value);
        let config = {};
        $(`.model-config-select`).each(function() { config[this.dataset.key] = this.value });
        config[this.dataset.key] = this.value;
        console.log('new CONFIG', config);
        for( let key in config ) {
          if( key == this.dataset.key )
            continue;
          for( let option of options[key] ) {

          }
        }
    })});
  }
}
*/ 

  
