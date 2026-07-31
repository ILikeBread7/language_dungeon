import { BaseComponent } from './base_component.js';

const INTERMEDIATE_OPEN_STATE = /** @type {const} */ Object.freeze({
    OPENING: 'opening',
    CLOSING: 'closing'
});
/**
 * @typedef { Enum<INTERMEDIATE_OPEN_STATE> } IntermediateOpenState
 */

const FINAL_OPEN_STATE = /** @type {const} */ Object.freeze({
    OPEN: 'open',
    CLOSED: 'closed'
});
/**
 * @typedef { Enum<FINAL_OPEN_STATE> } FinalOpenState
 */

export class OpenableComponent extends BaseComponent {

    static get componentDefaultTagName() {
        return 'openable-component';
    }

    get componentCssStyle() {
        return /*css*/`
            ${this.componentTagName} {
                display: block;
                transition: opacity 2s;
            }

            ${this.componentTagName}[data-target-state="${FINAL_OPEN_STATE.OPEN}"] {
                opacity: 1;
            }

            ${this.componentTagName}[data-target-state="${FINAL_OPEN_STATE.CLOSED}"] {
                opacity: 0;
            }
        `;
    }

    /**
     * 
     * @param { {
     *  wait: (time: number) => Promise<void>
     * } } dependencies 
     */
    constructor(dependencies = { wait: time => new Promise(resolve => setTimeout(resolve, time)) }) {
        super(dependencies);
        this.dataset.currentState = this.dataset.targetState = FINAL_OPEN_STATE.CLOSED;
    }

    async openableOpen() {
        await this._openableChangeState(INTERMEDIATE_OPEN_STATE.OPENING, FINAL_OPEN_STATE.OPEN);
    }

    async openableClose() {
        await this._openableChangeState(INTERMEDIATE_OPEN_STATE.CLOSING, FINAL_OPEN_STATE.CLOSED);
    }

    openableIsOpen() {
        return this.dataset.currentState !== FINAL_OPEN_STATE.CLOSED;
    }

    /**
     * @param {IntermediateOpenState} currentState
     * @param {FinalOpenState} targetState
     * @returns {Promise<void>}
     */
    async _openableChangeState(currentState, targetState) {
        return new Promise((resolve) => {
            this.dataset.currentState = currentState;
            this.dataset.targetState = targetState;
    
            const listener = event => {
                if (event.target !== this) {
                    return;
                }
    
                this.dataset.currentState = targetState;
                this.removeEventListener('transitionend', listener);
                resolve();
            };
            this.addEventListener('transitionend', listener);
        });
    }

}