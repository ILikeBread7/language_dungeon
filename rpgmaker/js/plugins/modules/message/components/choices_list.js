import { BaseComponent } from '../../common/components/base_component.js';

/**
 * @typedef { {
 *  text: string,
 *  element: HTMLElement,
 *  visible?: boolean,
 *  enabled?: boolean
 * } } ChoiceListOption
 * @typedef { { 
 *  text: string,
 *  enabled?: boolean,
 *  visible?: boolean,
 *  cssClass?: string,
 *  id?: number,
 *  } } ChoiceListChoice
 * @typedef { {
 *  index: number,
 *  text: string,
 *  cancelled: boolean,
 *  id?: number,
 *  element?: HTMLElement
 * } } ChoiceListPlayerChoice
 */

export const CHOICES_LIST_EVENTS = /** @type {const} */ Object.freeze({
    OPTION_SELECT: 'optionselect',
    OPTION_CONFIRM: 'optionconfirm',
    CHOICES_CANCEL: 'choicescancel'
});
/**
 * @typedef { Enum<CHOICES_LIST_EVENTS> } ChoiceListEvent
 */

const CHOICES_LIST_CSS_CLASS_NAME = 'choices-list';

export class ChoicesListComponent extends BaseComponent {

    static get componentDefaultTagName() {
        return 'choices-list-component';
    }

    get componentCssStyle() {
        return /*css*/`
            ${this.componentTagName} .${CHOICES_LIST_CSS_CLASS_NAME} {
                list-style-type: none;
                padding: 0px;
                background: green;
                margin: 0px;
            }

            ${this.componentTagName} .${CHOICES_LIST_CSS_CLASS_NAME} > li {
                background: yellow;
                text-align: center;
                cursor: pointer;
            }

            ${this.componentTagName} .${CHOICES_LIST_CSS_CLASS_NAME} > li:not(:first-of-type) {
                margin-top: 10px;
            }

            ${this.componentTagName} .${CHOICES_LIST_CSS_CLASS_NAME} > li[data-disabled="disabled"] {
                pointer-events: none;
                opacity: 0.6;
            }

            ${this.componentTagName} .${CHOICES_LIST_CSS_CLASS_NAME} > li[data-selected="selected"] {
                background: blue;
                color: white;
            }
        `;
    }

    constructor() {
        super();

        const list = document.createElement('ul');
        list.classList.add(CHOICES_LIST_CSS_CLASS_NAME);

        list.addEventListener('pointerover', event => {
            const element = event.target;
            if (element.nodeName !== 'LI') {
                return;
            }
            const index = Number(element.dataset.index);
            this.choicesListSelectOption(index);
        });

        list.addEventListener('click', event => {
            const element = event.target;
            if (element.nodeName !== 'LI') {
                return;
            }
            const index = Number(element.dataset.index);
            this.choicesListConfirmOption(index);
        });

        this._active = false;
        this._list = list;
        this.appendChild(list);
    }

    choicesListActivate() {
        this._active = true;
    }

    choicesListDeactivate() {
        this._active = false;
    }

    get choicesListActive() {
        return this._active;
    }

    /**
     * 
     * @returns {Promise<ChoiceListPlayerChoice>}
     */
    async choicesListTakeChoice() {
        return new Promise(resolve => {
            this._choicesResolve = resolve;
        });
    }

    /**
     * @param {[ChoiceListChoice]} options 
     */
    choicesListSetChoices(options) {
        /**
         * @type {[ChoiceListOption]}
        */
        this._displayedOptions = [];

        this._list.innerHTML = '';
        delete this._selectedIndex;

        for (let i = 0; i < options.length; i++) {
            const option = options[i];
            if (!option.visible && option.visible !== undefined) {
                this._displayedOptions.push(option);
                continue;
            }
            const optionElement = document.createElement('li');
            optionElement.part = 'choice-item';
            optionElement.innerHTML = option.text;
            optionElement.dataset.index = i;
            if (!option.enabled && option.enabled !== undefined) {
                optionElement.dataset.disabled = 'disabled';
            }
            if (option.cssClass) {
                optionElement.className = option.cssClass;
            }
            this._list.appendChild(optionElement);
            this._displayedOptions.push({ ...option, element: optionElement });
        }
    }

    choicesListSelectNextOption() {
        if (!this._active || !this._displayedOptions) {
            return;
        }
        
        const currentIndex = this._selectedIndex === undefined ? -1 : this._selectedIndex;
        for (let i = currentIndex + 1; i < this._displayedOptions.length; i++) {
            const option = this._displayedOptions[i];
            if (this.choicesListSelectOption(i)) {
                return;
            }
        }

        for (let i = 0; i < this._displayedOptions.length; i++) {
            if (this.choicesListSelectOption(i)) {
                return;
            }
        }
    }

    choicesListSelectPreviousOption() {
        if (!this._active || !this._displayedOptions) {
            return;
        }
        
        const currentIndex = this._selectedIndex === undefined ? this._displayedOptions.length : this._selectedIndex;
        for (let i = currentIndex - 1; i >= 0; i--) {
            const option = this._displayedOptions[i];
            if (this.choicesListSelectOption(i)) {
                return;
            }
        }

        for (let i = this._displayedOptions.length; i >= 0; i--) {
            if (this.choicesListSelectOption(i)) {
                return;
            }
        }
    }

    /**
     * 
     * @param {number} index 
     * @returns Option if selected successfully, undefined if couldn't select
     */
    choicesListSelectOption(index) {
        if (!this._active) {
            return;
        }
        const option = this.choicesListSelectOptionNoEvent(index);
        if (option) {
            this.dispatchEvent(new CustomEvent(CHOICES_LIST_EVENTS.OPTION_SELECT, { detail: { index, option } }));
        }
        return option;
    }

    /**
     * 
     * @param {number} [index] default 0
     * @returns Option if selected successfully, undefined if couldn't select
     */
    choicesListSelectOptionNoEvent(index = 0) {
        const option = this._findEligibleOption(index);
        if (!option) {
            return;
        }

        for (const displayedOption of this._displayedOptions) {
            const optionElement = displayedOption.element;
            if (optionElement) {
                optionElement.removeAttribute('data-selected');
            }
        }
        option.element.dataset.selected = 'selected';
        this._selectedIndex = index;
        return option;
    }

    /**
     * 
     * @param {number} index 
     * @returns Option if confirm succeeded, undefined if couldn't confirm (invalid option etc.)
     */
    choicesListConfirmOption(index) {
        const option = this.choicesListConfirmOptionNoEvent(index);
        if (!option) {
            return;
        }
        this.dispatchEvent(new CustomEvent(CHOICES_LIST_EVENTS.OPTION_CONFIRM, { detail: { index, option } }));
        return option;
    }

    /**
     * 
     * @param {number} index 
     * @returns Option if confirm succeeded, undefined if couldn't confirm (invalid option etc.)
     */
    choicesListConfirmOptionNoEvent(index) {
        if (!this._active) {
            return;
        }

        const option = this._findEligibleOption(index);
        if (!option) {
            return;
        }

        if (this._choicesResolve) {
            this._choicesResolve({ index, text: option.text, id: option.id, element: option.element });
            delete this._choicesResolve;
        }
        option.element.dataset.chosen = 'chosen';
        
        return option;
    }

    /**
     * 
     * @returns Option if confirm succeeded, undefined if couldn't confirm (invalid option etc.)
     */
    choicesListConfirmCurrentOption() {
        return this.choicesListConfirmOption(this._selectedIndex);
    }

    /**
     * 
     * @param {number} index 
     * @returns Option if found, undefined otherwise
     */
    _findEligibleOption(index) {
        if (!this._displayedOptions) {
            return;
        }

        const option = this._displayedOptions[index];
        if (!option || !option.element || option.element.dataset.disabled) {
            return;
        }

        return option;
    }

    /**
     * 
     * @returns true if cancel succeeded, false if couldn't cancel
     */
    choicesListCancel() {
        const result = this.choicesListCancelNoEvent();
        if (result) {
            this.dispatchEvent(new CustomEvent(CHOICES_LIST_EVENTS.CHOICES_CANCEL));
        }
        return result;
    }

    /**
     * 
     * @returns true if cancel succeeded, false if couldn't cancel
     */
    choicesListCancelNoEvent() {
        if (!this._active) {
            return false;
        }

        if (this._choicesResolve) {
            this._choicesResolve({ index: -1, cancelled: true });
            delete this._choicesResolve;
        }
        
        return true;
    }

    choicesListDeselect() {
        const optionElements = this._list.children;

        for (const optionElement of optionElements) {
            optionElement.removeAttribute('data-selected');
        }
    }

    /**
     * @returns {{ index: number, option: ChoiceListOption } | undefined}
     */
    get choicesListCurrentlySelectedOption() {
        if (this._active && this._displayedOptions) {
            const option = this._displayedOptions[this._selectedIndex];
            if (!option) {
                return;
            }
            return { index: this._selectedIndex, option };
        }
    }

    get choicesListDisplayedOptions() {
        return this._displayedOptions;
    }

}