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
            }

            #${choicesList.id} > li:not(:first-of-type) {
                margin-top: 10px;
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
     * @param {[{text: string}]} options 
     */
    async choicesListSetChoices(options) {
        this._choicesList.innerHTML = '';
        for (const option of options) {
            const optionElement = document.createElement('li');
            optionElement.innerHTML = option.text;
            this._choicesList.appendChild(optionElement);
        }
        if (!this.choicesListIsVisible()) {
            await this.choicesListShow();
        }
    }

    choicesListIsVisible() {
        return this._choicesList.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, contentVisibilityAuto: true });
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