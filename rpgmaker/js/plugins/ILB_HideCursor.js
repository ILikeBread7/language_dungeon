//=============================================================================
// ILB_HideCursor.js
//=============================================================================

/*:
 * @plugindesc Hides the mouse cursor after a specific time with no movement
 *
 * @author I_LIKE_BREAD7
 *
 * @param Time
 * @desc Time (in miliseconds) with no movement after which the cursor should be hidden
 * @default 1000
 */

(() => {

    const parameters = PluginManager.parameters('ILB_HideCursor');
    const time = Number(parameters['Time'] || 0);

    let hideCursorTimeout = setTimeout(hideCursor, time);

    window.addEventListener('mousemove', () => {
        if (hideCursorTimeout) {
            clearTimeout(hideCursorTimeout);
        }
        showCursor();
        hideCursorTimeout = setTimeout(hideCursor, time);
    });

    function hideCursor() {
        document.body.style.cursor = 'none';
    }

    function showCursor() {
        document.body.style.removeProperty('cursor');
    }

})();