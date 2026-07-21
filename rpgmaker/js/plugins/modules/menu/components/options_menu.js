export class OptionsMenu extends HTMLElement {

    /**
     * 
     * @param {string} [tagName] 
     */
    static register(tagName) {
        registerOptionsMenu(tagName);
    }

}

/**
 * 
 * @param {string} [tagName] 
 */
export function registerOptionsMenu(tagName = 'options-menu') {
    if (!customElements.get(tagName)) {
        customElements.define(tagName, OptionsMenu);
    }
}