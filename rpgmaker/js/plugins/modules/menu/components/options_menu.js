import { BaseComponent } from '../../common/components/base_component.js';
import { ListWithExplanation } from '../../common/helpers/list_with_explanation.js';
import { CHOICES_LIST_EVENTS, ChoicesListComponent } from '../../message/components/choices_list.js';

/**
 * @typedef {import('../../message/components/choices_list.js').ChoiceListChoice} ChoiceListChoice
 */

/**

*/

/**
 * @template T
 * @typedef {[{ value: T, text: string }]} RadioValues
 * @typedef {[{ min: number, max: number, step: number }]} SliderValues
 * @typedef { ChoiceListChoice & {
 *  explanation: string,
 *  value: T,
 *  input: {
 *      type: OptionInputType,
 *      values?: RadioValues|SliderValues
 *  }
 * } } OptionsListEntry
*/

export const INPUT_TYPE = /** @type {const} */ Object.freeze({
    RADIO: 1,
    SLIDER: 2,
    BACK: 3
});
/**
 * @typedef { Enum<INPUT_TYPE> } OptionInputType
 */

const VALUE_SPAN_CSS_CLASS = 'value';

export class OptionsMenuComponent extends BaseComponent {

    static get componentDefaultTagName() {
        return 'options-menu-component';
    }

    get componentCssStyle() {
        return /*css*/`
           ${this.componentTagName} .choices-list {
                anchor-name: --choices-list;
            }

           ${this.componentTagName} .explanation {
                text-align: center;
                width: 100%;
                height: 100%;
                position: absolute;
                top: anchor(--choices-list bottom);
            }
        `;
    }

    constructor() {
        super();
        
    }

    /**
     * @param {[OptionsListEntry]} options 
     */
    optionsMenuSetOptions(options) {
        this._options = options;
        
    }

    async optionsMenuStart() {

    }

    optionsMenuCancel() {

    }

}