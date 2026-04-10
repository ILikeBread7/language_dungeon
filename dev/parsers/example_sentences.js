import fs from 'node:fs'
import * as readline from 'node:readline';
import { stdin, stdout } from 'node:process';
import { TokenizerBuilder } from 'lindera-wasm-unidic-nodejs';
import * as sax from 'sax';

const LANGUAGE_ARGS = [ '--lang', '-l' ];
const PARSE_ONLY_ARGS = [ '--parse-only', '-p' ];
const JSON_ARGS = [ '--json', '-j' ];
const JSON_PROD_ARGS = [ '--json-prod', '-jp' ];
const WORDS_SPLIT_CHAR_ARGS = [ '--words-split', '-s' ];
const ALLOW_UNKNOWN_WORDS_ARGS = [ '--allo-unknown-words', '-a' ];
const UNIDIC_ARGS = [ '--unidic', '-u' ];
const TEST_UNIDIC_ARGS = [ '--test-unidic', '-t' ];

const UNKNOWN_WORD_PENALTY = Math.floor(Number.MAX_SAFE_INTEGER / 1000000);
const ALPHABET_REGEX = /[a-z\s]+/ig;
const PUNCTUATION_REGEX = /[.!?。！？(「『‚„“)」』‘“”"',、—]/g;
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

const params = {
    languageFile: '',
    parseOnly: false,
    json: false,
    prod: false,
    unidic: false,
    testUnidic: false,
    allowUnknownWords: false,
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
        } else if (ALLOW_UNKNOWN_WORDS_ARGS.includes(arg)) {
            params.allowUnknownWords = true;
            continue;
        } else if (UNIDIC_ARGS.includes(arg)) {
            params.unidic = true;
            continue;
        } else if (TEST_UNIDIC_ARGS.includes(arg)) {
            params.testUnidic = true;
            continue;
        } else if (WORDS_SPLIT_CHAR_ARGS.includes(arg)) {
            i++;
            params.wordsSplitChar = args[i];
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
const sentences = [];

(async function() {
    for (const filename of files) {
        console.debug(`Reading file: ${filename}`);
        let texts;
        if (filename.endsWith('.xml')) {
            const xmlData = await streamXml(filename);
            texts = handleXmlData(xmlData);
        } else {
            const fileText = fs.readFileSync(filename, 'utf8');
            texts = [ preprocessTxt(fileText) ];
        }
        if (params.parseOnly) {
            console.log(texts.join('\n'));
        } else {
            for (const text of texts) {
                for (const sentence of text.split('\n')) {
                    sentences.push(sentence);
                }
            }
        }
    };
    if (params.parseOnly) {
        process.exit(0);
    }
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
})();

/**
 * 
 * @param {string[]} sentences 
 * @param {Map<string, number>} wordsFrequencyMap 
 */
function processSentences(sentences, wordsFrequencyMap) {
    const sentencesForWords = new Map();
    const processedSentences = new Set();

    for (let i = 0; i < sentences.length; i++) {
        if (i % 10000 === 0) {
            console.debug(`${i} / ${sentences.length} (${(i * 100 / sentences.length).toFixed(2)}%)`);
        }
        // map
        const sentence = sentences[i];
        const sentenceLowerCase = sentence.toLowerCase();
        const uniqueSentence = sentenceLowerCase
            .replaceAll(PUNCTUATION_REGEX, '')
            .trim();
        if (processedSentences.has(uniqueSentence)) {
            continue;
        }
        processedSentences.add(uniqueSentence);
        
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

            addToMap(sentencesForWords, word, { sentence, score: processedSentence.score });
        }
        delete sentences[i];
    }

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
        console.warn(`Sentence part: ${sentencePart} contains ${unknownParts.length} unknown parts: ${unknownParts.join(', ')}`);
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

async function streamXml(filename) {
    return new Promise((resolve, reject) => {
        const parser = sax.default.parser();
        const stream = fs.createReadStream(filename);
    
        let currentTag;
        const texts = [];
        parser.onopentag = ({name}) => {
            currentTag = name;
        };
        parser.onclosetag = () => {
            currentTag = undefined;
        };
        parser.ontext = data => {
            if (currentTag === 'TEXT') {
                texts.push(data);
            }
        };

        stream.on('data', data => parser.write(data));
        stream.on('close', () => resolve(texts));
    });
}

function handleXmlData(data) {
    const partitionedData = data.reduce((acc, curr, index) => {
        if (index % 100000 === 0) {
            acc.push([]);
        }
        acc[acc.length - 1].push(curr);
        return acc;
    }, []);
    return partitionedData.map(chunk => preprocessXml(chunk.join('\n')));
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
    let isAlphabet = false;
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
                        !(isAlphabet ||= sentence.match(ALPHABET_REGEX)) || (
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
 * @description Called only when text[index] is a dot "."
 * @returns 
 */
function isNotSentenceEndingDot(text, index) {
    return (
        text[index - 1] == '.'      // " ... " ellipsis
        && text[index - 2] == '.'
        && isWhitespace(text[index + 1])
        && isWhitespace(text[index - 3])
    ) || (
        isWhitespace(text[index - 2])    // single letter in initials "Firstname M. Lastname"
    ) || (
        !isWhitespace(text[index + 1])    // dot not followed by space or newline "e.g." etc.
    ) || isAbbreviation(text, index);
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