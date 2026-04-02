import fs from 'node:fs'
import * as readline from 'node:readline';
import { stdin, stdout } from 'node:process';

const LANGUAGE_ARGS = [ '--lang', '-l' ];
const PARSE_ONLY_ARGS = [ '--parse-only', '-p' ];
const JSON_ARGS = [ '--json', '-j' ];
const JSON_PROD_ARGS = [ '--json-prod', '-jp' ];
const WORDS_SPLIT_CHAR_ARGS = [ '--words-split', '-s' ];

const XML_ENTITY_MAP = {
    nbsp: ' ',
    lt: '<',
    gt: '>',
    amp: '&',
    quot: '"',
    apos: "'"
};
const UNKNOWN_WORD_PENALTY = Math.floor(Number.MAX_SAFE_INTEGER / 1000000);
const ALPHABET_REGEX = /[a-z\s]+/ig;
const PUNCTUATION_REGEX = /[.!?。！？(「『‚„“)」』‘“”"',、—]/g;

const params = {
    languageFile: '',
    parseOnly: false,
    json: false,
    prod: false,
    wordsSplitChar: ',',
    unknownArgument: false
};

const JSON_DEV_CONFIG = {
    spaces: 2
};
const JSON_PROD_CONFIG = {
    spaces: 0
}

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
        } else if (JSON_ARGS.includes(arg)) {
            params.json = true;
            continue;
        } else if (JSON_PROD_ARGS.includes(arg)) {
            params.json = true;
            params.prod = true;
            continue;
        } else if (WORDS_SPLIT_CHAR_ARGS.includes(arg)) {
            i++;
            params.wordsSplitChar = args[i];
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

const wordLines = fs.readFileSync(params.languageFile, 'utf8')
    .split('\n')
    .map(word => word.split(params.wordsSplitChar));
const wordsFrequencyMap = new Map(
    wordLines
        .flatMap((words, lineIndex) => words.map(word => [ word, lineIndex + 1 ]))
);
const maxWordLength = wordsFrequencyMap.keys().reduce((acc, curr) => Math.max(acc, curr.length), 0);
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

const jsonResult = {};
const read = readline.createInterface({ input: stdin, output: stdout });
read.on('line', line => {
    const word = line.split(params.wordsSplitChar)[0];
    let sentences = wordsToSentencesMap.get(word);
    if (!sentences) {
        if (!params.json) {
            console.log(` --- No sentences found for word: ${word}`);
        }
        return;
    }
    
    const singleWordScore = wordsFrequencyMap.get(word);
    sentences = sentences
        .filter(({ score }) => score > singleWordScore)
        .sort(({ score: score1 }, { score: score2 }) => score1 - score2)
        .slice(0, 5)
        .map(({ sentence }) => sentence);

    if (params.json) {
        jsonResult[word] = sentences;
    } else {
        console.log(` --- ${word}:`);
        sentences.forEach(sentence => console.log(sentence));
    }
});

if (params.json) {
    const jsonConfig = params.prod ? JSON_PROD_CONFIG : JSON_DEV_CONFIG;
    read.on('close', () => {
        console.log(JSON.stringify(jsonResult, null, jsonConfig.spaces));
    });
}

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
            const uniqueSentence = sentenceLowerCase
                .replaceAll(PUNCTUATION_REGEX, '')
                .trim();
            if (processedSentences.has(uniqueSentence)) {
                return [ 0, sentence ];
            }
            processedSentences.add(uniqueSentence);
            return [ processSentence(sentence, wordsFrequencyMap, maxWordLength, sentenceLowerCase), sentence ];
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
 * @param {number} maxWordLength 
 * @param {string} [sentenceLowerCase=sentence.toLowerCase()] 
 * @returns {{ words: string[], score: number} | null} null if not applicable
 */
function processSentence(sentence, wordsFrequencyMap, maxWordLength, sentenceLowerCase = sentence.toLowerCase()) {
    const isAlphabet = sentence.match(ALPHABET_REGEX);

    // If sentence is not capitalized skip
    if (isAlphabet && !sentence.match(/^["„“]?[A-Z]/)) {
        return null;
    }

    const split = splitSentence(sentenceLowerCase, wordsFrequencyMap, maxWordLength, isAlphabet);
    const uniqueWords = [...new Set(split)];

    return {
        words: uniqueWords,
        score: uniqueWords.reduce(
            (acc, currentWord) => acc + (wordsFrequencyMap.get(currentWord) || UNKNOWN_WORD_PENALTY),
            0
        )
    };
}

function splitSentence(sentence, wordsMap, maxWordLength, isAlphabet) {
    const sentenceSplit = sentence
        .split(/[\s,、"—'.!?。！？（(「『‚„“)）」』‘“”]/)
        .filter(Boolean);

    if (isAlphabet) {
        return sentenceSplit;
    }

    return sentenceSplit.flatMap(sentencePart => splitSentencePartNonAlphabet(sentencePart, wordsMap, maxWordLength));
}

function splitSentencePartNonAlphabet(sentencePart, wordsMap, maxWordLength) {
    const result = [];
    const unknownParts = [];
    let unknownPartLength = 0;

    outer: for (let start = 0; start < sentencePart.length; start++) {
        for (let end = Math.min(sentencePart.length, start + maxWordLength); end > start; end--) {
            const part = sentencePart.substring(start, end);
            if (wordsMap.has(part)) {
                result.push(part);
                if (unknownPartLength > 0) {
                    const unknownPart = sentencePart.substring(start - unknownPartLength, start);
                    unknownParts.push(unknownPart);
                    result.push(unknownPart);
                    unknownPartLength = 0;
                }
                start += part.length - 1;
                continue outer;
            }
        }
        unknownPartLength++;
    }

    if (unknownPartLength > 0) {
        const unknownPart = sentencePart.substring(sentencePart.length - unknownPartLength, sentencePart.length);
        unknownParts.push(unknownPart);
        result.push(unknownPart);
    }
    if (unknownParts.length > 0) {
        console.warn(`Sentence part: ${sentencePart} contains ${unknownParts.length} unknown parts: ${unknownParts.join(', ')}`);
    }
    return result;
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
    text = text
        .replaceAll(/\[(\d|[a-z])+\]/g, '')
        .replaceAll(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|e\.g|i\.e)\./ig, '$1__@__')
        .replaceAll(/\b([A-Z])\./g, '$1__@__')
        .replaceAll(/ [.]{3} /g, ' __@@@__ ');

    text = splitParser(text).join('\n');

    text = text
        .replaceAll(/^\s+/gm, '')
        .replaceAll(/ __@@@__ /g, ' ... ')
        .replaceAll(/__@__/g, '.');

    return text;
}

function splitParser(text) {
    const PERIOD_CHARS = '.!?。！？';
    const OPEN_PAREN_CHARS = '(「『‚„“（[';
    const END_QUOTE_CHARS = '」』‘“”）]';
    const CLOSE_PAREN_CHARS = ')' + END_QUOTE_CHARS;
    const QUOTE_CHAR = '"';
    const NEWLINE_CHAR = '\n';

    const split = [];
    let parens = 0;
    let insideQuotes = false;
    for (let i = 0, sentenceStart = 0; i < text.length; i++) {
        const char = text[i];
        if (QUOTE_CHAR === char) {
            insideQuotes = !insideQuotes;
        } else if (OPEN_PAREN_CHARS.includes(char)) {
            parens++;
        } else if (CLOSE_PAREN_CHARS.includes(char)) {
            parens--;
            if (parens < 0) {
                i = text.indexOf(NEWLINE_CHAR, i + 1) || text.length;
            }
        } else if (parens === 0 && !insideQuotes && PERIOD_CHARS.includes(char)) {
            while (PERIOD_CHARS.includes(text[i + 1])) {
                i++;
            }
            const lastPeriodIndex = i + 1;
            split.push(text.substring(sentenceStart, lastPeriodIndex));
            sentenceStart = lastPeriodIndex;
        } else if (NEWLINE_CHAR === char) {
            if (parens === 0 && !insideQuotes) {
                const sentence = text.substring(sentenceStart, i);
                if (
                    sentence
                    // Sentence is from a language that doesn't need punctuation to end sentences
                    && (
                        !sentence.match(ALPHABET_REGEX) || (
                            // Sentence ends with a quote closed American-style, punctuation inside the quote - "Example."
                            END_QUOTE_CHARS.includes(sentence[sentence.length - 1])
                            && PERIOD_CHARS.includes(sentence[sentence.length - 2])
                        )
                    )
                ) {
                    split.push(sentence);
                }
            }

            parens = 0;
            insideQuotes = false;
            sentenceStart = i + 1;
        }
    }

    return split;
}