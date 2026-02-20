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

    const QUIZ_START = 0;
    const QUIZ_AMOUNT = 100;

    const distanceToFollow = 3;
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
            } else if (playerDistance <= distanceToFollow || event.isSameRoomWithPlayer()) {
                event.moveTowardPlayer();
            } else {
                event.moveRandom();
            }
        }

        if (currentEnemyIndex >= events.length) {
            currentEnemyIndex = 0;
        }
    }

    $f.moveEnemies = moveEnemies;

    const _Game_Event_unlock = Game_Event.prototype.unlock;
    Game_Event.prototype.unlock = function () {
        _Game_Event_unlock.call(this);

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
        $gameMap.events().forEach($f.setEnemyText);
    }

    $f.setEnemyText = event => {
        if (!event || event._erased || !event.event().meta || !event.event().meta.enemy) {
            return;
        }

        const randomQuestion = pickRandom(quizData, QUIZ_START, QUIZ_AMOUNT);
        const answers = [randomQuestion.answer];
        for (let i = 0; i < 3; i++) {
            let randomAnswer;
            let answer;
            do {
                randomAnswer = pickRandom(quizData, QUIZ_START, QUIZ_AMOUNT);
                answer = randomAnswer.answer;
            } while (answers.includes(answer));
            answers.push(answer);
        }

        shuffle(answers);
        const correctIndex = answers.findIndex(answer => answer === randomQuestion.answer);
        const incorrectIndexes = [];
        for (let i = 0; i < 2; i++) {
            const incorrectAnswersIndexes = answers
                .map((_, index) => index)
                .filter(index => index !== correctIndex && !incorrectIndexes.includes(index));
            const randomIndexIndex = Math.floor(Math.random() * incorrectAnswersIndexes.length);
            incorrectIndexes.push(incorrectAnswersIndexes[randomIndexIndex]);
        }

        event.quiz = {
            question: randomQuestion.question,
            answers: answers,
            correct: correctIndex,
            incorrect: incorrectIndexes
        };

        $eventText.set(event.eventId(), event.quiz.question);
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
        if (enemyEvent.hit) {
            $eventText.clear(enemyEvent.eventId());
            if (enemyEvent.event().meta.portalEnemy) {
                $f.placePortal(enemyEvent.x, enemyEvent.y);
            } else if (Math.random() < 0.1) {
                $f.placeEvent(enemyEvent.x, enemyEvent.y, 'item');
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

    function pickRandom(array, start = 0, amount = array.length - start) {
        amount = Math.min(amount, array.length - start);
        const randomIndex = start + Math.floor(Math.random() * amount);
        return array[randomIndex];
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

    const _Game_Event_isTriggerIn = Game_Event.prototype.isTriggerIn;
    Game_Event.prototype.isTriggerIn = function(triggers) {
        const meta = this.event().meta;
        if (meta && meta.triggers) {
            let metaTriggers = meta.triggers;
            if (typeof metaTriggers === 'string') {
                metaTriggers = JSON.parse(metaTriggers);
                meta.triggers = metaTriggers;
            }
            return metaTriggers.some(metaTrigger => triggers.contains(metaTrigger));
        }

        return _Game_Event_isTriggerIn.call(this, triggers);
    };

    $f.setDirection = (character, dir) => {
        if (dir % 2 === 0) {
            character._diagonal = 0;
            character.setDirection(dir);
        } else {
            character._diagonal = dir;
            character.diagonalDirection();
        }
    }

    const quizData = [
        { question: 'aku', answer: '私' },
        { question: 'kau', answer: 'あなた' },
        { question: 'yang', answer: 'どれの' },
        { question: 'tidak', answer: 'いいえ' },
        { question: 'ini', answer: 'これ' },
        { question: 'itu', answer: 'それ' },
        { question: 'dan', answer: 'そして' },
        { question: 'dia', answer: '彼' },
        { question: 'di', answer: 'で' },
        { question: 'akan', answer: '意思' },
        { question: 'apa', answer: '何' },
        { question: 'kita', answer: '私たちは' },
        { question: 'untuk', answer: 'のために' },
        { question: 'bisa', answer: 'できる' },
        { question: 'ada', answer: 'がある' },
        { question: 'tak', answer: 'ない' },
        { question: 'mereka', answer: '彼らは' },
        { question: 'anda', answer: 'あなた' },
        { question: 'tahu', answer: '知る' },
        { question: 'dengan', answer: 'と' },
        { question: 'saya', answer: '私' },
        { question: 'dari', answer: 'から' },
        { question: 'ya', answer: 'はい' },
        { question: 'tapi', answer: 'しかし' },
        { question: 'kami', answer: '私たちは' },
        { question: 'ke', answer: 'に' },
        { question: 'harus', answer: 'しなければならない' },
        { question: 'sudah', answer: 'すでに' },
        { question: 'kamu', answer: 'あなた' },
        { question: 'adalah', answer: 'は' },
        { question: 'orang', answer: '人' },
        { question: 'saja', answer: 'ただ' },
        { question: 'seperti', answer: 'のように' },
        { question: 'ingin', answer: 'したい' },
        { question: 'jika', answer: 'もし' },
        { question: 'pergi', answer: '行く' },
        { question: 'hanya', answer: 'のみ' },
        { question: 'semua', answer: '全て' },
        { question: 'sekarang', answer: '今' },
        { question: 'sini', answer: 'ここ' },
        { question: 'jadi', answer: 'それで' },
        { question: 'dalam', answer: 'で' },
        { question: 'bukan', answer: 'いいえ' },
        { question: 'baik', answer: '良い' },
        { question: 'bagaimana', answer: 'どうやって' },
        { question: 'jangan', answer: 'しないでください' },
        { question: 'lagi', answer: 'また' },
        { question: 'punya', answer: '持っている' },
        { question: 'lebih', answer: 'もっと' },
        { question: 'oh', answer: 'おお' },
        { question: 'pada', answer: 'の上' },
        { question: 'mungkin', answer: '可能' },
        { question: 'kalian', answer: 'あなた' },
        { question: 'lakukan', answer: 'する' },
        { question: 'karena', answer: 'なぜなら' },
        { question: 'sangat', answer: 'とても' },
        { question: 'satu', answer: '1つ' },
        { question: 'juga', answer: 'また' },
        { question: 'apakah', answer: 'かどうか' },
        { question: 'mau', answer: 'したい' },
        { question: 'pernah', answer: '一度' },
        { question: 'siapa', answer: '誰が' },
        { question: 'telah', answer: 'もっている' },
        { question: 'ayo', answer: '来て' },
        { question: 'hal', answer: '案件' },
        { question: 'saat', answer: '一瞬' },
        { question: 'kenapa', answer: 'なぜ' },
        { question: 'hari', answer: '日' },
        { question: 'kembali', answer: '戻る' },
        { question: 'atau', answer: 'または' },
        { question: 'datang', answer: '来る' },
        { question: 'begitu', answer: 'それで' },
        { question: 'sesuatu', answer: '何か' },
        { question: 'banyak', answer: 'たくさん' },
        { question: 'benar', answer: '正しい' },
        { question: 'kasih', answer: '愛' },
        { question: 'menjadi', answer: 'なる' },
        { question: 'melihat', answer: '見る' },
        { question: 'terjadi', answer: '起こる' },
        { question: 'melakukan', answer: 'する' },
        { question: 'terima', answer: '受け入れる' },
        { question: 'tentang', answer: 'について' },
        { question: 'lihat', answer: '見て' },
        { question: 'seorang', answer: '1つの' },
        { question: 'bahwa', answer: 'それ' },
        { question: 'kalau', answer: 'もし' },
        { question: 'hei', answer: 'おい' },
        { question: 'bagus', answer: '良い' },
        { question: 'bilang', answer: '言った' },
        { question: 'masih', answer: 'まだ' },
        { question: 'oke', answer: 'わかった' },
        { question: 'lain', answer: '他の' },
        { question: 'sana', answer: 'そこには' },
        { question: 'waktu', answer: '時間' },
        { question: 'baiklah', answer: 'わかった' },
        { question: 'tempat', answer: '場所' },
        { question: 'mana', answer: 'どこ' },
        { question: 'keluar', answer: '外出' },
        { question: 'lalu', answer: 'それから' },
        { question: 'malam', answer: '夕方' },
        { question: 'maaf', answer: 'ごめん' },
        { question: 'membuat', answer: '作る' },
        { question: 'mati', answer: '死んだ' },
        { question: 'sedang', answer: '現在' },
        { question: 'memiliki', answer: '自分の' },
        { question: 'tahun', answer: '年' },
        { question: 'sekali', answer: 'とても' },
        { question: 'sampai', answer: 'それまで' },
        { question: 'anak', answer: '子供' },
        { question: 'baru', answer: '新しい' },
        { question: 'dapat', answer: 'できる' },
        { question: 'beberapa', answer: '多数の' },
        { question: 'ayah', answer: '父親' },
        { question: 'sendiri', answer: '一人で' },
        { question: 'katakan', answer: '言う' },
        { question: 'hidup', answer: '人生' },
        { question: 'mengapa', answer: 'なぜ' },
        { question: 'sebuah', answer: 'あ' },
        { question: 'perlu', answer: '必要' },
        { question: 'kan', answer: '右' },
        { question: 'sama', answer: '同じ' },
        { question: 'tunggu', answer: '待って' },
        { question: 'salah', answer: '間違っている' },
        { question: 'semuanya', answer: 'すべて' },
        { question: 'rumah', answer: '家' },
        { question: 'mengatakan', answer: '言う' },
        { question: 'ia', answer: '彼' },
        { question: 'ketika', answer: 'いつ' },
        { question: 'masuk', answer: '入力' },
        { question: 'cepat', answer: '速い' },
        { question: 'dengar', answer: '聞く' },
        { question: 'besar', answer: '大きい' },
        { question: 'padaku', answer: '私にとって' },
        { question: 'disini', answer: 'ここ' },
        { question: 'pikir', answer: '考える' },
        { question: 'pasti', answer: 'ある' },
        { question: 'yg', answer: 'どれの' },
        { question: 'ibu', answer: '母親' },
        { question: 'masalah', answer: '問題' },
        { question: 'benar-benar', answer: '本当に' },
        { question: 'belum', answer: 'まだ' },
        { question: 'pak', answer: 'パック' },
        { question: 'bicara', answer: '話す' },
        { question: 'dua', answer: '二' },
        { question: 'tentu', answer: 'もちろん' },
        { question: 'selamat', answer: 'ハッピー' },
        { question: 'cukup', answer: '十分' },
        { question: 'selalu', answer: 'いつも' },
        { question: 'tuhan', answer: '主' },
        { question: 'suka', answer: 'のように' },
        { question: 'yeah', answer: 'うん' },
        { question: 'seseorang', answer: '誰か' },
        { question: 'melakukannya', answer: 'それをやる' },
        { question: 'pria', answer: '男' },
        { question: 'setelah', answer: '後' },
        { question: 'mengerti', answer: '理解する' },
        { question: 'baik-baik', answer: '大丈夫' },
        { question: 'tolong', answer: 'ヘルプ' },
        { question: 'dimana', answer: 'どこ' },
        { question: 'bahkan', answer: '平' },
        { question: 'apa-apa', answer: '何もない' },
        { question: 'berada', answer: 'は' },
        { question: 'menemukan', answer: '探す' },
        { question: 'sedikit', answer: '少し' },
        { question: 'bertemu', answer: '会う' },
        { question: 'mendapatkan', answer: '得る' },
        { question: 'percaya', answer: '信じる' },
        { question: 'oleh', answer: 'による' },
        { question: 'makan', answer: '食べる' },
        { question: 'lama', answer: '長さ' },
        { question: 'atas', answer: 'の上' },
        { question: 'ku', answer: '私の' },
        { question: 'tinggal', answer: '滞在する' },
        { question: 'bekerja', answer: '仕事' },
        { question: 'terlalu', answer: 'あまりにも' },
        { question: 'wanita', answer: '女性' },
        { question: 'sebagai', answer: 'として' },
        { question: 'padamu', answer: 'あなたへ' },
        { question: 'sayang', answer: 'ダーリン' },
        { question: 'kali', answer: '時間' },
        { question: 'tetap', answer: 'まだ' },
        { question: 'yakin', answer: 'ある' },
        { question: 'hey', answer: 'おい' },
        { question: 'cara', answer: '方法' },
        { question: 'berhenti', answer: '停止' },
        { question: 'jalan', answer: '道' },
        { question: 'setiap', answer: '毎' },
        { question: 'berpikir', answer: '考える' },
        { question: 'mulai', answer: '始める' },
        { question: 'dunia', answer: '世界' },
        { question: 'mari', answer: 'させて' },
        { question: 'membunuh', answer: '殺す' },
        { question: 'selama', answer: 'その間' },
        { question: 'luar', answer: '外' },
        { question: 'kecil', answer: '小さい' },
        { question: 'pertama', answer: '初め' },
        { question: 'sebelum', answer: '前に' },
        { question: 'diri', answer: '自己' },
        { question: 'bersama', answer: '一緒に' },
        { question: 'mengambil', answer: '取る' },
        { question: 'boleh', answer: '5月' },
        { question: 'the', answer: 'その' },
        { question: 'merasa', answer: '感じる' },
        { question: 'mencari', answer: '探す' },
        { question: 'uang', answer: 'お金' },
        { question: 'apapun', answer: '何でも' },
        { question: 'senang', answer: 'のように' },
        { question: 'butuh', answer: '必要' },
        { question: 'kurasa', answer: '私は思う' },
        { question: 'ayolah', answer: '来て' },
        { question: 'teman', answer: '友達' },
        { question: 'sebenarnya', answer: '実は' },
        { question: 'mencoba', answer: '試す' },
        { question: 'gadis', answer: '女の子' },
        { question: 'dulu', answer: '以前は' },
        { question: 'tanpa', answer: 'それなし' },
        { question: 'jam', answer: '時' },
        { question: 'denganmu', answer: 'あなたと' },
        { question: 'takkan', answer: 'しません' },
        { question: 'buruk', answer: '悪い' },
        { question: 'para', answer: 'のために' },
        { question: 'polisi', answer: '警察' },
        { question: 'membawa', answer: '持ってくる' },
        { question: 'yah', answer: 'はい' },
        { question: 'berapa', answer: '幾つか' },
        { question: 'orang-orang', answer: '人々' },
        { question: 'itulah', answer: 'それでおしまい' },
        { question: 'ingat', answer: '覚えて' },
        { question: 'kemudian', answer: 'それから' },
        { question: 'siap', answer: '準備ができて' },
        { question: 'biarkan', answer: 'させて' },
        { question: 'maksudku', answer: 'つまり' },
        { question: 'terus', answer: '続けて' },
        { question: 'gila', answer: 'クレイジー' },
        { question: 'pun', answer: '平' },
        { question: 'tuan', answer: 'お客様' },
        { question: 'sakit', answer: '病気' },
        { question: 'tidur', answer: '寝る' },
        { question: 'pulang', answer: '家に帰れ' },
        { question: 'segera', answer: '素早い' },
        { question: 'seharusnya', answer: 'すべき' },
        { question: 'kepada', answer: 'に' },
        { question: 'memang', answer: 'もちろん' },
        { question: 'takut', answer: '恐れている' },
        { question: 'dirimu', answer: 'あなた自身' },
        { question: 'halo', answer: 'こんにちは' },
        { question: 'terlihat', answer: '見た' },
        { question: 'nama', answer: '名前' },
        { question: 'i', answer: '私' },
        { question: 'sial', answer: '不運' },
        { question: 'berbicara', answer: '話す' },
        { question: 'minta', answer: '求める' },
        { question: 'kota', answer: '市' },
        { question: 'mobil', answer: '車' },
        { question: 'membantu', answer: 'ヘルプ' },
        { question: 'terakhir', answer: 'ファイナル' },
        { question: 'biasa', answer: '普通' },
        { question: 'cinta', answer: '愛' },
        { question: 'mu', answer: 'あなたの' },
        { question: 'depan', answer: 'フロント' },
        { question: 'sepertinya', answer: 'それは' },
        { question: 'sebentar', answer: 'ちょっと' },
        { question: 'padanya', answer: '彼に' },
        { question: 'rasa', answer: '風味' },
        { question: 'bagian', answer: '一部' },
        { question: 'bodoh', answer: 'バカ' },
        { question: 'sialan', answer: 'くそ' },
        { question: 'manusia', answer: '男' },
        { question: 'tiga', answer: '三つ' },
        { question: 'berhasil', answer: '成功する' },
        { question: 'sungguh', answer: '本当に' },
        { question: 'mendengar', answer: '聞く' },
        { question: 'tepat', answer: '適切な' },
        { question: 'bawah', answer: 'より低い' },
        { question: 'berikan', answer: '与える' },
        { question: 'ambil', answer: '取る' },
        { question: 'pagi', answer: '朝' },
        { question: 'air', answer: '水' },
        { question: 'keluarga', answer: '家族' },
        { question: 'hai', answer: 'お' },
        { question: 'bawa', answer: '持ってくる' },
        { question: 'kehilangan', answer: '失った' },
        { question: 'maafkan', answer: '私を許して' },
        { question: 'untukmu', answer: 'あなたのために' },
        { question: 'nanti', answer: '後で' },
        { question: 'bagi', answer: 'のために' },
        { question: 'tangan', answer: '手' },
        { question: 'hebat', answer: '素晴らしい' },
        { question: 's', answer: 's' },
        { question: 'menunggu', answer: '待って' },
        { question: 'ikut', answer: 'フォローする' },
        { question: 'melihatnya', answer: '見る' },
        { question: 'masa', answer: '時間' },
        { question: 'jauh', answer: '遠い' },
        { question: 'pekerjaan', answer: '仕事' },
        { question: 'ah', answer: 'ああ' },
        { question: 'you', answer: 'あなた' },
        { question: 'berdua', answer: '一緒に' },
        { question: 'paling', answer: 'ほとんど' },
        { question: 'peduli', answer: 'ケア' },
        { question: 'aneh', answer: '奇妙な' },
        { question: 'anak-anak', answer: '子供たち' },
        { question: 'penting', answer: '重要' },
        { question: 'tadi', answer: '以前' },
        { question: 'si', answer: 'シ' },
        { question: 'selesai', answer: '終了した' },
        { question: 'seluruh', answer: 'いたるところ' },
        { question: 'ok', answer: 'わかった' },
        { question: 'meninggalkan', answer: '離れる' },
        { question: 'cuma', answer: 'のみ' },
        { question: 'suatu', answer: '何か' },
        { question: 'terbaik', answer: '最高' },
        { question: 'khawatir', answer: '心配' },
        { question: 'tua', answer: '古い' },
        { question: 'memberikan', answer: '与える' },
        { question: 'tenang', answer: '落ち着いた' },
        { question: 'hentikan', answer: '停止' },
        { question: 'disana', answer: 'そこには' },
        { question: 'bisakah', answer: 'できる' },
        { question: 'coba', answer: '試す' },
        { question: 'uh', answer: 'えーと' },
        { question: 'menit', answer: '分' },
        { question: 'sekolah', answer: '学校' },
        { question: 'duduk', answer: '座って下さい' },
        { question: 'sebelumnya', answer: '以前' },
        { question: 'secara', answer: 'ある意味で' },
        { question: 'maka', answer: 'それで' },
        { question: 'besok', answer: '明日' },
        { question: 'minum', answer: '飲む' },
        { question: 'tn', answer: '氏' },
        { question: 'berarti', answer: '手段' },
        { question: 'a', answer: '1つの' },
        { question: 'bulan', answer: '月' },
        { question: 'bergerak', answer: '動く' },
        { question: 'sejak', answer: '以来' },
        { question: 'hampir', answer: 'ほとんど' },
        { question: 'kemari', answer: 'ここ' },
        { question: 'kepala', answer: '頭' },
        { question: 'astaga', answer: 'ああ、なんてことだ' },
        { question: 'tetapi', answer: 'しかし' },
        { question: 'soal', answer: '質問' },
        { question: 'maksudmu', answer: 'もしかして' },
        { question: 'menggunakan', answer: '使用' },
        { question: 'tau', answer: '知る' },
        { question: 'diam', answer: '静けさ' },
        { question: 'aman', answer: '安全' },
        { question: 'berjalan', answer: '歩く' },
        { question: 'buat', answer: 'のために' },
        { question: 'sulit', answer: '難しい' },
        { question: 'senjata', answer: '武器' },
        { question: 'iya', answer: 'はい' },
        { question: 'inginkan', answer: '欲しい' },
        { question: 'kapan', answer: 'いつ' },
        { question: 'sekitar', answer: 'その周り' },
        { question: 'pintu', answer: 'ドア' },
        { question: 'nak', answer: '息子' },
        { question: 'ayahku', answer: '私の父' },
        { question: 'memberi', answer: '与える' },
        { question: 'hati', answer: '心臓' },
        { question: 'kesempatan', answer: 'チャンス' },
        { question: 'nah', answer: '今' },
        { question: 'bermain', answer: '遊ぶ' },
        { question: 'cari', answer: '検索' },
        { question: 'dekat', answer: '近く' },
        { question: 'mendapat', answer: '得る' },
        { question: 'bukankah', answer: 'それはそうではない' },
        { question: 'jelas', answer: 'クリア' },
        { question: 'nya', answer: '彼の' },
        { question: 'tim', answer: 'チーム' },
        { question: 'dengannya', answer: '彼と一緒に' },
        { question: 'mudah', answer: '簡単' },
        { question: 'akhirnya', answer: 'ついに' },
        { question: 'jatuh', answer: '秋' },
        { question: 'kumohon', answer: 'お願いします' },
        { question: 'denganku', answer: '私と一緒に' },
        { question: 'agar', answer: 'となることによって' },
        { question: 'benarkah', answer: 'それは本当ですか' },
        { question: 'berakhir', answer: '終わり' },
        { question: 'ayahmu', answer: 'あなたのお父さん' },
        { question: 'memberitahu', answer: 'あなたに伝えている' },
        { question: 'alasan', answer: '理由' },
        { question: 'menarik', answer: '面白い' },
        { question: 'cantik', answer: '美しい' },
        { question: 'kawan', answer: '友人' },
        { question: 'berubah', answer: '変更された' },
        { question: 'kupikir', answer: '私は思う' },
        { question: 'satu-satunya', answer: '唯一の' },
        { question: 'keras', answer: '難しい' },
        { question: 'mata', answer: '目' },
        { question: 'dokter', answer: '医者' },
        { question: 'lainnya', answer: '他の' },
        { question: 'beritahu', answer: '教えて' },
        { question: 'kemana', answer: 'どこへ' },
        { question: 'serius', answer: '深刻な' },
        { question: 'kuat', answer: '強い' },
        { question: 'bertanya', answer: '聞く' },
        { question: 'minggu', answer: '日曜日' },
        { question: 'meminta', answer: 'リクエスト' },
        { question: 'membuatku', answer: '私を作る' },
        { question: 'kerja', answer: '仕事' },
        { question: 'bunuh', answer: '殺す' },
        { question: 'pergilah', answer: '行く' },
        { question: 'kehidupan', answer: '人生' },
        { question: 'berbeda', answer: '違う' },
        { question: 'berharap', answer: '希望' },
        { question: 'bangun', answer: '起きる' },
        { question: 'indah', answer: '美しい' },
        { question: 'menurutmu', answer: 'あなたによると' },
        { question: 'beri', answer: '与える' },
        { question: 'menyelamatkan', answer: '保存' },
        { question: 'kata', answer: '言う' },
        { question: 'hilang', answer: '失われている' },
        { question: 'kabar', answer: 'ニュース' },
        { question: 'darah', answer: '血' },
        { question: 'dengarkan', answer: '聞く' },
        { question: 'kamar', answer: '部屋' },
        { question: 'lari', answer: '走る' },
        { question: 'kulakukan', answer: '私はします' },
        { question: 'berkata', answer: '言った' },
        { question: 'menyenangkan', answer: '楽しい' },
        { question: 'dilakukan', answer: '終わり' },
        { question: 'kosong', answer: '空の' },
        { question: 'b1', answer: 'b1' },
        { question: 'eh', answer: 'えー' },
        { question: 'belakang', answer: '後ろに' },
        { question: 'raja', answer: '王' },
        { question: 'dasar', answer: 'ベース' },
        { question: 'bajingan', answer: 'ろくでなし' },
        { question: 'biar', answer: 'させて' },
        { question: 'makanan', answer: '食べ物' },
        { question: 'bantuan', answer: 'ヘルプ' },
        { question: 'dapatkan', answer: '得る' },
        { question: 'meninggal', answer: '死ぬ' },
        { question: 'ruang', answer: '部屋' },
        { question: 'demi', answer: 'のために' },
        { question: 'kedua', answer: '2番' },
        { question: 'kekuatan', answer: '強さ' },
        { question: 'marah', answer: '怒り' },
        { question: 'membiarkan', answer: 'させて' },
        { question: 'lepaskan', answer: '手放す' },
        { question: 'daripada', answer: 'よりも' },
        { question: 'buku', answer: '本' },
        { question: 'it', answer: 'それ' },
        { question: '4ch000000', answer: '4ch000000' },
        { question: 'menikah', answer: '結婚する' },
        { question: 'berusaha', answer: '試す' },
        { question: 'diriku', answer: '自分自身' },
        { question: 'fncandara', answer: 'フカンダラ' },
        { question: 'rencana', answer: 'プラン' },
        { question: 'telepon', answer: '電話' },
        { question: 'kasus', answer: '場合' },
        { question: 'perang', answer: '戦争' },
        { question: 'pertanyaan', answer: '質問' },
        { question: 'kapal', answer: 'ボート' },
        { question: 'belajar', answer: '勉強' },
        { question: 'suara', answer: '声' },
        { question: 'amerika', answer: 'アメリカ人' },
        { question: 'lupa', answer: '忘れる' },
        { question: 'lihatlah', answer: '見てください' },
        { question: 'muda', answer: '若い' },
        { question: 'pikirkan', answer: '考えてみてください' },
        { question: 'ibumu', answer: 'あなたのお母さん' },
        { question: 'perjalanan', answer: '旅' },
        { question: 'menuju', answer: '行く' },
        { question: 'cerita', answer: '話' },
        { question: 'permisi', answer: 'すみません' },
        { question: 'naik', answer: '続けて' },
        { question: 'langsung', answer: '直接' },
        { question: 'wow', answer: 'おお' },
        { question: 'paham', answer: '理解する' },
        { question: 'antara', answer: '間' },
        { question: 'membutuhkan', answer: '必要' },
        { question: 'tinggi', answer: '高い' },
        { question: 't', answer: 't' },
        { question: 'turun', answer: '下' },
        { question: 'ide', answer: 'アイデア' },
        { question: '4ah80', answer: '4ah80' },
        { question: 'kaki', answer: '足' },
        { question: 'penuh', answer: '満杯' },
        { question: 'sendirian', answer: '一人で' },
        { question: 'negara', answer: '国' },
        { question: 'lima', answer: '五' },
        { question: 'ibuku', answer: '私の母' },
        { question: 'namanya', answer: '彼の名前' },
        { question: 'kematian', answer: '死' },
        { question: 'anjing', answer: '犬' },
        { question: 'berdiri', answer: '立つ' },
        { question: 'to', answer: 'に' },
        { question: 'kecuali', answer: 'を除外する' },
        { question: 'kira', answer: '考える' },
        { question: 'kapten', answer: 'キャプテン' },
        { question: 'rahasia', answer: '機密' },
        { question: 'menang', answer: '勝つ' },
        { question: 'and', answer: 'そして' },
        { question: 'menerima', answer: '受け入れる' },
        { question: 'silakan', answer: 'お願いします' },
        { question: 'tanah', answer: '土地' },
        { question: 'bicarakan', answer: '話す' },
        { question: 'lucu', answer: '面白い' },
        { question: 'buka', answer: '開ける' },
        { question: 'ch00ffff', answer: 'ch00ffff' },
        { question: 'melawan', answer: '反対する' },
        { question: 'menunjukkan', answer: '見せる' },
        { question: 'dirinya', answer: '彼自身' },
        { question: 'um', answer: 'えーと' },
        { question: 'agen', answer: 'エージェント' },
        { question: 'melalui', answer: 'を通して' },
        { question: 'rasanya', answer: 'こんな感じ' },
        { question: 'sepanjang', answer: '全体を通して' },
        { question: 'akhir', answer: '終わり' },
        { question: 'bu', answer: '奥様' },
        { question: 'artinya', answer: 'それはつまり' },
        { question: 'pilihan', answer: '選択' },
        { question: 'nona', answer: '逃す' },
        { question: 'terlambat', answer: '遅い' },
        { question: 'pesta', answer: 'パーティー' },
        { question: 'mulia', answer: '素晴らしい' },
        { question: 'membuatmu', answer: 'あなたを作る' },
        { question: 'membuatnya', answer: '作る' },
        { question: 'untukku', answer: '私にとって' },
        { question: 'temukan', answer: '探す' },
        { question: 'semakin', answer: 'より' },
        { question: 'well', answer: '良い' },
        { question: 'bung', answer: 'お前' },
        { question: 'kesalahan', answer: 'エラー' },
        { question: 'john', answer: 'ジョン' },
        { question: 'silahkan', answer: 'お願いします' },
        { question: 'lewat', answer: '過去' },
        { question: 'mencintaimu', answer: '愛している' },
        { question: 'sementara', answer: '一時的' },
        { question: 'nomor', answer: '番号' },
        { question: 'api', answer: '火' },
        { question: 'memilih', answer: '選ぶ' },
        { question: 'pesawat', answer: '航空機' },
        { question: 'guru', answer: '教師' },
        { question: 'bahagia', answer: 'ハッピー' },
        { question: 'waktunya', answer: '時間' },
        { question: 'film', answer: '膜' },
        { question: 'tiba', answer: '到着' },
        { question: 'bantu', answer: 'ヘルプ' },
        { question: 'melihatmu', answer: 'またね' },
        { question: 'panas', answer: '熱い' },
        { question: 'bumi', answer: '地球' },
        { question: 'memakai', answer: '使用' },
        { question: 'okay', answer: 'わかった' },
        { question: 'kubilang', answer: '私は言った' },
        { question: 'menemukannya', answer: '見つけた' },
        { question: 'segalanya', answer: 'すべて' },
        { question: 'setidaknya', answer: '少なくとも' },
        { question: 'keren', answer: 'いいね' },
        { question: 'membunuhnya', answer: '彼を殺す' },
        { question: 'no', answer: 'いいえ' },
        { question: 'jawab', answer: '答え' },
        { question: 'hidupku', answer: '私の人生' },
        { question: 'pesan', answer: 'メッセージ' },
        { question: 'bertahan', answer: '耐える' },
        { question: 'bayi', answer: '赤ちゃん' },
        { question: 'bahasa', answer: '言語' },
        { question: 'kantor', answer: 'オフィス' },
        { question: 'putri', answer: '娘' },
        { question: 'empat', answer: '4つ' },
        { question: 'tinggalkan', answer: '離れる' },
        { question: 'muncul', answer: '現れる' },
        { question: 'omong', answer: '話す' },
        { question: 'kenal', answer: '知る' },
        { question: 'perusahaan', answer: '会社' },
        { question: 'awal', answer: '始まり' },
        { question: 'anakku', answer: '私の子供' },
        { question: 'penjara', answer: '刑務所' },
        { question: 'setuju', answer: '同意する' },
        { question: 'nyata', answer: '本物' },
        { question: 'sempurna', answer: '完璧' },
        { question: 'semoga', answer: 'うまくいけば' },
        { question: 'janji', answer: '約束' },
        { question: 'bercanda', answer: '冗談を言う' },
        { question: 'tampak', answer: '見た目' },
        { question: 'pembunuh', answer: '殺人者' },
        { question: 'siapapun', answer: '誰でも' },
        { question: 'menghancurkan', answer: '破壊する' },
        { question: 'kesini', answer: 'ここに来て' },
        { question: 'membayar', answer: '支払う' },
        { question: 'surat', answer: '手紙' },
        { question: 'of', answer: 'の' },
        { question: 'kelas', answer: 'クラス' },
        { question: 'beruntung', answer: 'ラッキー' },
        { question: 'laki-laki', answer: '男' },
        { question: 'tampaknya', answer: 'そうみたいです' },
        { question: 'whoa', answer: 'うわあ' },
        { question: 'ulang', answer: '繰り返す' },
        { question: 'jumpa', answer: 'またね' },
        { question: 'sebaiknya', answer: 'すべき' },
        { question: 'menembak', answer: 'シュート' },
        { question: 'namun', answer: 'しかし' },
        { question: 'brengsek', answer: 'ジャーク' },
        { question: 'permainan', answer: 'ゲーム' },
        { question: 'bila', answer: 'いつ' },
        { question: 'hal-hal', answer: 'もの' },
        { question: 'sam', answer: 'サム' },
        { question: 'menjaga', answer: 'ガード' },
        { question: 'tahan', answer: '立つ' },
        { question: 'sering', answer: '頻繁' },
        { question: 'tutup', answer: '閉鎖' },
        { question: 'sang', answer: 'その' },
        { question: 'jack', answer: 'ジャック' },
        { question: 'pembunuhan', answer: '殺人' },
        { question: 'perintah', answer: '注文' },
        { question: 'semacam', answer: '種の' },
        { question: 'jahat', answer: '邪悪な' },
        { question: 'hubungan', answer: '繋がり' },
        { question: 'terbang', answer: '飛ぶ' },
        { question: 'dingin', answer: '寒い' },
        { question: 'mendapatkannya', answer: 'それを得る' },
        { question: 'berikutnya', answer: '次' },
        { question: 'mengetahui', answer: '知る' },
        { question: 'pasukan', answer: '軍' },
        { question: 'hati-hati', answer: '気をつけて' },
        { question: 'laut', answer: '海' },
        { question: 'by', answer: 'による' },
        { question: 'me', answer: '自分' },
        { question: 'meskipun', answer: 'それでも' },
        { question: 'sehingga', answer: 'となることによって' },
        { question: 'membawanya', answer: '持ってきて' },
        { question: 'sebabnya', answer: 'なぜ' },
        { question: 'huh', answer: 'はぁ' },
        { question: 'perempuan', answer: '女性' },
        { question: 'segala', answer: '全て' },
        { question: 'menangkap', answer: 'キャッチ' },
        { question: 'harusnya', answer: 'すべきだ' },
        { question: 'kurang', answer: '足りない' },
        { question: 'tanda', answer: 'サイン' },
        { question: 'membeli', answer: '買う' },
        { question: 'mundur', answer: '一歩下がる' },
        { question: 'berbohong', answer: '嘘' },
        { question: 'mesin', answer: '機械' },
        { question: 'in', answer: 'で' },
        { question: 'barang', answer: '品' },
        { question: 'berita', answer: 'ニュース' },
        { question: 'begini', answer: 'このような' },
        { question: 'bukti', answer: '証拠' },
        { question: 'mimpi', answer: '夢' },
        { question: 'l', answer: 'l' },
        { question: 'bisnis', answer: '仕事' },
        { question: 'bukanlah', answer: 'ではない' },
        { question: 'menangis', answer: '泣く' },
        { question: 'tembak', answer: 'シュート' },
        { question: 'menulis', answer: '書く' },
        { question: 'menelepon', answer: '電話' },
        { question: 'berbahaya', answer: '危険な' },
        { question: 'kukatakan', answer: '私は言う' },
        { question: 'pikiran', answer: '考え' },
        { question: 'mencuri', answer: '窃盗' },
        { question: 'terluka', answer: '負傷者' },
        { question: 'tersebut', answer: 'その' },
        { question: 'pakai', answer: '使用' },
        { question: 'berani', answer: '勇敢な' },
        { question: 'dr.', answer: 'ドクター' },
        { question: 'agak', answer: 'それよりも' },
        { question: 'awak', answer: 'クルー' },
        { question: 'melindungi', answer: '守る' },
        { question: 'benda', answer: '物体' },
        { question: 'membaca', answer: '読む' },
        { question: 'setengah', answer: '半分' },
        { question: 'dariku', answer: '私から' },
        { question: 'hitam', answer: '黒' },
        { question: 'ha', answer: 'ハ' },
        { question: 'musim', answer: '季節' },
        { question: 'enak', answer: 'ニース' },
        { question: 'lagu', answer: '歌' },
        { question: 'kemarin', answer: '昨日' },
        { question: 'tubuh', answer: '体' },
        { question: 'siang', answer: '午後' },
        { question: 'man', answer: '男' },
        { question: 'memikirkan', answer: '考える' },
        { question: 'inilah', answer: 'ここにあります' },
        { question: 'bersalah', answer: '有罪' },
        { question: 'mengirim', answer: '送信' },
        { question: 'mengenai', answer: 'について' },
        { question: 'namaku', answer: '私の名前' },
        { question: 'memutuskan', answer: '決める' },
        { question: 'mengubah', answer: '変化' },
        { question: 'saling', answer: 'お互い' },
        { question: 'harap', answer: 'お願いします' },
        { question: 'paman', answer: '叔父' },
        { question: 'hingga', answer: 'それまで' },
        { question: 'mendengarkan', answer: '聞く' },
        { question: 'selamanya', answer: '永遠に' },
        { question: 'terhadap', answer: 'に' },
        { question: 'saudara', answer: 'あなた' },
        { question: 'hukum', answer: '法' },
        { question: 'menghilang', answer: '消える' },
        { question: 'tugas', answer: 'タスク' },
        { question: 'betapa', answer: 'どうやって' },
        { question: 'hmm', answer: 'ふーむ' },
        { question: 'lupakan', answer: '忘れて' },
        { question: 'obat', answer: '薬' },
        { question: 'hadiah', answer: '現在' },
        { question: 'manis', answer: '甘い' },
        { question: 'sebelah', answer: '隣接' },
        { question: 'bagiku', answer: '私にとって' },
        { question: 'merasakan', answer: '感じる' },
        { question: 'menghabiskan', answer: '使い切る' },
        { question: 'fs60', answer: 'fs60' },
        { question: 'informasi', answer: '情報' },
        { question: 'selain', answer: 'その上' },
        { question: 'new', answer: '新しい' },
        { question: 'sisi', answer: '側' },
        { question: 'kunci', answer: '鍵' },
        { question: 'bebas', answer: '無料' },
        { question: 'juta', answer: '百万' },
        { question: 'istri', answer: '妻' },
        { question: 'menyukai', answer: 'のように' },
        { question: 'mengikuti', answer: 'フォローする' },
        { question: 'my', answer: '私の' },
        { question: 'keadaan', answer: '状態' },
        { question: 'milik', answer: '所有者' },
        { question: 'pernikahan', answer: '結婚式' },
        { question: 'saatnya', answer: '時間だ' },
        { question: 'kukira', answer: '私は思う' },
        { question: 'menyukainya', answer: '大好きです。' },
        { question: 'entahlah', answer: '知るか' },
        { question: 'kesana', answer: 'そこには' },
        { question: 'bersama-sama', answer: '一緒に' },
        { question: 'benci', answer: '嫌い' },
        { question: 'kakak', answer: '兄' },
        { question: 'mengerikan', answer: '恐ろしい' },
        { question: 'pindah', answer: '動く' },
        { question: 'berat', answer: '重い' },
        { question: 'sadar', answer: 'わかっている' },
        { question: 'm', answer: 'メートル' },
        { question: 'merah', answer: '赤' },
        { question: 'pribadi', answer: '個人的' },
        { question: 'arah', answer: '方向' },
        { question: 'temanku', answer: '私の友人' },
        { question: 'menyesal', answer: '後悔' },
        { question: 'korban', answer: '被害者' },
        { question: 'wajah', answer: '顔' },
        { question: 'membuka', answer: '開ける' },
        { question: 'enam', answer: '六' },
        { question: 'presiden', answer: '社長' },
        { question: 'inggris', answer: '英語' },
        { question: 'bergabung', answer: '参加する' },
        { question: 'lantai', answer: '床' },
        { question: 'udara', answer: '空気' },
        { question: 'melewati', answer: '合格' },
        { question: 'anggota', answer: 'メンバー' },
        { question: 'batu', answer: 'ロック' },
        { question: 'gunakan', answer: '使用' },
        { question: 'mengalami', answer: '経験' },
        { question: 'jujur', answer: '正直' },
        { question: 'pintar', answer: '頭がいい' },
        { question: 'sistem', answer: 'システム' },
        { question: 'putih', answer: '白' },
        { question: 'mr', answer: '氏' },
        { question: 'sibuk', answer: '忙しい' },
        { question: 'menghentikan', answer: '停止' },
        { question: 'memeriksa', answer: '検査する' },
        { question: 'dimulai', answer: '開始' },
        { question: 'berjanji', answer: '約束' },
        { question: 'bola', answer: 'ボール' },
        { question: 'biasanya', answer: 'いつもの' },
        { question: 'nyonya', answer: '夫人' },
        { question: 'keamanan', answer: '安全' },
        { question: 'mampu', answer: '有能' },
        { question: 'bintang', answer: '星' },
        { question: 'gagal', answer: '失敗' },
        { question: 'panjang', answer: '長さ' },
        { question: 'dolar', answer: 'ドル' },
        { question: 'bos', answer: 'ボス' },
        { question: 'musik', answer: '音楽' },
        { question: 'panggil', answer: '電話' },
        { question: 'kereta', answer: '電車' },
        { question: 'menyerah', answer: 'あきらめる' },
        { question: 'serangan', answer: '攻撃' },
        { question: 'musuh', answer: '敵' },
        { question: 'hi', answer: 'こんにちは' },
        { question: 'mohon', answer: 'お願いします' },
        { question: 'menyerang', answer: '攻撃' },
        { question: 'tanganmu', answer: 'あなたの手' },
        { question: 'pakaian', answer: '服' },
        { question: 'foto', answer: '写真' },
        { question: 'membunuhmu', answer: 'あなたを殺す' },
        { question: 'akal', answer: '理由' },
        { question: 'kartu', answer: 'カード' },
        { question: 'mencintai', answer: '愛' },
        { question: 'perasaan', answer: 'フィーリング' },
        { question: 'tentara', answer: '兵士' },
        { question: 'jenis', answer: 'タイプ' },
        { question: 'acara', answer: 'プログラム' },
        { question: 'seberapa', answer: 'いくら' },
        { question: 'matahari', answer: '太陽' },
        { question: 'mandi', answer: '入浴' },
        { question: 'mempunyai', answer: '持っている' },
        { question: 'toko', answer: '店' },
        { question: 'membantumu', answer: 'あなたを助ける' },
        { question: 'maksud', answer: '意味' },
        { question: 'tunjukkan', answer: '見せる' },
        { question: 'kuharap', answer: '願っています' },
        { question: 'petugas', answer: '役員' },
        { question: 'kecelakaan', answer: '事故' },
        { question: 'ruangan', answer: '部屋' },
        { question: 'teman-teman', answer: '友達' },
        { question: 'memanggil', answer: '電話' },
        { question: 'makhluk', answer: '生き物' },
        { question: 'kabur', answer: 'ぼやけた' },
        { question: 'apos', answer: 'アポス' },
        { question: 'ternyata', answer: 'それは' },
        { question: 'memulai', answer: '始める' },
        { question: 'tengah', answer: '真ん中' },
        { question: 'detik', answer: '2番' },
        { question: 'terbuka', answer: '開ける' },
        { question: 'menurut', answer: 'によると' },
        { question: 'kulihat', answer: 'なるほど' },
        { question: 'kini', answer: '今' },
        { question: 'hantu', answer: 'おばけ' },
        { question: 'jaga', answer: 'ガード' },
        { question: 'cocok', answer: '適切な' },
        { question: 'tertawa', answer: '笑う' },
        { question: 'posisi', answer: '位置' },
        { question: 'namamu', answer: 'あなたの名前' },
        { question: 'selanjutnya', answer: 'さらに' },
        { question: 'mengatakannya', answer: '言ってください' },
        { question: 'keberatan', answer: '物体' },
        { question: 'mabuk', answer: '酔っ払い' },
        { question: 'tertarik', answer: '興味がある' },
        { question: 'catatan', answer: 'メモ' },
        { question: 'tujuan', answer: '客観的' },
        { question: 'kanan', answer: '右' },
        { question: 'kalah', answer: '失った' },
        { question: 'neraka', answer: '地獄' },
        { question: 'pukul', answer: '時' },
        { question: 'planet', answer: '惑星' },
        { question: 'menyelesaikan', answer: '仕上げる' },
        { question: 'khusus', answer: '特別' },
        { question: 'panggilan', answer: '呼び出し' },
        { question: 'masalahnya', answer: '問題' },
        { question: 'hanyalah', answer: 'ただ' },
        { question: 'periksa', answer: 'チェック' },
        { question: 'hutan', answer: '森' },
        { question: 'ditemukan', answer: '見つかった' },
        { question: 'menonton', answer: '時計' },
        { question: 'utara', answer: '北' },
        { question: 'utama', answer: '主要' },
        { question: 'kamera', answer: 'カメラ' },
        { question: 'memberitahumu', answer: '教えて' },
        { question: 'burung', answer: '鳥' },
        { question: 'dewa', answer: '神' },
        { question: 'ayahnya', answer: '彼の父親' },
        { question: 'gak', answer: 'いいえ' },
        { question: 'cahaya', answer: 'ライト' },
        { question: 'entah', answer: '知るか' },
        { question: 'hah', answer: 'はぁ' },
        { question: 'pantas', answer: 'ちゃんとした' },
        { question: 'disebut', answer: 'と呼ばれる' },
        { question: 'menginginkan', answer: '欲しい' },
        { question: 'pahlawan', answer: 'ヒーロー' },
        { question: 'terlibat', answer: '関与した' },
        { question: 'operasi', answer: '手術' },
        { question: 'situasi', answer: '状況' },
        { question: 'melarikan', answer: '走る' },
        { question: 'gambar', answer: '写真' },
        { question: 'kejahatan', answer: '犯罪' },
        { question: 'lee', answer: 'リー' },
        { question: 'misi', answer: 'ミッション' },
        { question: 'percayalah', answer: '私を信じて' },
        { question: 'perhatian', answer: '注意' },
        { question: 'gue', answer: '私' },
        { question: 'on', answer: 'の上' },
        { question: 'don', answer: 'ドン' },
        { question: 'membunuhku', answer: '私を殺して' },
        { question: 'menurutku', answer: '私によると' },
        { question: 'sir', answer: 'お客様' },
        { question: 'kiri', answer: '左' },
        { question: 'kalinya', answer: '初めて' },
        { question: 'ketakutan', answer: '恐れている' },
        { question: 'menjual', answer: '売る' },
        { question: 'kotak', answer: '箱' },
        { question: 'terdengar', answer: '聞いた' },
        { question: 'kuda', answer: '馬' },
        { question: 'berguna', answer: '役に立つ' },
        { question: 'sejauh', answer: 'の限り' },
        { question: 'pintunya', answer: 'ドア' },
        { question: 'alam', answer: '自然' },
        { question: 'kemarilah', answer: 'ここに来て' },
        { question: 'mengganggu', answer: 'わざわざ' },
        { question: 'pistol', answer: '銃' },
        { question: 'hello', answer: 'こんにちは' },
        { question: 'sepertimu', answer: 'あなたのような' },
        { question: 'ikuti', answer: 'フォローする' },
        { question: 'bahaya', answer: '危険' },
        { question: 'hubungi', answer: '接触' },
        { question: 'hidupmu', answer: 'あなたの人生' },
        { question: 'nenek', answer: 'おばあちゃん' },
        { question: 'gelap', answer: '暗い' },
        { question: 'menyadari', answer: '気づく' },
        { question: 'ahli', answer: '専門家' },
        { question: 'kim', answer: 'キム' },
        { question: 'main', answer: '遊ぶ' },
        { question: 'kopi', answer: 'コーヒー' },
        { question: 'merupakan', answer: 'は' },
        { question: 'memberimu', answer: 'あなたに与える' },
        { question: 'go', answer: '行く' },
        { question: 'ratu', answer: '女王' },
        { question: 'that', answer: 'それ' },
        { question: 'kemungkinan', answer: '可能性' },
        { question: 'bersamamu', answer: 'あなたと' },
        { question: 'diterjemahkan', answer: '翻訳された' },
        { question: 'kejadian', answer: '事件' },
        { question: 'laporan', answer: '報告' },
        { question: 'balik', answer: '戻ってくる' },
        { question: 'detektif', answer: '探偵' },
        { question: 'daftar', answer: 'リスト' },
        { question: 'es', answer: '氷' },
        { question: 'sejarah', answer: '歴史' },
        { question: 'nyaman', answer: '快適' },
        { question: 'daging', answer: '肉' },
        { question: 'keputusan', answer: '決断' },
        { question: 'caranya', answer: '方法' },
        { question: 'ceritakan', answer: '教えて' },
        { question: 'bernama', answer: '名前' },
        { question: 'istirahat', answer: '休む' },
        { question: 'layak', answer: '価値がある' },
        { question: 'pertemuan', answer: 'ミーティング' },
        { question: 'penjaga', answer: 'ガード' },
        { question: 'alat', answer: '道具' },
        { question: 'kulit', answer: '肌' },
        { question: 'sesuai', answer: 'に従って' },
        { question: 'kebenaran', answer: '真実' },
        { question: 'persetan', answer: 'くそ' },
        { question: 'peter', answer: 'ピーター' },
        { question: 'temanmu', answer: 'あなたの友達' },
        { question: 'york', answer: 'ヨーク' },
        { question: 'tiba-tiba', answer: '突然' },
        { question: 'penyihir', answer: '魔女' },
        { question: 'sampah', answer: 'ごみ' },
        { question: 'bersumpah', answer: '誓う' },
        { question: 'menghubungi', answer: '接触' },
        { question: 'hak', answer: '右' },
        { question: 'pemerintah', answer: '政府' },
        { question: 'mendengarnya', answer: '聞く' },
        { question: 'darimu', answer: 'あなたから' },
        { question: 'memastikan', answer: '確保する' },
        { question: 'lapar', answer: 'お腹がすいた' },
        { question: 'bohong', answer: '嘘' },
        { question: 'tanya', answer: '聞く' },
        { question: 'bunga', answer: '花' },
        { question: 'menjelaskan', answer: '説明する' },
        { question: 'sih', answer: 'うん' },
        { question: 'emas', answer: '金' },
        { question: 'david', answer: 'デビッド' },
        { question: 'berasal', answer: '起源' },
        { question: 'malu', answer: '恥ずかしい' },
        { question: 'kaya', answer: 'リッチ' },
        { question: 'dah', answer: '終わり' },
        { question: 'monster', answer: 'モンスター' },
        { question: 'bersamaku', answer: '私と一緒に' },
        { question: 'mayat', answer: '死体' },
        { question: 'frank', answer: 'フランク' },
        { question: 'minuman', answer: '飲む' },
        { question: 'tangkap', answer: 'キャッチ' },
        { question: 'bom', answer: '爆弾' },
        { question: 'meja', answer: 'テーブル' },
        { question: 'pacar', answer: '彼氏' },
        { question: 'digunakan', answer: '使用済み' },
        { question: 'asing', answer: '外国' },
        { question: 'daerah', answer: 'エリア' },
        { question: 'ikan', answer: '魚' },
        { question: 'angkat', answer: 'リフト' },
        { question: 'pengacara', answer: '弁護士' },
        { question: 'michael', answer: 'マイケル' },
        { question: 'milikku', answer: '私の' },
        { question: 'bau', answer: '匂い' },
        { question: 'normal', answer: '普通' },
        { question: 'harapan', answer: '希望' },
        { question: 'ampun', answer: '私を許して' },
        { question: 'butuhkan', answer: '必要' },
        { question: 'mr.', answer: '氏' },
        { question: 'bank', answer: '銀行' },
        { question: 'mengalahkan', answer: '敗北' },
        { question: 'jiwa', answer: '魂' },
        { question: 'prajurit', answer: '兵士' },
        { question: 'otak', answer: '脳' },
        { question: 'kabarmu', answer: 'あなたのニュース' },
        { question: 'miliki', answer: '持っている' },
        { question: 'menempatkan', answer: '置く' },
        { question: 'hotel', answer: 'ホテル' },
        { question: 'selatan', answer: '南' },
        { question: 'lelah', answer: '疲れた' },
        { question: 'dapatkah', answer: 'できる' },
        { question: 'pohon', answer: '木' },
        { question: 'sebagian', answer: '一部' },
        { question: 'menemui', answer: '会う' },
        { question: 'apa-apaan', answer: 'なんてこった' },
        { question: 'berangkat', answer: '離れる' },
        { question: 'pusat', answer: '中心' },
        { question: 'tumbuh', answer: '育つ' },
        { question: 'kerajaan', answer: '王国' },
        { question: 'dewasa', answer: '成熟した' },
        { question: 'maju', answer: '進む' },
        { question: 'menjawab', answer: '答え' },
        { question: 'menutup', answer: '近い' },
    ];

})();
