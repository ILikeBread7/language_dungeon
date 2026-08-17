import { BaseComponent } from '../../common/components/base_component.js';
import { VISIBILITY_STATE } from '../../common/enums.js';
import { getNumberFromCssPxString } from './utils.js';

export const MESSAGE_BOX_STATE = /** @type {const} */ Object.freeze({
    INACTIVE: 'inactive',
    ACTIVATING: 'activating',
    ACTIVE: 'active',
    DEACTIVATING: 'deactivating',
    WAITING_FOR_SCROLL: 'waiting-for-scroll',
    WAITING_FOR_CLOSE: 'waiting-for-close'
});
/**
 * @typedef { Enum<MESSAGE_BOX_STATE> } MessageBoxState
 */

export const MESSAGE_BOX_EVENTS = Object.freeze({
    CHAR_SHOWN: 'charshown'
});

const LINES_CSS_VAR = '--lines';

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

const messageBoxClassName = 'message-box';
const messageContainerClassName = 'message-container';
const hiddenWholeTextSpanClassName = 'hidden-whole-text-span';
const nextPageIndicatorClassName = 'next-page-indicator';

export class MessageBoxComponent extends BaseComponent {

    static get componentDefaultTagName() {
        return 'message-box-component';
    }

    get componentCssStyle() {
        return /*css*/`
            ${this.componentTagName} {
                --lines-per-screen: 4;
                --transition-time: 0.5s;
                --char-write-wait-ms: 50;
                --box-height: calc(1lh * var(--lines-per-screen));

                display: block;
                line-height: 1.2;
                height: var(--box-height);
            }

            ${this.componentTagName} .${messageBoxClassName} {
                width: 100%;
                height: var(--box-height);
                background: #000000;
                color: #ffffff;
                position: absolute;
                transition-property: opacity;
                transition-duration: var(--transition-time);
                white-space: pre-wrap;
                overflow: hidden;
            }

            ${this.componentTagName} .${messageContainerClassName} {
                --container-height: calc(1lh * var(${LINES_CSS_VAR}));

                width: 100%;
                height: var(--container-height);
                position: relative;
                top: calc(-1lh * (var(${LINES_CSS_VAR}) - var(--lines-per-screen)));
                transition: top var(--transition-time);
            }

            ${this.componentTagName} .${hiddenWholeTextSpanClassName} {
                position: absolute;
                visibility: hidden;
                z-index: -1;
            }

            ${this.componentTagName} .${nextPageIndicatorClassName} {
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

            ${this.componentTagName} .${nextPageIndicatorClassName}[data-state="${VISIBILITY_STATE.SHOWN}"] {
                animation-name: floating;
                animation-duration: 1s;
                animation-iteration-count: infinite;
                visibility: visible;
            }

            ${this.componentTagName} .${nextPageIndicatorClassName}[data-state="${VISIBILITY_STATE.HIDDEN}"] {
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
    }

    /**
     * 
     * @param { {
     *  wait: (time: number) => Promise<void>
     * } } dependencies 
     */
    constructor(dependencies = { wait: time => new Promise(resolve => setTimeout(resolve, time)) }) {
        super(dependencies);
        this._waitForInputResolve = null;

        const messageBox = document.createElement('div');
        messageBox.classList.add(messageBoxClassName);

        const messageContainer = document.createElement('div');
        messageContainer.classList.add(messageContainerClassName);
        messageContainer.style.setProperty(LINES_CSS_VAR, 4);

        const hiddenWholeTextSpan = document.createElement('span');
        hiddenWholeTextSpan.classList.add(hiddenWholeTextSpanClassName);

        const displayedTextSpan = document.createElement('span');

        messageContainer.append(hiddenWholeTextSpan, displayedTextSpan);
        messageBox.appendChild(messageContainer);

        const nextPageIndicator = document.createElement('div');
        nextPageIndicator.classList.add(nextPageIndicatorClassName);
        nextPageIndicator.dataset.state = VISIBILITY_STATE.HIDDEN;
        messageBox.appendChild(nextPageIndicator);

        this.appendChild(messageBox);

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
        this._forceFinish = false;
        this.dataset.boxState = MESSAGE_BOX_STATE.INACTIVE;

        window.addEventListener('resize', () => this._adjustContainerScrollAfterResize());

        // Take some property values from css variables
        new MutationObserver(() => this._saveCssVariables()).observe(this, { attributeFilter: [ 'style', 'class' ] });
    }

    /**
     * 
     * @param {string} text May include html
     * @param {boolean} [displayImmediately=false] True if text should be shown immediately, not character per character
     * @description Displays the text one character at a time
     */
    async messageBoxDisplayText(text, displayImmediately = false) {
        this._saveCssVariables();

        this.dataset.boxState = MESSAGE_BOX_STATE.ACTIVE;
        this._messageContainerReset();
        this._hiddenWholeTextSpan.innerHTML = text;
        if (displayImmediately) {
            this.messageBoxDisplayImmediately();
        }

        let lastPreventedScrollContent = '';
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
                            this.dataset.boxState = MESSAGE_BOX_STATE.WAITING_FOR_SCROLL;
                            this._nextPageIndicator.dataset.state = VISIBILITY_STATE.SHOWN;
                            if (lastPreventedScrollContent === this._wordShownPartSpan.innerHTML.trim()) {
                                this._preventScroll = false;
                            } else {
                                await this._waitForInput();
                            }
                            this.dataset.boxState = MESSAGE_BOX_STATE.ACTIVE;
                            this._nextPageIndicator.dataset.state = VISIBILITY_STATE.HIDDEN;
                            if (this._forceFinish) {
                                break;
                            } else if (this._preventScroll) {
                                this._preventScroll = false;
                                lastPreventedScrollContent = this._wordShownPartSpan.innerHTML.trim();
                            } else {
                                lastPreventedScrollContent = '';
                                await this._messageContainerScroll();
                            }
                            this._messageTextDisplayImmediately = false;
                        }
    
                        if (!this._messageTextDisplayImmediately && !this._isWhitespace(char)) {
                            await this._dependencies.wait(this._charWriteWaitMs);
                            this.dispatchEvent(new CustomEvent(MESSAGE_BOX_EVENTS.CHAR_SHOWN));
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

        this.dataset.boxState = MESSAGE_BOX_STATE.WAITING_FOR_CLOSE;
        await this._waitForInput();
        this._messageContainerReset();
        this.dataset.boxState = MESSAGE_BOX_STATE.INACTIVE;
    }

    messageBoxDisplayImmediately() {
        this._messageTextDisplayImmediately = true;
    }

    /**
     * 
     * @returns {Promise<void>}
     */
    async _waitForInput() {
        if (this._forceFinish) {
            return;
        }

        return new Promise(resolve => {
            this._waitForInputResolve = resolve;
        });
    }

    messageBoxInput() {
        if (this._waitForInputResolve) {
            this._waitForInputResolve();
            this._waitForInputResolve = null;
        }
        this._messageTextDisplayImmediately = true;
    }

    messageBoxForceFinish() {
        this._forceFinish = true;
        this.messageBoxInput();
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
        const lineHeight = getNumberFromCssPxString(style.lineHeight);
        return Math.ceil((element.getBoundingClientRect().height - this._textUnderScreenTolerance) / lineHeight);
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
        });
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
        this._forceFinish = false;
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
        this._textUnderScreenTolerance = getNumberFromCssPxString(style.getPropertyValue('font-size')) * 0.75;
        this._adjustContainerScrollAfterResize();
    }

    messageBoxForceUpdateAfterCssChange() {
        this._saveCssVariables();
    }

    messageBoxIsWaiting() {
        return !!this._waitForInputResolve;
    }

    /**
     * @type {MessageBoxState}
     */
    get messageBoxState() {
        return this.dataset.boxState;
    }

    get messageBoxBusy() {
        return this.dataset.boxState !== MESSAGE_BOX_STATE.INACTIVE;
    }

}