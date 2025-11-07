import { spawnSync, SpawnSyncReturns } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as vscode from 'vscode';
import { createCachePatternFileUri, deleteCachePatternFileUri } from './file_manager';
import { escapePath } from './util';
import path = require('path');


/**
 * ripgrep path
 */
let ripgrepExecPath: string = path.join(vscode.env.appRoot, 'node_modules', '@vscode', 'ripgrep', 'bin', process.platform === 'win32' ? 'rg.exe' : 'rg')
if(!fs.existsSync(ripgrepExecPath)) {
    ripgrepExecPath = process.platform === 'win32' ? 'rg.exe' : 'rg'
}

// tip: Ripgrep is not installed
let isAlreadyTip = false 
async function tipRipgrepNotInstall() {
    if (!isAlreadyTip) {
        vscode.window.showWarningMessage(
            'Ripgrep is not installed. See the README.md for installation instructions.',
            'Open README'
        ).then(selection => {
            if (selection === 'Open README') {
                // 用默认浏览器打开链接
                vscode.env.openExternal(
                    vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=liangjunheng.filter-line-pro')
                );
            }
        });
        isAlreadyTip = true
    }
}

/**
 * Check if the ripgrep is available
 * 
*/
export function checkRipgrepExec() {
    if (spawnSync(ripgrepExecPath, ['--version'])?.stderr?.length === 0) {
        return true;
    }
    tipRipgrepNotInstall()
    return false;
}

function ripgrep(args: string[]): SpawnSyncReturns<Buffer> {
    let commonArgs = ['--pcre2', ...args];
    const rgPath = ripgrepExecPath;
    console.log(`########################### ripgrep command start ################################`);
    console.log(`ripgrep start, ripgrep command: ${rgPath} ${commonArgs.join(' ')}`);
    console.log(`############################ ripgrep command end #################################`);
    const result = spawnSync(escapePath(rgPath), commonArgs, { shell: true });
    console.log(`ripgrep end, status: ${result.status}, stderr: ${result.stderr}`);
    return result;
}

function isValidRegex(pattern: string) {
    const args = [pattern];
    const commonArgs = ['--pcre2', '--quiet', ...args];
    const result = spawnSync(ripgrepExecPath, commonArgs, { encoding: 'utf-8' });
    console.log(`isValidRegex: ${result.stderr.length === 0}, pattern: ${pattern}, status: ${result.status}, stderr: ${result.stderr}`);
    if (result.stderr.length === 0) {
        return true;
    } else {
        return false;
    }
}

// function buildRegexWithCmd(pattern: string): string {
//     return escapeCmd(pattern);
// }

// function buildRegexSelfWithCmd(pattern: string): string {
//     let matchSelfRegex = escapeRegex(pattern.replace(/\\"/g, '\\\\\"'));
//     matchSelfRegex = escapeCmd(matchSelfRegex);
//     return matchSelfRegex
// }

// function escapeCmd(str: string): string {
//     return str.replace(/["]/g, '\\$&');
// }

/**
 * escape Regex
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function ceatePatternFile(pattern: string, needMatchPatternSelf: boolean = false): string {
    const patternFilePath = createCachePatternFileUri("pattern.txt");

    let isPatternValid = false
    if(isValidRegex(pattern)) {
        fs.writeFileSync(patternFilePath, pattern, { encoding: "utf8", flag: 'a' });
        isPatternValid = true;
    }

    const escapePattern = escapeRegex(pattern);
    if (needMatchPatternSelf && escapePattern !== '') {
        fs.writeFileSync(patternFilePath, `${ isPatternValid ? os.EOL : '' }${escapePattern}`, { encoding: "utf8", flag: 'a' });
    }
    return patternFilePath
}

/**
 * Check if the regex is available
 * @param pattern regex string
 * @param options 
 * @returns 
 */
export function checkRegexByRipgrep(
    pattern: string,
    options: { matchSelf: boolean } = { matchSelf: false }
): Boolean {
    if (options.matchSelf) {
        return true
    }
    if (isValidRegex(pattern)) {
        return true;
    }
    return false;
}

/***
 * 
*/
export function searchByRipgrep(
    inputFilePath: string,
    outputFilePath: string,
    pattern: string,
    options: {
        regexMode: boolean,
        matchRegexSelf: boolean,
        invertMatchMode: boolean,
        ignoreCaseMode: boolean,
        showFilename: boolean,
        contextLineCount: number,
    } = {
            regexMode: false,
            ignoreCaseMode: false,
            invertMatchMode: false,
            matchRegexSelf: false,
            showFilename: false,
            contextLineCount: 0,
        },
): SpawnSyncReturns<Buffer> {
    const startMillis = Date.now()
    // build args
    let args = [
        escapePath(inputFilePath),
        '>', escapePath(outputFilePath),
    ]
    const patternFilePath = ceatePatternFile(pattern, options.matchRegexSelf);
    args = ['-f', escapePath(patternFilePath), ...args];
    console.log(`searchByRipgrep=>ceatePatternFile=>spend: ${ Date.now() - startMillis}`);
    
    // ignorecase
    if (options.ignoreCaseMode) {
        args = ['--ignore-case', ...args];
    }
    // inverse match
    if (options.invertMatchMode) {
        args = ['--invert-match', ...args];
    }
    if (!options.regexMode) {
        args = ['--fixed-strings', ...args]
    }
    if(options.showFilename && fs.existsSync(inputFilePath) && fs.statSync(inputFilePath).isDirectory()) {
        args = ['--heading', ...args]
    } else {
        args = ['--no-filename', ...args]
    }
    if(options.contextLineCount > 0) {
        args = [`--context ${options.contextLineCount}`, ...args]
    }
    if(pattern.includes('(?s)')) {
        args = ['--multiline', ...args]
    }
    const result = ripgrep(args);
    deleteCachePatternFileUri(patternFilePath)
    console.log(`searchByRipgrep=>ripgrep=>end=>spend: ${ Date.now() - startMillis}`);
    console.log(`searchByRegex, cmd-output: ${result.status}`);
    return result;
}
