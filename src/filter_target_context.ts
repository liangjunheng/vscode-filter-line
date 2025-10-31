import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { createCacheResultContextFileUri, getCacheResultContextDir } from './file_manager';
import { copyCurrentLine } from './util';
import { searchByRipgrep } from './search_ripgex_util';
import { getNumberOfTargetContextLines } from './config_manager';

let bottomDocUri: string | undefined;
let currentDocUri: string | undefined;
setInterval(async () => {
    if (currentDocUri === null || bottomDocUri === undefined) {
        return
    }
    let currentUri: string | undefined;
    const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
    if (activeTab?.input instanceof vscode.TabInputText) {
        currentUri = activeTab.input.uri.toString();
    }
    if (currentUri !== undefined && bottomDocUri !== currentUri) {
        await closeResultContextPannel();
        currentDocUri = undefined;
        bottomDocUri = undefined;
    }
}, 500);

export async function closeResultContextPannel() {
    const resultContextFsPath = vscode.Uri.parse(getCacheResultContextDir()).fsPath;
    for (const tabGroup of vscode.window.tabGroups.all) {
        for (const tab of tabGroup.tabs) {
            if (tab.input instanceof vscode.TabInputText && tab.input.uri.fsPath.includes(resultContextFsPath)) {
                await vscode.window.tabGroups.close(tab);
                console.log(`closeResultContextPannel, ${tab.input.uri.toString()}`)
            }
        }
    }
}

function getCurrentUri(): vscode.Uri | undefined {
    let currentDocUri: vscode.Uri | undefined
    const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
    if (activeTab?.input instanceof vscode.TabInputText) {
        currentDocUri = activeTab.input.uri;
    }
    return currentDocUri
}

const highlightDecoration = vscode.window.createTextEditorDecorationType({
    color: "yellow",
    overviewRulerColor: "yellow",
    overviewRulerLane: vscode.OverviewRulerLane.Full,
    isWholeLine: true
});
export class TargetContextFinder {
    async showTargetContext(tabUri: vscode.Uri) {
        const inputFilePath = path.join(path.dirname(tabUri.fsPath), "inputPath");
        console.log(`jumpToSource, inputFilePath: ${inputFilePath}`)
        const sourcePath = fs.readFileSync(inputFilePath, { encoding: 'utf8' })
        console.log(`jumpToSource, sourcePath: ${sourcePath}`)

        // get current line
        const currentLine = await copyCurrentLine();
        if(copyCurrentLine === undefined || currentLine.trim() === "") {
            vscode.window.showErrorMessage(`Current line is empty. Unable to proceed.`, 'Failure')
            return
        }
        console.log(`sourcePath: ${sourcePath}, currentLine: ${currentLine}`);

        await vscode.workspace.fs.delete(vscode.Uri.file(getCacheResultContextDir()), { recursive: true });
        // close last pannel
        await closeResultContextPannel();
        // create context result file
        const segments = path.dirname(sourcePath).split(path.sep); // 按路径分隔符切割成数组
        const lastThire = segments.slice(-2).join('＞');
        const outputFile = createCacheResultContextFileUri(`TargetContextLines@：${ "...＞" + lastThire + "＞" + path.basename(sourcePath)}`);
        searchByRipgrep(
            sourcePath,
            outputFile,
            currentLine,
            {
                regexMode: false,
                matchRegexSelf: false,
                invertMatchMode: false,
                showFilename: true,
                ignoreCaseMode: false,
                contextLineCount: getNumberOfTargetContextLines(),
            },
        )
        console.log(`showContext, closeResultContextPannel end`)

        if (fs.statSync(outputFile).size >= 50 * 1024 * 1024) {
            vscode.window.showErrorMessage(`Too many target lines. Unable to proceed.`, 'Failure')
            return
        }

        // open context result
        currentDocUri = getCurrentUri()?.toString();
        const doc = await vscode.workspace.openTextDocument(outputFile);
        await vscode.window.showTextDocument(doc, vscode.ViewColumn.Active);
        bottomDocUri = getCurrentUri()?.toString();
        // split bottom
        await vscode.commands.executeCommand('workbench.action.moveEditorToBelowGroup');
        await vscode.commands.executeCommand('workbench.action.focusBelowGroup');
        // 30% height
        for (let i = 0; i < 3; i++) {
            await vscode.commands.executeCommand('workbench.action.decreaseViewHeight');
        }

        const activeTextEditor = vscode.window.activeTextEditor;
        if(activeTextEditor === undefined || activeTextEditor?.document.uri.fsPath.indexOf(vscode.Uri.parse(outputFile).fsPath) === -1) {
            return
        }
        const ranges: vscode.Range[] = [];
        for (let index = 0; index < activeTextEditor.document.lineCount; index++) {
            const line = activeTextEditor.document.lineAt(index);
            if(line.text !== currentLine) {
                continue;
            }
            if(ranges.length == 0) {
                activeTextEditor.selection = new vscode.Selection(line.range.start, line.range.end);
                activeTextEditor.revealRange(line.range, vscode.TextEditorRevealType.AtTop);
            }
            ranges.push(new vscode.Range(line.range.start, line.range.end));
        }
        activeTextEditor.setDecorations(highlightDecoration, ranges);
        await vscode.commands.executeCommand('actions.find');
        await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
    }


    dispose() {
    }
}