import { BaseComponent } from '../../common/components/base_component.js';
import { ListWithExplanation } from '../../common/helpers/list_with_explanation.js';
import { CHOICES_LIST_EVENTS, ChoicesListComponent } from '../../message/components/choices_list.js';
import { isElementSelectable, refreshOptionAvailability } from '../../message/components/utils.js';
import { RADIO_EVENTS, RadioComponent } from './options/radio.js';
import { SLIDER_EVENTS, SliderComponent } from './options/slider.js';

/**
 * @typedef {import('../../message/components/choices_list.js').ChoiceListChoice} ChoiceListChoice
 */

/**
 * @typedef {[{ value: T, text: string }]} RadioValues
 * @typedef {[{ min: number, max: number, step: number }]} SliderValues
 */

/**
 * @template T
 * @template {RadioValues|SliderValues} V
 * @typedef { ChoiceListChoice & {
 *  explanation: string,
 *  value: T,
 *  input: {
 *      type: OptionInputType,
 *      values?: V
 *  },
 *  cssClass: string
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
const OPTION_CONTAINER_CSS_CLASS_NAME = 'option-container';
const OPTION_TEXT_CSS_CLASS_NAME = 'option-text';
const OPTION_BACK_CSS_CLASS_NAME = 'option-back';
const OPTION_CSS_CLASS_NAME = 'option';

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

            ${this.componentTagName} .${OPTION_CONTAINER_CSS_CLASS_NAME} {
                &> *[data-disabled="disabled"] {
                    pointer-events: none;
                    opacity: 0.6;
                }
    
                &> *[data-hidden="hidden"] {
                    display: none;
                }
    
                &> *[data-selected="selected"] {
                    background: blue;
                    color: white;
                }
            }
            
        `;
    }

    constructor() {
        super();
        RadioComponent.register();
        SliderComponent.register();

        this._optionsContainer = document.createElement('div');
        this.appendChild(this._optionsContainer);
    }

    /**
     * @param {[OptionsListEntry<T,V>]} options 
     */
    optionsMenuSetOptions(options) {
        this._options = options;
        this._optionsContainer.innerHTML = '';

        for (const option of options) {
            const subcomponent = this._createSubcomponent(option);
            subcomponent.classList.add(OPTION_CSS_CLASS_NAME);
            refreshOptionAvailability(option, subcomponent);
            this._optionsContainer.appendChild(subcomponent);
        }
    }

    async optionsMenuStart() {
        return new Promise(resolve => {
            this._resolve = resolve;
        });
    }

    optionsMenuCancel() {
        if (this._resolve) {
            this._resolve();
            this._resolve = null;
        }
    }

    

    /**
     * @param {OptionsListEntry<T,V>} option 
     */
    _createSubcomponent(option) {
        switch(option.input.type) {
            case INPUT_TYPE.RADIO: return this._createRadio(option);
            case INPUT_TYPE.SLIDER: return this._createSlider(option);
            case INPUT_TYPE.BACK: return this._createBackButton(option);
            default: new Error(`Unimplemented input type: ${option.input.type}`);
        }
    }

    /**
     * @param {OptionsListEntry<T, RadioValues>} option 
     */
    _createRadio(option) {
        const container = this._createOptionContainerWithText(option);

        const radio = new RadioComponent(option.input.values, option.value);
        radio.addEventListener(RADIO_EVENTS.VALUE_CHANGE, event => option.value = event.detail.value);
        container.appendChild(radio);

        return container;
    }

    /**
     * @param {OptionsListEntry<number, SliderValues>} option 
     */
    _createSlider(option) {
        const container = this._createOptionContainerWithText(option);

        const slider = new SliderComponent({ value: option.value, ...option.input.values });
        slider.addEventListener(SLIDER_EVENTS.VALUE_CHANGE, event => option.value = event.detail.value);
        container.appendChild(slider);

        return container;
    }
    
    /**
     * 
     * @param {OptionsListEntry<T, V>} option 
     * @returns 
     */
    _createOptionContainerWithText(option) {
        const container = document.createElement('div');
        container.classList.add(OPTION_CONTAINER_CSS_CLASS_NAME);

        const text = document.createElement('span');
        text.classList.add(OPTION_TEXT_CSS_CLASS_NAME);
        text.innerHTML = option.text;

        container.appendChild(text);

        return container;
    }

    /**
     * 
     * @param {OptionsListEntry<T, V>} option 
     * @returns 
     */
    _createBackButton(option) {
        const button = document.createElement('button');
        button.classList.add(OPTION_BACK_CSS_CLASS_NAME);
        button.innerHTML = option.text;
        button.addEventListener('click', this.optionsMenuCancel.bind(this));
        button.addEventListener('focus', () => button.blur());
        return button;
    }

    get _displayedOptions() {
        return [...this.getElementsByClassName(OPTION_CSS_CLASS_NAME)]
            .filter(isElementSelectable);
    }

}