import { ChoicesList } from '../../message/components/choices_list.js';

export class AreYouSure extends HTMLElement {

    /**
     * 
     * @param {string} [tagName] 
     */
    static register(tagName) {
        registerAreYouSure(tagName);
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
        this._areYouSureChoicesList = new ChoicesList(dependencies);
        this._areYouSureChoicesList.part = this._areYouSureChoicesList.id = this._areYouSureChoicesList.id = 'are-you-sure-choices-list';
        this._areYouSureTextDiv = document.createElement('div');
        this._areYouSureTextDiv.part = this._areYouSureTextDiv.id = 'are-you-sure-text-div';

        const style = document.createElement('style');
        style.innerHTML = /*css*/`
            :host {
                --transition-time: 0.1s;
                --choices-list-transition-time: var(--transition-time);
                display: none;

                transition-property: opacity;
                transition-duration: var(--transition-time);
                opacity: 1;

                @starting-style {
                    opacity: 0;
                }
            }

            #${this._areYouSureChoicesList.id}::part(choices-list) {
                anchor-name: --choices-list;
                --transition-time: var(--choices-list-transition-time);
            }

            #${this._areYouSureTextDiv.id} {
                text-align: center;
                width: 100%;
                height: 100%;
                position: absolute;
                top: anchor(--choices-list bottom);
            }
        `;

        this.shadowRoot.append(
            style,
            this._areYouSureChoicesList,
            this._areYouSureTextDiv
        );
    }

    /**
     * @param {{ choices?: [string], text?: { text: string, id?: number }, defaultIndex?: number }} options
     * @returns {boolean} True if should exit, false if cancelled
     */
    async areYouSureShow(options) {
        this.style.setProperty('display', 'unset');

        const finalOptions = Object.assign({
            choices: [ { text: 'Yes' }, { text: 'No' } ],
            text: 'Are you sure?',
            defaultIndex: 1
        }, options);

        this._areYouSureTextDiv.innerHTML = finalOptions.text;
        return await this._areYouSureChoicesList.choicesListTakeOneChoice(finalOptions.choices, finalOptions.defaultIndex);
    }

    areYouSureHide() {
        this.style.setProperty('display', 'none');
    }

    get choicesList() {
        return this._areYouSureChoicesList;
    }
}

/**
 * 
 * @param {string} [tagName] 
 */
export function registerAreYouSure(tagName = 'are-you-sure') {
    if (!customElements.get(tagName)) {
        customElements.define(tagName, AreYouSure);
    }
}