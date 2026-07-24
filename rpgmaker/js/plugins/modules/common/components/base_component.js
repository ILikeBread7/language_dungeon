export class BaseComponent extends HTMLElement {

    static get tagName() {
        return 'base-component';
    }

    get componentTag() {
        return this.tagName.toLowerCase();
    }

    /**
     * 
     * @param {string} [tagName] 
     */
    static register(tagName = this.tagName) {
        if (!customElements.get(tagName)) {
            customElements.define(tagName, this);
        }
    }

    /**
     * 
     * @param { {
     *  wait: (time: number) => Promise<void>
     * } } dependencies 
     */
    constructor(dependencies = { wait: time => new Promise(resolve => setTimeout(resolve, time)) }) {
        super();
        this._dependencies = dependencies;

        const style = this.cssStyle;
        if (style) {
            this._style = document.createElement('style');
            this._style.innerHTML = style;
            this.appendChild(this._style);
        }
    }

}