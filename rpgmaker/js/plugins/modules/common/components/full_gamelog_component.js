import { getNumberFromCssPxString } from '../../message/components/utils.js';
import { PromiseResolve } from '../helpers/promise_resolve.js';
import { BaseComponent } from './base_component.js';

const SCROLL_CONTAINER_CSS_CLASS = 'scroll-container';
const TEXT_CONTAINER_CSS_CLASS = 'text-container';
const SCROLL_TOP_CSS_CLASS = 'scroll-top';
const SCROLL_BOTTOM_CSS_CLASS = 'scroll-bottom';

export class FullGamelogComponent extends BaseComponent {

    static get componentDefaultTagName() {
        return 'full-gamelog-component';
    }

    get componentCssStyle() {
        return /*css*/`
            ${this.componentTagName} {
                display: block;
                --scroll-lines: 1;
            }
            
            ${this.componentTagName} .${SCROLL_CONTAINER_CSS_CLASS} {
                height: 100%;
                overflow: hidden;
                scroll-behavior: smooth;
            }

            ${this.componentTagName} .${TEXT_CONTAINER_CSS_CLASS} {
                white-space: pre-wrap;
                line-height: 1lh;
            }
        `;
    }

    constructor() {
        super();
        this._promiseResolve = new PromiseResolve();

        this._scrollContainer = document.createElement('div');
        this._scrollContainer.classList.add(SCROLL_CONTAINER_CSS_CLASS);

        this._textContainer = document.createElement('div');
        this._textContainer.classList.add(TEXT_CONTAINER_CSS_CLASS);

        this._scrollContainer.appendChild(this._textContainer);
        
        this.appendChild(this._scrollContainer);
    }

    /**
     * 
     * @param {string} logText 
     */
    fullGamelogComponentShow(logText) {
        this._saveCssVariables();
        this._textContainer.innerHTML = logText;
        this._scrollContainer.style.setProperty('scroll-behavior', 'auto');
        const textHeight = this._textContainer.scrollHeight;
        const newScroll = Number.MAX_SAFE_INTEGER;
        this._scrollContainer.scrollTop = newScroll;
        this._applyScrollCssClasses(textHeight, newScroll);
        this._scrollContainer.style.removeProperty('scroll-behavior');
    }

    async fullGamelogComponentScrollUp() {
        return await this._scrollBy(-this._scrollDistance);
    }

    async fullGamelogComponentScrollDown() {
        return await this._scrollBy(this._scrollDistance);
    }

    async fullGamelogComponentPageUp() {
        return await this._scrollBy(-this._scrollContainerHeight);
    }

    async fullGamelogComponentPageDown() {
        return await this._scrollBy(this._scrollContainerHeight);
    }

    /**
     * 
     * @param {number} scrollAmount 
     */
    async _scrollBy(scrollAmount) {
        if (this._promiseResolve.isUnresolved()) {
            return;
        }

        const textHeight = this._textContainer.scrollHeight;
        const newScroll = this._scrollContainer.scrollTop + scrollAmount;
        this._scrollContainer.scrollTop = newScroll;
        this._applyScrollCssClasses(textHeight, newScroll);

        return await this._scrollPromise();
    }

    _scrollPromise() {
        return new Promise((resolve, reject) => {
            this._promiseResolve.setResolve(resolve, reject);

            const listener = event => {
                if (event.target !== this._scrollContainer) {
                    return;
                }
    
                this._scrollContainer.removeEventListener('scrollend', listener);
                this._promiseResolve.resolve();
            };
    
            this._scrollContainer.addEventListener('scrollend', listener);
        });
    }

    /**
     * 
     * @param {number} textHeight 
     * @param {number} newScroll 
     */
    _applyScrollCssClasses(textHeight, newScroll) {
        console.log(textHeight, newScroll)
        this.classList.remove(SCROLL_TOP_CSS_CLASS, SCROLL_BOTTOM_CSS_CLASS);
        if (textHeight > this._scrollContainerHeight) {
            if (newScroll > 0) {
                this.classList.add(SCROLL_TOP_CSS_CLASS);
            }
            if (newScroll < textHeight - this._scrollContainerHeight) {
                this.classList.add(SCROLL_BOTTOM_CSS_CLASS);
            }
        }
    }

    _saveCssVariables() {
        const style = getComputedStyle(this._textContainer);
        const lineHeight = getNumberFromCssPxString(style.lineHeight);
        const scrollLines = Number(style.getPropertyValue('--scroll-lines'));
        this._scrollDistance = lineHeight * scrollLines;
        this._scrollContainerHeight = this._scrollContainer.clientHeight;
    }

}