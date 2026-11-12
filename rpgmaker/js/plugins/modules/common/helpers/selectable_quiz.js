/**
 * @implements {import('./selectable_interface.js').SelectableInterface}
 */
export class SelectableQuiz {

    /**
     * 
     * @param {import('../../game/components/quiz.js').QuizComponent} quiz 
     */
    constructor(quiz) {
        this._quiz = quiz;
    }

    selectUp() {
        this._quiz.quizComponentSelectUp();
    }

    selectDown() {
        this._quiz.quizComponentSelectDown();
    }

    selectLeft() {
        this._quiz.quizComponentSelectLeft();
    }

    selectRight() {
        this._quiz.quizComponentSelectRight();
    }

    confirmCurrent() {
        this._quiz.quizComponentConfirm();
    }

    cancel() {
        this._quiz.quizComponentCancel();
    }

}