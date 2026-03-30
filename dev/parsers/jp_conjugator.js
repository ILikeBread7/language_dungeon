import * as codec from 'kamiya-codec';
import fs from 'node:fs';

const TYPE = Object.freeze({
    UNKNOWN: 0,
    ICHIDAN_VERB: 1,
    I_ADJECTIVE: 2,
    NA_ADJECTIVE: 3,
    NOUN: 4,
    GODAN_VERB: 5,
    SURU_VERB: 6,
    KURU_VERB: 7
});

const dict = JSON.parse(fs.readFileSync('dicts/JMdict_e.json', 'utf8'));
const dictMap = new Map(
    dict.JMdict.entry.flatMap(word => {
        const kanjiAndReadings = [ word['k_ele'], word['r_ele'] ].filter(Boolean);
        return kanjiAndReadings.flatMap(element => {
            const elements = elementToArray(element);
            const types = elementToArray(word['sense']).flatMap(senses => elementToArray(senses).flatMap(sense => elementToArray(sense.pos).map(descriptionToType)));
            return elements.map(element => [ element['keb'] || element['reb'], [...new Set(types)].filter(Boolean) ]);
        });
    })
    .filter(Boolean)
);
dictMap.set('する', [ TYPE.SURU_VERB ]);
dictMap.set('くる', [ TYPE.KURU_VERB ]);
dictMap.set('来る', [ TYPE.KURU_VERB ]);

['悲しい', '綺麗', '変える', '帰る', '選択', 'ああ', 'する', 'くる', '来る'].forEach(word => {
    console.log(word);
    const types = dictMap.get(word) || [];
    types.forEach(type => {
        console.log(type);
        if ([TYPE.I_ADJECTIVE, TYPE.NA_ADJECTIVE].includes(type)) {
            console.log(
                codec.adjConjugations.map(conjugation => codec.adjConjugate(word, conjugation, type === TYPE.I_ADJECTIVE))
            );
        }

        if ([TYPE.GODAN_VERB, TYPE.ICHIDAN_VERB, TYPE.SURU_VERB, TYPE.KURU_VERB].includes(type)) {
            console.log(
                codec.conjugations.map(conjugation => codec.conjugate(word, conjugation, type === TYPE.ICHIDAN_VERB))
            );
        }
    });
})


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