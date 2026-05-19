const LINES_PER_SCREEN = 4;
const LINES_CSS_VAR = '--lines';
const LINE_HEIGHT = 1.2;
const BOX_HEIGHT = `${LINES_PER_SCREEN * LINE_HEIGHT}em`;
const HIDDEN_TOP = '100vh';
const TRANSITION_TIME = '0.5s';
const CHAR_WRITE_WAIT = 50;
const VOID_TAGS = [
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr'
];

export class MessageBox extends HTMLElement {

    static get tag() {
        return 'ilb-message-box';
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        const messageBox = document.createElement('div');
        messageBox.part = messageBox.id = 'message-box';
        const messageContainer = document.createElement('div');
        messageContainer.part = messageContainer.id = 'message-container';
        messageContainer.style.setProperty(LINES_CSS_VAR, 4);
        messageBox.appendChild(messageContainer);
        const style = document.createElement('style');
        style.innerHTML = /*css*/`
            #${messageBox.id} {
                width: 100%;
                height: ${BOX_HEIGHT};
                background: #000000;
                color: #ffffff;
                position: absolute;
                top: ${HIDDEN_TOP};
                transition: top ${TRANSITION_TIME};
                white-space: pre-wrap;
                line-height: ${LINE_HEIGHT};
                overflow: hidden;
            }

            #${messageContainer.id} {
                width: 100%;
                height: calc(${LINE_HEIGHT}em * var(${LINES_CSS_VAR}));
                position: relative;
                top: calc(-${LINE_HEIGHT}em * (var(${LINES_CSS_VAR}) - ${LINES_PER_SCREEN}));
                transition: top ${TRANSITION_TIME};
            }
        `;
        this.shadowRoot.append(style, messageBox);

        this._wordSpan = document.createElement('span');
        this._wordShownPartSpan = document.createElement('span');
        this._wordHiddenPartSpan = document.createElement('span');
        this._wordHiddenPartSpan.style.visibility = 'hidden';
        this._wordSpan.append(this._wordShownPartSpan, this._wordHiddenPartSpan);

        this._messageBox = messageBox;
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
            this._messageBox.style.top = top;
    
            const listener = element => {
                if (element.target !== this._messageBox) {
                    return;
                }
    
                this._messageBox.removeEventListener('transitionend', listener);
                resolve();
            };
            this._messageBox.addEventListener('transitionend', listener);
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
        this._messageContainerReset();
        const tokens = this._splitTextWithHtmlForDisplay(text);
        for (const token of tokens) {
            if (this._isHtmlOpeningTag(token)) {
                const element = this._createElementFromHtml(token);
                const currentTopElement = this._messageTextHtmlTagStack[this._messageTextHtmlTagStack.length - 1];
                currentTopElement.appendChild(element);
                if (!this._isVoidTag(token)) {
                    this._messageTextHtmlTagStack.push(element);
                }
            } else if (this._isHtmlClosingTag(token)) {
                if (this._messageTextHtmlTagStack.length === 1) {
                    console.warn(`Closing html tag when no tag is opened!`);
                } else {
                    this._messageTextHtmlTagStack.pop();
                }
            } else {
                const currentTopElement = this._messageTextHtmlTagStack[this._messageTextHtmlTagStack.length - 1];
                this._wordHiddenPartSpan.innerHTML = token;
                currentTopElement.appendChild(this._wordSpan);

                for (const char of token) {
                    const messageBoxBottom = this._messageContainer.getBoundingClientRect().bottom;
                    if (
                        this._wordHiddenPartSpan.getBoundingClientRect().top >= messageBoxBottom
                        || this._wordShownPartSpan.getBoundingClientRect().bottom > messageBoxBottom
                    ) {
                        await this._messageContainerScroll();
                    }

                    if (!this._messageTextDisplayImmediately && !this._isWhitespace(char)) {
                        await new Promise(resolve => setTimeout(resolve, CHAR_WRITE_WAIT));
                    }
                    this._wordShownPartSpan.innerHTML += char;
                    this._wordHiddenPartSpan.innerHTML = this._wordHiddenPartSpan.innerHTML.substring(1);
                }

                currentTopElement.removeChild(this._wordSpan);
                currentTopElement.innerHTML += token;
                this._wordShownPartSpan.innerHTML = '';
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
    _splitTextWithHtmlForDisplay(text) {
        return text.match(/<.*?>|[^<>]+/g) || [];  // Split html tags from text
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

    /**
     * 
     * @param {string} char 
     * @returns 
     */
    _isWhitespace(char) {
        return char.trim() === '';
    }

    /**
     * 
     * @param {string} tag 
     */
    _isVoidTag(tag) {
        const tagName = tag.substring(1, tag.length - 1).split(' ')[0];
        return VOID_TAGS.includes(tagName);
    }

    async _messageContainerScroll() {
        return new Promise(resolve => {
            this._messageContainer.style.setProperty(LINES_CSS_VAR, Number(this._messageContainer.style.getPropertyValue(LINES_CSS_VAR)) + 1);
            const listener = event => {
                if (event.target !== this._messageContainer) {
                    return;
                }
    
                this._messageContainer.removeEventListener('transitionend', listener);
                resolve();
            };
            this._messageContainer.addEventListener('transitionend', listener);
        })
    }

    _messageContainerReset() {
        this._messageContainer.innerHTML = '';
        this._messageContainer.style.setProperty(LINES_CSS_VAR, LINES_PER_SCREEN);
        this._messageContainer.style.setProperty('transition-duration', '0s');
        void this._messageContainer.clientWidth;
        this._messageContainer.style.removeProperty('transition-duration');
    }

}

customElements.define(MessageBox.tag, MessageBox);