import { BaseComponent } from '../../common/components/base_component.js';
import { ListWithExplanation } from '../../common/helpers/list_with_explanation.js';
import { ChoicesListComponent } from '../../message/components/choices_list.js';

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
            ${this.componentTagName} .choices-list {
                width: 50%;
            }
        `;
    }

    constructor() {
        super();
        this._listWithExplanation = new ListWithExplanation();
        this._listWithExplanation.appendAll(this);
    }

    /**
     * 
     * @param {[ItemChoice]} items 
     */
    itemsMenuStart(items) {
        this._listWithExplanation.setChoices(items);
        this._listWithExplanation.selectChoice()
        this.choicesList.choicesListActivate();
    }

    get choicesList() {
        return this._listWithExplanation.choicesList;
    }

}