import { RadioComponent } from './radio.js';

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

document.body.appendChild(radio);

const keyActionMap = new Map([
    // [ 'ArrowDown', () => selectable.selectDown() ],
    // [ 'ArrowUp', () => selectable.selectUp() ],
    // [ 'Enter', () => selectable.confirmCurrent() ],
    // [ 'Escape', () => selectable.cancel() ],
    // [ 'ArrowRight', () => selectable.selectRight()],
    // [ 'ArrowLeft', () => selectable.selectLeft()]

    [ 'ArrowRight', () => radio.radioComponentSelectNextValue()],
    [ 'ArrowLeft', () => radio.radioComponentSelectPreviousValue()]
]);
document.addEventListener('keydown', event => {
    const action = keyActionMap.get(event.key);
    if (action) {
        action();
    }
});