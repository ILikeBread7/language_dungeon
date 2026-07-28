import { HideableComponent } from '../components/hideable_component.js';
import { OpenableComponent } from '../components/openable_component.js';

export class ElementStack {

    /**
     * @param {Object<string,HTMLElement>} elementsObject 
     */
    constructor(elementsObject) {
        Object.assign(this, elementsObject);

        const elements = Object.values(elementsObject);
        for (let i = 0; i < elements.length - 1; i++) {
            const currentElement = elements[i];
            const nextElement = elements[i + 1];
            currentElement.appendChild(nextElement);
        }

        if (elements.length > 0) {
            this._topElement = elements[0];
            this._bottomElement = elements[elements.length - 1];
        }
    }

    get topElement() {
        return this._topElement;
    }

    get bottomElement() {
        return this._bottomElement;
    }

}