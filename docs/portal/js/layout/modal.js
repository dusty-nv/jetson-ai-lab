#!/usr/bin/env node
import { 
  htmlToNode, exists
} from '../nanolab.js';

/*
 * Modal dialog maker
 */
export class ModalDialog {
  
  constructor({id, title, body}) {
    this.id = id;
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

    /*<div class="modal-footer">Footer</div>*/

    this.node = htmlToNode(html.trim()); //document.getElementById(id);
    this.body = this.node.getElementsByClassName("modal-body")[0];

    if( exists(body) ) {
      this.body.appendChild(htmlToNode(body.trim()));
    }

    document.getElementById('nanolab_container').insertAdjacentElement("afterend", this.node);
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
    console.log(`Closing dialog ${this.id}`);
    this.hide();

    window.setTimeout(() => {
      this.node.remove();
    }, 200);
  }
}