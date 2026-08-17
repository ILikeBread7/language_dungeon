/**
 * @template {HTMLElement} T
 * @typedef {import('../../common/helpers/hideable_openable.js').HideableOpenable<T>} HideableOpenable<T>
 */

/**
 * 
 * @param {HideableOpenable<import('./choices_list.js').ChoicesListComponent>} choicesList
 * @param {[import('./choices_list.js').ChoiceListChoice]} options 
 * @param {number} [defaultIndex] 
 * 
 */
export async function takeOneChoice(choicesList, options, defaultIndex) {
    choicesList.element.choicesListSetChoices(options);
    choicesList.element.choicesListRefreshVisibleAndEnabledOptions();
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
 * @param {HideableOpenable<import('./message_box.js').MessageBoxComponent>} messageBox
 * @param {string} text 
 * 
 */
export async function displaySingleMessage(messageBox, text) {
    messageBox.showAndOpen();
    await messageBox.element.messageBoxDisplayText(text);
    await messageBox.closeAndHide();
}

/**
 * 
 * @param {HideableOpenable<import('../../menu/components/are_you_sure.js').AreYouSureComponent} areYouSure 
 * @param {import('../../menu/components/are_you_sure.js').AreYouSureOptions} options 
 */
export async function takeAreYouSure(areYouSure, options) {
    areYouSure.showAndOpen();
    const choice = await areYouSure.element.areYouSureTakeChoice(options);
    await areYouSure.closeAndHide();
    return choice;
}

/**
 * 
 * @param {number} number 
 * @param {number} min 
 * @param {number} max 
 * @returns 
 */
export function clamp(number, min, max) {
    return Math.min(Math.max(number, min), max);
}