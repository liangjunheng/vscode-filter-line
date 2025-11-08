'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as commonUtil from './util';
import {HistoryCommand} from './history_command';
import {createCacheResultFileUri} from './file_manager';
import {checkRipgrepExec} from './search_ripgex_util';
import * as configManager from './config_manager';

class FilterLineBase{
    protected ctx: vscode.ExtensionContext;
    protected readonly historyCommand: HistoryCommand;
    protected readonly NEW_PATTERN_CHOISE = 'New pattern...';
    protected isRipgrepExecVaild = false;
    private currentMatchPattern: string = '';
    currentSearchOptions: {
        enableRegexMode: boolean,
        enableIgnoreCaseMode: boolean,
        enableInvertMatchMode: boolean,
    }

    constructor(context: vscode.ExtensionContext) {
        this.ctx = context;
        this.historyCommand = new HistoryCommand(this.ctx);
        this.currentSearchOptions = {
            enableIgnoreCaseMode: configManager.getIgnoreCaseMode(),
            enableInvertMatchMode: configManager.getInvertMatchMode(),
            enableRegexMode: configManager.getRegexMode(),
        }
    }

    protected async showHistoryPick(
        title: string,
        description: string,
        options: {
            enableRegexMode: boolean,
            enableIgnoreCaseMode: boolean,
            enableInvertMatchMode: boolean,
        }
    ): Promise<string> {
        // create QuickPick
        const quickPick = vscode.window.createQuickPick();
        // quickPick.ignoreFocusOut = true;
        quickPick.title = title;
        quickPick.placeholder = description;
        quickPick.keepScrollPosition = true;

        // close QuickPick Botton
        const closeButton: vscode.QuickInputButton = {
            iconPath: new vscode.ThemeIcon('close'),
            tooltip: 'Close QuickPick',
        };
        const enableIngoreCaseButton: vscode.QuickInputButton = {
            iconPath: new vscode.ThemeIcon('case-sensitive'),
            tooltip: 'Currently in IgnoreCase Mode',
        };
        const disableIngoreCaseButton: vscode.QuickInputButton = {
            iconPath: new vscode.ThemeIcon('preserve-case'),
            tooltip: 'Currently in CaseSensitive Mode',
        };
        const enableRegexButton: vscode.QuickInputButton = {
            iconPath: new vscode.ThemeIcon('regex'),
            tooltip: 'Currently in Regex Mode',
        };
        const disableRegexButton: vscode.QuickInputButton = {
            iconPath: new vscode.ThemeIcon('symbol-string'),
            tooltip: 'Currently in String Mode',
        };
        const enableInvertMatchButton: vscode.QuickInputButton = {
            iconPath: new vscode.ThemeIcon('issue-draft'),
            tooltip: 'Currently in InvertMatch Mode',
        };
        const disableInvertMatchButton: vscode.QuickInputButton = {
            iconPath: new vscode.ThemeIcon('target'),
            tooltip: 'Currently in NormalMatch Mode',
        };

        quickPick.buttons = [
            vscode.QuickInputButtons.Back,
            options.enableInvertMatchMode ? enableInvertMatchButton : disableInvertMatchButton,
            options.enableIgnoreCaseMode ? enableIngoreCaseButton : disableIngoreCaseButton,
            options.enableRegexMode ? enableRegexButton : disableRegexButton,
            closeButton
        ];
        quickPick.onDidTriggerButton(button => {
            if (button === vscode.QuickInputButtons.Back) {
                quickPick.hide()
                vscode.commands.executeCommand("extension.filterLineBy");
            }
            if (button === enableIngoreCaseButton) {
                options.enableIgnoreCaseMode = false
                configManager.setIgnoreCaseMode(false);
            }
            if (button === disableIngoreCaseButton) {
                options.enableIgnoreCaseMode = true
                configManager.setIgnoreCaseMode(true);
            }
            if (button === enableRegexButton) {
                options.enableRegexMode = false;
                configManager.setRegexMode(false);
            }
            if (button === disableRegexButton) {
                options.enableRegexMode = true;
                configManager.setRegexMode(true);
            }
            if (button === enableInvertMatchButton) {
                options.enableInvertMatchMode = false;
                configManager.setInvertMatchMode(false);
            }
            if (button === disableInvertMatchButton) {
                options.enableInvertMatchMode = true;
                configManager.setInvertMatchMode(true);
            }
            if (button === closeButton) {
                quickPick.hide();
            }
            // select buttons
            quickPick.buttons = [
                vscode.QuickInputButtons.Back,
                options.enableInvertMatchMode ? enableInvertMatchButton : disableInvertMatchButton,
                options.enableIgnoreCaseMode ? enableIngoreCaseButton : disableIngoreCaseButton,
                options.enableRegexMode ? enableRegexButton : disableRegexButton,
                closeButton
            ];
        });

        // get histroy
        let history = this.historyCommand.getHistory();
        let picks: Array<string> = [...history];
        console.log(`History: ${JSON.stringify(history)}`);

        // create items button event
        const itemChooseButton: vscode.QuickInputButton = {
            iconPath: new vscode.ThemeIcon('reply'),
            tooltip: 'Choose',
        };
        const itemDeleteButton: vscode.QuickInputButton = {
            iconPath: new vscode.ThemeIcon('trash'),
            tooltip: 'Delete',
        };
        
        // onItemClickEvent
        quickPick.onDidTriggerItemButton(e => {
            console.log("onDidTriggerItemButton:", `click: ${e.button.tooltip}：${e.item.label}`);
            if (e.button.tooltip === "Choose") {
                quickPick.value = e.item.label;
            }
            if (e.button.tooltip === "Delete") {
                history = history.filter(item => item !== e.item.label);
                this.historyCommand.updateHistory(history)
                quickPick.items = quickPick.items.filter(item => item.label !== e.item.label);
            }
        });

        // When the input is empty, fill in all historical data
        if (quickPick.value === '' || quickPick.value == undefined) {
            const quickPickItems = picks.map(h => ({ label: h, buttons: [itemChooseButton, itemDeleteButton] }));
            quickPick.items = quickPickItems;
        }

        // When the user inputs new content into the QuickPick input box
        quickPick.onDidChangeValue((value: string) => {
            console.log("onDidChangeValue, user inputing:", value);
            configManager.setLastUserInput(value);
            
            let filterHistoryPacks = picks
                .filter(h => h.includes(value) && h !== value)
                .map(h => ({ label: h, buttons: [itemChooseButton, itemDeleteButton] }));
            if (value) {
                filterHistoryPacks.unshift({ label: value, buttons: [] });
            }
            quickPick.items = filterHistoryPacks;
        });

        // get lastInputValue or SelectionValue
        let defaultInput = configManager.getLastUserInput();
        // if (defaultInput === "") {
        //     defaultInput = await copySelectionText();
        // }
        
        // await input complie
        let usrChoice: string = await new Promise((resolve) => {
            quickPick.onDidAccept(() => {
                configManager.setLastUserInput("");
                const selection = quickPick.selectedItems[0];
                const finalValue = selection ? selection.label : quickPick.value;
                console.log("user input result:", finalValue);
                quickPick.hide();
                resolve(finalValue);
            });

            quickPick.onDidHide(() => {
                quickPick.dispose();
                resolve('');
            });
            // show quickPick
            quickPick.show()
            quickPick.value = defaultInput;
        });
        
        this.currentMatchPattern = (usrChoice === undefined) ? this.NEW_PATTERN_CHOISE : usrChoice
        this.currentSearchOptions = options
        return this.currentMatchPattern;
    }

    protected showInfo(text: string){
        console.log(text);
        vscode.window.showInformationMessage(text);
    }
    protected showError(text: string){
        vscode.window.showErrorMessage(text);
    }

    protected getDocumentPathToBeFilter(filePath_?: string): Promise<string> {
        return new Promise<string>(async (resolve) => {
            let filePath = filePath_;
            console.log('getDocumentPathToBeFilter, filepath = ' + filePath_);

            if (filePath_ === undefined) {
                const editor = vscode.window.activeTextEditor;
                const document = vscode.window.activeTextEditor?.document;
                filePath = vscode.window.activeTextEditor?.document?.uri?.fsPath;
                // first, save file
                if(editor?.document.isDirty === true && !editor.document.isUntitled) {
                    await editor?.document?.save()
                }

                if (!fs.existsSync(filePath ?? "")) {
                    // In a 50 MB file, activeTextEditor is null. Try reading the current tab
                    const activeTabInput = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
                    if (activeTabInput instanceof vscode.TabInputText) {
                        filePath = activeTabInput.uri.fsPath;
                    }
                }

                if (!fs.existsSync(filePath ?? "") && document !== undefined) {
                    // Write cache data to a file
                    filePath = createCacheResultFileUri('TabBuffer.txt');
                    const allText = document.getText();
                    fs.mkdirSync(path.dirname(filePath), { recursive: true });
                    fs.writeFileSync(filePath, allText);
                }
            }

            if (filePath === undefined || !fs.existsSync(filePath)) {
                // this.showError('Can not get valid file path');
                // this.showError('No file selected (Or file is too large. For how to filter large file, please visit README)');
                console.warn('Can not get valid file path');
                resolve('');
                return;
            }

            let stats = fs.statSync(filePath);
            if(stats.isDirectory() && this.isRipgrepExecVaild) {
                resolve(filePath);
                return;
            }
            if (!stats.isFile()) {
                this.showError('Can only filter file');
                resolve('');
                return;
            }

            let fileName = filePath.replace(/^.*[\\\/]/, '');
            let fileDir = filePath.substring(0, filePath.length - fileName.length);
            console.log("filePath=" + filePath);
            console.log("fileName=" + fileName);
            console.log("fileDir=" + fileDir);

            if (fileName !== 'filterline') {
                resolve(filePath);
                return;
            }

            console.log('large file mode');

            fs.readdir(fileDir, (err: any, files: any) => {

                let pickableFiles: string[] = [];
                files.forEach((file: any) => {
                    console.log(file);

                    if (fs.lstatSync(fileDir + file).isDirectory()) {
                        resolve('');
                        return;
                    }
                    if (file === '.DS_Store' || file === 'filterline') {
                        resolve('');
                        return;
                    }

                    pickableFiles.push(file);
                });

                pickableFiles.sort();

                vscode.window.showQuickPick(pickableFiles).then((pickedFile: string | undefined) => {
                    if (pickedFile === undefined) {
                        resolve('');
                        return;
                    }
                    let largeFilePath = fileDir + pickedFile;
                    console.log(largeFilePath);
                    resolve(largeFilePath);
                });
            });
        });
    }

    protected async filterFile(filePath: string) {
        let inputPath = filePath;
        if (inputPath === undefined || !fs.existsSync(inputPath)) {
            vscode.window.showErrorMessage('Please ensure the file is saved and the path is valid.', "Failure");
            return
        }

        // match mode
        const matchModeSymbol = this.currentSearchOptions.enableInvertMatchMode ? "➖" : "➕"
        const fileName = commonUtil.getValiadFileName(this.currentMatchPattern);
        let outputPath = createCacheResultFileUri(matchModeSymbol + fileName);
        let inputPathCacheFile = path.join(path.dirname(outputPath), `inputPath`);
        fs.writeFileSync(inputPathCacheFile, inputPath);
        fs.writeFileSync(outputPath, '');

        console.log('input path: ' + inputPath);
        console.log('output path: ' + outputPath);

        // start filter line
        await this.search(inputPath, outputPath, this.currentMatchPattern)

        // open filter result
        if (commonUtil.canOpenFileSafely(outputPath, { safetyFactor: 2 })) {
            console.log('isSingleSeachBoxMode: ' + configManager.isSingleSeachBoxMode() ? 'on' : 'off');
            await vscode.commands.executeCommand(
                'vscode.open',
                vscode.Uri.parse(encodeURIComponent(outputPath)),
                { preview: configManager.isSingleSeachBoxMode() }
            );
        } else {
            vscode.window.showErrorMessage(
                `error: Filter line failed due to low system memory. Tip: Add more filter rules, current rule: ${this.currentMatchPattern}`,
                `Failure`,
                `Reason: Low memory`,
            );
        }
    }

    protected search(inputFilePath: string, outputFilePath: string, pattern: string): Promise<any> | any {
    }

    protected awaitUserInput(): Promise<string> | string {
        return ''
    }

    protected prepareFilterFileEnv(userInputText: string): Promise<any> | any {

    }

    public async filter(filePath?: string) {
        console.log('filter:' + filePath);

        const checkRipgrepExecJob = new Promise<boolean>((resolve) => {
            resolve(checkRipgrepExec())
        });
        const userInputText = await this.awaitUserInput();
        this.currentMatchPattern = userInputText;
        this.isRipgrepExecVaild = await checkRipgrepExecJob

        if(userInputText && userInputText !== '') {
            const isFsModeSymbol = !this.isRipgrepExecVaild ? "(Ripgrep not found)" : ""
            const matchModeSymbol = this.currentSearchOptions.enableInvertMatchMode ? "➖" : "➕"
            vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Filtering by rule${isFsModeSymbol}: ${matchModeSymbol + this.currentMatchPattern}`,
                    cancellable: false,
                },
                async (progress) => {
                    const startMillis = Date.now()
                    const docPath = await this.getDocumentPathToBeFilter(filePath)
                    console.log(`filter=>getDocumentPathToBeFilter=>spend: ${ Date.now() - startMillis}`);
                    await this.prepareFilterFileEnv(userInputText)
                    console.log(`filter=>prepareFilterFileEnv=>spend: ${ Date.now() - startMillis}`);
                    await this.filterFile(docPath);
                    console.log(`filter=>filterFile=>spend: ${ Date.now() - startMillis}`);
                }
            );
        }
    }
}

export { FilterLineBase};
