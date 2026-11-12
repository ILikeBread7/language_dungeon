import { BaseComponent } from '../../common/components/base_component.js';
import { PromiseResolve } from '../../common/helpers/promise_resolve.js';

const QUIZ_QUESTION_CONTAINER_CLASS = 'quiz-question';
const QUIZ_BUTTONS_CONTAINER_CLASS = 'quiz-answers';
const QUIZ_UP_CLASS = 'quiz-up';
const QUIZ_LEFT_CLASS = 'quiz-left';
const QUIZ_RIGHT_CLASS = 'quiz-right';
const QUIZ_DOWN_CLASS = 'quiz-down';
const QUIZ_BUTTON_CLASS = 'quiz-button';
const QUIZ_CRITICAL_CONTAINER_CLASS = 'quiz-critical-container';
const QUIZ_CRITICAL_COUNTER_CLASS = 'quiz-critical-counter';
const QUIZ_CRITICAL_COUNTER_CONTENT_CLASS = 'quiz-critical-counter-content';
const QUIZ_CRITICAL_CHANCE_CLASS = 'quiz-critical-chance';

/** @typedef {{question: string, answers: [string], exampleSentence: string, criticalTimer: number }} QuizValues */

export class QuizComponent extends BaseComponent {

    static get componentDefaultTagName() {
        return 'quiz-component';
    }

    get componentCssStyle() {
        return /*css*/`
            ${this.componentTagName} {
                .${QUIZ_QUESTION_CONTAINER_CLASS} {
                    text-align: center;
                }

                .${QUIZ_BUTTONS_CONTAINER_CLASS} {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    grid-template-rows: repeat(3, 1fr);

                    &> .${QUIZ_BUTTON_CLASS} {
                        border: solid 1px;
                        text-align: center;

                        &[data-selected="selected"] {
                            background: green;
                        }
                    }
                }

                .${QUIZ_UP_CLASS},
                .${QUIZ_DOWN_CLASS} {
                    grid-column: 2 / 5;
                }

                .${QUIZ_UP_CLASS} {
                    grid-row: 1;
                }

                .${QUIZ_DOWN_CLASS} {
                    grid-row: 3;
                 }

                .${QUIZ_LEFT_CLASS},
                .${QUIZ_RIGHT_CLASS} {
                    grid-row: 2;
                }

                .${QUIZ_LEFT_CLASS} {
                    grid-column: 1 / 3;
                }

                .${QUIZ_RIGHT_CLASS} {
                    grid-column: 4 / 6;
                }

                .${QUIZ_UP_CLASS}::before {
                    content: '↑';
                }

                .${QUIZ_DOWN_CLASS}::before {
                    content: '↓';
                }

                .${QUIZ_LEFT_CLASS}::before {
                    content: '←';
                }

                .${QUIZ_RIGHT_CLASS}::before {
                    content: '→';
                }

                .${QUIZ_CRITICAL_CONTAINER_CLASS} {
                    grid-row: 2;
                    grid-column: 3;
                    position: relative;
                }

                .${QUIZ_CRITICAL_COUNTER_CLASS} {
                    width: 80%;
                    height: 1.2em;
                    background: black;
                }

                .${QUIZ_CRITICAL_COUNTER_CONTENT_CLASS} {
                    height: 100%;
                    background: green;
                    width: calc(100% * var(--critical-timer, 1));
                }

                .${QUIZ_CRITICAL_CHANCE_CLASS} {
                    white-space: nowrap;
                }

                .${QUIZ_CRITICAL_COUNTER_CLASS},
                .${QUIZ_CRITICAL_CHANCE_CLASS} {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    translate: -50% -50%;
                    color: white;
                }
            }
        `;
    }

    constructor() {
        super();

        this._promiseResolve = new PromiseResolve();

        this._questionContainer = document.createElement('div');
        this._questionContainer.classList.add(QUIZ_QUESTION_CONTAINER_CLASS);
        this._buttonsContainer = document.createElement('div');
        this._buttonsContainer.classList.add(QUIZ_BUTTONS_CONTAINER_CLASS);
        this._buttons = {
            up: createButtonWithClass(QUIZ_UP_CLASS),
            left: createButtonWithClass(QUIZ_LEFT_CLASS),
            right: createButtonWithClass(QUIZ_RIGHT_CLASS),
            down: createButtonWithClass(QUIZ_DOWN_CLASS)
        };
        Object.values(this._buttons).forEach(button => {
            this._buttonsContainer.appendChild(button);
            
            button.addEventListener('pointerover', event => {
                this._selectButton(button);
            });

            button.addEventListener('click', event => {
                this._selectButton(button);
                this.quizComponentConfirm();
            });
        });
        this._createCriticalCounter();
        this._buttonsContainer.appendChild(this._criticalTimeContainer);

        this._exampleSentenceContainer = document.createElement('div');

        this.append(
            this._questionContainer,
            this._buttonsContainer,
            this._exampleSentenceContainer
        );
    }


    /**
     * 
     * @param {QuizValues} values 
     */
    quizComponentSetValues(values) {
        this._questionContainer.innerHTML = values.question;
        this._deselectButtons();
        const buttons = Object.values(this._buttons);
        values.answers.forEach((answer, index) => {
            const button = buttons[index];
            button.innerHTML = answer;
            button.dataset.index = index;
        });
        this._exampleSentenceContainer.innerHTML = values.exampleSentence;
        this.quizComponentUpdateCriticalTimer(values.criticalTimer);
    }

    /**
     * 
     * @param {QuizValues} values 
     */
    async quizComponentStart(values) {
        this._promiseResolve.reject();

        this.quizComponentSetValues(values);

        return new Promise((resolve, reject) => {
            this._promiseResolve.setResolve(resolve, reject);
        });
    }

    quizComponentSelectUp() {
        this._selectButton(this._buttons.up);
    }

    quizComponentSelectDown() {
        this._selectButton(this._buttons.down);
    }

    quizComponentSelectLeft() {
        this._selectButton(this._buttons.left);
    }

    quizComponentSelectRight() {
        this._selectButton(this._buttons.right);
    }

    quizComponentConfirm() {
        const selectedButton = this._buttonsContainer.querySelector('[data-selected="selected"]');
        if (!selectedButton) {
            return null;
        }
        const index = Number(selectedButton.dataset.index);
        this._promiseResolve.resolve({ cancelled: false, index, critical: this._criticalTimer > 0 });
    }

    quizComponentCancel() {
        this._promiseResolve.resolve({ cancelled: true });
    }

    /**
     * 
     * @param {number} [criticalTimer=1] 
     */
    quizComponentUpdateCriticalTimer(criticalTimer = 1) {
        this.style.setProperty('--critical-timer', criticalTimer);
        this._criticalTimer = criticalTimer;
    }

    /**
     * 
     * @param {HTMLElement} button 
     */
    _selectButton(button) {
        this._deselectButtons();
        button.dataset.selected = 'selected';
    }

    _deselectButtons() {
        Object.values(this._buttons).forEach(button => button.removeAttribute('data-selected'));
    }

    _createCriticalCounter() {
        this._criticalTimeContainer = document.createElement('div');
        this._criticalTimeContainer.classList.add(QUIZ_CRITICAL_CONTAINER_CLASS);
        
        this._criticalTimeCounter = document.createElement('div');
        this._criticalTimeCounter.classList.add(QUIZ_CRITICAL_COUNTER_CLASS);
        this._criticalTimeCounterContent = document.createElement('div');
        this._criticalTimeCounterContent.classList.add(QUIZ_CRITICAL_COUNTER_CONTENT_CLASS);
        this._criticalTimeCounter.appendChild(this._criticalTimeCounterContent);

        this._criticalChanceText = document.createElement('span');
        this._criticalChanceText.classList.add(QUIZ_CRITICAL_CHANCE_CLASS);
        this._criticalChanceText.innerHTML = 'Critical chance!';

        this._criticalTimeContainer.append(
            this._criticalTimeCounter,
            this._criticalChanceText
        );
    }

}

function createButtonWithClass(cssClass) {
    const button = document.createElement('div');
    button.classList.add(QUIZ_BUTTON_CLASS, cssClass);
    return button;
}