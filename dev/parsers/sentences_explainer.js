import fs from 'node:fs'
import { TokenizerBuilder } from 'lindera-wasm-unidic-nodejs';

const SENTENCES_ARGS = [ '--sentences', '-s' ];
const LANGUAGE_CODE_ARGS = [ '--lang-code', '-lc' ];
const PROD_ARGS = [ '--prod', '-p' ];

const params = {
    sentencesFile: '',
    languageFile: '',
    languageCode: '',
    prod: false,
    unknownArgument: false
};

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('-')) {
        if (SENTENCES_ARGS.includes(arg)) {
            i++;
            params.sentencesFile = args[i];
        } else if (LANGUAGE_CODE_ARGS.includes(arg)) {
            i++;
            params.languageCode = args[i];
        } else if (PROD_ARGS.includes(arg)) {
            params.prod = true;
        } else {
            params.unknownArgument = true;
            console.warn(`Unknown argument: ${arg}`);
        }
    } else {
        params.sentencesFile = arg;
    }
}
if (params.unknownArgument) {
    process.exit(0);
}

const UNIDIC_JOIN_SUFFIXES = [ '助動詞', '接尾辞' ];
const UNIDIC_IGNORE_FORM_SUFFIXES = [ '一般', '撥音便' ];
const JSON_DEV_CONFIG = {
    spaces: 2
};
const JSON_PROD_CONFIG = {
    spaces: 0
}
const jsonConfig = params.prod ? JSON_PROD_CONFIG : JSON_DEV_CONFIG;


const tokenizerBuilder = new TokenizerBuilder();
tokenizerBuilder.setDictionary('embedded://unidic');
const tokenizer = tokenizerBuilder.build();

const wordsWithSentences = JSON.parse(fs.readFileSync(params.sentencesFile, 'utf8'));
Object.keys(wordsWithSentences).forEach(word => wordsWithSentences[word] = wordsWithSentences[word].map(explainSentence));
console.log(JSON.stringify(wordsWithSentences, null, jsonConfig.spaces));

function explainSentence(sentence) {
    const tokens = tokenizer.tokenize(sentence);
    const words = splitIntoWordsWithAuxiliaries(tokens);
    return words
        .map(mapWordDataToText)
        .join('');
}

function splitIntoWordsWithAuxiliaries(tokens) {
    const words = [];

    for (const token of tokens) {
        const word = token.surface;
        const type = token.getDetail(0);
        const form = token.getDetail(5);
        const base = token.getDetail(10);
        if (UNIDIC_JOIN_SUFFIXES.includes(type)) {
            const modifiedWord = words[words.length - 1];
            modifiedWord.parts.push(mapBaseWordWithFormToText(base, form));
            modifiedWord.word += word;
        } else {
            words.push({ word, type, parts: [ base ] });
        }
    };

    return words;
}

function mapWordDataToText(wordData) {
    if (wordData.type === '補助記号') {
        return wordData.word;
    }
    if (wordData.parts.length === 1 && wordData.word === wordData.parts[0]) {
        return `[${wordData.word}]`;
    }
    return `[${[ wordData.word, ...wordData.parts ].join('|')}]`;
}

function mapBaseWordWithFormToText(base, form) {
    if (isIgnoredStandardForm(form)) {
        return base;
    }
    return `${base},${form}`;
}

function isIgnoredStandardForm(form) {
    return UNIDIC_IGNORE_FORM_SUFFIXES.some(suffix => form.endsWith(suffix));
}