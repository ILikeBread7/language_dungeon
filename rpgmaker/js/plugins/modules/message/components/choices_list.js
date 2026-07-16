/**
 * @typedef { { text: string, element: HTMLElement, visible?: boolean, enabled?: boolean } } ChoiceListOption
 * @typedef { { 
     *  text: string,
     *  enabled?: boolean,
     *  visible?: boolean,
     *  cssClass?: string
 *  } } ChoiceListChoice
 */

export const LIST_STATE = /** @type {const} */ Object.freeze({
    OPENING: 1,
    OPEN: 2,
    CLOSING: 3,
    CLOSED: 4
});
/**
 * @typedef { Enum<LIST_STATE> } ListState
 */

export const CHOICES_LIST_EVENTS = /** @type {const} */ Object.freeze({
    OPTION_SELECT: 'optionselect',
    OPTION_CONFIRM: 'optionconfirm',
    CHOICES_CANCEL: 'choicescancel'
});
/**
 * @typedef { Enum<CHOICES_LIST_EVENTS> } ChoiceListEvent
 */

const VISIBILITY_STATE = /** @type {const} */ Object.freeze({
    HIDDEN: 'hidden',
    SHOWN: 'shown'
});

export class ChoicesList extends HTMLElement {

    /**
     * 
     * @param {string} [tagName] 
     */
    static register(tagName) {
        registerChoicesList(tagName);
    }

    /**
     * 
     * @param { {
     *  wait: (time: number) => Promise<void>
     * } } dependencies 
     */
    constructor(dependencies = { wait: time => new Promise(resolve => setTimeout(resolve, time)) }) {
        super();
        this.attachShadow({ mode: 'open' });
        this._dependencies = dependencies;

        const choicesList = document.createElement('ul');
        choicesList.part = choicesList.id = 'choices-list';
        this.dataset.state = VISIBILITY_STATE.HIDDEN;

        choicesList.addEventListener('pointerover', event => {
            const element = event.target;
            if (element.nodeName !== 'LI') {
                return;
            }
            const index = Number(element.dataset.index);
            this.choicesListSelectOption(index);
        });

        choicesList.addEventListener('click', event => {
            const element = event.target;
            if (element.nodeName !== 'LI') {
                return;
            }
            const index = Number(element.dataset.index);
            this.choicesListConfirmOption(index);
        });

        const style = document.createElement('style');
        style.innerHTML = /*css*/`
            :host {
                --transition-time: 0.5s;
                --message-box-height: calc(1em * 4 * 1.2);
                visibility: hidden;
            }

            :host([data-state="${VISIBILITY_STATE.SHOWN}"]) #${choicesList.id} {
                opacity: 1;
            }

            :host([data-state="${VISIBILITY_STATE.HIDDEN}"]) #${choicesList.id} {
                opacity: 0;
            }

            #${choicesList.id} {
                transition-property: opacity;
                transition-duration: var(--transition-time);
                
                position: absolute;
                left: 50%;
                top: calc((100vh - var(--message-box-height)) / 2);
                width: 50%;
                transform: translate(-50%, -50%);
                list-style-type: none;
                padding: 0px;
                background: green;
            }

            #${choicesList.id} > li {
                background: yellow;
                text-align: center;
                cursor: pointer;
            }

            #${choicesList.id} > li:not(:first-of-type) {
                margin-top: 10px;
            }

            #${choicesList.id} > li[data-disabled="disabled"] {
                pointer-events: none;
                opacity: 0.6;
            }

            #${choicesList.id} > li[data-selected="selected"] {
                background: blue;
                color: white;
            }

            #${choicesList.id} > li[data-chosen="chosen"] {
                background: aqua;
            }
        `;
        this.shadowRoot.append(style, choicesList);

        this._listState = LIST_STATE.CLOSED;

        this._choicesList = choicesList;
    }

    async choicesListShow() {
        this._listState = LIST_STATE.OPENING;
        this.style.setProperty('visibility', 'visible');
        await this._choicesListChangeState(VISIBILITY_STATE.SHOWN);
        this._listState = LIST_STATE.OPEN;
    }

    async choicesListHide() {
        this._listState = LIST_STATE.CLOSING;
        await this._choicesListChangeState(VISIBILITY_STATE.HIDDEN);
        this.style.removeProperty('visibility');
        this._listState = LIST_STATE.CLOSED;
    }

    /**
     * @param {[ChoiceListChoice]} options 
     * @returns {Promise<{ index: number, text: string }>}
     */
    async choicesListSetChoices(options) {
        /**
         * @type {[ChoiceListOption]}
        */
        this._displayedOptions = [];

        this._choicesList.innerHTML = '';
        delete this._selectedIndex;

        for (let i = 0; i < options.length; i++) {
            const option = options[i];
            if (!option.visible && option.visible !== undefined) {
                this._displayedOptions.push(option);
                continue;
            }
            const optionElement = document.createElement('li');
            optionElement.innerHTML = option.text;
            optionElement.dataset.index = i;
            if (!option.enabled && option.enabled !== undefined) {
                optionElement.dataset.disabled = 'disabled';
            }
            if (option.cssClass) {
                optionElement.className = option.cssClass;
            }
            this._choicesList.appendChild(optionElement);
            this._displayedOptions.push({ ...option, element: optionElement });
        }
        if (!this.choicesListIsVisible()) {
            await this.choicesListShow();
        }
        
        return new Promise(resolve => {
            this._choicesResolve = resolve;
        });
    }

    choicesListIsVisible() {
        return this._choicesList.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, contentVisibilityAuto: true });
    }

    choicesListSelectNextOption() {
        if (!this._displayedOptions) {
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
        if (!this._displayedOptions) {
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
        const option = this.choicesListSelectOptionNoEvent(index);
        if (option) {
            this.dispatchEvent(new CustomEvent(CHOICES_LIST_EVENTS.OPTION_SELECT, { detail: { index, option } }));
        }
        return option;
    }

    /**
     * 
     * @param {number} index 
     * @returns Option if selected successfully, undefined if couldn't select
     */
    choicesListSelectOptionNoEvent(index) {
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
        const option = this._findEligibleOption(index);
        if (!option) {
            return;
        }

        if (!this._choicesResolve) {
            return;
        }
        option.element.dataset.chosen = 'chosen';
        this._choicesResolve({ index, text: option.text });
        
        delete this._choicesResolve;
        delete this._selectedIndex;
        delete this._displayedOptions;
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
        if (!this._choicesResolve) {
            return false;
        }
        this._choicesResolve({ index: -1, cancelled: true });
        
        delete this._choicesResolve;
        delete this._selectedIndex;
        delete this._displayedOptions;
        return true;
    }

    choicesListDeselect() {
        const optionElements = this._choicesList.children;
        console.log(optionElements)

        for (const optionElement of optionElements) {
            optionElement.removeAttribute('data-selected');
        }
    }

    /**
     * 
     * @param {ListState} state
     * @returns {Promise<void>}
     */
    async _choicesListChangeState(state) {
        return new Promise((resolve) => {
            this.dataset.state = state;
    
            const listener = element => {
                if (element.target !== this._choicesList) {
                    return;
                }
    
                this._choicesList.removeEventListener('transitionend', listener);
                resolve();
            };
            this._choicesList.addEventListener('transitionend', listener);
        });
    }

    get choicesListState() {
        return this._listState;
    }

}

/**
 * 
 * @param {string} [tagName] 
 */
export function registerChoicesList(tagName = 'choices-list') {
    if (!customElements.get(tagName)) {
        customElements.define(tagName, ChoicesList);
    }
}