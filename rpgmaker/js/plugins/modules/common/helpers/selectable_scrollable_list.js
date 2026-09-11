import { SelectableChoicesList } from './selectable_choices_list.js';

/**
 * @implements {import('./selectable_interface.js').SelectableInterface}
 */
export class SelectableScrollableList extends SelectableChoicesList {

    /**
     * 
     * @param {import('../components/scrollable_list_component.js').ScrollableListComponent} list
     */
    constructor(list) {
        super(list);
    }

    selectLeft() {
        this._list.scrollableListPreviousPage();
    }

    selectRight() {
        this._list.scrollableListNextPage();
    }

}