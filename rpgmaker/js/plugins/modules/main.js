import { addMessageBox, setMessageBoxCss, appendMessageBoxCss } from './message/message.js'

const messageBox = addMessageBox();
setTimeout(() => {
    messageBox.messageBoxDisplayText('Test123')
}, 1000)

setMessageBoxCss(/*css*/`
    :host {
        --lines-per-screen: 6;
    }

    #message-box {
        font-size: 24px;
        background: purple;
    }
`);

setTimeout(() => {
    appendMessageBoxCss(/*css*/`
        :host {
            --lines-per-screen: 2;
        }

        #message-box {
            background: green;
            color: yellow;
        }
    `);
}, 1500)