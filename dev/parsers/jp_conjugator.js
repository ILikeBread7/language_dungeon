import * as codec from 'kamiya-codec';
import fs from 'node:fs';

const TYPE = Object.freeze({
    UNKNOWN: -1,
    ICHIDAN_VERB: 1,
    I_ADJECTIVE: 2,
    NA_ADJECTIVE: 3,
    NOUN: 4,
    GODAN_VERB: 5,
    SURU_VERB: 6,
    KURU_VERB: 7
});

const dict = JSON.parse(fs.readFileSync('dicts/JMdict_e.json', 'utf8'));
const dictMap = new Map();
dict.JMdict.entry.forEach(entry => {
    const kanjiAndReadings = [ entry['k_ele'], entry['r_ele'] ].filter(Boolean);
    kanjiAndReadings.forEach(element => {
        const elements = elementToArray(element);
        const types = elementToArray(entry['sense']).flatMap(senses => elementToArray(senses).flatMap(sense => elementToArray(sense.pos).map(descriptionToType)));
        elements.forEach(element => {
            const word = element['keb'] || element['reb'];
            const mapEntry = dictMap.get(word) || [];
            dictMap.set(word,  [...new Set([ ...mapEntry, ...types ]) ]);
        });
    })
});

const auxiliariesArrays = [ [], ...codec.auxiliaries.map(auxiliary => [ auxiliary ]) ];

const jlpt = JSON.parse(fs.readFileSync('dicts/jlpt.json', 'utf8'));
[ ...new Set(
    jlpt
        .flatMap(({ kanji, kana }) => [ kanji, kana ])
        .filter(Boolean)
    )
].forEach(word => console.log(conjugateWord(word).join(',')));

// ['悲しい', '綺麗', '変える', '帰る', '選択', 'ああ', 'する', 'くる', '来る'].forEach(word => console.log(conjugateWord(word).join(',')));

function conjugateWord(word) {
    let types = dictMap.get(word);
    if (!types) {
        if (word.endsWith('する')) {
            types = [ TYPE.SURU_VERB ];
        } else if (word.endsWith('くる') || word.endsWith('来る')) {
            types = [ TYPE.KURU_VERB ];
        } else {
            types = [];
        }
    }
    const conjugations = types.map(type => {
        if ([ TYPE.I_ADJECTIVE, TYPE.NA_ADJECTIVE ].includes(type)) {
            return codec.adjConjugations.map(conjugation => codec.adjConjugate(word, conjugation, type === TYPE.I_ADJECTIVE))
        }

        if ([ TYPE.GODAN_VERB, TYPE.ICHIDAN_VERB ].includes(type)) {
            return auxiliariesArrays
                .flatMap(auxiliaryArray => codec.conjugations
                    .flatMap(conjugation => {
                        try {
                            return codec.conjugateAuxiliaries(word, auxiliaryArray, conjugation, type === TYPE.ICHIDAN_VERB);
                        } catch (error) {
                            return;
                        }
                    }
                ).filter(Boolean)
            );
        }

        if ([ TYPE.SURU_VERB, TYPE.KURU_VERB ].includes(type)) {
            const suffixLength = 2;
            const baseWord = word.substring(0, word.length - suffixLength);
            const suffix = word.substring(word.length - suffixLength, word.length);
            return auxiliariesArrays
                .flatMap(auxiliaryArray => codec.conjugations
                    .flatMap(conjugation => {
                        try {
                            return codec
                                .conjugateAuxiliaries(suffix, auxiliaryArray, conjugation)
                                .map(conjugatedSuffix => baseWord + conjugatedSuffix);
                        } catch (error) {
                            return;
                        }
                    }
                ).filter(Boolean)
            );
        }

        return [];
    }).flat(Number.MAX_SAFE_INTEGER);
    return [ ...new Set([ word, ...conjugations ]) ];
}


// console.log(
//     [...new Set(codec.conjugations.flatMap(conjugation => codec.conjugate('書く', conjugation)))].sort((a, b) => b.length - a.length).join('\n')
// );
// console.log(
//     [...new Set(codec.adjConjugations.flatMap(conjugation => codec.adjConjugate('新しい', conjugation, true)))].sort((a, b) => b.length - a.length).join('\n')
// );
// console.log(
//     [...new Set(codec.adjConjugations.flatMap(conjugation => codec.adjConjugate('綺麗', conjugation, false)))].sort((a, b) => b.length - a.length).join('\n')
// );

function descriptionToType(description) {
    description = description.toLowerCase();
    
    if (description.includes('noun (common) (futsuumeishi)')) {
        return TYPE.NOUN;
    }

    if (description.includes('adjective (keiyoushi)')) {
        return TYPE.I_ADJECTIVE;
    }

    if (description.includes('adjectival nouns or quasi-adjectives (keiyodoshi)')) {
        return TYPE.NA_ADJECTIVE;
    }

    if (description.includes('suru verb')) {
        return TYPE.SURU_VERB;
    }

    if (description.includes('kuru verb')) {
        return TYPE.KURU_VERB;
    }

    if (description.includes('ichidan verb')) {
        return TYPE.ICHIDAN_VERB;
    }

    if (description.includes('godan verb')) {
        return TYPE.GODAN_VERB;
    }

    return TYPE.UNKNOWN;
}

function elementToArray(element) {
    if (Array.isArray(element)) {
        return element;
    }

    return [ element ];
}