/**
 * 
 * @param {import('../../common/helpers/hideable_openable.js').HideableOpenable<import('./choices_list.js').ChoicesListComponent>} choicesList
 * @param {[import('./choices_list.js').ChoiceListChoice]} options 
 * @param {number} [defaultIndex] 
 * 
 */
export async function takeOneChoice(choicesList, options, defaultIndex) {
    choicesList.element.choicesListSetChoices(options);
    choicesList.element.choicesListActivate();
    choicesList.element.choicesListSelectOption(defaultIndex);
    choicesList.showAndOpen();
    const choice = await choicesList.element.choicesListTakeChoice();
    choicesList.element.choicesListDeactivate();
    await choicesList.closeAndHide();
    return choice;
}

/**
 * 
 * @param {import('../../common/helpers/hideable_openable.js').HideableOpenable<import('./message_box.js').MessageBoxComponent>} messageBox
 * @param {string} text 
 * 
 */
export async function displaySingleMessage(messageBox, text) {
    messageBox.showAndOpen();
    await messageBox.element.messageBoxDisplayText(text);
    await messageBox.closeAndHide();
}