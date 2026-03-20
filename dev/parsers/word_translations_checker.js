import fs from 'node:fs'

const WORDS_ARGS = [ '--words', '-w' ];
const TRANSLATIONS_ARGS = [ '--translations', '-t' ];
const EXCLUDED_ARGS = [ '--excluded', '-e' ];
const WORDS_START_ARGS = [ '--words-start', '-ws' ];
const WORDS_AMOUNT_ARGS = [ '--words-amount', '-wa' ];
const SPLIT_CHAR_ARGS = [ '--split-char', '-s' ];
const FORMAT_JSON_ARGS = [ '--json', '-j' ];

const params = {
    wordsFile: '',
    translationsFile: '',
    excludedFile: '',
    wordsStart: 0,
    wordsAmount: null,
    splitChar: ',',
    formatJson: false,
    unknownArgument: false
};

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (WORDS_ARGS.includes(arg)) {
        params.wordsFile = args[i + 1];
        i++;
        continue;
    }
    if (TRANSLATIONS_ARGS.includes(arg)) {
        params.translationsFile = args[i + 1];
        i++;
        continue;
    }
    if (EXCLUDED_ARGS.includes(arg)) {
        params.excludedFile = args[i + 1];
        i++;
        continue;
    }
    if (WORDS_START_ARGS.includes(arg)) {
        params.wordsStart = Number(args[i + 1]);
        i++;
        continue;
    }
    if (WORDS_AMOUNT_ARGS.includes(arg)) {
        params.wordsAmount = Number(args[i + 1]);
        i++;
        continue;
    }
    if (SPLIT_CHAR_ARGS.includes(arg)) {
        params.splitChar = args[i + 1].replaceAll('\\t', '\t');
        i++;
        continue;
    }
    if (FORMAT_JSON_ARGS.includes(arg)) {
        params.formatJson = true;
        continue;
    }
    console.warn(`Unknown argument: ${arg}`);
    params.unknownArgument = true;
}

if (params.unknownArgument) {
    process.exit(0);
}

const words = fs.readFileSync(params.wordsFile, 'utf8').split('\n')
    .slice(params.wordsStart, params.wordsAmount === null ? words.length : (params.wordsStart + params.wordsAmount))
    .filter(Boolean);
const translations = fs.readFileSync(params.translationsFile, 'utf8')
    .split('\n')
    .filter(Boolean);
const translated = translations.map(entry => entry.split(params.splitChar)[0]);
const excluded = fs.readFileSync(params.excludedFile, 'utf8')
    .split('\n')
    .filter(Boolean);

const wordsOrderMap = new Map(words.map((word, index) => [ word, index ]));

const processedWords = new Set();
[
    { name: params.translationsFile, words: translated },
    { name: params.excludedFile, words: excluded },
].forEach(wordFile => {
    const currentFileProcessedWords = new Set();
    wordFile.words.forEach(word => {
        if (currentFileProcessedWords.has(word)) {
            console.warn(`${word} in ${wordFile.name} already in the same file!`)
        } else if (processedWords.has(word)) {
            console.warn(`${word} in ${wordFile.name} already in another file!`)
        }
        currentFileProcessedWords.add(word);
        processedWords.add(word);
    })
});

words.forEach(word => {
    if (!processedWords.has(word)) {
        console.warn(word);
    }
});

const sortedTranslations = translations.sort((a, b) => wordsOrderMap.get(a.split(params.splitChar)[0]) - wordsOrderMap.get(b.split(params.splitChar)[0]));
if (params.formatJson) {
    const entries = sortedTranslations.map(translation => {
        const [ word, english, japanese ] = translation.split(params.splitChar);
        return { question: word, english, answer: japanese };
    });
    console.log(JSON.stringify(entries, null, 4));
} else {
    console.log(sortedTranslations.join('\n'));
}