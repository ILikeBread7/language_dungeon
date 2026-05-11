//=============================================================================
// ILB_CustomWebStorageKey.js
//=============================================================================

/*:
 * @plugindesc Adds a prefix to the web storage key
 *
 * @author I_LIKE_BREAD7
 * 
 * @param Key
 * @desc Your custom key prefix, set it to any random text you want, might be your game's title
 * @default CHANGE THIS!
 *
 *
 * @help
 * This plugin lets you create a custom web storage key for
 * save files for the web version of your game,
 * so it doesn't clash with other rpg maker games
 * hosted on the same server.
 * 
 */

(() => {

    const parameters = PluginManager.parameters('ILB_CustomWebStorageKey');
    const key = parameters['Key'];

    const _StorageManager_webStorageKey = StorageManager.webStorageKey;
    StorageManager.webStorageKey = function(savefileId) {
        return key + _StorageManager_webStorageKey.call(this, savefileId);
    };

})();