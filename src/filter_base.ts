'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as os from 'os';
import {getValiadFileName} from './util';
import {HistoryCommand} from './history_command';

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

    protected isEnableOverwriteMode(): boolean {
        return vscode.workspace.getConfiguration('filter-line').get('enableOverwriteMode', false);
    }

    protected getHistoryMaxSize(): number {
        return this.historyCommand.getHistoryMaxSizeConfig();
    }
    
    protected async showHistoryPick(key: string, title: string, description: string) : Promise<string> {
        const history = this.historyCommand.getHistory(key)
        console.log(`History: ${JSON.stringify(history)}`);

        // create QuickPick
        const quickPick = vscode.window.createQuickPick();
        let picks: Array<string> = [...history];
        quickPick.ignoreFocusOut = true;
        quickPick.title = title;
        quickPick.placeholder = description;

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
        const quickPickItems = picks.map(h => ({ label: h, buttons: [itemChooseButton, itemDeleteButton] }));
        quickPick.items = quickPickItems;
        quickPick.onDidTriggerItemButton(e => {
            console.log("onDidTriggerItemButton:", `click: ${e.button.tooltip}：${e.item.label}`);
            if(e.button.tooltip === "Choose") {
                quickPick.value = e.item.label;
            }
            if(e.button.tooltip === "Delete") {
                const newHistory = history.filter(item => item !== e.item.label);
                this.historyCommand.updateHistory(key, newHistory)
                quickPick.items = quickPick.items.filter(item => item.label !== e.item.label);
            }
        });

        // When the user inputs new content into the QuickPick input box
        quickPick.onDidChangeValue((value: string) => {
            console.log("onDidChangeValue, user inputing:", value);
            let filterHistoryPacks = picks
                .filter(h => h.includes(value))
                .map(h => ({ label: h, buttons: [itemChooseButton, itemDeleteButton] }));
            if (filterHistoryPacks.length > 0 && value && !picks.includes(value)) {
                filterHistoryPacks.unshift({ label: value, buttons: [] });
            }
            quickPick.items = filterHistoryPacks;
        });

        // await input complie
        let usrChoice: string = await new Promise((resolve) => {
            quickPick.onDidAccept(() => {
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

    protected getDocumentPathToBeFilter(callback : (docPath: string)=>void, filePath_?: string){
        let filePath = filePath_;
        console.log('filepath = ' + filePath_);
        
        if (filePath_ === undefined) {
            let editor = vscode.window.activeTextEditor;
            if(!editor){
                // In a 50 MB file, activeTextEditor is null. Try reading the current tab
                const activeTab  = vscode.window.tabGroups.activeTabGroup.activeTab; 
                if (activeTab?.input instanceof vscode.TabInputText) {
                    const filePath = activeTab.input.uri.fsPath
                    callback(filePath);
                    return;
                }
                // fail
                this.showError('No file selected (Or file is too large. For how to filter large file, please visit README)');
                callback('');
                return;
            }

            let doc = editor.document;
            if(doc.isDirty){
                this.showError('Save before filter line');
                callback('');
                return;
            }

            filePath = doc.fileName;
        }

        if (filePath === undefined) {
            this.showError('Can not get valid file path');
            callback('');
            return;
        }

        const fs = require('fs');
        let stats = fs.statSync(filePath);
        if (!stats.isFile()) {
            this.showError('Can only filter file');
            callback('');
            return;
        }

        let fileName = filePath.replace(/^.*[\\\/]/, '');
        let fileDir = filePath.substring(0, filePath.length - fileName.length);
        console.log("filePath=" + filePath);
        console.log("fileName=" + fileName);
        console.log("fileDir=" + fileDir);

        if (fileName !== 'filterline') {
            callback(filePath);
            return;
        }

        console.log('large file mode');

        fs.readdir(fileDir, (err : any,files : any) => {

            let pickableFiles:string[] = [];
            files.forEach((file : any) => {
                console.log(file);

                if (fs.lstatSync(fileDir + file).isDirectory()) {
                    return;
                }
                if (file === '.DS_Store' || file === 'filterline') {
                    return;
                }

                pickableFiles.push(file);
            });

            pickableFiles.sort();

            vscode.window.showQuickPick(pickableFiles).then((pickedFile:string|undefined) => {
                if (pickedFile === undefined) {
                    return;
                }
                let largeFilePath = fileDir + pickedFile;
                console.log(largeFilePath);
                callback(largeFilePath);
            });
        });

    }

    protected filterFile(filePath: string): Promise<boolean> {
        return new Promise((resolve) => {
            const readline = require('readline');
            const fs = require('fs');
            var path = require('path');

            let inputPath = filePath;

            // special path tail
            let ext = path.extname(inputPath);
            let tail = ext + '.filterline';

            // overwrite mode ?
            let isOverwriteMode = this.isEnableOverwriteMode() && (inputPath.indexOf(tail) !== -1);
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
                    return;
                }
                try {
                    fs.renameSync(inputPath, newInputPath);
                } catch (e) {
                    this.showError('rename error : ' + e);
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
                outputPath = path.join(os.tmpdir(), 'vscode', 'filter-line-pro', `${Date.now()}`, inverseMatchSymbol + '[' + fileName + ']');
                fs.mkdirSync(path.dirname(outputPath), { recursive: true })
                if (fs.existsSync(outputPath)) {
                    console.log('output file already exist, force delete when not under overwrite mode');
                    let tmpPath = outputPath + Math.floor(Date.now() / 1000) + ext;
                    try {
                        fs.renameSync(outputPath, tmpPath);
                        fs.unlinkSync(tmpPath);
                    } catch (e) {
                        console.log('remove error : ' + e);
                    }
                }
            }

            console.log('overwrite mode: ' + ((isOverwriteMode) ? 'on' : 'off'));
            console.log('input path: ' + inputPath);
            console.log('output path: ' + outputPath);

            // open write file
            let writeStream = fs.createWriteStream(outputPath);
            writeStream.on('open', () => {
                console.log('write stream opened');

                // open read file
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
                    vscode.window.showInformationMessage(this.currentMatchRule, "Filter Line is completed!");
                    writeStream.close();

                    try {
                        if (isOverwriteMode) {
                            fs.unlinkSync(inputPath);
                        }
                    } catch (e) {
                        console.log(e);
                    }
                    vscode.workspace.openTextDocument(outputPath).then((doc: vscode.TextDocument) => {
                        vscode.window.showTextDocument(doc, { preview: isOverwriteMode });
                        resolve(true);
                    });
                });
            }).on('error', (e: Error) => {
                console.log('can not open write stream : ' + e);
            }).on('close', () => {
                console.log('closed');
            });
        });
    }

    protected matchLine(line: string): string | undefined{
        return undefined;
    }

    protected prepare(callback : (succeed: boolean)=>void){

    }

    public filter(filePath?: string){
        this.getDocumentPathToBeFilter((docPath) => {
            if (docPath === '') {
                return;
            }

            console.log('will filter file :' + docPath);

            this.prepare((succeed)=>{
                if(!succeed){
                    return;
                }
                vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: "Filtering lines, please wait...",
                        cancellable: false
                    },
                    async (progress) => {
                        await this.filterFile(docPath);
                    }
                );
            });
        }, filePath);
    }
}

export { FilterLineBase};
