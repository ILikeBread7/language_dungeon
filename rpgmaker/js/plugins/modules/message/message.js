import { ChoicesList } from './components/choices_list.js';
import { BOX_STATE, MessageBox } from './components/message_box.js';

const messageBoxStyle = document.createElement('style');
/**
 * @type {MessageBox}
 */
let messageBox = null;

/**
 * @type {ChoicesList}
 */
let choicesList = null;

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

    ChoicesList.register();
    choicesList = new ChoicesList();
    document.body.appendChild(choicesList);
    const listInlineStyle = choicesList.shadowRoot.getElementById('choices-list').style;
    listInlineStyle.setProperty('z-index', 999);
    // listInlineStyle.setProperty('bottom', '0px');

    setTimeout(registerComponentsForRpgMaker, 1000);
    return messageBox;
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

// polyfill for RPG Maker MV's older nw.js version
if (!HTMLElement.prototype.checkVisibility) {
    HTMLElement.prototype.checkVisibility = function() {
        const style = getComputedStyle(this);
        return style.display !== 'hidden' && style.visibility !== 'none' && style.opacity !== '0';
    }
}

function registerComponentsForRpgMaker() {
    const _Game_Message_prototype = window.Game_Message.prototype;
    const _Game_Interpreter_prototype = window.Game_Interpreter.prototype;
    const input = window.Input;
    const gameMessage = window.$gameMessage;
    const _Window_Message_prototype = window.Window_Message.prototype;
    const _Scene_Base_prototype = window.Scene_Base.prototype;

    const _Scene_Base_prototype_update = _Scene_Base_prototype.update;
    _Scene_Base_prototype.update = function() {
        _Scene_Base_prototype_update.call(this);

        if (choicesList.choicesListIsVisible()) {
            if (input.isTriggered('up')) {
                choicesList.choicesListSelectPreviousOption();
            } else if (input.isTriggered('down')) {
                choicesList.choicesListSelectNextOption();
            } else if (input.isTriggered('ok')) {
                choicesList.choicesListConfirmCurrent();
            } else if (input.isTriggered('cancel')) {
                choicesList.choicesListCancel();
            }
        } else if (messageBox.messageBoxState !== BOX_STATE.CLOSED && input.isTriggered('ok')) {
            messageBox.messageBoxInput();
        }
    }

    _Game_Message_prototype.isBusy = function() {
        return messageBox.messageBoxState !== BOX_STATE.CLOSED
            || choicesList.choicesListIsVisible();
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
            
            do {
                const texts = [];
                while (nextCommand(gameInterpreter, index).code === 401) {  // Text data
                    index++;
                    texts.push(currentCommand(gameInterpreter, index).parameters[0]);
                }

                // For now copy from regular RPG Maker
                switch (nextCommand(gameInterpreter, index).code) {
                    case 102:  // Show Choices
                        index++;
                        const params = currentCommand(gameInterpreter, index).parameters;
                        const choices = params[0].clone()
                            .map(text => ({ text }));

                        const playerChoicePromise = choicesList.choicesListSetChoices(choices);
                        playerChoicePromise.then(async playerChoice => {
                            messageBox.messageBoxForceFinish();
                            await choicesList.choicesListHide();
                            gameInterpreter._branch[gameInterpreter._indent] = playerChoice.index;
                        });
                        break;
                    case 103:  // Input Number
                        index++;
                        gameInterpreter.setupNumInput(currentCommand(gameInterpreter, index).parameters);
                        break;
                    case 104:  // Select Item
                        index++;
                        gameInterpreter.setupItemChoice(currentCommand(gameInterpreter, index).parameters);
                        break;
                }

                index++;
                gameInterpreter.setWaitMode('message');
                await messageBox.messageBoxDisplayText(texts.join('\n'));
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
                this._branch[this._indent] = playerChoice.index;
            });
        }

        return false;
    }

    async function asyncCommand102(gameInterpreter) {
        if (!gameMessage.isBusy()) {
            gameInterpreter._index++;
            gameInterpreter.setWaitMode('message');

            const choices = gameInterpreter._params[0].clone()
                .map(text => ({ text }));

            const playerChoice =  await choicesList.choicesListSetChoices(choices);
            await choicesList.choicesListHide();
            return playerChoice;
        }
    }
}