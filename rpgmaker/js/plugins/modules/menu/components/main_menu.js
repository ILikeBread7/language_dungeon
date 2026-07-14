import { CHOICES_LIST_EVENTS, ChoicesList } from '../../message/components/choices_list.js';

export const MENU_STATE = /** @type {const} */ Object.freeze({
    OPENING: 1,
    OPEN: 2,
    CLOSING: 3,
    CLOSED: 4
});
/**
 * @typedef { Enum<MENU_STATE> } MenuState
 */

const VISIBILITY_STATE = /** @type {const} */ Object.freeze({
    HIDDEN: 'hidden',
    SHOWN: 'shown'
});

export class MainMenu extends HTMLElement {

    /**
     * 
     * @param {string} [tagName] 
     */
    static register(tagName) {
        registerMainMenu(tagName);
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

        ChoicesList.register();
        this._choicesList = new ChoicesList();
        this._choicesList.part = this._choicesList.id = 'choices-list';;
        
        for (const eventName of [ CHOICES_LIST_EVENTS.CHOICES_CANCEL, CHOICES_LIST_EVENTS.OPTION_CONFIRM ]) {
            this._choicesList.addEventListener(eventName, () => this._resolveMenuPromise());
        }

        const style = document.createElement('style');
        style.innerHTML = /*css*/`
            :host {
                --transition-time: 0.1s;
                --choices-list-transition-time: 0.2s;
                visibility: hidden;

                transition-property: opacity;
                transition-duration: var(--transition-time);
            }

            :host::before {
                content: '';
                position: absolute;
                display: block;
                width: 100%;
                height: 100%;
                background: purple;
                opacity: 0.6;
            }

            :host([data-state="${VISIBILITY_STATE.SHOWN}"]) {
                opacity: 1;
            }

            :host([data-state="${VISIBILITY_STATE.HIDDEN}"]) {
                transition-delay: calc(var(--choices-list-transition-time) - var(--transition-time));
                opacity: 0;
            }

            #${this._choicesList.id}::part(choices-list) {
                top: 0px;
                left: 0px;
                margin: 0px;
                transform: translate(-100%, 0);
                transition-property: transform;
                transition-duration: var(--choices-list-transition-time);
            }

            :host([data-state="${VISIBILITY_STATE.SHOWN}"]) #${this._choicesList.id}::part(choices-list) {
                transform: translate(0);
            }
        `;

        this._menuState = MENU_STATE.CLOSED;
        this.dataset.state = VISIBILITY_STATE.HIDDEN;
        this.shadowRoot.append(style, this._choicesList);
    }

    /**
     * @typedef {import('../../message/components/choices_list.js').ChoiceListChoice} ChoiceListChoice
     * @param {[ChoiceListChoice]} options 
     */
    async mainMenuSetOptions(options) {
        return new Promise(async (resolve) => {
            this._menuResolve = resolve;

            await Promise.all([
                this.mainMenuShow(),
                this._choicesList.choicesListSetChoices(options)
            ]);
        });
    }

    async mainMenuShow() {
        this._menuState = MENU_STATE.OPENING;
        this.style.setProperty('visibility', 'visible');
        await this._mainMenuChangeState(VISIBILITY_STATE.SHOWN);
        this._menuState = MENU_STATE.OPEN;
    }

    async mainMenuHide() {
        this._menuState = MENU_STATE.CLOSING;
        await this._mainMenuChangeState(VISIBILITY_STATE.HIDDEN);
        this.style.removeProperty('visibility');
        this._menuState = MENU_STATE.CLOSED;
    }

    mainMenuSelectNextOption() {
        this._choicesList.choicesListSelectNextOption();
    }

    mainMenuSelectPreviousOption() {
        this._choicesList.choicesListSelectPreviousOption();
    }

    mainMenuConfirmCurrentOption() {
        this._choicesList.choicesListConfirmCurrentOption();
    }

    mainMenuCancel() {
        this._choicesList.choicesListCancel();
    }

    _resolveMenuPromise() {
        if (this._menuResolve) {
            this._menuResolve();
            delete this._menuResolve;
        }
    }

    /**
     * 
     * @param {MenuState} state
     * @returns {Promise<void>}
     */
    async _mainMenuChangeState(state) {
        return new Promise((resolve) => {
            this.dataset.state = state;
    
            const listener = element => {
                if (element.target !== this) {
                    return;
                }
    
                this.removeEventListener('transitionend', listener);
                resolve();
            };
            this.addEventListener('transitionend', listener);
        });
    }

}

/**
 * 
 * @param {string} [tagName] 
 */
export function registerMainMenu(tagName = 'main-menu') {
    if (!customElements.get(tagName)) {
        customElements.define(tagName, MainMenu);
    }
}