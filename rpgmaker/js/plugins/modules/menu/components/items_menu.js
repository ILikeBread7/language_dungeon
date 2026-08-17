import { BaseComponent } from '../../common/components/base_component.js';
import { ScrollableListComponent } from '../../common/components/scrollable_list_component.js';
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
            ${this.componentTagName} .items-container {
                width: 50%;
            }

            ${this.componentTagName} .items-container {
                position: relative;
                overflow: hidden;
            }
        `;
    }

    constructor() {
        super();
        ScrollableListComponent.register();

        this._listWithExplanation = new ListWithExplanation({ choicesList: new ScrollableListComponent() });
        this._itemsContainer = document.createElement('div');
        this._itemsContainer.classList.add('items-container');
        this._itemsContainer.appendChild(this._listWithExplanation.choicesList);
        this.append(this._itemsContainer, this._listWithExplanation.explanationDiv);
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

    /**
     * @type {ScrollableListComponent}
     */
    get choicesList() {
        return this._listWithExplanation.choicesList;
    }

}