import { OPEN_STATE, VISIBILITY_STATE } from '../../common/enums.js';
import { CHOICES_LIST_EVENTS, ChoicesList } from '../../message/components/choices_list.js';
import { AreYouSure } from './are_you_sure.js';

/**
 * @typedef {import('../../message/components/choices_list.js').ChoiceListChoice} ChoiceListChoice
 */

const MAIN_MENU_CHOICES = /** @type {const} */ Object.freeze({
    ITEM: { text: 'Item', id: 1 },
    FLOOR: { text: 'Floor', id: 2 },
    OPTIONS: { text: 'Options', id: 3 },
    SAVE: { text: 'Save', id: 4 },
    EXIT: { text: 'Exit', id: 5 }
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
        this._mainMenuChoicesList = new ChoicesList(dependencies);
        this._mainMenuChoicesList.part = this._mainMenuChoicesList.id = 'main-menu-choices-list';
        AreYouSure.register();
        this._areYouSure = new AreYouSure();

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

            #${this._mainMenuChoicesList.id}::part(choices-list) {
                top: 0px;
                left: 0px;
                margin: 0px;
                transform: translate(-100%, 0);
                transition-property: transform;
                transition-duration: var(--choices-list-transition-time);
            }

            :host([data-state="${VISIBILITY_STATE.SHOWN}"]) #${this._mainMenuChoicesList.id}::part(choices-list) {
                transform: translate(0);
            }
        `;

        this._menuState = OPEN_STATE.CLOSED;
        this.dataset.state = VISIBILITY_STATE.HIDDEN;
        this.shadowRoot.append(
            style,
            this._mainMenuChoicesList,
            this._areYouSure
        );

        this._choicesListsStack = [ this._mainMenuChoicesList ];
    }

    /**
     * 
     * @returns {Promise<boolean>} True if exit was picked, false if cancel
     */
    async mainMenuOpen() {
        /**
         * @type {[ChoiceListChoice]}
         */
        const options = [
            MAIN_MENU_CHOICES.ITEM,
            MAIN_MENU_CHOICES.FLOOR,
            MAIN_MENU_CHOICES.OPTIONS,
            MAIN_MENU_CHOICES.SAVE,
            MAIN_MENU_CHOICES.EXIT
        ];

        this._mainMenuSetOptions(options);
        await this.mainMenuShow();

        let choice;
        do {
            choice = await this._mainMenuChoicesList.choicesListTakeChoice();
            if (choice.element) {
                choice.element.removeAttribute('data-chosen');
            }

            switch(choice.id) {
                case MAIN_MENU_CHOICES.EXIT.id:
                    this._mainMenuChoicesList.choicesListHide();
                    this._choicesListsStack.push(this._areYouSure.choicesList);
                    const shouldExit = await this._showExitAreYouSure();
                    this._choicesListsStack.pop();
                    this._areYouSure.areYouSureHide();
                    if (shouldExit) {
                        return true;
                    }
                    await this._mainMenuChoicesList.choicesListShow();
                break;
                default:
                    console.log(`Unimplemented choice: ${JSON.stringify(choice)}`);
            }
        } while (!choice.cancelled);

        return false;
    }

    /**
     * @param {[ChoiceListChoice]} options 
     */
    async _mainMenuSetOptions(options) {
        this._mainMenuChoicesList.choicesListSetChoices(options);
        this._mainMenuChoicesList.choicesListSelectOptionNoEvent(0);
        this._mainMenuChoicesList.choicesListShow();
        await this._mainMenuChoicesList.choicesListOpen();
    }

    /**
     * 
     * @returns {boolean} True if should exit, false if cancelled
     */
    async _showExitAreYouSure() {
        const choices = {
            EXIT: { text: 'Exit', id: 1 },
            CANCEL: { text: 'Cancel', id: 2 }
        };
        const text = 'Are you sure you want to exit?';
        const choice = await this._areYouSure.areYouSureShow({ choices: Object.values(choices), text });
        return choice.id === choices.EXIT.id;
    }

    async mainMenuShow() {
        this._menuState = OPEN_STATE.OPENING;
        this.style.setProperty('visibility', 'visible');
        await this._mainMenuChangeState(VISIBILITY_STATE.SHOWN);
        this._menuState = OPEN_STATE.OPEN;
    }

    async mainMenuHide() {
        this._menuState = OPEN_STATE.CLOSING;
        await this._mainMenuChangeState(VISIBILITY_STATE.HIDDEN);
        this.style.removeProperty('visibility');
        this._menuState = OPEN_STATE.CLOSED;
    }

    mainMenuSelectNextOption() {
        this.currentChoicesList.choicesListSelectNextOption();
    }

    mainMenuSelectPreviousOption() {
        this.currentChoicesList.choicesListSelectPreviousOption();
    }

    mainMenuConfirmCurrentOption() {
        this.currentChoicesList.choicesListConfirmCurrentOption();
    }

    mainMenuCancel() {
        const currentChoicesList = this.currentChoicesList;
        if (currentChoicesList.choicesListCancel()) {
            currentChoicesList.choicesListDeselect();
        }
    }

    get currentChoicesList() {
        return this._choicesListsStack[this._choicesListsStack.length - 1];
    }

    /**
     * 
     * @param {import('../../common/enums.js').VisibilityState} state
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