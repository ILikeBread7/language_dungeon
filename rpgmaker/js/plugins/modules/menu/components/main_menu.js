import { BaseComponent } from '../../common/components/base_component.js';
import { OPEN_STATE, VISIBILITY_STATE } from '../../common/enums.js';
import { CHOICES_LIST_EVENTS, ChoicesListComponent } from '../../message/components/choices_list.js';

export class MainMenuComponent extends BaseComponent {

    static get componentDefaultTagName() {
        return 'main-menu-component';
    }

    constructor() {
        super();
        ChoicesListComponent.register();
        this._choicesList = new ChoicesListComponent();
        this.appendChild(this._choicesList);
        this._defaultMenuOptionIndex = 0;
        this._choicesList.addEventListener(CHOICES_LIST_EVENTS.OPTION_SELECT, event => this._defaultMenuOptionIndex = event.detail.index)
    }

    /**
     * @param {[ChoiceListChoice]} options 
     */
    mainMenuSetOptions(options) {
        this._choicesList.choicesListSetChoices(options);
        this._defaultMenuOptionIndex = 0;
    }

    async mainMenuTakeChoice() {
        this._choicesList.choicesListSelectOptionNoEvent(this._defaultMenuOptionIndex);
        this._choicesList.choicesListActivate();
        const playerChoice = await this._choicesList.choicesListTakeChoice();
        this._choicesList.choicesListDeactivate();
        return playerChoice;
    }

    get choicesList() {
        return this._choicesList;
    }

}