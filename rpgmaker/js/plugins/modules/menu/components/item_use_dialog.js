import { BaseComponent } from '../../common/components/base_component.js';
import { AreYouSureComponent } from './are_you_sure.js';

export const ITEM_DIALOG_CHOICES = /** @type {const} */ Object.freeze({
    USE: { text: 'Use' },
    PICK_UP: { text: 'Pick up' },
    THROW_AWAY: { text: 'Throw away' },
    CANCEL: { text: 'Cancel' }
});
Object.values(ITEM_DIALOG_CHOICES).forEach((choice, index) => choice.id = index + 1);

export class ItemUseDialogComponent extends BaseComponent {

    static get componentDefaultTagName() {
        return 'items-use-dialog-component';
    }

    constructor() {
        super();
        AreYouSureComponent.register();

        this._dialog = new AreYouSureComponent();
        this.appendChild(this._dialog);
    }

    /**
     * 
     * @param {string} explanation 
     * @returns 
     */
    async itemUseDialogStart(explanation) {
        const choicePromise = this._dialog.areYouSureTakeChoice({
            explanation,
            choices: Object.values(ITEM_DIALOG_CHOICES)
        });
        this._dialog.choicesList.choicesListSelectFirstActiveChoice();
        return await choicePromise;
    }

    get choicesList() {
        return this._dialog.choicesList;
    }

}