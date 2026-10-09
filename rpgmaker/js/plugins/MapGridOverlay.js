
/*:
 * @plugindesc Displays a configurable tile grid overlay on the map.
 * @author ChatGPT
 *
 * @param Grid Color
 * @type string
 * @default #ffffff
 * @desc The grid line color in CSS hex format.
 *
 * @param Grid Opacity
 * @type number
 * @min 0
 * @max 255
 * @default 128
 * @desc The grid line opacity (0-255).
 *
 * @param Grid Line Width
 * @type number
 * @min 1
 * @default 1
 * @desc The grid line thickness in pixels.
 *
 * @help
 * Script Calls:
 *
 *   $mapGrid.show();
 *   $mapGrid.hide();
 *   $mapGrid.toggle();
 *
 *   $mapGrid.setVisible(true);
 *   $mapGrid.setVisible(false);
 *
 *   $mapGrid.isVisible();
 *
 * The grid is hidden by default.
 */

(() => {
    "use strict";

    const parameters = PluginManager.parameters("MapGridOverlay");

    const GRID_COLOR = String(parameters["Grid Color"] || "#ffffff");
    const GRID_OPACITY = Number(parameters["Grid Opacity"] || 128);
    const GRID_LINE_WIDTH = Math.max(
        1,
        Number(parameters["Grid Line Width"] || 1)
    );

    // --------------------------------------------------
    // MapGrid: Public API
    // --------------------------------------------------

    class MapGrid {
        constructor() {
            this._visible = false;
            this._sprite = null;
        }

        show() {
            this._visible = true;
        }

        hide() {
            this._visible = false;
        }

        toggle() {
            this._visible = !this._visible;
        }

        setVisible(visible) {
            this._visible = !!visible;
        }

        isVisible() {
            return this._visible;
        }
    }

    // Expose a global object for script calls.
    window.$mapGrid = new MapGrid();

    // --------------------------------------------------
    // Sprite_MapGrid: Grid overlay
    // --------------------------------------------------

    class Sprite_MapGrid extends Sprite {
        constructor() {
            super(new Bitmap(Graphics.width, Graphics.height));

            this._lastDisplayX = null;
            this._lastDisplayY = null;

            this.visible = false;
        }

        update() {
            super.update();

            this.visible = $mapGrid.isVisible();

            if (!this.visible) {
                return;
            }

            const displayX = $gameMap.displayX();
            const displayY = $gameMap.displayY();

            if (
                displayX !== this._lastDisplayX ||
                displayY !== this._lastDisplayY
            ) {
                this._lastDisplayX = displayX;
                this._lastDisplayY = displayY;
                this.redrawGrid();
            }
        }

        redrawGrid() {
            const bitmap = this.bitmap;
            const map = $gameMap;

            const tileWidth = map.tileWidth();
            const tileHeight = map.tileHeight();

            const offsetX = map.displayX() * tileWidth;
            const offsetY = map.displayY() * tileHeight;

            const startX = -(offsetX % tileWidth);
            const startY = -(offsetY % tileHeight);

            bitmap.clear();
            bitmap.paintOpacity = Math.max(
                0,
                Math.min(255, GRID_OPACITY)
            );

            for (
                let x = startX;
                x <= Graphics.width;
                x += tileWidth
            ) {
                bitmap.fillRect(
                    Math.round(x),
                    0,
                    GRID_LINE_WIDTH,
                    Graphics.height,
                    GRID_COLOR
                );
            }

            for (
                let y = startY;
                y <= Graphics.height;
                y += tileHeight
            ) {
                bitmap.fillRect(
                    0,
                    Math.round(y),
                    Graphics.width,
                    GRID_LINE_WIDTH,
                    GRID_COLOR
                );
            }

            bitmap.paintOpacity = 255;
        }
    }

    // --------------------------------------------------
    // Spriteset_Map: Add the grid overlay
    // --------------------------------------------------

    const _Spriteset_Map_createUpperLayer =
        Spriteset_Map.prototype.createUpperLayer;

    Spriteset_Map.prototype.createUpperLayer = function() {
        _Spriteset_Map_createUpperLayer.call(this);

        this._mapGridSprite = new Sprite_MapGrid();
        this.addChild(this._mapGridSprite);

        $mapGrid._sprite = this._mapGridSprite;
    };

})();