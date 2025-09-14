import * as vscode from 'vscode';

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
async function deleteInvalidFileWhenNotInTab(ctx: vscode.ExtensionContext) {
    // vscode.window.tabGroups.onDidChangeTabs(({ closed }) => {
    //     closed.forEach(tab => {
    //         const uri = (tab.input as any)?.uri;
    //         if (!getTabFilePathSet(ctx).has(uri.fsPath)) return;
    //         deleteFile(uri.fsPath);
    //     });
    // });
    const fsTabPathSet = new Set<string>();
    for (const group of vscode.window.tabGroups.all) {
        for (const tab of group.tabs) {
            const input = tab.input;
            if (input instanceof vscode.TabInputText) {
                fsTabPathSet.add(input.uri.fsPath);
            } else if (input instanceof vscode.TabInputTextDiff) {
                fsTabPathSet.add(input.original.fsPath);
                fsTabPathSet.add(input.modified.fsPath);
            }
        }
    }

    const os = require('os');
    const path = require('path');
    const tmpFilePaths = await traverseFolder(vscode.Uri.file(path.join(os.tmpdir(), 'vscode', 'filter-line-pro')));
    tmpFilePaths.forEach(filePath => {
        console.log(`tmpFilePaths path: ${filePath}, has: ${fsTabPathSet.has(filePath)}`);
        if (!fsTabPathSet.has(filePath)) {
            vscode.workspace.fs.delete(vscode.Uri.file(path.dirname(filePath)), { recursive: true });
        }
    });
}

export { deleteInvalidFileWhenNotInTab }

