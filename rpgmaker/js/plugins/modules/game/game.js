import { FullGamelogComponent } from '../common/components/full_gamelog_component.js';
import { GamelogComponent } from '../common/components/gamelog_component.js';
import { HideableOpenable } from '../common/helpers/hideable_openable.js';
import { DungeonHudComponent } from './components/dungeon_hud.js';

/**
 * @type {HideableOpenable<DungeonHudComponent>}
 */
let dungeonHud;

/**
 * @type {HideableOpenable<GamelogComponent>}
 */
let gamelog;

/**
 * @type {HideableOpenable<FullGamelogComponent>}
 */
let fullGamelog;

/**
 * 
 * @param {HTMLElement} [container] 
 */
export function initializeGame(container = document.body) {
    DungeonHudComponent.register();
    dungeonHud = new HideableOpenable(new DungeonHudComponent());
    container.appendChild(dungeonHud.topElement);

    window.$dungeonHud = {
        setValues: dungeonHud.element.dungeonHudComponentSetValues.bind(dungeonHud.element),
        show: dungeonHud.showAndOpen.bind(dungeonHud),
        hide: dungeonHud.closeAndHide.bind(dungeonHud),
        updateHp() {
            const player = $gameParty.leader();
            updateHp(player);
        }
    };

    GamelogComponent.register();
    gamelog = new HideableOpenable(new GamelogComponent());
    container.appendChild(gamelog.topElement);

    const LOG_SHOW_TIME = 5000;
    let addLogTimeout = null;
    window.$gamelog = {
        add(logText) {
            if (addLogTimeout) {
                clearTimeout(addLogTimeout);
            }

            gamelog.showAndOpen();
            gamelog.element.gamelogComponentAddLog(logText);
            addLogTimeout = setTimeout(() => gamelog.closeAndHide(), LOG_SHOW_TIME);
        },
        close() {
            if (addLogTimeout) {
                clearTimeout(addLogTimeout);
            }
            gamelog.closeAndHide();
        },
        clear: () => gamelog.element.gamelogComponentClear(),
    };
}

const _Game_Actor_setHp = Game_Actor.prototype.setHp;
Game_Actor.prototype.setHp = function(hp) {
    _Game_Actor_setHp.call(this, hp);
    updateHp(this);
}

const _Game_Actor_changeExp = Game_Actor.prototype.changeExp;
Game_Actor.prototype.changeExp = function() {
    const oldLevel = this._level;
    _Game_Actor_changeExp.call(this);
    if (this._level !== oldLevel) {
        updateHp(this);
    }
}

function updateHp(player) {
    dungeonHud.element.dungeonHudComponentSetValues({ hp: player.hp, maxHp: player.mhp });
}

const _Scene_Base_start = Scene_Base.prototype.start;
Scene_Base.prototype.start = function() {
    _Scene_Base_start.call(this);
    if (
        (
            this instanceof Scene_Map
            || this instanceof Scene_Item
        )
        && $dataMap?.meta.dungeon
    ) {
        dungeonHud.showAndOpen();
    } else {
        dungeonHud.closeAndHide();
    }
}