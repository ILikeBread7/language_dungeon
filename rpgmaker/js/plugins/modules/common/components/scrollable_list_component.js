import { ChoicesListComponent } from '../../message/components/choices_list.js';
import { findElement, isElementAboveContainer, isElementBelowContainer, nextActiveSiblingOptionElement, previousActiveSiblingOptionElement, scrollElementTo } from '../../message/components/utils.js';

const PAGE_SCROLL_CSS_CLASS = 'page-scroll';
const PAGE_SCROLL_UP_CSS_CLASS = 'page-scroll-up';
const PAGE_SCROLL_DOWN_CSS_CLASS = 'page-scroll-down';

export class ScrollableListComponent extends ChoicesListComponent {

    static get componentDefaultTagName() {
        return 'scrollable-list-component';
    }

    get componentCssStyle() {
        return /*css*/`
            ${super.componentCssStyle}

            ${this.componentTagName} .choices-list {
                position: relative;
                top: calc(-1 * var(--scroll, 0px));
            }

            ${this.componentTagName} .container {
                overflow: hidden;
                height: 100%;
            }
        `;
    }

    constructor() {
        super();

        this._container = document.createElement('div');
        this._container.classList.add('container');
        this._scroll = 0;
        this._container.appendChild(this._list);
        this.appendChild(this._container);
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