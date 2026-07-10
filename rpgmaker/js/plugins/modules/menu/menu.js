import { testMainMenu } from './components/main_menu.js';

export function testMenu() {
    console.log('menu test!!!');
    testMainMenu();
}

const _Scene_Menu_start = Scene_Menu.prototype.start;
Scene_Menu.prototype.start = function() {
    _Scene_Menu_start.call(this);
    console.log('start');
}

const _Scene_Menu_create = Scene_Menu.prototype.create;
Scene_Menu.prototype.create = function() {
    _Scene_Menu_create.call(this);
    console.log('create');
}

const _Scene_Menu_initialize = Scene_Menu.prototype.initialize;
Scene_Menu.prototype.initialize = function() {
    _Scene_Menu_initialize.call(this);
    console.log('initialize')
}