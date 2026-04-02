import fs from 'node:fs';

const args = process.argv.slice(2);
const file = args[0];
const fileData = fs.readFileSync(file, 'utf8');

const jlptData = file.endsWith('.json')
    ? JSON.parse(fileData)
    : formatTxtData(fileData);

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
            let kanaNoSuffix = kanaPart.substring(0, kanaPart.length - suruLength);
            if (kanaNoSuffix.endsWith('・')) {
                kanaNoSuffix = kanaNoSuffix.substring(0, kanaNoSuffix.length - 1);
            }
            return [
                { kanji: kanjiPart && (kanjiPart + suruSuffix), kana: kanaPart, english },
                { kanji: kanjiPart, kana: kanaNoSuffix, english : `(noun) ${englishNouned}` }
            ];
        }
        return { kanji: kanjiPart, kana: kanaPart, english };
    }));
}).flat(Number.MAX_SAFE_INTEGER);
console.log(JSON.stringify(splitData, null, 2));

function formatTxtData(data) {
    const lines = data.split('\n');
    const result = [];
    
    for (let i = 0; i < lines.length; i += 3) {
        const kanji = lines[i];
        const kana = lines[i + 1];
        const english = lines[i + 2];

        if (!kana || !english) {
            continue;
        }
        result.push({ kanji, kana, english });
    }

    return result;
}