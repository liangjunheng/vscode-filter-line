'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {FilterLineByConfigFile} from './filter_configfile';
import {deleteInvalidRealFileWhenCloseTab, clearCacheFiles, deleteInvalidCacheFile, SEARCH_RESULT_EXT} from './file_manager';
import { checkRipgrep } from './search_ripgex_util';
import { FilterLineByInputCompat } from './filter_inputregex_compat';
import { closeResultContextPannel, ResultContextFinder } from './filter_result_context';

export let ctx: vscode.ExtensionContext;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "filter-line" is now active!');
    ctx = context

    context.subscriptions.push({
        dispose: () => {
            console.log("filter-line-pro disable end!")
        }
    });

    // Force files with the '*⠀' suffix to open in FilterLine mode
    addFileAssociationIfMissing()

    // delete invalid RealFile When Tab is Closed
    closeResultContextPannel()
    deleteInvalidRealFileWhenCloseTab()
    deleteInvalidCacheFile()

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable_filterFromDirby = vscode.commands.registerCommand('extension.filterLineFromDirBy', async (dirUri) => {
        if(!checkRipgrep()) {
            vscode.window.showErrorMessage('Ripgrep executable not found. Folder filtering is unavailable', "Failure");
            return;
        }

        let path: string | undefined;
        if (typeof dirUri !== 'undefined' && !(dirUri instanceof vscode.Uri)) {
            console.warn('File URI validation failed');
            return;
        }
        path = (dirUri) ? dirUri.fsPath : undefined;

        interface Filters {
            label: string;
            command: string;
        }

        const filters: Array<Filters> = [
            {label: 'Match Pattern', command: 'extension.filterLineByInput'},
            {label: 'Not Match Pattern', command: 'extension.filterLineByNotMatchInput'},
            {label: 'Config File', command: 'extension.filterLineByConfigFile'}
        ];

        const choices: vscode.QuickPickItem[] = filters.map(item => Object.create({label: item.label}));
        let choice: string | vscode.QuickPickItem | undefined = await vscode.window.showQuickPick(choices);
        if (choice === undefined) {
            return;
        } else {
            choice = choice.label;
        }
        await vscode.commands.executeCommand(filters.filter(val => val.label === choice)[0].command, path);
    });


    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable_filterby = vscode.commands.registerCommand('extension.filterLineBy', async (fileUri) => {
        let path: string | undefined;
        if (typeof fileUri !== 'undefined' && !(fileUri instanceof vscode.Uri)) {
            console.warn('File URI validation failed');
            return;
        }
        path = (fileUri) ? fileUri.fsPath : undefined;

        interface Filters {
            label: string;
            command: string;
        }

        const filters: Array<Filters> = [
            {label: 'Match Pattern', command: 'extension.filterLineByInput'},
            {label: 'Not Match Pattern', command: 'extension.filterLineByNotMatchInput'},
            {label: 'Config File', command: 'extension.filterLineByConfigFile'}
        ];

        const choices: vscode.QuickPickItem[] = filters.map(item => Object.create({label: item.label}));
        let choice: string | vscode.QuickPickItem | undefined = await vscode.window.showQuickPick(choices);
        if (choice === undefined) {
            return;
        } else {
            choice = choice.label;
        }
        await vscode.commands.executeCommand(filters.filter(val => val.label === choice)[0].command, path);
    });

    let disposable_input = vscode.commands.registerCommand('extension.filterLineByInput', async (path) => {
        let filter = new FilterLineByInputCompat(context);
        filter.currentSearchOptions.enableInvertMatchMode = false;
        await filter.filter(path);
        context.subscriptions.push(filter);
    });


    let disposable_notmatchinput = vscode.commands.registerCommand('extension.filterLineByNotMatchInput', async (path) => {
        let filter = new FilterLineByInputCompat(context);
        filter.currentSearchOptions.enableInvertMatchMode = true;
        await filter.filter(path);
        context.subscriptions.push(filter);
    });

    let disposable_configfile = vscode.commands.registerCommand('extension.filterLineByConfigFile', async (path) => {
        let filter = new FilterLineByConfigFile(context);
        await filter.filter(path);
        context.subscriptions.push(filter);
    });


    let disposable_jumptosource = vscode.commands.registerCommand('extension.jumpToSource', async () => {
        const resultContextFinder = new ResultContextFinder();
        const tabUri = (vscode.window.tabGroups.activeTabGroup.activeTab?.input as any)?.uri
        if (tabUri === undefined) {
            return
        }
        await resultContextFinder.showContext(tabUri);
        context.subscriptions.push(resultContextFinder);
    });

    context.subscriptions.push(disposable_filterFromDirby);
    context.subscriptions.push(disposable_filterby);
    context.subscriptions.push(disposable_input);
    context.subscriptions.push(disposable_notmatchinput);
    context.subscriptions.push(disposable_configfile);
    context.subscriptions.push(disposable_jumptosource);
}

// this method is called when your extension is deactivated
export function deactivate() {
    clearCacheFiles()
}

// Force files with the '*⠀' suffix to open in FilterLine mode
function addFileAssociationIfMissing() {
    const config = vscode.workspace.getConfiguration();
    const current = config.get<Record<string, string>>('files.associations') || {};
    if (!(`*${SEARCH_RESULT_EXT}` in current) || current[`*${SEARCH_RESULT_EXT}`] !== 'FilterLinePro') {
        const newFileAssociations = {
            ...current,
            [`*${SEARCH_RESULT_EXT}`]: 'FilterLinePro'
        };
        config.update('files.associations', newFileAssociations, vscode.ConfigurationTarget.Global);
    }
}

