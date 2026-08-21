import { ChoicesListComponent } from '../../message/components/choices_list.js';
import { findElement, isElementAboveContainer, isElementBelowContainer, nextActiveSiblingOptionElement, previousActiveSiblingOptionElement, scrollElementTo } from '../../message/components/utils.js';

const PAGE_SCROLL_CSS_CLASS = 'page-scroll';
const PAGE_SCROLL_UP_CSS_CLASS = 'page-scroll-up';
const PAGE_SCROLL_DOWN_CSS_CLASS = 'page-scroll-down';
const SCROLLABE_UP_CSS_CLASS = 'scrollable-up';
const SCROLLABLE_DOWN_CSS_CLASS = 'scrollable-down';
const SCROLL_UP_INDICATOR_CSS_CLASS = 'scroll-up-indicator';
const SCROLL_DOWN_INDICATOR_CSS_CLASS = 'scroll-down-indicator';

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

            ${this.componentTagName} .container {
                overflow: hidden;
                height: 100%;
            }

            ${this.componentTagName}.scrollable-down .scroll-down-indicator,
            ${this.componentTagName}.scrollable-up .scroll-up-indicator {
                display: initial;
            }

            ${this.componentTagName} :is(.scroll-up-indicator, .scroll-down-indicator) {
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

            ${this.componentTagName} .scroll-down-indicator {
                bottom: 0px;

                &::before {
                    clip-path: polygon(0% 0%, 100% 0%, 50% 100%);
                }
            }
            
            ${this.componentTagName} .scroll-up-indicator {
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
        } else if (isElementAboveContainer(optionDimensions, listDimensions, containerDimensions, this._scroll)) {
            const optionElementTopRelativeToList = optionDimensions.top - listDimensions.top;
            this._scrollTo(optionElementTopRelativeToList, calculateMaxScroll(listDimensions, containerDimensions));
        }

        return option;
    }

    scrollableListNextPage() {
        const currentOption = this.choicesListCurrentlySelectedOption;
        if (!currentOption) {
            return;
        }

        const oldScroll = this._scroll;
        const activeOptions = this.choicesListActiveOptions;
        const firstElementIndex = Number(activeOptions[0].element.dataset.index);
        const lastElement = activeOptions[activeOptions.length - 1].element;
        const lastElementIndex = Number(lastElement.dataset.index);
        if (currentOption.index === lastElementIndex) {
            this.choicesListSelectOption(firstElementIndex);
            return;
        }

        const containerDimensions = this._container.getBoundingClientRect();
        const listDimensions = this._list.getBoundingClientRect();

        const elementToSelect = this._findNextElementBelowContainer(
            currentOption.option.element,
            listDimensions,
            containerDimensions
        );

        if (!elementToSelect) {
            this.choicesListSelectOption(lastElementIndex);
            return;
        }

        const elementIndex = Number(elementToSelect.dataset.index);
        this.choicesListSelectOptionNoEvent(elementIndex);

        const elementDimensions = elementToSelect.getBoundingClientRect();
        const currentOptionElement = currentOption.option.element;
        const currentOptionDimensions = currentOptionElement.getBoundingClientRect();
        this._scrollTo(elementDimensions.top - listDimensions.top, calculateMaxScroll(listDimensions, containerDimensions));
        const elementSamePosition = findNextElementAtSamePosition(currentOptionElement, currentOptionDimensions, oldScroll, this._scroll);
        if (elementSamePosition === currentOptionElement) {
            super.choicesListSelectOption(elementIndex);
        } else {
            const elementSamePositionIndex = Number(elementSamePosition.dataset.index);
            super.choicesListSelectOption(elementSamePositionIndex);
        }
        this._list.classList.add(PAGE_SCROLL_CSS_CLASS, PAGE_SCROLL_DOWN_CSS_CLASS);
    }

    scrollableListPreviousPage() {
        const currentOption = this.choicesListCurrentlySelectedOption;
        if (!currentOption) {
            return;
        }

        const oldScroll = this._scroll;
        const activeOptions = this.choicesListActiveOptions;
        const firstElementIndex = Number(activeOptions[0].element.dataset.index);
        const lastElement = activeOptions[activeOptions.length - 1].element;
        const lastElementIndex = Number(lastElement.dataset.index);
        if (currentOption.index === firstElementIndex) {
            this.choicesListSelectOption(lastElementIndex);
            return;
        }

        const containerDimensions = this._container.getBoundingClientRect();
        const listDimensions = this._list.getBoundingClientRect();

        const elementToSelect = this._findNextElementAboveContainer(
            currentOption.option.element,
            listDimensions,
            containerDimensions
        );

        if (!elementToSelect) {
            this.choicesListSelectOption(firstElementIndex);
            return;
        }

        const elementIndex = Number(elementToSelect.dataset.index);
        this.choicesListSelectOptionNoEvent(elementIndex);

        const elementDimensions = elementToSelect.getBoundingClientRect();
        const currentOptionElement = currentOption.option.element;
        const currentOptionDimensions = currentOptionElement.getBoundingClientRect();
        this._scrollTo(elementDimensions.bottom - listDimensions.top - containerDimensions.height, calculateMaxScroll(listDimensions, containerDimensions));
        const elementSamePosition = findPreviousElementAtSamePosition(currentOptionElement, currentOptionDimensions, oldScroll, this._scroll);
        if (elementSamePosition === currentOptionElement) {
            super.choicesListSelectOption(elementIndex);
        } else {
            const elementSamePositionIndex = Number(elementSamePosition.dataset.index);
            super.choicesListSelectOption(elementSamePositionIndex);
        }
        this._list.classList.add(PAGE_SCROLL_CSS_CLASS, PAGE_SCROLL_UP_CSS_CLASS);
    }

    connectedCallback() {
        queueMicrotask(() => this._refreshScrollIndicators());
    }

    _refreshScrollIndicators() {
        const listDimensions = this._list.getBoundingClientRect();
        const containerDimensions = this._container.getBoundingClientRect();
        this._scrollTo(this._scroll, calculateMaxScroll(listDimensions, containerDimensions));
        console.log(listDimensions, containerDimensions, this._scroll)
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
     * @param {DOMRect} containerDimensions
     */
    _findNextElementAboveContainer(startingElement, listDimensions, containerDimensions) {
        return findElement(
            startingElement,
            previousActiveSiblingOptionElement,
            element => isElementAboveContainer(element.getBoundingClientRect(), listDimensions, containerDimensions, this._scroll)
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
            this.classList.add(SCROLLABE_UP_CSS_CLASS);
        } else {
            this.classList.remove(SCROLLABE_UP_CSS_CLASS);
        }

        if (this._scroll < maxScroll) {
            this.classList.add(SCROLLABLE_DOWN_CSS_CLASS);
        } else {
            this.classList.remove(SCROLLABLE_DOWN_CSS_CLASS);
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
 * @param {HTMLElement} element
 * @param {DOMRect} elementOldDimensions 
 * @param {number} oldScroll 
 * @param {number} newScroll 
 */
function findNextElementAtSamePosition(element, elementOldDimensions, oldScroll, newScroll) {
    const startingElementDimensions = elementOldDimensions;
    const startingElementRelativeTop = startingElementDimensions.top - oldScroll;
    
    return findElement(
        element,
        nextActiveSiblingOptionElement,
        currentElement => {
            const currentElementDimensions = currentElement.getBoundingClientRect();
            const currentElementRelativeBottom = currentElementDimensions.bottom - newScroll;
            return startingElementRelativeTop <= currentElementRelativeBottom;
        }
    );
}

/**
 * 
 * @param {HTMLElement} element
 * @param {DOMRect} elementOldDimensions 
 * @param {number} oldScroll 
 * @param {number} newScroll 
 */
function findPreviousElementAtSamePosition(element, elementOldDimensions, oldScroll, newScroll) {
    const startingElementDimensions = elementOldDimensions;
    const startingElementRelativeBottom = startingElementDimensions.bottom - oldScroll;
    
    return findElement(
        element,
        previousActiveSiblingOptionElement,
        currentElement => {
            const currentElementDimensions = currentElement.getBoundingClientRect();
            const currentElementRelativeTop = currentElementDimensions.top - newScroll;
            return currentElementRelativeTop <= startingElementRelativeBottom;
        }
    );
}