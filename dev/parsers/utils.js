/**
 * @typedef {{ longName: string, shortName: string, defaultValue: any, mapper: function(...string):void }} ParameterData
 * @typedef {Object.<string,ParameterData>} ParametersInput
 */

/**
 * 
 * @param {[string]} argv 
 * @param {ParametersInput} parameters 
 * @returns {Object.<string,*>} Parsed parameters
 */
export function parseArgv(argv, parameters) {
    let unknownArgument = false;
    const result = mapParamsToDefaultValues(parameters);
    const args = argv.slice(2);

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--')) {
            const paramName = arg.substring(2);
            const param = Object.entries(parameters).find(([,paramData]) => paramData.longName === paramName);
            if (param) {
                i += callParamMapper(args, i, param, result);
            } else {
                console.warn(`Unknown argument: ${arg}`);
                unknownArgument = true;
            }
            continue;
        }
        
        if (arg.startsWith('-')) {
            const paramNames = arg.substring(1).split('');
            for (const paramName of paramNames) {
                const param = Object.entries(parameters).find(([,paramData]) => paramData.shortName === paramName);
                if (param) {
                    i += callParamMapper(args, i, param, result);
                } else {
                    console.warn(`Unknown argument: ${arg}`);
                    unknownArgument = true;
                }
            }
            continue;
        }

        result.files.push(arg);
    }

    if (unknownArgument) {
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
    for (const [ key, value ] of Object.entries(parameters)) {
        result[key] = value.defaultValue ?? false;
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
    return mapperArgsLength;
}