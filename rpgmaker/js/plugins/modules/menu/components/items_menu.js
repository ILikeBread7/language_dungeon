import { BaseComponent } from '../../common/components/base_component.js';
import { ScrollableListComponent } from '../../common/components/scrollable_list_component.js';
import { HideableOpenable } from '../../common/helpers/hideable_openable.js';
import { ListWithExplanation } from '../../common/helpers/list_with_explanation.js';
import { CHOICES_LIST_EVENTS, ChoicesListComponent } from '../../message/components/choices_list.js';
import { ItemUseDialogComponent, ITEM_DIALOG_CHOICES } from './item_use_dialog.js';

/**
 * @typedef { { canUse: () => boolean, canDrop: () => boolean, canPickUp: () => boolean } } ItemUseOptions
 * @typedef { import('../../message/components/choices_list.js').ChoiceListChoice & ItemUseOptions } ItemChoice
 */

const ITEM_USE_DIALOG_CSS_CLASS = 'item-use-dialog';
const ITEMS_LIST_CSS_CLASS = 'items-list';

export const ITEMS_MENU_EVENTS = /** @type {const} */ Object.freeze({
    ITEM_USED: 'itemused',
    ITEM_DROPPED: 'itemdropped',
    ITEM_PICKED_UP: 'itempickedup'
});
/**
 * @typedef { Enum<ITEMS_MENU_EVENTS> } ItemsMenuEvent
 */

export class ItemsMenuComponent extends BaseComponent {

    static get componentDefaultTagName() {
        return 'items-menu-component';
    }

    get componentCssStyle() {
        return /*css*/`
            ${this.componentTagName} .explanation {
                position: absolute;
                right: 0px;
                top: 0px;
                background: hsla(59deg, 50%, 80%, 0.5);
                height: 100%;
            }

            ${this.componentTagName} .explanation,
            ${this.componentTagName} .${ITEMS_LIST_CSS_CLASS} {
                width: 50%;
                display: block;
            }

            ${this.componentTagName} .${ITEM_USE_DIALOG_CSS_CLASS} {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 100%;
                height: fit-content;
                z-index: 1;
            }
        `;
    }

    constructor() {
        super();
        ScrollableListComponent.register();
        ItemUseDialogComponent.register();

        this._itemUseDialog = new HideableOpenable(new ItemUseDialogComponent());
        this._itemUseDialog.topElement.classList.add(ITEM_USE_DIALOG_CSS_CLASS);
        this.appendChild(this._itemUseDialog.topElement);

        this._listWithExplanation = new ListWithExplanation({ choicesList: new ScrollableListComponent() });
        this._listWithExplanation.choicesList.classList.add(ITEMS_LIST_CSS_CLASS);
        this._listWithExplanation.appendAll(this);
        
        this._listWithExplanation.choicesList.addEventListener(CHOICES_LIST_EVENTS.OPTION_CONFIRM, async event => {
            /**
             * @type {ItemChoice}
             */
            const option = event.detail.option;
            
            const itemName = option.text;
            const itemId = option.id;

            this._listWithExplanation.choicesList.choicesListDeactivate();
            this._itemUseDialog.showAndOpen();

            this._itemUseDialog.element.itemsUseDialogSetShowChoiceFunctions(option);
            const choice = await this._itemUseDialog.element.itemUseDialogStart(itemName);
            this._dispatchItemEvent(choice, itemId)

            this._itemUseDialog.element.choicesList.choicesListDeactivate();
            this._itemUseDialog.closeAndHide();
            this._listWithExplanation.choicesList.choicesListActivate();
        });

        this._listWithExplanation.choicesList.addEventListener(CHOICES_LIST_EVENTS.CHOICES_CANCEL, () => {
            if (this._resolve) {
                this._resolve();
                this._resolve = null;
            }
        });
    }

    /**
     * 
     * @param {[ItemChoice]} items 
     * @returns {Promise<void>}
     */
    async itemsMenuStart(items) {
        return new Promise(resolve => {
            this._listWithExplanation.setChoices(items);
            this.choicesList.choicesListRefreshVisibleAndEnabledOptions();
            this._listWithExplanation.selectFirstActiveChoice()
            this.choicesList.choicesListActivate();

            this._resolve = resolve;
        });
    }

    /**
     * 
     * @param {[ItemChoice]} items 
     * @returns {Promise<void>}
     */
    async itemsMenuStartOpenFirst(items) {
        const promise = this.itemsMenuStart(items);
        this.choicesList.choicesListConfirmCurrentOption();
        return await promise;
    }

    /**
     * 
     * @param {import('../../message/components/choices_list.js').ChoiceListPlayerChoice} choice 
     * @param {number} itemId 
     */
    _dispatchItemEvent(choice, itemId) {
        switch (choice.id) {
            case ITEM_DIALOG_CHOICES.USE.id:
                this.dispatchEvent(new CustomEvent(ITEMS_MENU_EVENTS.ITEM_USED, { detail: { itemId } }));
            break;
            case ITEM_DIALOG_CHOICES.DROP.id:
                this.dispatchEvent(new CustomEvent(ITEMS_MENU_EVENTS.ITEM_DROPPED, { detail: { itemId } }));
            break;
            case ITEM_DIALOG_CHOICES.PICK_UP.id:
                this.dispatchEvent(new CustomEvent(ITEMS_MENU_EVENTS.ITEM_PICKED_UP, { detail: { itemId } }));
            break;
            default: // No event
        }
    }

    /**
     * @type {ScrollableListComponent|ChoicesListComponent}
     */
    get choicesList() {
        if (this.dialogChoicesList.choicesListActive) {
            return this.dialogChoicesList;
        }
        return this.itemsChoicesList;
    }

    /**
     * @type {ScrollableListComponent}
     */
    get itemsChoicesList() {
        return this._listWithExplanation.choicesList;
    }

    /**
     * @type {ChoicesListComponent}
     */
    get dialogChoicesList() {
        return this._itemUseDialog.element.choicesList;
    }

}