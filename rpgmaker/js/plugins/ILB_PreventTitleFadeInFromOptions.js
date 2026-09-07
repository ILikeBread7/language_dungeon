//=============================================================================
// ILB_PreventTitleFadeInFromOptions.js
//=============================================================================

/*:
 * @plugindesc Prevents the fade-in animation on title screen if coming back from Options
 *
 * @author I_LIKE_BREAD7
 *
 * @param Scenes
 * @desc A comma separated list of scenes to prevent title fade-in when coming back from.
 * @default Scene_Options
 * 
 * @help
 * Example value for Scenes parameter:
 * Scene_Options, Scene_Map, Scene_GameEnd
 */

(() => {
    const parameters = PluginManager.parameters('ILB_PreventTitleFadeInFromOptions');
    const scenesString = `[${parameters['Scenes']}]`;
    let scenes;

    const _Scene_Title_startFadeIn = Scene_Title.prototype.startFadeIn;
    Scene_Title.prototype.startFadeIn = function() {
        if (!scenes) {
            scenes = eval(scenesString);
        }

        if (scenes.some(scene => SceneManager.isPreviousScene(scene))) {
            return;
        }
        
        _Scene_Title_startFadeIn.call(this);
    }
})();