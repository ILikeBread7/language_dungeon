import { BaseComponent } from './base_component.js';

const SCROLL_CONTAINER_CSS_CLASS = 'scroll-container';
const TEXT_CONTAINER_CSS_CLASS = 'text-container';

export class GamelogComponent extends BaseComponent {

    static get componentDefaultTagName() {
        return 'gamelog-component';
    }

    get componentCssStyle() {
        return /*css*/`
            ${this.componentTagName} {
                display: block;
                --scroll: 0px;
            }

            ${this.componentTagName} .${SCROLL_CONTAINER_CSS_CLASS} {
                overflow: hidden;
                white-space: pre-wrap;
                height: 100%;
            }

            ${this.componentTagName} .${TEXT_CONTAINER_CSS_CLASS} {
                position: relative;
                top: calc(-1 * var(--scroll));

                transition: top 1s;
            }
        `;
    }

    constructor() {
        super();

        this._scrollContainer = document.createElement('div');
        this._scrollContainer.classList.add(SCROLL_CONTAINER_CSS_CLASS);

        this._textContainer = document.createElement('div');
        this._textContainer.classList.add(TEXT_CONTAINER_CSS_CLASS);

        this._scrollContainer.appendChild(this._textContainer);
        this._scroll = 0;
        
        this.appendChild(this._scrollContainer);
    }

    /**
     * 
     * @param {string} logText 
     */
    async gamelogComponentAddLog(logText) {
        if (!this.gamelogComponentIsEmpty()) {
            this._textContainer.innerHTML += '\n';
        }
        this._textContainer.innerHTML += logText;
        
        const textHeight = this._textContainer.scrollHeight;
        const scrollContainerHeight = this._scrollContainer.clientHeight;
        const scroll = Math.max(0, textHeight - scrollContainerHeight);
        if (scroll === this._scroll) {
            return;
        }

        return new Promise(resolve => {
            this._scroll = scroll;
            this.style.setProperty('--scroll', `${scroll}px`);

            const listener = event => {
                if (event.target !== this._textContainer) {
                    return;
                }

                this._textContainer.removeEventListener('transitionend', listener);
                resolve();
            }
            this._textContainer.addEventListener('transitionend', listener);
        });
    }

    gamelogComponentClear() {
        this._textContainer.innerHTML = '';
        this.style.removeProperty('--scroll');
    }

    gamelogComponentIsEmpty() {
        return !this._textContainer.innerHTML;
    }

}