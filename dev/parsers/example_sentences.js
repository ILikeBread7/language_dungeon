import fs from 'node:fs'
import * as readline from 'node:readline';
import { stdin, stdout } from 'node:process';

let text = '';
process.argv.slice(2).forEach(filename => {
    const fileText = fs.readFileSync(filename, 'utf8');
    text += preprocessText(fileText) + '\n';
});
const sentences = text.split('\n');

const read = readline.createInterface({ input: stdin, output: stdout });
read.on('line', word => {
    sentences.forEach(sentence => processSentence(word, sentence));
});

function processSentence(word, sentence) {
    const split = sentence.split(/\s|,|[.]{3}|"|—|'/);
    if (split.includes(word)) {
        console.log(sentence);
    }
}

function preprocessText(text) {
    text = removeFluff(text);
    return text;
}

function removeFluff(text) {
    return text
        .replaceAll(/\[(\d|[a-z])+\]/g, '')
        .replaceAll(/^.*(?<![.!?])\n?$/gm, '')
        .replaceAll(/^\s+/gm, '')
        .replaceAll(/([.!?]) (?=[^()]*?(?:\(|$))/g, '$1\n')
        .replaceAll(/ [.]{3}\n/g, ' ... ');
}

