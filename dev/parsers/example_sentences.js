import fs from 'node:fs'
import * as readline from 'node:readline';
import { stdin, stdout } from 'node:process';

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
    text += preprocessText(fileText) + '\n';
});
const sentences = text.split('\n');

const read = readline.createInterface({ input: stdin, output: stdout });
read.on('line', word => {
    console.log(` --- ${word}:`);
    sentences
        .map(sentence => [ processSentence(word, sentence), sentence ])
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
    sentence = sentence.toLowerCase();
    word = word.toLowerCase();

    if (!sentence.includes(word)) {
        return 0;
    }

    if (sentence.includes(' ')) {
        const split = sentence.split(/\s|,|[.]{3}|"|—|'/);
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

function preprocessText(text) {
    text = removeFluff(text);
    return text;
}

function removeFluff(text) {
    // remove [] references, headings, and empty lines
    text = text.replaceAll(/\[(\d|[a-z])+\]/g, '')
        .replaceAll(/^.*(?<![.!?])\n?$/gm, '')
        .replaceAll(/^\s+/gm, '');

    // protect ellipsis
    text = text.replaceAll(/\.\.\./g, "§ELLIPSIS§");

    // protect common abbreviations
    text = text.replaceAll(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|e\.g|i\.e)\./g, "$1§DOT§");

    // protect parentheses
    const parens = [];
    text = text.replaceAll(/\([^()]*\)/g, m => {
        parens.push(m);
        return `§PAREN${parens.length-1}§`;
    });

    // split
    text = text.replaceAll(/([.!?])\s+/g, "$1\n");

    // restore
    text = text.replaceAll(/§ELLIPSIS§/g, "...");
    text = text.replaceAll(/§DOT§/g, ".");
    text = text.replaceAll(/§PAREN(\d+)§/g, (_, i) => parens[i]);

    return text;


    return text
        .replaceAll(/\[(\d|[a-z])+\]/g, '')
        .replaceAll(/^.*(?<![.!?])\n?$/gm, '')
        .replaceAll(/^\s+/gm, '')
        .replaceAll(/([.!?]) (?=[^()]*?(?:\(|$))/g, '$1\n')
        .replaceAll(/ [.]{3}\n/g, ' ... ');
}

