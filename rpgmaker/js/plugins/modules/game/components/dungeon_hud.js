import { BaseComponent } from '../../common/components/base_component.js';

/**
 * @typedef { { floor?: number, hp?: number, maxHp?: number } } DungeonHudValues
 */

const FLOOR_CSS_CLASS = 'floor';
const HP_NUMBER_CSS_CLASS = 'hp-number';
const HP_BAR_CSS_CLASS = 'hp-bar';
const HP_VALUE_CSS_CLASS = 'hp-value';
const HP_BAR_HP_CSS_VAR = '--hp';
const HP_BAR_MAX_HP_CSS_VAR = '--max-hp';

export class DungeonHudComponent extends BaseComponent {

    static get componentDefaultTagName() {
        return 'dungeon-hud-component';
    }

    get componentCssStyle() {
        return /*css*/`
            ${this.componentTagName} {
                & *:not(style) {
                    display: inline-block;
                    vertical-align: top;
                }

                & >:not(last-child) {
                    margin-right: 1em;
                }

                & .${HP_VALUE_CSS_CLASS} {
                    min-width: 3ch;
                    text-align: right;
                }

                & .${HP_BAR_CSS_CLASS} {
                    position: relative;
                    width: 10em;
                    height: 1lh;
                    background: black;

                    &::before {
                        content: '';
                        position: absolute;
                        background: green;
                        --hp-proportion: calc(var(${HP_BAR_HP_CSS_VAR}) / var(${HP_BAR_MAX_HP_CSS_VAR}));
                        width: calc(100% * var(--hp-proportion));
                        height: 100%;
                    }
                }
            }
        `;
    }

    constructor() {
        super();

        this._floor = document.createElement('span');
        this._floor.classList.add(FLOOR_CSS_CLASS);

        this._hpNumber = document.createElement('span');
        this._hpNumber.classList.add(HP_NUMBER_CSS_CLASS);

        this._hpBar = document.createElement('div');
        this._hpBar.classList.add(HP_BAR_CSS_CLASS);

        /** @type {DungeonHudValues} */
        this._values = {};


        this.append(
            this._floor,
            this._hpNumber,
            this._hpBar
        );
    }

    /**
     * 
     * @param {DungeonHudValues} values 
     */
    dungeonHudComponentSetValues(values) {
        if (values.floor !== undefined) {
            this._floor.innerHTML = `F${values.floor}`;
        }

        const hpSet = values.hp !== undefined;
        const maxHpSet = values.maxHp !== undefined;
        if (hpSet) {
            this._values.hp = values.hp;
            this._hpBar.style.setProperty(HP_BAR_HP_CSS_VAR, values.hp);
        }
        if (maxHpSet) {
            this._values.maxHp = values.maxHp;
            this._hpBar.style.setProperty(HP_BAR_MAX_HP_CSS_VAR, values.maxHp);
        }
        if (hpSet || maxHpSet) {
            this._hpNumber.innerHTML = /*html*/`<span class="${HP_VALUE_CSS_CLASS}">${this._values.hp}</span>/<span class="${HP_VALUE_CSS_CLASS}">${this._values.maxHp}</span>`;
        }
    }

}