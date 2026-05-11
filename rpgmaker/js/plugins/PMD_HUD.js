/*:
 * @plugindesc Pokemon Mystery Dungeon-style HUD (Top of screen) for Map Scene (ES6 version)
 * @author ChatGPT
 *
 * @param Floor Variable ID
 * @type number
 * @desc Game variable ID that stores current floor
 * @default 1
 *
 * @help
 * Displays a HUD at the top of the screen showing:
 * - Current floor (from variable)
 * - Party leader HP (current / max + bar)
 */

(() => {
    const parameters = PluginManager.parameters('PMD_HUD');
    const floorVarId = Number(parameters['Floor Variable ID'] || 1);

    //==============================
    // HUD Window
    //==============================
    class Window_PMDHUD extends Window_Base {
        constructor() {
            const width = Graphics.boxWidth;
            const height = Window_Base.prototype.fittingHeight(1);
            super(0, 0, width, height);
            this.opacity = 0;
        }

        update() {
            super.update();
            this.refresh();
        }

        refresh() {
            this.contents.clear();

            const actor = $gameParty.leader();
            if (!actor) return;

            const floor = $gameVariables.value(floorVarId);
            const hp = actor.hp;
            const mhp = actor.mhp;

            // Floor
            this.drawText(`F${floor}`, 0, 0, 50, 'left');

            const isLowHp = hp <= 0.2 * mhp;
            // HP text
            const hpText = `${hp} / ${mhp}`;
            if (isLowHp) {
                this.changeTextColor('hsl(50, 85%, 50%)');
            }
            this.drawText(hpText, 50, 0, 135, 'left');
            this.changeTextColor('#ffffff');

            // HP bar
            const barWidth = 200;
            const barX = 185;
            const rate = hp / mhp;

            const gaugeColor = isLowHp ? 2 : 3;
            this.drawGauge(barX, 0, barWidth, rate, this.textColor(gaugeColor), this.textColor(gaugeColor + 8));
        }

        drawGauge(x, y, width, rate, color1, color2) {
            const height = 20;
            var fillW = Math.floor(width * rate);
            var gaugeY = y + height / 2 - 2;
            this.contents.fillRect(x, gaugeY, width, height, this.gaugeBackColor());
            this.contents.gradientFillRect(x, gaugeY, fillW, height, color1, color2);
        }
    }

    //==============================
    // Scene_Map Injection
    //==============================
    const _Scene_Map_createAllWindows = Scene_Map.prototype.createAllWindows;
    Scene_Map.prototype.createAllWindows = function() {
        _Scene_Map_createAllWindows.call(this);
        this.createPMDHUD();
    };

    Scene_Map.prototype.createPMDHUD = function() {
        this._pmdHud = new Window_PMDHUD();

        // Add BELOW message window by placing at bottom of window layer
        this._windowLayer.addChildAt(this._pmdHud, 0);
    };

})();