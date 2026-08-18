import { ChoicesListComponent } from '../../message/components/choices_list.js';
import { clamp, getNumberFromCssPxString } from '../../message/components/utils.js';

export class ScrollableListComponent extends ChoicesListComponent {

    static get componentDefaultTagName() {
        return 'scrollable-list-component';
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

    scrollableListNextPage() {
        const currentOption = this.choicesListCurrentlySelectedOption;
        if (!currentOption) {
            return;
        }

        const lastElementIndex = this.choicesListDisplayedOptions.length - 1;
        if (currentOption.index === lastElementIndex) {
            const firstElementIndex = 0;
            this.choicesListSelectOption(firstElementIndex);
            return;
        }

        const containerDimensions = this._container.getBoundingClientRect();
        const listDimensions = this._list.getBoundingClientRect();

        for (
            let element = currentOption.option.element;
            element;
            element = element.nextElementSibling
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

    scrollableListPreviousPage() {
        const currentOption = this.choicesListCurrentlySelectedOption;
        if (!currentOption) {
            return;
        }

        const containerDimensions = this._container.getBoundingClientRect();
        const listDimensions = this._list.getBoundingClientRect();
        
        const firstElementIndex = 0;
        if (currentOption.index === firstElementIndex) {
            const lastElementIndex = this.choicesListDisplayedOptions.length - 1;
            this.choicesListSelectOptionNoEvent(lastElementIndex);
            this._selectTopmostVisibleElement(this.choicesListDisplayedOptions[lastElementIndex].element, listDimensions, containerDimensions);
            return;
        }

        for (
            let element = currentOption.option.element;
            element;
            element = element.previousElementSibling
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
            element = element.previousElementSibling
        ) {
            const previousElement = element.previousElementSibling;
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