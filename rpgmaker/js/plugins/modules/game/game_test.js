import { DungeonHudComponent } from './components/dungeon_hud.js';

DungeonHudComponent.register();
const hud = new DungeonHudComponent();
hud.dungeonHudComponentSetValues({ floor: 1, maxHp: 99, hp: 70 });
document.body.appendChild(hud);

setTimeout(() => {
    hud.dungeonHudComponentSetValues({ hp: 99 });
}, 1000);