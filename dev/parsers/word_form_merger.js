import fs from 'node:fs'


const WORDS_ARGS = [ '--words', '-w' ];
const MORPH_ARGS = [ '--morph', '-m' ];

const params = {
    wordsFile: '',
    morphFile: '',
    unknownArgument: false
};

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (WORDS_ARGS.includes(arg)) {
        params.wordsFile = args[i + 1];
        i++;
        continue;
    }
    if (MORPH_ARGS.includes(arg)) {
        params.morphFile = args[i + 1];
        i++;
        continue;
    }
    console.warn(`Unknown argument: ${arg}`);
    params.unknownArgument = true;
}

if (params.unknownArgument) {
    process.exit(0);
}

const words = fs.readFileSync(params.wordsFile, 'utf8').split('\n');
const morph = fs.readFileSync(params.morphFile, 'utf8').split('\n');
const morphMap = new Map();
morph.forEach(entry => {
    const [ base, derived ] = entry.split('\t');
    morphMap.set(base, base);
    morphMap.set(derived, base);
});

const wordsMap = new Map();
words.forEach(entry => {
    if (!entry) {
        return;
    }
    const split = entry.split(' ');
    const word = split[0];
    const frequency = Number(split[1]);
    const base = morphMap.get(word);
    if (!base) {
        console.warn(`Word: ${word} not in morph file!`);
        return;
    }
    addToMapList(wordsMap, base, word, frequency);
});

console.log(
    [...wordsMap.values()
        .map(entry => `${[...entry.words].join(',')} ${entry.frequency}`)
    ].join('\n')
);

function addToMapList(map, key, word, frequency) {
    const entry = map.get(key);
    if (entry) {
        entry.words.add(word);
        entry.frequency += frequency;
    } else {
        map.set(key, { words: new Set([ key, word ]), frequency });
    }
}