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
    const rgPath = getRipGrepPath()
    console.log(`ripgrep start: ${rgPath} ${args.join(' ')}`);
    const result = spawnSync(escapePath(rgPath), args, { shell: true });
    console.log(`ripgrep end, status: ${result.status}, stderr: ${result.stderr}`);
    return result;
}

/**
 * 
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapePath(path: string): string {
    if (process.platform === 'win32') {
        // Windows CMD & PowerShell
        return JSON.stringify(path);
    } else {
        // Linux/macOS Bash
        return `'${path}'`;
    }
}

// function escapeCmd(str: string): string {
//     return str.replace(/["]/g, '\\$&');
// }

function isValidRegex(pattern: string) {
    const result = spawnSync(getRipGrepPath(), [pattern, '--quiet'], {
        encoding: 'utf-8'
    });
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
    options: { inverseMatch: boolean, ingoreCase: boolean } = { inverseMatch: false, ingoreCase: false }
): SpawnSyncReturns<Buffer> {
    let args = [
        '--no-filename',
        escapePath(inputFilePath),
        '>', escapePath(outputFilePath),
    ]
    const patternFilePath = ceatePatternFile(pattern);
    args = ['--fixed-strings', '-f', escapePath(patternFilePath), ...args];

    if (options.ingoreCase) {
        args = ['-i', ...args]
    }
    if (options.inverseMatch) {
        args = ['-v', ...args]
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
    options: { matchSelf: boolean, inverseMatch: boolean, ingoreCase: boolean } = { matchSelf: false, inverseMatch: false, ingoreCase: true }
): SpawnSyncReturns<Buffer> {
    // build args
    let args = [
        '--no-filename',
        escapePath(inputFilePath),
        '>', escapePath(outputFilePath),
    ]
    const patternFilePath = ceatePatternFile(pattern, options.matchSelf);
    args = ['-f', escapePath(patternFilePath), ...args];

    // ignorecase
    if (options.ingoreCase) {
        args = ['-i', ...args];
    }
    // inverse match
    if (options.inverseMatch) {
        args = ['-v', ...args];
    }
    const result = ripgrep(args);
    deleteCachePatternFileUri(patternFilePath)
    console.log(`searchByRegex, cmd-output: ${result.status}`);
    return result;
}
