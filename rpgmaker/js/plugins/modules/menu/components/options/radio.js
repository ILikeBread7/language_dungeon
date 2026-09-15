import { BaseComponent } from '../../../common/components/base_component.js';

/**
 * @template T
 * @typedef { { value: T, text: string } } RadioValue
 */

const SELECTED_DATA_VALUE = 'selected';
const RADIO_GROUP_CSS_CLASS = 'radio-group';
const RADIO_CSS_CLASS = 'radio';

export const RADIO_EVENTS = /** @type {const} */ Object.freeze({
    VALUE_CHANGE: 'valuechange'
});

export class RadioComponent extends BaseComponent {

    static get componentDefaultTagName() {
        return 'radio-component';
    }

    get componentCssStyle() {
        return /*css*/`
            ${this.componentTagName} .${RADIO_GROUP_CSS_CLASS} {
                list-style-type: none;
                padding: 0px;
                margin: 0px;
                display: inline-block;

                .radio {
                    display: inline;
                    background: gray;
                    cursor: pointer;

                    &[data-selected="selected"] {
                        background: green;
                    }
                }
            }
        `;
    }

    /**
     * @template T
     * @param {[RadioValue<T>]} values 
     * @param {T} defaultValue 
     */
    constructor(values, defaultValue) {
        super();
        this._values = values;
        this._currentlySelectedValue = defaultValue;
        this._currentlySelectedIndex = values.findIndex(value => value.value === defaultValue);

        const radioGroup = document.createElement('ul');
        radioGroup.classList.add(RADIO_GROUP_CSS_CLASS);

        this._radios = values
            .map((value, index) => this._mapToRadio(value, index, defaultValue));
        radioGroup.append(...this._radios);

        this.appendChild(radioGroup);
    }

    get radioComponentValue() {
        return this._currentlySelectedValue;
    }

    radioComponentSelectNextValue() {
        this._selectRadio((this._currentlySelectedIndex + 1) % this._values.length);
    }

    radioComponentSelectPreviousValue() {
        if (this._currentlySelectedIndex === -1) {
            this._currentlySelectedIndex = this._values.length;
        }
        this._selectRadio((this._currentlySelectedIndex - 1 + this._values.length) % this._values.length);
    }

    /**
     * @template T
     * @param {RadioValue<T>} value 
     * @param {number} index 
     * @param {T} defaultValue 
     */
    _mapToRadio(value, index, defaultValue) {
        const radio = document.createElement('li');
        radio.classList.add(RADIO_CSS_CLASS);
        radio.innerHTML = value.text;
        radio.dataset.index = index;
    
        if (value.value === defaultValue) {
            radio.dataset.selected = SELECTED_DATA_VALUE;
        }

        this._addRadioEventListeners(radio);
    
        return radio;
    }

    /**
     * 
     * @param {HTMLElement} radio 
     */
    _addRadioEventListeners(radio) {
        radio.addEventListener('click', () => {
            const index = Number(radio.dataset.index);
            this._selectRadio(index);
        });
    }

    /**
     * 
     * @param {number} index 
     */
    _selectRadio(index) {
        if (index === this._currentlySelectedIndex) {
            return;
        }

        for (const radio of this._radios) {
            radio.removeAttribute('data-selected');
        }
        this._radios[index].dataset.selected = SELECTED_DATA_VALUE;
        this._currentlySelectedValue = this._values[index].value;
        this._currentlySelectedIndex = index;

        this.dispatchEvent(new CustomEvent(RADIO_EVENTS.VALUE_CHANGE, { detail: { value: this._currentlySelectedValue } }));
    }
}
