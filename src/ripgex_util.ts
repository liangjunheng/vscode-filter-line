import { spawnSync, SpawnSyncReturns } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ctx } from './extension';

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
    const result = spawnSync(JSON.stringify(rgPath), args, { shell: true });
    console.log(`ripgrep end, status: ${result.status}, stderr: ${result.stderr}`);
    return result;
}

/**
 * 
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeCmd(str: string): string {
    return str.replace(/["]/g, '\\$&');
}

function isValidRegex(pattern: string) {
    let args = [
        '-e', `"${pattern}"`,
        '--no-filename',
        JSON.stringify(path.join(ctx.extensionPath,'asset','ripgrep_regex_test.txt')),
        '>', JSON.stringify(path.join(ctx.extensionPath,'asset','ripgrep_regex_test_result.txt')),
    ]
    const result = ripgrep(args);
    console.log(`isValidRegex: ${result.status === 2 ? false : true}, "${pattern}"`)
    if(result.status === 2) {
        return false;
    } else {
        return true;
    }
}

function buildRegexWithCmd(pattern: string): string {
    return escapeCmd(pattern);
}

function buildRegexSelfWithCmd(pattern: string): string {
    let matchSelfRegex = escapeRegex(pattern.replace(/\\"/g, '\\\\\"'));
    matchSelfRegex = escapeCmd(matchSelfRegex);
    return matchSelfRegex
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
    if (isValidRegex(buildRegexWithCmd(pattern))) {
        return true;
    }
    if (options.matchSelf && isValidRegex(buildRegexSelfWithCmd(pattern))) {
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
        '-F', '-e', `"${buildRegexWithCmd(pattern)}"`,
        '--no-filename',
        JSON.stringify(inputFilePath),
        '>', JSON.stringify(outputFilePath),
    ]
    if (options.ingoreCase) {
        args = ['-i', ...args]
    }
    if (options.inverseMatch) {
        args = ['-v', ...args]
    }
    const result = ripgrep(args);
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
        JSON.stringify(inputFilePath),
        '>', JSON.stringify(outputFilePath),
    ]
    // pattern regex
    const patternRegex = buildRegexWithCmd(pattern);
    if (isValidRegex(patternRegex)) {
        args = ['-e', `"${patternRegex}"`, ...args];
    }
    // match pattern self
    if (options.matchSelf) {
        const matchSelfRegex = buildRegexSelfWithCmd(pattern);
        if (isValidRegex(matchSelfRegex)) {
            args = ['-e', `"${matchSelfRegex}"`, ...args];
        }
    }
    // ignorecase
    if (options.ingoreCase) {
        args = ['-i', ...args];
    }
    // inverse match
    if (options.inverseMatch) {
        args = ['-v', ...args];
    }
    const result = ripgrep(args);
    console.log(`searchByRegex, cmd-output: ${result.status}`);
    return result;
}
