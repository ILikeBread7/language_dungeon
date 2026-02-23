/*:
 * @plugindesc Dungeon Minimap (SAN_MapGenerator) – PMD Style
 * Clean ES6 version + enemies + items
 * @author ChatGPT
 * 
 * @param Tile size
 * @desc Size of the tiles on the minimap
 * @default 10
 * 
 * @param Event show distance
 * @desc Distance at which events should be shown, even if not same room
 * @default 3
 * 
 * @param X offset
 * @desc X offset of the map on the screen
 * @default Math.floor(Graphics.width / 4)
 * 
 * @param Y offset
 * @desc Y offset of the map on the screen
 * @default Math.floor(Graphics.height / 4)
 *
 * @help
 * Script Calls:
 * DungeonMinimap.visit(x, y);
 * DungeonMinimap.clear();
 */

const DungeonMinimap = {
    _visited: {},
    _revealedRooms: {},

    visit(x, y) {
        if (!this._visited) this._visited = {};
        if (!this._revealedRooms) this._revealedRooms = {};

        this._visited[`${x},${y}`] = true;

        const generator = $gameMap.mapGenerator();
        if (!generator) return;

        const rooms = generator._rooms || [];

        rooms.forEach((r, index) => {
            if (
                x >= r.x &&
                x < r.x + r.w &&
                y >= r.y &&
                y < r.y + r.h
            ) {
                this._revealedRooms[index] = true;
            }
        });
    },

    isVisited(x, y) {
        if (!this._visited) return false;
        return !!this._visited[`${x},${y}`];
    },

    isRoomRevealed(index) {
        if (!this._revealedRooms) return false;
        return !!this._revealedRooms[index];
    },

    clear() {
        this._visited = {};
        this._revealedRooms = {};
    }
};

(() => {

const parameters = PluginManager.parameters('SimpleDungeonMinimap');
const tileSize = Number(parameters['Tile size'] || 10);
const eventShowDistance = Number(parameters['Event show distance'] || 0);

// Timeout needed to parse the parameters after the engine has properly started,
// not when the plugins are added.
let offsets = { x:0, y: 0 };
setTimeout(() => {
    offsets.x = eval(parameters['X offset']) || 0;
    offsets.y = eval(parameters['Y offset']) || 0;
});

class Sprite_DungeonMinimap extends Sprite {
    constructor() {
        super();
        this.bitmap = new Bitmap(Graphics.width, Graphics.height);
        this._tileSize = tileSize;
        this.x = offsets.x;
        this.y = offsets.y;
        this.z = 9999;
    }

    update() {
        super.update();
        this.bitmap.clear();

        if (!$gameMap.isGeneratedMap || !$gameMap.isGeneratedMap()) return;

        this.drawRooms();
        this.drawPasses();
        this.drawEvents();
        this.drawPlayer();
    }

    drawRooms() {
        const generator = $gameMap.mapGenerator();
        if (!generator) return;

        const rooms = generator._rooms || [];
        const s = this._tileSize;

        rooms.forEach((room, index) => {
            if (!DungeonMinimap.isRoomRevealed(index)) return;

            for (let x = room.x; x < room.x + room.w; x++) {
                for (let y = room.y; y < room.y + room.h; y++) {
                    this.drawTileWalls(x, y, s);
                }
            }
        });
    }

    drawPasses() {
        const generator = $gameMap.mapGenerator();
        if (!generator) return;

        const passes = generator._passes || [];
        const s = this._tileSize;

        passes.forEach(pass => {
            for (let x = pass.x; x < pass.x + pass.w; x++) {
                for (let y = pass.y; y < pass.y + pass.h; y++) {
                    if (DungeonMinimap.isVisited(x, y)) {
                        this.drawTileWalls(x, y, s);
                    }
                }
            }
        });
    }

    drawTileWalls(x, y, s) {
        const ctx = this.bitmap._context;
        const px = x * s;
        const py = y * s;

        ctx.save();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;

        if (!$gameMap.isPassable(x, y, 8)) {
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px + s, py);
            ctx.stroke();
        }

        if (!$gameMap.isPassable(x, y, 6)) {
            ctx.beginPath();
            ctx.moveTo(px + s, py);
            ctx.lineTo(px + s, py + s);
            ctx.stroke();
        }

        if (!$gameMap.isPassable(x, y, 2)) {
            ctx.beginPath();
            ctx.moveTo(px, py + s);
            ctx.lineTo(px + s, py + s);
            ctx.stroke();
        }

        if (!$gameMap.isPassable(x, y, 4)) {
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(px, py + s);
            ctx.stroke();
        }

        ctx.restore();
        this.bitmap._setDirty();
    }

    drawPlayer() {
        this.drawDot($gamePlayer.x, $gamePlayer.y, 'blue');
    }

    drawEvents() {
        const events = $gameMap._events;
        if (!events) return;

        events.forEach(event => {
            if (!event || event._erased || !event.event() || !event.event().meta) return;

            if (!event.isSameRoomWithPlayer() && distance($gamePlayer, event) > eventShowDistance) return;

            if (event.event().meta.enemy) {
                this.drawDot(event.x, event.y, 'red');
            }

            if (event.event().meta.item) {
                this.drawDot(event.x, event.y, 'green');
            }
        });
    }

    drawDot(x, y, color) {
        const s = this._tileSize;
        const ctx = this.bitmap._context;

        const px = x * s + s / 2;
        const py = y * s + s / 2;

        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, py, s / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        this.bitmap._setDirty();
    }
}

// Auto-visit on movement
const _moveStraight = Game_Player.prototype.moveStraight;
Game_Player.prototype.moveStraight = function(d) {
    _moveStraight.call(this, d);
    if (this.isMovementSucceeded()) {
        DungeonMinimap.visit(this.x, this.y);
    }
};

const _moveDiagonal = Game_Player.prototype.moveDiagonally;
Game_Player.prototype.moveDiagonally = function(h, v) {
    _moveDiagonal.call(this, h, v);
    if (this.isMovementSucceeded()) {
        DungeonMinimap.visit(this.x, this.y);
    }
};

const _sceneStart = Scene_Map.prototype.start;
Scene_Map.prototype.start = function() {
    _sceneStart.call(this);
    if ($gameMap.isGeneratedMap && $gameMap.isGeneratedMap()) {
        DungeonMinimap.visit($gamePlayer.x, $gamePlayer.y);
    }
};

const _createDisplayObjects = Scene_Map.prototype.createDisplayObjects;
Scene_Map.prototype.createDisplayObjects = function() {
    _createDisplayObjects.call(this);
    this._dungeonMinimap = new Sprite_DungeonMinimap();
    this.addChild(this._dungeonMinimap);
};

function distance(entity1, entity2) {
    return Math.max(
        Math.abs(entity1.x - entity2.x),
        Math.abs(entity1.y - entity2.y)
    );
}

})();