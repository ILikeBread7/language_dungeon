//=============================================================================
// ILB_QuickTest.js
//=============================================================================

/*:
 * @plugindesc Auto starts the game
 *
 * @author I_LIKE_BREAD7
 *
 * @help
 * Auto satrts the game for quick playtesting.
 * 
 */

(() => {

    Scene_Title.prototype.start = function() {
        SceneManager.goto(Scene_Map);
    }

})();