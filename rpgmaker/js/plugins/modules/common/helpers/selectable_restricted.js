/**
 * @typedef {import('./selectable_interface.js').SelectableInterface} SelectableInterface
 */

import { BaseComponent } from '../components/base_component.js';

/**
 * @template {SelectableInterface} T
 * @param {T} baseClass 
 * @param {T?} restrictions 
 * @returns {SelectableInterface}
 */
export function selectableRestricted(baseClass, restrictions) {
    return class SelectableRestricted extends baseClass {
        
        constructor(component) {
            super(component);
            Object.assign(this, restrictions);
        }

    }
}

/**
 * @template {SelectableInterface} T
 * @template {BaseComponent} V
 * @param {T} baseClass 
 * @param {V} component
 * @returns {SelectableInterface}
 */
export function selectableNonCancellable(baseClass, component) {
    return new (selectableRestricted(baseClass, { cancel: () => {} }))(component);
}