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

/**
 * 
 * @param {string} cssValue css value in pixels
 */
export function getNumberFromCssPxString(cssValue) {
    if (!cssValue) {
        return;
    }
    return Number(cssValue.substring(0, cssValue.length - 2));
}

/**
 * 
 * @param {DOMRect} elementDimensions 
 * @param {DOMRect} listDimensions 
 * @param {DOMRect} containerDimensions 
 * @param {number} scroll
 */
export function isElementAboveContainer(elementDimensions, listDimensions, containerDimensions, scroll) {
    const realElementTop = elementDimensions.top - listDimensions.top - scroll;
    return realElementTop < containerDimensions.top;
}

/**
 * 
 * @param {DOMRect} elementDimensions 
 * @param {DOMRect} listDimensions 
 * @param {DOMRect} containerDimensions 
 * @param {number} scroll
 */
export function isElementBelowContainer(elementDimensions, listDimensions, containerDimensions, scroll) {
    const realElementBottom = elementDimensions.bottom - listDimensions.top - scroll;
    return realElementBottom > containerDimensions.bottom;
}

/**
 * Scrolls an element, by setting it's top property, to the y position, clamped between 0 and maxScroll
 * @param {HTMLElement} element 
 * @param {number} y 
 * @param {number} [maxScroll] 
 * @returns {number} The new scroll value
 */
export function scrollElementTo(element, y, maxScroll = Number.MAX_SAFE_INTEGER) {
    const scroll = clamp(y, 0, maxScroll);
    element.style.top = `-${scroll}px`;
    return scroll;
}