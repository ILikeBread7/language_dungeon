import { BaseComponent } from '../../common/components/base_component.js';
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

            ${this.componentTagName} .${VALUE_SPAN_CSS_CLASS} {
                pointer-events: none;
            }
        `;
    }

    constructor() {
        super();
        ChoicesListComponent.register();

        this._choicesList = new ChoicesListComponent();
        this._choicesList.classList.add('choices-list');

        this._explanationDiv = document.createElement('div');
        this._explanationDiv.classList.add('explanation');

        this.append(this._choicesList, this._explanationDiv);

        this._choicesList.addEventListener(CHOICES_LIST_EVENTS.OPTION_SELECT, event => {
            const index = event.detail.index;
            const option = this._options[index];
            this._explanationDiv.innerHTML = option.explanation;
        });
    }

    /**
     * @param {[OptionsListEntry]} options 
     */
    optionsMenuSetOptions(options) {
        this._options = options;
        this._explanationDiv.innerHTML = this._options[0].explanation;

        for (const option of this._options) {
            if (option.goBack) {
                continue;
            }
            if (option.setValue) {
                option.setNextValue = option.setPreviousValue = option.setValue;
            }
            option.text += /* html */` <span class="${VALUE_SPAN_CSS_CLASS}"></span>`;
        }

        this._choicesList.choicesListSetChoices(this._options);
        this._choicesList.choicesListSelectOptionNoEvent(0);
        this.optionsMenuUpdateOptionValues();
    }

    optionsMenuUpdateOptionValues() {
        const displayedOptions = this._choicesList.choicesListDisplayedOptions;
        for (let i = 0; i < this._options.length; i++) {
            const option = this._options[i];
            if (option.goBack) {
                continue;
            }

            const element = displayedOptions[i].element;
            this._updateOptionValue(option, element);
        }
    }

    /**
     * 
     * @returns Last player choice, that resulted in exiting the menu
     */
    async optionsMenuStart() {
        this._choicesList.choicesListActivate();

        let choice;
        do {
            choice = await this._choicesList.choicesListTakeChoice();
            if (choice.cancelled) {
                break;
            }

            const option = this._options[choice.index];
            if (option.goBack) {
                break;
            }

            if (option.setNextValue) {
                option.setNextValue();
                this._updateOptionValue(option, choice.element);
            }
        } while(true);

        this._choicesList.choicesListDeactivate();
        return choice;
    }

    optionsMenuSetNextValue() {
        const currentlySelectedOption = this._choicesList.choicesListCurrentlySelectedOption;
        if (currentlySelectedOption) {
            const option = this._options[currentlySelectedOption.index];
            if (!option.setNextValue) {
                return;
            }
            option.setNextValue();
            const element = currentlySelectedOption.option.element;
            this._updateOptionValue(option, element);
        }
    }

    optionsMenuSetPreviousValue() {
        const currentlySelectedOption = this._choicesList.choicesListCurrentlySelectedOption;
        if (currentlySelectedOption) {
            const option = this._options[currentlySelectedOption.index];
            if (!option.setPreviousValue) {
                return;
            }
            option.setPreviousValue();
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
        return this._choicesList;
    }

}