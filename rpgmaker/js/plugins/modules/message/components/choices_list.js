const VISIBILITY_STATE = Object.freeze({
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
            if (this.choicesListConfirmOption(index)) {
                this.choicesListHide();
            }
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

        this._choicesList = choicesList;
    }

    async choicesListShow() {
        this.style.setProperty('visibility', 'visible');
        await this._choicesListChangeState(VISIBILITY_STATE.SHOWN);
    }

    async choicesListHide() {
        await this._choicesListChangeState(VISIBILITY_STATE.HIDDEN);
        this.style.removeProperty('visibility');
    }

    /**
     * 
     * @param {[{
     *  text: string,
     *  enabled?: boolean,
     *  visible?: boolean,
     *  cssClass?: string
     * }]} options 
     * @returns {Promise<{ index: number, text: string }>}
     */
    async choicesListSetChoices(options) {
        this._choicesList.innerHTML = '';
        this._displayedOptions = [];
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
            this._choicesPromise = resolve;
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
     * @returns {boolean} true if selected successfully, false if couldn't select
     */
    choicesListSelectOption(index) {
        if (!this._displayedOptions) {
            return false;
        }

        const option = this._displayedOptions[index];
        if (!option || !option.element || option.element.dataset.disabled) {
            return false;
        }

        for (const displayedOption of this._displayedOptions) {
            const optionElement = displayedOption.element;
            if (optionElement) {
                optionElement.removeAttribute('data-selected');
            }
        }
        option.element.dataset.selected = 'selected';
        this._selectedIndex = index;
        return true;
    }

    /**
     * 
     * @param {number} index 
     * @returns {boolean} true if confirm succeeded, false if couldn't confirm (invalid option etc.)
     */
    choicesListConfirmOption(index) {
        if (!this._displayedOptions) {
            return false;
        }

        const option = this._displayedOptions[index];
        if (!option || !option.element || option.element.dataset.disabled) {
            return false;
        }

        if (!this._choicesPromise) {
            return false;
        }
        option.element.dataset.chosen = 'chosen';
        this._choicesPromise({ index, text: option.text });
        
        delete this._choicesPromise;
        delete this._selectedIndex;
        delete this._displayedOptions;
        return true;
    }

    /**
     * 
     * @returns {boolean} true if confirm succeeded, false if couldn't confirm (invalid option etc.)
     */
    choicesListConfirmCurrent() {
        return this.choicesListConfirmOption(this._selectedIndex);
    }

    /**
     * 
     * @returns true if cancel succeeded, false if couldn't cancel
     */
    choicesListCancel() {
        if (!this._choicesPromise) {
            return false;
        }
        this._choicesPromise({ index: -1, cancelled: true });
        
        delete this._choicesPromise;
        delete this._selectedIndex;
        delete this._displayedOptions;
        return true;
    }

    /**
     * 
     * @param {string} top css value
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