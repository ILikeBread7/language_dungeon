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
 * 
 * @param Show on click
 * @desc Makes the cursor also show on click, even with no movement
 * @type boolean
 * @on On
 * @off Off
 * @default true
 */

(() => {

    const parameters = PluginManager.parameters('ILB_HideCursor');
    const time = Number(parameters['Time'] || 0);
    const showOnClick = JSON.parse(parameters['Show on click'] || false);

    let hideCursorTimeout = setTimeout(hideCursor, time);

    window.addEventListener('mousemove', mouseListener);
    if (showOnClick) {
        window.addEventListener('mousedown', mouseListener);
    }
    
    function mouseListener() {
        if (hideCursorTimeout) {
            clearTimeout(hideCursorTimeout);
        }
        showCursor();
        hideCursorTimeout = setTimeout(hideCursor, time);
    }

    function hideCursor() {
        document.body.style.cursor = 'none';
    }

    function showCursor() {
        document.body.style.removeProperty('cursor');
    }

})();