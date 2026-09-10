import { BaseComponent } from '../../common/components/base_component.js';
import { addChoiceIds } from '../../message/components/utils.js';
import { AreYouSureComponent } from './are_you_sure.js';

/**
 * @type {Object<string,import('./items_menu.js').ItemChoice>}
 */
export const ITEM_DIALOG_CHOICES = /** @type {const} */ Object.freeze({
    PICK_UP: { text: 'Pick up' },
    USE: { text: 'Use' },
    DROP: { text: 'Drop' },
    CANCEL: { text: 'Cancel' }
});
addChoiceIds(ITEM_DIALOG_CHOICES);

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
     * @param {import('./items_menu.js').ItemInfo} itemInfo
     * @returns 
     */
    async itemUseDialogStart(explanation, itemInfo) {
        let choices = Object.values(ITEM_DIALOG_CHOICES);
        if (itemInfo.consumable && itemInfo.amount > 1) {
            choices = choices
                .map(choice => {
                    if (choice.id === ITEM_DIALOG_CHOICES.CANCEL.id) {
                        return choice;
                    }
                    return { ...choice, text: `${choice.text} (1)` };
                });
        }

        const choicePromise = this._dialog.areYouSureTakeChoice({
            explanation,
            choices
        });
        this._dialog.choicesList.choicesListSelectFirstActiveChoice();
        return await choicePromise;
    }

    /**
     *
     * @param { import('./items_menu.js').ItemUseOptions } itemUseOptions 
     */
    itemsUseDialogSetShowChoiceFunctions(itemUseOptions) {
        ITEM_DIALOG_CHOICES.USE.isVisible = itemUseOptions.canUse;
        ITEM_DIALOG_CHOICES.DROP.isVisible = itemUseOptions.canDrop;
        ITEM_DIALOG_CHOICES.PICK_UP.isVisible = itemUseOptions.canPickUp;
    }

    get choicesList() {
        return this._dialog.choicesList;
    }

}