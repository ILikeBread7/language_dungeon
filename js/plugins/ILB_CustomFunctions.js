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
    fetch('js/plugins/data/id_sentences.json')
        .then(response => response.json())
        .then(data => sentences = data);

    let dictionary = null;
    let dictionaryMap = null;
    fetch('js/plugins/data/ja-id-wiktionary.json')
        .then(response => response.json())
        .then(data => dictionary = data)
        .then(data => dictionaryMap = new Map(data.map(entry => [ entry.word, entry ])));

    function getGloss(word) {
        const entry = dictionaryMap.get(word);
        if (!entry) {
            return `== no gloss: ${quizAnswersMap.get(word)} ==`;
        }
        return mapEntryToGloss(entry);
    }

    function mapEntryToGloss(entry) {
        return entry.senses.map(sense => sense.glosses.join(', ')).join('; ');
    }

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
        if ($gameSwitches.value(1)) { // Attack cancelled
            $gameSwitches.setValue(1, false);
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
    }

    let alreadyAsked = [];
    function pickRandomEligibleQuestion() {
        const goodAnswersFilter = QUIZ_START + getQuizEntriesNumber(quizLevel) > quizData.length
            ? () => true
            : entry => {
                const [ score, lastAnsweredQuizLevel ] = goodAnswers.get(entry.question) || [ 0, quizLevel ];
                return score <= Math.log2(quizLevel - lastAnsweredQuizLevel + 1);
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

        let randomQuestion = pickRandomEligibleQuestion();
        while (!randomQuestion) {
            quizLevel++;
            randomQuestion = pickRandomEligibleQuestion();
        }
        alreadyAsked.push(randomQuestion);

        const questionGloss = getGloss(randomQuestion.question);
        const answers = [ questionGloss ];
        for (let i = 0; i < 3; i++) {
            let randomAnswer;
            let answer;
            do {
                randomAnswer = pickRandom(quizData, QUIZ_START, getQuizEntriesNumber(quizLevel));
                answer = getGloss(randomAnswer.question);
            } while (answers.includes(answer));
            answers.push(answer);
        }

        shuffle(answers);
        const correctIndex = answers.findIndex(answer => answer === questionGloss);
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

        $gameVariables.setValue(4, quiz.question);

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

        $gameVariables.setValue(9, quiz.correct);
        $gameVariables.setValue(
            16,
            addWordTranslations(
                addWordColor(
                    getExampleSentence(quiz.question),
                    quiz.question
                ),
                quiz
            )
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
                    `$1${SPACE_CODE}${LEFT_PAREN_CODE}${getGloss(word).replace(/ /g, SPACE_CODE)}${RIGHT_PAREN_CODE}`
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
            if (enemyEvent.event().meta.portalEnemy) {
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
        goodAnswers = new Map(Object.entries(getProgressVar()));
        quizLevel = [...goodAnswers.values()].reduce((acc, curr) => Math.max(acc, curr[1]), 1);
    };

    $f.rememberProgress = (question, quizLevel, isCorrect) => {
        const answerValue = (goodAnswers.get(question) || [ 0, quizLevel ]);

        answerValue[1] = quizLevel;
        answerValue[0] = isCorrect
            ? (Math.max(answerValue[0], 0) + 1)
            : (Math.min(answerValue[0], 0) - 1);

        goodAnswers.set(question, answerValue);
        getProgressVar()[question] = answerValue;

        Game_Interpreter.prototype.pluginCommand('Persistent', ['Save']);
    }

    function getProgressVar() {
        const PROGRESS_VAR_ID = 10;
        let progressVar = $gameVariables.value(PROGRESS_VAR_ID);
        if (typeof progressVar !== 'object') {
            progressVar = {};
            $gameVariables.setValue(PROGRESS_VAR_ID, progressVar);
        }
        return progressVar;
    }

    $f.setDictionaryText = () => {
        const DICTIONARY_TEXT_VAR_ID = 17;
        const text = getDictionaryText();
        $gameVariables.setValue(DICTIONARY_TEXT_VAR_ID, text);
    };

    function getDictionaryText() {
        const entries = getDictionaryEntries();
        if (!entries.length) {
            return;
        }

        return entries.join('\n');
    }

    const dictionaryPageLength = 16;
    let dictionaryEntryIndex = 0;
    let dictionaryEntries = [];
    function getDictionaryEntries() {
        if (dictionaryEntryIndex === 0) {
            dictionaryEntries = $gameMap.events()
                .filter(event => event && !event._erased && event.event().meta && event.event().meta.enemy && (goodAnswers.get(event.quiz.question) || [ 0 ])[0] <= 0)
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

    const quizData = [
        {
            "question": "aku",
            "answer": "私/僕、私（僕）の"
        },
        {
            "question": "kau",
            "answer": "あなた"
        },
        {
            "question": "yang",
            "answer": "～するもの"
        },
        {
            "question": "tidak",
            "answer": "いいえ"
        },
        {
            "question": "ini",
            "answer": "（近称代名詞）これ、この"
        },
        {
            "question": "itu",
            "answer": "（中称、遠称代名詞）それ/あれ、その/あの"
        },
        {
            "question": "dan",
            "answer": "（等位接続）～と、及び;（順接）そして"
        },
        {
            "question": "dia",
            "answer": "彼/彼女（男女を区別しない）、あの人"
        },
        {
            "question": "di",
            "answer": "- で（場所を表す）"
        },
        {
            "question": "akan",
            "answer": "意思"
        },
        {
            "question": "apa",
            "answer": "案内所"
        },
        {
            "question": "kita",
            "answer": "私達（二人称を含む一人称複数）"
        },
        {
            "question": "untuk",
            "answer": "〜するために"
        },
        {
            "question": "bisa",
            "answer": "できる"
        },
        {
            "question": "ada",
            "answer": "有る、いる;持つ"
        },
        {
            "question": "tak",
            "answer": "ない"
        },
        {
            "question": "mereka",
            "answer": "rekaの能動形"
        },
        {
            "question": "anda",
            "answer": "あなた"
        },
        {
            "question": "tahu",
            "answer": "知る"
        },
        {
            "question": "dengan",
            "answer": "（動作の相手方）～と;（手段）～で;（形容詞の副詞化）～で"
        },
        {
            "question": "saya",
            "answer": "私、私の"
        },
        {
            "question": "dari",
            "answer": "から"
        },
        {
            "question": "ya",
            "answer": "はい"
        },
        {
            "question": "tapi",
            "answer": "しかし"
        },
        {
            "question": "kami",
            "answer": "私達（二人称を含まない一人称複数）"
        },
        {
            "question": "ke",
            "answer": "- へ（方向）"
        },
        {
            "question": "harus",
            "answer": "しなければならない"
        },
        {
            "question": "sudah",
            "answer": "すでに"
        },
        {
            "question": "kamu",
            "answer": "あなた"
        },
        {
            "question": "adalah",
            "answer": "～である"
        },
        {
            "question": "orang",
            "answer": "なぜならば"
        },
        {
            "question": "saja",
            "answer": "ただ"
        },
        {
            "question": "seperti",
            "answer": "のように"
        },
        {
            "question": "ingin",
            "answer": "したい"
        },
        {
            "question": "jika",
            "answer": "もし"
        },
        {
            "question": "pergi",
            "answer": "行く"
        },
        {
            "question": "hanya",
            "answer": "のみ"
        },
        {
            "question": "semua",
            "answer": "全ての"
        },
        {
            "question": "sekarang",
            "answer": "今"
        },
        {
            "question": "sini",
            "answer": "（指示代名詞）ここ"
        },
        {
            "question": "jadi",
            "answer": "それで"
        },
        {
            "question": "dalam",
            "answer": "〜の内部に、内側に;〜以内に"
        },
        {
            "question": "bukan",
            "answer": "いいえ"
        },
        {
            "question": "baik",
            "answer": "よろしい、了解、オーケー"
        },
        {
            "question": "bagaimana",
            "answer": "どう、いくら、どのような、どのように"
        },
        {
            "question": "jangan",
            "answer": "しないでください"
        },
        {
            "question": "lagi",
            "answer": "再び"
        },
        {
            "question": "punya",
            "answer": "～を持つ、～を所有する"
        },
        {
            "question": "lebih",
            "answer": "もっと、更に"
        },
        {
            "question": "oh",
            "answer": "おお"
        },
        {
            "question": "pada",
            "answer": "の上"
        },
        {
            "question": "mungkin",
            "answer": "可能"
        },
        {
            "question": "kalian",
            "answer": "あなた"
        },
        {
            "question": "lakukan",
            "answer": "する"
        },
        {
            "question": "karena",
            "answer": "（疑問詞mengapa、kenapa等に応えて）なぜならば"
        },
        {
            "question": "sangat",
            "answer": "とても"
        },
        {
            "question": "satu",
            "answer": "一"
        },
        {
            "question": "juga",
            "answer": "～もまた"
        },
        {
            "question": "apakah",
            "answer": "（疑問詞、文頭において文の内容について疑問文を構成する）～ですか？"
        },
        {
            "question": "mau",
            "answer": "～がほしい、～をしたい"
        },
        {
            "question": "pernah",
            "answer": "一度"
        },
        {
            "question": "siapa",
            "answer": "誰"
        },
        {
            "question": "telah",
            "answer": "すでに"
        },
        {
            "question": "ayo",
            "answer": "来て"
        },
        {
            "question": "hal",
            "answer": "案件"
        },
        {
            "question": "saat",
            "answer": "一瞬"
        },
        {
            "question": "kenapa",
            "answer": "なぜ"
        },
        {
            "question": "hari",
            "answer": "日;昼;1日"
        },
        {
            "question": "kembali",
            "answer": "戻る"
        },
        {
            "question": "atau",
            "answer": "または"
        },
        {
            "question": "datang",
            "answer": "来る"
        },
        {
            "question": "begitu",
            "answer": "それで"
        },
        {
            "question": "sesuatu",
            "answer": "何か"
        },
        {
            "question": "banyak",
            "answer": "大変、とても"
        },
        {
            "question": "benar",
            "answer": "正しい"
        },
        {
            "question": "kasih",
            "answer": "愛情"
        },
        {
            "question": "menjadi",
            "answer": "なる"
        },
        {
            "question": "melihat",
            "answer": "見る"
        },
        {
            "question": "terjadi",
            "answer": "起こる"
        },
        {
            "question": "melakukan",
            "answer": "する"
        },
        {
            "question": "terima",
            "answer": "受け取る"
        },
        {
            "question": "tentang",
            "answer": "について"
        },
        {
            "question": "lihat",
            "answer": "見て"
        },
        {
            "question": "seorang",
            "answer": "1つの"
        },
        {
            "question": "bahwa",
            "answer": "それ"
        },
        {
            "question": "kalau",
            "answer": "もし〜なら;〜の時"
        },
        {
            "question": "hei",
            "answer": "おい"
        },
        {
            "question": "bagus",
            "answer": "（物が）よい、美しい、すてきな"
        },
        {
            "question": "bilang",
            "answer": "言った"
        },
        {
            "question": "masih",
            "answer": "まだ"
        },
        {
            "question": "oke",
            "answer": "わかった"
        },
        {
            "question": "lain",
            "answer": "他の"
        },
        {
            "question": "sana",
            "answer": "そこ/あそこ（に、で）"
        },
        {
            "question": "waktu",
            "answer": "時間"
        },
        {
            "question": "baiklah",
            "answer": "わかった"
        },
        {
            "question": "tempat",
            "answer": "場所"
        },
        {
            "question": "mana",
            "answer": "どこ;どの、どちら;どれ"
        },
        {
            "question": "keluar",
            "answer": "外出"
        },
        {
            "question": "lalu",
            "answer": "それから"
        },
        {
            "question": "malam",
            "answer": "新鮮でない野菜"
        },
        {
            "question": "maaf",
            "answer": "ごめんなさい;すみません、失礼します"
        },
        {
            "question": "membuat",
            "answer": "作る"
        },
        {
            "question": "mati",
            "answer": "死ぬ"
        },
        {
            "question": "sedang",
            "answer": "現在"
        },
        {
            "question": "memiliki",
            "answer": "自分の"
        },
        {
            "question": "tahun",
            "answer": "年"
        },
        {
            "question": "sekali",
            "answer": "一度;とても、非常に"
        },
        {
            "question": "sampai",
            "answer": "それまで"
        },
        {
            "question": "anak",
            "answer": "子供"
        },
        {
            "question": "baru",
            "answer": "新しい"
        },
        {
            "question": "dapat",
            "answer": "できる"
        },
        {
            "question": "beberapa",
            "answer": "多数の"
        },
        {
            "question": "ayah",
            "answer": "父親"
        },
        {
            "question": "sendiri",
            "answer": "一人で"
        },
        {
            "question": "katakan",
            "answer": "言う"
        },
        {
            "question": "hidup",
            "answer": "生きる、住む、生活する"
        },
        {
            "question": "mengapa",
            "answer": "なぜ"
        },
        {
            "question": "sebuah",
            "answer": "あ"
        },
        {
            "question": "perlu",
            "answer": "必要"
        },
        {
            "question": "kan",
            "answer": "右"
        },
        {
            "question": "sama",
            "answer": "同じ;等しい;（～と）ともに、一緒に"
        },
        {
            "question": "tunggu",
            "answer": "待って"
        },
        {
            "question": "salah",
            "answer": "間違っている"
        },
        {
            "question": "semuanya",
            "answer": "全て"
        },
        {
            "question": "rumah",
            "answer": "家庭;家、家屋"
        },
        {
            "question": "mengatakan",
            "answer": "言う"
        },
        {
            "question": "ia",
            "answer": "彼/彼女（男女を区別しない）、あの人"
        },
        {
            "question": "ketika",
            "answer": "〜の間中"
        },
        {
            "question": "masuk",
            "answer": "入力"
        },
        {
            "question": "cepat",
            "answer": "速い"
        },
        {
            "question": "dengar",
            "answer": "聞こえる;聞く"
        },
        {
            "question": "besar",
            "answer": "大きい"
        },
        {
            "question": "padaku",
            "answer": "私にとって"
        },
        {
            "question": "disini",
            "answer": "ここ"
        },
        {
            "question": "pikir",
            "answer": "考える;推測する、断定する"
        },
        {
            "question": "pasti",
            "answer": "ある"
        },
        {
            "question": "yg",
            "answer": "どれの"
        },
        {
            "question": "ibu",
            "answer": "母親;（呼びかけ）奥様, ご婦人"
        },
        {
            "question": "masalah",
            "answer": "問題"
        },
        {
            "question": "benar-benar",
            "answer": "本当に"
        },
        {
            "question": "belum",
            "answer": "まだ"
        },
        {
            "question": "pak",
            "answer": "パック"
        },
        {
            "question": "bicara",
            "answer": "話す"
        },
        {
            "question": "dua",
            "answer": "二"
        },
        {
            "question": "tentu",
            "answer": "もちろん"
        },
        {
            "question": "selamat",
            "answer": "安全な、平和な"
        },
        {
            "question": "cukup",
            "answer": "十分"
        },
        {
            "question": "selalu",
            "answer": "いつも"
        },
        {
            "question": "tuhan",
            "answer": "主"
        },
        {
            "question": "suka",
            "answer": "好む、好きである;愛する;（動詞の前に付いて）よく〜する"
        },
        {
            "question": "yeah",
            "answer": "うん"
        },
        {
            "question": "seseorang",
            "answer": "誰か"
        },
        {
            "question": "melakukannya",
            "answer": "それをやる"
        },
        {
            "question": "pria",
            "answer": "男"
        },
        {
            "question": "setelah",
            "answer": "後"
        },
        {
            "question": "mengerti",
            "answer": "理解する"
        },
        {
            "question": "baik-baik",
            "answer": "大丈夫"
        },
        {
            "question": "tolong",
            "answer": "ヘルプ"
        },
        {
            "question": "dimana",
            "answer": "どこ"
        },
        {
            "question": "bahkan",
            "answer": "平"
        },
        {
            "question": "apa-apa",
            "answer": "何でも"
        },
        {
            "question": "berada",
            "answer": "～で起こる;～にある"
        },
        {
            "question": "menemukan",
            "answer": "探す"
        },
        {
            "question": "sedikit",
            "answer": "少ない、少しの;僅かな"
        },
        {
            "question": "bertemu",
            "answer": "会う"
        },
        {
            "question": "mendapatkan",
            "answer": "得る"
        },
        {
            "question": "percaya",
            "answer": "信じる"
        },
        {
            "question": "oleh",
            "answer": "による"
        },
        {
            "question": "makan",
            "answer": "食べる"
        },
        {
            "question": "lama",
            "answer": "（時間が）長い;古い;古代の"
        },
        {
            "question": "atas",
            "answer": "の上"
        },
        {
            "question": "ku",
            "answer": "私の"
        },
        {
            "question": "tinggal",
            "answer": "暮らす、住む"
        },
        {
            "question": "bekerja",
            "answer": "仕事"
        },
        {
            "question": "terlalu",
            "answer": "あまりにも"
        },
        {
            "question": "wanita",
            "answer": "女性"
        },
        {
            "question": "sebagai",
            "answer": "として"
        },
        {
            "question": "padamu",
            "answer": "あなたへ"
        },
        {
            "question": "sayang",
            "answer": "愛している"
        },
        {
            "question": "kali",
            "answer": "時間"
        },
        {
            "question": "tetap",
            "answer": "まだ"
        },
        {
            "question": "yakin",
            "answer": "ある"
        },
        {
            "question": "hey",
            "answer": "おい"
        },
        {
            "question": "cara",
            "answer": "方法"
        },
        {
            "question": "berhenti",
            "answer": "停止"
        },
        {
            "question": "jalan",
            "answer": "～を通り過ぎる、行く"
        },
        {
            "question": "setiap",
            "answer": "（能動動詞の前に付いて）〜する毎に"
        },
        {
            "question": "berpikir",
            "answer": "考える"
        },
        {
            "question": "mulai",
            "answer": "始まる"
        },
        {
            "question": "dunia",
            "answer": "世界"
        },
        {
            "question": "mari",
            "answer": "させて"
        },
        {
            "question": "membunuh",
            "answer": "殺す;圧倒する"
        },
        {
            "question": "selama",
            "answer": "その間"
        },
        {
            "question": "luar",
            "answer": "外"
        },
        {
            "question": "kecil",
            "answer": "小さい;わずかな;狭い"
        },
        {
            "question": "pertama",
            "answer": "第一の、一番目の、最初の"
        },
        {
            "question": "sebelum",
            "answer": "前に"
        },
        {
            "question": "diri",
            "answer": "人"
        },
        {
            "question": "bersama",
            "answer": "一緒に"
        },
        {
            "question": "mengambil",
            "answer": "取る"
        },
        {
            "question": "boleh",
            "answer": "（許可）～してもよい"
        },
        {
            "question": "the",
            "answer": "その"
        },
        {
            "question": "merasa",
            "answer": "感じる"
        },
        {
            "question": "mencari",
            "answer": "探す"
        },
        {
            "question": "uang",
            "answer": "お金"
        },
        {
            "question": "apapun",
            "answer": "何でも"
        },
        {
            "question": "senang",
            "answer": "のように"
        },
        {
            "question": "butuh",
            "answer": "必要"
        },
        {
            "question": "kurasa",
            "answer": "私は思う"
        },
        {
            "question": "ayolah",
            "answer": "来て"
        },
        {
            "question": "teman",
            "answer": "ともだち、友人"
        },
        {
            "question": "sebenarnya",
            "answer": "実は"
        },
        {
            "question": "mencoba",
            "answer": "試す"
        },
        {
            "question": "gadis",
            "answer": "女の子"
        },
        {
            "question": "dulu",
            "answer": "かつて、以前に"
        },
        {
            "question": "tanpa",
            "answer": "〜なしで"
        },
        {
            "question": "jam",
            "answer": "時"
        },
        {
            "question": "denganmu",
            "answer": "あなたと"
        },
        {
            "question": "takkan",
            "answer": "しません"
        },
        {
            "question": "buruk",
            "answer": "醜い;（物が）悪い"
        },
        {
            "question": "para",
            "answer": "のために"
        },
        {
            "question": "polisi",
            "answer": "警察"
        },
        {
            "question": "membawa",
            "answer": "持ってくる"
        },
        {
            "question": "yah",
            "answer": "はい"
        },
        {
            "question": "berapa",
            "answer": "どれくらい.;いくつ;いくら"
        },
        {
            "question": "orang-orang",
            "answer": "人々"
        },
        {
            "question": "itulah",
            "answer": "それでおしまい"
        },
        {
            "question": "ingat",
            "answer": "覚えて"
        },
        {
            "question": "kemudian",
            "answer": "それから"
        },
        {
            "question": "siap",
            "answer": "準備ができて"
        },
        {
            "question": "biarkan",
            "answer": "させて"
        },
        {
            "question": "maksudku",
            "answer": "つまり"
        },
        {
            "question": "terus",
            "answer": "続けて"
        },
        {
            "question": "gila",
            "answer": "クレイジー"
        },
        {
            "question": "pun",
            "answer": "平"
        },
        {
            "question": "tuan",
            "answer": "お客様"
        },
        {
            "question": "sakit",
            "answer": "病気の"
        },
        {
            "question": "tidur",
            "answer": "睡眠"
        },
        {
            "question": "pulang",
            "answer": "家に帰れ"
        },
        {
            "question": "segera",
            "answer": "素早い"
        },
        {
            "question": "seharusnya",
            "answer": "すべき"
        },
        {
            "question": "kepada",
            "answer": "（人）に、へ"
        },
        {
            "question": "memang",
            "answer": "もちろん"
        },
        {
            "question": "takut",
            "answer": "恐れている"
        },
        {
            "question": "dirimu",
            "answer": "あなた自身"
        },
        {
            "question": "halo",
            "answer": "こんにちは"
        },
        {
            "question": "terlihat",
            "answer": "見た"
        },
        {
            "question": "nama",
            "answer": "名前"
        },
        {
            "question": "i",
            "answer": "私"
        },
        {
            "question": "sial",
            "answer": "不運"
        },
        {
            "question": "berbicara",
            "answer": "話す"
        },
        {
            "question": "minta",
            "answer": "～を請う"
        },
        {
            "question": "kota",
            "answer": "市"
        },
        {
            "question": "mobil",
            "answer": "車"
        },
        {
            "question": "membantu",
            "answer": "ヘルプ"
        },
        {
            "question": "terakhir",
            "answer": "ファイナル"
        },
        {
            "question": "biasa",
            "answer": "普通"
        },
        {
            "question": "cinta",
            "answer": "愛する;切望する;心配する;悲しむ"
        },
        {
            "question": "mu",
            "answer": "あなたの"
        },
        {
            "question": "depan",
            "answer": "フロント"
        },
        {
            "question": "sepertinya",
            "answer": "それは"
        },
        {
            "question": "sebentar",
            "answer": "ちょっと"
        },
        {
            "question": "padanya",
            "answer": "彼に"
        },
        {
            "question": "rasa",
            "answer": "風味"
        },
        {
            "question": "bagian",
            "answer": "一部"
        },
        {
            "question": "bodoh",
            "answer": "バカ"
        },
        {
            "question": "sialan",
            "answer": "くそ"
        },
        {
            "question": "manusia",
            "answer": "男"
        },
        {
            "question": "tiga",
            "answer": "三"
        },
        {
            "question": "berhasil",
            "answer": "成功する"
        },
        {
            "question": "sungguh",
            "answer": "本当に"
        },
        {
            "question": "mendengar",
            "answer": "聞く"
        },
        {
            "question": "tepat",
            "answer": "適切な"
        },
        {
            "question": "bawah",
            "answer": "より低い"
        },
        {
            "question": "berikan",
            "answer": "与える"
        },
        {
            "question": "ambil",
            "answer": "取る"
        },
        {
            "question": "pagi",
            "answer": "朝、午前"
        },
        {
            "question": "air",
            "answer": "水;液、液体"
        },
        {
            "question": "keluarga",
            "answer": "家族;親族"
        },
        {
            "question": "hai",
            "answer": "やあ、こんにちは"
        },
        {
            "question": "bawa",
            "answer": "持ってくる"
        },
        {
            "question": "kehilangan",
            "answer": "失った"
        },
        {
            "question": "maafkan",
            "answer": "私を許して"
        },
        {
            "question": "untukmu",
            "answer": "あなたのために"
        },
        {
            "question": "nanti",
            "answer": "後で"
        },
        {
            "question": "bagi",
            "answer": "のために"
        },
        {
            "question": "tangan",
            "answer": "手"
        },
        {
            "question": "hebat",
            "answer": "素晴らしい"
        },
        {
            "question": "s",
            "answer": "s"
        },
        {
            "question": "menunggu",
            "answer": "待って"
        },
        {
            "question": "ikut",
            "answer": "フォローする"
        },
        {
            "question": "melihatnya",
            "answer": "見る"
        },
        {
            "question": "masa",
            "answer": "時間"
        },
        {
            "question": "jauh",
            "answer": "遠くに"
        },
        {
            "question": "pekerjaan",
            "answer": "仕事"
        },
        {
            "question": "ah",
            "answer": "ああ"
        },
        {
            "question": "you",
            "answer": "あなた"
        },
        {
            "question": "berdua",
            "answer": "一緒に"
        },
        {
            "question": "paling",
            "answer": "ほとんど"
        },
        {
            "question": "peduli",
            "answer": "ケア"
        },
        {
            "question": "aneh",
            "answer": "奇妙な"
        },
        {
            "question": "anak-anak",
            "answer": "子供たち"
        },
        {
            "question": "penting",
            "answer": "重要な"
        },
        {
            "question": "tadi",
            "answer": "以前"
        },
        {
            "question": "si",
            "answer": "シ"
        },
        {
            "question": "selesai",
            "answer": "終わる"
        },
        {
            "question": "seluruh",
            "answer": "いたるところ"
        },
        {
            "question": "ok",
            "answer": "わかった"
        },
        {
            "question": "meninggalkan",
            "answer": "離れる"
        },
        {
            "question": "cuma",
            "answer": "ただ、もっぱら;単純に"
        },
        {
            "question": "suatu",
            "answer": "何か"
        },
        {
            "question": "terbaik",
            "answer": "最高"
        },
        {
            "question": "khawatir",
            "answer": "心配"
        },
        {
            "question": "tua",
            "answer": "古い"
        },
        {
            "question": "memberikan",
            "answer": "与える"
        },
        {
            "question": "tenang",
            "answer": "落ち着いた"
        },
        {
            "question": "hentikan",
            "answer": "停止"
        },
        {
            "question": "disana",
            "answer": "そこには"
        },
        {
            "question": "bisakah",
            "answer": "できる"
        },
        {
            "question": "coba",
            "answer": "試す"
        },
        {
            "question": "uh",
            "answer": "えーと"
        },
        {
            "question": "menit",
            "answer": "分"
        },
        {
            "question": "sekolah",
            "answer": "学校"
        },
        {
            "question": "duduk",
            "answer": "座って下さい"
        },
        {
            "question": "sebelumnya",
            "answer": "以前"
        },
        {
            "question": "secara",
            "answer": "ある意味で"
        },
        {
            "question": "maka",
            "answer": "それで"
        },
        {
            "question": "besok",
            "answer": "明日"
        },
        {
            "question": "minum",
            "answer": "～を飲む"
        },
        {
            "question": "tn",
            "answer": "氏"
        },
        {
            "question": "berarti",
            "answer": "手段"
        },
        {
            "question": "a",
            "answer": "1つの"
        },
        {
            "question": "bulan",
            "answer": "月;衛星;月、暦月"
        },
        {
            "question": "bergerak",
            "answer": "動いている"
        },
        {
            "question": "sejak",
            "answer": "以来"
        },
        {
            "question": "hampir",
            "answer": "近づく"
        },
        {
            "question": "kemari",
            "answer": "ここ"
        },
        {
            "question": "kepala",
            "answer": "頭"
        },
        {
            "question": "astaga",
            "answer": "ああ、なんてことだ"
        },
        {
            "question": "tetapi",
            "answer": "しかし"
        },
        {
            "question": "soal",
            "answer": "質問"
        },
        {
            "question": "maksudmu",
            "answer": "もしかして"
        },
        {
            "question": "menggunakan",
            "answer": "使用"
        },
        {
            "question": "tau",
            "answer": "知る"
        },
        {
            "question": "diam",
            "answer": "静けさ"
        },
        {
            "question": "aman",
            "answer": "安全"
        },
        {
            "question": "berjalan",
            "answer": "歩く"
        },
        {
            "question": "buat",
            "answer": "のために"
        },
        {
            "question": "sulit",
            "answer": "難しい"
        },
        {
            "question": "senjata",
            "answer": "武器"
        },
        {
            "question": "iya",
            "answer": "はい"
        },
        {
            "question": "inginkan",
            "answer": "欲しい"
        },
        {
            "question": "kapan",
            "answer": "いつ"
        },
        {
            "question": "sekitar",
            "answer": "その周り"
        },
        {
            "question": "pintu",
            "answer": "ドア;方法"
        },
        {
            "question": "nak",
            "answer": "息子"
        },
        {
            "question": "ayahku",
            "answer": "私の父"
        },
        {
            "question": "memberi",
            "answer": "与える"
        },
        {
            "question": "hati",
            "answer": "心;肝臓"
        },
        {
            "question": "kesempatan",
            "answer": "チャンス"
        },
        {
            "question": "nah",
            "answer": "今"
        },
        {
            "question": "bermain",
            "answer": "遊ぶ"
        },
        {
            "question": "cari",
            "answer": "検索"
        },
        {
            "question": "dekat",
            "answer": "近い"
        },
        {
            "question": "mendapat",
            "answer": "得る"
        },
        {
            "question": "bukankah",
            "answer": "それはそうではない"
        },
        {
            "question": "jelas",
            "answer": "クリア"
        },
        {
            "question": "nya",
            "answer": "彼の"
        },
        {
            "question": "tim",
            "answer": "チーム"
        },
        {
            "question": "dengannya",
            "answer": "彼と一緒に"
        },
        {
            "question": "mudah",
            "answer": "簡単"
        },
        {
            "question": "akhirnya",
            "answer": "ついに"
        },
        {
            "question": "jatuh",
            "answer": "落ちる;倒れる;〜になる;起こる;挫折する;破産する"
        },
        {
            "question": "kumohon",
            "answer": "お願いします"
        },
        {
            "question": "denganku",
            "answer": "私と一緒に"
        },
        {
            "question": "agar",
            "answer": "となることによって"
        },
        {
            "question": "benarkah",
            "answer": "それは本当ですか"
        },
        {
            "question": "berakhir",
            "answer": "終わり"
        },
        {
            "question": "ayahmu",
            "answer": "あなたのお父さん"
        },
        {
            "question": "memberitahu",
            "answer": "あなたに伝えている"
        },
        {
            "question": "alasan",
            "answer": "理由"
        },
        {
            "question": "menarik",
            "answer": "面白い"
        },
        {
            "question": "cantik",
            "answer": "美しい"
        },
        {
            "question": "kawan",
            "answer": "友達"
        },
        {
            "question": "berubah",
            "answer": "変更された"
        },
        {
            "question": "kupikir",
            "answer": "私は思う"
        },
        {
            "question": "satu-satunya",
            "answer": "唯一の"
        },
        {
            "question": "keras",
            "answer": "難しい"
        },
        {
            "question": "mata",
            "answer": "目"
        },
        {
            "question": "dokter",
            "answer": "医者"
        },
        {
            "question": "lainnya",
            "answer": "他の"
        },
        {
            "question": "beritahu",
            "answer": "教えて"
        },
        {
            "question": "kemana",
            "answer": "どこへ"
        },
        {
            "question": "serius",
            "answer": "真面目な、真剣な、重大な、深刻な"
        },
        {
            "question": "kuat",
            "answer": "強い"
        },
        {
            "question": "bertanya",
            "answer": "聞く"
        },
        {
            "question": "minggu",
            "answer": "週;(大文字で始まる場合) 日曜日"
        },
        {
            "question": "meminta",
            "answer": "リクエスト"
        },
        {
            "question": "membuatku",
            "answer": "私を作る"
        },
        {
            "question": "kerja",
            "answer": "仕事"
        },
        {
            "question": "bunuh",
            "answer": "殺す"
        },
        {
            "question": "pergilah",
            "answer": "行く"
        },
        {
            "question": "kehidupan",
            "answer": "生活、生存"
        },
        {
            "question": "berbeda",
            "answer": "違う"
        },
        {
            "question": "berharap",
            "answer": "希望"
        },
        {
            "question": "bangun",
            "answer": "起きる"
        },
        {
            "question": "indah",
            "answer": "美しい"
        },
        {
            "question": "menurutmu",
            "answer": "あなたによると"
        },
        {
            "question": "beri",
            "answer": "与える"
        },
        {
            "question": "menyelamatkan",
            "answer": "保存"
        },
        {
            "question": "kata",
            "answer": "語、単語"
        },
        {
            "question": "hilang",
            "answer": "消える、無くなる;（気持ちが）収まる;忘れられる;（音が）次第に小さくなる;死ぬ、亡くなる"
        },
        {
            "question": "kabar",
            "answer": "報せ、便り、ニュース"
        },
        {
            "question": "darah",
            "answer": "血"
        },
        {
            "question": "dengarkan",
            "answer": "聞く"
        },
        {
            "question": "kamar",
            "answer": "部屋"
        },
        {
            "question": "lari",
            "answer": "走る"
        },
        {
            "question": "kulakukan",
            "answer": "私はします"
        },
        {
            "question": "berkata",
            "answer": "言った"
        },
        {
            "question": "menyenangkan",
            "answer": "楽しい"
        },
        {
            "question": "dilakukan",
            "answer": "終わり"
        },
        {
            "question": "kosong",
            "answer": "空の"
        },
        {
            "question": "b1",
            "answer": "b1"
        },
        {
            "question": "eh",
            "answer": "えー"
        },
        {
            "question": "belakang",
            "answer": "背中;後、裏;後"
        },
        {
            "question": "raja",
            "answer": "王"
        },
        {
            "question": "dasar",
            "answer": "ベース"
        },
        {
            "question": "bajingan",
            "answer": "ろくでなし"
        },
        {
            "question": "biar",
            "answer": "させて"
        },
        {
            "question": "makanan",
            "answer": "食べ物、食物、食料、料理"
        },
        {
            "question": "bantuan",
            "answer": "ヘルプ"
        },
        {
            "question": "dapatkan",
            "answer": "得る"
        },
        {
            "question": "meninggal",
            "answer": "死ぬ"
        },
        {
            "question": "ruang",
            "answer": "部屋"
        },
        {
            "question": "demi",
            "answer": "のために"
        },
        {
            "question": "kedua",
            "answer": "二番目に"
        },
        {
            "question": "kekuatan",
            "answer": "強さ"
        },
        {
            "question": "marah",
            "answer": "怒り"
        },
        {
            "question": "membiarkan",
            "answer": "させて"
        },
        {
            "question": "lepaskan",
            "answer": "手放す"
        },
        {
            "question": "daripada",
            "answer": "（比較）〜よりも;（人）から"
        },
        {
            "question": "buku",
            "answer": "本、書籍"
        },
        {
            "question": "it",
            "answer": "それ"
        },
        {
            "question": "4ch000000",
            "answer": "4ch000000"
        },
        {
            "question": "menikah",
            "answer": "結婚する"
        },
        {
            "question": "berusaha",
            "answer": "試す"
        },
        {
            "question": "diriku",
            "answer": "自分自身"
        },
        {
            "question": "fncandara",
            "answer": "フカンダラ"
        },
        {
            "question": "rencana",
            "answer": "プラン"
        },
        {
            "question": "telepon",
            "answer": "電話"
        },
        {
            "question": "kasus",
            "answer": "場合"
        },
        {
            "question": "perang",
            "answer": "戦争"
        },
        {
            "question": "pertanyaan",
            "answer": "質問"
        },
        {
            "question": "kapal",
            "answer": "ボート"
        },
        {
            "question": "belajar",
            "answer": "勉強する"
        },
        {
            "question": "suara",
            "answer": "声"
        },
        {
            "question": "amerika",
            "answer": "アメリカ人"
        },
        {
            "question": "lupa",
            "answer": "忘れる"
        },
        {
            "question": "lihatlah",
            "answer": "見てください"
        },
        {
            "question": "muda",
            "answer": "若い"
        },
        {
            "question": "pikirkan",
            "answer": "考えてみてください"
        },
        {
            "question": "ibumu",
            "answer": "あなたのお母さん"
        },
        {
            "question": "perjalanan",
            "answer": "旅"
        },
        {
            "question": "menuju",
            "answer": "行く"
        },
        {
            "question": "cerita",
            "answer": "話"
        },
        {
            "question": "permisi",
            "answer": "すみません"
        },
        {
            "question": "naik",
            "answer": "続けて"
        },
        {
            "question": "langsung",
            "answer": "直接"
        },
        {
            "question": "wow",
            "answer": "おお"
        },
        {
            "question": "paham",
            "answer": "理解する"
        },
        {
            "question": "antara",
            "answer": "間"
        },
        {
            "question": "membutuhkan",
            "answer": "必要"
        },
        {
            "question": "tinggi",
            "answer": "高い"
        },
        {
            "question": "t",
            "answer": "t"
        },
        {
            "question": "turun",
            "answer": "下"
        },
        {
            "question": "ide",
            "answer": "アイデア"
        },
        {
            "question": "4ah80",
            "answer": "4ah80"
        },
        {
            "question": "kaki",
            "answer": "足;フィート"
        },
        {
            "question": "penuh",
            "answer": "満杯"
        },
        {
            "question": "sendirian",
            "answer": "一人で"
        },
        {
            "question": "negara",
            "answer": "国、国家"
        },
        {
            "question": "lima",
            "answer": "5"
        },
        {
            "question": "ibuku",
            "answer": "私の母"
        },
        {
            "question": "namanya",
            "answer": "彼の名前"
        },
        {
            "question": "kematian",
            "answer": "死"
        },
        {
            "question": "anjing",
            "answer": "犬"
        },
        {
            "question": "berdiri",
            "answer": "立つ"
        },
        {
            "question": "to",
            "answer": "に"
        },
        {
            "question": "kecuali",
            "answer": "を除外する"
        },
        {
            "question": "kira",
            "answer": "考える"
        },
        {
            "question": "kapten",
            "answer": "キャプテン"
        },
        {
            "question": "rahasia",
            "answer": "機密"
        },
        {
            "question": "menang",
            "answer": "勝つ"
        },
        {
            "question": "and",
            "answer": "そして"
        },
        {
            "question": "menerima",
            "answer": "受け入れる"
        },
        {
            "question": "silakan",
            "answer": "どうぞ"
        },
        {
            "question": "tanah",
            "answer": "土壌、土;土地"
        },
        {
            "question": "bicarakan",
            "answer": "話す"
        },
        {
            "question": "lucu",
            "answer": "面白い"
        },
        {
            "question": "buka",
            "answer": "開ける"
        },
        {
            "question": "ch00ffff",
            "answer": "ch00ffff"
        },
        {
            "question": "melawan",
            "answer": "反対する"
        },
        {
            "question": "menunjukkan",
            "answer": "見せる"
        },
        {
            "question": "dirinya",
            "answer": "彼自身"
        },
        {
            "question": "um",
            "answer": "えーと"
        },
        {
            "question": "agen",
            "answer": "エージェント"
        },
        {
            "question": "melalui",
            "answer": "を通して"
        },
        {
            "question": "rasanya",
            "answer": "こんな感じ"
        },
        {
            "question": "sepanjang",
            "answer": "全体を通して"
        },
        {
            "question": "akhir",
            "answer": "終わり"
        },
        {
            "question": "bu",
            "answer": "奥様"
        },
        {
            "question": "artinya",
            "answer": "それはつまり"
        },
        {
            "question": "pilihan",
            "answer": "選択"
        },
        {
            "question": "nona",
            "answer": "逃す"
        },
        {
            "question": "terlambat",
            "answer": "遅い"
        },
        {
            "question": "pesta",
            "answer": "パーティー"
        },
        {
            "question": "mulia",
            "answer": "素晴らしい"
        },
        {
            "question": "membuatmu",
            "answer": "あなたを作る"
        },
        {
            "question": "membuatnya",
            "answer": "作る"
        },
        {
            "question": "untukku",
            "answer": "私にとって"
        },
        {
            "question": "temukan",
            "answer": "探す"
        },
        {
            "question": "semakin",
            "answer": "より"
        },
        {
            "question": "well",
            "answer": "良い"
        },
        {
            "question": "bung",
            "answer": "お前"
        },
        {
            "question": "kesalahan",
            "answer": "エラー"
        },
        {
            "question": "john",
            "answer": "ジョン"
        },
        {
            "question": "silahkan",
            "answer": "お願いします"
        },
        {
            "question": "lewat",
            "answer": "過去"
        },
        {
            "question": "mencintaimu",
            "answer": "愛している"
        },
        {
            "question": "sementara",
            "answer": "一時的"
        },
        {
            "question": "nomor",
            "answer": "番号"
        },
        {
            "question": "api",
            "answer": "火"
        },
        {
            "question": "memilih",
            "answer": "選ぶ"
        },
        {
            "question": "pesawat",
            "answer": "航空機"
        },
        {
            "question": "guru",
            "answer": "教師"
        },
        {
            "question": "bahagia",
            "answer": "ハッピー"
        },
        {
            "question": "waktunya",
            "answer": "時間"
        },
        {
            "question": "film",
            "answer": "映画"
        },
        {
            "question": "tiba",
            "answer": "到着"
        },
        {
            "question": "bantu",
            "answer": "ヘルプ"
        },
        {
            "question": "melihatmu",
            "answer": "またね"
        },
        {
            "question": "panas",
            "answer": "暑い;熱い"
        },
        {
            "question": "bumi",
            "answer": "大地、地"
        },
        {
            "question": "memakai",
            "answer": "使用"
        },
        {
            "question": "okay",
            "answer": "わかった"
        },
        {
            "question": "kubilang",
            "answer": "私は言った"
        },
        {
            "question": "menemukannya",
            "answer": "見つけた"
        },
        {
            "question": "segalanya",
            "answer": "すべて"
        },
        {
            "question": "setidaknya",
            "answer": "少なくとも"
        },
        {
            "question": "keren",
            "answer": "いいね"
        },
        {
            "question": "membunuhnya",
            "answer": "彼を殺す"
        },
        {
            "question": "no",
            "answer": "いいえ"
        },
        {
            "question": "jawab",
            "answer": "答え"
        },
        {
            "question": "hidupku",
            "answer": "私の人生"
        },
        {
            "question": "pesan",
            "answer": "メッセージ"
        },
        {
            "question": "bertahan",
            "answer": "耐える"
        },
        {
            "question": "bayi",
            "answer": "赤ちゃん"
        },
        {
            "question": "bahasa",
            "answer": "言葉、言語"
        },
        {
            "question": "kantor",
            "answer": "オフィス"
        },
        {
            "question": "putri",
            "answer": "王女、姫;女性;娘;女性の子孫"
        },
        {
            "question": "empat",
            "answer": "四"
        },
        {
            "question": "tinggalkan",
            "answer": "離れる"
        },
        {
            "question": "muncul",
            "answer": "現れる"
        },
        {
            "question": "omong",
            "answer": "話す"
        },
        {
            "question": "kenal",
            "answer": "知る"
        },
        {
            "question": "perusahaan",
            "answer": "会社"
        },
        {
            "question": "awal",
            "answer": "始まり"
        },
        {
            "question": "anakku",
            "answer": "私の子供"
        },
        {
            "question": "penjara",
            "answer": "刑務所"
        },
        {
            "question": "setuju",
            "answer": "同意する"
        },
        {
            "question": "nyata",
            "answer": "本物"
        },
        {
            "question": "sempurna",
            "answer": "完璧"
        },
        {
            "question": "semoga",
            "answer": "うまくいけば"
        },
        {
            "question": "janji",
            "answer": "約束"
        },
        {
            "question": "bercanda",
            "answer": "冗談を言う"
        },
        {
            "question": "tampak",
            "answer": "見た目"
        },
        {
            "question": "pembunuh",
            "answer": "殺人者"
        },
        {
            "question": "siapapun",
            "answer": "誰でも"
        },
        {
            "question": "menghancurkan",
            "answer": "破壊する"
        },
        {
            "question": "kesini",
            "answer": "ここに来て"
        },
        {
            "question": "membayar",
            "answer": "支払う"
        },
        {
            "question": "surat",
            "answer": "手紙"
        },
        {
            "question": "of",
            "answer": "の"
        },
        {
            "question": "kelas",
            "answer": "クラス"
        },
        {
            "question": "beruntung",
            "answer": "ラッキー"
        },
        {
            "question": "laki-laki",
            "answer": "男"
        },
        {
            "question": "tampaknya",
            "answer": "そうみたいです"
        },
        {
            "question": "whoa",
            "answer": "うわあ"
        },
        {
            "question": "ulang",
            "answer": "繰り返す"
        },
        {
            "question": "jumpa",
            "answer": "またね"
        },
        {
            "question": "sebaiknya",
            "answer": "すべき"
        },
        {
            "question": "menembak",
            "answer": "シュート"
        },
        {
            "question": "namun",
            "answer": "しかし"
        },
        {
            "question": "brengsek",
            "answer": "ジャーク"
        },
        {
            "question": "permainan",
            "answer": "ゲーム、遊戯;おもちゃ"
        },
        {
            "question": "bila",
            "answer": "いつ"
        },
        {
            "question": "hal-hal",
            "answer": "もの"
        },
        {
            "question": "sam",
            "answer": "サム"
        },
        {
            "question": "menjaga",
            "answer": "ガード"
        },
        {
            "question": "tahan",
            "answer": "立つ"
        },
        {
            "question": "sering",
            "answer": "頻繁"
        },
        {
            "question": "tutup",
            "answer": "閉鎖"
        },
        {
            "question": "sang",
            "answer": "その"
        },
        {
            "question": "jack",
            "answer": "ジャック"
        },
        {
            "question": "pembunuhan",
            "answer": "殺人"
        },
        {
            "question": "perintah",
            "answer": "注文"
        },
        {
            "question": "semacam",
            "answer": "種の"
        },
        {
            "question": "jahat",
            "answer": "邪悪な"
        },
        {
            "question": "hubungan",
            "answer": "繋がり"
        },
        {
            "question": "terbang",
            "answer": "飛ぶ"
        },
        {
            "question": "dingin",
            "answer": "冷たい;冷淡な"
        },
        {
            "question": "mendapatkannya",
            "answer": "それを得る"
        },
        {
            "question": "berikutnya",
            "answer": "次"
        },
        {
            "question": "mengetahui",
            "answer": "知る"
        },
        {
            "question": "pasukan",
            "answer": "軍"
        },
        {
            "question": "hati-hati",
            "answer": "気をつけて"
        },
        {
            "question": "laut",
            "answer": "海"
        },
        {
            "question": "by",
            "answer": "による"
        },
        {
            "question": "me",
            "answer": "自分"
        },
        {
            "question": "meskipun",
            "answer": "それでも"
        },
        {
            "question": "sehingga",
            "answer": "となることによって"
        },
        {
            "question": "membawanya",
            "answer": "持ってきて"
        },
        {
            "question": "sebabnya",
            "answer": "なぜ"
        },
        {
            "question": "huh",
            "answer": "はぁ"
        },
        {
            "question": "perempuan",
            "answer": "女性"
        },
        {
            "question": "segala",
            "answer": "全て"
        },
        {
            "question": "menangkap",
            "answer": "キャッチ"
        },
        {
            "question": "harusnya",
            "answer": "すべきだ"
        },
        {
            "question": "kurang",
            "answer": "足りない"
        },
        {
            "question": "tanda",
            "answer": "サイン"
        },
        {
            "question": "membeli",
            "answer": "買う、購入する"
        },
        {
            "question": "mundur",
            "answer": "一歩下がる"
        },
        {
            "question": "berbohong",
            "answer": "嘘"
        },
        {
            "question": "mesin",
            "answer": "機械"
        },
        {
            "question": "in",
            "answer": "で"
        },
        {
            "question": "barang",
            "answer": "品"
        },
        {
            "question": "berita",
            "answer": "ニュース"
        },
        {
            "question": "begini",
            "answer": "このような"
        },
        {
            "question": "bukti",
            "answer": "証拠"
        },
        {
            "question": "mimpi",
            "answer": "夢をみる"
        },
        {
            "question": "l",
            "answer": "l"
        },
        {
            "question": "bisnis",
            "answer": "仕事"
        },
        {
            "question": "bukanlah",
            "answer": "ではない"
        },
        {
            "question": "menangis",
            "answer": "泣く"
        },
        {
            "question": "tembak",
            "answer": "シュート"
        },
        {
            "question": "menulis",
            "answer": "書く"
        },
        {
            "question": "menelepon",
            "answer": "電話"
        },
        {
            "question": "berbahaya",
            "answer": "危険な"
        },
        {
            "question": "kukatakan",
            "answer": "私は言う"
        },
        {
            "question": "pikiran",
            "answer": "考え"
        },
        {
            "question": "mencuri",
            "answer": "窃盗"
        },
        {
            "question": "terluka",
            "answer": "負傷者"
        },
        {
            "question": "tersebut",
            "answer": "その"
        },
        {
            "question": "pakai",
            "answer": "着る、使う"
        },
        {
            "question": "berani",
            "answer": "勇敢な"
        },
        {
            "question": "dr.",
            "answer": "ドクター"
        },
        {
            "question": "agak",
            "answer": "それよりも"
        },
        {
            "question": "awak",
            "answer": "クルー"
        },
        {
            "question": "melindungi",
            "answer": "守る"
        },
        {
            "question": "benda",
            "answer": "物体"
        },
        {
            "question": "membaca",
            "answer": "読む"
        },
        {
            "question": "setengah",
            "answer": "半分"
        },
        {
            "question": "dariku",
            "answer": "私から"
        },
        {
            "question": "hitam",
            "answer": "黒い"
        },
        {
            "question": "ha",
            "answer": "ハ"
        },
        {
            "question": "musim",
            "answer": "季節"
        },
        {
            "question": "enak",
            "answer": "ニース"
        },
        {
            "question": "lagu",
            "answer": "歌"
        },
        {
            "question": "kemarin",
            "answer": "昨日"
        },
        {
            "question": "tubuh",
            "answer": "体"
        },
        {
            "question": "siang",
            "answer": "昼"
        },
        {
            "question": "man",
            "answer": "男"
        },
        {
            "question": "memikirkan",
            "answer": "考える"
        },
        {
            "question": "inilah",
            "answer": "ここにあります"
        },
        {
            "question": "bersalah",
            "answer": "有罪"
        },
        {
            "question": "mengirim",
            "answer": "送信"
        },
        {
            "question": "mengenai",
            "answer": "について"
        },
        {
            "question": "namaku",
            "answer": "私の名前"
        },
        {
            "question": "memutuskan",
            "answer": "決める"
        },
        {
            "question": "mengubah",
            "answer": "変化"
        },
        {
            "question": "saling",
            "answer": "お互い"
        },
        {
            "question": "harap",
            "answer": "お願いします"
        },
        {
            "question": "paman",
            "answer": "叔父"
        },
        {
            "question": "hingga",
            "answer": "それまで"
        },
        {
            "question": "mendengarkan",
            "answer": "聞く"
        },
        {
            "question": "selamanya",
            "answer": "永遠に"
        },
        {
            "question": "terhadap",
            "answer": "に"
        },
        {
            "question": "saudara",
            "answer": "あなた"
        },
        {
            "question": "hukum",
            "answer": "(物理学) 法則"
        },
        {
            "question": "menghilang",
            "answer": "消える"
        },
        {
            "question": "tugas",
            "answer": "タスク"
        },
        {
            "question": "betapa",
            "answer": "どうやって"
        },
        {
            "question": "hmm",
            "answer": "ふーむ"
        },
        {
            "question": "lupakan",
            "answer": "忘れて"
        },
        {
            "question": "obat",
            "answer": "薬"
        },
        {
            "question": "hadiah",
            "answer": "現在"
        },
        {
            "question": "manis",
            "answer": "甘い;魅力的な"
        },
        {
            "question": "sebelah",
            "answer": "隣接"
        },
        {
            "question": "bagiku",
            "answer": "私にとって"
        },
        {
            "question": "merasakan",
            "answer": "感じる"
        },
        {
            "question": "menghabiskan",
            "answer": "使い切る"
        },
        {
            "question": "fs60",
            "answer": "fs60"
        },
        {
            "question": "informasi",
            "answer": "情報"
        },
        {
            "question": "selain",
            "answer": "その上"
        },
        {
            "question": "new",
            "answer": "新しい"
        },
        {
            "question": "sisi",
            "answer": "側"
        },
        {
            "question": "kunci",
            "answer": "鍵"
        },
        {
            "question": "bebas",
            "answer": "自由の身の、捕らわれていない"
        },
        {
            "question": "juta",
            "answer": "～百万"
        },
        {
            "question": "istri",
            "answer": "妻"
        },
        {
            "question": "menyukai",
            "answer": "好む"
        },
        {
            "question": "mengikuti",
            "answer": "フォローする"
        },
        {
            "question": "my",
            "answer": "私の"
        },
        {
            "question": "keadaan",
            "answer": "状態、状況"
        },
        {
            "question": "milik",
            "answer": "所有する、持っている"
        },
        {
            "question": "pernikahan",
            "answer": "結婚式"
        },
        {
            "question": "saatnya",
            "answer": "時間だ"
        },
        {
            "question": "kukira",
            "answer": "私は思う"
        },
        {
            "question": "menyukainya",
            "answer": "大好きです。"
        },
        {
            "question": "entahlah",
            "answer": "知るか"
        },
        {
            "question": "kesana",
            "answer": "そこには"
        },
        {
            "question": "bersama-sama",
            "answer": "一緒に"
        },
        {
            "question": "benci",
            "answer": "嫌い"
        },
        {
            "question": "kakak",
            "answer": "兄"
        },
        {
            "question": "mengerikan",
            "answer": "恐ろしい"
        },
        {
            "question": "pindah",
            "answer": "動く"
        },
        {
            "question": "berat",
            "answer": "重い"
        },
        {
            "question": "sadar",
            "answer": "わかっている"
        },
        {
            "question": "m",
            "answer": "メートル"
        },
        {
            "question": "merah",
            "answer": "赤"
        },
        {
            "question": "pribadi",
            "answer": "個人的"
        },
        {
            "question": "arah",
            "answer": "方向"
        },
        {
            "question": "temanku",
            "answer": "私の友人"
        },
        {
            "question": "menyesal",
            "answer": "後悔"
        },
        {
            "question": "korban",
            "answer": "被害者"
        },
        {
            "question": "wajah",
            "answer": "顔"
        },
        {
            "question": "membuka",
            "answer": "開ける"
        },
        {
            "question": "enam",
            "answer": "六"
        },
        {
            "question": "presiden",
            "answer": "大統領;社長"
        },
        {
            "question": "inggris",
            "answer": "英語"
        },
        {
            "question": "bergabung",
            "answer": "参加する"
        },
        {
            "question": "lantai",
            "answer": "床"
        },
        {
            "question": "udara",
            "answer": "空気"
        },
        {
            "question": "melewati",
            "answer": "合格"
        },
        {
            "question": "anggota",
            "answer": "メンバー"
        },
        {
            "question": "batu",
            "answer": "石"
        },
        {
            "question": "gunakan",
            "answer": "使用"
        },
        {
            "question": "mengalami",
            "answer": "経験"
        },
        {
            "question": "jujur",
            "answer": "正直"
        },
        {
            "question": "pintar",
            "answer": "明晰な、利口な"
        },
        {
            "question": "sistem",
            "answer": "システム"
        },
        {
            "question": "putih",
            "answer": "白"
        },
        {
            "question": "mr",
            "answer": "氏"
        },
        {
            "question": "sibuk",
            "answer": "忙しい"
        },
        {
            "question": "menghentikan",
            "answer": "停止"
        },
        {
            "question": "memeriksa",
            "answer": "検査する"
        },
        {
            "question": "dimulai",
            "answer": "開始"
        },
        {
            "question": "berjanji",
            "answer": "約束"
        },
        {
            "question": "bola",
            "answer": "ボール"
        },
        {
            "question": "biasanya",
            "answer": "いつもの"
        },
        {
            "question": "nyonya",
            "answer": "夫人"
        },
        {
            "question": "keamanan",
            "answer": "安全"
        },
        {
            "question": "mampu",
            "answer": "有能"
        },
        {
            "question": "bintang",
            "answer": "星"
        },
        {
            "question": "gagal",
            "answer": "失敗"
        },
        {
            "question": "panjang",
            "answer": "長い"
        },
        {
            "question": "dolar",
            "answer": "ドル"
        },
        {
            "question": "bos",
            "answer": "ボス"
        },
        {
            "question": "musik",
            "answer": "音楽"
        },
        {
            "question": "panggil",
            "answer": "電話"
        },
        {
            "question": "kereta",
            "answer": "馬車"
        },
        {
            "question": "menyerah",
            "answer": "あきらめる"
        },
        {
            "question": "serangan",
            "answer": "攻撃"
        },
        {
            "question": "musuh",
            "answer": "敵"
        },
        {
            "question": "hi",
            "answer": "こんにちは"
        },
        {
            "question": "mohon",
            "answer": "お願いします"
        },
        {
            "question": "menyerang",
            "answer": "攻撃"
        },
        {
            "question": "tanganmu",
            "answer": "あなたの手"
        },
        {
            "question": "pakaian",
            "answer": "衣服、衣類"
        },
        {
            "question": "foto",
            "answer": "写真"
        },
        {
            "question": "membunuhmu",
            "answer": "あなたを殺す"
        },
        {
            "question": "akal",
            "answer": "理由"
        },
        {
            "question": "kartu",
            "answer": "カード"
        },
        {
            "question": "mencintai",
            "answer": "愛"
        },
        {
            "question": "perasaan",
            "answer": "フィーリング"
        },
        {
            "question": "tentara",
            "answer": "兵士"
        },
        {
            "question": "jenis",
            "answer": "タイプ"
        },
        {
            "question": "acara",
            "answer": "プログラム"
        },
        {
            "question": "seberapa",
            "answer": "いくら"
        },
        {
            "question": "matahari",
            "answer": "太陽"
        },
        {
            "question": "mandi",
            "answer": "水浴びをする"
        },
        {
            "question": "mempunyai",
            "answer": "持っている"
        },
        {
            "question": "toko",
            "answer": "店"
        },
        {
            "question": "membantumu",
            "answer": "あなたを助ける"
        },
        {
            "question": "maksud",
            "answer": "意味"
        },
        {
            "question": "tunjukkan",
            "answer": "見せる"
        },
        {
            "question": "kuharap",
            "answer": "願っています"
        },
        {
            "question": "petugas",
            "answer": "役員"
        },
        {
            "question": "kecelakaan",
            "answer": "事故"
        },
        {
            "question": "ruangan",
            "answer": "部屋"
        },
        {
            "question": "teman-teman",
            "answer": "友達"
        },
        {
            "question": "memanggil",
            "answer": "電話"
        },
        {
            "question": "makhluk",
            "answer": "生き物"
        },
        {
            "question": "kabur",
            "answer": "ぼやけた"
        },
        {
            "question": "apos",
            "answer": "アポス"
        },
        {
            "question": "ternyata",
            "answer": "それは"
        },
        {
            "question": "memulai",
            "answer": "始める"
        },
        {
            "question": "tengah",
            "answer": "〜している"
        },
        {
            "question": "detik",
            "answer": "2番"
        },
        {
            "question": "terbuka",
            "answer": "開ける"
        },
        {
            "question": "menurut",
            "answer": "によると"
        },
        {
            "question": "kulihat",
            "answer": "なるほど"
        },
        {
            "question": "kini",
            "answer": "今"
        },
        {
            "question": "hantu",
            "answer": "おばけ"
        },
        {
            "question": "jaga",
            "answer": "ガード"
        },
        {
            "question": "cocok",
            "answer": "適切な"
        },
        {
            "question": "tertawa",
            "answer": "笑う"
        },
        {
            "question": "posisi",
            "answer": "位置"
        },
        {
            "question": "namamu",
            "answer": "あなたの名前"
        },
        {
            "question": "selanjutnya",
            "answer": "さらに"
        },
        {
            "question": "mengatakannya",
            "answer": "言ってください"
        },
        {
            "question": "keberatan",
            "answer": "物体"
        },
        {
            "question": "mabuk",
            "answer": "酔っ払い"
        },
        {
            "question": "tertarik",
            "answer": "手形名宛人"
        },
        {
            "question": "catatan",
            "answer": "メモ"
        },
        {
            "question": "tujuan",
            "answer": "客観的"
        },
        {
            "question": "kanan",
            "answer": "右の"
        },
        {
            "question": "kalah",
            "answer": "失った"
        },
        {
            "question": "neraka",
            "answer": "地獄"
        },
        {
            "question": "pukul",
            "answer": "時刻"
        },
        {
            "question": "planet",
            "answer": "惑星"
        },
        {
            "question": "menyelesaikan",
            "answer": "仕上げる"
        },
        {
            "question": "khusus",
            "answer": "特別"
        },
        {
            "question": "panggilan",
            "answer": "呼び出し"
        },
        {
            "question": "masalahnya",
            "answer": "問題"
        },
        {
            "question": "hanyalah",
            "answer": "ただ"
        },
        {
            "question": "periksa",
            "answer": "チェック"
        },
        {
            "question": "hutan",
            "answer": "森"
        },
        {
            "question": "ditemukan",
            "answer": "見つかった"
        },
        {
            "question": "menonton",
            "answer": "時計"
        },
        {
            "question": "utara",
            "answer": "北の、北へ;北風の"
        },
        {
            "question": "utama",
            "answer": "主要"
        },
        {
            "question": "kamera",
            "answer": "カメラ"
        },
        {
            "question": "memberitahumu",
            "answer": "教えて"
        },
        {
            "question": "burung",
            "answer": "鳥"
        },
        {
            "question": "dewa",
            "answer": "神"
        },
        {
            "question": "ayahnya",
            "answer": "彼の父親"
        },
        {
            "question": "gak",
            "answer": "いいえ"
        },
        {
            "question": "cahaya",
            "answer": "光;光沢;光線"
        },
        {
            "question": "entah",
            "answer": "知るか"
        },
        {
            "question": "hah",
            "answer": "はぁ"
        },
        {
            "question": "pantas",
            "answer": "ちゃんとした"
        },
        {
            "question": "disebut",
            "answer": "と呼ばれる"
        },
        {
            "question": "menginginkan",
            "answer": "欲しい"
        },
        {
            "question": "pahlawan",
            "answer": "ヒーロー"
        },
        {
            "question": "terlibat",
            "answer": "関与した"
        },
        {
            "question": "operasi",
            "answer": "手術"
        },
        {
            "question": "situasi",
            "answer": "状況"
        },
        {
            "question": "melarikan",
            "answer": "走る"
        },
        {
            "question": "gambar",
            "answer": "写真"
        },
        {
            "question": "kejahatan",
            "answer": "犯罪"
        },
        {
            "question": "lee",
            "answer": "リー"
        },
        {
            "question": "misi",
            "answer": "ミッション"
        },
        {
            "question": "percayalah",
            "answer": "私を信じて"
        },
        {
            "question": "perhatian",
            "answer": "注意"
        },
        {
            "question": "gue",
            "answer": "私"
        },
        {
            "question": "on",
            "answer": "の上"
        },
        {
            "question": "don",
            "answer": "ドン"
        },
        {
            "question": "membunuhku",
            "answer": "私を殺して"
        },
        {
            "question": "menurutku",
            "answer": "私によると"
        },
        {
            "question": "sir",
            "answer": "お客様"
        },
        {
            "question": "kiri",
            "answer": "左の"
        },
        {
            "question": "kalinya",
            "answer": "初めて"
        },
        {
            "question": "ketakutan",
            "answer": "恐れている"
        },
        {
            "question": "menjual",
            "answer": "売る、販売する"
        },
        {
            "question": "kotak",
            "answer": "箱"
        },
        {
            "question": "terdengar",
            "answer": "聞いた"
        },
        {
            "question": "kuda",
            "answer": "馬"
        },
        {
            "question": "berguna",
            "answer": "役に立つ"
        },
        {
            "question": "sejauh",
            "answer": "の限り"
        },
        {
            "question": "pintunya",
            "answer": "ドア"
        },
        {
            "question": "alam",
            "answer": "自然"
        },
        {
            "question": "kemarilah",
            "answer": "ここに来て"
        },
        {
            "question": "mengganggu",
            "answer": "わざわざ"
        },
        {
            "question": "pistol",
            "answer": "拳銃"
        },
        {
            "question": "hello",
            "answer": "こんにちは"
        },
        {
            "question": "sepertimu",
            "answer": "あなたのような"
        },
        {
            "question": "ikuti",
            "answer": "フォローする"
        },
        {
            "question": "bahaya",
            "answer": "危険"
        },
        {
            "question": "hubungi",
            "answer": "接触"
        },
        {
            "question": "hidupmu",
            "answer": "あなたの人生"
        },
        {
            "question": "nenek",
            "answer": "祖母、おばあさん"
        },
        {
            "question": "gelap",
            "answer": "暗い"
        },
        {
            "question": "menyadari",
            "answer": "気づく"
        },
        {
            "question": "ahli",
            "answer": "専門家"
        },
        {
            "question": "kim",
            "answer": "キム"
        },
        {
            "question": "main",
            "answer": "遊ぶ"
        },
        {
            "question": "kopi",
            "answer": "コーヒー;コピー、写し"
        },
        {
            "question": "merupakan",
            "answer": "は"
        },
        {
            "question": "memberimu",
            "answer": "あなたに与える"
        },
        {
            "question": "go",
            "answer": "行く"
        },
        {
            "question": "ratu",
            "answer": "君主;女王;后"
        },
        {
            "question": "that",
            "answer": "それ"
        },
        {
            "question": "kemungkinan",
            "answer": "可能性"
        },
        {
            "question": "bersamamu",
            "answer": "あなたと"
        },
        {
            "question": "diterjemahkan",
            "answer": "翻訳された"
        },
        {
            "question": "kejadian",
            "answer": "事件"
        },
        {
            "question": "laporan",
            "answer": "報告"
        },
        {
            "question": "balik",
            "answer": "戻ってくる"
        },
        {
            "question": "detektif",
            "answer": "探偵"
        },
        {
            "question": "daftar",
            "answer": "リスト"
        },
        {
            "question": "es",
            "answer": "氷"
        },
        {
            "question": "sejarah",
            "answer": "歴史"
        },
        {
            "question": "nyaman",
            "answer": "快適"
        },
        {
            "question": "daging",
            "answer": "肉;食肉;人類"
        },
        {
            "question": "keputusan",
            "answer": "決断"
        },
        {
            "question": "caranya",
            "answer": "方法"
        },
        {
            "question": "ceritakan",
            "answer": "教えて"
        },
        {
            "question": "bernama",
            "answer": "名前"
        },
        {
            "question": "istirahat",
            "answer": "休む"
        },
        {
            "question": "layak",
            "answer": "価値がある"
        },
        {
            "question": "pertemuan",
            "answer": "ミーティング"
        },
        {
            "question": "penjaga",
            "answer": "ガード"
        },
        {
            "question": "alat",
            "answer": "籠"
        },
        {
            "question": "kulit",
            "answer": "皮、殻;皮膚、肌"
        },
        {
            "question": "sesuai",
            "answer": "に従って"
        },
        {
            "question": "kebenaran",
            "answer": "有効性、妥当性;現実、現実味;正義;誠実さ;許可;偶然一致;精度"
        },
        {
            "question": "persetan",
            "answer": "くそ"
        },
        {
            "question": "peter",
            "answer": "ピーター"
        },
        {
            "question": "temanmu",
            "answer": "あなたの友達"
        },
        {
            "question": "york",
            "answer": "ヨーク"
        },
        {
            "question": "tiba-tiba",
            "answer": "突然"
        },
        {
            "question": "penyihir",
            "answer": "魔女"
        },
        {
            "question": "sampah",
            "answer": "ごみ"
        },
        {
            "question": "bersumpah",
            "answer": "誓う"
        },
        {
            "question": "menghubungi",
            "answer": "接触"
        },
        {
            "question": "hak",
            "answer": "右"
        },
        {
            "question": "pemerintah",
            "answer": "政府"
        },
        {
            "question": "mendengarnya",
            "answer": "聞く"
        },
        {
            "question": "darimu",
            "answer": "あなたから"
        },
        {
            "question": "memastikan",
            "answer": "確保する"
        },
        {
            "question": "lapar",
            "answer": "空腹の"
        },
        {
            "question": "bohong",
            "answer": "嘘"
        },
        {
            "question": "tanya",
            "answer": "聞く"
        },
        {
            "question": "bunga",
            "answer": "花"
        },
        {
            "question": "menjelaskan",
            "answer": "説明する"
        },
        {
            "question": "sih",
            "answer": "うん"
        },
        {
            "question": "emas",
            "answer": "金"
        },
        {
            "question": "david",
            "answer": "デビッド"
        },
        {
            "question": "berasal",
            "answer": "起源"
        },
        {
            "question": "malu",
            "answer": "恥ずかしい"
        },
        {
            "question": "kaya",
            "answer": "リッチ"
        },
        {
            "question": "dah",
            "answer": "終わり"
        },
        {
            "question": "monster",
            "answer": "モンスター"
        },
        {
            "question": "bersamaku",
            "answer": "私と一緒に"
        },
        {
            "question": "mayat",
            "answer": "死体"
        },
        {
            "question": "frank",
            "answer": "フランク"
        },
        {
            "question": "minuman",
            "answer": "飲む"
        },
        {
            "question": "tangkap",
            "answer": "キャッチ"
        },
        {
            "question": "bom",
            "answer": "木、樹木"
        },
        {
            "question": "meja",
            "answer": "テーブル"
        },
        {
            "question": "pacar",
            "answer": "彼氏"
        },
        {
            "question": "digunakan",
            "answer": "使用済み"
        },
        {
            "question": "asing",
            "answer": "外国"
        },
        {
            "question": "daerah",
            "answer": "エリア"
        },
        {
            "question": "ikan",
            "answer": "魚"
        },
        {
            "question": "angkat",
            "answer": "上げる、持ち上げる;養子にする;選ぶ"
        },
        {
            "question": "pengacara",
            "answer": "弁護士"
        },
        {
            "question": "michael",
            "answer": "マイケル"
        },
        {
            "question": "milikku",
            "answer": "私の"
        },
        {
            "question": "bau",
            "answer": "匂い"
        },
        {
            "question": "normal",
            "answer": "普通"
        },
        {
            "question": "harapan",
            "answer": "希望"
        },
        {
            "question": "ampun",
            "answer": "私を許して"
        },
        {
            "question": "butuhkan",
            "answer": "必要"
        },
        {
            "question": "mr.",
            "answer": "氏"
        },
        {
            "question": "bank",
            "answer": "銀行"
        },
        {
            "question": "mengalahkan",
            "answer": "敗北"
        },
        {
            "question": "jiwa",
            "answer": "魂"
        },
        {
            "question": "prajurit",
            "answer": "兵士"
        },
        {
            "question": "otak",
            "answer": "脳"
        },
        {
            "question": "kabarmu",
            "answer": "あなたのニュース"
        },
        {
            "question": "miliki",
            "answer": "持っている"
        },
        {
            "question": "menempatkan",
            "answer": "置く"
        },
        {
            "question": "hotel",
            "answer": "ホテル"
        },
        {
            "question": "selatan",
            "answer": "南"
        },
        {
            "question": "lelah",
            "answer": "疲れた"
        },
        {
            "question": "dapatkah",
            "answer": "できる"
        },
        {
            "question": "pohon",
            "answer": "mohonの旧綴り"
        },
        {
            "question": "sebagian",
            "answer": "一部"
        },
        {
            "question": "menemui",
            "answer": "会う"
        },
        {
            "question": "apa-apaan",
            "answer": "なんてこった"
        },
        {
            "question": "berangkat",
            "answer": "出発する"
        },
        {
            "question": "pusat",
            "answer": "中心;臍"
        },
        {
            "question": "tumbuh",
            "answer": "育つ、成長する"
        },
        {
            "question": "kerajaan",
            "answer": "王国;（生物分類）界"
        },
        {
            "question": "dewasa",
            "answer": "成熟した"
        },
        {
            "question": "maju",
            "answer": "進む"
        },
        {
            "question": "menjawab",
            "answer": "答え"
        },
        {
            "question": "menutup",
            "answer": "近い"
        },
        {
            "question": "gedung",
            "answer": "建物"
        },
        {
            "question": "luka",
            "answer": "傷、怪我"
        },
        {
            "question": "hewan",
            "answer": "動物"
        },
        {
            "question": "baju",
            "answer": "衣服"
        },
        {
            "question": "dibunuh",
            "answer": "bunuhの受動"
        },
        {
            "question": "binatang",
            "answer": "動物"
        },
        {
            "question": "tarik",
            "answer": "引く;引っ込める"
        },
        {
            "question": "tujuh",
            "answer": "七"
        },
        {
            "question": "bercinta",
            "answer": "恋しく思う;性交する"
        },
        {
            "question": "sepatu",
            "answer": "靴"
        },
        {
            "question": "suami",
            "answer": "夫"
        },
        {
            "question": "langit",
            "answer": "空"
        },
        {
            "question": "angin",
            "answer": "風"
        },
        {
            "question": "pegang",
            "answer": "握る"
        },
        {
            "question": "sungai",
            "answer": "川"
        },
        {
            "question": "sepuluh",
            "answer": "十"
        },
        {
            "question": "pulau",
            "answer": "島"
        },
        {
            "question": "ketiga",
            "answer": "第三の、三番目の"
        },
        {
            "question": "memegang",
            "answer": "握る、掴む"
        },
        {
            "question": "seks",
            "answer": "性交、性行為"
        },
        {
            "question": "hujan",
            "answer": "雨"
        },
        {
            "question": "kucing",
            "answer": "猫"
        },
        {
            "question": "pantai",
            "answer": "海岸"
        },
        {
            "question": "komputer",
            "answer": "コンピュータ"
        },
        {
            "question": "sedih",
            "answer": "悲しい"
        },
        {
            "question": "tas",
            "answer": "かばん、バッグ"
        },
        {
            "question": "jantung",
            "answer": "心臓;ハート形の物"
        },
        {
            "question": "warna",
            "answer": "色;社会階級"
        },
        {
            "question": "kursi",
            "answer": "椅子、座席;アッラーの玉座"
        },
        {
            "question": "gunung",
            "answer": "山"
        },
        {
            "question": "biru",
            "answer": "青"
        },
        {
            "question": "kakek",
            "answer": "祖父、おじいさん"
        },
        {
            "question": "sehat",
            "answer": "健康な、健全な;回復した;普通の;理に適った"
        },
        {
            "question": "beli",
            "answer": "買う"
        },
        {
            "question": "timur",
            "answer": "東の"
        },
        {
            "question": "ayam",
            "answer": "鶏"
        },
        {
            "question": "gereja",
            "answer": "教会"
        },
        {
            "question": "teh",
            "answer": "茶"
        },
        {
            "question": "bir",
            "answer": "ビール"
        },
        {
            "question": "gigi",
            "answer": "歯"
        },
        {
            "question": "kebetulan",
            "answer": "偶然にも、生憎"
        },
        {
            "question": "tulang",
            "answer": "骨"
        },
        {
            "question": "jelek",
            "answer": "（状態が）悪い"
        },
        {
            "question": "jari",
            "answer": "指"
        },
        {
            "question": "delapan",
            "answer": "八"
        },
        {
            "question": "letnan",
            "answer": "中尉"
        },
        {
            "question": "babi",
            "answer": "豚"
        },
        {
            "question": "istana",
            "answer": "宮殿"
        },
        {
            "question": "ribu",
            "answer": "〜千"
        },
        {
            "question": "walaupun",
            "answer": "例え～でも、～であるにもかかわらず"
        },
        {
            "question": "buah",
            "answer": "大きな物や容量のある物を数える助数詞"
        },
        {
            "question": "celana",
            "answer": "ズボン"
        },
        {
            "question": "sore",
            "answer": "夕方"
        },
        {
            "question": "bakar",
            "answer": "（料理などで）焼く"
        },
        {
            "question": "program",
            "answer": "計画、予定;プログラム"
        },
        {
            "question": "pilih",
            "answer": "選ぶ"
        },
        {
            "question": "anggur",
            "answer": "挿し木"
        },
        {
            "question": "tikus",
            "answer": "鼠"
        },
        {
            "question": "mustahil",
            "answer": "不可能な"
        },
        {
            "question": "profesor",
            "answer": "教授"
        },
        {
            "question": "kertas",
            "answer": "紙"
        },
        {
            "question": "hijau",
            "answer": "緑"
        },
        {
            "question": "serigala",
            "answer": "狼"
        },
        {
            "question": "restoran",
            "answer": "レストラン"
        },
        {
            "question": "roti",
            "answer": "パン"
        },
        {
            "question": "bangunan",
            "answer": "ビル、ビルディング"
        },
        {
            "question": "hangat",
            "answer": "暖かい"
        },
        {
            "question": "sama-sama",
            "answer": "どういたしまして"
        },
        {
            "question": "kolonel",
            "answer": "大佐"
        },
        {
            "question": "bernyanyi",
            "answer": "nyanyiの能動"
        },
        {
            "question": "puluh",
            "answer": "十"
        },
        {
            "question": "taruh",
            "answer": "～を置く"
        },
        {
            "question": "gratis",
            "answer": "無料で、ただで"
        },
        {
            "question": "rakyat",
            "answer": "人民"
        },
        {
            "question": "gerakan",
            "answer": "動き、行動、運動"
        },
        {
            "question": "kadang",
            "answer": "時時"
        },
        {
            "question": "telur",
            "answer": "卵"
        },
        {
            "question": "apartemen",
            "answer": "アパート、マンション"
        },
        {
            "question": "sebab",
            "answer": "理由"
        },
        {
            "question": "ilmu",
            "answer": "科学"
        },
        {
            "question": "sembilan",
            "answer": "九"
        },
        {
            "question": "adanya",
            "answer": "存在"
        },
        {
            "question": "besi",
            "answer": "鉄"
        },
        {
            "question": "berenang",
            "answer": "泳ぐ"
        },
        {
            "question": "beruang",
            "answer": "熊"
        },
        {
            "question": "episode",
            "answer": "挿話;(ドラマなどの) 一編、話"
        },
        {
            "question": "salju",
            "answer": "雪"
        },
        {
            "question": "atap",
            "answer": "屋根"
        },
        {
            "question": "gudang",
            "answer": "倉庫"
        },
        {
            "question": "berhak",
            "answer": "権利がある;権限がある"
        },
        {
            "question": "susu",
            "answer": "牛乳;乳;胸;乳首"
        },
        {
            "question": "tali",
            "answer": "縄"
        },
        {
            "question": "toilet",
            "answer": "身繕い;トイレ、便所;便器"
        },
        {
            "question": "belas",
            "answer": "十〜、（11から19までの数字の、「十〜」の部分を表す、）"
        },
        {
            "question": "siswa",
            "answer": "学生、生徒"
        },
        {
            "question": "pendek",
            "answer": "短い"
        },
        {
            "question": "ular",
            "answer": "蛇"
        },
        {
            "question": "harta",
            "answer": "宝、財宝;資産;財産"
        },
        {
            "question": "racun",
            "answer": "毒を入れる"
        },
        {
            "question": "campur",
            "answer": "混ぜる"
        },
        {
            "question": "pabrik",
            "answer": "工場"
        },
        {
            "question": "kolam",
            "answer": "池"
        },
        {
            "question": "tulis",
            "answer": "書く"
        },
        {
            "question": "basah",
            "answer": "濡れた;有益な"
        },
        {
            "question": "monyet",
            "answer": "猿"
        },
        {
            "question": "mi",
            "answer": "麺"
        },
        {
            "question": "politik",
            "answer": "政治;政策"
        },
        {
            "question": "universitas",
            "answer": "大学"
        },
        {
            "question": "serta",
            "answer": "加入する、参加する"
        },
        {
            "question": "cuaca",
            "answer": "天気"
        },
        {
            "question": "menghitung",
            "answer": "hitungの能動"
        },
        {
            "question": "bapak",
            "answer": "父、父親;（男性に対して）〜さん;あなた;おじ"
        },
        {
            "question": "legenda",
            "answer": "伝説"
        },
        {
            "question": "kesehatan",
            "answer": "健康"
        },
        {
            "question": "danau",
            "answer": "湖"
        },
        {
            "question": "identitas",
            "answer": "アイデンティティー、同一性"
        },
        {
            "question": "koran",
            "answer": "新聞"
        },
        {
            "question": "sinar",
            "answer": "光線"
        },
        {
            "question": "mainan",
            "answer": "おもちゃ、玩具;つまらないもの"
        },
        {
            "question": "bayangan",
            "answer": "影"
        },
        {
            "question": "walau",
            "answer": "例え～でも;～であるが"
        },
        {
            "question": "nafas",
            "answer": "呼吸する"
        },
        {
            "question": "bukit",
            "answer": "丘"
        },
        {
            "question": "lautan",
            "answer": "海洋、大洋"
        },
        {
            "question": "carter",
            "answer": "チャーターする"
        },
        {
            "question": "bernafas",
            "answer": "呼吸する"
        },
        {
            "question": "luas",
            "answer": "（面積が）広い"
        },
        {
            "question": "coklat",
            "answer": "チョコレート"
        },
        {
            "question": "engkau",
            "answer": "あなた"
        },
        {
            "question": "singa",
            "answer": "ライオン"
        },
        {
            "question": "berlutut",
            "answer": "ひざまずく"
        },
        {
            "question": "kuning",
            "answer": "黄色"
        },
        {
            "question": "rumput",
            "answer": "草"
        },
        {
            "question": "jual",
            "answer": "売る"
        },
        {
            "question": "kelinci",
            "answer": "兎"
        },
        {
            "question": "menyanyi",
            "answer": "nyanyiの能動"
        },
        {
            "question": "telinga",
            "answer": "耳"
        },
        {
            "question": "misteri",
            "answer": "不思議、神秘、謎"
        },
        {
            "question": "mahasiswa",
            "answer": "大学生"
        },
        {
            "question": "gembira",
            "answer": "幸せな;誇りに思う"
        },
        {
            "question": "leher",
            "answer": "首"
        },
        {
            "question": "dada",
            "answer": "胸"
        },
        {
            "question": "perak",
            "answer": "銀"
        },
        {
            "question": "peti",
            "answer": "箱"
        },
        {
            "question": "cat",
            "answer": "塗る"
        },
        {
            "question": "hidung",
            "answer": "鼻"
        },
        {
            "question": "santa",
            "answer": "（女性の）聖人、聖女"
        },
        {
            "question": "keju",
            "answer": "チーズ"
        },
        {
            "question": "lift",
            "answer": "昇降機、リフト、エレベーター"
        },
        {
            "question": "puisi",
            "answer": "詩"
        },
        {
            "question": "awan",
            "answer": "雲"
        },
        {
            "question": "kedatangan",
            "answer": "訪問を迎える"
        },
        {
            "question": "domba",
            "answer": "羊"
        },
        {
            "question": "seratus",
            "answer": "百"
        },
        {
            "question": "ramah",
            "answer": "親切な、心のこもった;友好的な"
        },
        {
            "question": "amat",
            "answer": "大変、かなり"
        },
        {
            "question": "bulu",
            "answer": "毛、髪;毛皮;羽"
        },
        {
            "question": "majalah",
            "answer": "雑誌"
        },
        {
            "question": "raya",
            "answer": "偉大な"
        },
        {
            "question": "tradisi",
            "answer": "伝統"
        },
        {
            "question": "agama",
            "answer": "宗教"
        },
        {
            "question": "bensin",
            "answer": "ガソリン"
        },
        {
            "question": "seribu",
            "answer": "千"
        },
        {
            "question": "renang",
            "answer": "泳ぐ"
        },
        {
            "question": "laboratorium",
            "answer": "実験室、研究所"
        },
        {
            "question": "perpustakaan",
            "answer": "図書館"
        },
        {
            "question": "positif",
            "answer": "（写真）陽画、ポジ"
        },
        {
            "question": "payudara",
            "answer": "乳房"
        },
        {
            "question": "ban",
            "answer": "タイヤ"
        },
        {
            "question": "keempat",
            "answer": "第四の、四番目の"
        },
        {
            "question": "nada",
            "answer": "音調、調子"
        },
        {
            "question": "kambing",
            "answer": "山羊"
        },
        {
            "question": "lilin",
            "answer": "蝋;蝋燭"
        },
        {
            "question": "mars",
            "answer": "行進;行進曲"
        },
        {
            "question": "daun",
            "answer": "葉"
        },
        {
            "question": "rusa",
            "answer": "鹿;ヘラジカ"
        },
        {
            "question": "bis",
            "answer": "バス"
        },
        {
            "question": "tinju",
            "answer": "殴る、殴打する"
        },
        {
            "question": "kain",
            "answer": "布"
        },
        {
            "question": "goreng",
            "answer": "油で揚げる"
        },
        {
            "question": "nol",
            "answer": "0、ゼロ、零"
        },
        {
            "question": "peradaban",
            "answer": "文明"
        },
        {
            "question": "bunyi",
            "answer": "音"
        },
        {
            "question": "harimau",
            "answer": "虎"
        },
        {
            "question": "pendidikan",
            "answer": "教育"
        },
        {
            "question": "kutu",
            "answer": "虱"
        },
        {
            "question": "otot",
            "answer": "筋肉"
        },
        {
            "question": "otomatis",
            "answer": "自動の"
        },
        {
            "question": "metode",
            "answer": "方法、方式、手法;教科書"
        },
        {
            "question": "doa",
            "answer": "祈り"
        },
        {
            "question": "koper",
            "answer": "ブリーフケース、書類鞄"
        },
        {
            "question": "bibir",
            "answer": "唇"
        },
        {
            "question": "hitung",
            "answer": "数える;計算する"
        },
        {
            "question": "sa",
            "answer": "一"
        },
        {
            "question": "kecantikan",
            "answer": "美しさ、美"
        },
        {
            "question": "gajah",
            "answer": "象;ビショップ;大きな物"
        },
        {
            "question": "gugur",
            "answer": "戦死した"
        },
        {
            "question": "panti",
            "answer": "（複合語で）家、住居、住宅;（複合語で）場所"
        },
        {
            "question": "ratus",
            "answer": "〜百"
        },
        {
            "question": "beracun",
            "answer": "有毒の"
        },
        {
            "question": "republik",
            "answer": "共和国"
        },
        {
            "question": "kitab",
            "answer": "本"
        },
        {
            "question": "cakap",
            "answer": "出来る;賢い;美しい;良い状態の"
        },
        {
            "question": "selimut",
            "answer": "毛布"
        },
        {
            "question": "mawar",
            "answer": "薔薇"
        },
        {
            "question": "curi",
            "answer": "盗む"
        },
        {
            "question": "organ",
            "answer": "器官、臓器;オルガン、パイプオルガン;機関紙;代弁者"
        },
        {
            "question": "kampung",
            "answer": "村"
        },
        {
            "question": "nasi",
            "answer": "御飯、米飯"
        },
        {
            "question": "lencana",
            "answer": "紋章、シンボルマーク"
        },
        {
            "question": "banteng",
            "answer": "バンテン;雄牛"
        },
        {
            "question": "lutut",
            "answer": "膝"
        },
        {
            "question": "ko",
            "answer": "ノックアウト"
        },
        {
            "question": "sekian",
            "answer": "以上"
        },
        {
            "question": "arus",
            "answer": "流れ、水流"
        },
        {
            "question": "handuk",
            "answer": "タオル"
        },
        {
            "question": "tuli",
            "answer": "耳の聞こえない"
        },
        {
            "question": "kabut",
            "answer": "霧"
        },
        {
            "question": "seri",
            "answer": "美"
        },
        {
            "question": "september",
            "answer": "九月"
        },
        {
            "question": "akademi",
            "answer": "アカデミー、翰林院"
        },
        {
            "question": "abang",
            "answer": "赤い"
        },
        {
            "question": "tercinta",
            "answer": "親愛なる"
        },
        {
            "question": "kaku",
            "answer": "硬い、硬直した"
        },
        {
            "question": "jemput",
            "answer": "迎える"
        },
        {
            "question": "pergerakan",
            "answer": "運動;（社会的な）運動"
        },
        {
            "question": "kelima",
            "answer": "第五の、五番目の"
        },
        {
            "question": "dimensi",
            "answer": "大きさ、寸法;次元"
        },
        {
            "question": "terjemahan",
            "answer": "翻訳"
        },
        {
            "question": "paspor",
            "answer": "旅券、パスポート"
        },
        {
            "question": "bubuk",
            "answer": "粉"
        },
        {
            "question": "pelajar",
            "answer": "生徒"
        },
        {
            "question": "katak",
            "answer": "かえる"
        },
        {
            "question": "portal",
            "answer": "正門;ポータル、ポータルサイト;入口の障壁;市場"
        },
        {
            "question": "teror",
            "answer": "恐怖"
        },
        {
            "question": "gerak",
            "answer": "動き、運動、動作"
        },
        {
            "question": "paruh",
            "answer": "半分"
        },
        {
            "question": "profil",
            "answer": "輪郭、外形;横顔;プロフィール、人物像"
        },
        {
            "question": "keliling",
            "answer": "〜の周りに"
        },
        {
            "question": "bandar",
            "answer": "港;港町"
        },
        {
            "question": "label",
            "answer": "荷札、ラベル、レッテル;ラベル;品質表示ラベル"
        },
        {
            "question": "biologi",
            "answer": "生物学"
        },
        {
            "question": "hook",
            "answer": "hukの異形"
        },
        {
            "question": "bandit",
            "answer": "山賊、盗賊"
        },
        {
            "question": "pin",
            "answer": "ピン、留め針;ペグ"
        },
        {
            "question": "sabun",
            "answer": "石鹼"
        },
        {
            "question": "sumur",
            "answer": "井戸"
        },
        {
            "question": "pecinta",
            "answer": "愛好家"
        },
        {
            "question": "nelayan",
            "answer": "漁師"
        },
        {
            "question": "pinggang",
            "answer": "腰"
        },
        {
            "question": "parfum",
            "answer": "香水"
        },
        {
            "question": "dihitung",
            "answer": "hitungの受動"
        },
        {
            "question": "psikologi",
            "answer": "心理学"
        },
        {
            "question": "ana",
            "answer": "私"
        },
        {
            "question": "gali",
            "answer": "掘る"
        },
        {
            "question": "benua",
            "answer": "大陸"
        },
        {
            "question": "ember",
            "answer": "バケツ"
        },
        {
            "question": "lapis",
            "answer": "層状の"
        },
        {
            "question": "datangi",
            "answer": "来る"
        },
        {
            "question": "pagi-pagi",
            "answer": "早朝"
        },
        {
            "question": "pot",
            "answer": "植木鉢"
        },
        {
            "question": "usus",
            "answer": "腸"
        },
        {
            "question": "cap",
            "answer": "印章;判子"
        },
        {
            "question": "lumba-lumba",
            "answer": "海豚"
        },
        {
            "question": "gandum",
            "answer": "小麦"
        },
        {
            "question": "pai",
            "answer": "パイ"
        },
        {
            "question": "pamer",
            "answer": "見せつける、見せびらかす"
        },
        {
            "question": "bug",
            "answer": "バグ"
        },
        {
            "question": "maksimal",
            "answer": "最大の、最高の"
        },
        {
            "question": "fenomena",
            "answer": "現象、事象"
        },
        {
            "question": "punah",
            "answer": "死に絶えた、絶滅した"
        },
        {
            "question": "bor",
            "answer": "ドリル、穿孔機"
        },
        {
            "question": "kehamilan",
            "answer": "妊娠"
        },
        {
            "question": "bubur",
            "answer": "お粥、水分の多いごはん、ゆでた米や豆などから作られる"
        },
        {
            "question": "parade",
            "answer": "行列、行進、パレード;閲兵式"
        },
        {
            "question": "kesukaan",
            "answer": "好み、御気に入り"
        },
        {
            "question": "mengantuk",
            "answer": "眠い"
        },
        {
            "question": "komet",
            "answer": "彗星"
        },
        {
            "question": "bengkel",
            "answer": "工房、作業場"
        },
        {
            "question": "rahmat",
            "answer": "恩恵、恩寵、加護"
        },
        {
            "question": "buruh",
            "answer": "労働者"
        },
        {
            "question": "keenam",
            "answer": "第六の、六番目の"
        },
        {
            "question": "nyanyi",
            "answer": "歌唱"
        },
        {
            "question": "tablet",
            "answer": "錠剤;平板、銘板;タブレット"
        },
        {
            "question": "sejuta",
            "answer": "百万"
        },
        {
            "question": "asma",
            "answer": "喘息"
        },
        {
            "question": "sebelas",
            "answer": "十一"
        },
        {
            "question": "ketujuh",
            "answer": "第七の、七番目の"
        },
        {
            "question": "asteroid",
            "answer": "小惑星"
        },
        {
            "question": "pendiam",
            "answer": "無口な、寡黙な"
        },
        {
            "question": "obsesi",
            "answer": "強迫観念、妄想"
        },
        {
            "question": "admiral",
            "answer": "海軍の大将、提督"
        },
        {
            "question": "cape",
            "answer": "疲れた"
        },
        {
            "question": "keracunan",
            "answer": "中毒"
        },
        {
            "question": "order",
            "answer": "命令;注文、オーダー"
        },
        {
            "question": "rekomendasi",
            "answer": "勧める、推薦する"
        },
        {
            "question": "pura",
            "answer": "都市;寺院"
        },
        {
            "question": "citra",
            "answer": "イメージ"
        },
        {
            "question": "norma",
            "answer": "規則、規定;基準、標準、規範"
        },
        {
            "question": "tumbuhan",
            "answer": "植物"
        },
        {
            "question": "persik",
            "answer": "桃"
        },
        {
            "question": "adrenalin",
            "answer": "アドレナリン"
        },
        {
            "question": "adu",
            "answer": "競争;闘鶏"
        },
        {
            "question": "vitamin",
            "answer": "ビタミン"
        },
        {
            "question": "menerjemahkan",
            "answer": "翻訳する"
        },
        {
            "question": "tin",
            "answer": "いちじく"
        },
        {
            "question": "rim",
            "answer": "革製のベルト"
        },
        {
            "question": "hulu",
            "answer": "頭;川上;村;柄;開始"
        },
        {
            "question": "telefon",
            "answer": "teleponの別形"
        },
        {
            "question": "semen",
            "answer": "セメント"
        },
        {
            "question": "hidrogen",
            "answer": "水素"
        },
        {
            "question": "panasnya",
            "answer": "暑さ"
        },
        {
            "question": "santo",
            "answer": "（男性の）聖人、聖者"
        },
        {
            "question": "harum",
            "answer": "香水"
        },
        {
            "question": "seleksi",
            "answer": "選ぶこと、選択;選んだもの"
        },
        {
            "question": "tsunami",
            "answer": "津波"
        },
        {
            "question": "diabetes",
            "answer": "糖尿病"
        },
        {
            "question": "dokumenter",
            "answer": "ドキュメンタリー、記録映画"
        },
        {
            "question": "kebudayaan",
            "answer": "文化"
        },
        {
            "question": "merdeka",
            "answer": "独立した"
        },
        {
            "question": "keberangkatan",
            "answer": "出発"
        },
        {
            "question": "pulpen",
            "answer": "万年筆"
        },
        {
            "question": "tape",
            "answer": "tapaiの異形"
        },
        {
            "question": "genius",
            "answer": "独創的な"
        },
        {
            "question": "mendidik",
            "answer": "教育する"
        },
        {
            "question": "sejuk",
            "answer": "涼しい"
        },
        {
            "question": "stroberi",
            "answer": "苺"
        },
        {
            "question": "spot",
            "answer": "地点、箇所"
        },
        {
            "question": "liter",
            "answer": "リットル"
        },
        {
            "question": "zaitun",
            "answer": "オリーブ"
        },
        {
            "question": "geologi",
            "answer": "地質学"
        },
        {
            "question": "percintaan",
            "answer": "恋愛、情事;哀悼"
        },
        {
            "question": "seminar",
            "answer": "セミナー、ゼミナール"
        },
        {
            "question": "plasma",
            "answer": "プラズマ;血漿;プランテーションの農家"
        },
        {
            "question": "alis",
            "answer": "眉毛"
        },
        {
            "question": "cukai",
            "answer": "税金;義務"
        },
        {
            "question": "reptil",
            "answer": "爬虫類"
        },
        {
            "question": "nisan",
            "answer": "墓石、墓碑"
        },
        {
            "question": "mega",
            "answer": "雲"
        },
        {
            "question": "bambu",
            "answer": "竹;竹材"
        },
        {
            "question": "meletus",
            "answer": "爆発する;(革命や事件が) 勃発する"
        },
        {
            "question": "solid",
            "answer": "丈夫な、頑丈な、しっかりした"
        },
        {
            "question": "kamus",
            "answer": "辞書"
        },
        {
            "question": "institut",
            "answer": "研究所、大学、学会"
        },
        {
            "question": "mangga",
            "answer": "マンゴー"
        },
        {
            "question": "kuman",
            "answer": "細菌、バクテリア"
        },
        {
            "question": "berbaju",
            "answer": "衣服を着ている"
        },
        {
            "question": "kecap",
            "answer": "醤油、魚醤"
        },
        {
            "question": "temu",
            "answer": "会う"
        },
        {
            "question": "kental",
            "answer": "濃い"
        },
        {
            "question": "tunjuk",
            "answer": "示す"
        },
        {
            "question": "arkeologi",
            "answer": "考古学"
        },
        {
            "question": "pinguin",
            "answer": "ペンギン"
        },
        {
            "question": "bertinju",
            "answer": "ボクシングをする"
        },
        {
            "question": "step",
            "answer": "痙攣"
        },
        {
            "question": "bait",
            "answer": "家;二行連句、対句"
        },
        {
            "question": "mengaum",
            "answer": "吠える"
        },
        {
            "question": "diare",
            "answer": "下痢"
        },
        {
            "question": "jerapah",
            "answer": "キリン"
        },
        {
            "question": "pencinta",
            "answer": "pecintaの異形"
        },
        {
            "question": "kesembilan",
            "answer": "第九の、九番目の"
        },
        {
            "question": "baka",
            "answer": "永遠の"
        },
        {
            "question": "zone",
            "answer": "層"
        },
        {
            "question": "interaksi",
            "answer": "相互作用"
        },
        {
            "question": "terjemah",
            "answer": "翻訳する"
        },
        {
            "question": "bonjour",
            "answer": "挨拶"
        },
        {
            "question": "geografi",
            "answer": "地理、地理学"
        },
        {
            "question": "dateng",
            "answer": "datangの非公式の綴り"
        },
        {
            "question": "persentase",
            "answer": "百分率、百分比、パーセンテージ"
        },
        {
            "question": "brigade",
            "answer": "旅団"
        },
        {
            "question": "kecoak",
            "answer": "ゴキブリ"
        },
        {
            "question": "meteorit",
            "answer": "隕石"
        },
        {
            "question": "baptis",
            "answer": "洗礼"
        },
        {
            "question": "kedelapan",
            "answer": "第八の、八番目の"
        },
        {
            "question": "auditorium",
            "answer": "講堂、公会堂"
        },
        {
            "question": "malaria",
            "answer": "マラリア"
        },
        {
            "question": "anal",
            "answer": "肛門の"
        },
        {
            "question": "bertani",
            "answer": "農場で働く"
        },
        {
            "question": "ubi",
            "answer": "芋、ヤムイモ"
        },
        {
            "question": "pusar",
            "answer": "臍"
        },
        {
            "question": "selat",
            "answer": "海峡"
        },
        {
            "question": "mikroskop",
            "answer": "顕微鏡"
        },
        {
            "question": "turbin",
            "answer": "タービン"
        },
        {
            "question": "teller",
            "answer": "出納係"
        },
        {
            "question": "rabi",
            "answer": "宗教指導者、ラビ"
        },
        {
            "question": "ubur-ubur",
            "answer": "クラゲ、海月、水母"
        },
        {
            "question": "bhs",
            "answer": "bahasa"
        },
        {
            "question": "ara",
            "answer": "いちじく"
        },
        {
            "question": "geometri",
            "answer": "幾何学"
        },
        {
            "question": "elektron",
            "answer": "電子"
        },
        {
            "question": "judo",
            "answer": "柔道"
        },
        {
            "question": "alfabet",
            "answer": "アルファベット"
        },
        {
            "question": "literatur",
            "answer": "文学"
        },
        {
            "question": "flora",
            "answer": "植物相;植物誌;微生物叢"
        },
        {
            "question": "nota",
            "answer": "通知;覚え書き、メモ;請求書、勘定書"
        },
        {
            "question": "aqua",
            "answer": "水、ボトルウォーター"
        },
        {
            "question": "bros",
            "answer": "ブローチ"
        },
        {
            "question": "diskriminasi",
            "answer": "差別"
        },
        {
            "question": "yoghurt",
            "answer": "ヨーグルト"
        },
        {
            "question": "kuping",
            "answer": "耳"
        },
        {
            "question": "didik",
            "answer": "教育する"
        },
        {
            "question": "tangis",
            "answer": "泣く"
        },
        {
            "question": "rosario",
            "answer": "ロザリオ"
        },
        {
            "question": "gladi",
            "answer": "リハーサルをする"
        },
        {
            "question": "distributor",
            "answer": "分配者、配布者"
        },
        {
            "question": "oleh-oleh",
            "answer": "土産"
        },
        {
            "question": "buket",
            "answer": "花束、ブーケ"
        },
        {
            "question": "intensitas",
            "answer": "激しさ"
        },
        {
            "question": "remas",
            "answer": "絞る、圧搾する"
        },
        {
            "question": "gap",
            "answer": "割れ目、裂け目、隙間;（コミュニティとの）断絶"
        },
        {
            "question": "bayonet",
            "answer": "銃剣"
        },
        {
            "question": "bujang",
            "answer": "独身の、未婚の"
        },
        {
            "question": "administrator",
            "answer": "管理者"
        },
        {
            "question": "kadangkala",
            "answer": "時時"
        },
        {
            "question": "patriotisme",
            "answer": "愛国心"
        },
        {
            "question": "legislatif",
            "answer": "立法の、立法府の"
        },
        {
            "question": "kijang",
            "answer": "鹿"
        },
        {
            "question": "tangkai",
            "answer": "茎や花、柄の付いた物に用いる助数詞"
        },
        {
            "question": "soto",
            "answer": "（濁りのない）スープ、ソト"
        },
        {
            "question": "kolera",
            "answer": "コレラ"
        },
        {
            "question": "kelingking",
            "answer": "小指"
        },
        {
            "question": "premium",
            "answer": "賞、賞金、褒賞;保険料;高級品;ハイオクガソリン"
        },
        {
            "question": "hentai",
            "answer": "ポルノの"
        },
        {
            "question": "dusun",
            "answer": "集落、村落"
        },
        {
            "question": "kikir",
            "answer": "けちな"
        },
        {
            "question": "obesitas",
            "answer": "肥満"
        },
        {
            "question": "komunisme",
            "answer": "共産主義"
        },
        {
            "question": "absurd",
            "answer": "ばかげた、非常識な、不条理な"
        },
        {
            "question": "doi",
            "answer": "彼氏、彼女"
        },
        {
            "question": "kalem",
            "answer": "静かな"
        },
        {
            "question": "margin",
            "answer": "周辺、縁、へり、端;許容範囲;利鞘、マージン;証拠金、担保金"
        },
        {
            "question": "alu",
            "answer": "乳棒、すりこぎ"
        },
        {
            "question": "kalium",
            "answer": "カリウム"
        },
        {
            "question": "polimer",
            "answer": "重合体、ポリマー"
        },
        {
            "question": "natrium",
            "answer": "ナトリウム"
        },
        {
            "question": "kanak",
            "answer": "子供"
        },
        {
            "question": "dag",
            "answer": "こんにちは;dahの旧綴り"
        },
        {
            "question": "propana",
            "answer": "プロパン"
        },
        {
            "question": "koala",
            "answer": "コアラ"
        },
        {
            "question": "saga",
            "answer": "マメ科ナンバンアカアズキ属（Adenanthera）の高木;ナンバンアカクロアズギ（A. bicolor Moon）;ナンバンアカアズキ（A. pavonina）"
        },
        {
            "question": "sate",
            "answer": "サテ"
        },
        {
            "question": "dengki",
            "answer": "嫉妬、妬み"
        },
        {
            "question": "ke-",
            "answer": "ある特徴を持ったものを表す名詞を作る;〜出来る"
        },
        {
            "question": "mebel",
            "answer": "家具"
        },
        {
            "question": "cabo",
            "answer": "売春婦"
        },
        {
            "question": "asu",
            "answer": "犬"
        },
        {
            "question": "telunjuk",
            "answer": "人差し指"
        },
        {
            "question": "gabus",
            "answer": "コルク"
        },
        {
            "question": "kangguru",
            "answer": "カンガルー"
        },
        {
            "question": "hias",
            "answer": "飾る"
        },
        {
            "question": "maag",
            "answer": "胃炎"
        },
        {
            "question": "kening",
            "answer": "眉毛;額"
        },
        {
            "question": "komen",
            "answer": "コメント"
        },
        {
            "question": "fruktosa",
            "answer": "フルクトース、果糖"
        },
        {
            "question": "apes",
            "answer": "不運な"
        },
        {
            "question": "teologi",
            "answer": "神学"
        },
        {
            "question": "mesjid",
            "answer": "モスク"
        },
        {
            "question": "limau",
            "answer": "レモン"
        },
        {
            "question": "mortar",
            "answer": "モルタル、漆喰;乳鉢、摺鉢"
        },
        {
            "question": "anekdot",
            "answer": "逸話、秘話"
        },
        {
            "question": "tri",
            "answer": "三"
        },
        {
            "question": "kendo",
            "answer": "剣道"
        },
        {
            "question": "ortu",
            "answer": "両親"
        },
        {
            "question": "kultur",
            "answer": "文化;耕作、栽培;培養"
        },
        {
            "question": "terdidik",
            "answer": "教育を受けた"
        },
        {
            "question": "tofu",
            "answer": "豆腐"
        },
        {
            "question": "minder",
            "answer": "自信がない、不安な"
        },
        {
            "question": "amulet",
            "answer": "御守り、魔除け、護符"
        },
        {
            "question": "pupus",
            "answer": "絶滅した"
        },
        {
            "question": "samosa",
            "answer": "サモサ"
        },
        {
            "question": "perah",
            "answer": "搾る、圧搾する"
        },
        {
            "question": "telaga",
            "answer": "湖"
        },
        {
            "question": "biri-biri",
            "answer": "羊"
        },
        {
            "question": "derma",
            "answer": "施し物、義捐金"
        },
        {
            "question": "disentri",
            "answer": "赤痢"
        },
        {
            "question": "krematorium",
            "answer": "火葬場"
        },
        {
            "question": "doping",
            "answer": "ドーピング;違法薬物の使用"
        },
        {
            "question": "yodium",
            "answer": "沃素"
        },
        {
            "question": "primordial",
            "answer": "最初の、原初の"
        },
        {
            "question": "trinitas",
            "answer": "三位一体"
        },
        {
            "question": "nuri",
            "answer": "鸚鵡"
        },
        {
            "question": "edukasi",
            "answer": "教育"
        },
        {
            "question": "johar",
            "answer": "タガヤサン（Senna siamea; シノニム: Cassia siamea）"
        },
        {
            "question": "republikan",
            "answer": "共和主義者"
        },
        {
            "question": "bolpen",
            "answer": "ボールペン"
        },
        {
            "question": "sunat",
            "answer": "sunahの異綴"
        },
        {
            "question": "dinamo",
            "answer": "発電機、ダイナモ"
        },
        {
            "question": "terigu",
            "answer": "小麦;小麦粉"
        },
        {
            "question": "tempe",
            "answer": "テンペ"
        },
        {
            "question": "kesatu",
            "answer": "第一の、一番目の、最初の"
        },
        {
            "question": "slang",
            "answer": "俗語、俚言"
        },
        {
            "question": "fauna",
            "answer": "動物群;動物誌"
        },
        {
            "question": "retail",
            "answer": "小売り"
        },
        {
            "question": "kemenyan",
            "answer": "エゴノキ科エゴノキ属の中高木、アンソクコウノキ、スマトラエゴノキ（Styrax benzoin）"
        },
        {
            "question": "bushido",
            "answer": "busyidoの異表記"
        },
        {
            "question": "ampere",
            "answer": "アンペア"
        },
        {
            "question": "bolpoin",
            "answer": "ボールペン"
        },
        {
            "question": "formalin",
            "answer": "ホルマリン"
        },
        {
            "question": "sindur",
            "answer": "マメ科シンドラノキ属の中高木、シンドラノキ（Sindora wallichii）"
        }
    ];
    const quizAnswersMap = new Map(quizData.map(quiz => [ quiz.question, quiz.answer ]));

})();
