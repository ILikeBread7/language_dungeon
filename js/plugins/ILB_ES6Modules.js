//=============================================================================
// ILB_ES6Modules.js
//=============================================================================

/*:
 * @plugindesc Allows you to load and use es6 modules.
 *
 * @author I_LIKE_BREAD7
 *
 * @param Main module path
 * @desc Path to the main module
 * @default js/plugins/modules/main.js
 * 
 */

(() => {

    const parameters = PluginManager.parameters('ILB_ES6Modules');
    const mainModulePath = parameters['Main module path'];

    loadModule(mainModulePath);

    function loadModule(filepath) {
        const script = document.createElement('script');
        script.type = 'module';
        script.src = filepath;
        script.async = false;
        script.onerror = console.error;
        document.body.appendChild(script);
    }

})();