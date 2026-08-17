import { BaseComponent } from '../../common/components/base_component.js';
import { ListWithExplanation } from '../../common/helpers/list_with_explanation.js';
import { CHOICES_LIST_EVENTS, ChoicesListComponent } from '../../message/components/choices_list.js';

/**
 * @typedef {import('../../message/components/choices_list.js').ChoiceListChoice} ChoiceListChoice
 */

/**
 * @typedef { ChoiceListChoice & { explanation: string, value: string, goBack?: boolean, setValue?: () => void, setNextValue?: () => void, setPreviousValue?: () => void } } OptionsListEntry
*/

const VALUE_SPAN_CSS_CLASS = 'value';

export class OptionsMenuComponent extends BaseComponent {

    static get componentDefaultTagName() {
        return 'options-menu-component';
    }

    get componentCssStyle() {
        return /*css*/`
           ${this.componentTagName} .choices-list {
                anchor-name: --choices-list;
            }

           ${this.componentTagName} .explanation {
                text-align: center;
                width: 100%;
                height: 100%;
                position: absolute;
                top: anchor(--choices-list bottom);
            }
        `;
    }

    constructor() {
        super();
        this._listWithExplanation = new ListWithExplanation();
        this.choicesList.classList.add('choices-list');
        this._listWithExplanation.appendAll(this);
    }

    /**
     * @param {[OptionsListEntry]} options 
     */
    optionsMenuSetOptions(options) {
        this._options = options;
        this._listWithExplanation.setChoices(options);

        this.choicesList.choicesListSetChoices(this._options);
        for (let i = 0; i < this._options.length; i++) {
            const option = options[i];
            if (option.goBack) {
                continue;
            }
            const displayedOption = this.choicesList.choicesListDisplayedOptions[i];
            displayedOption.element.innerHTML += /* html */` <span class="${VALUE_SPAN_CSS_CLASS}"></span>`;
        }
        this._listWithExplanation.selectChoice();
        this.optionsMenuUpdateOptionValues();
    }

    optionsMenuUpdateOptionValues() {
        const displayedOptions = this.choicesList.choicesListDisplayedOptions;
        for (let i = 0; i < this._options.length; i++) {
            const option = this._options[i];
            if (option.goBack) {
                continue;
            }

            const element = displayedOptions[i].element;
            this._updateOptionValue(option, element);
        }
    }

    async optionsMenuStart() {
        this.choicesList.choicesListActivate();

        do {
            const choice = await this.choicesList.choicesListTakeChoice();
            if (choice.cancelled) {
                break;
            }

            const option = this._options[choice.index];
            if (option.goBack) {
                break;
            }

            if (option.setValue) {
                option.setValue();
            } else if (option.setNextValue) {
                option.setNextValue();
            } else {
                continue;
            }

            this._updateOptionValue(option, choice.element);
        } while(true);

        this.choicesList.choicesListDeactivate();
    }

    optionsMenuSetNextValue() {
        const currentlySelectedOption = this.choicesList.choicesListCurrentlySelectedOption;
        if (currentlySelectedOption) {
            const option = this._options[currentlySelectedOption.index];
            
            if (option.setNextValue) {
                option.setNextValue();
            } else if (option.setValue) {
                option.setValue();
            } else {
                return;
            }

            const element = currentlySelectedOption.option.element;
            this._updateOptionValue(option, element);
        }
    }

    optionsMenuSetPreviousValue() {
        const currentlySelectedOption = this.choicesList.choicesListCurrentlySelectedOption;
        if (currentlySelectedOption) {
            const option = this._options[currentlySelectedOption.index];

            if (option.setPreviousValue) {
                option.setPreviousValue();
            } else if (option.setValue) {
                option.setValue();
            } else {
                return;
            }

            const element = currentlySelectedOption.option.element;
            this._updateOptionValue(option, element);
        }
    }

    /**
     * 
     * @param {OptionsListEntry} option 
     * @param {HTMLElement} element 
     */
    _updateOptionValue(option, element) {
        const valueElement = element.getElementsByClassName(VALUE_SPAN_CSS_CLASS)[0];
        valueElement.innerHTML = option.value;
    }

    get choicesList() {
        return this._listWithExplanation.choicesList;
    }

}