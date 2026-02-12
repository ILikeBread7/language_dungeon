//=============================================================================
// ILB_CustomFunctions.js
//=============================================================================

/*:
 * @plugindesc Exposes a global object $f to store custom functions for use in script calls.
 *
 * @author I_LIKE_BREAD7
 *
 * @help
 * This plugin creates a global object $f. You can add any functions you want to $f and 
 * then call them using script calls. This is useful for organizing custom game functions.
 * You can also include multiple copies of this plugin with different filenames for better
 * code separation.
 * 
 * Example usage:
 * Add a function to the plugin in the designated space like this
 *   $f.myFunction = function(param1, param2) {
 *       // Your code here
 *       console.log("Function called with params:", param1, param2);
 *   };
 *
 * Then in a script call, use like this:
 *   $f.myFunction("hello", 42);
 */

var $f = $f || {};

(function() {

    const distanceToFollow = 3;
    let currentEnemyIndex = 0;
    function moveEnemies() {
        const events = $gameMap.events();
        const realMoveSpeed = $gamePlayer.realMoveSpeed();
        for (; currentEnemyIndex < events.length; currentEnemyIndex++) {
            const event = events[currentEnemyIndex];
            if (!event || event.isMoving()) {
                continue;
            }

            if (event.isStunned) {
                event.isStunned = false;
                continue;
            }

            event.setMoveSpeed(realMoveSpeed);
            const playerDistance = distance($gamePlayer, event);
            if (playerDistance === 1) {
                event.isAttacking = true;
                event.start();
                currentEnemyIndex++;
                return;
            } else if ($gamePlayer.regionId() === event.regionId() || playerDistance <= distanceToFollow) {
                event.moveTowardPlayer();
            } else {
                event.moveRandom();
            }
        }

        if (currentEnemyIndex >= events.length) {
            currentEnemyIndex = 0;
        }
    }

    const _Game_Event_unlock = Game_Event.prototype.unlock;
    Game_Event.prototype.unlock = function() {
        _Game_Event_unlock.call(this);
        this.isAttacking = false;
        moveEnemies();
    }

    const _Game_Party_increaseSteps = Game_Party.prototype.increaseSteps;
    Game_Party.prototype.increaseSteps = function() {
        _Game_Party_increaseSteps.call(this);
        moveEnemies();
    };

    function distance(entity1, entity2) {
        return Math.max(
            Math.abs(entity1.x - entity2.x),
            Math.abs(entity1.y - entity2.y)
        );
    }

})();
