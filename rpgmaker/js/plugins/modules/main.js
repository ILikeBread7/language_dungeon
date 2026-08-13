import { initializeMainMenu } from './menu/menu.js';
import { initializeAll } from './message/message.js';

const componentsContainer = document.createElement('div');
componentsContainer.id = 'components-container';

document.body.appendChild(componentsContainer);
window.addEventListener('resize', adjustContainerDimensions);
setTimeout(adjustContainerDimensions, 100);

initializeAll(componentsContainer);
initializeMainMenu(componentsContainer);

function adjustContainerDimensions() {
    componentsContainer.style.setProperty('--scale', Math.ceil(Graphics._realScale * 100) / 100);
    componentsContainer.style.width = `${Graphics.boxWidth}px`;
    componentsContainer.style.height = `${Graphics.boxHeight}px`;
}

const modifyFunction = Graphics._modifyExistingElements;
Graphics._modifyExistingElements = function() {
    modifyFunction();
    componentsContainer.style.removeProperty('z-index');
}