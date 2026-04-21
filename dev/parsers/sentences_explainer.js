import fs from 'node:fs'
import { TokenizerBuilder } from 'lindera-wasm-unidic-nodejs';
import { parseArgv } from './utils.js';

const params = parseArgv(process.argv, {
    sentencesFile: { longName: 'sentences', shortName: 's', required: true, mapper: String },
    prod: { longName: 'prod', shortName: 'p' },
    auxiliaries: { longName: 'auxiliaries', shortName: 'a' }
});

const UNIDIC_JOIN_SUFFIXES = [ '助動詞', '接尾辞' ];
const UNIDIC_BLANK_FORM = '*';
const UNIDIC_PUNCTUATION_TYPE = '補助記号';
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

const foundAuxiliaries = new Map();
function addFoundAuxiliary(wordKey, sentence) {
    if (foundAuxiliaries.has(wordKey)) {
        return;
    }
    foundAuxiliaries.set(wordKey, sentence);
}

const wordsWithSentences = JSON.parse(fs.readFileSync(params.sentencesFile, 'utf8'));
Object.keys(wordsWithSentences).forEach(word => wordsWithSentences[word] = wordsWithSentences[word].map(explainSentence));
if (params.auxiliaries) {
    foundAuxiliaries.entries().forEach(([ wordKey, sentence ]) => console.log(`${wordKey}: ${sentence}`));
} else {
    console.log(JSON.stringify(wordsWithSentences, null, jsonConfig.spaces));
}

function explainSentence(sentence) {
    const tokens = tokenizer.tokenize(sentence);
    const words = splitIntoWordsWithAuxiliaries(tokens, sentence);
    return words
        .map(mapWordDataToText)
        .join('');
}

function splitIntoWordsWithAuxiliaries(tokens, sentence) {
    const words = [];

    for (const token of tokens) {
        const word = token.surface;
        const type = token.getDetail(0);
        const form = token.getDetail(5);
        const base = token.getDetail(10);
        const isUnknown = token.is_unknown;
        if (UNIDIC_JOIN_SUFFIXES.includes(type)) {
            const modifiedWord = words[words.length - 1];
            if (modifiedWord) {
                const auxiliaryForm = form === UNIDIC_BLANK_FORM
                    ? findMostDetailedPos(token)
                    : form;
                const wordKey = mapBaseWordWithFormToText(base, auxiliaryForm);
                addFoundAuxiliary(wordKey, sentence)
                modifiedWord.parts.push(wordKey);
                modifiedWord.word += word;
                continue;
            }
        }
        words.push({ word, type, base, isUnknown, parts: [ ] });
    };

    return words;
}

function mapWordDataToText(wordData) {
    if (wordData.isUnknown || wordData.type === UNIDIC_PUNCTUATION_TYPE) {
        return wordData.word;
    }
    if (wordData.parts.length === 0 && wordData.word === wordData.base) {
        return `[${wordData.word}]`;
    }
    return `[${[ wordData.word, wordData.base, ...wordData.parts ].join('|')}]`;
}

function mapBaseWordWithFormToText(base, form) {
    return `${base},${form}`;
}

function findMostDetailedPos(token) {
    for (let i = 4; i >= 0; i--) {
        const pos = token.getDetail(i);
        if (pos !== UNIDIC_BLANK_FORM) {
            return pos;
        }
    }

    return UNIDIC_BLANK_FORM;
}