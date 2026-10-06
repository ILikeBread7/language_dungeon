/**
 * @implements {import('./selectable_interface.js').SelectableInterface}
 */
export class SelectableFullGamelog {

    /**
     * 
     * @param {import('../components/full_gamelog_component.js').FullGamelogComponent} log 
     * @param {() => void} onFinish 
     */
    constructor(log, onFinish) {
        this._log = log;
        this._onFinish = onFinish;
    }

    selectUp() {
        this._log.fullGamelogComponentScrollUp();
    }

    selectDown() {
        this._log.fullGamelogComponentScrollDown();
    }

    selectLeft() {
        this._log.fullGamelogComponentPageUp();
    }

    selectRight() {
        this._log.fullGamelogComponentPageDown();
    }

    confirmCurrent() {
        this._onFinish();
    }

    cancel() {
        this._onFinish();
    }

}