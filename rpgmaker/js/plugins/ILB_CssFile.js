//=============================================================================
// ILB_CssFile.js
//=============================================================================

/*:
 * @plugindesc Allows you to load a custom css file.
 *
 * @author I_LIKE_BREAD7
 *
 * @param Main css file path
 * @desc Path to the main css file
 * @default js/plugins/style.css
 * 
 * @help
 * If you want to include multiple files,
 * add them through @import in the main file.
 * 
 */

(() => {

    const parameters = PluginManager.parameters('ILB_CssFile');
    const mainCssFilePath = parameters['Main css file path'];

    loadCssFile(mainCssFilePath);

    function loadCssFile(filepath) {
        const stylesheet = document.createElement('link');
        stylesheet.rel = 'stylesheet';
        stylesheet.type = 'text/css';
        stylesheet.href = filepath;
        stylesheet.onerror = console.error;
        document.head.appendChild(stylesheet);
    }

})();