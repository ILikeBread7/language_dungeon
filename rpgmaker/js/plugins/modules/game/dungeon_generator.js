/**
 * @typedef {{
 *  width: number,
 *  height: number,
 *  minRooms: number,
 *  maxRooms: number,
 *  minRoomSize: number,
 *  maxRoomSize: number
 * }} DungeonOptions
 */

const SPACE = 'space';
const ROOM = 'room';
const PASS = 'pass';

class DungeonGenerator {

    /**
     * 
     * @param {DungeonOptions} options 
     */
    static generate(options) {
        const tiles = this._createEmptyDungeon(options);

        return {
            tiles,
            w: options.width,
            h: options.height
        };
    }

    /**
     * 
     * @param {DungeonOptions} options 
     */
    static _createEmptyDungeon(options) {
        const tiles = [];

        for (let i = 0; i < options.height; i++) {
            tiles[i] = Array(options.width).fill(SPACE);
        }

        return tiles;
    }

}