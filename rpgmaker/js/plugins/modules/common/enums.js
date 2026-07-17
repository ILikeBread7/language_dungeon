export const OPEN_STATE = /** @type {const} */ Object.freeze({
    OPENING: 1,
    OPEN: 2,
    CLOSING: 3,
    CLOSED: 4,
});
/**
 * @typedef { Enum<OPEN_STATE> } OpenState
 */

export const VISIBILITY_STATE = /** @type {const} */ Object.freeze({
    HIDDEN: 'hidden',
    SHOWN: 'shown'
});
/**
 * @typedef { Enum<VISIBILITY_STATE> } VisibilityState
 */