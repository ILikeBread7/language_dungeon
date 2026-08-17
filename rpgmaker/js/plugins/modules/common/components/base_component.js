export class BaseComponent extends HTMLElement {

    /**
     * @returns {string}
     */
    static get componentDefaultTagName() {
        throw new Error('The componentDefaultTagName static getter needs to be overridden.');
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
            this._style.innerHTML = /*css*/`
                @layer ${this.componentCssLayerName} {
                    ${style}
                }
            `;
            this.appendChild(this._style);
        }
    }

    get componentTagName() {
        return this.tagName.toLowerCase();
    }

    get componentCssLayerName() {
        return 'component';
    }

}