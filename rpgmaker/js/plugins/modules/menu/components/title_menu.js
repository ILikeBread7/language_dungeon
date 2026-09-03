import { BaseComponent } from '../../common/components/base_component.js';
import { ChoicesListComponent } from '../../message/components/choices_list.js';

export class TitleMenuComponent extends BaseComponent {

    static get componentDefaultTagName() {
        return 'title-menu-component';
    }

    constructor() {
        super();
        ChoicesListComponent.register();

        this._lastSelectedIndex = 0;
        this._choicesList = new ChoicesListComponent();
        this.appendChild(this._choicesList);
    }

    /**
     * 
     * @param {import('../../message/components/choices_list.js').ChoiceListChoice} choices 
     */
    async titleMenuTakeChoice(choices) {
        const playerChoice = await this._choicesList.choicesListTakeOneChoice(choices, this._lastSelectedIndex);
        this._lastSelectedIndex = playerChoice.index;
        return playerChoice;
    }

    get choicesList() {
        return this._choicesList;
    }

}