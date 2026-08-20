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
            this._scrollTo(scrollTarget);
        } else if (isElementAboveContainer(optionDimensions, listDimensions, containerDimensions, this._scroll)) {
            const optionElementTopRelativeToList = optionDimensions.top - listDimensions.top;
            this._scrollTo(optionElementTopRelativeToList);
        }

        return option;
    }

    scrollableListNextPage() {
        const currentOption = this.choicesListCurrentlySelectedOption;
        if (!currentOption) {
            return;
        }

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
        this.choicesListSelectOption(elementIndex);

        const elementDimensions = elementToSelect.getBoundingClientRect();
        this._scrollTo(elementDimensions.top - listDimensions.top);
        this._list.classList.add(PAGE_SCROLL_CSS_CLASS, PAGE_SCROLL_DOWN_CSS_CLASS);
    }

    scrollableListPreviousPage() {
        const currentOption = this.choicesListCurrentlySelectedOption;
        if (!currentOption) {
            return;
        }

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
        this.choicesListSelectOption(elementIndex);

        const elementDimensions = elementToSelect.getBoundingClientRect();
        this._scrollTo(elementDimensions.bottom - listDimensions.top - containerDimensions.height);
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
     */
    _scrollTo(y) {
        this._list.classList.remove(PAGE_SCROLL_CSS_CLASS, PAGE_SCROLL_DOWN_CSS_CLASS, PAGE_SCROLL_UP_CSS_CLASS);
        this._scroll = scrollElementTo(this._list, y);
    }

}