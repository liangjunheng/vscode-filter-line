import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

let ripgrepPath = path.join(
    vscode.env.appRoot,
    'node_modules',
    '@vscode',
    'ripgrep',
    'bin',
    process.platform === 'win32' ? 'rg.exe' : 'rg'
);
function getRipGrepPath(): string {
    if (fs.existsSync(ripgrepPath)) {
        return ripgrepPath;
    }
    ripgrepPath = vscode.workspace.getConfiguration('filter-line').get('ripgrepPath', ripgrepPath);
    return ripgrepPath;
}

export function checkRipgrep() {
    if (fs.existsSync(getRipGrepPath())) {
        return true;
    }
    return false;
}

export function searchByString(
    inputFilePath: string,
    outputFilePath: string,
    pattern: string,
    options: { inverseMatch: boolean, ingoreCase: boolean } = { inverseMatch: false, ingoreCase: false }
): Boolean {
    const rgPath = getRipGrepPath()
    if (!fs.existsSync(rgPath)) {
        vscode.window.showErrorMessage('ripgrep not found!');
        return false;
    }
    let args = [
        '-F', '-e', JSON.stringify(pattern),
        JSON.stringify(inputFilePath),
        '>', JSON.stringify(outputFilePath),
    ]
    if (options.ingoreCase) {
        args = ['-i', ...args]
    }
    if (options.inverseMatch) {
        args = ['-v', ...args]
    }
    console.log(`searchByString: ${rgPath} ${args.join(' ')}`);
    const result = spawnSync(JSON.stringify(rgPath), args, { shell: true });
    console.log(`searchByString, cmd-output: ${result}`);
    if (result.error) {
        return false;
    } else {
        return true;
    }
}

export function searchByRegex(
    inputFilePath: string,
    outputFilePath: string,
    pattern: string,
    options: { matchSelf: boolean, inverseMatch: boolean, ingoreCase: boolean } = { matchSelf: false, inverseMatch: false, ingoreCase: true }
): Boolean {
    const rgPath = getRipGrepPath()
    if (!fs.existsSync(rgPath)) {
        vscode.window.showErrorMessage('ripgrep not found!')
        return false;
    }
    let args = [
        '-e', JSON.stringify(pattern),
        JSON.stringify(inputFilePath),
        '>', JSON.stringify(outputFilePath),
    ]
    if (options.matchSelf) {
        args = ['-e', `"${escapeRegex(pattern)}"`, ...args];
    }
    if (options.ingoreCase) {
        args = ['-i', ...args];
    }
    if (options.inverseMatch) {
        args = ['-v', ...args];
    }
    console.log(`searchByRegex: ${rgPath} ${args.join(' ')}`);
    const result = spawnSync(JSON.stringify(rgPath), args, { shell: true });
    console.log(`searchByRegex, cmd-output: ${result}`);
    if (result.error) {
        return false;
    } else {
        return true;
    }
}

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
