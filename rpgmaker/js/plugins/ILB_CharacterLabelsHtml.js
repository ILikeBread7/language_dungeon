

const $characterLabels = { };

(() => {

    const labelsContainer = document.createElement('div');
    labelsContainer.id = 'labels-container';
    const baseTransform = 'translate(-50%, -50%)';

    const style = document.createElement('style');
    style.innerHTML = /*css*/`
        #labels-container {
            position: absolute;
            left: 50%;
            top: 50%;
            overflow: hidden;
        }

        #labels-container > * {
            font-size: 16px;
            color: #ffffff;
            font-family: GameFont;
            -webkit-text-stroke: #000000 0.25em;
            paint-order: stroke fill;
        }
    `;
    document.body.appendChild(style);

    document.body.appendChild(labelsContainer);
    window.addEventListener('resize', adjustLabelsDivDimensions);
    adjustLabelsDivDimensions();

    function adjustLabelsDivDimensions() {
        setTimeout(() => {
            labelsContainer.style.zIndex = 998;
            labelsContainer.style.transform = `${baseTransform} scale(${Graphics._realScale})`;
            labelsContainer.style.width = `${Graphics.boxWidth}px`;
            labelsContainer.style.height = `${Graphics.boxHeight}px`;
        }, 50);
    }

    function clearLabels() {
        labelsContainer.innerHTML = '';
    }
    $characterLabels.clear = clearLabels;

    const _Game_Character_update = Game_Character.prototype.update;
    Game_Character.prototype.update = function() {
        _Game_Character_update.call(this);
        if (this.textLabel && !this.textLabelElement) {
            this.textLabelElement = document.createElement('span');
            this.textLabelElement.style.position = 'absolute';
            this.textLabelElement.style.transform = 'translate(-50%, -100%)';
            labelsContainer.appendChild(this.textLabelElement);
        }

        if (this.textLabelElement) {
            if (this.textLabel) {
                this.textLabelElement.innerHTML = this.textLabel;
                this.textLabelElement.style.left = `${this.screenX()}px`;
                this.textLabelElement.style.top = `${this.screenY() - $gameMap.tileHeight()}px`;
            } else {
                labelsContainer.removeChild(this.textLabelElement);
                delete this.textLabelElement;
            }
        }
    }

    const _Game_Event_erase = Game_Event.prototype.erase;
    Game_Event.prototype.erase = function() {
        _Game_Event_erase.call(this);
        if (this.textLabelElement) {
            labelsContainer.removeChild(this.textLabelElement);
        }
    }

    const _Scene_Base_update = Scene_Base.prototype.update;
    Scene_Base.prototype.update = function() {
        _Scene_Base_update.call(this);
        if (this.constructor !== Scene_Map) {
            labelsContainer.style.display = 'none';
        } else {
            labelsContainer.style.display = 'unset';
        }
    }

    const _Game_Player_performTransfer = Game_Player.prototype.performTransfer;
    Game_Player.prototype.performTransfer = function() {
        if (this._newMapId !== $gameMap.mapId()) {
            clearLabels();
        }
        _Game_Player_performTransfer.call(this);
    }

})();