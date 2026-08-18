import { ChoicesListComponent } from '../../message/components/choices_list.js';
import { clamp, getNumberFromCssPxString } from '../../message/components/utils.js';

export class PagedListComponent extends ChoicesListComponent {

    static get componentDefaultTagName() {
        return 'paged-list-component';
    }

    get componentCssStyle() {
        return /*css*/`
            ${super.componentCssStyle}

            ${this.componentTagName} .choices-list {
                position: relative;
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
        this._list.style.top = `0px`;
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

        if (this._isElementBelowContainer(optionDimensions, listDimensions, containerDimensions)) {
            const optionElementTopRelativeToList = optionDimensions.top - listDimensions.top;
            const maxScroll = this._calculateMaxScroll(listDimensions.height, containerDimensions.height);
            this._scrollTo(optionElementTopRelativeToList, maxScroll);
        } else if (this._isElementAboveContainer(optionDimensions, listDimensions, containerDimensions)) {
            const optionElementBottomRelativeToList = optionDimensions.bottom - listDimensions.top;
            this._scrollTo(optionElementBottomRelativeToList - containerDimensions.height);
        }

        return option;
    }

    pagedListNextPage() {
        const currentOption = this.choicesListCurrentlySelectedOption;
        if (!currentOption) {
            return;
        }

        const activeOptions = this.choicesListActiveOptions;
        const firstElementIndex = Number(activeOptions[0].element.dataset.index);
        const lastActiveOption = activeOptions[activeOptions.length - 1];
        const lastElementIndex = Number(lastActiveOption.element.dataset.index);
        if (currentOption.index === lastElementIndex) {
            this.choicesListSelectOption(firstElementIndex);
            return;
        }

        const containerDimensions = this._container.getBoundingClientRect();
        const listDimensions = this._list.getBoundingClientRect();

        for (
            let element = currentOption.option.element;
            element;
            element = nextActiveSibling(element)
        ) {
            const optionDimensions = element.getBoundingClientRect();
            if (this._isElementBelowContainer(optionDimensions, listDimensions, containerDimensions)) {
                const index = Number(element.dataset.index);
                this.choicesListSelectOption(index);
                return;
            }
        }

        this.choicesListSelectOption(lastElementIndex);
    }

    pagedListPreviousPage() {
        const currentOption = this.choicesListCurrentlySelectedOption;
        if (!currentOption) {
            return;
        }

        const containerDimensions = this._container.getBoundingClientRect();
        const listDimensions = this._list.getBoundingClientRect();
        
        const activeOptions = this.choicesListActiveOptions;
        const firstElementIndex = Number(activeOptions[0].element.dataset.index);
        const lastActiveOption = activeOptions[activeOptions.length - 1];
        const lastElementIndex = Number(lastActiveOption.element.dataset.index);
        if (currentOption.index === firstElementIndex) {
            this.choicesListSelectOptionNoEvent(lastElementIndex);
            this._selectTopmostVisibleElement(lastActiveOption.element, listDimensions, containerDimensions);
            return;
        }

        for (
            let element = currentOption.option.element;
            element;
            element = previousActiveSibling(element)
        ) {
            const optionDimensions = element.getBoundingClientRect();
            if (this._isElementAboveContainer(optionDimensions, listDimensions, containerDimensions)) {
                const index = Number(element.dataset.index);
                this.choicesListSelectOptionNoEvent(index);
                this._selectTopmostVisibleElement(element, listDimensions, containerDimensions);
                return;
            }
        }

        this.choicesListSelectOption(firstElementIndex);
    }

    /**
     * 
     * @param {HTMLElement} startingElement 
     * @param {DOMRect} listDimensions
     * @param {DOMRect} containerDimensions
     */
    _selectTopmostVisibleElement(startingElement, listDimensions, containerDimensions) {
        const topmostElement = this._findTopmostVisibleElement(startingElement, listDimensions, containerDimensions);
        const topmostIndex = Number(topmostElement.dataset.index);
        super.choicesListSelectOption(topmostIndex);
    }

    /**
     * 
     * @param {HTMLElement} startingElement 
     * @param {DOMRect} listDimensions
     * @param {DOMRect} containerDimensions
     */
    _findTopmostVisibleElement(startingElement, listDimensions, containerDimensions) {
        for (
            let element = startingElement;
            element;
            element = previousActiveSibling(element)
        ) {
            const previousElement = previousActiveSibling(element);
            if (!previousElement) {
                return element;
            }

            const previousElementDimensions = previousElement.getBoundingClientRect();
            if (this._isElementAboveContainer(previousElementDimensions, listDimensions, containerDimensions)) {
                return element;
            }
        }

        return startingElement;
    }

    /**
     * 
     * @param {DOMRect} elementDimensions 
     * @param {DOMRect} listDimensions 
     * @param {DOMRect} containerDimensions 
     */
    _isElementAboveContainer(elementDimensions, listDimensions, containerDimensions) {
        const realElementTop = elementDimensions.top - listDimensions.top - this._scroll;
        return realElementTop < containerDimensions.top;
    }

    /**
     * 
     * @param {DOMRect} elementDimensions 
     * @param {DOMRect} listDimensions 
     * @param {DOMRect} containerDimensions 
     */
    _isElementBelowContainer(elementDimensions, listDimensions, containerDimensions) {
        const realElementBottom = elementDimensions.bottom - listDimensions.top - this._scroll;
        return realElementBottom > containerDimensions.bottom;
    }

    /**
     * Scrolls the list to the y position, clamped between 0 and maxScroll
     * @param {number} y 
     * @param {number} [maxScroll] 
     */
    _scrollTo(y, maxScroll = Number.MAX_SAFE_INTEGER) {
        const scroll = clamp(y, 0, maxScroll);
        this._scroll = scroll;
        this._list.style.top = `-${scroll}px`;
    }

    /**
     * 
     * @param {number} listHeight 
     * @param {number} containerHeight 
     * @returns 
     */
    _calculateMaxScroll(listHeight, containerHeight) {
        return listHeight - containerHeight;
    }

}

/**
 * 
 * @param {HTMLElement} element 
 */
function nextActiveSibling(element) {
    do {
        element = element.nextElementSibling;
    } while(element && !isActiveElement(element));

    return element;
}

/**
 * 
 * @param {HTMLElement} element 
 */
function previousActiveSibling(element) {
    do {
        element = element.previousElementSibling;
    } while(element && !isActiveElement(element));

    return element;
}

/**
 * 
 * @param {HTMLElement} element 
 */
function isActiveElement(element) {
    const dataset = element.dataset;
    return !dataset.disabled && !dataset.hidden;
}