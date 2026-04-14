import { parseArgv } from './utils.js';

const params = parseArgv(process.argv, {
    test1: { longName: 'test1', shortName: '1', defaultValue: 0, mapper: Number },
    test2: { longName: 'test2', shortName: '2', defaultValue: 0, mapper: (a, b) => Number(a) + Number(b)},
    test3: { shortName: '3' },
    test4: { shortName: '4' },
    test5: { longName: 'test5', shortName: '5' },
    test6: { longName: 'test6', shortName: '6', required: true, mapper: String }
});

Object.entries(params).forEach(([ key, value ]) => console.log(key, value));