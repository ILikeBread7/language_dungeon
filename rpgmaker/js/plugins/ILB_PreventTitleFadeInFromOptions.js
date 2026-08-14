//=============================================================================
// ILB_PreventTitleFadeInFromOptions.js
//=============================================================================

/*:
 * @plugindesc Prevents the fade-in animation on title screen if coming back from Options
 *
 * @author I_LIKE_BREAD7
 *
 * @help
 * This plugin doesn't provide any parameters or plugin calls.
 * Just add it to your project and it should work.
 */

(() => {
    const _Scene_Title_startFadeIn = Scene_Title.prototype.startFadeIn;
    Scene_Title.prototype.startFadeIn = function() {
        if (SceneManager.isPreviousScene(Scene_Options)) {
            return;
        }
        
        _Scene_Title_startFadeIn.call(this);
    }
})();