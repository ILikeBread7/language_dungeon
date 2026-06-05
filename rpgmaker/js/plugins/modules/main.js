import { addMessageBox } from './message/message.js'

const messageBox = addMessageBox();
setTimeout(() => {
    messageBox.messageBoxDisplayText('Test123')
}, 1000)