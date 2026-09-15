import { INPUT_EVENTS } from './input.js';
import { RadioComponent } from './radio.js';
import { SliderComponent } from './slider.js';

let keyActionMap;
const tests = {
    async radio() {
        RadioComponent.register();
        const radio = new RadioComponent([
            {
                text: 'ON',
                value: true
            },
            {
                text: 'OFF',
                value: false
            }
        ], false);
        
        radio.addEventListener(INPUT_EVENTS.VALUE_CHANGE, event => console.log(event.detail.value));
        
        document.body.appendChild(radio);
        
        keyActionMap = new Map([
            [ 'ArrowRight', () => radio.radioComponentSelectNextValue()],
            [ 'ArrowLeft', () => radio.radioComponentSelectPreviousValue()]
        ]);
    },

    async slider() {
        SliderComponent.register();
        const slider = new SliderComponent();
        document.body.appendChild(slider);
        slider.addEventListener(INPUT_EVENTS.VALUE_CHANGE, event => console.log(event.detail.value));

        keyActionMap = new Map([
            [ 'ArrowRight', () => slider.sliderComponentSetNextValue()],
            [ 'ArrowLeft', () => slider.sliderComponentSetPreviousValue()]
        ]);
    }
};

tests.slider();

document.addEventListener('keydown', event => {
    const action = keyActionMap.get(event.key);
    if (action) {
        action();
    }
});