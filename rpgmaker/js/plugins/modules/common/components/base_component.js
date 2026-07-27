export class BaseComponent extends HTMLElement {

    static get componentDefaultTagName() {
        return 'base-component';
    }

    get componentCssStyle() {
        return '';
    }

    /**
     * 
     * @param {string} [tagName] 
     */
    static register(tagName = this.componentDefaultTagName) {
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

        const style = this.componentCssStyle;
        if (style) {
            this._style = document.createElement('style');
            this._style.innerHTML = style;
            this.appendChild(this._style);
        }
    }

    get componentTagName() {
        return this.tagName.toLowerCase();
    }

}