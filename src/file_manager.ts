import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ctx } from './extension';

function getCacheResultDir(): string {
    return path.join(ctx.globalStorageUri.fsPath, 'cache', 'search-result');
}

function createCacheResultFileUri(fileName: string): string {
    return path.join(getCacheResultDir(), `result-${Date.now()}`, fileName).trimEnd();
}

function getCachePatternDir(): string {
    const filePath = path.join(ctx.globalStorageUri.fsPath, 'cache', 'riggrep-pattern');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    return filePath
}

function createCachePatternFileUri(fileName: string): string {
    const filePath = path.join(getCachePatternDir(), `pattern-${Date.now()}`, fileName).trimEnd();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    return filePath
}

async function traverseFolder(folderUri: vscode.Uri): Promise<string[]> {
    const fileList: string[] = [];
    async function walk(uri: vscode.Uri) {
        try {
            const entries = await vscode.workspace.fs.readDirectory(uri);
            for (const [name, fileType] of entries) {
                const fullPath = vscode.Uri.joinPath(uri, name);
                if (fileType === vscode.FileType.File) {
                    fileList.push(fullPath.fsPath);
                } else if (fileType === vscode.FileType.Directory) {
                    await walk(fullPath);
                }
            }
        } catch (err) {
            console.error('read dir failure:', err);
        }
    }
    await walk(folderUri);
    return fileList;
}

async function deleteInvalidCacheFile() {
    // delete ripgrep pattern
    vscode.workspace.fs.delete(vscode.Uri.file(getCachePatternDir()), { recursive: true });
    // delete search result
    const fsTabPathSet = new Set<string>();
    for (const group of vscode.window.tabGroups.all) {
        for (const tab of group.tabs) {
            const input = tab.input;
            if (input instanceof vscode.TabInputText && input.uri.toString().indexOf(ctx.extension.id) !== -1) {
                fsTabPathSet.add(input.uri.fsPath);
            }
        }
    }

    const tmpFilePaths = await traverseFolder(vscode.Uri.file(getCacheResultDir()));
    tmpFilePaths.forEach(filePath => {
        console.log(`tmpFilePaths path: ${filePath}, has: ${fsTabPathSet.has(filePath)}`);
        if (!fsTabPathSet.has(filePath)) {
            vscode.workspace.fs.delete(vscode.Uri.file(path.dirname(filePath)), { recursive: true });
        }
    });
}

/**
 * remove .filterline files when a tab is closed.
 */
async function deleteInvalidRealFileWhenCloseTab() {
    vscode.window.tabGroups.onDidChangeTabs(({ closed }) => {
        closed.forEach(tab => {
            const uri = (tab.input as any)?.uri;
            console.log("deleteInvalidRealFileWhenCloseTab, uri: " + uri);
            if (uri.toString().indexOf(ctx.extension.id) !== -1) {
                const realFilePath = uri.fsPath;
                console.log("deleteInvalidRealFileWhenCloseTab, deleteRealFilePath: " + realFilePath);
                vscode.workspace.fs.delete(vscode.Uri.file(path.dirname(realFilePath)), { recursive: true });
            }
        })
    });
}

async function clearCacheFiles() {
    vscode.workspace.fs.delete(vscode.Uri.file(getCacheResultDir()), { recursive: true });
    vscode.workspace.fs.delete(vscode.Uri.file(getCachePatternDir()), { recursive: true });
    // vscode.workspace.fs.delete(vscode.Uri.file(path.join(ctx.globalStorageUri.fsPath, 'cache', 'virtual-files')), { recursive: true });
    // const currentActiveTab = vscode.window.activeTextEditor?.document.fileName ?? ''
    // for (const group of vscode.window.tabGroups.all) {
    //     for (const tab of group.tabs) {
    //         const uri = (tab.input as any)?.uri;
    //         console.log("clearCacheFiles, uri: " + uri);
    //         if (uri && uri.scheme === scheme) {
    //             await vscode.window.showTextDocument(uri)
    //             await vscode.commands.executeCommand('workbench.action.closeActiveEditor')
    //         }
    //     }
    // }
    // vscode.window.showTextDocument(vscode.Uri.parse(currentActiveTab))
}

export { deleteInvalidRealFileWhenCloseTab, clearCacheFiles, createCachePatternFileUri, createCacheResultFileUri, deleteInvalidCacheFile }

