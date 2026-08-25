import { BaseComponent } from '../../common/components/base_component.js';
import { ChoicesListComponent } from '../../message/components/choices_list.js';
import { takeOneChoice } from '../../message/components/utils.js';

/**
 * @typedef { {
 *  choices?: [import('../../message/components/choices_list.js').ChoiceListChoice],
 *  explanation?: string,
 *  defaultIndex?: number }
 * } AreYouSureOptions
 */

export const ARE_YOU_SURE_IDS = /** @type {const} */ Object.freeze({
    YES: 1,
    NO: 2
});
/**
 * @typedef { Enum<ARE_YOU_SURE_IDS> } AreYouSureIds
 */

export class AreYouSureComponent extends BaseComponent {

    static get componentDefaultTagName() {
        return 'are-you-sure-component';
    }

    get componentCssStyle() {
        return /*css*/`
            ${this.componentTagName} .explanation {
                text-align: center;
                position: absolute;
                width: 100%;
                height: 100%;
                top: anchor(--choices-list bottom);
            }

            ${this.componentTagName} .choices-list {
                anchor-name: --choices-list;
            }
        `;
    }

    constructor() {
        super();
        ChoicesListComponent.register();

        this._choicesList = new ChoicesListComponent();
        this._explanationDiv = document.createElement('div');
        this._explanationDiv.classList.add('explanation');

        this.append(
            this._choicesList,
            this._explanationDiv
        );
    }

    /**
     * @param {AreYouSureOptions} [options]
     */
    async areYouSureTakeChoice(options) {
        const finalOptions = Object.assign({
            choices: [
                { text: 'Yes', id: ARE_YOU_SURE_IDS.YES },
                { text: 'No', id: ARE_YOU_SURE_IDS.NO } ],
            explanation: 'Are you sure?',
            defaultIndex: 1
        }, options);

        this._explanationDiv.innerHTML = finalOptions.explanation;
        return await this._choicesList.choicesListTakeOneChoice(finalOptions.choices, finalOptions.defaultIndex);
    }

    get choicesList() {
        return this._choicesList;
    }
}