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

/**
 * @typedef {{
 *  top: [DungeonSection],
 *  bottom: [DungeonSection],
 *  left: [DungeonSection],
 *  right: [DungeonSection]
 * }} BlockAdjacency
 */

/**
 * @typedef {{
 *  start: { x: number, y: number },
 *  end: { x: number, y: number },
 *  step: { dx: number, dy: number }
 * }} DungeonRoad
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
 * @typedef {Enum<BLOCK_ADJACENCY>} BlockAdjacencyEnum
 */

class DungeonGenerator {

    static BLOCK_PADDING = 3;
    static TOTAL_BLOCK_PADDING = this.BLOCK_PADDING * 2;

    /**
     * 
     * @param {DungeonOptions} options 
     */
    static generate(options) {
        const tiles = this._createEmptyDungeon(options);
        const numOfBlocks = Math.floor(Math.random() * (options.maxRooms - options.minRooms)) + options.minRooms;
        const minBlockSize = options.minRoomSize + this.TOTAL_BLOCK_PADDING;
        const blocks = this._createBlocks(tiles, options, numOfBlocks, minBlockSize);
        const blockAdjacencyMap = this._createBlockAdjacencyMap(blocks);
        const blockConnections = this._createBlockConnections(blockAdjacencyMap);
        const rooms = this._createRooms(blocks, options);
        const roads = this._createRoads(blocks, rooms, blockConnections);
        
        this._applyRoomsToTiles(rooms, tiles);
        this._applyRoadsToTiles(roads, tiles);

        return {
            // for debuggins only
            blockConnections,

            blocks,
            rooms,
            roads,
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
        return Math.floor(block.w * splitRatio) - this.TOTAL_BLOCK_PADDING >= minBlockSize;
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
        return Math.floor(block.h * splitRatio) - this.TOTAL_BLOCK_PADDING >= minBlockSize;
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
     * @returns {BlockAdjacencyEnum} Adjacency of the second block relative to the first one
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

    /**
     * 
     * @param {[DungeonSection]} blocks
     * @param {DungeonOptions} options  
     */
    static _createRooms(blocks, options) {
        return blocks.map(block => {
            const maxWidth = Math.min(options.maxRoomSize, block.w - this.TOTAL_BLOCK_PADDING);
            const maxHeight = Math.min(options.maxRoomSize, block.h - this.TOTAL_BLOCK_PADDING);
            const width = this._randomInRange(options.minRoomSize, maxWidth);
            const height = this._randomInRange(options.minRoomSize, maxHeight);

            const maxX = block.w - width - this.BLOCK_PADDING;
            const roomX = this._randomInRange(this.BLOCK_PADDING, maxX);
            const maxY = block.h - height - this.BLOCK_PADDING;
            const roomY = this._randomInRange(this.BLOCK_PADDING, maxY);

            return {
                x: roomX + block.x,
                y: roomY + block.y,
                w: width,
                h: height
            };
        });
    }

    /**
     * 
     * @param {number} rangeStart 
     * @param {number} rangeEnd 
     */
    static _randomInRange(rangeStart, rangeEnd) {
        return Math.floor(Math.random() * (rangeEnd - rangeStart)) + rangeStart;
    }

    /**
     * 
     * @param {[DungeonSection]} rooms 
     * @param {DungeonTiles} tiles 
     */
    static _applyRoomsToTiles(rooms, tiles) {
        for (const room of rooms) {
            for (let y = room.y; y < room.y + room.h; y++) {
                for (let x = room.x; x < room.x + room.w; x++) {
                    tiles[y][x] = ROOM;
                }
            }
        }
    }

    /**
     * 
     * @param {Map<DungeonSection, BlockAdjacency>} blockAdjacencyMap 
     */
    static _createBlockConnections(blockAdjacencyMap) {
        const blocks = [...blockAdjacencyMap.keys()];
        const blockToIndexMap = new Map(blocks.map((block, index) => [ block, index ]));
        const sections = blocks.map(block => [ block ]);

        /** @type {Map<DungeonSection, [DungeonSection]>} */
        const blockToSectionMap = new Map();
        for (let i = 0; i < blocks.length; i++) {
            blockToSectionMap.set(blocks[i], sections[i]);
        }

        const blockConnections = [];

        while (sections.length > 1) {
            const randomSectionIndex = this._randomIndex(sections);
            const section = sections[randomSectionIndex];
            const randomBlockIndex = this._randomIndex(section);
            const block = section[randomBlockIndex];

            const adjacentBlocks = blockAdjacencyMap.get(block);
            const adjacentBlock = this._randomAdjacentBlock(block, adjacentBlocks, blockToSectionMap);
            if (!adjacentBlock) {
                continue;
            }
            const adjacentSection = blockToSectionMap.get(adjacentBlock);

            for (const block of section) {
                adjacentSection.push(block);
                blockToSectionMap.set(block, adjacentSection);
            }
            sections.splice(randomSectionIndex, 1);

            blockConnections.push(this._createBlockConnectionInfo(block, adjacentBlock, blockToIndexMap));
        }

        return blockConnections;
    }

    /**
     * 
     * @param {DungeonSection} block1 
     * @param {DungeonSection} block2 
     * @param {Map<DungeonSection, number>} blockToIndexMap 
     */
    static _createBlockConnectionInfo(block1, block2, blockToIndexMap) {
        const adjacencyType = this._checkBlocksAdjacency(block1, block2);
        const block1Index = blockToIndexMap.get(block1);
        const block2Index = blockToIndexMap.get(block2);

        switch (adjacencyType) {
            case BLOCK_ADJACENCY.TOP: return [ block1Index, block2Index, BLOCK_ADJACENCY.TOP ];
            case BLOCK_ADJACENCY.BOTTOM: return [ block2Index, block1Index, BLOCK_ADJACENCY.TOP ];
            case BLOCK_ADJACENCY.LEFT: return [ block1Index, block2Index, BLOCK_ADJACENCY.LEFT ];
            case BLOCK_ADJACENCY.RIGHT: return [ block2Index, block1Index, BLOCK_ADJACENCY.LEFT ];
            default: throw new Error('Adjacent blocks are not adjacent. This should never happen. All is lost. Goodbye.');
        }
    }

    /**
     * 
     * @param {[any]} array 
     */
    static _randomIndex(array) {
        return Math.floor(Math.random() * array.length);
    }

    /**
     * 
     * @param {[any]} array 
     */
    static _randomElement(array) {
        return array[this._randomIndex(array)];
    }

    /**
     * @param {DungeonSection} block 
     * @param {BlockAdjacency} blockAdjacency 
     * @param {Map<DungeonSection, [DungeonSection]>} blockToSectionMap 
     * @returns {DungeonSection|undefined}
     */
    static _randomAdjacentBlock(block, blockAdjacency, blockToSectionMap) {
        const section = blockToSectionMap.get(block);

        const allBlocks = [
            ...blockAdjacency.top,
            ...blockAdjacency.bottom,
            ...blockAdjacency.left,
            ...blockAdjacency.right
        ].filter(block => blockToSectionMap.get(block) !== section);

        return this._randomElement(allBlocks);
    }

    /**
     * 
     * @param {[DungeonSection]} blocks 
     * @param {[DungeonSection]} rooms 
     * @param {[[ number, number, BlockAdjacencyEnum ]]} blockConnections 
     */
    static _createRoads(blocks, rooms, blockConnections) {
        const roads = [];

        for (const connection of blockConnections) {
            const [ index1, index2, direction ] = connection;
            const block1 = blocks[index1];
            const room1 = rooms[index1];
            const block2 = blocks[index2];
            const room2 = rooms[index2];

            const newRoads = this._createRoadBetween(block1, room1, block2, room2, direction, roads);
            roads.push(...newRoads);
        }

        return roads;
    }

    /**
     * 
     * @param {DungeonSection} block1 
     * @param {DungeonRoad} room1 
     * @param {DungeonSection} block2 
     * @param {DungeonRoad} room2 
     * @param {BlockAdjacencyEnum} direction 
     * @param {[DungeonRoad]} roads Already generated roads
     * @returns {[DungeonRoad]}
     */
    static _createRoadBetween(block1, room1, block2, room2, direction, roads) {
        let road1 = this._createRoadTowardsBlockEdge(block1, room1, direction);
        let road2 = this._createRoadTowardsBlockEdge(block2, room2, this._getOppositeDirection(direction));
        
        const closeRoad1 = this._findCloseRoad(road1, roads);
        if (closeRoad1) {
            road1 = undefined;
        }
        const closeRoad2 = this._findCloseRoad(road2, roads);
        if (closeRoad2) {
            road2 = undefined;
        }

        const connectingRoad = this._createConnectingRoad(road1 || closeRoad1, road2 || closeRoad2);
        
        return [
            road1,
            connectingRoad,
            road2
        ].filter(Boolean);
    }

    /**
     * 
     * @param {DungeonRoad} road 
     * @param {[DungeonRoad]} roads 
     */
    static _findCloseRoad(road, roads) {
        return roads.find(existingRoad => isCloseRoad(road, existingRoad));

        /**
         * 
         * @param {DungeonRoad} road1 
         * @param {DungeonRoad} road2 
         */
        function isCloseRoad(road1, road2) {
            const tolerance = 2;
            return comparePoints(road1.start, road2.start, tolerance);
        }

        /**
         * 
         * @param {{ x: number, y: number }} point1 
         * @param {{ x: number, y: number }} point2 
         * @param {number} [tolerance=0] Default 0
         */
        function comparePoints(point1, point2, tolerance = 0) {
            const xDist = Math.abs(point1.x - point2.x);
            const yDist = Math.abs(point1.y - point2.y);

            return xDist <= tolerance && yDist === 0
                || yDist <= tolerance && xDist === 0;
        }
    }

    /**
     * 
     * @param {DungeonSection} block 
     * @param {DungeonRoad} room 
     * @param {BlockAdjacencyEnum} direction 
     * @returns {DungeonRoad}
     */
    static _createRoadTowardsBlockEdge(block, room, direction) {
        let startX, endX, startY, endY;

        if (direction === BLOCK_ADJACENCY.TOP || direction === BLOCK_ADJACENCY.BOTTOM) {
            startX = this._randomInRange(room.x + 1, room.x + room.w - 1);
        } else if (direction === BLOCK_ADJACENCY.LEFT) {
            startX = room.x - 1;
        } else {
            startX = room.x + room.w;
        }

        if (direction === BLOCK_ADJACENCY.LEFT || direction === BLOCK_ADJACENCY.RIGHT) {
            startY = this._randomInRange(room.y + 1, room.y + room.h - 1);
        } else if (direction === BLOCK_ADJACENCY.TOP) {
            startY = room.y - 1;
        } else {
            startY = room.y + room.h;
        }

        endX = startX;
        endY = startY;

        switch (direction) {
            case BLOCK_ADJACENCY.TOP:
                endY = block.y;
            break;
            case BLOCK_ADJACENCY.BOTTOM:
                endY = block.y + block.h;
            break;
            case BLOCK_ADJACENCY.LEFT:
                endX = block.x;
            break;
            case BLOCK_ADJACENCY.RIGHT:
                endX = block.x + block.w;
            break;
        }

        const step = this._getDirectionStep(direction);
        if (step.dx < 0 || step.dy < 0) {
            step.dx = -step.dx;
            step.dy = -step.dy;
            [ startX, startY, endX, endY ] = [ endX, endY, startX, startY ];
        }

        return {
            start: { x: startX, y: startY },
            end: { x: endX, y: endY },
            step
        };
    }

    /**
     * 
     * @param {BlockAdjacencyEnum} direction 
     */
    static _getDirectionStep(direction) {
        switch (direction) {
            case BLOCK_ADJACENCY.TOP: return { dx: 0, dy: -1 };
            case BLOCK_ADJACENCY.LEFT: return { dx: -1, dy: 0 };
            case BLOCK_ADJACENCY.BOTTOM: return { dx: 0, dy: 1 };
            case BLOCK_ADJACENCY.RIGHT: return { dx: 1, dy: 0 };
            default: throw Error('Incorrect direction');
        }
    }

    /**
     * 
     * @param {BlockAdjacencyEnum} direction 
     */
    static _getOppositeDirection(direction) {
        return 10 - direction;
    }

    /**
     * 
     * @param {DungeonRoad} road1 
     * @param {DungeonRoad} road2 
     * @returns {DungeonRoad}
     */
    static _createConnectingRoad(road1, road2) {
        let start = {}, end = {};
        
        const road1X = new Set([ road1.start.x, road1.end.x ]);
        const road2X = new Set([ road2.start.x, road2.end.x ]);
        const roadsXIntersection = road1X.intersection(road2X);

        if (roadsXIntersection.size > 0) {
            start.x = end.x = roadsXIntersection.values().next().value;
        } else {
            start.x = road1.end.x;
            end.x = road2.start.x;
        }

        const road1Y = new Set([ road1.start.y, road1.end.y ]);
        const road2Y = new Set([ road2.start.y, road2.end.y ]);
        const roadsYIntersection = road1Y.intersection(road2Y);
        
        if (roadsYIntersection.size > 0) {
            start.y = end.y = roadsYIntersection.values().next().value;
        } else {
            start.y = road1.end.y;
            end.y = road2.start.y;
        }

        const step = {
            dx: Math.sign(end.x - start.x),
            dy: Math.sign(end.y - start.y)
        };

        if (step.dx === 0  && step.dy === 0) {
            return undefined;
        }

        return { start, end, step };
    }


    /**
     * 
     * @param {[DungeonRoad]} roads 
     * @param {DungeonTiles} tiles 
     */
    static _applyRoadsToTiles(roads, tiles) {
        for (const road of roads) {
            const { start, end, step } = road;

            for (
                let { x, y } = start;
                x !== end.x || y !== end.y;
                (x += step.dx), (y += step.dy)
            ) {
                tiles[y][x] = PASS;
            }
            tiles[end.y][end.x] = PASS;
        }
    }

}