//=============================================================================
// ILB_RememberGameWindowPosition.js
//=============================================================================

/*:
 * @plugindesc Makes the game window remember its position between restarts.
 *
 * @author I_LIKE_BREAD7
 * 
 * @param Debounce time
 * @desc Time after which the new window position should be saved
 * @default 1000
 * 
 * @help
 * This plugin saves the position of the game's window to the global config
 * and restores it when the game is started again.
 * This only works on desktop.
 */

(() => {

    if (!Utils.isNwjs()) {
        return;
    }
    const gui = require('nw.gui');
    const win = gui.Window.get();

    const parameters = PluginManager.parameters('ILB_RememberGameWindowPosition');
    const debounceTime = Number(parameters['Debounce time']);

    let initialPositionSet = false;

    let debounceTimeout = null;
    win.on('move', (x, y) => {
        if (!initialPositionSet) {
            return;
        }

        if (debounceTimeout) {
            clearTimeout(debounceTimeout);
            debounceTimeout = null;
        }

        if (
            ConfigManager.screenPosition.x === x
            && ConfigManager.screenPosition.y === y
        ) {
            return;
        }

        debounceTimeout = setTimeout(() => {
            ConfigManager.screenPosition = { x, y };
            ConfigManager.save();
        }, debounceTime);
    });

    const _ConfigManager_makeData = ConfigManager.makeData;
    ConfigManager.makeData = function() {
        const config = _ConfigManager_makeData.call(this);
        config.screenPosition = this.screenPosition;
        return config;
    }

    const _ConfigManager_applyData = ConfigManager.applyData;
    ConfigManager.applyData = function(config) {
        _ConfigManager_applyData.call(this, config);
        this.screenPosition = config.screenPosition;
    }

    const _Scene_Boot_start = Scene_Boot.prototype.start;
    Scene_Boot.prototype.start = function() {
        _Scene_Boot_start.call(this);

        const screenPosition = ConfigManager.screenPosition;
        if (screenPosition) {
            win.moveTo(screenPosition.x, screenPosition.y);
        }
        initialPositionSet = true;
    }

})();