'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as readline from 'readline';
import * as path from 'path';
import * as fs from 'fs';
import {getValiadFileName} from './util';
import {HistoryCommand} from './history_command';
import {fileProvider, VITUAL_FILE_SCHEME} from './extension';

class FilterLineBase{
    public isInverseMatchMode: boolean = false;
    protected ctx: vscode.ExtensionContext;
    protected readonly historyCommand: HistoryCommand;
    protected readonly NEW_PATTERN_CHOISE = 'New pattern...';
    private currentMatchRule: string = ''

    constructor(context: vscode.ExtensionContext) {
        this.ctx = context;
        this.historyCommand = new HistoryCommand(this.ctx);
    }

    protected isEnableSmartCaseInRegex(): boolean {
        return vscode.workspace.getConfiguration('filter-line').get('enableSmartCaseInRegex', true);
    }

    protected isEnableStringMatchInRegex(): boolean {
        return vscode.workspace.getConfiguration('filter-line').get('enableStringMatchInRegex', true);
    }

    protected isEnableOverwriteMode(): boolean {
        return vscode.workspace.getConfiguration('filter-line').get('enableOverwriteMode', false);
    }

    protected getHistoryMaxSize(): number {
        return this.historyCommand.getHistoryMaxSizeConfig();
    }
    
    protected async showHistoryPick(key: string, title: string, description: string) : Promise<string> {
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
        quickPick.buttons = [closeButton]
        quickPick.onDidTriggerButton(button => {
            if (button === closeButton) {
                quickPick.hide();
            }
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
                .filter(h => h.includes(value))
                .map(h => ({ label: h, buttons: [itemChooseButton, itemDeleteButton] }));
            if (value && !picks.includes(value)) {
                filterHistoryPacks.unshift({ label: value, buttons: [] });
            }
            quickPick.items = filterHistoryPacks;
        });

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
            quickPick.value = this.ctx.globalState.get("lastInputValue", "");
        });
        
        this.currentMatchRule = (usrChoice === undefined) ? this.NEW_PATTERN_CHOISE : usrChoice
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
                filePath = vscode.window.activeTextEditor?.document?.uri?.fsPath;
                // first, save file
                if(editor?.document.isDirty === true && !editor.document.isUntitled) {
                    await editor?.document?.save()
                }

                if (!fs.existsSync(filePath ?? "")) {
                    // In a 50 MB file, activeTextEditor is null. Try reading the current tab
                    const activeTabInput = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
                    if (activeTabInput instanceof vscode.TabInputText) {
                        if (activeTabInput.uri.scheme == VITUAL_FILE_SCHEME) {
                            filePath = fileProvider.getRealFileFromVirtureFile(activeTabInput.uri);
                        } else {
                            filePath = activeTabInput.uri.fsPath;
                        }
                    }
                }


                if (!fs.existsSync(filePath ?? "") && editor?.document) {
                    // Write cache data to a file
                    filePath = path.join(this.ctx.globalStorageUri.fsPath, 'cache', 'real-files', `${Date.now()}`, 'TabBuffer.txt');
                    const allText = editor.document.getText();
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

    protected filterFile(filePath: string): Promise<boolean> {
        return new Promise(async (resolve) => {
            let inputPath = filePath;
            if (inputPath === undefined || !fs.existsSync(inputPath)) {
                this.showError('No file selected (Or file is too large. For how to filter large file, please visit README)');
                return
            }

            // special path tail
            let ext = path.extname(inputPath);
            let tail = '.filter';

            // overwrite mode ?
            let isOverwriteMode = this.isEnableOverwriteMode() && (inputPath.indexOf(tail) !== -1) && (inputPath.indexOf(path.join('vscode', 'filter-line-pro')) !== -1);
            let outputPath = '';
            if (isOverwriteMode) {
                outputPath = inputPath;

                // change input path
                let newInputPath = inputPath + Math.floor(Date.now() / 1000) + ext;
                try {
                    if (fs.existsSync(newInputPath)) {
                        fs.unlinkSync(newInputPath);
                    }
                } catch (e) {
                    this.showError('unlink error : ' + e);
                    resolve(false);
                    return;
                }
                try {
                    fs.renameSync(inputPath, newInputPath);
                } catch (e) {
                    this.showError('rename error : ' + e);
                    resolve(false);
                    return;
                }
                console.log('after rename');
                inputPath = newInputPath;
            } else {
                const fileName = getValiadFileName(this.currentMatchRule)
                let inverseMatchSymbol = "!";
                if(!this.isInverseMatchMode) {
                    inverseMatchSymbol = "";
                }
                outputPath = path.join(this.ctx.globalStorageUri.fsPath, 'cache', 'real-files', `${Date.now()}`, inverseMatchSymbol + '[' + fileName + ']' + tail);
                fs.mkdirSync(path.dirname(outputPath), { recursive: true })
                if (fs.existsSync(outputPath)) {
                    console.log('output file already exist, force delete when not under overwrite mode');
                    let tmpPath = outputPath + Math.floor(Date.now() / 1000) + ext;
                    try {
                        fs.renameSync(outputPath, tmpPath);
                        fs.unlinkSync(tmpPath);
                    } catch (e) {
                        console.log('remove error: ' + e);
                    }
                } else {
                    // create file
                    fs.writeFileSync(outputPath, '');
                }
            }

            console.log('overwrite mode: ' + ((isOverwriteMode) ? 'on' : 'off'));
            console.log('input path: ' + inputPath);
            console.log('output path: ' + outputPath);

            // open file
            const matchMode = this.isInverseMatchMode ? "➖" : "➕"
            let virtualFileUri = fileProvider.getVirtureFileFromRealFile(outputPath, VITUAL_FILE_SCHEME, matchMode + this.currentMatchRule)

            // open write stream
            let writeStream = fs.createWriteStream(outputPath);
            writeStream.on('open', () => {
                console.log('write stream opened');

                // open read stream
                const readLine = readline.createInterface({
                    input: fs.createReadStream(inputPath)
                });

                // filter line by line
                readLine.on('line', (line: string) => {
                    // console.log('line ', line);
                    let fixedline = this.matchLine(line);
                    if (fixedline !== undefined) {
                        writeStream.write(fixedline + '\n');
                    }
                }).on('close', () => {
                    writeStream.end();
                    try {
                        if (isOverwriteMode) {
                            fs.unlinkSync(inputPath);
                        }
                    } catch (e) {
                        console.log(e);
                    }
                });
            }).on('error', (e: Error) => {
                console.log('can not open write stream : ' + e);
                resolve(false);
            }).on('close', () => {
                console.log('closed');
                vscode.commands.executeCommand('vscode.open', virtualFileUri, { preview: isOverwriteMode });
                resolve(true);
                vscode.window.showInformationMessage(this.currentMatchRule, "Filter Line is completed!");
            });
        });
    }

    protected matchLine(line: string): string | undefined{
        return undefined;
    }

    protected prepare(callback : (succeed: boolean)=>void){

    }

    public filter(filePath?: string) {
        console.log('filter:' + filePath);
        this.prepare((succeed) => {
            if (!succeed) {
                return;
            }
            vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: `Filtering by rule: ${this.currentMatchRule}`,
                    cancellable: false,
                },
                async (progress) => {
                    const docPath = await this.getDocumentPathToBeFilter(filePath)
                    await this.filterFile(docPath);
                }
            );
        });
    }
}

export { FilterLineBase};
