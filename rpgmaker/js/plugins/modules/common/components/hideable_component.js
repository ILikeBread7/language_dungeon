import { BaseComponent } from './base_component.js';

const SHOWN_STATE = /** @type {const} */ Object.freeze({
    HIDDEN: 'hidden',
    SHOWN: 'shown'
});
/**
 * @typedef { Enum<SHOWN_STATE> } ShownState
 */

export class HideableComponent extends BaseComponent {

    static get componentDefaultTagName() {
        return 'hideable-component';
    }

    get componentCssStyle() {
        return /*css*/`
            ${this.componentTagName} {
                display: block;
            }

            ${this.componentTagName}[data-state="${SHOWN_STATE.HIDDEN}"] {
                display: none;
            }
        `;
    }

    constructor() {
        super();
        this.dataset.state = SHOWN_STATE.HIDDEN;
    }

    hideableHide() {
        this.dataset.state = SHOWN_STATE.HIDDEN;
    }

    hideableShow() {
        this.dataset.state = SHOWN_STATE.SHOWN;
    }

    hideableShowWithReflow() {
        this.hideableShow();
        void this.clientWidth;
    }

    get hideableIsShown() {
        return this.dataset.state === SHOWN_STATE.SHOWN;
    }

}