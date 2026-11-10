import { BaseComponent } from '../../common/components/base_component.js';
import { PromiseResolve } from '../../common/helpers/promise_resolve.js';

const QUIZ_QUESTION_CONTAINER_CLASS = 'quiz-question';
const QUIZ_BUTTONS_CONTAINER_CLASS = 'quiz-answers';
const QUIZ_UP_CLASS = 'quiz-up';
const QUIZ_LEFT_CLASS = 'quiz-left';
const QUIZ_RIGHT_CLASS = 'quiz-right';
const QUIZ_DOWN_CLASS = 'quiz-down';

/** @typedef {{ question: string, answers: [string], exampleSentence: string }} QuizValues */

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

                .${QUIZ_BUTTONS_CONTAINER_CLASS} > * {
                    border: solid 1px;
                    width: 40%;
                    text-align: center;

                    &[data-selected="selected"] {
                        background: green;
                    }
                }

                .${QUIZ_UP_CLASS},
                .${QUIZ_DOWN_CLASS} {
                    margin-left: auto;
                    margin-right: auto;
                }

                .${QUIZ_LEFT_CLASS},
                .${QUIZ_RIGHT_CLASS} {
                    display: inline-block;
                }

                .${QUIZ_RIGHT_CLASS} {
                    float: right;
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
        const buttons = Object.values(this._buttons);
        values.answers.forEach((answer, index) => {
            const button = buttons[index];
            button.innerHTML = answer;
            button.dataset.index = index;
        });
        this._exampleSentenceContainer.innerHTML = values.exampleSentence;
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
        this._promiseResolve.resolve({ cancelled: false, index });
    }

    quizComponentCancel() {
        this._promiseResolve.resolve({ cancelled: true });
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

}

function createButtonWithClass(cssClass) {
    const button = document.createElement('div');
    button.classList.add(cssClass);
    return button;
}