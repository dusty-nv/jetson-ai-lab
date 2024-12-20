/*
 * Model registry (parsed from json)
 */
class ModelRegistry {
  /* path on the server to the model registry */
  static JSON_PATH="/assets/test_family.json";

  /* window.onload = (() => new ModelZoo(parent)) */
  constructor(parent) {
    this.parent = parent;

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

    /*.catch(error => {
        // Handle any errors
        console.error('Error:', error);
    });*/

    //parent.appendChild(htmlToNode('<p>HELLO ABC123 DEF456</p>'));
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

    console.warning(`could not find model ${model}`);
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
  

  
