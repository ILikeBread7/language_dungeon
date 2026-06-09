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

    _Game_Interpreter_prototype.command101 = async function() {
        if (messageBox.messageBoxState === BOX_STATE.CLOSED) {
            do {
                const texts = [];
                while (this.nextEventCode() === 401) {  // Text data
                    this._index++;
                    texts.push(this.currentCommand().parameters[0]);
                }
                this.setWaitMode('message');
                await messageBox.messageBoxDisplayText(texts.join('\n'));
                console.log(this.currentCommand().code, this.nextEventCode())
            } while(this.currentCommand().code === 101);    // Show message
            await messageBox.messageBoxHide();
        }
        
        return false;
    }
}