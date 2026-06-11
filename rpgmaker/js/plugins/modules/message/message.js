import { BOX_STATE, MessageBox } from './components/message_box.js';

const messageBoxStyle = document.createElement('style');
/**
 * @type {MessageBox}
 */
let messageBox = null;

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
    setTimeout(registerMessageBoxForRpgMaker, 1000);

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

function registerMessageBoxForRpgMaker() {
    const _Game_Message_prototype = window.Game_Message.prototype;
    const _Game_Interpreter_prototype = window.Game_Interpreter.prototype;
    const input = window.Input;
    const gameMessage = window.$gameMessage;
    const _Window_Message_prototype = window.Window_Message.prototype;
    const _Scene_Base_prototype = window.Scene_Base.prototype;

    const _Scene_Base_prototype_update = _Scene_Base_prototype.update;
    _Scene_Base_prototype.update = function() {
        _Scene_Base_prototype_update.call(this);
        if (messageBox.messageBoxState !== BOX_STATE.CLOSED && input.isTriggered('ok')) {
            messageBox.input();
        }
    }

    _Game_Message_prototype.isBusy = function() {
        return messageBox.messageBoxState !== BOX_STATE.CLOSED;
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
        if (messageBox.messageBoxState === BOX_STATE.CLOSED) {
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
                        gameInterpreter.setupChoices(currentCommand(gameInterpreter, index).parameters);
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

    const _Game_Interpreter_prototype_setupChoices = _Game_Interpreter_prototype.setupChoices;
    _Game_Interpreter_prototype.setupChoices = function(params) {
        _Game_Interpreter_prototype_setupChoices.call(this, params);
        const defaultCallback = gameMessage._choiceCallback;
        gameMessage.setChoiceCallback(() => {
            defaultCallback();
            messageBox.messageBoxDisplayImmediately();
            messageBox.input();
        });
    }
}