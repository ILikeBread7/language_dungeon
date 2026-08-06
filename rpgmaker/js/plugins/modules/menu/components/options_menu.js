import { BaseComponent } from '../../common/components/base_component.js';
import { CHOICES_LIST_EVENTS, ChoicesList, ChoicesListComponent } from '../../message/components/choices_list.js';

/**
 * @typedef {import('../../message/components/choices_list.js').ChoiceListChoice} ChoiceListChoice
 */

/**
 * @typedef  { ChoiceListChoice & { explanation:string, value: string, setNextValue: () => void, setPreviousValue: () => void } } OptionsListEntry
*/

const ConfigManager = globalThis.ConfigManager || {
    alwaysDash: false,
    bgmVolume: 0,
    bgsVolume: 100,
    meVolume: 100,
    seVolume: 100,

    save() { console.log('Config manager saved!') }
};

const GO_BACK_ID = 999;

export class OptionsMenu extends BaseComponent {

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
        ChoicesListComponent.register();

        this._choicesList = new ChoicesListComponent();
        this._choicesList.classList.add('choices-list');

        this._explanationDiv = document.createElement('div');
        this._explanationDiv.classList.add('explanation');

        this.append(this._choicesList, this._explanationDiv);

        const step = 10;
        const mod = 100 + step;
        /**
         * @type {[OptionsListEntry]}
         */
        this._options = [
            {
                id: 1,
                text: 'Always Dash',
                explanation: 'Makes the character always run, without holding the run button.',
                get value() { return mapToOnOff(ConfigManager.alwaysDash); },
                setValue() {
                    ConfigManager.alwaysDash = !ConfigManager.alwaysDash;
                }
            },
            {
                id: 2,
                text: 'BGM Volume',
                explanation: 'Volume of the background music.',
                get value() { return mapToPercentage(ConfigManager.bgmVolume) },
                setNextValue() {
                    ConfigManager.bgmVolume = (ConfigManager.bgmVolume + step + mod) % mod;
                },
                setPreviousValue() {
                    ConfigManager.bgmVolume = (ConfigManager.bgmVolume - step + mod) % mod;
                }
            },
            {
                id: 3,
                text: 'BGS Volume',
                explanation: 'Volume of the background sounds.',
                get value() { return mapToPercentage(ConfigManager.bgsVolume); },
                setNextValue() {
                    ConfigManager.bgsVolume = (ConfigManager.bgsVolume + step + mod) % mod;
                },
                setPreviousValue() {
                    ConfigManager.bgsVolume = (ConfigManager.bgsVolume - step + mod) % mod;
                }
            },
            {
                id: 4,
                text: 'ME Volume',
                explanation: 'Volume of the musical effects.',
                get value() { return mapToPercentage(ConfigManager.meVolume); },
                setNextValue() {
                    ConfigManager.meVolume = (ConfigManager.meVolume + step + mod) % mod;
                },
                setPreviousValue() {
                    ConfigManager.meVolume = (ConfigManager.meVolume - step + mod) % mod;
                }
            },
            {
                id: 5,
                text: 'SE Volume',
                explanation: 'Volume of the sound effects.',
                get value() { return mapToPercentage(ConfigManager.seVolume); },
                setNextValue() {
                    ConfigManager.seVolume = (ConfigManager.seVolume + step + mod) % mod;
                },
                setPreviousValue() {
                    ConfigManager.seVolume = (ConfigManager.seVolume - step + mod ) % mod;
                }
            },
            {
                id: GO_BACK_ID,
                text: 'Go back',
                explanation: 'Save changes and go back to the game.',
            }
        ];
        for (const option of this._options) {
            if (option.id === GO_BACK_ID) {
                continue;
            }
            if (option.setValue) {
                option.setNextValue = option.setPreviousValue = option.setValue;
            }
            option.text += /* html */` <span class="value"></span>`;
        }

        this._choicesList.addEventListener(CHOICES_LIST_EVENTS.OPTION_SELECT, event => {
            const index = event.detail.index;
            const option = this._options[index];
            this._explanationDiv.innerHTML = option.explanation;
        });
    }

    async optionsMenuShow() {
        this._explanationDiv.innerHTML = this._options[0].explanation;
        this.style.setProperty('display', 'unset');

        this._choicesList.choicesListSetChoices(this._options);
        
        const displayedOptions = this._choicesList.displayedOptions;
        for (let i = 0; i < this._options.length - 1; i++) { // -1 to skip "go back" option
            const option = this._options[i];
            const element = displayedOptions[i].element;
            this._updateOptionValue(option, element);
        }

        this._choicesList.choicesListSelectOptionNoEvent(0);
        this._choicesList.choicesListShow();
        await this._choicesList.choicesListOpen();
        for (let choice;;) {
            choice = await this._choicesList.choicesListTakeChoice();
            if (choice.cancelled || choice.id === GO_BACK_ID) {
                break;
            }
            const element = choice.element;
            element.removeAttribute('data-chosen');

            const option = this._options[choice.index];
            option.setNextValue();
            this._updateOptionValue(option, element);
        }
        await this._choicesList.choicesListClose();
        this._choicesList.choicesListHide();
    }

    optionsMenuHide() {
        ConfigManager.save();
        this.style.setProperty('display', 'none');
    }

    optionsMenuSetNextValue() {
        const currentlySelectedOption = this._choicesList.currentlySelectedOption;
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
        const currentlySelectedOption = this._choicesList.currentlySelectedOption;
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
        const valueElement = element.getElementsByClassName('value')[0];
        valueElement.innerHTML = option.value;
    }

    get choicesList() {
        return this._choicesList;
    }

}

function mapToOnOff(boolValue) {
    return boolValue ? 'ON' : 'OFF';
}

function mapToPercentage(value) {
    return `${value}%`;
}