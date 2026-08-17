import { BaseComponent } from '../../common/components/base_component.js';
import { OPEN_STATE, VISIBILITY_STATE } from '../../common/enums.js';
import { ListWithExplanation } from '../../common/helpers/list_with_explanation.js';
import { CHOICES_LIST_EVENTS, ChoicesListComponent } from '../../message/components/choices_list.js';

/**
 * @typedef {import('../../message/components/choices_list.js').ChoiceListChoice} ChoiceListChoice
 */
/**
 * @typedef {ChoiceListChoice & {explanation: string}} MainMenuOption
 */

export class MainMenuComponent extends BaseComponent {

    static get componentDefaultTagName() {
        return 'main-menu-component';
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
        ChoicesListComponent.register();
        this._listWithExplanation = new ListWithExplanation();

        this._defaultMenuOptionIndex = 0;
        this.choicesList.addEventListener(CHOICES_LIST_EVENTS.OPTION_SELECT, event => {
            const index = event.detail.index;
            this._defaultMenuOptionIndex = index;
        });

        this._listWithExplanation.appendAll(this);
    }

    /**
     * @param {[MainMenuOption]} options 
     */
    mainMenuSetOptions(options) {
        this._options = options;
        this._listWithExplanation.setChoices(options);
        this._listWithExplanation.selectChoice();
        this._defaultMenuOptionIndex = 0;
    }

    async mainMenuTakeChoice() {
        this._listWithExplanation.selectChoice(this._defaultMenuOptionIndex);
        this.choicesList.choicesListRefreshVisibleAndEnabledOptions();
        this.choicesList.choicesListActivate();
        const playerChoice = await this.choicesList.choicesListTakeChoice();
        this.choicesList.choicesListDeactivate();
        return playerChoice;
    }

    get choicesList() {
        return this._listWithExplanation.choicesList;
    }

}