import { addMessageBox, setMessageBoxCss, appendMessageBoxCss, addChoicesList, registerComponentsForRpgMaker, setChoicesListCss } from './message/message.js'

const messageBox = addMessageBox();
const choicesList = addChoicesList();
setTimeout(registerComponentsForRpgMaker, 1000);