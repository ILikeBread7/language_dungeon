const BOX_HEIGHT = '25vh';
const HIDDEN_TOP = '100vh';
const TRANSITION_TIME = '1s';
const CHAR_WRITE_WAIT = 200;

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
                transition: top ${TRANSITION_TIME};
                white-space: pre;
            }
        `;
        this.shadowRoot.append(style, messageContainer);
        this._messageContainer = messageContainer;
        this._messageTextBuffer = [];
        this._messageTextHtmlTagStack = [ messageContainer ];
        this._messageTextDisplayImmediately = false;
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

    /**
     * 
     * @param {string} text May include html
     * @description Displays the text one character at a time
     */
    async messageBoxDisplayText(text) {
        const split = this._splitTextForDisplay(text);
        for (const textPiece of split) {
            if (this._isHtmlOpeningTag(textPiece)) {
                const element = this._createElementFromHtml(textPiece);
                const currentTopElement = this._messageTextHtmlTagStack[this._messageTextHtmlTagStack.length - 1];
                currentTopElement.appendChild(element);
                this._messageTextHtmlTagStack.push(element);
            } else if (this._isHtmlClosingTag(textPiece)) {
                if (this._messageTextHtmlTagStack.length === 1) {
                    console.warn(`Closing html tag when no tag is opened!`);
                } else {
                    this._messageTextHtmlTagStack.pop();
                }
            } else {
                if (!this._messageTextDisplayImmediately) {
                    await new Promise(resolve => setTimeout(resolve, CHAR_WRITE_WAIT));
                }
                const currentTopElement = this._messageTextHtmlTagStack[this._messageTextHtmlTagStack.length - 1];
                currentTopElement.innerHTML += textPiece;
            }
        }

        // If there are some leftover open html tags remove them
        if (this._messageTextHtmlTagStack.length !== 1) {
            this._messageTextHtmlTagStack.splice(1);
        }
        this._messageTextDisplayImmediately = false;
    }

    messageBoxDisplayImmediately() {
        this._messageTextDisplayImmediately = true;
    }

    /**
     * 
     * @param {string} text May include html
     */
    _splitTextForDisplay(text) {
        return text.match(/<.*?>|.|\n/g);  // Split individual characters, but keep html tags intact
    }

    /**
     * 
     * @param {string} text 
     */
    _isHtmlOpeningTag(text) {
        return text[0] === '<' && text[1] !== '/';
    }

    /**
     * 
     * @param {string} text 
     */
    _isHtmlClosingTag(text) {
        return text.startsWith('</');
    }

    /**
     * 
     * @param {string} html 
     */
    _createElementFromHtml(html) {
        const template = document.createElement('template');
        template.innerHTML = html.trim();
        return template.content.firstElementChild;
    }

}

customElements.define(MessageBox.tag, MessageBox);