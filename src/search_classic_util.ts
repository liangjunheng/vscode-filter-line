import * as readline from 'readline';
import * as fs from 'fs';

// matchlines, fallback plan
type FilterLineOp = (line: string) => string | undefined;
function outputMatchLineByFs(inputPath: string, outputPath: string, onFilterLineOp: FilterLineOp): Promise<any> | any {
    return new Promise<Boolean>((resolve) => {
        // open write stream
        const writeStream = fs.createWriteStream(outputPath);
        // start match line
        writeStream.on('open', () => {
            console.log('write stream opened');
            // open read stream
            const readLineSteam = readline.createInterface({
                input: fs.createReadStream(inputPath)
            });
            // filter line by line
            readLineSteam.on('line', (line: string) => {
                // console.log('line ', line);
                let fixedline = onFilterLineOp(line);
                if (fixedline !== undefined) {
                    writeStream.write(fixedline + '\n');
                }
            }).on('close', () => {
                writeStream.end();
            });
        }).on('error', (e: Error) => {
            console.log('can not open write stream : ' + e);
            writeStream.destroy()
            resolve(false);
        }).on('close', () => {
            console.log('closed');
            resolve(true);
        });
    });
}

function searchStringByFs(
    inputPath: string,
    outputPath: string,
    pattern: string,
    options: {
        ignoreCaseMode: boolean,
        invertMatchMode: boolean,
    }
): Promise<any> | any {
    if (pattern === undefined) {
        return undefined;
    }
    let newPattern = options.ignoreCaseMode ? pattern.toLowerCase() : pattern
    const onFilterLineOp = (line: string) => {
        let newLine = options.ignoreCaseMode ? line.toLowerCase() : line
        if (options.invertMatchMode) {
            if (newLine.indexOf(newPattern) === -1) {
                return line;
            }
        } else {
            if (newLine.indexOf(newPattern) !== -1) {
                return line;
            }
        }
        return undefined
    }
    return outputMatchLineByFs(
        inputPath,
        outputPath,
        onFilterLineOp
    )
}

function searchRegexByFs(
    inputPath: string,
    outputPath: string,
    regex: string,
    options: {
        matchRegexSelf: boolean,
        ignoreCaseMode: boolean,
        invertMatchMode: boolean,
    }
): Promise<any> | any {
    if (regex === undefined) {
        return undefined;
    }

    // create regexp
    let regexp: RegExp
    try {
        regexp = options.ignoreCaseMode ? new RegExp(regex) : new RegExp(regex, 'i');
    } catch (error) {
        return undefined
    }

    const onFilterLineOp = (line: string) => {
        if(options.invertMatchMode){
            // string match
            if(options.matchRegexSelf && line.indexOf(regex) !== -1){
                // matched, return null
                return undefined;
            }
            // regex match
            regexp.lastIndex = 0;
            if(!regexp.test(line)){
                return line;
            }
        }else{
            // string match
            if(options.matchRegexSelf && line.indexOf(regex) !== -1){
                return line;
            }
            // regex match
            regexp.lastIndex = 0;
            if(regexp.test(line)){
                return line;
            }
        }
        return undefined
    }
    return outputMatchLineByFs(
        inputPath,
        outputPath,
        onFilterLineOp
    )
}

export function checkRegexByFs(pattern: string): Boolean {
    try {
        new RegExp(pattern);
        return true;
    } catch (e) {
        return false;
    }
}

export function searchByFs(
    inputPath: string,
    outputPath: string,
    pattern: string,
    options: {
        regexMode: boolean,
        matchRegexSelf: boolean,
        ignoreCaseMode: boolean,
        invertMatchMode: boolean,
    }
): Promise<any> | any {
    if (options.regexMode) {
        return searchRegexByFs(
            inputPath,
            outputPath,
            pattern,
            {
                matchRegexSelf: options.matchRegexSelf,
                ignoreCaseMode: options.ignoreCaseMode,
                invertMatchMode: options.invertMatchMode,
            }
        );
    } else {
        return searchStringByFs(
            inputPath,
            outputPath,
            pattern,
            {
                ignoreCaseMode: options.ignoreCaseMode,
                invertMatchMode: options.invertMatchMode,
            }
        );
    }
}