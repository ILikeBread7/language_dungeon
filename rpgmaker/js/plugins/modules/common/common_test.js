import { HideableComponent } from './components/hideable_component.js';
import { OpenableComponent } from './components/openable_component.js';

OpenableComponent.register();
const openable = new OpenableComponent();
HideableComponent.register();
const hideable = new HideableComponent();
hideable.appendChild(openable);

document.body.appendChild(hideable);

(async () => {
    hideable.hideableShow();
    await openable.openableOpen();
    await openable.openableClose();
    hideable.hideableHide();
})();