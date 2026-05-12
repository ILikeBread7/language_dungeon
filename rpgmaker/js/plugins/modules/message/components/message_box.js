const BOX_HEIGHT = '25vh';
const HIDDEN_TOP = '100vh';

export class MessageBox extends HTMLElement {

    static get tag() {
        return 'ilb-message-box';
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        const messageContainer = document.createElement('div');
        messageContainer.part = messageContainer.id = 'message-container';
        const style = document.createElement('style');
        style.innerHTML = /*css*/`
            #${messageContainer.id} {
                width: 100%;
                height: ${BOX_HEIGHT};
                background: #000000;
                color: #ffffff;
                position: absolute;
                top: ${HIDDEN_TOP};
                transition: top 2s;
            }
        `;
        this.shadowRoot.append(style, messageContainer);
        this._messageContainer = messageContainer;
    }

    async messageBoxShow() {
        return await this._messageBoxTransition(/*css*/`calc(100vh - ${BOX_HEIGHT})`);
    }

    async messageBoxHide() {
        return await this._messageBoxTransition(HIDDEN_TOP);
    }

    /**
     * 
     * @param {string} top css value
     */
    async _messageBoxTransition(top) {
        return new Promise((resolve) => {
            this._messageContainer.style.top = top;
    
            const listener = element => {
                if (element.target !== this._messageContainer) {
                    return;
                }
    
                this._messageContainer.removeEventListener('transitionend', listener);
                resolve();
            };
            this._messageContainer.addEventListener('transitionend', listener);
        });
    }

    /**
     * 
     * @param {string} text May include html
     */
    messageBoxSetText(text) {
        this._messageContainer.innerHTML = text;
    }

}

customElements.define(MessageBox.tag, MessageBox);