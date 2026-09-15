/**
 * @implements {import('./selectable_interface.js').SelectableInterface}
 */
export class SelectableOptionsMenu {

    /**
     * 
     * @param {import('../../menu/components/options_menu.js').OptionsMenuComponent} menu 
     */
    constructor(menu) {
        this._menu = menu;
    }

    selectUp() {
        this._menu.optionsMenuSelectPreviousOption();
    }

    selectDown() {
        this._menu.optionsMenuSelectNextOption();
    }

    selectLeft() {
        this._menu.optionsMenuSetPreviousValue();
    }

    selectRight() {
        this._menu.optionsMenuSetNextValue();
    }

    confirmCurrent() {
        this._menu.optionsMenuConfirm();
    }

    cancel() {
        this._menu.optionsMenuCancel();
    }

}