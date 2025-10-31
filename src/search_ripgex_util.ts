import { spawnSync, SpawnSyncReturns } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import { createCachePatternFileUri, deleteCachePatternFileUri } from './file_manager';

/**
 * 
 */
let ripgrepPath = path.join(
    vscode.env.appRoot,
    'node_modules',
    '@vscode',
    'ripgrep',
    'bin',
    process.platform === 'win32' ? 'rg.exe' : 'rg'
);
if(vscode.workspace.getConfiguration('filter-line').get('ripgrepPath', '') === '') {
    vscode.workspace.getConfiguration('filter-line').update('ripgrepPath', ripgrepPath, vscode.ConfigurationTarget.Global)
}
function getRipGrepPath(): string {
    if (fs.existsSync(ripgrepPath)) {
        return ripgrepPath;
    }
    ripgrepPath = vscode.workspace.getConfiguration('filter-line').get('ripgrepPath', ripgrepPath);
    return ripgrepPath;
}

function ripgrep(args: string[]): SpawnSyncReturns<Buffer> {
    let commonArgs = ['--pcre2', ...args];
    const rgPath = getRipGrepPath();
    console.log(`ripgrep start: ${rgPath} ${commonArgs.join(' ')}`);
    const result = spawnSync(escapePath(rgPath), commonArgs, { shell: true });
    console.log(`ripgrep end, status: ${result.status}, stderr: ${result.stderr}`);
    return result;
}

function isValidRegex(pattern: string) {
    const args = [pattern];
    const commonArgs = ['--pcre2', '--quiet', ...args];
    const result = spawnSync(getRipGrepPath(), commonArgs, { encoding: 'utf-8' });
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

/**
 * escape Path 
 */
function escapePath(path: string): string {
    if (process.platform === 'win32') {
        // Windows CMD & PowerShell
        return JSON.stringify(path);
    } else {
        // Linux/macOS Bash
        return `'${path}'`;
    }
}

function ceatePatternFile(pattern: string, needMatchPatternSelf: boolean = false): string {
    const patternFilePath = createCachePatternFileUri("pattern.txt");

    let isPatternValid = false
    if(isValidRegex(pattern)) {
        fs.writeFileSync(patternFilePath, pattern, { encoding: "utf8", flag: 'a' });
        isPatternValid = true;
    }

    if (needMatchPatternSelf && isValidRegex(escapeRegex(pattern))) {
        fs.writeFileSync(patternFilePath, `${ isPatternValid ? os.EOL : '' }${escapeRegex(pattern)}`, { encoding: "utf8", flag: 'a' });
    }
    return patternFilePath
}

/**
 * Check if the ripgrep is available
 * 
*/
export function checkRipgrep() {
    if (fs.existsSync(getRipGrepPath())) {
        return true;
    }
    return false;
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
    if (isValidRegex(pattern)) {
        return true;
    }
    if (options.matchSelf && isValidRegex(escapeRegex(pattern))) {
        return true
    }
    return false;
}

/**
 * 
*/
export function searchStringByRipgrep(
    inputFilePath: string,
    outputFilePath: string,
    pattern: string,
    options: { 
        invertMatchMode: boolean,
        ignoreCaseMode: boolean,
        showFilename: boolean,
    }
): SpawnSyncReturns<Buffer> {
    let args = [
        escapePath(inputFilePath),
        '>', escapePath(outputFilePath),
    ]
    const patternFilePath = ceatePatternFile(pattern);
    args = ['--fixed-strings', '-f', escapePath(patternFilePath), ...args];

    if (options.ignoreCaseMode) {
        args = ['--ignore-case', ...args]
    }
    if (options.invertMatchMode) {
        args = ['--invert-match', ...args]
    }
    if(options.showFilename && fs.existsSync(inputFilePath) && fs.statSync(inputFilePath).isDirectory()) {
        args = ['--heading', ...args]
    } else {
        args = ['--no-filename', ...args]
    }
    const result = ripgrep(args);
    deleteCachePatternFileUri(patternFilePath)
    console.log(`searchByString, cmd-output: ${result.status}`);
    return result;
}

/***
 * 
*/
export function searchRegexByRipgrep(
    inputFilePath: string,
    outputFilePath: string,
    pattern: string,
    options: { 
        matchRegexSelf: boolean,
        invertMatchMode: boolean,
        ignoreCaseMode: boolean,
        showFilename: boolean,
    }
): SpawnSyncReturns<Buffer> {
    // build args
    let args = [
        escapePath(inputFilePath),
        '>', escapePath(outputFilePath),
    ]
    const patternFilePath = ceatePatternFile(pattern, options.matchRegexSelf);
    args = ['-f', escapePath(patternFilePath), ...args];

    // ignorecase
    if (options.ignoreCaseMode) {
        args = ['--ignore-case', ...args];
    }
    // inverse match
    if (options.invertMatchMode) {
        args = ['--invert-match', ...args];
    }
    if(options.showFilename && fs.existsSync(inputFilePath) && fs.statSync(inputFilePath).isDirectory()) {
        args = ['--heading', ...args]
    } else {
        args = ['--no-filename', ...args]
    }
    const result = ripgrep(args);
    deleteCachePatternFileUri(patternFilePath)
    console.log(`searchByRegex, cmd-output: ${result.status}`);
    return result;
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
    // build args
    let args = [
        escapePath(inputFilePath),
        '>', escapePath(outputFilePath),
    ]
    const patternFilePath = ceatePatternFile(pattern, options.matchRegexSelf);
    args = ['-f', escapePath(patternFilePath), ...args];

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
        args = [`-C ${options.contextLineCount}`, ...args]
    }
    const result = ripgrep(args);
    deleteCachePatternFileUri(patternFilePath)
    console.log(`searchByRegex, cmd-output: ${result.status}`);
    return result;
}
