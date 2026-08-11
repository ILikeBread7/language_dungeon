import { HideableComponent } from '../common/components/hideable_component.js';
import { OpenableComponent } from '../common/components/openable_component.js';
import { HideableOpenable } from '../common/helpers/hideable_openable.js';
import { CHOICES_LIST_EVENTS, ChoicesListComponent } from './components/choices_list.js';
import { MESSAGE_BOX_EVENTS, MessageBoxComponent } from './components/message_box.js';

const style = document.createElement('style');
style.innerHTML = /*css*/`
    :root {
        --mesage-choice-transition-time: 0.1s;
    }

    hideable-component {
        position: relative;
    }

    openable-component {
        --transition-time: var(--mesage-choice-transition-time);
    }

    message-box-component {
        --transition-time: var(--mesage-choice-transition-time);
        --char-write-wait-ms: 25;
    }

    hideable-component:has(message-box-component.whole-screen) {
        height: 100%;
    }

    message-box-component.whole-screen {
        --box-height: 100%;
        --lines-per-screen: 32;
    }

    .centered {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }

    .with-message-box {
        --message-box-height: calc(1em * 4 * 1.2);
        top: calc((100vh - var(--message-box-height)) / 2);
    }

    .half-screen {
        width: 50%;
    }

    hideable-component.bottom-slide-in {
        position: absolute;
        bottom: 0px;
        width: 100%;
    }

    hideable-component.bottom-slide-in > openable-component {
        transition-property: transform;
    }

    hideable-component.bottom-slide-in > openable-component[data-target-state="closed"] {
        transform: translateY(100%);
        opacity: initial;
    }

    hideable-component:has(main-menu-component) {
        position: absolute;
        width: 100%;
        height: 100%;
    }

    main-menu-component openable-component {
        --transition-time: 0.5s;
    }

    main-menu-component .explanation,
    main-menu-component .choices-list {
        transition: transform calc(var(--transition-time) / 2);
    }

    openable-component[data-target-state="closed"] main-menu-component .choices-list {
        transform: translateX(-100%);
    }

    openable-component[data-target-state="closed"] main-menu-component .explanation {
        transform: translateX(100%);
    }
`;
document.body.appendChild(style);

/**
 * @type {HideableOpenable<MessageBoxComponent>}
 */
let messageBox = null;

/**
 * @type {HideableOpenable<ChoicesListComponent>}
 */
let choicesList = null;

/**
 * @type {number}
 */
let choicesCancelType;

/**
 * 
 * @param {HTMLElement} [container] 
 */
export function initializeAll(container = document.body) {
    registerCommonComponents();
    void addMessageBox(container);
    void addChoicesList(container);
    setTimeout(registerComponentsForRpgMaker, 1000);
}

/**
 * 
 * @param {HTMLElement} container 
 * @returns 
 */
export function addMessageBox(container) {
    MessageBoxComponent.register();

    messageBox = new HideableOpenable(new MessageBoxComponent());
    const box = messageBox.element;
    messageBox.topElement.classList.add('bottom-slide-in');

    container.appendChild(messageBox.topElement);

    window.$messageBox = messageBox;
    box.addEventListener(MESSAGE_BOX_EVENTS.CHAR_SHOWN, () => SoundManager.playCursor());

    return box;
}

function registerCommonComponents() {
    HideableComponent.register();
    OpenableComponent.register();
}

function playSelectSe() {
    SoundManager.playCursor();
}

function playConfirmSe() {
    SoundManager.playOk();
}

function playCancelSe() {
    SoundManager.playCancel();
}

/**
 * 
 * @param {HTMLElement} container 
 * @returns 
 */
export function addChoicesList(container) {
    registerCommonComponents();
    ChoicesListComponent.register();

    choicesList = new HideableOpenable(new ChoicesListComponent());
    const list = choicesList.element;
    container.appendChild(choicesList.topElement);
    choicesList.topElement.classList.add('centered', 'half-screen');

    window.$choicesList = choicesList;
    list.addEventListener(CHOICES_LIST_EVENTS.OPTION_SELECT, playSelectSe);
    list.addEventListener(CHOICES_LIST_EVENTS.OPTION_CONFIRM, playConfirmSe);
    list.addEventListener(CHOICES_LIST_EVENTS.CHOICES_CANCEL, playCancelSe);

    return list;
}

// polyfill for RPG Maker MV's older nw.js version
if (!HTMLElement.prototype.checkVisibility) {
    HTMLElement.prototype.checkVisibility = function() {
        const style = getComputedStyle(this);
        return style.display !== 'hidden' && style.visibility !== 'none' && style.opacity !== '0';
    }
}

export function registerComponentsForRpgMaker() {
    const _Game_Message_prototype = window.Game_Message.prototype;
    const _Game_Interpreter_prototype = window.Game_Interpreter.prototype;
    const input = window.Input;
    const touchInput = window.TouchInput;
    const gameMessage = window.$gameMessage;
    const _Window_Message_prototype = window.Window_Message.prototype;
    const _Scene_Base_prototype = window.Scene_Base.prototype;
    const convertEscapeCharacters = window.Window_Base.prototype.convertEscapeCharacters;

    const list = choicesList.element;
    const box = messageBox.element;

    const _Scene_Base_prototype_update = _Scene_Base_prototype.update;
    _Scene_Base_prototype.update = function() {
        _Scene_Base_prototype_update.call(this);

        if (list.choicesListActive) {
            if (input.isTriggered('up')) {
                list.choicesListSelectPreviousOption();
            } else if (input.isTriggered('down')) {
                list.choicesListSelectNextOption();
            } else if (input.isTriggered('ok')) {
                list.choicesListConfirmCurrentOption();
            } else if (input.isTriggered('cancel') || touchInput.isCancelled()) {
                switch (choicesCancelType) {
                    case -1: // Disallow
                        SoundManager.playBuzzer();
                        break;
                    case -2:    // Branch
                        list.choicesListCancelNoEvent();
                        playCancelSe();
                        break;
                    default:
                        list.choicesListSelectOptionNoEvent(choicesCancelType);
                        list.choicesListConfirmOptionNoEvent(choicesCancelType);
                        playCancelSe();
                        break;
                }
            }
        } else if (box.messageBoxBusy && (input.isTriggered('ok') || touchInput.isTriggered())) {
            box.messageBoxInput();
        }
    }

    const _Game_Message_isBusy = _Game_Message_prototype.isBusy;
    _Game_Message_prototype.isBusy = function() {
        return _Game_Message_isBusy.call(this)
            || box.messageBoxBusy
            || list.choicesListActive;
    }

    let asyncCommand101Promise = null;
    _Game_Interpreter_prototype.command101 = function() {
        if (!asyncCommand101Promise) {
            asyncCommand101Promise = asyncCommand101(this);
            asyncCommand101Promise.then(() => asyncCommand101Promise = null);
        }

        return false;
    }

    async function asyncCommand101(gameInterpreter) {
        if (!gameMessage.isBusy()) {
            let index = gameInterpreter._index;
            let showImmediately = false;

            messageBox.showAndOpen();
            do {
                const texts = [];
                while (nextCommand(gameInterpreter, index).code === 401) {  // Text data
                    index++;
                    let text = currentCommand(gameInterpreter, index).parameters[0];
                    if (text.startsWith('\\>')) {
                        text = text.substring(2);
                        showImmediately = true;
                    }
                    texts.push(text);
                }

                switch (nextCommand(gameInterpreter, index).code) {
                    case 102:  // Show Choices
                        index++;
                        const params = currentCommand(gameInterpreter, index).parameters;
                        const { choices, defaultType, cancelType } = extractChoiceParams(params);
                        choicesCancelType = cancelType;

                        choicesList.element.choicesListSetChoices(choices);
                        choicesList.element.choicesListSelectOptionNoEvent(defaultType);
                        choicesList.element.choicesListActivate();
                        choicesList.showAndOpen();
                        choicesList.element.choicesListTakeChoice().then(playerChoice => {
                            choicesList.element.choicesListDeactivate();
                            box.messageBoxForceFinish();
                            const index = playerChoice.cancelled ? -2 : playerChoice.index;
                            gameInterpreter._branch[gameInterpreter._indent] = index;
                            choicesList.closeAndHide();
                        });

                        // choicesList.choicesListSetChoices(choices);
                        // choicesList.choicesListSelectOptionNoEvent(defaultType);
                        // choicesList.choicesListShow();
                        // await choicesList.choicesListOpen();
                        // choicesList.choicesListTakeChoice().then(async playerChoice => {
                        //     messageBox.messageBoxForceFinish();
                        //     await choicesList.choicesListClose();
                        //     choicesList.choicesListHide();
                        //     const index = playerChoice.cancelled ? -2 : playerChoice.index;
                        //     gameInterpreter._branch[gameInterpreter._indent] = index;
                        // });
                        break;
                    // case 103:  // Input Number
                    //     index++;
                    //     gameInterpreter.setupNumInput(currentCommand(gameInterpreter, index).parameters);
                    //     break;
                    // case 104:  // Select Item
                    //     index++;
                    //     gameInterpreter.setupItemChoice(currentCommand(gameInterpreter, index).parameters);
                    //     break;
                }

                index++;
                gameInterpreter.setWaitMode('message');
                await box.messageBoxDisplayText(convertEscapeCharacters(texts.join('\n')), showImmediately);
            } while(currentCommand(gameInterpreter, index).code === 101);    // Show message

            await messageBox.closeAndHide();
            gameInterpreter._index = index;
        }
    }

    function currentCommand(gameInterpreter, index) {
        return gameInterpreter._list[index] || { code: 0 };
    }

    function nextCommand(gameInterpreter, index) {
        return gameInterpreter._list[index + 1] || { code: 0 };
    }

    let asyncCommand102Promise = null;
    _Game_Interpreter_prototype.command102 = function() {
        if (!asyncCommand102Promise) {
            asyncCommand102Promise = asyncCommand102(this);
            asyncCommand102Promise.then(playerChoice => {
                asyncCommand102Promise = null;
                const index = playerChoice.cancelled ? -2 : playerChoice.index;
                this._branch[this._indent] = index;
                choicesList.element.choicesListDeactivate();
                choicesList.closeAndHide();
            });
        }

        return false;
    }

    async function asyncCommand102(gameInterpreter) {
        if (!gameMessage.isBusy()) {
            gameInterpreter._index++;
            gameInterpreter.setWaitMode('message');

            const params = gameInterpreter._params;
            const { choices, defaultType, cancelType } = extractChoiceParams(params);
            choicesCancelType = cancelType;

            choicesList.element.choicesListSetChoices(choices);
            choicesList.element.choicesListSelectOptionNoEvent(defaultType);
            choicesList.element.choicesListActivate();
            await choicesList.showAndOpen();
            return choicesList.element.choicesListTakeChoice();
        }
    }

    function extractChoiceParams(params) {
        const choices = params[0].clone()
            .map(text => ({ text: convertEscapeCharacters(text) }));
        
        let cancelType = params[1];
        const defaultType = params.length > 2 ? params[2] : 0;
        const positionType = params.length > 3 ? params[3] : 2;
        const background = params.length > 4 ? params[4] : 0;
        if (cancelType >= choices.length) {
            cancelType = -2;
        }

        return {
            choices,
            defaultType,
            cancelType
        };
    }
}