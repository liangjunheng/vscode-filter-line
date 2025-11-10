'use strict';

import * as v8 from 'v8';
import * as fs from 'fs';
import * as os from 'os';
import * as vscode from 'vscode';

async function copySelectionText() {
    const startMillis = Date.now();
    await vscode.commands.executeCommand('editor.action.clipboardCopyAction');
    const clipboardText = await vscode.env.clipboard.readText();
    console.log(`copySelectionText, spend: ${Date.now() - startMillis}, text: ${clipboardText}`);
    return clipboardText
}

async function copyCurrentLine(needSelection: boolean = true) {
    const startMillis = Date.now();
    await vscode.commands.executeCommand('cancelSelection');
    await vscode.commands.executeCommand('editor.action.clipboardCopyAction');
    if(needSelection) {
        await vscode.commands.executeCommand('cursorEnd');
        await vscode.commands.executeCommand('cursorHomeSelect');
    }
    const clipboardText = (await vscode.env.clipboard.readText()).replace(/(\r?\n)$/, '');
    console.log(`copyCurrentLine, spend: ${Date.now() - startMillis}, text: ${clipboardText}`);
    return clipboardText
}

function padWithBlank(str: string, length: number) {
    if (str.length > length) {
        return str;
    }
    let pad: string = '';
    for (let i = 0; i < length - str.length; i++) {
        pad += ' ';
    }

    return pad + str;
}

function readJsonFile(filePath: string): any | undefined {
    var fs = require('fs');
    var content = fs.readFileSync(filePath);
    // console.log('content : ' + content);
    if (!content) {
        return undefined;
    }
    try {
        var json = JSON.parse(content);
        return json;
    } catch (e) {
        console.log('json parse error : ' + e);
    }
    return undefined;
}

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
    let timer: NodeJS.Timeout | undefined;
    return (...args: Parameters<T>) => {
        if (timer) {
            clearTimeout(timer);
        }
        timer = setTimeout(() => fn(...args), delay);
    };
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

function getValiadFileName(input: string): string {
    // https://blog.csdn.net/Yu1441/article/details/145701076
    const fileName = input.slice(0, 200)
        .replace(/\t/g, '\\t')
        .replace(/\*/g, '∗')
        .replace(/\//g, '᜵')
        .replace(/\\/g, '∖')
        .replace(/\:/g, '꞉')
        .replace(/\?/g, 'ʔ')
        .replace(/\"/g, '″')
        .replace(/\</g, '＜')
        .replace(/\>/g, '＞')
        .replace(/\`/g, 'ˋ')
        .replace(/\./g, '․')
        .replace(/\|/g, 'ǀ');
    return fileName;
}

function canOpenFileSafely(
    filePath: string,
    options: { safetyFactor: number } = { safetyFactor: 3 }
): boolean {
    const fileSize = fs.statSync(filePath).size; // bytes
    const heapStats = v8.getHeapStatistics();
    const heapFree = heapStats.total_available_size; // bytes
    const sysFree = os.freemem();

    // file size * 3，avoid OOM
    const estimatedNeeded = fileSize * options.safetyFactor;

    console.log(`File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`V8 heap Free: ${(heapFree / 1024 / 1024).toFixed(2)} MB`);
    console.log(`System memory Free: ${(sysFree / 1024 / 1024).toFixed(2)} MB`);

    // check heap mem
    if (estimatedNeeded > heapFree) return false;
    // check system mem
    if (estimatedNeeded > sysFree * 0.9) return false;

    return true;
}


export { padWithBlank, readJsonFile, debounce, getValiadFileName, escapePath, canOpenFileSafely, copySelectionText, copyCurrentLine };
