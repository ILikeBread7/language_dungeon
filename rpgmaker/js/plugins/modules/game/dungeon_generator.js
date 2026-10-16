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
const BLOCK_ADJACENCY = /** @type {const} */ Object.freeze({
    NONE: 0,
    TOP: 8,
    BOTTOM: 2,
    LEFT: 4,
    RIGHT: 6
});
/**
 * @typedef {Enum<BLOCK_ADJACENCY>} BlockAdjacency
 */

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

        const blockAdjacency = this._createBlockAdjacencyMap(blocks);

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

    /**
     * 
     * @param {[DungeonSection]} blocks 
     */
    static _createBlockAdjacencyMap(blocks) {
        const map = new Map();
        const emptyEntryFunction = () => ({
            top: [],
            bottom: [],
            left: [],
            right: []
        });

        for (let i = 0; i < blocks.length; i++) {
            for (let j = i + 1; j < blocks.length; j++) {
                const block1 = blocks[i];
                const block2 = blocks[j];
                const block1Adjacency = map.getOrInsertComputed(block1, emptyEntryFunction);
                const block2Adjacency = map.getOrInsertComputed(block2, emptyEntryFunction);
                const adjacency = this._checkBlocksAdjacency(block1, block2);
                
                switch(adjacency) {
                    case BLOCK_ADJACENCY.TOP:
                        block1Adjacency.top.push(block2);
                        block2Adjacency.bottom.push(block1);
                    break;
                    case BLOCK_ADJACENCY.BOTTOM:
                        block1Adjacency.bottom.push(block2);
                        block2Adjacency.top.push(block1);
                    break;
                    case BLOCK_ADJACENCY.LEFT:
                        block1Adjacency.left.push(block2);
                        block2Adjacency.right.push(block1);
                    break;
                    case BLOCK_ADJACENCY.RIGHT:
                        block1Adjacency.right.push(block2);
                        block2Adjacency.left.push(block1);
                    break;
                    default: // No adjacency, nothing to do
                }
            }
        }

        return map;
    }

    /**
     * 
     * @param {DungeonSection} block1 
     * @param {DungeonSection} block2 
     * @returns {BlockAdjacency} Adjacency of the second block relative to the first one
     */
    static _checkBlocksAdjacency(block1, block2) {
        const isAlignedHorizontally = block1.x + block1.w >= block2.x && block1.x <= block2.x + block2.w;
        if (block1.y === block2.y + block2.h && isAlignedHorizontally) {
            return BLOCK_ADJACENCY.TOP;
        }
        if (block1.y + block1.h === block2.y && isAlignedHorizontally) {
            return BLOCK_ADJACENCY.BOTTOM;
        }
        
        const isAlignedVertically = block1.y + block1.h >= block2.y && block1.y <= block2.y + block2.h;
        if (block1.x === block2.x + block2.w && isAlignedVertically) {
            return BLOCK_ADJACENCY.LEFT;
        }
        if (block1.x + block1.w === block2.x && isAlignedVertically) {
            return BLOCK_ADJACENCY.RIGHT;
        }

        return BLOCK_ADJACENCY.NONE;
    }

}