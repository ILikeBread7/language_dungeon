import { BaseComponent } from '../../../common/components/base_component.js';

export const INPUT_EVENTS = /** @type {const} */ Object.freeze({
    VALUE_CHANGE: 'valuechange'
});

export class InputComponent extends BaseComponent {

    constructor() {
        super();
    }

    inputComponentSetNextValue() {
        // empty
    }

    inputComponentSetPreviousValue() {
        // empty
    }

}