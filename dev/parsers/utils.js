/**
 * @typedef {{ longName: string, shortName: string, defaultValue: any, required: boolean, allowed: [*]. mapper: function(...string):void }} ParameterData
 * @typedef {Object.<string,ParameterData>} ParametersInput
 */

/**
 * 
 * @param {[string]} argv 
 * @param {ParametersInput} parameters 
 * @returns {Object.<string,*>} Parsed parameters
 */
export function parseArgv(argv, parameters) {
    let wrongArgument = false;
    const result = mapParamsToDefaultValues(parameters);
    const args = argv.slice(2);
    const paramEntries = Object.entries(parameters);

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--')) {
            const paramName = arg.substring(2);
            const param = paramEntries.find(([,paramData]) => paramData.longName === paramName);
            if (param) {
                i += callParamMapper(args, i, param, result);
            } else {
                console.warn(`Unknown argument: ${arg}`);
                wrongArgument = true;
            }
            continue;
        }
        
        if (arg.startsWith('-')) {
            const paramNames = arg.substring(1).split('');
            for (const paramName of paramNames) {
                const param = paramEntries.find(([,paramData]) => paramData.shortName === paramName);
                if (param) {
                    i += callParamMapper(args, i, param, result);
                } else {
                    console.warn(`Unknown argument: ${arg}`);
                    wrongArgument = true;
                }
            }
            continue;
        }

        result.files.push(arg);
    }

    for (const [ paramName, paramData ] of paramEntries) {
        if (paramData.required && !paramData.isSet) {
            console.warn(`Required parameter "${paramName}" has no value.`);
            wrongArgument = true;
        }

        if (paramData.allowed && !paramData.allowed.includes(result[paramName])) {
            console.warn(`Parameter "${paramName}" has a disallowed value "${result[paramName]}".`);
            wrongArgument = true;
        }
    }

    if (wrongArgument) {
        process.exit(0);
    }

    return result;
}

/**
 * 
 * @param {ParametersInput} parameters 
 * @returns {Object.<string,*>}
 */
function mapParamsToDefaultValues(parameters) {
    const result = { files: [] };
    for (const [ paramName, paramData ] of Object.entries(parameters)) {
        paramData.isSet = false;
        if (!paramData.required) {
            result[paramName] = paramData.defaultValue ?? false;
        }
    }
    return result;
}

/**
 * 
 * @param {[string, ParameterData]} param 
 * @param {number} paramIndex 
 * @param {[string]} args 
 * @returns {number} Consumed arguments number
 */
function callParamMapper(args, paramIndex, param, result) {
    const [ paramName, paramData ] = param;
    const mapper = paramData.mapper || (() => true);
    const mapperArgsLength = mapper.length;
    const paramArgsIndex = paramIndex + 1;
    result[paramName] = mapper(...args.slice(paramArgsIndex, paramArgsIndex + mapperArgsLength));
    paramData.isSet = true;
    return mapperArgsLength;
}