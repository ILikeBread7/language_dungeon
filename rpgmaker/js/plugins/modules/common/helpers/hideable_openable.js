import { HideableComponent } from '../components/hideable_component.js';
import { OpenableComponent } from '../components/openable_component.js';

HideableComponent.register();
OpenableComponent.register();

/**
 * @template {HTMLElement} T
 */
export class HideableOpenable extends ElementStack {

    /** @type {HideableComponent} */
    hideable;

    /** @type {OpenableComponent} */
    openable;

    /** @type {T} */
    element;

    /**
     * @param {T} element 
     */
    constructor(element) {
        super({
            hideable: new HideableComponent(),
            openable: new OpenableComponent(),
            element
        });
    }

}