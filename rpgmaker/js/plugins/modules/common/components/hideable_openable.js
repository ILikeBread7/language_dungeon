import { HideableComponent } from './hideable_component.js';
import { OpenableComponent } from './openable_component.js';

HideableComponent.register();
OpenableComponent.register();

/**
 * @template T
 */
export class HideableOpenable {

    /**
     * @param {T} element 
     */
    constructor(element) {
        this._element = element;

        this._hideable = new HideableComponent();
        this._openable = new OpenableComponent();

        this._hideable.appendChild(this._openable);
        this._openable.appendChild(element);
    }

    get topComponent() {
        return this._hideable;
    }

    get hideable() {
        return this._hideable;
    }

    get openable() {
        return this._openable;
    }

    get element() {
        return this._element;
    }

}