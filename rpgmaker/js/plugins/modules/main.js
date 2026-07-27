import { initializeMainMenu } from './menu/menu.js';
import { initializeAll } from './message/message.js';

initializeAll();
initializeMainMenu();

const temporaryStyles = document.createElement('style');
temporaryStyles.innerHTML = /*css*/`
    .centered {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }

    .with-message-box {
        --message-box-height: calc(1em * 4 * 1.2);
        top: calc((100vh - var(--message-box-height)) / 2);
    }

    .half-screen {
        width: 50%;
        height: 50%;
    }
`;
document.body.appendChild(temporaryStyles);