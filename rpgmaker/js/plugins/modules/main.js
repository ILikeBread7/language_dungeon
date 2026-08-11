import { initializeMainMenu } from './menu/menu.js';
import { initializeAll } from './message/message.js';

const componentsContainer = document.createElement('div');
componentsContainer.id = 'components-container';
const baseTransform = /*css*/`translate(-50%, -50%)`;

const style = document.createElement('style');
style.innerHTML = /*css*/`
    body {
        overflow: hidden;
        margin: 0px;
    }

    #components-container {
        position: absolute;
        left: 50%;
        top: 50%;
        overflow: hidden;
    }
`;
document.body.append(style, componentsContainer);
window.addEventListener('resize', adjustContainerDimensions);
adjustContainerDimensions();

initializeAll(componentsContainer);
initializeMainMenu(componentsContainer);

function adjustContainerDimensions() {
    setTimeout(() => {
        componentsContainer.style.zIndex = 999;
        componentsContainer.style.transform = /*css*/`${baseTransform} scale(${Math.ceil(Graphics._realScale * 100) / 100})`;
        componentsContainer.style.width = /*css*/`${Graphics.boxWidth}px`;
        componentsContainer.style.height = /*css*/`${Graphics.boxHeight}px`;
    }, 50);
}