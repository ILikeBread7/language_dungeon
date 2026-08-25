import { BaseComponent } from '../../common/components/base_component.js';
import { ScrollableListComponent } from '../../common/components/scrollable_list_component.js';
import { HideableOpenable } from '../../common/helpers/hideable_openable.js';
import { ListWithExplanation } from '../../common/helpers/list_with_explanation.js';
import { CHOICES_LIST_EVENTS, ChoicesListComponent } from '../../message/components/choices_list.js';
import { ItemUseDialogComponent } from './item_use_dialog.js';

const ITEM_USE_DIALOG_CSS_CLASS = 'item-use-dialog';
const ITEMS_LIST_CSS_CLASS = 'items-list';

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
            const itemId = event.detail.option.id;
            this._listWithExplanation.choicesList.choicesListDeactivate();
            this._itemUseDialog.showAndOpen();
            const choice = await this._itemUseDialog.element.itemUseDialogStart(`Item ${itemId}`);
            this._itemUseDialog.element.choicesList.choicesListDeactivate();
            this._itemUseDialog.closeAndHide();
            this._listWithExplanation.choicesList.choicesListActivate();
        });
    }

    /**
     * 
     * @param {[ItemChoice]} items 
     */
    itemsMenuStart(items) {
        this._listWithExplanation.setChoices(items);
        this.choicesList.choicesListRefreshVisibleAndEnabledOptions();
        this._listWithExplanation.selectFirstActiveChoice()
        this.choicesList.choicesListActivate();
    }

    /**
     * @type {ScrollableListComponent|ChoicesListComponent}
     */
    get choicesList() {
        if (this._itemUseDialog.element.choicesList.choicesListActive) {
            return this._itemUseDialog.element.choicesList;
        }
        return this._listWithExplanation.choicesList;
    }

}