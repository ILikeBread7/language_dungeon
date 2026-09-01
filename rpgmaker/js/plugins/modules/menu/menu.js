import { ScrollableListComponent } from '../common/components/scrollable_list_component.js';
import { HideableOpenable } from '../common/helpers/hideable_openable.js';
import { takeAreYouSure } from '../message/components/utils.js';
import { ARE_YOU_SURE_IDS, AreYouSureComponent } from './components/are_you_sure.js';
import { ITEMS_MENU_EVENTS, ItemsMenuComponent } from './components/items_menu.js';
import { MainMenuComponent } from './components/main_menu.js';
import { OptionsMenuComponent } from './components/options_menu.js';

/**
 * @type {HideableOpenable<MainMenuComponent>}
 */
let mainMenu;

/**
 * @type {HideableOpenable<AreYouSureComponent>}
 */
let gameEnd;

/**
 * @type {HideableOpenable<OptionsMenuComponent>}
 */
let optionsMenu;

/**
 * @type {HideableOpenable<ItemsMenuComponent>}
 */
let itemsMenu;

const SCENE_ITEM_TYPES = Object.freeze({
    ITEMS: 1,
    FLOOR: 2
});
let sceneItemType = SCENE_ITEM_TYPES.ITEMS;

/**
 * @type {import('../message/components/choices_list.js').ChoicesListComponent}
 */
let choicesList;

/**
 * @type {HTMLElement}
 */
let menuContainer;

/**
 * @type {Object<string,import('./components/main_menu.js').MainMenuOption>}
 */
const MAIN_MENU_CHOICES = /** @type {const} */ Object.freeze({
    ITEMS: { text: 'Items', explanation: 'Use and manage items' },
    FLOOR: {
        text: 'Floor',
        explanation: 'Pick up items from the floor',
        isEnabled() {
            const f = window.$f;
            return f.isFloorItem();
        }
    },
    OPTIONS: { text: 'Options', explanation: "Adjust the game's settings" },
    SAVE: { text: 'Save', explanation: 'Save your progress' },
    BACK: { text: 'Go back', explanation: 'Close this menu, and return to the game' },
    EXIT: { text: 'Exit', explanation: 'Exit the game, and return to the title screen' }
});
Object.values(MAIN_MENU_CHOICES).forEach((choice, index) => choice.id = index + 1);

const configManager = window.ConfigManager;
const step = 10;
const mod = 100 + step;
const OPTIONS_MENU_CHOICES = [
    {
        text: 'Always Dash',
        explanation: 'Make the character always run, without holding the run button.',
        get value() { return mapToOnOff(configManager.alwaysDash); },
        setValue() {
            configManager.alwaysDash = !configManager.alwaysDash;
        }
    },
    {
        text: 'BGM Volume',
        explanation: 'Volume of the background music.',
        get value() { return mapToPercentage(configManager.bgmVolume) },
        setNextValue() {
            configManager.bgmVolume = (configManager.bgmVolume + step + mod) % mod;
        },
        setPreviousValue() {
            configManager.bgmVolume = (configManager.bgmVolume - step + mod) % mod;
        }
    },
    {
        text: 'BGS Volume',
        explanation: 'Volume of the background sounds.',
        get value() { return mapToPercentage(configManager.bgsVolume); },
        setNextValue() {
            configManager.bgsVolume = (configManager.bgsVolume + step + mod) % mod;
        },
        setPreviousValue() {
            configManager.bgsVolume = (configManager.bgsVolume - step + mod) % mod;
        }
    },
    {
        text: 'ME Volume',
        explanation: 'Volume of the musical effects.',
        get value() { return mapToPercentage(configManager.meVolume); },
        setNextValue() {
            configManager.meVolume = (configManager.meVolume + step + mod) % mod;
        },
        setPreviousValue() {
            configManager.meVolume = (configManager.meVolume - step + mod) % mod;
        }
    },
    {
        text: 'SE Volume',
        explanation: 'Volume of the sound effects.',
        get value() { return mapToPercentage(configManager.seVolume); },
        setNextValue() {
            configManager.seVolume = (configManager.seVolume + step + mod) % mod;
        },
        setPreviousValue() {
            configManager.seVolume = (configManager.seVolume - step + mod ) % mod;
        }
    },
    {
        text: 'Go back',
        explanation: 'Save changes, and go back to the game.',
        goBack: true
    }
];

/**
 * 
 * @param {HTMLElement} [container] 
 */
export function initializeMainMenu(container = document.body) {
    menuContainer = container;
    MainMenuComponent.register();
    mainMenu = new HideableOpenable(new MainMenuComponent());
    mainMenu.element.mainMenuSetOptions(Object.values(MAIN_MENU_CHOICES));

    AreYouSureComponent.register();
    gameEnd = new HideableOpenable(new AreYouSureComponent());
    gameEnd.topElement.classList.add('vertical-center');

    OptionsMenuComponent.register();
    optionsMenu = new HideableOpenable(new OptionsMenuComponent());
    optionsMenu.topElement.classList.add('vertical-center');

    ItemsMenuComponent.register();
    itemsMenu = new HideableOpenable(new ItemsMenuComponent());
    createItemsMenuEventListeners();

    container.append(
        mainMenu.topElement,
        gameEnd.topElement,
        optionsMenu.topElement,
        itemsMenu.topElement
    );
}

Scene_Menu.prototype.start = function() {
    Scene_MenuBase.prototype.start.call(this);
    const gameTemp = window.$gameTemp;
    const f = window.$f;
    choicesList = mainMenu.element.choicesList;

    addMenuBackdrop();
    mainMenu.showAndOpen();
    mainMenu.element.mainMenuTakeChoice().then(choice => {
        mainMenu.closeAndHide();

        if (choice.cancelled || choice.id === MAIN_MENU_CHOICES.BACK.id) {
            this.popScene();
            removeMenuBackdrop();
            return;
        }
        
        switch(choice.id) {
            case MAIN_MENU_CHOICES.EXIT.id:
                SceneManager.push(Scene_GameEnd);
            break;
            case MAIN_MENU_CHOICES.ITEMS.id:
                sceneItemType = SCENE_ITEM_TYPES.ITEMS;
                SceneManager.push(Scene_Item);
            break;
            case MAIN_MENU_CHOICES.FLOOR.id:
                showFloor();
            break;
            case MAIN_MENU_CHOICES.OPTIONS.id:
                SceneManager.push(Scene_Options);
            break;
            case MAIN_MENU_CHOICES.SAVE.id:
                SceneManager.push(Scene_Save);
            break;
        }
    });
}

Scene_GameEnd.prototype.start = function() {
    Scene_MenuBase.prototype.start.call(this);
    choicesList = gameEnd.element.choicesList;

    takeAreYouSure(gameEnd, {
        explanation: /*html*/`Are you sure you want to exit the game and return to the title screen?<br>All unsaved progress will be lost.`,
        choices: [
            { text: 'Return to title', id: ARE_YOU_SURE_IDS.YES },
            { text: 'Cancel', id: ARE_YOU_SURE_IDS.NO }
        ]
    }).then(playerChoice => {
        if (playerChoice.id === ARE_YOU_SURE_IDS.YES) {
            removeMenuBackdrop();
            this.fadeOutAll();
            SceneManager.goto(Scene_Title);
        } else {
            this.popScene();
        }
    });
}

Scene_Options.prototype.start = function() {
    Scene_MenuBase.prototype.start.call(this);
    addMenuBackdrop();
    choicesList = optionsMenu.element.choicesList;
    handleOptionsMenu().then(() => {
        configManager.save();
        this.popScene();
        removeMenuBackdrop();
    });
}

async function handleOptionsMenu() {
    optionsMenu.element.optionsMenuSetOptions(OPTIONS_MENU_CHOICES);
    optionsMenu.showAndOpen();
    await optionsMenu.element.optionsMenuStart();
    await optionsMenu.closeAndHide();
}

Scene_Item.prototype.start = function() {
    Scene_MenuBase.prototype.start.call(this);
    addMenuBackdrop();

    const choices = createItemChoices();
    itemsMenu.showAndOpen();
    itemsMenu.element.itemsMenuStart(choices).then(async () => {
        await itemsMenu.closeAndHide();
        removeMenuBackdrop();
        this.popScene();
    });
}

function createItemChoices() {
    const ICON_COLUMNS = 16;

    return getItems().map(item => {
        const iconIndex = item.iconIndex;
        const iconX = iconIndex % ICON_COLUMNS;
        const iconY = Math.floor(iconIndex / ICON_COLUMNS);

        return {
            text: `<div class="item-icon" style="--icon-x:${iconX};--icon-y:${iconY}"></div> ${item.name} x${getItemAmounts(item)}`,
            explanation: item.description,
            id: item.id,
            canUse: () => true,
            canPickUp: () => sceneItemType === SCENE_ITEM_TYPES.FLOOR,
            canDrop: () => sceneItemType === SCENE_ITEM_TYPES.ITEMS && !!item.meta.item
        }
    });
}

function getItems() {
    switch (sceneItemType) {
        case SCENE_ITEM_TYPES.FLOOR: return $f.getFloorItems();
        default: return $gameParty.items();
    }
}

function getItemAmounts(item) {
    switch (sceneItemType) {
        case SCENE_ITEM_TYPES.FLOOR: return item.amount;
        default: return $gameParty.numItems($dataItems[item.id]);
    }
}

function createItemsMenuEventListeners() {
    const f = window.$f;
    
    itemsMenu.element.addEventListener(ITEMS_MENU_EVENTS.ITEM_USED, event => {
        goBackFromItemsMenu();

        const dataItems = window.$dataItems;
        const itemId = event.detail.itemId;
        const itemData = dataItems[itemId];

        switch (sceneItemType) {
            case SCENE_ITEM_TYPES.FLOOR:
                const x = $gamePlayer.x;
                const y = $gamePlayer.y;
                const itemEvent = $gameMap.eventsXy(x, y)
                    .findLast(event => event && !event._erased && event.event()?.meta?.item === itemData.meta.item);
                itemEvent.erase();
                f.useFloorItem(itemId);
            break;
            default: f.useInventoryItem(itemId);
        }
    });
    
    itemsMenu.element.addEventListener(ITEMS_MENU_EVENTS.ITEM_DROPPED, event => {
        goBackFromItemsMenu();

        setTimeout(() => {
            const itemId = event.detail.itemId;
            const itemData = $dataItems[itemId];

            f.placeItemEvent($gamePlayer.x, $gamePlayer.y, itemData?.meta?.item);
            $gameParty.loseItem(itemData, 1);
            f.moveEnemies();
        }, 100);
    });
    
    itemsMenu.element.addEventListener(ITEMS_MENU_EVENTS.ITEM_PICKED_UP, event => {
        goBackFromItemsMenu();

        const itemId = event.detail.itemId;
        const x = $gamePlayer.x;
        const y = $gamePlayer.y;
        const itemData = $dataItems[itemId];

        const itemEvent = $gameMap.eventsXy(x, y)
            .findLast(event => !event._erased && itemData.meta.item === event.event()?.meta?.item);
        itemEvent.erase();
        $gameParty.gainItem(itemData, 1);
        f.moveEnemies();
    });
}

function showFloor() {
    if (itemsMenu.hideable.hideableIsShown) {
        return;
    }
    sceneItemType = SCENE_ITEM_TYPES.FLOOR;
    SceneManager.push(Scene_Item);
}

window.$f = $f || {};
$f.showFloor = showFloor;

function goBackFromItemsMenu() {
    itemsMenu.closeAndHide();
    SceneManager.goto(Scene_Map);
    removeMenuBackdrop();
}

for (const scene of [
        Scene_Menu,
        Scene_GameEnd,
        Scene_Options,
        Scene_Item
]) {
    const _scene_update = scene.prototype.update;
    scene.prototype.update = function() {
        _scene_update.call(this);
        handleMenuInputs(scene);
    }

    scene.prototype.create = Scene_MenuBase.prototype.create;
    scene.prototype.stop = Scene_MenuBase.prototype.stop;
    scene.prototype.createBackground = Scene_MenuBase.prototype.createBackground;
}

const _Scene_Item_update = Scene_Item.prototype.update;
Scene_Item.prototype.update = function() {
    choicesList = itemsMenu.element.choicesList;
    _Scene_Item_update.call(this);
}

function handleMenuInputs(scene) {
    const input = window.Input;
    const touchInput = window.TouchInput;

    if (input.isTriggered('up')) {
        choicesList.choicesListSelectPreviousOption();
    } else if (input.isTriggered('down')) {
        choicesList.choicesListSelectNextOption();
    } else if (input.isTriggered('ok')) {
        choicesList.choicesListConfirmCurrentOption();
    } else if (input.isTriggered('cancel') || touchInput.isCancelled()) {
        choicesList.choicesListCancel();
    } if (input.isTriggered('right')) {
        if (scene === Scene_Options) {
            optionsMenu.element.optionsMenuSetNextValue();
        } else if (choicesList instanceof ScrollableListComponent) {
            choicesList.scrollableListNextPage();
        } else {
            choicesList.choicesListGoToBottom();
        }
    } else if (input.isTriggered('left')) {
        if (scene === Scene_Options) {
            optionsMenu.element.optionsMenuSetPreviousValue();
        } else if (choicesList instanceof ScrollableListComponent) {
            choicesList.scrollableListPreviousPage();
        } else {
            choicesList.choicesListGoToTop();
        }
    }
}

function mapToOnOff(boolValue) {
    return boolValue ? 'ON' : 'OFF';
}

function mapToPercentage(value) {
    return `${value}%`;
}

function addMenuBackdrop() {
    menuContainer.classList.add('menu-backdrop');
}

function removeMenuBackdrop() {
    menuContainer.classList.remove('menu-backdrop');
}