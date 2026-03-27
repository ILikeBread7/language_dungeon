//=============================================================================
// ILB_NamedVariables.js
//=============================================================================

/*:
 * @plugindesc Exposes global objects $nv $ns $nce for named variables, switches and common events respectively
 *
 * @author I_LIKE_BREAD7
 *
 * @help
 * This plugin allows you to use game variables and switches in scripts using their names.
 * Example: $nv.testVariable instead of $gameVariables.value(1)
 */

const $nv = {};
const $ns = {};
const $nce = {};

(() => {

    const DEFAULT_VALUE_SPLIT_CHAR = ':';
    const defaultVariableValues = [];
    const defaultSwitchValues = [];

    fetch('../data/System.json')
        .then(response => response.json())
        .then(system => {
            system.variables.forEach((name, index) => {
                if (!name) {
                    return;
                }

                const split = splitOnce(name, DEFAULT_VALUE_SPLIT_CHAR);
                name = split[0].trim();
                const defaultValue = split[1];

                if ($nv.hasOwnProperty(name)) {
                    return;
                }
                if (defaultValue !== undefined) {
                    defaultVariableValues[index] = defaultValue.trim();
                }

                Object.defineProperty($nv, name, {
                    get() {
                        return $gameVariables.value(index);
                    },
                    set(value) {
                        $gameVariables.setValue(index, value);
                    }
                });
            });

            system.switches.forEach((name, index) => {
                if (!name) {
                    return;
                }

                const split = splitOnce(name, DEFAULT_VALUE_SPLIT_CHAR);
                name = split[0].trim();
                const defaultValue = split[1];

                if ($ns.hasOwnProperty(name)) {
                    return;
                }
                if (defaultValue !== undefined) {
                    defaultSwitchValues[index] = JSON.parse(defaultValue);
                }

                Object.defineProperty($ns, name, {
                    get() {
                        return $gameSwitches.value(index);
                    },
                    set(value) {
                        $gameSwitches.setValue(index, value);
                    }
                });
            });
        });

    fetch('../data/CommonEvents.json')
        .then(response => response.json())
        .then(commonEvents => {
            commonEvents.forEach(commonEvent => {
                const { name, id } = commonEvent || {};
                if (!name || $nce.hasOwnProperty(name)) {
                    return;
                }

                Object.defineProperty($nce, name, {
                    get() {
                        return id;
                    }
                });
            });
        });

    Game_Variables.prototype.value = function(variableId) {
        const value = this._data[variableId];
        if (value === undefined) {
            const defaultValueString = defaultVariableValues[variableId];
            if (defaultValueString) {
                const defaultValue = JSON.parse(defaultValueString);
                this._data[variableId] = defaultValue;
                return defaultValue;
            }
        }
        return value || 0;
    };

    Game_Variables.prototype.setValue = function(variableId, value) {
        if (variableId > 0 && variableId < $dataSystem.variables.length) {
            this._data[variableId] = value;
            this.onChange();
        }
    };

    Game_Switches.prototype.value = function(switchId) {
        const value = this._data[switchId];
        if (value === undefined) {
            const defaultValue = defaultSwitchValues[switchId];
            if (defaultValue !== undefined) {
                return this._data[switchId] = !!defaultValue;
            }
        }
        return !!value;
    };

    const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
    Window_Base.prototype.convertEscapeCharacters = function(text) {
        text = _Window_Base_convertEscapeCharacters.call(this, text);
        return text.replace(
            /\x1bNV\[([a-z\d_.]+)\]/gi,
            (_, capture) => capture.split('.').reduce((obj, prop) => obj[prop], $nv)
        ).replace(
            /\x1bEV\[(.+?)\]/gi,
            (_, capture) => eval(capture)
        );
    }

    function splitOnce(string, splitChar) {
        const index = string.indexOf(splitChar);
        if (index < 0) {
            return [ string ];
        }

        return [ string.substring(0, index), string.substring(index + 1, string.length) ];
    }

})();