import { CHOICES_LIST_EVENTS, ChoicesListComponent } from '../../message/components/choices_list.js';

/**
 * @typedef { import('../../message/components/choices_list.js').ChoiceListChoice & { explanation: string } } ChoiceWithExplanation
 */

ChoicesListComponent.register();

export class ListWithExplanation {

    constructor() {
        this._choicesList = new ChoicesListComponent();
        this._explanationDiv = document.createElement('div');
        this._explanationDiv.classList.add('explanation');

        this._choicesList.addEventListener(CHOICES_LIST_EVENTS.OPTION_SELECT, event => {
            const index = event.detail.index;
            this._setExplanationDivContent(index);
        });
    }

    get choicesList() {
        return this._choicesList;
    }

    get explanationDiv() {
        return this._explanationDiv;
    }

    /**
     * @param {[ChoiceWithExplanation]} choices 
     */
    setChoices(choices) {
        this._options = choices;
        this._choicesList.choicesListSetChoices(choices);
    }

    /**
     * 
     * @param {number} [index] 
     */
    selectChoice(index = 0) {
        this._choicesList.choicesListSelectOptionNoEvent(index);
        this._setExplanationDivContent(index);
    }

    /**
     * 
     * @param {HTMLElement} container 
     */
    appendAll(container) {
        container.append(this._choicesList, this._explanationDiv);
    }

    _setExplanationDivContent(index = 0) {
        this._explanationDiv.innerHTML = this._options[index].explanation;
    }

}