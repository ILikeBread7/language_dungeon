/**
 * @implements {import('./selectable_interface.js').SelectableInterface}
 */
export class SelectableChoicesList {

    /**
     * 
     * @param {import('../../message/components/choices_list.js').ChoicesListComponent} list 
     */
    constructor(list) {
        this._list = list;
    }

    selectUp() {
        this._list.choicesListSelectPreviousOption();
    }

    selectDown() {
        this._list.choicesListSelectNextOption();
    }

    selectLeft() {
        this._list.choicesListGoToTop();
    }

    selectRight() {
        this._list.choicesListGoToBottom();
    }

    confirmCurrent() {
        this._list.choicesListConfirmCurrentOption();
    }

    cancel() {
        this._list.choicesListCancel();
    }

}