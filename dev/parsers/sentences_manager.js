import { spawn } from 'node:child_process';
import { parseArgv } from './utils.js';
import fs from 'node:fs'

const FORMATS = Object.freeze({
    TEST: 'test',
    JSON: 'json',
    TXT: 'txt'
});
const paramsData = {
    languageFile: { longName: 'language-file', shortName: 'l', required: true, mapper: String },
    particlesFile: { longName: 'particles-file', shortName: 'r', mapper: String },
    unidic: { longName: 'unidic', shortName: 'u' },
    allowUnknownWords: { longName: 'allow-unknown', shortName: 'a' },
    maxChunkSize: { longName: 'chunk-size', shortName: 's', mapper: Number },
    maxSentencesForWord: { longName: 'max-sentences', shortName: 'm', mapper: Number },
    prod: { longName: 'prod', shortName: 'p', managerOnly: true },
    exposeGc: { longName: 'expose-gc', shortName: 'g', managerOnly: true },
    subProcesses: { longName: 'sub-processes', shortName: 'b', default: 1, managerOnly: true, mapper: Number },
    format: { longName: 'format', shortName: 'f', default: FORMATS.TEST, managerOnly: true, allowed: Object.values(FORMATS), mapper: String },
    json: { longName: 'json', shortName: 'j', managerOnly: true },
    txt: { longName: 'txt', shortName: 't', managerOnly: true },
    skipMerge: { longName: 'skip-merge', shortName: 'k', managerOnly: true }
};
const params = parseArgv(process.argv, paramsData);
if (params.json) {
    params.format = FORMATS.JSON;
}
if (params.txt) {
    params.format = FORMATS.TXT;
}

const debugLog = (params.format === FORMATS.JSON || params.format === FORMATS.TXT)
    ? console.warn
    : console.debug;

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
processFiles(files, childParams);

function processFiles(files, childParams) {
    let nextToProcessFileIndex = 0;
    let processedFilesNumber = 0;
    for (let i = 0; i < params.subProcesses; i++) {
        processNextFile();
        nextToProcessFileIndex++;
    }
    
    function processNextFile() {
        const nextFile = files[nextToProcessFileIndex];
        if (!nextFile) {
            if (params.skipMerge) {
                debugLog('Skipping merge...')
                return;
            }
            if (processedFilesNumber >= files.length) {
                const processedFiles = files.map(getProcessedFilePath);
                debugLog(`Merging files: ${filesListToQuoted(processedFiles)}`);
                startMergingSubProcess(processedFiles, childParams);
            }
            return;
        }
    
        debugLog(`Running file in subprocess (${nextToProcessFileIndex + 1} / ${files.length}): ${nextFile}`);
        startSubProcess(nextFile, childParams)
            .then(() => {
                processedFilesNumber++;
                processNextFile();
                nextToProcessFileIndex++;
            });
    }
}

async function startSubProcess(file, childParams) {
    return new Promise(resolve => {
        const child = spawn('node', [ ...childParams, `--${paramsData.txt.longName}`, file ]);
        child.stderr.pipe(process.stderr);

        child.on('close', code => {
            debugLog(`Child process for file: "${file}" exited with code: ${code}`);
            resolve();
        });

        const inputStream = fs.createReadStream(params.languageFile, { encoding: 'utf8' });
        const outputStream = fs.createWriteStream(`/tmp/${getFileNameFromPath(file)}.processed.txt`);
        child.stdout.pipe(outputStream);
        inputStream.pipe(child.stdin);
    });
}

async function startMergingSubProcess(processedFiles, childParams) {
    return new Promise(resolve => {
        const child = spawn('node', [ ...childParams, `--${paramsData.format.longName}`, params.format, ...processedFiles ]);
        child.stderr.pipe(process.stderr);

        child.on('close', code => {
            debugLog(`Child process for merging files: ${filesListToQuoted(processedFiles)} exited with code: ${code}`);
            resolve();
        });

        const inputStream = fs.createReadStream(params.languageFile, { encoding: 'utf8' });
        child.stdout.pipe(process.stdout);
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

/**
 * 
 * @param {string} originalPath 
 */
function getProcessedFilePath(originalPath) {
    return `/tmp/${getFileNameFromPath(originalPath)}.processed.txt`;
}

/**
 * 
 * @param {[string]} files 
 */
function filesListToQuoted(files) {
    return `${files.map(file => `"${file}"`).join(', ')}`;
}