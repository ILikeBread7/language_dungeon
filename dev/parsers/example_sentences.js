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

const LANGUAGE_PARAMS = [ '--lang', '-l' ];
const args = process.argv.slice(2);
const files = [];
let languageFile = '';
for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (LANGUAGE_PARAMS.includes(arg)) {
        i++;
        languageFile = args[i];
        continue;
    }
    files.push(arg);
}

const words = fs.readFileSync(languageFile, 'utf8').split('\n');
const wordsFrequencyMap = new Map(words.map((word, index) => [ word, index + 1 ]));
let text = '';
files.forEach(filename => {
    const fileText = fs.readFileSync(filename, 'utf8');
    const preprocessFunction = filename.endsWith('.xml') ? preprocessXml : preprocessTxt;
    text += preprocessFunction(fileText) + '\n';
});
const sentences = text.split('\n');

const read = readline.createInterface({ input: stdin, output: stdout });
read.on('line', word => {
    console.log(` --- ${word}:`);
    const processedSentences = new Set();
    sentences
        .map(sentence => {
            const sentenceLowerCase = sentence.toLocaleLowerCase();
            if (processedSentences.has(sentenceLowerCase)) {
                return [ 0, sentence ];
            }
            processedSentences.add(sentenceLowerCase);
            return [ processSentence(word, sentence), sentence ];
        })
        .filter(([ score ]) => score > 0)
        .sort((x1, x2) => x1[0] - x2[0])
        .slice(0, 5)
        .forEach(([ , sentence ]) => console.log(sentence));
});

/**
 * 
 * @param {string} word 
 * @param {string} sentence 
 * @returns {number} score, 0 if not applicable
 */
function processSentence(word, sentence) {
    const sentenceLowerCase = sentence.toLowerCase();
    word = word.toLowerCase();

    if (!sentenceLowerCase.includes(word)) {
        return 0;
    }

    if (sentence.includes(' ')) {
        // If sentence is not capitalized skip
        if (!sentence.match(/^"?[A-Z]/)) {
            return 0;
        }

        // If the sentence has an uneven number of quotes skip
        const quotes = sentence.match(/"/g);
        if (quotes && quotes.length % 2 !== 0) {
            return 0;
        }

        const split = sentenceLowerCase
            .split(/[\s,"—'.]/)
            .filter(Boolean);

        if (!split.includes(word)) {
            return 0;
        }

        return split.reduce(
            (acc, currentWord) => acc + (word === currentWord ? 0 : (wordsFrequencyMap.get(currentWord) || (wordsFrequencyMap.size + 1))),
            0
        );
    }

    return 0;
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

