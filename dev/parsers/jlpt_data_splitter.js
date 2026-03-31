import fs from 'node:fs';

const args = process.argv.slice(2);
const file = args[0];

const jlptData = JSON.parse(fs.readFileSync(file, 'utf8'));
const japaneseSplitRegex = /[、/\s]+/g;
const englishVerbRegex = /\bto ([a-z]+)/ig;
const suruSuffix = 'する';
const suruLength = suruSuffix.length;
const splitData = jlptData.map(({ kanji, kana, english }) => {
    const kanjiSplit = kanji.split(japaneseSplitRegex);
    const kanaSplit = kana.split(japaneseSplitRegex);
    return kanjiSplit.map(kanjiPart => kanaSplit.map(kanaPart => {
        if (kanaPart !== suruSuffix && kanaPart.endsWith(suruSuffix) && !kanjiPart.endsWith(suruSuffix) && english.match(englishVerbRegex)) {
            const englishNouned = english.replaceAll(englishVerbRegex, '$1');
            return [
                { kanji: `${kanjiPart}${suruSuffix}`, kana: kanaPart, english },
                { kanji: kanjiPart, kana: kanaPart.substring(0, kanaPart.length - suruLength), english : `(noun) ${englishNouned}` }
            ];
        }
        return { kanji: kanjiPart, kana: kanaPart, english };
    }));
}).flat(Number.MAX_SAFE_INTEGER);
console.log(JSON.stringify(splitData, null, 2));