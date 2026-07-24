import { OpenableComponent } from './components/openable_component.js';

OpenableComponent.register();
const openable = new OpenableComponent();
document.body.appendChild(openable);

setTimeout(async () => {
    await openable.openableOpen();
    await openable.openableClose();
}, 100);