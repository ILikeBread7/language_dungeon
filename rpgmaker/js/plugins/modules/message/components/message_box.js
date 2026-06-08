const LINES_CSS_VAR = '--lines';

const VISIBILITY_STATE = Object.freeze({
    HIDDEN: 'hidden',
    SHOWN: 'shown'
});

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

    /**
     * 
     * @param {string} [tagName] 
     */
    static register(tagName) {
        registerMessageBox(tagName);
    }

    /**
     * 
     * @param { {
     *  wait: (time: number) => Promise<void>
     * } } dependencies 
     */
    constructor(dependencies = { wait: time => new Promise(resolve => setTimeout(resolve, time)) }) {
        super();
        this.attachShadow({ mode: 'open' });
        this._dependencies = dependencies;
        this._waitForInputResolve = null;

        const messageBox = document.createElement('div');
        this.dataset.state = VISIBILITY_STATE.HIDDEN;
        messageBox.part = messageBox.id = 'message-box';

        const messageContainer = document.createElement('div');
        messageContainer.part = messageContainer.id = 'message-container';
        messageContainer.style.setProperty(LINES_CSS_VAR, 4);

        const hiddenWholeTextSpan = document.createElement('span');
        hiddenWholeTextSpan.id = 'whole-text-span';

        const displayedTextSpan = document.createElement('span');

        messageContainer.append(hiddenWholeTextSpan, displayedTextSpan);
        messageBox.appendChild(messageContainer);

        const nextPageIndicator = document.createElement('div');
        nextPageIndicator.part = nextPageIndicator.id = 'next-page-indicator';
        nextPageIndicator.dataset.state = VISIBILITY_STATE.HIDDEN;
        messageBox.appendChild(nextPageIndicator);

        const style = document.createElement('style');
        style.innerHTML = /*css*/`
            :host {
                --lines-per-screen: 4;
                --line-height: 1.2;
                --transition-time: 0.5s;
                --char-write-wait-ms: 50;
                --box-height: calc(1em * var(--lines-per-screen) * var(--line-height));
                visibility: hidden;
            }

            :host([data-state="${VISIBILITY_STATE.SHOWN}"]) #${messageBox.id} {
                opacity: 1;
            }

            :host([data-state="${VISIBILITY_STATE.HIDDEN}"]) #${messageBox.id} {
                opacity: 0;
            }

            #${messageBox.id} {
                width: 100%;
                height: var(--box-height);
                background: #000000;
                color: #ffffff;
                position: absolute;
                transition-property: opacity;
                transition-duration: var(--transition-time);
                white-space: pre-wrap;
                line-height: var(--line-height);
                overflow: hidden;
            }

            #${messageContainer.id} {
                --container-height: calc(1em * var(--line-height) * var(${LINES_CSS_VAR}));

                width: 100%;
                height: var(--container-height);
                position: relative;
                top: calc(-1em * var(--line-height) * (var(${LINES_CSS_VAR}) - var(--lines-per-screen)));
                transition: top var(--transition-time);
            }

            #${hiddenWholeTextSpan.id} {
                position: absolute;
                visibility: hidden;
                z-index: -1;
            }

            #${nextPageIndicator.id} {
                --triangle-side-length: 0.325em;
                --triangle-height: calc(var(--triangle-side-length) * 0.87);
                position: absolute;
                bottom: calc(var(--triangle-height) * 1.5);
                right: 0.125em;
                width: var(--triangle-side-length);
                height: var(--triangle-height);
                clip-path: polygon(0% 0%, 100% 0%, 50% 100%);
                background: #ffffff;
            }

            #${nextPageIndicator.id}[data-state="${VISIBILITY_STATE.SHOWN}"] {
                animation-name: floating;
                animation-duration: 1s;
                animation-iteration-count: infinite;
                visibility: visible;
            }

            #${nextPageIndicator.id}[data-state="${VISIBILITY_STATE.HIDDEN}"] {
                visibility: hidden;
            }

            @keyframes floating {
                0% {
                    transform: translateY(0%);
                }
                50% {
                    transform: translateY(100%);
                }
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
        this._nextPageIndicator = nextPageIndicator;
        this._hiddenWholeTextSpan = hiddenWholeTextSpan;
        this._displayedTextSpan = displayedTextSpan;
        this._messageTextBuffer = [];
        this._messageTextHtmlTagStack = [ { element: displayedTextSpan, isVisible: true } ];
        this._messageTextDisplayImmediately = false;
        this._preventScroll = false;

        window.addEventListener('resize', () => this._adjustContainerScrollAfterResize());

        // Take some property values from css variables
        new MutationObserver(() => this._saveCssVariables()).observe(this, { attributes: true });
    }

    async messageBoxShow() {
        this.style.setProperty('visibility', 'visible');
        await this._messageBoxChangeState(VISIBILITY_STATE.SHOWN);
    }

    async messageBoxHide() {
        await this._messageBoxChangeState(VISIBILITY_STATE.HIDDEN);
        this.style.removeProperty('visibility');
    }

    /**
     * 
     * @param {string} top css value
     * @returns {Promise<void>}
     */
    async _messageBoxChangeState(state) {
        return new Promise((resolve) => {
            this.dataset.state = state;
    
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
     * @description Displays the text one character at a time
     */
    async messageBoxDisplayText(text) {
        if (!this.isVisible()) {
            await this.messageBoxShow();
        }
        this._messageContainerReset();
        this._hiddenWholeTextSpan.innerHTML = text;

        const tokens = this._splitTextWithHtmlForDisplay(text);
        for (const token of tokens) {
            if (this._isHtmlOpeningTag(token)) {
                const element = this._createElementFromHtml(token);
                const currentTopElement = this._messageTextHtmlTagStack[this._messageTextHtmlTagStack.length - 1].element;
                currentTopElement.appendChild(element);
                if (!this._isVoidTag(token)) {
                    const isVisible = element.checkVisibility({ visibilityProperty: true, opacityProperty: true, contentVisibilityAuto: true });
                    this._messageTextHtmlTagStack.push({ element, isVisible });
                }
            } else if (this._isHtmlClosingTag(token)) {
                if (this._messageTextHtmlTagStack.length === 1) {
                    console.warn(`Closing html tag when no tag is opened!`);
                } else {
                    this._messageTextHtmlTagStack.pop();
                }
            } else {
                const { element: currentTopElement, isVisible } = this._messageTextHtmlTagStack[this._messageTextHtmlTagStack.length - 1];
                
                if (isVisible) {
                    currentTopElement.appendChild(this._wordSpan);
                    this._wordHiddenPartSpan.innerHTML = token;

                    for (const char of token) {
                        const messageBoxBottom = this._messageContainer.getBoundingClientRect().bottom;
                        if (this._wordHiddenPartSpan.getBoundingClientRect().top >= messageBoxBottom - this._textUnderScreenTolerance) {
                            this._nextPageIndicator.dataset.state = VISIBILITY_STATE.SHOWN;
                            await this._waitForInput();
                            this._nextPageIndicator.dataset.state = VISIBILITY_STATE.HIDDEN;
                            if (this._preventScroll) {
                                this._preventScroll = false;
                            } else {
                                await this._messageContainerScroll();
                            }
                            this._messageTextDisplayImmediately = false;
                        }
    
                        if (!this._messageTextDisplayImmediately && !this._isWhitespace(char)) {
                            await this._dependencies.wait(this._charWriteWaitMs);
                        }
                        this._wordShownPartSpan.innerHTML += char;
                        this._wordHiddenPartSpan.innerHTML = this._wordHiddenPartSpan.innerHTML.substring(1);
                    }

                    currentTopElement.removeChild(this._wordSpan);
                    currentTopElement.innerHTML += token;
                    this._wordShownPartSpan.innerHTML = '';
                } else {
                    currentTopElement.innerHTML += token;
                }
            }
        }

        // If there are some leftover open html tags remove them
        if (this._messageTextHtmlTagStack.length !== 1) {
            this._messageTextHtmlTagStack.splice(1);
        }

        await this._waitForInput();
        this._messageContainerReset();
    }

    /**
     * 
     * @param {string} text 
     */
    async messageBoxDisplaySingleMessage(text) {
        await this.messageBoxDisplayText(text);
        await this.messageBoxHide();
    }

    messageBoxDisplayImmediately() {
        this._messageTextDisplayImmediately = true;
    }

    /**
     * 
     * @returns {Promise<void>}
     */
    async _waitForInput() {
        return new Promise(resolve => {
            this._waitForInputResolve = resolve;
        });
    }

    input() {
        if (this._waitForInputResolve) {
            this._waitForInputResolve();
            this._waitForInputResolve = null;
        }
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

    _findWholeTextLinesNumber() {
        return this._findLinesNumber(this._hiddenWholeTextSpan);
    }

    _findShownTextLinesNumber() {
        return this._findLinesNumber(this._displayedTextSpan);
    }

    /**
     * 
     * @param {HTMLElement} element 
     */
    _findLinesNumber(element) {
        const style = getComputedStyle(element);
        const lineHeight = this._getNumberFromCssPxString(style.lineHeight);
        return Math.ceil(element.getBoundingClientRect().height / lineHeight);
    }

    /**
     * 
     * @param {string} cssValue css value in pixels
     */
    _getNumberFromCssPxString(cssValue) {
        return Number(cssValue.substring(0, cssValue.length - 2));
    }

    async _messageContainerScroll() {
        return new Promise(resolve => {
            this._messageContainer.style.setProperty(
                LINES_CSS_VAR, 
                Math.min(
                    Number(this._messageContainer.style.getPropertyValue(LINES_CSS_VAR)) + this._linesPerScreen,
                    this._findWholeTextLinesNumber()
                )
            );
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

    _adjustContainerScrollAfterResize() {
        // Temporarily remove the hidden part span from document flow
        // so it doesn't affect the shown lines number calculations
        this._wordHiddenPartSpan.style.setProperty('position', 'absolute');

        this._messageContainer.style.setProperty(
            LINES_CSS_VAR,
            Math.max(
                Math.min(
                    this._roundToNearestFullLinesPerScreenNumber(this._findShownTextLinesNumber()),
                    this._findWholeTextLinesNumber()
                ),
                this._linesPerScreen
            )
        );

        this._wordHiddenPartSpan.style.removeProperty('position');

        this._preventScroll = this._wordHiddenPartSpan.innerHTML && this._wordHiddenPartSpan.getBoundingClientRect().top < this._wordShownPartSpan.getBoundingClientRect().bottom;
    }

    _messageContainerReset() {
        this._messageTextDisplayImmediately = false;
        this._displayedTextSpan.innerHTML = '';
        this._preventMessageContainerScrollTransition();
    }

    _preventMessageContainerScrollTransition() {
        this._messageContainer.style.setProperty(LINES_CSS_VAR, this._linesPerScreen);
        this._messageContainer.style.setProperty('transition-duration', '0s');
        void this._messageContainer.clientWidth;
        this._messageContainer.style.removeProperty('transition-duration');
    }

    /**
     * 
     * @param {number} linesNumber 
     */
    _roundToNearestFullLinesPerScreenNumber(linesNumber) {
        return Math.max(
            this._linesPerScreen,
            Math.ceil(linesNumber / this._linesPerScreen) * this._linesPerScreen
        );
    }

    _saveCssVariables() {
        const style = getComputedStyle(this);
        this._linesPerScreen = Number(style.getPropertyValue('--lines-per-screen'));
        this._charWriteWaitMs = Number(style.getPropertyValue('--char-write-wait-ms'));
        this._textUnderScreenTolerance = this._getNumberFromCssPxString(style.getPropertyValue('font-size')) * 0.75;
        this._adjustContainerScrollAfterResize();
    }

    forceUpdateAfterCssChange() {
        this._saveCssVariables();
    }

    isVisible() {
        return this._messageBox.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, contentVisibilityAuto: true });
    }

    isWaiting() {
        return !!this._waitForInputResolve;
    }

}

/**
 * 
 * @param {string} [tagName] 
 */
export function registerMessageBox(tagName = 'message-box') {
    if (!customElements.get(tagName)) {
        customElements.define(tagName, MessageBox);
    }
}