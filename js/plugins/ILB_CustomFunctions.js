//=============================================================================
// ILB_CustomFunctions.js
//=============================================================================

/*:
 * @plugindesc Exposes a global object $f to store custom functions for use in script calls.
 *
 * @author I_LIKE_BREAD7
 *
 * @help
 * This plugin creates a global object $f. You can add any functions you want to $f and 
 * then call them using script calls. This is useful for organizing custom game functions.
 * You can also include multiple copies of this plugin with different filenames for better
 * code separation.
 * 
 * Example usage:
 * Add a function to the plugin in the designated space like this
 *   $f.myFunction = function(param1, param2) {
 *       // Your code here
 *       console.log("Function called with params:", param1, param2);
 *   };
 *
 * Then in a script call, use like this:
 *   $f.myFunction("hello", 42);
 */

var $f = $f || {};

(function () {

    const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        if (command === '$f') {
            const functionName = args[0];
            const params = args.slice(1).map(mapPluginCommandParam);
            $f[functionName](...params);
            return;
        }
        _Game_Interpreter_pluginCommand.call(this, command, args);
    }

    function mapPluginCommandParam(param) {
        if (!isNaN(param)) {
            return Number(param);
        }

        if (
            (param.startsWith('"') && param.endsWith('"'))
            || (param.startsWith("'") && param.endsWith("'"))
        ) {
            return param
                .substring(1, param.length - 1)
                .replace(/(?<!\\)_/g, ' ')
                .replace(/\\_/g, '_');
        }

        const gameData = /\$(gameVariables|gameSwitches)\.value\((\d+)\)/g.exec(param);
        if (gameData) {
            return window[`$${gameData[1]}`].value(gameData[2]);
        }
    }

    let sentences = null;
    fetch('js/plugins/data/id/sentences.json')
        .then(response => response.json())
        .then(data => sentences = data);

    const QUIZ_START = 0;
    const QUIZ_ENTRIES_PER_LEVEL = 20;

    let quizLevel = 1;
    let goodAnswers;    // Use load progress function to initialize

    function getQuizEntriesNumber(quizLevel) {
        return quizLevel * QUIZ_ENTRIES_PER_LEVEL;
    }

    const distanceToFollow = 5;
    let currentEnemyIndex = 0;
    function moveEnemies() {
        const events = $gameMap.events();
        const realMoveSpeed = $gamePlayer.realMoveSpeed();
        for (; currentEnemyIndex < events.length; currentEnemyIndex++) {
            const event = events[currentEnemyIndex];
            if (!event || event._erased || event.isMoving() || !event.event().meta || !event.event().meta.enemy) {
                continue;
            }

            if (event.isStunned) {
                event.isStunned = false;
                continue;
            }

            event.setMoveSpeed(realMoveSpeed);
            const playerDistance = distance($gamePlayer, event);
            if (playerDistance === 1) {
                event.isAttacking = true;
                event.start();
                currentEnemyIndex++;
                return;
            }
            moveEnemy(event, $gamePlayer, playerDistance);
        }

        if (currentEnemyIndex >= events.length) {
            currentEnemyIndex = 0;
        }
    }

    $f.moveEnemies = moveEnemies;

    function moveEnemy(enemy, player, playerDistance) {
        const initialValue = 1;
        const directions = Array(10).fill(initialValue);
        directions[0] = directions[5] = Number.MIN_SAFE_INTEGER;
        const reverseDirectionPenalty = 1;
        const moveAwayFromPlayerPenalty = 3;
        const moveAwayFromPlayerDiagonalPenalty = Math.floor(moveAwayFromPlayerPenalty / 2) + 1;
        const followPlayerValue = 10;
        const followPlayerDiagonalValue = Math.floor(followPlayerValue / 2) + 1;
        let minValueThreshold = initialValue - reverseDirectionPenalty;
        
        directions[enemy.reverseDir(getActualDirection(enemy))] -= reverseDirectionPenalty;

        if (playerDistance <= distanceToFollow || enemy.isSameRoomWithPlayer()) {
            minValueThreshold = initialValue - moveAwayFromPlayerPenalty;
            const xDiff = player.x - enemy.x;
            const yDiff = player.y - enemy.y;

            if (xDiff > 0) {
                directions[6] += followPlayerValue;
                directions[9] += followPlayerDiagonalValue;
                directions[3] += followPlayerDiagonalValue;
                subtractMoveAwayLeftPenalties(directions, moveAwayFromPlayerPenalty, moveAwayFromPlayerDiagonalPenalty);
            } else if (xDiff < 0) {
                directions[4] += followPlayerValue;
                directions[7] += followPlayerDiagonalValue;
                directions[1] += followPlayerDiagonalValue;
                subtractMoveAwayRightPenalties(directions, moveAwayFromPlayerPenalty, moveAwayFromPlayerDiagonalPenalty);
            } else {
                subtractMoveAwayLeftPenalties(directions, moveAwayFromPlayerPenalty, moveAwayFromPlayerDiagonalPenalty);
                subtractMoveAwayRightPenalties(directions, moveAwayFromPlayerPenalty, moveAwayFromPlayerDiagonalPenalty);
            }

            if (yDiff > 0) {
                directions[2] += followPlayerValue;
                directions[1] += followPlayerDiagonalValue;
                directions[3] += followPlayerDiagonalValue;
                subtractMoveAwayUpPenalties(directions, moveAwayFromPlayerPenalty, moveAwayFromPlayerDiagonalPenalty);
            } else if (yDiff < 0) {
                directions[8] += followPlayerValue;
                directions[7] += followPlayerDiagonalValue;
                directions[9] += followPlayerDiagonalValue;
                subtractMoveAwayDownPenalties(directions, moveAwayFromPlayerPenalty, moveAwayFromPlayerDiagonalPenalty);
            } else {
                subtractMoveAwayUpPenalties(directions, moveAwayFromPlayerPenalty, moveAwayFromPlayerDiagonalPenalty);
                subtractMoveAwayDownPenalties(directions, moveAwayFromPlayerPenalty, moveAwayFromPlayerDiagonalPenalty);
            }
        }

        const sortedDirections = shuffle(
            directions
                .map((value, index) => ({ dir: index, value }))
                .filter(({value}) => value >= minValueThreshold)
        ).sort((dir1, dir2) => dir2.value - dir1.value)
        .map(({dir}) => dir);

        const oldDirection = getActualDirection(enemy);
        for (let i = 0; i < sortedDirections.length; i++) {
            const dir = sortedDirections[i];
            $f.setDirection(enemy, dir);
            enemy.moveForward();
            if (enemy.isMovementSucceeded()) {
                return;
            }
        }
        $f.setDirection(enemy, oldDirection);
    }

    function subtractMoveAwayLeftPenalties(directions, moveAwayFromPlayerPenalty, moveAwayFromPlayerDiagonalPenalty) {
        directions[4] -= moveAwayFromPlayerPenalty;
        directions[1] -= moveAwayFromPlayerDiagonalPenalty;
        directions[7] -= moveAwayFromPlayerDiagonalPenalty;
    }

    function subtractMoveAwayRightPenalties(directions, moveAwayFromPlayerPenalty, moveAwayFromPlayerDiagonalPenalty) {
        directions[6] -= moveAwayFromPlayerPenalty;
        directions[3] -= moveAwayFromPlayerDiagonalPenalty;
        directions[9] -= moveAwayFromPlayerDiagonalPenalty;
    }

    function subtractMoveAwayUpPenalties(directions, moveAwayFromPlayerPenalty, moveAwayFromPlayerDiagonalPenalty) {
        directions[8] -= moveAwayFromPlayerPenalty;
        directions[7] -= moveAwayFromPlayerDiagonalPenalty;
        directions[9] -= moveAwayFromPlayerDiagonalPenalty;
    }

    function subtractMoveAwayDownPenalties(directions, moveAwayFromPlayerPenalty, moveAwayFromPlayerDiagonalPenalty) {
        directions[2] -= moveAwayFromPlayerPenalty;
        directions[1] -= moveAwayFromPlayerDiagonalPenalty;
        directions[3] -= moveAwayFromPlayerDiagonalPenalty;
    }

    function getActualDirection(enemy) {
        return enemy._diagonal || enemy.direction();
    }

    const _Game_Event_unlock = Game_Event.prototype.unlock;
    Game_Event.prototype.unlock = function () {
        const oldDirection = getActualDirection(this);
        _Game_Event_unlock.call(this);
        setDirection(this, oldDirection);

        if (!this.event().meta || !this.event().meta.enemy) {
            return;
        }

        this.isAttacking = false;
        if ($ns.attackCancelled) { 
            $ns.attackCancelled = false;
        } else {
            moveEnemies();
        }
    }

    const _Game_Party_increaseSteps = Game_Party.prototype.increaseSteps;
    Game_Party.prototype.increaseSteps = function () {
        _Game_Party_increaseSteps.call(this);
        moveEnemies();
    };

    Scene_Map.prototype.checkGameover = function() {
        if ($gameParty.isAllDead()) {
            $gameTemp.reserveCommonEvent(7); // Game Over Common Event
        }
    }

    function distance(entity1, entity2) {
        return Math.max(
            Math.abs(entity1.x - entity2.x),
            Math.abs(entity1.y - entity2.y)
        );
    }

    $f.setEnemyTexts = () => {
        alreadyAsked = [];
        $gameMap.events().forEach($f.setEnemyText);
        const portalEnemy = $gameMap.events()
            .find(event => event.event() && event.event().meta && event.event().meta.enemy);
        portalEnemy.portalEnemy = true;
    }

    let alreadyAsked = [];
    function pickRandomEligibleQuestion(minScore = Number.MIN_SAFE_INTEGER) {
        const goodAnswersFilter = QUIZ_START + getQuizEntriesNumber(quizLevel) > quizData.length
            ? () => true
            : entry => {
                const [ score, lastAnsweredQuizLevel ] = goodAnswers.get(entry.question) || [ 0, quizLevel ];
                return score >= minScore && score <= Math.log2(quizLevel - lastAnsweredQuizLevel + 1);
            };
        return pickRandomFiltered(
            entry => goodAnswersFilter(entry) && !alreadyAsked.includes(entry),
            quizData, QUIZ_START, getQuizEntriesNumber(quizLevel)
        );
    }

    $f.setEnemyText = event => {
        if (!event || event._erased || !event.event().meta || !event.event().meta.enemy) {
            return;
        }

        let randomQuestion;
        // For enemies that got hit use already known words if possible
        if (event.hit) {
            const minScore = 1;
            randomQuestion = pickRandomEligibleQuestion(minScore);
        }
        if (!randomQuestion) {
            randomQuestion = pickRandomEligibleQuestion();
        }

        while (!randomQuestion) {
            quizLevel++;
            randomQuestion = pickRandomEligibleQuestion();
        }
        alreadyAsked.push(randomQuestion);

        const answers = [randomQuestion.answer];
        for (let i = 0; i < 3; i++) {
            let randomAnswer;
            let answer;
            do {
                randomAnswer = pickRandom(quizData, QUIZ_START, getQuizEntriesNumber(quizLevel));
                answer = randomAnswer.answer;
            } while (answers.includes(answer));
            answers.push(answer);
        }

        shuffle(answers);
        const correctIndex = answers.findIndex(answer => answer === randomQuestion.answer);
        const incorrectIndexes = shuffle(answers.map((_, index) => index).filter(index => index !== correctIndex));

        event.quiz = {
            question: randomQuestion.question,
            answers: answers,
            correct: correctIndex,
            incorrect: incorrectIndexes,
            answeredWrong: [],
            incorrectAnswersToMark: -(goodAnswers.get(randomQuestion.question) || [ 0 ])[0]
        };

        $eventText.set(event.eventId(), event.quiz.question);
    }

    $f.setQuestionVariables = (event) => {
        const DEFAULT_COLOR = 0;
        const INCORRECT_COLOR = 10;
        const quiz = event.quiz;

        $nv.question = quiz.question;
        $nv.correctAnswer = quiz.answers[quiz.correct];

        quiz.answers.forEach((answer, index) => {
            $gameVariables.setValue(index + 12, DEFAULT_COLOR);
            $gameVariables.setValue(index + 5, answer);
        });
        quiz.answeredWrong.forEach(wrongAnswerIndex => {
            $gameVariables.setValue(wrongAnswerIndex + 12, INCORRECT_COLOR);
        });
        const incorrectAnswersToMark = Math.min(quiz.incorrectAnswersToMark, 2);
        for (let i = 0; i < incorrectAnswersToMark; i++) {
            $gameVariables.setValue(quiz.incorrect[i] + 12, INCORRECT_COLOR);
        }

        $nv.correctAnswerIndex = quiz.correct;
        $nv.exampleSentence = addWordTranslations(
            addWordColor(
                getExampleSentence(quiz.question),
                quiz.question
            ),
            quiz
        );
    };

    const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
    Window_Base.prototype.convertEscapeCharacters = function(text) {
        // Call twice to escape nested character sequences
        text = _Window_Base_convertEscapeCharacters.call(this, text);
        return _Window_Base_convertEscapeCharacters.call(this, text);
    }

    function getExampleSentence(word) {
        if (!sentences) {
            return '';
        }

        const wordSentences = sentences[word];
        if (!wordSentences) {
            return '';
        }

        return pickRandom(wordSentences);
    }

    function addWordColor(sentence, word) {
        const wordRegexString = `(${word})`;
        const replacerString = '\\c[3]$1\\c[0]'
        if (sentence.includes(' ')) {
            return sentence.replace(new RegExp(`\\b${wordRegexString}\\b`, 'ig'), replacerString);
        }
        return sentence.replace(new RegExp(wordRegexString, 'ig'), replacerString);
    }

    function addWordTranslations(sentence, quiz) {
        const SPACE_CODE = '_@_';
        const LEFT_PAREN_CODE = '_@@_';
        const RIGHT_PAREN_CODE = '_@@@_';

        const uniqueWordsSet = new Set(splitSentence(sentence));
        uniqueWordsSet.delete(quiz.question);

        [...uniqueWordsSet]
            .map(word => word.toLowerCase())
            .filter(word => ((goodAnswers.get(word) || [ 0 ])[0]) <= 0 && quizAnswersMap.has(word))
            .forEach(word => sentence = sentence.replace(
                    new RegExp(`\\b(${word})\\b`, 'ig'),
                    `$1${SPACE_CODE}${LEFT_PAREN_CODE}${quizAnswersMap.get(word).replace(/ /g, SPACE_CODE)}${RIGHT_PAREN_CODE}`
                )
            );

        return sentence
            .replace(new RegExp(RIGHT_PAREN_CODE, 'g'), ')')
            .replace(new RegExp(LEFT_PAREN_CODE, 'g'), '(')
            .replace(new RegExp(SPACE_CODE, 'g'), ' ');
    }

    function splitSentence(sentence) {
        const ALPHABET_REGEX = /[a-z\s]+/ig;
        if (sentence.match(ALPHABET_REGEX)) {
            return sentence
                .split(/[\s,、"—'.!?。！？(「『‚„“)」』‘“”]/)
                .filter(Boolean);
        }

        return []; // TODO later for non alphabet based languages
    }

    $f.answeredWrong = (event, answerIndex) => {
        if (event.quiz.answeredWrong.length === 0) {
            $f.rememberProgress(event.quiz.question, quizLevel, false);
        }
        event.quiz.answeredWrong.push(answerIndex);
    }

    $f.placePortal = (x, y) => {
        $f.placeEvent(x, y, 'portal');
    };

    $f.placeEvent = (x, y, eventTag) => {
        const eventData = $dataMap.events.find(event => event && event.meta && event.meta[eventTag]);
        if (!eventData) {
            console.warn(`No event with tag: ${eventTag}!`);
            return;
        }

        const event = new Game_Event($gameMap.mapId(), eventData.id);
        addEvent(event, x, y);
    }

    function addEvent(event, x = 0, y = 0) {
        $gameMap._events.push(event);
        event._eventId = $gameMap._events.length - 1;
        event.setPosition(x, y);
        addEventSprite(event);
    }

    function addEventSprite(event) {
        const sprite = new Sprite_Character(event);
        const spriteset = SceneManager._scene._spriteset;
        spriteset._characterSprites.push(sprite);
        spriteset._tilemap.addChild(sprite);
    }

    $f.enemyHit = enemyEvent => {
        if (enemyEvent.quiz.answeredWrong.length === 0) {
            $f.rememberProgress(enemyEvent.quiz.question, quizLevel, true);
        } else {
            enemyEvent.quiz.answeredWrong = [];
        }

        if (enemyEvent.hit) {
            $eventText.clear(enemyEvent.eventId());
            if (enemyEvent.portalEnemy) {
                $f.placePortal(enemyEvent.x, enemyEvent.y);
            } else if (Math.random() < 0.1) {
                $f.placeEvent(enemyEvent.x, enemyEvent.y, 'potion');
            }
            $gameMap.eraseEvent(enemyEvent.eventId());

        } else {
            enemyEvent.isStunned = true;
            enemyEvent.hit = true;
            $f.setEnemyText(enemyEvent);
        }
    }

    $f.useFloorItem = itemId => {
        const actor = $gameParty.leader();
        const item = $dataItems[itemId];

        SoundManager.playUseItem();

        const action = new Game_Action(actor);
        action.setItem(itemId);

        actor.startAnimation(item.animationId);
        action.apply(actor);
        action.applyGlobal();
    }

    function isFloorItem() {
        const x = $gamePlayer.x;
        const y = $gamePlayer.y;
        return $gameMap.eventsXy(x, y)
            .some(event => event && !event._erased && event.event().meta && event.event().meta.item);
    }

    $f.getFloorItems = () => {
        const x = $gamePlayer.x;
        const y = $gamePlayer.y;
        return $gameMap.eventsXy(x, y)
            .filter(event => event && !event._erased && event.event().meta && event.event().meta.item);
    }

    $f.triggerFloorItemEvents = () => {
        const items = $f.getFloorItems();
        helper(0);

        function helper(index) {
            const item = items[index];

            if (index < items.length - 1) {    // Do for all but the last element
                const baseUnlock = item.unlock;
                item.unlock = () => {
                    item.unlock = baseUnlock;
                    baseUnlock.call(item);
                    helper(index + 1);
                };
            }

            item.start();
        }
    }

    const _Game_Switches_value = Game_Switches.prototype.value;
    Game_Switches.prototype.value = function(switchId) {
        if (switchId === 4) {   // isFloorItem switch
            return isFloorItem();
        }
        return _Game_Switches_value.call(this, switchId);
    };

    function pickRandom(array, start = 0, amount = array.length - start) {
        amount = Math.min(amount, array.length - start);
        const randomIndex = start + Math.floor(Math.random() * amount);
        return array[randomIndex];
    }

    function pickRandomNotCorrect(array, start = 0, amount = array.length - start) {
        const questions = array.slice(start, start + amount).filter(({question}) => !goodAnswers.get(question));
        return pickRandom(questions);
    }

    function pickRandomFiltered(filter, array, start = 0, amount = array.length - start) {
        const questions = array.slice(start, start + amount).filter(filter);
        if (questions.length === 0) {
            return;
        }
        return pickRandom(questions);
    }

    /**
     * 
     * @param {[]} array 
     * @returns {[]} The same array shuffled in place
     */
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const randomIndex = Math.floor(Math.random() * (i + 1));

            const tmp = array[i];
            array[i] = array[randomIndex];
            array[randomIndex] = tmp;
        }

        return array;
    }

    const _Game_Character_moveBackward = Game_Character.prototype.moveBackward;
    Game_Character.prototype.moveBackward = function() {
        if (!this.isDiagonal()) {
            _Game_Character_moveBackward.call(this);
            return;
        }

        var lastDirectionFix = this.isDirectionFixed();
        this.setDirectionFix(true);
        this.diagonalMovement(this.reverseDir(this._diagonal));
        if (this.needDiagonalFix()) this.diagonalMovementFix(this._diagonal);
        this.setDirectionFix(lastDirectionFix);
    };

    const _Game_Player_findDirectionTo = Game_Player.prototype.findDirectionTo;
    Game_Player.prototype.findDirectionTo = function(goalX, goalY) {
        const deltaX = goalX - this.x;
        const deltaY = goalY - this.y;

        if (Math.abs(deltaX) === 1 && Math.abs(deltaY) === 1 && $gameMap.eventsXy(goalX, goalY).length > 0) {
            if (deltaX < 0 && deltaY > 0) return 1;
            if (deltaX > 0 && deltaY > 0) return 3;
            if (deltaX < 0 && deltaY < 0) return 7;
            if (deltaX > 0 && deltaY < 0) return 9;
        }

        return _Game_Player_findDirectionTo.call(this, goalX, goalY);
    }

    // const _Game_Event_isTriggerIn = Game_Event.prototype.isTriggerIn;
    // Game_Event.prototype.isTriggerIn = function(triggers) {
    //     if (this._trigger === null) {
    //         return false;
    //     }

    //     const meta = this.event().meta;
    //     if (meta && meta.triggers) {
    //         let metaTriggers = meta.triggers;
    //         if (typeof metaTriggers === 'string') {
    //             metaTriggers = JSON.parse(metaTriggers);
    //             meta.triggers = metaTriggers;
    //         }
    //         return metaTriggers.some(metaTrigger => triggers.contains(metaTrigger));
    //     }

    //     return _Game_Event_isTriggerIn.call(this, triggers);
    // };

    function setDirection(character, dir) {
        if (dir % 2 === 0) {
            character._diagonal = 0;
            character.setDirection(dir);
        } else {
            character._diagonal = dir;
            character.diagonalDirection();
        }
    }

    $f.setDirection = setDirection;

    $f.loadProgress = () => {
        goodAnswers = new Map(Object.entries($nv.progress));
        quizLevel = [...goodAnswers.values()].reduce((acc, curr) => Math.max(acc, curr[1]), 1);
    };

    $f.rememberProgress = (question, quizLevel, isCorrect) => {
        const answerValue = (goodAnswers.get(question) || [ 0, quizLevel ]);

        answerValue[1] = quizLevel;
        answerValue[0] = isCorrect
            ? (Math.max(answerValue[0], 0) + 1)
            : (Math.min(answerValue[0], 0) - 1);

        goodAnswers.set(question, answerValue);
        $nv.progress[question] = answerValue;

        Game_Interpreter.prototype.pluginCommand('Persistent', ['Save']);
    }

    $f.setDictionaryText = () => {
        $nv.dictionaryText = getDictionaryText();
    };

    function getDictionaryText() {
        const entries = getDictionaryEntries();
        if (!entries.length) {
            return;
        }

        return entries.join('\n');
    }

    const dictionaryScoreThreshold = 1;
    const dictionaryPageLength = 16;
    let dictionaryEntryIndex = 0;
    let dictionaryEntries = [];
    function getDictionaryEntries() {
        if (dictionaryEntryIndex === 0) {
            dictionaryEntries = $gameMap.events()
                .filter(event => event && !event._erased && event.event().meta && event.event().meta.enemy && (goodAnswers.get(event.quiz.question) || [ 0 ])[0] <= dictionaryScoreThreshold)
                .map(enemy => `\\c[3]${enemy.quiz.question}\\c[0]: ${enemy.quiz.answers[enemy.quiz.correct]}`);
        }

        if (dictionaryEntryIndex < dictionaryEntries.length) {
            dictionaryEntryIndex += dictionaryPageLength;
            return dictionaryEntries.slice(dictionaryEntryIndex - dictionaryPageLength, dictionaryEntryIndex);
        } else {
            dictionaryEntryIndex = 0;
            return dictionaryEntries = [];
        }
    }

    let quizData = null;
    let quizAnswersMap = null;
    fetch('js/plugins/data/id/quiz.json')
        .then(response => response.json())
        .then(data => quizData = data)
        .then(() => quizAnswersMap = new Map(quizData.map(quiz => [ quiz.question, quiz.answer ])));

})();
