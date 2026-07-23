import { CHOICES_LIST_EVENTS, ChoicesList } from '../../message/components/choices_list.js';

/**
 * @typedef {import('../../message/components/choices_list.js').ChoiceListChoice} ChoiceListChoice
 */

/**
 * @typedef  { ChoiceListChoice & { explanation:string, value: string, setNextValue: () => void, setPreviousValue: () => void } } OptionsListEntry
*/

const TestConfigManager = {
    alwaysDash: false,
    bgmVolume: 0,
    bgsVolume: 100,
    meVolume: 100,
    seVolume: 100
};

export class OptionsMenu extends HTMLElement {

    /**
     * 
     * @param {string} [tagName] 
     */
    static register(tagName) {
        registerOptionsMenu(tagName);
    }

    /**
     * 
     * @param { {
     *  wait: (time: number) => Promise<void>
     * } } dependencies 
     */
    constructor(dependencies = { wait: time => new Promise(resolve => setTimeout(resolve, time)) }) {
        super();
        this.attachShadow({ mode: 'open' });
        this._dependencies = dependencies;

        ChoicesList.register();
        this._optionsMenuChoicesList = new ChoicesList(dependencies);
        this._optionsMenuChoicesList.part = this._optionsMenuChoicesList.id = 'options-menu-choices-list';
        this._optionsMenuOptionExplanationDiv = document.createElement('div');
        this._optionsMenuOptionExplanationDiv.part = this._optionsMenuOptionExplanationDiv.id = 'options-menu-option-explanation-div';

        const style = document.createElement('style');
        style.innerHTML = /*css*/`
            :host {
                --transition-time: 0.1s;
                --choices-list-transition-time: var(--transition-time);
                display: none;

                transition-property: opacity;
                transition-duration: var(--transition-time);
                opacity: 1;

                @starting-style {
                    opacity: 0;
                }
            }

            #${this._optionsMenuChoicesList.id}::part(choices-list) {
                anchor-name: --choices-list;
                --transition-time: var(--choices-list-transition-time);
            }

            #${this._optionsMenuOptionExplanationDiv.id} {
                text-align: center;
                width: 100%;
                height: 100%;
                position: absolute;
                top: anchor(--choices-list bottom);
            }
        `;

        this.shadowRoot.append(
            style,
            this._optionsMenuChoicesList,
            this._optionsMenuOptionExplanationDiv
        )

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
                get value() { return mapToOnOff(TestConfigManager.alwaysDash); },
                setValue() {
                    TestConfigManager.alwaysDash = !TestConfigManager.alwaysDash;
                }
            },
            {
                id: 2,
                text: 'BGM Volume',
                explanation: 'Volume of the background music.',
                get value() { return mapToPercentage(TestConfigManager.bgmVolume) },
                setNextValue() {
                    TestConfigManager.bgmVolume = (TestConfigManager.bgmVolume + step + mod) % mod;
                },
                setPreviousValue() {
                    TestConfigManager.bgmVolume = (TestConfigManager.bgmVolume - step + mod) % mod;
                }
            },
            {
                id: 3,
                text: 'BGS Volume',
                explanation: 'Volume of the background sounds.',
                get value() { return mapToPercentage(TestConfigManager.bgsVolume); },
                setNextValue() {
                    TestConfigManager.bgsVolume = (TestConfigManager.bgsVolume + step + mod) % mod;
                },
                setPreviousValue() {
                    TestConfigManager.bgsVolume = (TestConfigManager.bgsVolume - step + mod) % mod;
                }
            },
            {
                id: 4,
                text: 'ME Volume',
                explanation: 'Volume of the musical effects.',
                get value() { return mapToPercentage(TestConfigManager.meVolume); },
                setNextValue() {
                    TestConfigManager.meVolume = (TestConfigManager.meVolume + step + mod) % mod;
                },
                setPreviousValue() {
                    TestConfigManager.meVolume = (TestConfigManager.meVolume - step + mod) % mod;
                }
            },
            {
                id: 5,
                text: 'SE Volume',
                explanation: 'Volume of the sound effects.',
                get value() { return mapToPercentage(TestConfigManager.seVolume); },
                setNextValue() {
                    TestConfigManager.seVolume = (TestConfigManager.seVolume + step + mod) % mod;
                },
                setPreviousValue() {
                    TestConfigManager.seVolume = (TestConfigManager.seVolume - step + mod ) % mod;
                }
            },
        ];
        for (const option of this._options) {
            if (option.setValue) {
                option.setNextValue = option.setPreviousValue = option.setValue;
            }
            option.text += /* html */` <span class="value">${option.value}</span>`;
        }

        this._optionsMenuOptionExplanationDiv.innerHTML = this._options[0].explanation;
        this._optionsMenuChoicesList.addEventListener(CHOICES_LIST_EVENTS.OPTION_SELECT, event => {
            const index = event.detail.index;
            const option = this._options[index];
            this._optionsMenuOptionExplanationDiv.innerHTML = option.explanation;
        });
    }

    async optionsMenuShow() {
        this.style.setProperty('display', 'unset');

        this._optionsMenuChoicesList.choicesListSetChoices(this._options);
        this._optionsMenuChoicesList.choicesListSelectOptionNoEvent(0);
        this._optionsMenuChoicesList.choicesListShow();
        await this._optionsMenuChoicesList.choicesListOpen();
        for (let choice;;) {
            choice = await this._optionsMenuChoicesList.choicesListTakeChoice();
            if (choice.cancelled) {
                break;
            }
            const element = choice.element;
            element.removeAttribute('data-chosen');

            const option = this._options[choice.index];
            option.setNextValue();
            this._updateOptionValue(option, element);
        }
        await this._optionsMenuChoicesList.choicesListClose();
        this._optionsMenuChoicesList.choicesListHide();
    }

    optionsMenuHide() {
        this.style.setProperty('display', 'none');
    }

    optionsMenuSetNextValue() {
        const currentlySelectedOption = this._optionsMenuChoicesList.currentlySelectedOption;
        if (currentlySelectedOption) {
            const option = this._options[currentlySelectedOption.index];
            option.setNextValue();
            const element = currentlySelectedOption.option.element;
            this._updateOptionValue(option, element);
        }
    }

    optionsMenuSetPreviousValue() {
        const currentlySelectedOption = this._optionsMenuChoicesList.currentlySelectedOption;
        if (currentlySelectedOption) {
            const option = this._options[currentlySelectedOption.index];
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
        return this._optionsMenuChoicesList;
    }

}

function mapToOnOff(boolValue) {
    return boolValue ? 'ON' : 'OFF';
}

function mapToPercentage(value) {
    return `${value}%`;
}

/**
 * 
 * @param {string} [tagName] 
 */
export function registerOptionsMenu(tagName = 'options-menu') {
    if (!customElements.get(tagName)) {
        customElements.define(tagName, OptionsMenu);
    }
}