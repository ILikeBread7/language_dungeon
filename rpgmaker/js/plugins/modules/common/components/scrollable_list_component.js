import { ChoicesListComponent } from '../../message/components/choices_list.js';
import { clamp } from '../../message/components/utils.js';

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

        if (this._isElementBelowContainer(optionDimensions, containerDimensions)) {
            const optionElementTopRelativeToList = optionDimensions.top - listDimensions.top;
            const maxScroll = this._calculateMaxScroll(listDimensions.height, containerDimensions.height);
            this._scrollTo(optionElementTopRelativeToList, maxScroll);
        } else if (this._isElementAboveContainer(optionDimensions, containerDimensions)) {
            const optionElementBottomRelativeToList = optionDimensions.bottom - listDimensions.top;
            console.log(optionElementBottomRelativeToList)
            this._scrollTo(optionElementBottomRelativeToList - containerDimensions.height);
        }

        return option;
    }

    scrollableListNextPage() {
        this._changePage(element => element.nextElementSibling);
    }

    scrollableListPreviousPage() {
        this._changePage(element => element.previousElementSibling);
    }

    /**
     * 
     * @param {(current: HTMLElement) => HTMLElement} nextElementFunction 
     */
    _changePage(nextElementFunction) {
        const currentOption = this.choicesListCurrentlySelectedOption;
        if (!currentOption) {
            return;
        }

        const listDimensions = this._list.getBoundingClientRect();
        const containerDimensions = this._container.getBoundingClientRect();

        for (
            let element = currentOption.option.element;
            element;
            element = nextElementFunction(element)
        ) {
            const optionDimensions = element.getBoundingClientRect();
            if (this._isElementOutOfView(optionDimensions, listDimensions, containerDimensions)) {
                const maxScroll = this._calculateMaxScroll(listDimensions.height, containerDimensions.height);
                this._scrollTo(optionDimensions.top, maxScroll);
                const optionIndex = Number(element.dataset.index);
                super.choicesListSelectOption(optionIndex);
                return;
            }
        }
    }

    /**
     * 
     * @param {DOMRect} elementDimensions 
     * @param {DOMRect} containerDimensions 
     */
    _isElementAboveContainer(elementDimensions, containerDimensions) {
        return elementDimensions.top < containerDimensions.top;
    }

    /**
     * 
     * @param {DOMRect} elementDimensions 
     * @param {DOMRect} containerDimensions 
     */
    _isElementBelowContainer(elementDimensions, containerDimensions) {
        return elementDimensions.bottom > containerDimensions.bottom;
    }

    /**
     * Scrolls the list to the y position, clamped between 0 and maxScroll
     * @param {number} y 
     * @param {number} [maxScroll] 
     */
    _scrollTo(y, maxScroll = Number.MAX_SAFE_INTEGER) {
        const scroll = clamp(y, 0, maxScroll);
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