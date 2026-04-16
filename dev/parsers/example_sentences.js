import fs from 'node:fs'
import * as readline from 'node:readline';
import { stdin, stdout } from 'node:process';
import { TokenizerBuilder } from 'lindera-wasm-unidic-nodejs';
import * as sax from 'sax';
import { parseArgv } from './utils.js';

const FORMATS = Object.freeze({
    TEST: 'test',
    JSON: 'json',
    TXT: 'txt'
});
const paramsData = {
    languageFile: { longName: 'language-file', shortName: 'l', required: true, mapper: String },
    parseOnly: { longName: 'parse-only', shortName: 'o' },
    format: { longName: 'format', shortName: 'f', default: FORMATS.TEST, allowed: Object.values(FORMATS), mapper: String },
    json: { longName: 'json', shortName: 'j' },
    txt: { longName: 'txt', shortName: 't' },
    prod: { longName: 'prod', shortName: 'p' },
    unidic: { longName: 'unidic', shortName: 'u' },
    testUnidic: { longName: 'test-unidic', shortName: 'e' },
    allowUnknownWords: { longName: 'allow-unknown', shortName: 'a' },
    wordsSplitChar: { longName: 'split-char', shortName: 's', default: ',', mapper: String },
    maxChunkSize: { longName: 'chunk-size', shortName: 'c', default: 10000000, mapper: Number },
    maxSentencesForWord: { longName: 'max-sentences', shortName: 'm', default: 5, mapper: Number },
};
const params = parseArgv(process.argv, paramsData);
params.textNodeIndividualChunkSize = Math.floor(params.maxChunkSize / 2);
if (params.unidic && !paramsData.maxChunkSize.isSet) {
    params.maxChunkSize = Math.floor(params.maxChunkSize / 3);
}
if (params.json) {
    params.format = FORMATS.JSON;
}
if (params.txt) {
    params.format = FORMATS.TXT;
}

const DEBUG_NUMBER_FORMAT = new Intl.NumberFormat();
const UNKNOWN_WORD_PENALTY = Math.floor(Number.MAX_SAFE_INTEGER / 1000000);
const ALPHABET_REGEX = /[a-z\s]+/ig;
const QUOTES_REGEX = /„““”"/ig;
const PUNCTUATION_SPLIT_REGEX = /[\s,、"—'.!?。！？（(「『‚„“)）」』‘“”]/;
const UNIDIC_JOIN_SUFFIXES = [ '助動詞', '接尾辞' ];
const ABBREVIATIONS = new Set([
        'Mr',
        'Mrs',
        'Ms',
        'Dr',
        'Prof',
        'Sr',
        'Jr',
        'St',
        'vs',
        'etc',
        'e.g',
        'i.e'
    ].flatMap(abbreviation => [ abbreviation, abbreviation.toLowerCase(), abbreviation.toUpperCase(), capitalize(abbreviation) ])
);

const JSON_DEV_CONFIG = {
    spaces: 2
};
const JSON_PROD_CONFIG = {
    spaces: 0
}

if (params.unidic && !global.gc) {
    console.warn('Global gc (recommended with unidic) not enabled, run node with "node --expose-gc" flag to enable global gc');
}

const [ debugLog, sentenceWarning ] = (params.format === FORMATS.JSON || params.format === FORMATS.TXT)
    ? [ console.warn, () => {} ]
    : [ console.debug, console.warn ];

const tokenizerBuilder = new TokenizerBuilder();
tokenizerBuilder.setDictionary('embedded://unidic');
const tokenizer = tokenizerBuilder.build();

if (params.testUnidic) {
    const sentence = '新しくできた水族館にはまだ行ったことがありません。';
    const split = splitUnidic(sentence);
    console.log(split.join(', '));
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

(async function() {
    const sentencesForWords = new Map();
    for (let i = 0; i < params.files.length; i++) {
        const filename = params.files[i];
        debugLog(`Reading file (${i + 1} / ${params.files.length}): ${filename}`);
        if (filename.endsWith('.xml')) {
            await streamXml(filename, wordsFrequencyMap, sentencesForWords);
        } else {
            let fileText = fs.readFileSync(filename, 'utf8');
            const isPreprocessed = filename.endsWith('.processed.txt');
            if (isPreprocessed) {
                debugLog(`Preprocessed file: "${filename}"`);
            } else {
                fileText = preprocessTxt(fileText);
            }
            const sentences = fileText.split('\n');
            processSentences(sentences, wordsFrequencyMap, sentencesForWords);
        }
    };
    if (params.parseOnly) {
        process.exit(0);
    }
    
    const jsonResult = {};
    const read = readline.createInterface({ input: stdin, output: stdout });
    read.on('line', line => {
        const word = line.split(params.wordsSplitChar)[0];
        let sentences = sentencesForWords.get(word);
        if (!sentences) {
            if (params.format === FORMATS.TEST) {
                console.log(` --- No sentences found for word: ${word}`);
            }
            return;
        }
        
        const singleWordScore = wordsFrequencyMap.get(word);
        sentences = sentences
            .filter(({ score }) => score > singleWordScore)
            .sort(({ score: score1 }, { score: score2 }) => score1 - score2)
            .slice(0, params.maxSentencesForWord)
            .map(({ sentence }) => sentence);
    
        if (params.format === FORMATS.JSON) {
            jsonResult[word] = sentences;
        } else {
            if (params.format === FORMATS.TEST) {
                console.log(` --- ${word}:`);
            }
            sentences.forEach(sentence => console.log(sentence));
        }
    });
    
    if (params.format === FORMATS.JSON) {
        const jsonConfig = params.prod ? JSON_PROD_CONFIG : JSON_DEV_CONFIG;
        read.on('close', () => {
            console.log(JSON.stringify(jsonResult, null, jsonConfig.spaces));
        });
    }
})();

/**
 * 
 * @param {string[]} sentences 
 * @param {Map<string, number>} wordsFrequencyMap 
 * @param {Map<string, number>} sentencesForWords 
 */
function processSentences(sentences, wordsFrequencyMap, sentencesForWords) {
    for (let i = 0; i < sentences.length; i++) {
        if (i % 10000 === 0) {
            debugLog(`${i} / ${sentences.length} (${(i * 100 / sentences.length).toFixed(2)}%)`);
        }
        // map
        const sentence = sentences[i];
        const sentenceLowerCase = sentence.toLowerCase();
        
        // filter
        const processedSentence = processSentence(sentence, wordsFrequencyMap, maxWordLength, sentenceLowerCase);
        if (!processedSentence || processedSentence.score === 0 || (!params.allowUnknownWords && processedSentence.score >= UNKNOWN_WORD_PENALTY)) {
            continue;
        }

        // foreach
        for (const word of processedSentence.words) {
            if (params.allowUnknownWords && !wordsFrequencyMap.has(word)) {
                continue;
            }

            addToMap(sentencesForWords, word, { sentence, uniqueSentence: sentenceLowerCase.replaceAll(QUOTES_REGEX, ''), score: processedSentence.score });
        }
        delete sentences[i];
    }
    gc();
}

function addToMap(map, key, value) {
    const entry = map.get(key);
    if (!entry) {
        map.set(key, [ value ]);
        return;
    }
    
    if (entry.some(({ uniqueSentence }) => uniqueSentence === value.uniqueSentence)) {
        return;
    }

    entry.push(value);
    if (entry.length > params.maxSentencesForWord) {
        entry.sort(({ score: score1 }, { score: score2 }) => score1 - score2);
        entry.pop();
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
    const isAlphabet = !params.unidic && !!sentence.match(ALPHABET_REGEX);

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
        .split(PUNCTUATION_SPLIT_REGEX)
        .filter(Boolean);

    if (params.unidic) {
        return sentenceSplit.flatMap(splitUnidicToBaseForms);
    }

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
                if (unknownPartLength > 0) {
                    const unknownPart = sentencePart.substring(start - unknownPartLength, start);
                    unknownParts.push(unknownPart);
                    result.push(unknownPart);
                    unknownPartLength = 0;
                }
                result.push(part);
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
        sentenceWarning(`Sentence part: ${sentencePart} contains ${unknownParts.length} unknown parts: ${unknownParts.join(', ')}`);
    }
    return result;
}

function preprocessXml(text) {
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

async function streamXml(filename, wordsFrequencyMap, sentencesForWords) {
    return new Promise((resolve, reject) => {
        const parser = sax.default.parser();
        const stream = fs.createReadStream(filename);
        const size = fs.statSync(filename).size;
        const sizeFormatted = DEBUG_NUMBER_FORMAT.format(size);
        
        let currentChunkSize = 0;
        let currentChunk = [];
        parser.ontext = data => {
            if (parser.tagName === 'TEXT') {
                if (params.maxTextNodeSize && (data.length > params.maxChunkSize)) {
                    console.warn(`XML skipping text chunk parser line: ${DEBUG_NUMBER_FORMAT.format(parser.line)}, position: ${positionPercentage(parser.position, size, sizeFormatted)}, text length: ${data.length}`);
                    return;
                }

                if (params.textNodeIndividualChunkSize && (data.length > params.textNodeIndividualChunkSize)) {
                    console.warn(`XML individual text chunk parser line: ${DEBUG_NUMBER_FORMAT.format(parser.line)}, position: ${positionPercentage(parser.position, size, sizeFormatted)}, text length: ${data.length}`);
                    handleXmlDataChunk([ data ], wordsFrequencyMap, sentencesForWords);
                    return;
                }

                currentChunkSize += data.length;
                currentChunk.push(data);
                if (currentChunkSize >= params.maxChunkSize) {
                    debugLog(`XML parser line: ${DEBUG_NUMBER_FORMAT.format(parser.line)}, position: ${positionPercentage(parser.position, size, sizeFormatted)}`);
                    handleXmlDataChunk(currentChunk, wordsFrequencyMap, sentencesForWords);
                    currentChunkSize = 0;
                    currentChunk = [];
                }
            }
        };

        stream.on('close', () => {
            debugLog('XML stream ended');
            if (currentChunk.length > 0) {
                handleXmlDataChunk(currentChunk, wordsFrequencyMap, sentencesForWords);
            }
            resolve();
        });

        stream.on('data', data => parser.write(data));
    });
}

function positionPercentage(position, size, sizeFormatted = DEBUG_NUMBER_FORMAT.format(size)) {
    return `${DEBUG_NUMBER_FORMAT.format(position)} / ${sizeFormatted} (${(position * 100 / size).toFixed(2)}%)`;
}

function handleXmlDataChunk(chunk, wordsFrequencyMap, sentencesForWords) {
    if (params.parseOnly) {
        console.log(preprocessXml(chunk.join('\n')));
        return;
    }

    const sentences = preprocessXml(chunk.join('\n')).split('\n');
    processSentences(sentences, wordsFrequencyMap, sentencesForWords);
}

function preprocessTxt(text) {
    text = text.replaceAll(/\[(\d|[a-z])+\]/g, '');
    text = splitParser(text).join('\n');
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
            if (isNotSentenceEndingDot(text, i)) {
                continue;
            }
            const lastPeriodIndex = i + 1;
            split.push(text.substring(sentenceStart, lastPeriodIndex).trim());
            sentenceStart = lastPeriodIndex;
        } else if (NEWLINE_CHAR === char) {
            if (parens === 0 && !insideQuotes) {
                const sentence = text.substring(sentenceStart, i).trim();
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

/**
 * 
 * @param {string} text 
 * @param {number} index 
 * @returns 
 */
function isNotSentenceEndingDot(text, index) {
    if (text[index] !== '.') {
        return false;
    }

    if (    // " ... " ellipsis
        text[index - 1] === '.'
        && text[index - 2] === '.'
        && isWhitespace(text[index + 1])
        && isWhitespace(text[index - 3])
    ) {
        return true;
    }

    if (isWhitespace(text[index - 2])) {    // single letter in initials "Firstname M. Lastname"
        return true;
    }

    if (!isWhitespace(text[index + 1])) {   // dot not followed by space or newline "e.g." etc.
        return true;
    }
    
    if (isAbbreviation(text, index)) {
        return true;
    }

    return false;
}

/**
 * 
 * @param {string} text 
 * @param {number} index 
 */
function isAbbreviation(text, index) {
    const lastSpaceIndex = text.lastIndexOf(' ', index - 1);
    const potentialAbbreviation = text.substring(lastSpaceIndex + 1, index);
    return ABBREVIATIONS.has(potentialAbbreviation);
}

function isWhitespace(char) {
    return !char || char === ' ' || char === '\n';
}

function splitUnidic(sentence) {
    const tokens = tokenizer.tokenize(sentence);
    const split = tokens.reduce((acc, curr) => {
        const wordType = curr.getDetail(0);
        if (UNIDIC_JOIN_SUFFIXES.includes(wordType)) {
            if (acc.length === 0) {
                console.warn(`${wordType} at the start of a sentence: ${sentence}`);
                return acc;
            }
            acc[acc.length - 1] += curr.surface;
        } else {
            acc.push(curr.surface);
        }
        return acc;
    }, []);
    return split;
}

function splitUnidicToBaseForms(sentence) {
    const tokens = tokenizer.tokenize(sentence);
    const split = [];
    
    for (const token of tokens) {
        const wordType = token.getDetail(0);
        if (UNIDIC_JOIN_SUFFIXES.includes(wordType)) {
            continue;
        }
        
        const baseForm = token.getDetail(10);
        split.push(baseForm);
    }

    return split;
}

/**
 * 
 * @param {string} string 
 */
function capitalize(string) {
    if (!string || string.length === 0) {
        return string;
    }
    return string.charAt(0).toUpperCase() + string.substring(1, string.length).toLowerCase();
}

function gc() {
    if (global.gc) {
        debugLog('Running gc...');
        global.gc();
    }
}
