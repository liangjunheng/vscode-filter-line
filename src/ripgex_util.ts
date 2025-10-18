import { rgPath } from "@vscode/ripgrep";
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as vscode from 'vscode';

export function checkRipgrep() {
    if (fs.existsSync(rgPath)) {
        return true;
    }
    return false;
}

export function searchByString(
    inputFilePath: string,
    outputFilePath: string,
    pattern: string,
    options: { inverseMatch: boolean, ingoreCase: boolean } = { inverseMatch: false, ingoreCase: false }
): Promise<Boolean> {
    if (!fs.existsSync(rgPath)) {
        vscode.window.showErrorMessage('ripgrep not found!');
        return Promise.resolve(false)
    }
    return new Promise<Boolean>((resolve) => {
        let args = [
            '-F', '-e', `"${pattern}"`,
            `"${inputFilePath}"`,
            '>', `"${outputFilePath}"`,
        ]
        if (options.ingoreCase) {
            args = ['-i', ...args]
        }
        if (options.inverseMatch) {
            args = ['-v', ...args]
        }
        const cmd = spawn(rgPath, args, { shell: true });
        cmd.stdout.on('data', data => {
            console.log(`stdout: ${data}`);
        });
        cmd.stderr.on('data', data => {
            console.error(`stderr: ${data}`);
        });
        cmd.on('close', code => {
            console.log(`ripgrep exited with code ${code}`);
        });
    });
}

export async function searchByRegex(
    inputFilePath: string,
    outputFilePath: string,
    pattern: string,
    options: { matchSelf: boolean, inverseMatch: boolean, ingoreCase: boolean } = { matchSelf: false, inverseMatch: false, ingoreCase: true }
): Promise<Boolean> {
    if (!fs.existsSync(rgPath)) {
        vscode.window.showErrorMessage('ripgrep not found!')
        return Promise.resolve(false)
    }
    return new Promise<Boolean>((resolve) => {
        let args = [
            '-e', `"${pattern}"`,
            `"${inputFilePath}"`,
            '>', `"${outputFilePath}"`,
        ]
        if (options.matchSelf) {
            args = ['-e', `"${escapeRegex(pattern)}"`, ...args]
        }
        if (options.ingoreCase) {
            args = ['-i', ...args]
        }
        if (options.inverseMatch) {
            args = ['-v', ...args]
        }
        console.log(`searchByRegex: ${rgPath} ${args.join(' ')}`);

        const cmd = spawn(`"${rgPath}"`, args, { shell: true });
        cmd.stdout.on('data', data => {
            console.log(`stdout: ${data}`);
            resolve(true)
        });
        cmd.stderr.on('data', data => {
            console.error(`stderr: ${data}`);
            resolve(false)
        });
        cmd.on('close', code => {
            console.log(`ripgrep exited with code ${code}`);
            if (code === 0) {
                resolve(true)
            } else {
                resolve(false)
            }
        });
    });
}

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
