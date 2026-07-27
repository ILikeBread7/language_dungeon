/**
 * 
 * @param {import('./../../common/components/hideable_openable.js').HideableOpenable<import('./choices_list.js').ChoicesListComponent>} choicesList
 * @param {[import('./choices_list.js').ChoiceListChoice]} options 
 * @param {number} [defaultIndex] 
 * 
 */
export async function takeOneChoice(choicesList, options, defaultIndex) {
    choicesList.hideable.hideableShow();
    choicesList.element.choicesListSetChoices(options);
    choicesList.element.choicesListActivate();
    choicesList.element.choicesListSelectOption(defaultIndex);
    choicesList.openable.openableOpen();
    const choice = await choicesList.element.choicesListTakeChoice();
    choicesList.element.choicesListDeactivate();
    await choicesList.openable.openableClose();
    choicesList.hideable.hideableHide();
    return choice;
}