import { HideableComponent } from '../components/hideable_component.js';
import { OpenableComponent } from '../components/openable_component.js';
import { ElementStack } from './element_stack.js';

HideableComponent.register();
OpenableComponent.register();

/**
 * @template {HTMLElement} T
 */
export class HideableOpenable extends ElementStack {

    /**
     * @param {T} element 
     */
    constructor(element) {
        super({
            hideable: new HideableComponent(),
            openable: new OpenableComponent(),
            element
        });

        /** @type {HideableComponent} */
        this.hideable;

        /** @type {OpenableComponent} */
        this.openable;

        /** @type {T} */
        this.element;
    }

    async showAndOpen() {
        this.hideable.hideableShowWithReflow();
        await this.openable.openableOpen();
    }

    async closeAndHide() {
        await this.openable.openableClose();
        this.hideable.hideableHide();
    }

}