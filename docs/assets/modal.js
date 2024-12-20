/*
 * Modal dialog maker
 */
class ModalDialog {
  
  constructor(id, title, body) {
    let html = `
      <div class="modal" id="${id}" >
        <div class="modal-content">
          <div class="modal-header">
            <span class="modal-close">&times;</span>
            <span class="modal-title">${title}</span>
          </div>
          <div class="modal-body">
          </div>
        </div>
      </div>`;

      /*
       *             <a href="https://huggingface.co/meta-llama/Llama-3.2-1B" class="btn-blue btn-med" target="_blank">Meta</a>
            <a href="https://huggingface.co/meta-llama/Llama-3.2-1B" class="btn-yellow btn-med" target="_blank">Hugging Face</a>
            <div>Llama 3 - 8GB</div>
            <div>Llama 4 - 18GB</div>
      */
      /*<div class="modal-footer">
          Footer
      </div>*/

    this.id = id;
    this.node = htmlToNode(html.trim()); //document.getElementById(id);
    this.body = this.node.getElementsByClassName("modal-body")[0];

    if( exists(body) ) {
      this.body.appendChild(htmlToNode(body.trim()));
    }

    document.getElementById('model_registry').insertAdjacentElement("afterend", this.node);
    //document.body.appendChild(this.node); //prepend(this.node);
    
    const close_btn = this.node.getElementsByClassName("modal-close")[0];
    close_btn.addEventListener('click', () => {this.remove();} );

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
      if( event.target == this.node ) {
        this.remove();
      }
    }
  }

  show() {
    this.node.style.display = "block";
    return this;
  }

  hide() {
    this.node.style.display = "none";
    return this;
  }

  remove() {
    console.log(`[CLOSE] ${this.id}`);
    this.hide();

    window.setTimeout(() => {
      this.node.remove();
    }, 200);
  }
}