import { ChoicesListComponent } from '../../message/components/choices_list.js';
import { clamp, getNumberFromCssPxString, isElementAboveContainer, isElementBelowContainer, nextActiveSiblingOptionElement, previousActiveSiblingOptionElement, scrollElementTo } from '../../message/components/utils.js';

export class PagedListComponent extends ChoicesListComponent {

    static get componentDefaultTagName() {
        return 'paged-list-component';
    }

    get componentCssStyle() {
        return /*css*/`
            ${super.componentCssStyle}

            ${this.componentTagName} .choices-list {
                position: relative;
                top: 0px;
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
            const optionElementTopRelativeToList = optionDimensions.top - listDimensions.top;
            const maxScroll = this._calculateMaxScroll(listDimensions.height, containerDimensions.height);
            this._scrollTo(optionElementTopRelativeToList, maxScroll);
        } else if (isElementAboveContainer(optionDimensions, listDimensions, containerDimensions, this._scroll)) {
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
            element = nextActiveSiblingOptionElement(element)
        ) {
            const optionDimensions = element.getBoundingClientRect();
            if (isElementBelowContainer(optionDimensions, listDimensions, containerDimensions, this._scroll)) {
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
            element = previousActiveSiblingOptionElement(element)
        ) {
            const optionDimensions = element.getBoundingClientRect();
            if (isElementAboveContainer(optionDimensions, listDimensions, containerDimensions, this._scroll)) {
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
            element = previousActiveSiblingOptionElement(element)
        ) {
            const previousElement = previousActiveSiblingOptionElement(element);
            if (!previousElement) {
                return element;
            }

            const previousElementDimensions = previousElement.getBoundingClientRect();
            if (isElementAboveContainer(previousElementDimensions, listDimensions, containerDimensions, this._scroll)) {
                return element;
            }
        }

        return startingElement;
    }

    /**
     * Scrolls the list to the y position, clamped between 0 and maxScroll
     * @param {number} y 
     * @param {number} [maxScroll] 
     */
    _scrollTo(y, maxScroll = Number.MAX_SAFE_INTEGER) {
        this._scroll = scrollElementTo(this._list, y, maxScroll);
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