/**
 * https://stackoverflow.com/a/35385518
 * 
 * const td = htmlToNode('<td>foo</td>'),
 *       div = htmlToNode('<div><span>nested</span> <span>stuff</span></div>');
 */

/**
 * @param {String} HTML representing a single node (which might be an Element,a text node, or a comment).
 * @return {Node}
 */
function htmlToNode(html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    const nNodes = template.content.childNodes.length;
    if (nNodes !== 1) {
        throw new Error(
            `html parameter must represent a single node; got ${nNodes}. ` +
            'Note that leading or trailing spaces around an element in your ' +
            'HTML, like " <img/> ", get parsed as text nodes neighbouring ' +
            'the element; call .trim() on your input to avoid this.'
        );
    }
    return template.content.firstChild;
}

/**
 * @param {String} HTML representing any number of sibling nodes
 * @return {NodeList} 
 */
function htmlToNodes(html) {
    const template = document.createElement('template');
    template.innerHTML = html;
    return template.content.childNodes;
}


/*
 * Remove an element from DOM (https://stackoverflow.com/a/50475223)
 * document.getElementsByID('my_div').remove();
 */
Element.prototype.remove = function() {
    this.parentElement.removeChild(this);
}

NodeList.prototype.remove = HTMLCollection.prototype.remove = function() {
    for(var i = this.length - 1; i >= 0; i--) {
        if(this[i] && this[i].parentElement) {
            this[i].parentElement.removeChild(this[i]);
        }
    }
}