import { HideableComponent } from '../components/hideable_component.js';
import { OpenableComponent } from '../components/openable_component.js';
import { ElementStack } from './element_stack.js';

HideableComponent.register();
OpenableComponent.register();

const TARGET_STATE = /** @type {const} */ Object.freeze({
    SHOWN: 1,
    HIDDEN: 2
});
/**
 * @typedef { Enum<TARGET_STATE> } TargetState
 */

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

        /** @type {TargetState} */
        this._targetState = TARGET_STATE.HIDDEN;

        /** @type {HideableComponent} */
        this.hideable;

        /** @type {OpenableComponent} */
        this.openable;

        /** @type {T} */
        this.element;
    }

    async showAndOpen() {
        this._targetState = TARGET_STATE.SHOWN;
        this.hideable.hideableShowWithReflow();
        await this.openable.openableOpen();
    }

    async closeAndHide() {
        this._targetState = TARGET_STATE.HIDDEN;
        await this.openable.openableClose();
        if (this._targetState === TARGET_STATE.HIDDEN) {
            this.hideable.hideableHide();
        }
    }

}