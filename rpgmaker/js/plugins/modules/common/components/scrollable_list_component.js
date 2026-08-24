import { ChoicesListComponent } from '../../message/components/choices_list.js';
import { findElement, isElementAboveContainer, isElementBelowContainer, nextActiveSiblingOptionElement, previousActiveSiblingOptionElement, scrollElementTo } from '../../message/components/utils.js';

const PAGE_SCROLL_CSS_CLASS = 'page-scroll';
const PAGE_SCROLL_UP_CSS_CLASS = 'page-scroll-up';
const PAGE_SCROLL_DOWN_CSS_CLASS = 'page-scroll-down';
const VISIBLE_CSS_CLASS = 'visible';
const SCROLL_UP_INDICATOR_CSS_CLASS = 'scroll-up-indicator';
const SCROLL_DOWN_INDICATOR_CSS_CLASS = 'scroll-down-indicator';
const CONTAINER_CSS_CLASS = 'container';

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

            ${this.componentTagName} .choices-list {
                position: relative;
                top: calc(-1 * var(--scroll, 0px));
            }

            ${this.componentTagName} .${CONTAINER_CSS_CLASS} {
                overflow: hidden;
                height: 100%;
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
        this._container.appendChild(this._list);

        this._scrollUpIndicator = document.createElement('div');
        this._scrollUpIndicator.classList.add(SCROLL_UP_INDICATOR_CSS_CLASS);
        this._scrollUpIndicator.addEventListener('click', () => this.scrollableListPreviousPage());
        
        this._scrollDownIndicator = document.createElement('div');
        this._scrollDownIndicator.classList.add(SCROLL_DOWN_INDICATOR_CSS_CLASS);
        this._scrollDownIndicator.addEventListener('click', () => this.scrollableListNextPage());

        this.append(
            this._container,
            this._scrollUpIndicator,
            this._scrollDownIndicator
        );

        window.addEventListener('resize', this._adjustScrollAfterResize.bind(this));
    }

    static observedAttributes = [ 'style', 'class' ];

    attributeChangedCallback() {
        this._adjustScrollAfterResize();
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
            elementDimensions.top >= containerDimensions.top
            && elementDimensions.bottom <= containerDimensions.bottom
        ) {
            this._refreshScrollIndicators();
            return;
        }

        const newScroll = elementDimensions.top + this._scroll + (elementDimensions.height - containerDimensions.height) / 2;
        const listDimensions = this._list.getBoundingClientRect();
        this._scrollTo(newScroll, calculateMaxScroll(listDimensions, containerDimensions));
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

        if (isElementBelowContainer(optionDimensions, listDimensions, containerDimensions, this._scroll)) {
            const optionElementBottomRelativeToList = optionDimensions.bottom - listDimensions.top;
            const scrollTarget = optionElementBottomRelativeToList - containerDimensions.height;
            this._scrollTo(scrollTarget, calculateMaxScroll(listDimensions, containerDimensions));
        } else if (isElementAboveContainer(optionDimensions, listDimensions, this._scroll)) {
            const optionElementTopRelativeToList = optionDimensions.top - listDimensions.top;
            this._scrollTo(optionElementTopRelativeToList, calculateMaxScroll(listDimensions, containerDimensions));
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
            findNextElementAtSamePosition,
            (elementDimensions, listDimensions) => elementDimensions.top - listDimensions.top,
            PAGE_IDS.NEXT,
            PAGE_SCROLL_DOWN_CSS_CLASS
        );
    }

    scrollableListPreviousPage() {
        this._subsequentPage(
            elements => Number(elements[elements.length - 1].element.dataset.index),
            elements => Number(elements[0].element.dataset.index),
            this._findNextElementAboveContainer.bind(this),
            findPreviousElementAtSamePosition,
            (elementDimensions, listDimensions, containerDimensions) => elementDimensions.bottom - listDimensions.top - containerDimensions.height,
            PAGE_IDS.PREVIOUS,
            PAGE_SCROLL_UP_CSS_CLASS
        );
    }

    /**
     * @param {(arr: [{ element: { dataset: { index: string } } }]) => number} getBeginIndex 
     * @param {(arr: [{ element: { dataset: { index: string } } }]) => number} getEndIndex 
     * @param {(startingElement: HTMLElement, listDimensions: DOMRect, containerDimensions: DOMRect)} findNextElement 
     * @param {(startingElement: HTMLElement, samePositionElementOldDimensions: DOMRect, oldScroll: number, newScroll: number)} findElementSamePosition
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

        const oldScroll = this._scroll;
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

        const elementIndex = Number(elementToSelect.dataset.index);
        this.choicesListSelectOptionNoEvent(elementIndex);

        const elementDimensions = elementToSelect.getBoundingClientRect();
        const currentOptionElement = currentOption.option.element;
        const currentOptionDimensions = currentOptionElement.getBoundingClientRect();
        this._scrollTo(
            calculateScroll(elementDimensions, listDimensions, containerDimensions),
            calculateMaxScroll(listDimensions, containerDimensions)
        );
        const elementSamePosition = findElementSamePosition(elementToSelect, currentOptionDimensions, oldScroll, this._scroll);
        
        let finalElementIndex;
        if (elementSamePosition === currentOptionElement) {
            finalElementIndex = elementIndex;
        } else {
            const elementSamePositionIndex = Number(elementSamePosition.dataset.index);
            finalElementIndex = elementSamePositionIndex;
        }
        const option = super.choicesListSelectOption(finalElementIndex);

        this._list.classList.add(PAGE_SCROLL_CSS_CLASS, scrollCssClass);
        this.dispatchEvent(new CustomEvent(SCROLLABLE_LIST_EVENTS.CHANGE_PAGE, { detail: { index: finalElementIndex, option, page: pageId } }));
    }

    connectedCallback() {
        queueMicrotask(() => this._refreshScrollIndicators());
    }

    _refreshScrollIndicators() {
        const listDimensions = this._list.getBoundingClientRect();
        const containerDimensions = this._container.getBoundingClientRect();
        this._scrollTo(this._scroll, calculateMaxScroll(listDimensions, containerDimensions));
    }

    /**
     * 
     * @param {HTMLElement} startingElement 
     * @param {DOMRect} listDimensions
     * @param {DOMRect} containerDimensions
     */
    _findNextElementBelowContainer(startingElement, listDimensions, containerDimensions) {
        return findElement(
            startingElement,
            nextActiveSiblingOptionElement,
            element => isElementBelowContainer(element.getBoundingClientRect(), listDimensions, containerDimensions, this._scroll)
        );
    }

    /**
     * 
     * @param {HTMLElement} startingElement 
     * @param {DOMRect} listDimensions
     */
    _findNextElementAboveContainer(startingElement, listDimensions) {
        return findElement(
            startingElement,
            previousActiveSiblingOptionElement,
            element => isElementAboveContainer(element.getBoundingClientRect(), listDimensions, this._scroll)
        );
    }

    /**
     * Scrolls the list to the y position
     * @param {number} y 
     * @param {number} [maxScroll] 
     */
    _scrollTo(y, maxScroll) {
        this._list.classList.remove(PAGE_SCROLL_CSS_CLASS, PAGE_SCROLL_DOWN_CSS_CLASS, PAGE_SCROLL_UP_CSS_CLASS);
        this._scroll = scrollElementTo(this._list, y, maxScroll);
        
        if (this._scroll > 0) {
            this._scrollUpIndicator.classList.add(VISIBLE_CSS_CLASS);
        } else {
            this._scrollUpIndicator.classList.remove(VISIBLE_CSS_CLASS);
        }

        if (this._scroll < maxScroll) {
            this._scrollDownIndicator.classList.add(VISIBLE_CSS_CLASS);
        } else {
            this._scrollDownIndicator.classList.remove(VISIBLE_CSS_CLASS);
        }
    }

}

/**
 * 
 * @param {DOMRect} listDimensions 
 * @param {DOMRect} containerDimensions 
 */
function calculateMaxScroll(listDimensions, containerDimensions) {
    return listDimensions.height - containerDimensions.height;
}

/**
 * 
 * @param {HTMLElement} startingElement
 * @param {DOMRect} samePositionElementOldDimensions 
 * @param {number} oldScroll 
 * @param {number} newScroll 
 */
function findNextElementAtSamePosition(startingElement, samePositionElementOldDimensions, oldScroll, newScroll) {
    const samePositionRelativeTop = samePositionElementOldDimensions.top - oldScroll;
    
    return findElement(
        startingElement,
        nextActiveSiblingOptionElement,
        currentElement => {
            const currentElementDimensions = currentElement.getBoundingClientRect();
            const currentElementRelativeBottom = currentElementDimensions.bottom - newScroll;
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
function findPreviousElementAtSamePosition(startingElement, samePositionElementOldDimensions, oldScroll, newScroll) {
    const samePositionRelativeBottom = samePositionElementOldDimensions.bottom - oldScroll;
    
    return findElement(
        startingElement,
        previousActiveSiblingOptionElement,
        currentElement => {
            const currentElementDimensions = currentElement.getBoundingClientRect();
            const currentElementRelativeTop = currentElementDimensions.top - newScroll;
            return currentElementRelativeTop <= samePositionRelativeBottom;
        }
    );
}