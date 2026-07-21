import { ChoicesList } from '../../message/components/choices_list.js';

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
    }

    async optionsMenuShow() {
        this.style.setProperty('display', 'unset');
        
        /**
         * @type {import('../../message/components/choices_list.js').ChoiceListChoice}
         */
        const options = [
            {
                id: 1,
                text: 'Always Dash',
                get value() { return mapToOnOff(TestConfigManager.alwaysDash); },
                setValue() {
                    TestConfigManager.alwaysDash = !TestConfigManager.alwaysDash;
                }
            },
            {
                id: 2,
                text: 'BGM Volume',
                get value() { return mapToPercentage(TestConfigManager.bgmVolume) },
                setNextValue() {
                    TestConfigManager.bgmVolume = Math.min(100, TestConfigManager.bgmVolume + 10);
                },
                setPreviousValue() {
                    TestConfigManager.bgmVolume = Math.min(100, TestConfigManager.bgmVolume - 10);
                }
            },
            {
                id: 3,
                text: 'BGS Volume',
                get value() { return mapToPercentage(TestConfigManager.bgsVolume); },
                setNextValue() {
                    TestConfigManager.bgsVolume = Math.min(100, TestConfigManager.bgsVolume + 10);
                },
                setPreviousValue() {
                    TestConfigManager.bgsVolume = Math.min(100, TestConfigManager.bgsVolume - 10);
                }
            },
            {
                id: 4,
                text: 'ME Volume',
                get value() { return mapToPercentage(TestConfigManager.meVolume); },
                setNextValue() {
                    TestConfigManager.meVolume = Math.min(100, TestConfigManager.meVolume + 10);
                },
                setPreviousValue() {
                    TestConfigManager.meVolume = Math.min(100, TestConfigManager.meVolume - 10);
                }
            },
            {
                id: 5,
                text: 'SE Volume',
                get value() { return mapToPercentage(TestConfigManager.seVolume); },
                setNextValue() {
                    TestConfigManager.seVolume = Math.min(100, TestConfigManager.seVolume + 10);
                },
                setPreviousValue() {
                    TestConfigManager.seVolume = Math.min(100, TestConfigManager.seVolume - 10);
                }
            },
        ];
        for (const option of options) {
            if (option.setValue) {
                option.setNextValue = option.setPreviousValue = option.setValue;
            }
            option.text += /* html */` <span class="value">${option.value}</span>`;
        }

        this._optionsMenuChoicesList.choicesListSetChoices(options);
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

            const option = options[choice.index];
            option.setNextValue();
            const valueElement = element.getElementsByClassName('value')[0];
            valueElement.innerHTML = option.value;
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
            
        }
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