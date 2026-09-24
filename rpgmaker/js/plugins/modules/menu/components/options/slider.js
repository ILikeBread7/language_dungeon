import { BaseComponent } from '../../../common/components/base_component.js';
import { countDecimals } from '../../../message/components/utils.js';
import { INPUT_EVENTS, InputComponent } from './input.js';

/**
 * @typedef {{ value?: number, min?: number, max?: number, step?: number }} SliderProperties
 */

const SLIDER_CSS_CLASS_NAME = 'slider';

export class SliderComponent extends InputComponent {

    static get componentDefaultTagName() {
        return 'slider-component';
    }

    /**
     * 
     * @param {SliderProperties?} properties
     */
    constructor(properties) {
        super();

        this._properties = Object.assign({
            value: 0,
            min: 0,
            max: 1,
            step: 0.1
        }, properties);

        const slider = document.createElement('input');
        Object.assign(slider, this._properties);
        slider.type = 'range';
        slider.setAttribute('list', this._datalistId);
        slider.classList.add(SLIDER_CSS_CLASS_NAME);
        this._addSliderInputEventListeners(slider);
        this._slider = slider;

        const datalist = this._createDatalist();
        this.append(slider, datalist);
    }

    inputComponentSetNextValue() {
        this._slider.stepUp();
        this._setValue();
    }

    inputComponentSetPreviousValue() {
        this._slider.stepDown();
        this._setValue();
    }

    get sliderComponentValue() {
        return this._properties.value;
    }

    /**
     * 
     * @param {HTMLInputElement} slider 
     */
    _addSliderInputEventListeners(slider) {
        slider.addEventListener('change', this._setValue.bind(this));
        slider.addEventListener('pointerup', () => slider.blur());
    }

    _setValue() {
        const newValue = Number(this._slider.value);
        if (newValue === this._properties.value) {
            return;
        }

        this._properties.value = newValue;
        this.dispatchEvent(new CustomEvent(INPUT_EVENTS.VALUE_CHANGE, { detail: { value: newValue } }));
    }

    get _datalistId() {
        return `slider_datalist_${this._properties.min}_${this._properties.max}_${this._properties.step}`;
    }

    _createDatalist() {
        const datalist = document.createElement('datalist');
        datalist.id = this._datalistId;

        const { min, max, step } = this._properties;

        // Precision is used to make decimal values, like 0.3, work correctly
        const precision = countDecimals(step);
        const multiplier = 10 ** precision;
        for (
            let current = min * multiplier;
            current <= max * multiplier;
            current += step * multiplier
        ) {
            const value = current / multiplier;
            const option = document.createElement('option');
            option.value = value;
            datalist.appendChild(option);
        }

        return datalist;
    }

}