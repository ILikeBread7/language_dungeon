import { CHOICES_LIST_EVENTS, ChoicesList, LIST_STATE } from './components/choices_list.js';
import { BOX_STATE, EVENTS as MESSAGE_BOX_EVENTS, MessageBox } from './components/message_box.js';

const style = document.createElement('style');
style.innerHTML = /*css*/`
    :root {
        --mesage-choice-transition-time: 0.1s;
    }

    choices-list {
        --transition-time: var(--mesage-choice-transition-time);
    }

    message-box {
        --transition-time: var(--mesage-choice-transition-time);
        --char-write-wait-ms: 25;
    }

    message-box.whole-screen {
        --box-height: 100vh;
        --lines-per-screen: 32;
    }
`;
document.body.appendChild(style);

const messageBoxStyle = document.createElement('style');
const choicesListStyle = document.createElement('style');
/**
 * @type {MessageBox}
 */
let messageBox = null;

/**
 * @type {ChoicesList}
 */
let choicesList = null;

/**
 * @type {number}
 */
let choicesCancelType;

export function initializeAll() {
    void addMessageBox();
    void addChoicesList();
    setTimeout(registerComponentsForRpgMaker, 1000);
}

export function addMessageBox() {
    MessageBox.register();
    messageBox = new MessageBox();
    const boxInlineStyle = messageBox.shadowRoot.getElementById('message-box').style;
    boxInlineStyle.setProperty('z-index', 999);
    boxInlineStyle.setProperty('bottom', '0px');

    messageBox.shadowRoot.appendChild(messageBoxStyle);
    document.body.style.setProperty('overflow', 'hidden');
    document.body.style.setProperty('margin', '0px');
    document.body.appendChild(messageBox);

    window.$messageBox = {
        messageBox,
        setMessageBoxCss,
        appendMessageBoxCss
    };

    messageBox.addEventListener(MESSAGE_BOX_EVENTS.CHAR_SHOWN, () => SoundManager.playCursor());

    return messageBox;
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

export function addChoicesList() {
    ChoicesList.register();
    choicesList = new ChoicesList();
    document.body.appendChild(choicesList);
    const listInlineStyle = choicesList.shadowRoot.getElementById('choices-list').style;
    listInlineStyle.setProperty('z-index', 999);

    choicesList.shadowRoot.appendChild(choicesListStyle);

    window.$choicesList = {
        choicesList,
        setChoicesListCss,
        appendChoicesListCss
    };

    choicesList.addEventListener(CHOICES_LIST_EVENTS.OPTION_SELECT, playSelectSe);
    choicesList.addEventListener(CHOICES_LIST_EVENTS.OPTION_CONFIRM, playConfirmSe);
    choicesList.addEventListener(CHOICES_LIST_EVENTS.CHOICES_CANCEL, playCancelSe);

    return choicesList;
}

/**
 * 
 * @param {string} css 
 */
export function setMessageBoxCss(css) {
    if (!messageBox) {
        console.warn('Message Box not added');
        return;
    }
    messageBoxStyle.innerHTML = css;
    messageBox.messageBoxForceUpdateAfterCssChange();
}

/**
 * 
 * @param {string} css 
 */
export function appendMessageBoxCss(css) {
    if (!messageBox) {
        console.warn('Message Box not added');
        return;
    }
    messageBoxStyle.innerHTML += '\n' + css;
    messageBox.messageBoxForceUpdateAfterCssChange();
}

/**
 * 
 * @param {string} css 
 */
export function setChoicesListCss(css) {
    if (!choicesList) {
        console.warn('Choices List not added');
        return;
    }
    choicesListStyle.innerHTML = css;
}

/**
 * 
 * @param {string} css 
 */
export function appendChoicesListCss(css) {
    if (!choicesList) {
        console.warn('Choices List not added');
        return;
    }
    choicesListStyle.innerHTML += '\n' + css;
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

    const _Scene_Base_prototype_update = _Scene_Base_prototype.update;
    _Scene_Base_prototype.update = function() {
        _Scene_Base_prototype_update.call(this);

        if (choicesList.choicesListState === LIST_STATE.OPEN) {
            if (input.isTriggered('up')) {
                choicesList.choicesListSelectPreviousOption();
            } else if (input.isTriggered('down')) {
                choicesList.choicesListSelectNextOption();
            } else if (input.isTriggered('ok')) {
                choicesList.choicesListConfirmCurrentOption();
            } else if (input.isTriggered('cancel') || touchInput.isCancelled()) {
                switch (choicesCancelType) {
                    case -1: // Disallow
                        SoundManager.playBuzzer();
                        break;
                    case -2:    // Branch
                        choicesList.choicesListCancelNoEvent();
                        playCancelSe();
                        break;
                    default:
                        choicesList.choicesListSelectOptionNoEvent(choicesCancelType);
                        choicesList.choicesListConfirmOptionNoEvent(choicesCancelType);
                        playCancelSe();
                        break;
                }
            }
        } else if (messageBox.messageBoxState !== BOX_STATE.CLOSED && (input.isTriggered('ok') || touchInput.isTriggered())) {
            messageBox.messageBoxInput();
        }
    }

    const _Game_Message_isBusy = _Game_Message_prototype.isBusy;
    _Game_Message_prototype.isBusy = function() {
        return _Game_Message_isBusy.call(this)
            || messageBox.messageBoxState !== BOX_STATE.CLOSED
            || choicesList.choicesListState !== LIST_STATE.CLOSED;
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

                        const playerChoicePromise = choicesList.choicesListSetChoices(choices);
                        choicesList.choicesListSelectOptionNoEvent(defaultType);
                        playerChoicePromise.then(async playerChoice => {
                            messageBox.messageBoxForceFinish();
                            await choicesList.choicesListHide();
                            const index = playerChoice.cancelled ? -2 : playerChoice.index;
                            gameInterpreter._branch[gameInterpreter._indent] = index;
                        });
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
                await messageBox.messageBoxDisplayText(convertEscapeCharacters(texts.join('\n')), showImmediately);
            } while(currentCommand(gameInterpreter, index).code === 101);    // Show message

            await messageBox.messageBoxHide();
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

            const choiceListPromise = choicesList.choicesListSetChoices(choices);
            choicesList.choicesListSelectOptionNoEvent(defaultType);

            const playerChoice =  await choiceListPromise;
            await choicesList.choicesListHide();
            return playerChoice;
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