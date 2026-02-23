/*:
 * @plugindesc Dungeon Minimap (SAN_MapGenerator) – Working Version
 * @author ChatGPT
 *
 * @help
 * Script Calls:
 * DungeonMinimap.visit(x, y);
 * DungeonMinimap.clear();
 */

var Imported = Imported || {};
Imported.SimpleDungeonMinimap = true;

var DungeonMinimap = {};
DungeonMinimap._visited = {};
DungeonMinimap._revealedRooms = {};

// ===============================
// VISIT SYSTEM
// ===============================

DungeonMinimap.visit = function(x, y) {
    if (!this._visited) this._visited = {};
    if (!this._revealedRooms) this._revealedRooms = {};

    this._visited[x + "," + y] = true;

    var generator = $gameMap.mapGenerator && $gameMap.mapGenerator();
    if (!generator) return;

    var rooms = generator._rooms || [];
    for (var i = 0; i < rooms.length; i++) {
        var r = rooms[i];
        if (x >= r.x && x < r.x + r.w &&
            y >= r.y && y < r.y + r.h) {
            this._revealedRooms[i] = true;
        }
    }
};

DungeonMinimap.isVisited = function(x, y) {
    if (!this._visited) return false;
    return !!this._visited[x + "," + y];
};

DungeonMinimap.isRoomRevealed = function(index) {
    if (!this._revealedRooms) return false;
    return !!this._revealedRooms[index];
};

DungeonMinimap.clear = function() {
    this._visited = {};
    this._revealedRooms = {};
};

// ===============================
// MINIMAP SPRITE
// ===============================

(function() {

function Sprite_DungeonMinimap() {
    this.initialize.apply(this, arguments);
}

Sprite_DungeonMinimap.prototype = Object.create(Sprite.prototype);
Sprite_DungeonMinimap.prototype.constructor = Sprite_DungeonMinimap;

Sprite_DungeonMinimap.prototype.initialize = function() {
    Sprite.prototype.initialize.call(this);
    this.bitmap = new Bitmap(Graphics.width, Graphics.height);
    this.scaleFactor = 10;
    this.x = 10;
    this.y = 10;
    this.z = 9999;
};

Sprite_DungeonMinimap.prototype.update = function() {
    Sprite.prototype.update.call(this);

    this.bitmap.clear();

    var generator = $gameMap.mapGenerator && $gameMap.mapGenerator();
    if (!generator) return;
    if (!generator._rooms) return;

    // Automatically visit player tile
    DungeonMinimap.visit($gamePlayer.x, $gamePlayer.y);

    this.drawRooms(generator);
    this.drawPasses(generator);
    this.drawPlayer();
};

// ===============================
// DRAW ROOMS (fully revealed)
// ===============================

Sprite_DungeonMinimap.prototype.drawRooms = function(generator) {
    var rooms = generator._rooms;
    var s = this.scaleFactor;

    for (var i = 0; i < rooms.length; i++) {
        if (!DungeonMinimap.isRoomRevealed(i)) continue;

        var r = rooms[i];

        for (var x = r.x; x < r.x + r.w; x++) {
            for (var y = r.y; y < r.y + r.h; y++) {
                this.drawTileWalls(x, y, s);
            }
        }
    }
};

// ===============================
// DRAW PASSES (visited only)
// ===============================

Sprite_DungeonMinimap.prototype.drawPasses = function(generator) {
    var passes = generator._passes || [];
    var s = this.scaleFactor;

    for (var i = 0; i < passes.length; i++) {
        var p = passes[i];

        for (var x = p.x; x < p.x + p.w; x++) {
            for (var y = p.y; y < p.y + p.h; y++) {
                if (DungeonMinimap.isVisited(x, y)) {
                    this.drawTileWalls(x, y, s);
                }
            }
        }
    }
};

// ===============================
// SMART WALLS
// ===============================

Sprite_DungeonMinimap.prototype.drawTileWalls = function(x, y, s) {
    var ctx = this.bitmap._context;
    var px = x * s;
    var py = y * s;

    ctx.save();
    ctx.strokeStyle = "white";
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
};

// ===============================
// PLAYER DOT
// ===============================

Sprite_DungeonMinimap.prototype.drawPlayer = function() {
    var s = this.scaleFactor;
    var ctx = this.bitmap._context;

    var px = $gamePlayer.x * s + s / 2;
    var py = $gamePlayer.y * s + s / 2;

    ctx.save();
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(px, py, s / 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    this.bitmap._setDirty();
};

// Attach to scene
var _Scene_Map_createDisplayObjects =
    Scene_Map.prototype.createDisplayObjects;

Scene_Map.prototype.createDisplayObjects = function() {
    _Scene_Map_createDisplayObjects.call(this);
    this._dungeonMinimap = new Sprite_DungeonMinimap();
    this.addChild(this._dungeonMinimap);
};

})();