import { ChoicesListComponent } from '../../message/components/choices_list.js';
import { findElement, nextActiveSiblingOptionElement, previousActiveSiblingOptionElement, scrollElementTo } from '../../message/components/utils.js';

const PAGE_SCROLL_CSS_CLASS = 'page-scroll';
const PAGE_SCROLL_UP_CSS_CLASS = 'page-scroll-up';
const PAGE_SCROLL_DOWN_CSS_CLASS = 'page-scroll-down';
const VISIBLE_CSS_CLASS = 'visible';
const SCROLL_UP_INDICATOR_CSS_CLASS = 'scroll-up-indicator';
const SCROLL_DOWN_INDICATOR_CSS_CLASS = 'scroll-down-indicator';
const CONTAINER_CSS_CLASS = 'container';
const VERTICAL_CSS_CLASS = 'vertical';
const HORIZONTAL_CSS_CLASS = 'horizontal';
const CHOICES_LIST_CSS_CLASS_NAME = 'choices-list';

export const SCROLLABLE_LIST_EVENTS = /** @type {const} */ Object.freeze({
    OPTION_SELECT: 'scrollableoptionselect',
    CHANGE_PAGE: 'scrollablechangepage'
});
/**
 * @typedef { Enum<SCROLLABLE_LIST_EVENTS> } ScrollableListEvent
 */

export const PAGE_IDS = /** @type {const} */ Object.freeze({
    NEXT: 'next',
    PREVIOUS: 'previous'
});
/**
 * @typedef { Enum<PAGE_IDS> } PageId
 */

export class ScrollableListComponent extends ChoicesListComponent {

    static get componentDefaultTagName() {
        return 'scrollable-list-component';
    }

    get componentCssStyle() {
        return /*css*/`
            ${super.componentCssStyle}

            ${this.componentTagName} {
                /*
                    Translate is needed to make sroll indicators
                    position absolute work relative to this component
                */
                translate: 0;
            }

            ${this.componentTagName} .${CHOICES_LIST_CSS_CLASS_NAME} {
                position: relative;
            }

            ${this.componentTagName} .${CHOICES_LIST_CSS_CLASS_NAME}.${VERTICAL_CSS_CLASS} {
                flex-direction: column;
                top: calc(-1 * var(--scroll, 0px));
                height: fit-content;
            }

            ${this.componentTagName} .${CHOICES_LIST_CSS_CLASS_NAME}.${HORIZONTAL_CSS_CLASS} {
                flex-direction: row;
                left: calc(-1 * var(--scroll, 0px));
                width: fit-content;
            }

            ${this.componentTagName} .${CONTAINER_CSS_CLASS} {
                overflow: hidden;
                height: 100%;
                width: 100%;
            }

            ${this.componentTagName} .${SCROLL_DOWN_INDICATOR_CSS_CLASS}.${VISIBLE_CSS_CLASS},
            ${this.componentTagName} .${SCROLL_UP_INDICATOR_CSS_CLASS}.${VISIBLE_CSS_CLASS} {
                display: initial;
            }

            ${this.componentTagName} :is(.${SCROLL_UP_INDICATOR_CSS_CLASS}, .${SCROLL_DOWN_INDICATOR_CSS_CLASS}) {
                display: none;
                position: absolute;
                --triangle-side-length: 0.75lh;
                --triangle-height: calc(var(--triangle-side-length) * 0.87);
                --circle-diameter: 1.2lh;

                width: var(--circle-diameter);
                height: var(--circle-diameter);
                border-radius: 100%;

                left: 50%;
                background: red;
                opacity: 0.6;
                transition: opacity 0.1s;
                cursor: pointer;

                &:hover {
                    opacity: 1;
                }

                &::before {
                    content: '';
                    width: var(--triangle-side-length);
                    height: var(--triangle-height);
                    position: absolute;
                    background: yellow;
                    left: calc((var(--circle-diameter) - var(--triangle-side-length)) / 2);
                    top: calc((var(--circle-diameter) - var(--triangle-height)) / 2);
                }
            }

            ${this.componentTagName} .${SCROLL_DOWN_INDICATOR_CSS_CLASS} {
                bottom: 0px;

                &::before {
                    clip-path: polygon(0% 0%, 100% 0%, 50% 100%);
                }
            }
            
            ${this.componentTagName} .${SCROLL_UP_INDICATOR_CSS_CLASS} {
                top: 0px;
                &::before {
                    clip-path: polygon(0% 100%, 100% 100%, 50% 0%);
                }
            }
        `;
    }

    constructor() {
        super();

        this._container = document.createElement('div');
        this._container.classList.add('container');
        this._scroll = 0;
        this._scrollThreshold = 0;
        this._container.appendChild(this._list);

        this._scrollUpIndicator = document.createElement('div');
        this._scrollUpIndicator.classList.add(SCROLL_UP_INDICATOR_CSS_CLASS);
        this._scrollUpIndicator.addEventListener('click', () => this.scrollableListPreviousPage());
        
        this._scrollDownIndicator = document.createElement('div');
        this._scrollDownIndicator.classList.add(SCROLL_DOWN_INDICATOR_CSS_CLASS);
        this._scrollDownIndicator.addEventListener('click', () => this.scrollableListNextPage());

        this.scrollableListSwitchToVertical();

        this.append(
            this._container,
            this._scrollUpIndicator,
            this._scrollDownIndicator
        );

        window.addEventListener('resize', this._adjustScrollAfterResize.bind(this));
    }

    static observedAttributes = [ 'style', 'class' ];

    attributeChangedCallback() {
        this._saveCssVariables();
        this._adjustScrollAfterResize();
    }

    connectedCallback() {
        queueMicrotask(() => {
            this._saveCssVariables();
            this._refreshScrollIndicators();
        });
    }

    _saveCssVariables() {
        const style = getComputedStyle(this);
        this._scrollThreshold = Number(style.getPropertyValue('--scroll-threshold-px') || 0);
    }

    _refreshScrollIndicators() {
        const listDimensions = this._list.getBoundingClientRect();
        const containerDimensions = this._container.getBoundingClientRect();
        this._scrollTo(this._scroll, this._calculateMaxScroll(listDimensions, containerDimensions));
    }

    _adjustScrollAfterResize() {
        const selectedOption = this.choicesListCurrentlySelectedOption;
        if (!selectedOption) {
            return;
        }

        const element = selectedOption.option.element;
        const elementDimensions = element.getBoundingClientRect();
        const containerDimensions = this._container.getBoundingClientRect();
        
        if (
            this._getTop(elementDimensions) >= this._getTop(containerDimensions) + this._scrollThreshold
            && this._getBottom(elementDimensions) <= this._getBottom(containerDimensions) - this._scrollThreshold
        ) {
            this._refreshScrollIndicators();
            return;
        }

        const newScroll = this._getTop(elementDimensions) + this._scroll + (this._getHeight(elementDimensions) - this._getHeight(containerDimensions)) / 2;
        const listDimensions = this._list.getBoundingClientRect();
        this._scrollTo(newScroll, this._calculateMaxScroll(listDimensions, containerDimensions));
    }

    scrollableListSwitchToHorizontal() {
        this._getTop = getLeft;
        this._getBottom = getRight;
        this._getHeight = getWidth;
        this._list.classList.remove(VERTICAL_CSS_CLASS);
        this._list.classList.add(HORIZONTAL_CSS_CLASS);
    }

    scrollableListSwitchToVertical() {
        this._getTop = getTop;
        this._getBottom = getBottom;
        this._getHeight = getHeight;
        this._list.classList.remove(HORIZONTAL_CSS_CLASS);
        this._list.classList.add(VERTICAL_CSS_CLASS);
    }

    /**
     * 
     * @param {number} [index] default 0
     * @returns Option if selected successfully, undefined if couldn't select
     */
    choicesListSelectOptionNoEvent(index = 0) {
        const option = super.choicesListSelectOptionNoEvent(index);
        if (!option) {
            return;
        }

        const optionDimensions = option.element.getBoundingClientRect();
        const listDimensions = this._list.getBoundingClientRect();
        const containerDimensions = this._container.getBoundingClientRect();

        if (this._isElementBelowContainer(optionDimensions, listDimensions, containerDimensions, this._scroll, this._scrollThreshold)) {
            const optionElementBottomRelativeToList = this._getBottom(optionDimensions) - this._getTop(listDimensions);
            const scrollTarget = optionElementBottomRelativeToList - this._getHeight(containerDimensions);
            this._scrollTo(scrollTarget + this._scrollThreshold, this._calculateMaxScroll(listDimensions, containerDimensions));
        } else if (this._isElementAboveContainer(optionDimensions, listDimensions, this._scroll, this._scrollThreshold)) {
            const optionElementTopRelativeToList = this._getTop(optionDimensions) - this._getTop(listDimensions);
            this._scrollTo(optionElementTopRelativeToList - this._scrollThreshold, this._calculateMaxScroll(listDimensions, containerDimensions));
        }

        return option;
    }

    /**
     * 
     * @param {number} index 
     * @returns Option if selected successfully, undefined if couldn't select
     */
    choicesListSelectOption(index) {
        const option = super.choicesListSelectOption(index);
        if (option) {
            this.dispatchEvent(new CustomEvent(SCROLLABLE_LIST_EVENTS.OPTION_SELECT, { detail: { index, option } }));
        }
        return option;
    }

    scrollableListNextPage() {
        this._subsequentPage(
            elements => Number(elements[0].element.dataset.index),
            elements => Number(elements[elements.length - 1].element.dataset.index),
            this._findNextElementBelowContainer.bind(this),
            this._findNextElementAtSamePosition.bind(this),
            (elementDimensions, listDimensions) => this._getTop(elementDimensions) - this._getTop(listDimensions),
            PAGE_IDS.NEXT,
            PAGE_SCROLL_DOWN_CSS_CLASS
        );
    }

    scrollableListPreviousPage() {
        this._subsequentPage(
            elements => Number(elements[elements.length - 1].element.dataset.index),
            elements => Number(elements[0].element.dataset.index),
            this._findNextElementAboveContainer.bind(this),
            this._findPreviousElementAtSamePosition.bind(this),
            (elementDimensions, listDimensions, containerDimensions) => this._getBottom(elementDimensions) - this._getTop(listDimensions) - this._getHeight(containerDimensions),
            PAGE_IDS.PREVIOUS,
            PAGE_SCROLL_UP_CSS_CLASS
        );
    }

    /**
     * @param {(arr: [{ element: { dataset: { index: string } } }]) => number} getBeginIndex 
     * @param {(arr: [{ element: { dataset: { index: string } } }]) => number} getEndIndex 
     * @param {(startingElement: HTMLElement, listDimensions: DOMRect, containerDimensions: DOMRect) => HTMLElement} findNextElement 
     * @param {(startingElement: HTMLElement, samePositionElementOldDimensions: DOMRect, oldScroll: number, newScroll: number) => HTMLElement} findElementSamePosition
     * @param {(elementDimensions: DOMRect, listDimensions: DOMRect, containerDimensions: DOMRect)} calculateScroll 
     * @param {PageId} pageId 
     * @param {string} scrollCssClass 
     * @returns 
     */
    _subsequentPage(getBeginIndex, getEndIndex, findNextElement, findElementSamePosition, calculateScroll, pageId, scrollCssClass) {
        const currentOption = this.choicesListCurrentlySelectedOption;
        if (!currentOption) {
            return;
        }

        const activeOptions = this.choicesListActiveOptions;

        const beginElementIndex = getBeginIndex(activeOptions);
        const endElementIndex = getEndIndex(activeOptions);

        if (currentOption.index === endElementIndex) {
            super.choicesListSelectOption(beginElementIndex);
            return;
        }

        const containerDimensions = this._container.getBoundingClientRect();
        const listDimensions = this._list.getBoundingClientRect();

        const elementToSelect = findNextElement(
            currentOption.option.element,
            listDimensions,
            containerDimensions
        );

        if (!elementToSelect) {
            super.choicesListSelectOption(endElementIndex);
            return;
        }

        const oldScroll = this._scroll;
        const currentOptionElement = currentOption.option.element;
        const currentOptionDimensions = currentOptionElement.getBoundingClientRect();

        const elementIndex = Number(elementToSelect.dataset.index);
        const elementDimensions = elementToSelect.getBoundingClientRect();
        
        const maxScroll = this._calculateMaxScroll(listDimensions, containerDimensions);
        const newScroll = calculateScroll(elementDimensions, listDimensions, containerDimensions);
        const elementSamePosition = findElementSamePosition(elementToSelect, currentOptionDimensions, oldScroll, newScroll);
        this._scrollTo(newScroll, maxScroll);

        let finalElementIndex;
        if (!elementSamePosition || elementSamePosition === currentOptionElement) {
            finalElementIndex = endElementIndex;
        } else {
            const elementSamePositionIndex = Number(elementSamePosition.dataset.index);
            finalElementIndex = elementSamePositionIndex;
        }
        const option = super.choicesListSelectOption(finalElementIndex);

        this._list.classList.add(PAGE_SCROLL_CSS_CLASS, scrollCssClass);
        this.dispatchEvent(new CustomEvent(SCROLLABLE_LIST_EVENTS.CHANGE_PAGE, { detail: { index: finalElementIndex, option, page: pageId } }));
    }

    /**
     * 
     * @param {HTMLElement} startingElement 
     * @param {DOMRect} listDimensions
     * @param {DOMRect} containerDimensions
     */
    _findNextElementBelowContainer(startingElement, listDimensions, containerDimensions) {
        const isScrollAtBottom = this._scroll >= Math.floor(this._calculateMaxScroll(listDimensions, containerDimensions)) - this._scrollThreshold;
        const threshold = isScrollAtBottom ? 0 : this._scrollThreshold;

        return findElement(
            startingElement,
            nextActiveSiblingOptionElement,
            element => this._isElementBelowContainer(element.getBoundingClientRect(), listDimensions, containerDimensions, this._scroll, threshold)
        );
    }

    /**
     * 
     * @param {HTMLElement} startingElement 
     * @param {DOMRect} listDimensions
     */
    _findNextElementAboveContainer(startingElement, listDimensions) {
        const isScrollAtTop = this._scroll <= this._scrollThreshold;
        const threshold = isScrollAtTop ? 0 : this._scrollThreshold;
        
        return findElement(
            startingElement,
            previousActiveSiblingOptionElement,
            element => this._isElementAboveContainer(element.getBoundingClientRect(), listDimensions, this._scroll, threshold)
        );
    }

    /**
     * Scrolls the list to the y position
     * @param {number} y 
     * @param {number} [maxScroll] 
     */
    _scrollTo(y, maxScroll) {
        const yFloored = Math.floor(y);
        const maxScrollFloored = Math.floor(maxScroll);

        this._list.classList.remove(PAGE_SCROLL_CSS_CLASS, PAGE_SCROLL_DOWN_CSS_CLASS, PAGE_SCROLL_UP_CSS_CLASS);
        this._scroll = scrollElementTo(this._list, yFloored, maxScrollFloored);
        
        if (this._scroll > 0) {
            this._scrollUpIndicator.classList.add(VISIBLE_CSS_CLASS);
        } else {
            this._scrollUpIndicator.classList.remove(VISIBLE_CSS_CLASS);
        }

        if (this._scroll < maxScrollFloored) {
            this._scrollDownIndicator.classList.add(VISIBLE_CSS_CLASS);
        } else {
            this._scrollDownIndicator.classList.remove(VISIBLE_CSS_CLASS);
        }
    }

    /**
     * 
     * @param {DOMRect} listDimensions 
     * @param {DOMRect} containerDimensions 
     */
    _calculateMaxScroll(listDimensions, containerDimensions) {
        return this._getHeight(listDimensions) - this._getHeight(containerDimensions);
    }

    /**
     * 
     * @param {HTMLElement} startingElement
     * @param {DOMRect} samePositionElementOldDimensions 
     * @param {number} oldScroll 
     * @param {number} newScroll 
     */
    _findNextElementAtSamePosition(startingElement, samePositionElementOldDimensions, oldScroll, newScroll) {
        const samePositionRelativeTop = this._getTop(samePositionElementOldDimensions) - oldScroll;
    
        return findElement(
            startingElement,
            nextActiveSiblingOptionElement,
            currentElement => {
                const currentElementDimensions = currentElement.getBoundingClientRect();
                const currentElementRelativeBottom = this._getBottom(currentElementDimensions) - newScroll;
                return samePositionRelativeTop <= currentElementRelativeBottom;
            }
        );
    }

    /**
     * 
     * @param {HTMLElement} startingElement
     * @param {DOMRect} samePositionElementOldDimensions 
     * @param {number} oldScroll 
     * @param {number} newScroll 
     */
    _findPreviousElementAtSamePosition(startingElement, samePositionElementOldDimensions, oldScroll, newScroll) {
        const samePositionRelativeBottom = this._getBottom(samePositionElementOldDimensions) - oldScroll;
        
        return findElement(
            startingElement,
            previousActiveSiblingOptionElement,
            currentElement => {
                const currentElementDimensions = currentElement.getBoundingClientRect();
                const currentElementRelativeTop = this._getTop(currentElementDimensions) - newScroll;
                return currentElementRelativeTop <= samePositionRelativeBottom;
            }
        );
    }

    /**
     * 
     * @param {DOMRect} elementDimensions 
     * @param {DOMRect} listDimensions 
     * @param {number} scroll
     * @param {number} [threshold]
     */
    _isElementAboveContainer(elementDimensions, listDimensions, scroll, threshold = 0) {
        const realElementTop = this._getTop(elementDimensions) - this._getTop(listDimensions) - scroll;
        return realElementTop < threshold;
    }

    /**
     * 
     * @param {DOMRect} elementDimensions 
     * @param {DOMRect} listDimensions 
     * @param {DOMRect} containerDimensions 
     * @param {number} scroll
     * @param {number} [threshold]
     */
    _isElementBelowContainer(elementDimensions, listDimensions, containerDimensions, scroll, threshold = 0) {
        const realElementBottom = this._getBottom(elementDimensions) - this._getTop(listDimensions) - scroll;
        return Math.floor(realElementBottom) > Math.floor(this._getHeight(containerDimensions) - threshold);
    }
}

/**
 * 
 * @param {DOMRect} dimensions 
 * @returns 
 */
function getTop(dimensions) {
    return dimensions.top;
}

/**
 * 
 * @param {DOMRect} dimensions 
 * @returns 
 */
function getBottom(dimensions) {
    return dimensions.bottom;
}

/**
 * 
 * @param {DOMRect} dimensions 
 * @returns 
 */
function getLeft(dimensions) {
    return dimensions.left;
}

/**
 * 
 * @param {DOMRect} dimensions 
 * @returns 
 */
function getRight(dimensions) {
    return dimensions.right;
}

/**
 * 
 * @param {DOMRect} dimensions 
 * @returns 
 */
function getHeight(dimensions) {
    return dimensions.height;
}

/**
 * 
 * @param {DOMRect} dimensions 
 * @returns 
 */
function getWidth(dimensions) {
    return dimensions.width;
}