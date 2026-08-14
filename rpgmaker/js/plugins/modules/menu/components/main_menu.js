import { BaseComponent } from '../../common/components/base_component.js';
import { OPEN_STATE, VISIBILITY_STATE } from '../../common/enums.js';
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
        this._choicesList = new ChoicesListComponent();
        this._explanationDiv = document.createElement('div');
        this._explanationDiv.classList.add('explanation');
        this.append(this._choicesList, this._explanationDiv);
        this._defaultMenuOptionIndex = 0;
        this._choicesList.addEventListener(CHOICES_LIST_EVENTS.OPTION_SELECT, event => {
            const index = event.detail.index;
            this._defaultMenuOptionIndex = index;
            this._setExplanationDivContent(index);
        });
    }

    /**
     * @param {[MainMenuOption]} options 
     */
    mainMenuSetOptions(options) {
        this._options = options;
        this._choicesList.choicesListSetChoices(options);
        this._defaultMenuOptionIndex = 0;
        this._setExplanationDivContent();
    }

    _setExplanationDivContent(index = 0) {
        this._explanationDiv.innerHTML = this._options[index].explanation;
    }

    async mainMenuTakeChoice() {
        this._choicesList.choicesListSelectOptionNoEvent(this._defaultMenuOptionIndex);
        this._choicesList.choicesListRefreshVisibleAndEnabledOptions();
        this._choicesList.choicesListActivate();
        const playerChoice = await this._choicesList.choicesListTakeChoice();
        this._choicesList.choicesListDeactivate();
        return playerChoice;
    }

    get choicesList() {
        return this._choicesList;
    }

}