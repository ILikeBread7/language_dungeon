import { ChoicesList } from '../../message/components/choices_list.js';

ChoicesList.register();

export class MainMenu extends HTMLElement {

    /**
     * 
     * @param {string} [tagName] 
     */
    static register(tagName) {
        registerMainMenu(tagName);
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