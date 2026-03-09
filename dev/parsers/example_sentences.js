import fs from 'node:fs'
import * as readline from 'node:readline';
import { stdin, stdout } from 'node:process';

const XML_ENTITY_MAP = {
    nbsp: ' ',
    lt: '<',
    gt: '>',
    amp: '&',
    quot: '"',
    apos: "'"
};
const UNKNOWN_WORD_PENALTY = Math.floor(Number.MAX_SAFE_INTEGER / 1000000);

const params = {
    languageFile: '',
    parseOnly: false,
    unknownArgument: false
};
const LANGUAGE_ARGS = [ '--lang', '-l' ];
const PARSE_ONLY_ARGS = [ '--parse-only', '-p' ];
const args = process.argv.slice(2);
const files = [];
for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('-')) {
        if (LANGUAGE_ARGS.includes(arg)) {
            i++;
            params.languageFile = args[i];
            continue;
        } else if (PARSE_ONLY_ARGS.includes(arg)) {
            params.parseOnly = true;
            continue;
        } else {
            params.unknownArgument = true;
            console.warn(`Unknown argument: ${arg}`);
            continue;
        }
    }
    files.push(arg);
}
if (params.unknownArgument) {
    process.exit(0);
}

const words = fs.readFileSync(params.languageFile, 'utf8').split('\n');
const wordsFrequencyMap = new Map(words.map((word, index) => [ word, index + 1 ]));
let text = '';
files.forEach(filename => {
    const fileText = fs.readFileSync(filename, 'utf8');
    const preprocessFunction = filename.endsWith('.xml') ? preprocessXml : preprocessTxt;
    text += preprocessFunction(fileText) + '\n';
});
if (params.parseOnly) {
    console.log(text);
    process.exit(0);
}
const sentences = text.split('\n');
const wordsToSentencesMap = processSentences(sentences, wordsFrequencyMap);

const read = readline.createInterface({ input: stdin, output: stdout });
read.on('line', word => {
    const sentences = wordsToSentencesMap.get(word);
    if (!sentences) {
        console.log(` --- No sentences found for word: ${word}`);
        return;
    }
    
    console.log(` --- ${word}:`);
    sentences
        .sort(({ score: score1 }, { score: score2 }) => score1 - score2)
        .slice(0, 5)
        .forEach(({ sentence }) => console.log(sentence));
});

/**
 * 
 * @param {string[]} sentences 
 * @param {Map<string, number>} wordsFrequencyMap 
 */
function processSentences(sentences, wordsFrequencyMap) {
    const sentencesForWords = new Map();
    const processedSentences = new Set();
    sentences
        .map(sentence => {
            const sentenceLowerCase = sentence.toLowerCase();
            if (processedSentences.has(sentenceLowerCase)) {
                return [ 0, sentence ];
            }
            processedSentences.add(sentenceLowerCase);
            return [ processSentence(sentence, wordsFrequencyMap, sentenceLowerCase), sentence ];
        })
        .filter(([ processedSentence ]) => processedSentence && (processedSentence.score > 0 && processedSentence.score < UNKNOWN_WORD_PENALTY))
        .forEach(([ processedSentence, sentence ]) => processedSentence.words.forEach(word => addToMap(sentencesForWords, word, { sentence, score: processedSentence.score })));

    return sentencesForWords;
}

function addToMap(map, key, value) {
    const entry = map.get(key);
    if (!entry) {
        map.set(key, [ value ]);
    } else {
        entry.push(value);
    }
}

/**
 * 
 * @param {string} sentence 
 * @param {Map<string, number>} wordsFrequencyMap 
 * @param {string} [sentenceLowerCase=sentence.toLowerCase()] 
 * @returns {{ words: string[], score: number} | null} null if not applicable
 */
function processSentence(sentence, wordsFrequencyMap, sentenceLowerCase = sentence.toLowerCase()) {
    if (sentence.includes(' ')) {
        // If sentence is not capitalized skip
        if (!sentence.match(/^"?[A-Z]/)) {
            return null;
        }

        // If the sentence has an uneven number of quotes skip
        const quotes = sentence.match(/"/g);
        if (quotes && quotes.length % 2 !== 0) {
            return null;
        }

        const split = sentenceLowerCase
            .split(/[\s,"—'.]/)
            .filter(Boolean);
        const uniqueWords = [...new Set(split)];

        return {
            words: uniqueWords,
            score: uniqueWords.reduce(
                (acc, currentWord) => acc + (wordsFrequencyMap.get(currentWord) || UNKNOWN_WORD_PENALTY),
                0
            )
        };
    }

    return null;
}

function preprocessXml(text) {
    text = [...text.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)]
        .map(m => m[1])
        .join('\n');

    text = decodeEntities(text);
    text = text
        .replaceAll(/'{2,3}/g, '"')
        .replaceAll(/^[\*#]{1,2}\s*/gm, '')
        .replaceAll(/^.*[{}].*$/gm, '');

    text = preprocessTxt(text);

    text = text
        .replaceAll(/^.*[\[\]<>\=\|].*$/gm, '')
        .replaceAll(/^\n/gm, '');

    return text;
}

function decodeEntities(str) {
    return str.replaceAll(/&(#\d+|#x[0-9a-fA-F]+|\w+);/g, (_, entity) => {
        if (entity.startsWith('#x')) {
            return String.fromCharCode(parseInt(entity.slice(2), 16));
        }
        if (entity.startsWith('#')) {
            return String.fromCharCode(parseInt(entity.slice(1), 10));
        }
        return XML_ENTITY_MAP[entity] ?? `&${entity};`;
    });
}

function preprocessTxt(text) {
    return text
        .replaceAll(/\[(\d|[a-z])+\]/g, '')
        .replaceAll(/^.*(?<![.!?])\n?$/gm, '')
        .replaceAll(/([.!?])(?=\s+(?!["')]))/g, '$1\n')
        .replaceAll(/^\s+/gm, '')
        .replaceAll(/ [.]{3}\n/g, ' ... ')
        .replaceAll(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|e\.g|i\.e)\.\n/g, '$1.')
}