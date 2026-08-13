import { initializeMainMenu } from './menu/menu.js';
import { initializeAll } from './message/message.js';

const componentsContainer = document.createElement('div');
componentsContainer.id = 'components-container';
const baseTransform = /*css*/``;

const style = document.createElement('style');
style.innerHTML = /*css*/`
    body {
        overflow: hidden;
        margin: 0px;
    }

    #ErrorPrinter:empty {
        pointer-events: none;
    }

    #components-container {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%) scale(var(--scale, 1));
        overflow: hidden;
        z-index: 98;
    }
`;
document.body.append(style, componentsContainer);
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