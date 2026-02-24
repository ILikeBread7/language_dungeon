//=============================================================================
// ILB_CustomMainMenuOption.js
//=============================================================================

/*:
 * @plugindesc Adds custom options to the main menu which run common events.
 * @author I_LIKE_BREAD7
 * @version 1.1.0
 *
 * @param Options List
 * @desc Comma-separated list of option settings in arrays: [commonEvent1Id,"Option name 1",visiableSwitch1Id,enabledSwitch1Id],[commonEvent2Id,"Option name 2",visiableSwitch2Id,enabledSwitch2Id],...
 * @default [1,"Custom Option 1",1,3],[2,"Custom Option 2",2,4]
 *
 * @help
 * This plugin allows you to add multiple custom options to the main menu of your game.
 * You can specify a common event to be executed for each option, and control the
 * visibility of each option using a switch.
 * If you want the option to be always visible use 0 for the switchId
 * 
 * The format for the options list is as follows
 * [ - beginning of option data
 * commonEventId,
 * "Option name", - has to be in quotes
 * visiableSwitchId, - optional, empty or 0 if always visible
 * enabledSwitchId, - optional, empty or 0 if always enabled
 * ] - end of option data
 * , - comma if you want to add another option
 * for example:
 * [1,"Custom Option 1",1,3],[2,"Custom Option 2",2,4]
 */

(() => {

    const parameters = PluginManager.parameters('ILB_CustomMainMenuOption');
    const optionsList = JSON.parse('[' + parameters['Options List'] + ']');

    // Add custom menu commands
    const _Window_MenuCommand_addOriginalCommands = Window_MenuCommand.prototype.addOriginalCommands;
    Window_MenuCommand.prototype.addOriginalCommands = function() {
        _Window_MenuCommand_addOriginalCommands.call(this);
        for (let i = 0; i < optionsList.length; i++) {
            const option = optionsList[i];
            const optionText = String(option[1]);
            const visibleSwitchId = Number(optionsList[i][2]);
            const enabledSwitchId = Number(optionsList[i][3]);
            if (!visibleSwitchId || $gameSwitches.value(visibleSwitchId)) {
                const enabled = !enabledSwitchId || $gameSwitches.value(enabledSwitchId);
                this.addCommand(optionText, 'customOption_' + i, enabled);
            }
        }
    };

    // Execute common event when custom option is selected
    const _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
    Scene_Menu.prototype.createCommandWindow = function() {
        _Scene_Menu_createCommandWindow.call(this);
        for (let i = 0; i < optionsList.length; i++) {
            const option = optionsList[i];
            const commonEventId = Number(option[0]);
            this._commandWindow.setHandler('customOption_' + i, this.commandCustomOption.bind(this, commonEventId));
        }
    };

    Scene_Menu.prototype.commandCustomOption = function(commonEventId) {
        $gameTemp.reserveCommonEvent(commonEventId);
        this._commandWindow.callHandler('cancel');
    };

})();
