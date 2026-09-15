import { BaseComponent } from '../../../common/components/base_component.js';
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
        slider.classList.add(SLIDER_CSS_CLASS_NAME);
        this._addSliderInputEventListeners(slider);
        this.appendChild(slider);
        this._slider = slider;
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

}