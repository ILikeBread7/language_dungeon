import { BaseComponent } from '../../common/components/base_component.js';
import { ChoicesListComponent } from '../../message/components/choices_list.js';

export class TitleMenuComponent extends BaseComponent {

    static get componentDefaultTagName() {
        return 'title-menu-component';
    }

    constructor() {
        super();
        ChoicesListComponent.register();

        this._lastSelectedIndex = null;
        this._choicesList = new ChoicesListComponent();
        this._choicesList.classList.add('choices-list');
        this.appendChild(this._choicesList);
    }

    /**
     * 
     * @param {import('../../message/components/choices_list.js').ChoiceListChoice} choices 
     */
    async titleMenuTakeChoice(choices) {
        const choicePromise = this._choicesList.choicesListTakeOneChoice(choices, this._lastSelectedIndex);
        if (this._lastSelectedIndex === null) {
            this._choicesList.choicesListSelectFirstActiveChoice();
        }
        const playerChoice = await choicePromise;
        this._lastSelectedIndex = playerChoice.index;
        return playerChoice;
    }

    get choicesList() {
        return this._choicesList;
    }

}