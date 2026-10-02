import { FullGamelogComponent } from '../common/components/full_gamelog_component.js';
import { GamelogComponent } from '../common/components/gamelog_component.js';
import { DungeonHudComponent } from './components/dungeon_hud.js';

DungeonHudComponent.register();
const hud = new DungeonHudComponent();
hud.dungeonHudComponentSetValues({ floor: 1, maxHp: 99, hp: 70 });
document.body.appendChild(hud);

setTimeout(() => {
    hud.dungeonHudComponentSetValues({ hp: 99 });
}, 1000);

GamelogComponent.register();
const log = new GamelogComponent();
document.body.appendChild(log);

// setTimeout(() => {
//     const text = [];
//     for (let i = 0; i < 10; i++) {
//         text.push('Text');
//         log.gamelogComponentAddLog(text.join('\n'));
//     }
// }, 1000);

(async () => {
    for (let i = 1; i <= 10; i++) {
        await log.gamelogComponentAddLog('Test');
    }
})();


FullGamelogComponent.register();
const fullLog = new FullGamelogComponent();
document.body.appendChild(fullLog);

const text = [];
for (let i = 1; i <= 20; i++) {
    text.push(`Test line #${i}`);
}
fullLog.fullGamelogComponentShow(text.join('\n'));

setInterval(() => fullLog.fullGamelogComponentScrollUp())