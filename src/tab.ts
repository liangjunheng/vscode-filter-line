import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * remove .filterline files when a tab is closed.
 */
function deleteFileWhenTabClose() {
    vscode.window.tabGroups.onDidChangeTabs(({ closed }) => {
        closed.forEach(tab => {
            const uri = (tab.input as any)?.uri;
            if (uri?.scheme !== 'file' || path.extname(uri.fsPath) !== '.filterline') return;

            try {
                fs.unlinkSync(uri.fsPath);
                console.log(`delete file success: ${uri.fsPath}`);
            } catch (err) {
                console.error(`delete file failure: ${uri.fsPath}`, err);
            }
        });
    });
}

export { deleteFileWhenTabClose }

