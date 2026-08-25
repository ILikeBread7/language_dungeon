import { BaseComponent } from '../../common/components/base_component.js';
import { ChoicesListComponent } from '../../message/components/choices_list.js';

const DIALOG_CHOICES = /** @type {const} */ Object.freeze({
    USE: { text: 'Use'  },
    PICK_UP: { text: 'Pick up'  },
    THROW_AWAY: { text: 'Throw away'  },
    CANCEL: { text: 'Cancel'  }
});
Object.values(DIALOG_CHOICES).forEach((choice, index) => choice.id = index + 1);

export class ItemUseDialogComponent extends BaseComponent {

    static get componentDefaultTagName() {
        return 'items-use-dialog-component';
    }

    constructor() {
        super();
        ChoicesListComponent.register();

        this._choicesList = new ChoicesListComponent();
        this._choicesList.choicesListSetChoices(Object.values(DIALOG_CHOICES));
        this.appendChild(this._choicesList);
    }

    async itemUseDialogStart() {
        this._choicesList.choicesListRefreshVisibleAndEnabledOptions();
        this._choicesList.choicesListSelectFirstActiveChoice();
        this._choicesList.choicesListActivate();
        const choice = await this._choicesList.choicesListTakeChoice();
        this._choicesList.choicesListDeactivate();
        return choice;
    }

    get choicesList() {
        return this._choicesList;
    }

}