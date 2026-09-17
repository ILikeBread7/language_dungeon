import { BaseComponent } from '../../common/components/base_component.js';
import { ListWithExplanation } from '../../common/helpers/list_with_explanation.js';
import { CHOICES_LIST_EVENTS, ChoicesListComponent } from '../../message/components/choices_list.js';
import { findElement, isActiveOptionElement, isElementSelectable, refreshOptionAvailability } from '../../message/components/utils.js';
import { INPUT_EVENTS, InputComponent } from './options/input.js';
import { RadioComponent } from './options/radio.js';
import { SliderComponent } from './options/slider.js';

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
const OPTIONS_CONTAINER_CSS_CLASS_NAME = 'options-container';
const OPTION_CONTAINER_CSS_CLASS_NAME = 'option-container';
const OPTION_TEXT_CSS_CLASS_NAME = 'option-text';
const OPTION_BACK_CSS_CLASS_NAME = 'option-back';
const OPTION_CSS_CLASS_NAME = 'option';
const INPUT_CSS_CLASS_NAME = 'input';
const EXPLANATION_CSS_CLASS_NAME = 'explanation';

export class OptionsMenuComponent extends BaseComponent {

    static get componentDefaultTagName() {
        return 'options-menu-component';
    }

    get componentCssStyle() {
        return /*css*/`
           ${this.componentTagName} .${OPTIONS_CONTAINER_CSS_CLASS_NAME} {
                anchor-name: --container;
            }

           ${this.componentTagName} .${EXPLANATION_CSS_CLASS_NAME} {
                text-align: center;
                width: 100%;
                height: 100%;
                position: absolute;
                top: anchor(--container bottom);
            }

            ${this.componentTagName} .${OPTION_CSS_CLASS_NAME} {
                &[data-disabled="disabled"] {
                    pointer-events: none;
                    opacity: 0.6;
                }
    
                &[data-hidden="hidden"] {
                    display: none;
                }
    
                &[data-selected="selected"] {
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
        this._optionsContainer.classList.add(OPTIONS_CONTAINER_CSS_CLASS_NAME);

        this._explanationDiv = document.createElement('div');
        this._explanationDiv.classList.add(EXPLANATION_CSS_CLASS_NAME);
        
        this.append(this._optionsContainer, this._explanationDiv);
    }

    /**
     * @param {[OptionsListEntry<T,V>]} options 
     */
    optionsMenuSetOptions(options) {
        this._options = options;
        this._optionsContainer.innerHTML = '';

        const optionComponents = options.map((option, index) => {
            const subcomponent = this._createSubcomponent(option);
            subcomponent.dataset.index = index;
            subcomponent.classList.add(OPTION_CSS_CLASS_NAME);
            refreshOptionAvailability(option, subcomponent);

            subcomponent.addEventListener('pointerenter', () => {
                if (!isElementSelectable(subcomponent)) {
                    return;
                }
                this._selectOption(subcomponent);
            });

            return subcomponent;
        });

        this._optionsContainer.append(...optionComponents);
        this.optionsMenuSelectNextOption();
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

    optionsMenuRefreshVisibleAndEnabledOptions() {
        this._allOptions.forEach(refreshOptionAvailability);
    }

    optionsMenuSelectNextOption() {
        const options = this._displayedOptions;
        const currentOptionElement = this._currentlySelectedOptionElement;
        const currentOptionIndex = currentOptionElement ? 
            Number(currentOptionElement.dataset.index)
            : -1;
        const optionToSelect = options[(currentOptionIndex + 1) % options.length];
        this._selectOption(optionToSelect);
    }

    optionsMenuSelectPreviousOption() {
        const options = this._displayedOptions;
        const currentOptionElement = this._currentlySelectedOptionElement;
        const currentOptionIndex = currentOptionElement ? 
            Number(currentOptionElement.dataset.index)
            : options.length;
            const optionToSelect = options[(currentOptionIndex - 1 + options.length) % options.length];
        this._selectOption(optionToSelect);
    }

    optionsMenuConfirm() {
        const currentOptionElement = this._currentlySelectedOptionElement;
        currentOptionElement.click();
    }

    optionsMenuSetNextValue() {
        /** @type {InputComponent?} */
        const input = this._currentInputComponent;
        if (!input) {
            return;
        }

        input.inputComponentSetNextValue();
    }

    optionsMenuSetPreviousValue() {
        /** @type {InputComponent?} */
        const input = this._currentInputComponent;
        if (!input) {
            return;
        }

        input.inputComponentSetPreviousValue();
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
        radio.classList.add(INPUT_CSS_CLASS_NAME);
        radio.addEventListener(INPUT_EVENTS.VALUE_CHANGE, event => option.value = event.detail.value);
        container.appendChild(radio);

        return container;
    }

    /**
     * @param {OptionsListEntry<number, SliderValues>} option 
     */
    _createSlider(option) {
        const container = this._createOptionContainerWithText(option);

        const slider = new SliderComponent({ value: option.value, ...option.input.values });
        slider.classList.add(INPUT_CSS_CLASS_NAME);
        slider.addEventListener(INPUT_EVENTS.VALUE_CHANGE, event => option.value = event.detail.value);
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

    /**
     * 
     * @param {HTMLElement} optionElement 
     */
    _selectOption(optionElement) {
        this._allOptions.forEach(option => option.removeAttribute('data-selected'));
        optionElement.dataset.selected = 'selected';
        const index = Number(optionElement.dataset.index);
        this._explanationDiv.innerHTML = this._options[index].explanation;
    }

    /**
     * 
     * @param {HTMLElement} element 
     */
    _isOptionElement(element) {
        return element.classList.contains(OPTION_CSS_CLASS_NAME);
    }

    get _displayedOptions() {
        return this._allOptions.filter(isElementSelectable);
    }

    get _allOptions() {
        return [...this.getElementsByClassName(OPTION_CSS_CLASS_NAME)];
    }

    get _currentlySelectedOptionElement() {
        return this.querySelector(`.${OPTION_CSS_CLASS_NAME}[data-selected="selected"]`);
    }

    get _currentInputComponent() {
        return this.querySelector(`.${OPTION_CSS_CLASS_NAME}[data-selected="selected"] .input`);
    }

}