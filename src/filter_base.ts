'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as readline from 'readline';
import * as path from 'path';
import * as fs from 'fs';
import {getValiadFileName, canOpenFileSafely} from './util';
import {HistoryCommand} from './history_command';
import {createCacheResultFileUri} from './file_manager';
import {checkRipgrep} from './search_ripgex_util';
import { getIgnoreCaseMode, setIgnoreCaseMode, isSingleSeachBoxMode } from './config_manager';

class FilterLineBase{
    protected ctx: vscode.ExtensionContext;
    protected readonly historyCommand: HistoryCommand;
    protected readonly NEW_PATTERN_CHOISE = 'New pattern...';
    private currentMatchRule: string = ''
    protected isRipgrepSeachMode = false;
    currentButtonOptions: {
        enableRegexMode: boolean,
        enableIgnoreCaseMode: boolean,
        enableInvertMatchMode: boolean,
    }

    constructor(context: vscode.ExtensionContext) {
        this.ctx = context;
        this.historyCommand = new HistoryCommand(this.ctx);
        this.currentButtonOptions = {
            enableIgnoreCaseMode: getIgnoreCaseMode(),
            enableInvertMatchMode: false,
            enableRegexMode: false,
        }
    }

    protected async showHistoryPick(
        key: string,
        title: string,
        description: string,
        options: {
            enableRegexMode: boolean,
            enableIgnoreCaseMode: boolean,
            enableInvertMatchMode: boolean,
        }
    ): Promise<string> {
        let history = this.historyCommand.getHistory(key)
        console.log(`History: ${JSON.stringify(history)}`);

        // create QuickPick
        const quickPick = vscode.window.createQuickPick();
        let picks: Array<string> = [...history];
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
            iconPath: new vscode.ThemeIcon('preserve-case'),
            tooltip: 'CaseSensitive Mode',
        };
        const disableIngoreCaseButton: vscode.QuickInputButton = {
            iconPath: new vscode.ThemeIcon('case-sensitive'),
            tooltip: 'IgnoreCase Mode',
        };
        const enableRegexButton: vscode.QuickInputButton = {
            iconPath: new vscode.ThemeIcon('regex'),
            tooltip: 'Regex Mode',
        };
        const disableRegexButton: vscode.QuickInputButton = {
            iconPath: new vscode.ThemeIcon('symbol-string'),
            tooltip: 'String Mode',
        };
        const enableInvertMatchButton: vscode.QuickInputButton = {
            iconPath: new vscode.ThemeIcon('issue-draft'),
            tooltip: 'InvertMatch Mode',
        };
        const disableInvertMatchButton: vscode.QuickInputButton = {
            iconPath: new vscode.ThemeIcon('target'),
            tooltip: 'NormalMatch Mode',
        };

        quickPick.buttons = [
            options.enableInvertMatchMode ? enableInvertMatchButton : disableInvertMatchButton,
            options.enableIgnoreCaseMode ? enableIngoreCaseButton : disableIngoreCaseButton,
            options.enableRegexMode ? enableRegexButton : disableRegexButton,
            closeButton
        ];
        quickPick.onDidTriggerButton(button => {
            if (button === enableIngoreCaseButton) {
                options.enableIgnoreCaseMode = false
                setIgnoreCaseMode(false);
            }
            if (button === disableIngoreCaseButton) {
                options.enableIgnoreCaseMode = true
                setIgnoreCaseMode(true);
            }
            if (button === enableRegexButton) {
                options.enableRegexMode = false;
            }
            if (button === disableRegexButton) {
                options.enableRegexMode = true;
            }
            if (button === enableInvertMatchButton) {
                options.enableInvertMatchMode = false;
            }
            if (button === disableInvertMatchButton) {
                options.enableInvertMatchMode = true;
            }
            if (button === closeButton) {
                quickPick.hide();
            }
            // select buttons
            quickPick.buttons = [
                options.enableInvertMatchMode ? enableInvertMatchButton : disableInvertMatchButton,
                options.enableIgnoreCaseMode ? enableIngoreCaseButton : disableIngoreCaseButton,
                options.enableRegexMode ? enableRegexButton : disableRegexButton,
                closeButton
            ];
        });

        // add items and button event
        const itemChooseButton: vscode.QuickInputButton = {
            iconPath: new vscode.ThemeIcon('reply'),
            tooltip: 'Choose',
        };
        const itemDeleteButton: vscode.QuickInputButton = {
            iconPath: new vscode.ThemeIcon('trash'),
            tooltip: 'Delete',
        };
        quickPick.onDidTriggerItemButton(e => {
            console.log("onDidTriggerItemButton:", `click: ${e.button.tooltip}：${e.item.label}`);
            if (e.button.tooltip === "Choose") {
                quickPick.value = e.item.label;
            }
            if (e.button.tooltip === "Delete") {
                history = history.filter(item => item !== e.item.label);
                this.historyCommand.updateHistory(key, history)
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
            this.ctx.globalState.update("lastInputValue", value);
            
            let filterHistoryPacks = picks
                .filter(h => h.includes(value) && h !== value)
                .map(h => ({ label: h, buttons: [itemChooseButton, itemDeleteButton] }));
            if (value) {
                filterHistoryPacks.unshift({ label: value, buttons: [] });
            }
            quickPick.items = filterHistoryPacks;
        });

        // get lastInputValue or SelectionValue
        let defaultInput = this.ctx.globalState.get("lastInputValue", "");

        // await input complie
        let usrChoice: string = await new Promise((resolve) => {
            quickPick.onDidAccept(() => {
                this.ctx.globalState.update("lastInputValue", "");
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
        
        this.currentMatchRule = (usrChoice === undefined) ? this.NEW_PATTERN_CHOISE : usrChoice
        this.currentButtonOptions = options
        return this.currentMatchRule;
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
            if(stats.isDirectory() && checkRipgrep()) {
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
        const matchModeSymbol = this.currentButtonOptions.enableInvertMatchMode ? "➖" : "➕"
        const fileName = getValiadFileName(this.currentMatchRule);
        let outputPath = createCacheResultFileUri(matchModeSymbol + fileName);
        fs.writeFileSync(outputPath, '');

        console.log('ripgrep mode: ' + ((this.isRipgrepSeachMode) ? 'on' : 'off'));
        console.log('input path: ' + inputPath);
        console.log('output path: ' + outputPath);

        if(this.isRipgrepSeachMode) {
           await this.outputMatchLineByRipgrep(inputPath, outputPath)
        } else {
           await this.outputMatchLineByFs(inputPath, outputPath)
        }
        if (canOpenFileSafely(outputPath, { safetyFactor: 2 })) {
            console.log('isSingleSeachBoxMode: ' + isSingleSeachBoxMode ? 'on' : 'off');
            await vscode.commands.executeCommand(
                'vscode.open',
                vscode.Uri.parse(encodeURIComponent(outputPath)),
                { preview: isSingleSeachBoxMode() }
            );
        } else {
            vscode.window.showErrorMessage(
                `error: Filter line failed due to low system memory. Tip: Add more filter rules, current rule: ${this.currentMatchRule}`,
                `Failure`,
                `Reason: Low memory`,
            );
        }
    }

    private outputMatchLineByRipgrep(inputPath: string, outputPath: string): Promise<any> | any {
       return this.matchLineByRipgrep(inputPath, outputPath, this.currentMatchRule)
    }

    protected matchLineByRipgrep(inputPath: string, outputPath: string, pattern: string): Promise<any> | any {
    }

    // matchlines, fallback plan
    private outputMatchLineByFs(inputPath: string, outputPath: string): Promise<any> | any {
        return new Promise<Boolean>((resolve) => {
            // open write stream
            const writeStream = fs.createWriteStream(outputPath);
            // start match line
            writeStream.on('open', () => {
                console.log('write stream opened');
                // open read stream
                const readLineSteam = readline.createInterface({
                    input: fs.createReadStream(inputPath)
                });
                // filter line by line
                readLineSteam.on('line', (line: string) => {
                    // console.log('line ', line);
                    let fixedline = this.matchLineByFs(line);
                    if (fixedline !== undefined) {
                        writeStream.write(fixedline + '\n');
                    }
                }).on('close', () => {
                    writeStream.end();
                });
            }).on('error', (e: Error) => {
                console.log('can not open write stream : ' + e);
                writeStream.destroy()
                resolve(false);
            }).on('close', () => {
                console.log('closed');
                resolve(true);
            });
        });
    }

    protected matchLineByFs(line: string): string | undefined{
        return undefined;
    }

    protected awaitUserInput(): Promise<string> | string {
        return ''
    }

    protected prepareFilterFileEnv(userInputText: string): Promise<any> | any {

    }

    public async filter(filePath?: string) {
        console.log('filter:' + filePath);
        const userInputText = await this.awaitUserInput()
        if(userInputText && userInputText !== '') {
            const isFsModeSymbol = !checkRipgrep() ? "(Fs)" : ""
            const matchModeSymbol = this.currentButtonOptions.enableInvertMatchMode ? "➖" : "➕"
            vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Filtering by rule${isFsModeSymbol}: ${matchModeSymbol + this.currentMatchRule}`,
                    cancellable: false,
                },
                async (progress) => {
                    const docPath = await this.getDocumentPathToBeFilter(filePath)
                    await this.prepareFilterFileEnv(userInputText)
                    await this.filterFile(docPath);
                }
            );
        }
    }
}

export { FilterLineBase};
