import fs from 'node:fs'
import * as readline from 'node:readline';
import { stdin, stdout } from 'node:process';

const QUIZ_FORMAT_ARGS = [ '--quiz', '-q' ];
const TRANSLATE_FORMAT_ARGS = [ '--translate', '-t' ];

const FORMATS = Object.freeze({
    NORMAL: 1,
    QUIZ: 2,
    TRANSLATE: 3
});

const params = {
    file: '',
    format: FORMATS.NORMAL
};

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (QUIZ_FORMAT_ARGS.includes(arg)) {
        params.format = FORMATS.QUIZ;
        continue;
    }
    if (TRANSLATE_FORMAT_ARGS.includes(arg)) {
        params.format = FORMATS.TRANSLATE;
        continue;
    }
    params.file = arg;
}

const wiktionary = JSON.parse(fs.readFileSync(params.file, 'utf8'));
const dictMap = new Map();
wiktionary.forEach(entry => {
    const word = entry.word;
    const existingEntry = dictMap.get(word);
    if (existingEntry) {
        existingEntry.push(entry);
    } else {
        dictMap.set(word, [ entry ]);
    }
})

const result = params.format === FORMATS.NORMAL ? {} : [];
const read = readline.createInterface({ input: stdin, output: stdout });
read.on('line', word => {
    const entries = dictMap.get(word);
    const senses = (entries && entries.map(entry => entry.senses).flat());
    if (!senses) {
        if (params.format === FORMATS.NORMAL) {
            result[word] = ' - no senses - ';
        }
        return;
    }

    const glossesArray = deduplicateGlosses(
        senses
            .map(sense => sense.glosses)
            .map(glosses => (glosses || []).filter(gloss => !gloss.toLowerCase().includes(word)))
    ).filter(glosses => glosses.length);

    const finalGloss = glossesArray.map(glosses => glosses.map(formatGloss).join(',')).join(';');
    switch (params.format) {
        case FORMATS.QUIZ:
            result.push({ question: word, answer: finalGloss });
            break;
        case FORMATS.TRANSLATE:
            result.push([ word, finalGloss ]);
            break;
        case FORMATS.NORMAL:
        default:
            result[word] = finalGloss;
            break;
    }
});

function formatGloss(gloss) {
    if (gloss.endsWith('。')) {
        gloss = gloss.substring(0, gloss.length - 1);
    }
    return gloss.replace(/。/g, '、');
}

/**
 * 
 * @param {string[][]} glossesArray 
 */
function deduplicateGlosses(glossesArray) {
    const existingGlosses = new Set();
    return glossesArray.map(glosses => glosses.filter(gloss => {
        if (existingGlosses.has(gloss)) {
            return false;
        }
        existingGlosses.add(gloss);
        return true;
    }));
}

read.on('close', () => {
    const string = params.format === FORMATS.TRANSLATE
        ? result.map(entry => entry.join('\t')).join('\n')
        : JSON.stringify(result, null, 2);
    console.log(string);
});