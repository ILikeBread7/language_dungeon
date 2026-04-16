import { spawn } from 'node:child_process';
import { parseArgv } from './utils.js';
import fs from 'node:fs'

const paramsData = {
    languageFile: { longName: 'language-file', shortName: 'l', required: true, mapper: String },
    unidic: { longName: 'unidic', shortName: 'u' },
    allowUnknownWords: { longName: 'allow-unknown', shortName: 'a' },
    maxChunkSize: { longName: 'chunk-size', shortName: 's', mapper: Number },
    maxSentencesForWord: { longName: 'max-sentences', shortName: 'm', mapper: Number },
    exposeGc: { longName: 'expose-gc', shortName: 'g', managerOnly: true },
    subProcesses: { longName: 'sub-processes', shortName: 'p', default: 1, managerOnly: true, mapper: Number },
};
const params = parseArgv(process.argv, paramsData);
const files = params.files
    .map(filename => [ filename, fs.statSync(filename).size ])
    .sort(([,size1], [,size2]) => size2 - size1)
    .map(([ filename ]) => filename);

const childParams = Object.entries(paramsData)
    .filter(([ , paramData ]) => !paramData.managerOnly)
    .flatMap(([ paramName, paramData ]) => {
        let result = [];
        if (paramData.isSet) {
            result.push(`--${paramData.longName}`);

            if (paramData.mapper) {
                result.push(params[paramName]);
            }
        }
        return result;
    })
    .filter(Boolean);

childParams.unshift('example_sentences.js');
if (params.exposeGc) {
    childParams.unshift('--expose-gc');
}
childParams.push('--txt');
processFiles(files, childParams);

function processFiles(files, childParams) {
    let nextToProcessFileIndex = 0;
    for (let i = 0; i < params.subProcesses; i++) {
        processNextFile();
        nextToProcessFileIndex++;
    }
    
    function processNextFile() {
        const nextFile = files[nextToProcessFileIndex];
        if (!nextFile) {
            return;
        }
    
        console.log(`Running file in subprocess (${nextToProcessFileIndex + 1} / ${files.length}): ${nextFile}`);
        startSubProcess(nextFile, childParams)
            .then(() => {
                processNextFile();
                nextToProcessFileIndex++;
            });
    }
}

async function startSubProcess(file, childParams) {
    return new Promise(resolve => {
        const child = spawn('node', [ ...childParams, file ]);
        child.stderr.pipe(process.stdout);

        child.on('close', code => {
            console.log(`Child process for file ${file} exited with code ${code}`);
            resolve();
        });

        const inputStream = fs.createReadStream(params.languageFile, { encoding: 'utf8' });
        const outputStream = fs.createWriteStream(`/tmp/${getFileNameFromPath(file)}.processed.txt`);
        child.stdout.pipe(outputStream);
        inputStream.pipe(child.stdin);
    });
}

/**
 * 
 * @param {string} path 
 */
function getFileNameFromPath(path) {
    const lastSlashIndex = path.lastIndexOf('/');
    return path.substring(lastSlashIndex + 1);
}