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

    $f.LANGUAGES = Object.freeze({
        JAPANESE: 'jp',
        INDONESIAN: 'id'
    });
    const LANGUAGE_PROGRESS_VARS = new Map([
        [$f.LANGUAGES.JAPANESE, () => $nv.progressJapanese],
        [$f.LANGUAGES.INDONESIAN, () => $nv.progressIndonesian]
    ]);
    let sentences = null;
    let quizData = null;
    let quizAnswersMap = null;
    $f.fetchData = language => {
        return Promise.all([
            fetch(`js/plugins/data/${language}/sentences.json`)
                .then(response => response.json())
                .then(data => sentences = data),
            fetch(`js/plugins/data/${language}/quiz.json`)
                .then(response => response.json())
                .then(data => quizData = data)
                .then(() => quizAnswersMap = new Map(quizData.map(quiz => [ quiz.question, quiz.answer ])))
        ]);
    };

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

            if (event.quiz.isStunned) {
                event.quiz.isStunned = false;
                continue;
            }

            event.setMoveSpeed(realMoveSpeed);
            const playerDistance = distance($gamePlayer, event);
            if (playerDistance === 1) {
                event.quiz.isAttacking = true;
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

        this.quiz.isAttacking = false;
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
        portalEnemy.quiz.portalEnemy = true;
    }

    $f.reloadSavedEnemies = () => {
        $gameMap.events().forEach(setExistingEnemyText);
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
        if (event.quiz && event.quiz.isHit) {
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

        // Object.assign to keep the isHit etc. properties
        event.quiz = Object.assign(event.quiz || {}, {
            question: randomQuestion.question,
            answers: answers,
            correct: correctIndex,
            incorrect: incorrectIndexes,
            answeredWrong: [],
            incorrectAnswersToMark: -(goodAnswers.get(randomQuestion.question) || [ 0 ])[0]
        });

        setExistingEnemyText(event);
    }

    function setExistingEnemyText(enemyEvent) {
        $eventText.set(enemyEvent.eventId(), enemyEvent.quiz.question);
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
        const translationScoreThreshold = 1;
        
        const word = quiz.question;
        const sentence = getExampleSentence(word);
        const wordTranslationFunction = sentence.includes('[')
            ? addWordTranslationsConjugated
            : addWordTranslationsUnconjugated;
        $nv.exampleSentence = wordTranslationFunction(
            sentence,
            word,
            translationScoreThreshold
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

    const AUXILIARIES = new Map([
        [ 'の', "of / 's (possesive)" ],
        [ 'は', "as for (sentence topic marker)" ],
        [ 'が', "is the one that is (sentence topic marker)" ],
        [ 'に', "to / at / for" ],
        [ 'へ', "to / towards / for" ],

        [`たい,終止形-一般`, `expresses desire to do something (“want to”)`],
        [`ます,意志推量形`, `polite volitional (“let’s…”, “shall we…”)`],
        [`素,一般`, `element/thing; often part of compound nouns`],
        [`疋,助数詞`, `counter for small animals`],
        [`記,一般`, `record/chronicle`],
        [`野,一般`, `field/plain; often part of place names`],
        [`だ,終止形-一般`, `copula “to be” (informal)`],
        [`れる,連用形-一般`, `passive/potential suffix (“be done”, “can”)`],
        [`た,連体形-一般`, `past tense modifying noun`],
        [`た,終止形-一般`, `past tense statement`],
        [`ます,終止形-一般`, `polite present/future ending`],
        [`られる,連用形-一般`, `passive/potential/honorific auxiliary`],
        [`た,仮定形-一般`, `conditional “when/if …” (past-based)`],
        [`ます,連体形-一般`, `polite form modifying noun`],
        [`本,助数詞`, `counter for long objects or occurrences (e.g. films, items)`],
        [`類,一般`, `kind/type/category`],
        [`ッス,終止形-一般`, `casual/slang polite copula`],
        [`です,終止形-一般`, `polite copula “is/am/are”`],
        [`せる,連用形-一般`, `causative (“make/let someone do”)`],
        [`つ,助数詞`, `general counter for small items`],
        [`さ,一般`, `nominalizing suffix indicating degree/quality`],
        [`ます,連用形-一般`, `polite verb stem connector`],
        [`敷,一般`, `spread/layer; part of compound nouns`],
        [`物,一般`, `thing/object`],
        [`化,サ変可能`, `-ization/transform into`],
        [`亭,一般`, `pavilion/residence`],
        [`長,一般`, `head/leader`],
        [`だ,連体形-一般`, `attributive copula (“that is…”)`],
        [`さん,一般`, `honorific title`],
        [`ちん,一般`, `affectionate/diminutive suffix`],
        [`ない,終止形-一般`, `negation (“not”)`],
        [`だ,連用形-促音便`, `connective form of copula (past-like contraction)`],
        [`だ,連用形-ニ`, `copula in adverbial/continuative form`],
        [`ます,未然形-一般`, `polite auxiliary base before negation`],
        [`ぬ,終止形-撥音便`, `classical negation`],
        [`しむ,終止形-一般`, `classical causative`],
        [`ない,連体形-一般`, `negative attributive form`],
        [`れる,連体形-一般`, `passive/potential modifying noun`],
        [`だ,連用形-一般`, `connective copula`],
        [`げ,形状詞的`, `seeming/appearing`],
        [`っす,意志推量形`, `casual volitional/polite slang`],
        [`です,連体形-一般`, `polite attributive copula`],
        [`です,意志推量形`, `polite conjecture (“probably…”)`],
        [`む,終止形-一般`, `classical volitional (“will/shall”)`],
        [`とも,副詞可能`, `emphasis (“certainly”, “at least”)`],
        [`つ,連体形-一般`, `classical perfect attributive`],
        [`なり,連用形-一般`, `classical copula connective`],
        [`ぬ,連体形-一般`, `classical perfect attributive`],
        [`せる,終止形-一般`, `causative verb ending`],
        [`洞,一般`, `cave/hollow`],
        [`用,一般`, `use/purpose`],
        [`せる,連体形-一般`, `causative attributive`],
        [`ちゃん,一般`, `affectionate diminutive suffix`],
        [`夢,一般`, `dream`],
        [`線,一般`, `line/route`],
        [`っぽい,終止形-一般`, `“-like”, tendency`],
        [`日,助数詞`, `counter for days`],
        [`的,形状詞的`, `-like/-al (adjectival)`],
        [`がる,連体形-一般`, `show signs of feeling`],
        [`ちゃう,終止形-一般`, `contraction of てしまう (“end up doing”)`],
        [`蔵,一般`, `storehouse`],
        [`院,一般`, `institution/building suffix`],
        [`ぬ,終止形-一般`, `classical negation`],
        [`てる,連用形-一般`, `contraction of ている (progressive/state)`],
        [`たい,連体形-一般`, `desire attributive (“want to…”)`],
        [`橋,一般`, `bridge`],
        [`上,副詞可能`, `above/up; also degree`],
        [`がかる,連用形-促音便`, `tinged with/partially`],
        [`だ,連用形-融合`, `contracted copula form`],
        [`科,一般`, `subject/department`],
        [`力,一般`, `power/ability`],
        [`付き,一般`, `with/attached`],
        [`さま,一般`, `respectful suffix`],
        [`島,一般`, `island`],
        [`室,一般`, `room/chamber`],
        [`型,一般`, `type/form`],
        [`てる,終止形-一般`, `ongoing state (“is doing”)`],
        [`斎,一般`, `name/title element`],
        [`れる,終止形-一般`, `passive/potential ending`],
        [`だ,仮定形-一般`, `conditional copula`],
        [`られる,未然形-一般`, `passive/potential base`],
        [`立,一般`, `standing/established`],
        [`はる,未然形-一般`, `classical auxiliary (honorific nuance)`],
        [`けり,連体形-一般`, `classical past/realization`],
        [`匹,助数詞`, `counter for animals`],
        [`らしい,終止形-一般`, `seems/typical`],
        [`がる,終止形-一般`, `show emotion`],
        [`られる,終止形-一般`, `passive/potential`],
        [`乗り,一般`, `ride/boarding`],
        [`簇,一般`, `musical note name`],
        [`らしい,連用形-一般`, `in a typical way`],
        [`人,一般`, `person`],
        [`子,一般`, `child/element`],
        [`べし,連体形-一般`, `should/ought to`],
        [`倒し,一般`, `knocking down`],
        [`持,一般`, `holding`],
        [`場,一般`, `place`],
        [`させる,終止形-一般`, `causative (“make/let”)`],
        [`岸,一般`, `shore`],
        [`所,一般`, `place`],
        [`内,一般`, `inside/within`],
        [`相,一般`, `mutual/aspect`],
        [`等,一般`, `etc./equal`],
        [`わ,助数詞`, `counter (archaic/regional)`],
        [`っ子,一般`, `child/person characterized by`],
        [`ぬ,連用形-一般`, `classical perfect/negation stem`],
        [`けり,終止形-一般`, `classical past`],
        [`来,副詞可能`, `next/coming`],
        [`華,一般`, `splendor/flower`],
        [`舎,一般`, `building/house`],
        [`館,一般`, `building/hall`],
        [`たち,一般`, `pluralizing suffix`],
        [`やすい,終止形-一般`, `easy to`],
        [`切り,一般`, `completely/limit`],
        [`方,一般`, `method/way`],
        [`ちゃう,連用形-促音便`, `contracted “-te shimau” stem`],
        [`間,副詞可能`, `interval/space`],
        [`員,一般`, `member/staff`],
        [`くん,一般`, `casual honorific`],
        [`です,連用形-一般`, `polite copula connective`],
        [`国,一般`, `country`],
        [`者,一般`, `person (suffix)`],
        [`なり,終止形-一般`, `classical copula`],
        [`田,一般`, `field/rice paddy`],
        [`中,副詞可能`, `during/inside`],
        [`てる,連体形-一般`, `ongoing attributive`],
        [`殿,一般`, `title/suffix (lord)`],
        [`品,一般`, `goods/item`],
        [`とく,意志推量形`, `contraction of “ておく” volitional`],
        [`だ,意志推量形`, `conjectural copula (“probably”)`],
        [`枚,助数詞`, `counter for flat objects`],
        [`よう,一般`, `appearance/seems`],
        [`冊,一般`, `counter for books`],
        [`外れ,形状詞的`, `out of season/off`],
        [`水,一般`, `water`],
        [`位,一般`, `rank/position`],
        [`祭,一般`, `festival`],
        [`生,一般`, `student/life`],
        [`逹,一般`, `plural marker (archaic)`],
        [`聞,一般`, `hearing/report`],
        [`下,副詞可能`, `under/below`],
        [`らしい,連体形-一般`, `seeming/typical attributive`],
        [`っす,終止形-一般`, `slang polite ending`],
        [`おろし,一般`, `newly made/wholesale`],
        [`集,一般`, `collection`],
        [`付,一般`, `attached/with`],
        [`派,一般`, `group/faction`],
        [`歳,助数詞`, `age counter`],
        [`にくい,連用形-一般`, `difficult to do`],
        [`街,一般`, `town/street`],
        [`進,一般`, `advance`],
        [`紙,一般`, `paper`],
        [`様,一般`, `manner/state`],
        [`省,一般`, `ministry`],
        [`隊,一般`, `group/unit`],
        [`でる,連体形-一般`, `contraction of 出る/ている`],
        [`やすい,連体形-一般`, `easy to (attributive)`],
        [`油,一般`, `oil`],
        [`路,一般`, `road`],
        [`業,一般`, `industry/work`],
        [`なり,連体形-一般`, `classical attributive copula`],
        [`家,一般`, `house/expert suffix`],
        [`拳,一般`, `fist/martial art`],
        [`樹,一般`, `tree`],
        [`林,一般`, `forest`],
        [`てらっしゃる,連用形-イ音便`, `honorific “to go/come/be”`],
        [`後,副詞可能`, `after`],
        [`たて,一般`, `freshly made/vertical`],
        [`屋,一般`, `shop/person suffix`],
        [`たい,連用形-一般`, `desire stem`],
        [`へん,終止形-一般`, `Kansai negation`],
        [`答,一般`, `answer`],
        [`やすい,語幹-一般`, `ease suffix stem`],
        [`風,形状詞的`, `style/appearance`],
        [`簿,一般`, `register/book`],
        [`ぽい,連体形-一般`, `-ish/-like attributive`],
        [`づらい,終止形-一般`, `difficult to do`],
        [`すぎ,形状詞的`, `excessive`],
        [`やすい,連用形-一般`, `easy to (adverbial)`],
        [`學,一般`, `study`],
        [`すぎ,副詞可能`, `too much`],
        [`り,終止形-一般`, `classical perfect`],
        [`がる,連用形-一般`, `showing feeling (stem)`],
        [`掛け,一般`, `hanging/attachment`],
        [`っこ,一般`, `diminutive/childlike suffix`],
        [`海,一般`, `sea/ocean`],
        [`ない,連用形-一般`, `negative connective (“not doing…”)`],
        [`吹,一般`, `blowing/vent`],
        [`末,副詞可能`, `end/final stage`],
        [`店,一般`, `shop/store`],
        [`板,一般`, `board/panel`],
        [`製,一般`, `made/manufactured`],
        [`器,一般`, `device/instrument`],
        [`建て,一般`, `building/style of building`],
        [`つき,一般`, `with/attached`],
        [`学,一般`, `study/learning`],
        [`形,一般`, `shape/form`],
        [`ごと,副詞可能`, `every/each`],
        [`大,一般`, `big/major`],
        [`令,一般`, `law/edict`],
        [`目,一般`, `ordinal marker (“-th”)`],
        [`らし,未然形-補助`, `conjectural auxiliary base (“seems”)`],
        [`過ぎ,形状詞的`, `excessive/too much`],
        [`問,助数詞`, `counter for questions`],
        [`厚,一般`, `thickness`],
        [`てる,未然形-一般`, `progressive auxiliary base`],
        [`通,助数詞`, `counter for letters/documents`],
        [`寺,一般`, `temple`],
        [`っこい,連体形-一般`, `having a tendency/feeling (e.g. sticky, oily)`],
        [`じゃう,連用形-促音便`, `contraction of てしまう (stem)`],
        [`車,一般`, `vehicle`],
        [`はる,連用形-一般`, `classical auxiliary (honorific nuance)`],
        [`停,一般`, `stop (bus/train)`],
        [`じゃ,意志推量形`, `classical copula volitional (“probably is”)`],
        [`ぶり,一般`, `style/manner/since`],
        [`こ,一般`, `small item/powder (suffix)`],
        [`軒,一般`, `counter for houses`],
        [`らしい,連用形-促音便`, `seeming (adverbial, contracted)`],
        [`給,一般`, `supply/provision`],
        [`がち,形状詞的`, `prone to/tend to`],
        [`ら,一般`, `plural marker`],
        [`宮,一般`, `shrine/palace`],
        [`小,一般`, `small`],
        [`書,一般`, `writing/book`],
        [`ふ,一般`, `suffix/phonetic element (often archaic)`],
        [`毎,一般`, `every`],
        [`かた,一般`, `way/method`],
        [`けむ,連体形-一般`, `classical conjecture (past speculation)`],
        [`筆,一般`, `writing brush/pen`],
        [`られる,連体形-一般`, `passive/potential attributive`],
        [`合,一般`, `fitting/combining`],
        [`安,一般`, `cheap/safe`],
        [`掛,一般`, `hanging/over`],
        [`べし,未然形-補助`, `obligation/prohibition base`],
        [`城,一般`, `castle`],
        [`き,連体形-一般`, `classical past attributive`],
        [`でる,連用形-一般`, `come out/auxiliary contraction`],
        [`弱,一般`, `weak`],
        [`園,一般`, `garden/kindergarten`],
        [`あたり,副詞可能`, `around/about`],
        [`区,一般`, `district/ward`],
        [`財,一般`, `property/wealth`],
        [`作,一般`, `making/work`],
        [`まん,一般`, `suffix/name element`],
        [`ぽい,語幹-一般`, `-ish/-like (stem)`],
        [`にくい,終止形-一般`, `difficult to do`],
        [`べし,終止形-一般`, `must/should`],
        [`次,助数詞`, `counter for sequence/order`],
        [`症,一般`, `illness/condition`],
        [`臭,一般`, `smell/odor`],
        [`制,一般`, `system/control`],
        [`性,一般`, `nature/characteristic`],
        [`くさい,連体形-一般`, `-smelling/-ish attributive`],
        [`済み,一般`, `finished/completed`],
        [`閣,一般`, `building/palace`],
        [`選,一般`, `selection`],
        [`そう,一般`, `seems/looks like`],
        [`手,一般`, `hand/person (profession suffix)`],
        [`しめる,連用形-一般`, `causative classical stem`],
        [`らる,終止形-一般`, `classical passive/honorific`],
        [`せる,命令形`, `causative command (“make/let!”)`],
        [`れる,未然形-一般`, `passive/potential base`],
        [`気,形状詞的`, `feeling/seemingly`],
        [`師,一般`, `expert/professional`],
        [`士,一般`, `professional title`],
        [`録,一般`, `record`],
        [`らし,連体形-一般`, `seeming attributive (classical)`],
        [`展,一般`, `exhibition`],
        [`流,一般`, `style/school/flow`],
        [`校,一般`, `school`],
        [`ぬ,連体形-撥音便`, `classical negation attributive`],
        [`系,一般`, `system/lineage`],
        [`道,一般`, `road/way`],
        [`署,一般`, `office/station`],
        [`侯,一般`, `feudal lord/title`],
        [`史,一般`, `history`],
        [`ずみ,一般`, `completed/finished (suffix)`],
        [`達,一般`, `plural suffix`],
        [`ない,連用形-促音便`, `negative connective (contracted)`],
        [`発,一般`, `departure/shot/occurrence`],
        [`志,一般`, `will/intention`],
        [`でる,終止形-一般`, `come out/be doing (casual)`],
        [`たん,一般`, `affectionate suffix`],
        [`池,一般`, `pond`],
        [`朝,一般`, `morning`],
        [`官,一般`, `official/government`],
        [`病,一般`, `illness`],
        [`状,一般`, `condition/form`],
        [`域,一般`, `area/region`],
        [`丼,一般`, `bowl/dish`],
        [`族,一般`, `tribe/group`],
        [`まみれ,一般`, `covered with`],
        [`っ放し,形状詞的`, `leaving as is/unchanged`],
        [`外,一般`, `outside`],
        [`似,一般`, `resemblance`],
        [`せる,未然形-一般`, `causative base`],
        [`共,副詞可能`, `together/both`],
        [`岩,一般`, `rock`],
        [`山,一般`, `mountain`],
        [`使,一般`, `use/messenger`],
        [`ぼっち,一般`, `alone/lonely`],
        [`漬け,一般`, `pickled/soaked`],
        [`とる,連体形-一般`, `take/do (dialect contraction)`],
        [`てく,命令形`, `contraction of ていく command`],
        [`てく,連用形-促音便`, `contraction of ていく (stem)`],
        [`ます,命令形`, `polite command`],
        [`高,一般`, `high/expensive`],
        [`けり,已然形-一般`, `classical past (realis form)`],
        [`易い,終止形-一般`, `easy to do`],
        [`にくい,連体形-一般`, `difficult to do (attributive)`],
        [`とく,仮定形-融合`, `contraction of ておく conditional`],
        [`過,副詞可能`, `past/excess`],
        [`たり,終止形-一般`, `listing/perfect auxiliary`],
        [`世,一般`, `world/society`],
        [`り,ク語法`, `classical nominalizer`],
        [`堂,一般`, `hall/building`],
        [`剤,一般`, `medicine/agent`],
        [`薬,一般`, `medicine`],
        [`輪,一般`, `wheel/ring`],
        [`分,サ変可能`, `division/part`],
        [`始め,副詞可能`, `beginning`],
        [`とる,連用形-促音便`, `dialect contraction (taking/doing)`],
        [`や,意志推量形`, `sentence-ending conjecture (casual)`],
        [`入り,一般`, `entering/containment`],
        [`草,一般`, `grass/plant`],
        [`鬼,一般`, `demon/ogre`],
        [`帯,一般`, `belt/band/time slot`],
        [`酒,一般`, `alcohol/sake`],
        [`浪,一般`, `wave/wandering`],
        [`じ,終止形-一般`, `negation/volitional (classical “not/let’s not”)`],
        [`等々,一般`, `etc./and so on`],
        [`まわり,一般`, `surroundings/around`],
        [`とく,連用形-一般`, `contraction of ておく (doing in advance)`],
        [`湖,一般`, `lake`],
        [`た,意志推量形`, `conjectural past (“probably…”)`],
        [`免,一般`, `exemption`],
        [`き,終止形-一般`, `classical past`],
        [`煙,一般`, `smoke`],
        [`級,一般`, `grade/class`],
        [`てく,未然形-一般`, `contraction of ていく base`],
        [`とく,連用形-イ音便`, `contraction of ておく (phonetic change)`],
        [`丸,一般`, `circle/ship suffix`],
        [`ない,仮定形-一般`, `negative conditional (“if not…”)`],
        [`錠,一般`, `tablet/pill`],
        [`費,一般`, `expense/cost`],
        [`権,一般`, `right/authority`],
        [`っぽい,連体形-一般`, `-ish/-like attributive`],
        [`ぬ,已然形-一般`, `classical perfect (realis)`],
        [`金,一般`, `money/gold`],
        [`たり,連体形-一般`, `listing/perfect attributive`],
        [`出,一般`, `exit/appearance`],
        [`まじ,連体形-一般`, `prohibition/impossibility (classical)`],
        [`っぽい,連用形-一般`, `-ish/-like adverbial`],
        [`倉,一般`, `warehouse`],
        [`石,一般`, `stone`],
        [`行き,一般`, `going/destination`],
        [`ジュ,一般`, `phonetic element/loan suffix`],
        [`観,一般`, `view/observation`],
        [`りん,一般`, `small round object/counter`],
        [`まい,助数詞`, `counter (archaic/rare)`],
        [`属,一般`, `belonging/category`],
        [`てる,命令形`, `contraction of ている command`],
        [`夜,一般`, `night`],
        [`丘,一般`, `hill`],
        [`邸,一般`, `residence`],
        [`だらけ,形状詞的`, `full of/covered with`],
        [`児,一般`, `child`],
        [`がたい,連体形-一般`, `hard to do (attributive)`],
        [`隻,助数詞`, `counter for ships/large animals`],
        [`る,終止形-一般`, `classical passive/honorific ending`],
        [`撃,一般`, `strike/attack`],
        [`馬,一般`, `horse`],
        [`ッ,助数詞`, `small counter (archaic/colloquial)`],
        [`取,一般`, `taking`],
        [`刺,一般`, `stab/needle`],
        [`羽,助数詞`, `counter for birds/rabbits`],
        [`源,一般`, `source`],
        [`勢,一般`, `force/group`],
        [`料,一般`, `fee/material`],
        [`眼,一般`, `eye`],
        [`警,一般`, `police/warning`],
        [`把,助数詞`, `counter (bundles/handfuls, Chinese origin)`],
        [`肘,一般`, `elbow`],
        [`則,一般`, `rule/law`],
        [`氏,一般`, `surname/title`],
        [`補,一般`, `assistant/sub`],
        [`炎,一般`, `flame/inflammation`],
        [`符,一般`, `symbol/mark`],
        [`語り,一般`, `narration/storytelling`],
        [`着,一般`, `wearing/arrival`],
        [`党,一般`, `political party`],
        [`傷,一般`, `wound/damage`],
        [`儀,一般`, `ceremony`],
        [`星,一般`, `star`],
        [`圏,一般`, `sphere/zone`],
        [`願,一般`, `wish/application`],
        [`調,一般`, `tone/condition`],
        [`過ぎ,副詞可能`, `too much/excessively`],
        [`戦,一般`, `battle`],
        [`質,一般`, `quality/substance`],
        [`荘,一般`, `manor/villa`],
        [`冠,一般`, `crown/title`],
        [`郷,一般`, `village/home region`],
        [`建,一般`, `build/establish`],
        [`ナリ,終止形-一般`, `classical copula (katakana form)`],
        [`庁,一般`, `government office`],
        [`向け,一般`, `intended for`],
        [`立ち,一般`, `standing/rising`],
        [`並み,一般`, `average/row/level`],
        [`界,一般`, `world/field`],
        [`ヤン,一般`, `dialectal/emphatic ending`],
        [`り,連体形-一般`, `classical perfect attributive`],
        [`ちゃう,連用形-一般`, `contraction of てしまう (stem)`],
        [`団,一般`, `group`],
        [`焼,一般`, `burning/grilling`],
        [`がたし,連体形-一般`, `difficult to do (classical attributive)`],
        [`忌,一般`, `mourning/taboo`],
        [`法,一般`, `method/law`],
        [`話,一般`, `talk/story`],
        [`防,一般`, `defense/prevention`],
        [`事,一般`, `matter/thing`],
        [`米,一般`, `rice/USA`],
        [`報,一般`, `report/news`],
        [`腔,一般`, `cavity`],
        [`視,サ変可能`, `regard/view (suru-verb)`],
        [`遍,助数詞`, `counter for times (archaic)`],
        [`とく,命令形`, `contraction of ておく command`],
        [`めかす,連用形-一般`, `make something seem/pretend`],
        [`誌,一般`, `magazine/record`],
        [`値,一般`, `value`],
        [`鞘,一般`, `sheath`],
        [`伏,助数詞`, `counter (hidden items, rare)`],
        [`胞,一般`, `cell`],
        [`当たり,副詞可能`, `per/each`],
        [`罪,一般`, `crime`],
        [`債,一般`, `debt/bond`],
        [`ない,仮定形-融合`, `negative conditional contraction`],
        [`葬,一般`, `burial`],
        [`置き,一般`, `placing`],
        [`裁,一般`, `judgment`],
        [`伝,一般`, `transmission/biography`],
        [`弾,一般`, `bullet`],
        [`出し,一般`, `taking out/pointing out`],
        [`書き,一般`, `writing`],
        [`茎,一般`, `stem (plant)`],
        [`犯,一般`, `offense/criminal`],
        [`刈,一般`, `cutting`],
        [`サマ,一般`, `honorific suffix (katakana)`],
        [`可し,連用形-一般`, `classical “good/should” stem`],
        [`君,一般`, `lord/you (male)`],
        [`廷,一般`, `court`],
        [`卵,一般`, `egg`],
        [`たり,已然形-一般`, `listing/perfect (realis)`],
        [`らしい,語幹-一般`, `seeming (stem)`],
        [`審,一般`, `judge/examine`],
        [`かねる,連用形-一般`, `cannot do (due to difficulty)`],
        [`易い,連用形-一般`, `easy to do (adverbial)`],
        [`難し,終止形-一般`, `difficult`],
        [`鉄,一般`, `iron`],
        [`教,一般`, `teaching/religion`],
        [`網,一般`, `net/network`],
        [`尾,助数詞`, `counter for fish`],
        [`め,一般`, `derogatory/emphatic suffix`],
        [`浴,一般`, `bathing`],
        [`帳,一般`, `notebook/register`],
        [`歌,一般`, `song`],
        [`つう,終止形-一般`, `colloquial “say/that” ending`],
        [`ぬ,連体形-補助`, `classical negation attributive (auxiliary)`],
        [`ばら,一般`, `rose/cluster`],
        [`ぬ,仮定形-一般`, `classical negative conditional`],
        [`正,一般`, `correct/main`],
        [`かねる,終止形-一般`, `cannot do`],
        [`かねる,未然形-一般`, `cannot do (base)`],
        [`船,一般`, `ship`],
        [`花,一般`, `flower`],
        [`遠,一般`, `far`],
        [`せる,意志推量形`, `causative volitional`],
        [`信,一般`, `belief`],
        [`鳥,一般`, `bird`],
        [`血,一般`, `blood`],
        [`刃,一般`, `blade`],
        [`領,一般`, `territory/collar`],
        [`亡,一般`, `death/loss`],
        [`ばり,一般`, `suffix meaning “just like/very”`],
        [`ツ,助数詞`, `counter (general, archaic)`],
        [`心,一般`, `heart/mind`],
        [`日,一般`, `day/sun`],
        [`宗,一般`, `religion/sect`],
        [`たがる,未然形-一般`, `show desire (third person) base`],
        [`深,形状詞的`, `deep/profound`],
        [`打,一般`, `hit/strike`],
        [`証,一般`, `proof/certificate`],
        [`臭い,語幹-一般`, `smelly/“-ish” stem`],
        [`がる,未然形-一般`, `show feelings (base)`],
        [`くさい,語幹-一般`, `-ish/smelly stem`],
        [`がり,一般`, `tendency/person who often…`],
        [`材,一般`, `material`],
        [`滴,助数詞`, `counter for drops`],
        [`とる,命令形`, `dialect command (“take/do”)`],
        [`まじ,終止形-一般`, `prohibition/impossibility (classical)`],
        [`連れ,一般`, `companion/group`],
        [`振,一般`, `swing/style`],
        [`たい,一般`, `desire suffix (“want to”)`],
        [`才,助数詞`, `counter for age`],
        [`坊,一般`, `boy/young person suffix`],
        [`底,一般`, `bottom`],
        [`膏,一般`, `fat/ointment`],
        [`民,一般`, `people`],
        [`価,一般`, `value/price`],
        [`片,一般`, `piece/fragment`],
        [`ず,連用形-補助`, `classical negation connective`],
        [`卒,一般`, `graduation`],
        [`考,一般`, `thought/examination`],
        [`國,一般`, `country (old form)`],
        [`晶,一般`, `crystal`],
        [`波,一般`, `wave`],
        [`つう,連体形-一般`, `colloquial attributive (“so-called”)`],
        [`ちゃ,終止形-一般`, `contraction of ては (casual)`],
        [`デス,終止形-一般`, `polite copula (katakana)`],
        [`り,未然形-一般`, `classical auxiliary base`],
        [`なり,一般`, `“become”/onomatopoeic suffix`],
        [`佛,一般`, `Buddha`],
        [`ごと,一般`, `each/every`],
        [`向き,一般`, `suitable for`],
        [`さつ,一般`, `counter for books/banknotes`],
        [`辛い,終止形-一般`, `painful/difficult`],
        [`伺,一般`, `inquire/visit (humble)`],
        [`江,一般`, `bay/inlet`],
        [`塊,一般`, `lump/mass`],
        [`黨,一般`, `party (old form)`],
        [`蓋,一般`, `lid/cover`],
        [`座,一般`, `seat/theater troupe`],
        [`夫,一般`, `husband`],
        [`架,一般`, `frame/bridge`],
        [`はる,終止形-一般`, `classical/honorific auxiliary`],
        [`まい,終止形-一般`, `negative volition (“won’t”)`],
        [`戰,一般`, `battle (old form)`],
        [`っつう,終止形-一般`, `slang quotative/emphasis`],
        [`はる,連用形-促音便`, `contracted honorific auxiliary`],
        [`させる,連用形-一般`, `causative stem`],
        [`同士,一般`, `among each other`],
        [`医,一般`, `doctor/medicine`],
        [`計,一般`, `measure/plan`],
        [`ごとし,終止形-一般`, `“like/as if” (classical)`],
        [`がる,連用形-促音便`, `showing feeling (contracted)`],
        [`並,一般`, `average/row`],
        [`射,一般`, `shooting`],
        [`べし,連用形-一般`, `obligation auxiliary stem`],
        [`当,副詞可能`, `hit/corresponding`],
        [`響,一般`, `echo/sound`],
        [`鏡,一般`, `mirror`],
        [`焼き,一般`, `burning/grilling (noun form)`],
        [`煮,一般`, `boiling`],
        [`飯,一般`, `meal/rice`],
        [`監,一般`, `supervisor/warden`],
        [`ざ,一般`, `rough negative/emphasis suffix`],
        [`灯,一般`, `lamp/light`],
        [`傳,一般`, `transmission (old form)`],
        [`っぽい,語幹-一般`, `-ish stem`],
        [`ダ,終止形-一般`, `copula (katakana informal)`],
        [`易い,語幹-一般`, `easy to (stem)`],
        [`味,一般`, `taste/flavor`],
        [`づらい,語幹-一般`, `difficult to (stem)`],
        [`交じり,一般`, `mixed with`],
        [`造,一般`, `make/build`],
        [`臭い,連体形-一般`, `smelly/-ish attributive`],
        [`指,一般`, `finger`],
        [`男,一般`, `man`],
        [`庵,一般`, `hermitage`],
        [`庫,一般`, `warehouse/storage`],
        [`や,一般`, `question/ending particle`],
        [`やがる,連用形-促音便`, `vulgar auxiliary (doing something annoying)`],
        [`代,一般`, `generation/cost`],
        [`入れ,一般`, `putting in/container`],
        [`ずくめ,一般`, `entirely/all in`],
        [`タリ,終止形-一般`, `listing auxiliary (katakana)`],
        [`込み,一般`, `including`],
        [`ム,終止形-一般`, `classical volitional (katakana)`],
        [`如し,連用形-一般`, `“like/as” connective`],
        [`シ,一般`, `classical connective/emphasis`],
        [`協,一般`, `cooperation`],
        [`じ,一般`, `negation/volitional (classical)`],
        [`肢,一般`, `limb`],
        [`とく,終止形-一般`, `contraction of ておく (final form)`],
        [`伐,一般`, `cut down`],
        [`沿い,一般`, `along`],
        [`ず,終止形-一般`, `classical negation`],
        [`魚,一般`, `fish`],
        [`柳,一般`, `willow`],
        [`させる,連体形-一般`, `causative attributive`],
        [`まつ,終止形-一般`, `wait/pine (verb ending)`],
        [`口,一般`, `mouth/entrance`],
        [`どん,一般`, `blunt ending/emphasis`],
        [`っぱなし,形状詞的`, `leaving as is`],
        [`狂,一般`, `madness`],
        [`めく,命令形`, `seem/act like (command)`],
        [`吊り,一般`, `hanging`],
        [`とる,連用形-一般`, `dialect contraction (stem)`],
        [`渓,一般`, `valley/stream`],
        [`走,一般`, `run`],
        [`クン,一般`, `casual suffix (male)`],
        [`公,一般`, `public/main character`],
        [`売り,一般`, `selling`],
        [`ます,終止形-促音便`, `polite past contraction`],
        [`谷,一般`, `valley`],
        [`散,一般`, `scatter`],
        [`遣,一般`, `send/do`],
        [`済,一般`, `finish/settlement`],
        [`藏,一般`, `storehouse (old form)`],
        [`如し,終止形-一般`, `“like/as if”`],
        [`權,一般`, `authority (old form)`],
        [`ぼう,一般`, `stick/young boy suffix`],
        [`どく,命令形`, `move away/do (dialect command)`],
        [`とる,終止形-一般`, `dialect contraction (final)`],
        [`がらみ,一般`, `involving/related to`],
        [`敗,一般`, `defeat`],
        [`込,一般`, `into/including`],
        [`張,一般`, `stretch/tension`],
        [`ぺ,一般`, `slang ending (rough)`],
        [`やん,一般`, `dialect emphasis`],
        [`ヤ,一般`, `exclamatory particle`],
        [`漢,一般`, `man/Chinese`],
        [`持ち,一般`, `possession/holder`],
        [`受,一般`, `receive`],
        [`どうし,一般`, `mutual/among`],
        [`合わせ,一般`, `matching/combining`],
        [`腿,一般`, `thigh`],
        [`やがる,終止形-一般`, `vulgar auxiliary (final)`],
        [`向,一般`, `direction`],
        [`乗,一般`, `ride/multiply`],
        [`産,一般`, `production/birth`],
        [`鋼,一般`, `steel`],
        [`殺,一般`, `kill`],
        [`たい,連用形-ウ音便`, `desire (phonetic change)`],
        [`重,助数詞`, `counter for layers`],
        [`や,終止形-一般`, `sentence-ending particle`],
        [`なり,已然形-一般`, `classical copula (realis)`],
        [`ごとし,連用形-一般`, `“like/as” connective`],
        [`めく,連用形-イ音便`, `seem-like (phonetic change)`],
        [`季,一般`, `season`],
        [`営,一般`, `management/operation`],
        [`飼,サ変可能`, `to keep/raise (animals)`],
        [`囚,一般`, `prisoner`],
        [`現,一般`, `appearance/present`],
        [`斑,一般`, `spot/patch`],
        [`支,一般`, `support/branch`],
        [`ず,連体形-補助`, `classical negation attributive (auxiliary)`],
        [`泣かせ,一般`, `something that makes one cry`],
        [`然,一般`, `-like/so (suffix indicating state)`],
        [`共,一般`, `both/all together`],
        [`労,一般`, `labor/effort`],
        [`塵,一般`, `dust`],
        [`痕,一般`, `trace/mark`],
        [`牒,一般`, `document/record`],
        [`覚,一般`, `sensation/feeling`],
        [`リ,終止形-一般`, `classical perfect (katakana)`],
        [`買,一般`, `buying`],
        [`洋,一般`, `Western/ocean`],
        [`おき,一般`, `interval/spacing`],
        [`研,一般`, `research/polish`],
        [`しめる,命令形`, `causative command (classical “make…”)`],
        [`紀,一般`, `chronicle/era`],
        [`每,一般`, `every (old form)`],
        [`る,連体形-一般`, `attributive verb ending`],
        [`たがる,終止形-一般`, `show desire (third person)`],
        [`ない,語幹-一般`, `negation stem`],
        [`ぽい,連用形-一般`, `-ish adverbial`],
        [`旗,一般`, `flag`],
        [`旁,一般`, `side/along with`],
        [`だん,一般`, `group/step (suffix)`],
        [`メ,一般`, `eye/mark (katakana)`],
        [`女,一般`, `woman`],
        [`犬,一般`, `dog`],
        [`崩れ,一般`, `collapse`],
        [`牛,一般`, `cow`],
        [`ラ,一般`, `phonetic/foreign suffix`],
        [`色,一般`, `color`],
        [`たり,意志推量形`, `listing/conjecture auxiliary`],
        [`刀,一般`, `sword`],
        [`酸,一般`, `acid`],
        [`さい,助数詞`, `counter for years (age)`],
        [`挿,一般`, `insert`],
        [`郭,一般`, `enclosure/frame`],
        [`はなし,形状詞的`, `none/nothing special`],
        [`たがる,連用形-一般`, `show desire (stem)`],
        [`天,一般`, `heaven/sky`],
        [`槽,一般`, `tank`],
        [`難し,連体形-一般`, `difficult (attributive)`],
        [`砂,一般`, `sand`],
        [`しめる,未然形-一般`, `causative base`],
        [`装,一般`, `clothing/equipment`],
        [`楽,一般`, `comfort/music`],
        [`雨,一般`, `rain`],
        [`宛,一般`, `addressed to`],
        [`させる,未然形-一般`, `causative base`],
        [`とう,一般`, `tower`],
        [`炭,一般`, `charcoal`],
        [`個,助数詞`, `counter for small items`],
        [`佐,一般`, `assistant/title`],
        [`光,一般`, `light`],
        [`痛,一般`, `pain`],
        [`桿,一般`, `rod`],
        [`限,副詞可能`, `limit`],
        [`刊,一般`, `publication`],
        [`難い,終止形-一般`, `hard to do`],
        [`遣い,一般`, `use/errand`],
        [`がたい,連用形-一般`, `hard to do (adverbial)`],
        [`がたし,終止形-一般`, `difficult (classical)`],
        [`布,一般`, `cloth`],
        [`レる,連用形-一般`, `passive/negative imperative (classical katakana)`],
        [`梅,一般`, `plum`],
        [`なり,未然形-一般`, `classical copula base`],
        [`らる,連体形-一般`, `classical passive attributive`],
        [`墓,一般`, `grave`],
        [`余,一般`, `surplus/over`],
        [`扇,一般`, `fan`],
        [`尽くし,一般`, `full of/all kinds of`],
        [`筒,一般`, `tube`],
        [`技,一般`, `technique`],
        [`御,一般`, `honorific prefix`],
        [`廟,一般`, `shrine/mausoleum`],
        [`サン,一般`, `honorific suffix (katakana)`],
        [`たい,仮定形-一般`, `conditional desire (“if want to…”)`],
        [`強,一般`, `strong`],
        [`くさい,終止形-一般`, `-ish/smelly`],
        [`錦,一般`, `brocade`],
        [`婦,一般`, `woman/wife`],
        [`斬り,一般`, `cutting/slashing`],
        [`差し,一般`, `pointing/inserting`],
        [`留,一般`, `stay/keep`],
        [`たがる,連体形-一般`, `show desire (attributive)`],
        [`墳,一般`, `mound/tomb`],
        [`はつ,一般`, `departure/first`],
        [`沙,一般`, `sand (Chinese-origin)`],
        [`乘,一般`, `ride/multiply (old form)`],
        [`獣,一般`, `beast`],
        [`いら,一般`, `suffix/phonetic element`],
        [`ヌ,連体形-撥音便`, `classical negation attributive (katakana)`],
        [`ども,一般`, `plural/derogatory suffix`],
        [`超,一般`, `super/exceed`],
        [`孔,一般`, `hole`],
        [`尊,一般`, `honor/respect`],
        [`織り,一般`, `weaving`],
        [`ず,未然形-補助`, `classical negation base`],
        [`港,一般`, `port`],
        [`ったらしい,終止形-一般`, `pitiful/typical (colloquial)`],
        [`衆,一般`, `crowd/masses`],
        [`峰,一般`, `peak`],
        [`新,一般`, `new`],
        [`タ,終止形-一般`, `past/copula (katakana)`],
        [`ぽい,終止形-一般`, `-ish/-like`],
        [`裏,一般`, `reverse/behind`],
        [`張,助数詞`, `counter for flat objects (e.g. paper)`],
        [`れる,仮定形-一般`, `passive/potential conditional`],
        [`てる,仮定形-融合`, `contraction of ている conditional`],
        [`マス,連用形-一般`, `polite auxiliary (katakana stem)`],
        [`傘,一般`, `umbrella`],
        [`站,一般`, `station (Chinese-origin)`],
        [`れる,終止形-撥音便`, `passive/potential (phonetic change)`],
        [`らむ,連体形-撥音便`, `classical conjecture attributive`],
        [`ショ,一般`, `suffix/phonetic element`],
        [`あげ,一般`, `raising/frying`],
        [`つこ,一般`, `diminutive suffix`],
    ]);

    /**
     * 
     * @param {string} sentence 
     * @param {string} currentWord 
     * @param {number} translationScoreThreshold 
     */
    function addWordTranslationsConjugated(sentence, currentWord, translationScoreThreshold) {
        return sentence.replace(/\[(.*?)\]/g, (match, capture) => {
            const parts = capture.split('|');
            const wordInSentence = parts[0];
            const baseWord = parts[1] || wordInSentence;
            
            if (currentWord === baseWord) {
                return colorCurrentWord(wordInSentence);
            }
            
            if ((goodAnswers.get(baseWord) || [ 0 ])[0] > translationScoreThreshold) {
                return wordInSentence + ' ';
            }
            if (parts.length === 1) {
                return `${wordInSentence} ${colorExplanation(`(${getWordOrAuxiliaryTranslation(baseWord)})`)} `;
            }

            return `${wordInSentence} ${colorExplanation(`(${parts.slice(1).map(getWordOrAuxiliaryTranslation).join(' - ')})`)} `;
        }).trim();
    }

    function colorCurrentWord(string) {
        const currentWordColorId = 3;
        return colorString(string, currentWordColorId);
    }

    function colorExplanation(string) {
        const explanationColorId = 2;
        return colorString(string, explanationColorId);
    }

    function colorString(string, rpgMakerColorId) {
        return `\\c[${rpgMakerColorId}]${string}\\c[0]`;
    }

    function getWordOrAuxiliaryTranslation(part) {
        const word = quizAnswersMap.get(part);
        if (word) {
            return word;
        }

        if (!isNaN(part)) {
            return part;
        }

        return AUXILIARIES.get(part) || `{${part}}`;
    }

    function addWordTranslationsUnconjugated(sentence, currentWord, translationScoreThreshold) {
        return sentence.replace(/\w+/g, match => {
            const wordInSentence = match;
            const baseWord = wordInSentence.toLowerCase();
            
            if (currentWord === baseWord) {
                return colorCurrentWord(wordInSentence);
            }
            
            if ((goodAnswers.get(baseWord) || [ 0 ])[0] > translationScoreThreshold) {
                return wordInSentence;
            }

            return `${wordInSentence} ${colorExplanation(`(${quizAnswersMap.get(baseWord)})`)}`;
        });
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

        if (enemyEvent.quiz.isHit) {
            $eventText.clear(enemyEvent.eventId());
            if (enemyEvent.quiz.portalEnemy) {
                $f.placePortal(enemyEvent.x, enemyEvent.y);
            } else if (Math.random() < 0.1) {
                $f.placeEvent(enemyEvent.x, enemyEvent.y, 'potion');
            }
            $gameMap.eraseEvent(enemyEvent.eventId());

        } else {
            enemyEvent.quiz.isStunned = true;
            enemyEvent.quiz.isHit = true;
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
        goodAnswers = new Map(Object.entries(getProgressObject()));
        quizLevel = [...goodAnswers.values()].reduce((acc, curr) => Math.max(acc, curr[1]), 1);
    };

    $f.rememberProgress = (question, quizLevel, isCorrect) => {
        const answerValue = (goodAnswers.get(question) || [ 0, quizLevel ]);

        answerValue[1] = quizLevel;
        answerValue[0] = isCorrect
            ? (Math.max(answerValue[0], 0) + 1)
            : (Math.min(answerValue[0], 0) - 1);

        goodAnswers.set(question, answerValue);
        getProgressObject()[question] = answerValue;

        Game_Interpreter.prototype.pluginCommand('Persistent', ['Save']);
    }

    function getProgressObject() {
        if (!$nv.progress[$nv.language]) {
            $nv.progress[$nv.language] = {};
        }
        return $nv.progress[$nv.language];
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

})();
