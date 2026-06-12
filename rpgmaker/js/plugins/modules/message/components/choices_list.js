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
        choicesList.style.background = 'green';
        choicesList.style.lineHeight = 1.5;
        choicesList.style.listStyleType = 'none';
        choicesList.style.padding = '10px';
        for (let i = 0; i < 5; i++) {
            const option = document.createElement('li');
            option.innerHTML = `Option ${i + 1}`;
            option.style.background = 'yellow';
            option.style.margin = '10px 0px';
            choicesList.appendChild(option);
        }

        this.shadowRoot.appendChild(choicesList);
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