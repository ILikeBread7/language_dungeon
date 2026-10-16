/**
 * @typedef {{
 *  width: number,
 *  height: number,
 *  mapWidth: number,
 *  mapHeight: number,
 *  minRooms: number,
 *  maxRooms: number,
 *  minRoomSize: number,
 *  maxRoomSize: number
 * }} DungeonOptions
 */

/**
 * @typedef {[[string]]} DungeonTiles
 */

/**
 * @typedef {{ x: number, y: number, w: number, h: number }} DungeonSection
 */

const SPACE = 'space';
const ROOM = 'room';
const PASS = 'pass';

class DungeonGenerator {

    static BLOCK_PADDING = 5;

    /**
     * 
     * @param {DungeonOptions} options 
     */
    static generate(options) {
        const tiles = this._createEmptyDungeon(options);
        const numOfBlocks = Math.floor(Math.random() * (options.maxRooms - options.minRooms)) + options.minRooms;
        const minBlockSize = options.minRoomSize + this.BLOCK_PADDING;
        const blocks = this._createBlocks(tiles, options, numOfBlocks, minBlockSize);

        return {
            tiles,
            w: options.mapWidth,
            h: options.mapHeight
        };
    }

    /**
     * 
     * @param {DungeonOptions} options 
     */
    static _createEmptyDungeon(options) {
        const tiles = [];

        for (let i = 0; i < options.mapHeight; i++) {
            tiles[i] = Array(options.mapWidth).fill(SPACE);
        }

        return tiles;
    }

    /**
     * 
     * @param {DungeonTiles} tiles 
     * @param {DungeonOptions} options 
     * @param {number} numOfBlocks 
     * @param {number} minBlockSize 
     */
    static _createBlocks(tiles, options, numOfBlocks, minBlockSize) {
        let blocks = [{
            x: Math.floor((options.mapWidth - options.width) / 2),
            y: Math.floor((options.mapHeight - options.height) / 2),
            w: options.width,
            h: options.height
        }];

        // Start at 1 because we already start with a block
        for (let i = 1; i < numOfBlocks; i++) {
            const blockToSplit = this._findRandomSplittableBlock(blocks, minBlockSize);
            if (!blockToSplit) {
                break;
            }

            const newBlocks = this._splitBlock(blockToSplit, minBlockSize);
            
            blocks = [
                ...blocks.filter(block => block !== blockToSplit),
                ...newBlocks
            ];
        }

        return blocks;
    }

    /**
     * 
     * @param {[DungeonSection]} blocks 
     * @param {number} minBlockSize 
     * @returns 
     */
    static _findRandomSplittableBlock(blocks, minBlockSize) {
        const splittableBlocks = blocks.filter(block => this._canSplit(block, minBlockSize));

        if (splittableBlocks.length === 0) {
            return null;
        }

        const randomIndex = Math.floor(Math.random() * splittableBlocks.length);
        return splittableBlocks[randomIndex];
    }

    /**
     * 
     * @param {DungeonSection} block 
     * @param {number} minBlockSize 
     */
    static _splitBlock(block, minBlockSize) {
        const canSplitHorizontally = this._canSplitHorizontally(block, minBlockSize);
        const canSplitVertically = this._canSplitVertically(block, minBlockSize);

        if (canSplitHorizontally && canSplitVertically) {
            if (Math.random() < 0.5) {
                return this._splitHorizontally(block, minBlockSize);
            } else {
                return this._splitVertically(block, minBlockSize);
            }
        }

        if (canSplitHorizontally) {
            return this._splitHorizontally(block, minBlockSize);
        }

        if (canSplitVertically) {
            return this._splitVertically(block, minBlockSize);
        }

        return [ block ];
    }

    /**
     * 
     * @param {DungeonSection} block 
     * @param {number} minBlockSize 
     */
    static _splitHorizontally(block, minBlockSize) {
        const splitRatio = this._findSplitRatio(block, minBlockSize, this._canSplitHorizontally.bind(this));
        const splitPoint = Math.floor(block.w * splitRatio);
        
        return [
            { x: block.x, y: block.y, w: splitPoint, h: block.h },
            { x: block.x + splitPoint, y: block.y, w: block.w - splitPoint, h: block.h }
        ];
    }

    /**
     * 
     * @param {DungeonSection} block 
     * @param {number} minBlockSize 
     */
    static _splitVertically(block, minBlockSize) {
        const splitRatio = this._findSplitRatio(block, minBlockSize, this._canSplitVertically.bind(this));
        const splitPoint = Math.floor(block.h * splitRatio);
        
        return [
            { x: block.x, y: block.y, w: block.w, h: splitPoint },
            { x: block.x, y: block.y + splitPoint, w: block.w, h: block.h - splitPoint }
        ];
    }

    /**
     * 
     * @param {DungeonSection} block 
     * @param {number} minBlockSize 
     */
    static _canSplit(block, minBlockSize) {
        return this._canSplitHorizontally(block, minBlockSize) || this._canSplitVertically(block, minBlockSize);
    }

    /**
     * 
     * @param {DungeonSection} block 
     * @param {number} minBlockSize 
     * @param {number} [splitRatio=2] 
     */
    static _canSplitHorizontally(block, minBlockSize, splitRatio = 0.5) {
        if (splitRatio > 0.5) {
            splitRatio = 1 - splitRatio;
        }
        return Math.floor(block.w * splitRatio) - this.BLOCK_PADDING >= minBlockSize;
    }

    /**
     * 
     * @param {DungeonSection} block 
     * @param {number} minBlockSize 
     * @param {number} [splitRatio=2] 
     */
    static _canSplitVertically(block, minBlockSize, splitRatio = 0.5) {
        if (splitRatio > 0.5) {
            splitRatio = 1 - splitRatio;
        }
        return Math.floor(block.h * splitRatio) - this.BLOCK_PADDING >= minBlockSize;
    }

    /**
     * 
     * @param {DungeonSection} block 
     * @param {number} minBlockSize 
     * @param {(block: DungeonSection, minBlockSize: number, splitRatio: number) => boolean} canSplitFunction 
     */
    static _findSplitRatio(block, minBlockSize, canSplitFunction) {
        const randomRatio = Math.random();
        if (canSplitFunction(block, minBlockSize, randomRatio)) {
            return randomRatio;
        }
        return 0.5;
    }

}