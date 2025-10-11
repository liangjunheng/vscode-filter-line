import * as vscode from 'vscode';
import * as path from 'path';
import { VITUAL_FILE_SCHEME, ctx, fileProvider } from './extension';

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


/**
 * remove .filterline files when a tab is closed.
 */
async function deleteInvalidRealFileWhenCloseTab() {
    vscode.window.tabGroups.onDidChangeTabs(({ closed }) => {
        closed.forEach(tab => {
            const uri = (tab.input as any)?.uri;
            console.log("deleteInvalidRealFileWhenCloseTab, uri: " + uri);
            if (uri && uri.scheme === VITUAL_FILE_SCHEME) {
                const realFilePath = fileProvider.getRealFileFromVirtureFile(uri);
                console.log("deleteInvalidRealFileWhenCloseTab, deleteRealFilePath: " + realFilePath);
                vscode.workspace.fs.delete(vscode.Uri.file(path.dirname(realFilePath)), { recursive: true });
            }
        })
    });

    const fsTabPathSet = new Set<string>();
    for (const group of vscode.window.tabGroups.all) {
        for (const tab of group.tabs) {
            const input = tab.input;
            if (input instanceof vscode.TabInputText && input.uri.scheme === VITUAL_FILE_SCHEME) {
                fsTabPathSet.add(fileProvider.getRealFileFromVirtureFile(input.uri));
            }
        }
    }

    const tmpFilePaths = await traverseFolder(vscode.Uri.file(path.join(ctx.globalStorageUri.fsPath, 'cache', 'real-files')));
    tmpFilePaths.forEach(filePath => {
        console.log(`tmpFilePaths path: ${filePath}, has: ${fsTabPathSet.has(filePath)}`);
        if (!fsTabPathSet.has(filePath)) {
            vscode.workspace.fs.delete(vscode.Uri.file(path.dirname(filePath)), { recursive: true });
        }
    });
}

async function clearCacheFiles() {
    vscode.workspace.fs.delete(vscode.Uri.file(path.join(ctx.globalStorageUri.fsPath, 'cache', 'real-files')), { recursive: true });
    vscode.workspace.fs.delete(vscode.Uri.file(path.join(ctx.globalStorageUri.fsPath, 'cache', 'virtual-files')), { recursive: true });
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

export { deleteInvalidRealFileWhenCloseTab, clearCacheFiles }

