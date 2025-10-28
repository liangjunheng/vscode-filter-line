'use strict';
import * as vscode from 'vscode';
import { FilterLineBase } from './filter_base';
import {checkRegexByRipgrep, checkRipgrep, searchByRipgrep} from './search_ripgex_util';
import { isDisplayFilenamesWhenFilterDir } from './config_manager';

class FilterLineByInputString extends FilterLineBase{
    private _inputstring?: string;
    private readonly HIST_KEY = 'inputStr';

    constructor(context: vscode.ExtensionContext) {
        super(context);

        let history = this.historyCommand.getHistory(this.HIST_KEY);
        if (history === undefined) {
            history = [];
            this.historyCommand.updateHistory(this.HIST_KEY, history);
        }
    }

    protected override async awaitUserInput(): Promise<string> {
        let title = "filter to lines machting(string)"
        if(this.currentButtonOptions.enableInvertMatchMode) {
            title = "filter to lines not machting(string)"
        }
        let usrChoice: string = await this.showHistoryPick(
            this.HIST_KEY,
            title, "please input...",
            {
                enableRegexMode: false,
                enableIgnoreCaseMode: this.currentButtonOptions.enableIgnoreCaseMode,
                enableInvertMatchMode: this.currentButtonOptions.enableInvertMatchMode
            }
        );
        if (usrChoice === this.NEW_PATTERN_CHOISE) {
            usrChoice = await vscode.window.showInputBox() ?? ''
        }
        return usrChoice;
    }

    protected override async prepareFilterFileEnv(userInputText: string): Promise<any> {
        if (userInputText === undefined || userInputText === '') {
            console.log('No input');
            return;
        }
        console.log('input : ' + userInputText);
        this.isRipgrepSeachMode = checkRipgrep()
        if (this.isRipgrepSeachMode && !checkRegexByRipgrep(userInputText)) {
            this.showError('checkRegexByRipgrep incorrect: ' + userInputText);
            return;
        }
        this._inputstring = userInputText;
        await this.historyCommand.addToHistory(this.HIST_KEY, userInputText);
    }
    
    protected override matchLineByRipgrep(inputPath: string, outputPath: string, pattern: string): Promise<any> | any {
        const result = searchByRipgrep(
            inputPath,
            outputPath,
            pattern,
            {
                isRegexMode: this.currentButtonOptions.enableRegexMode,
                matchRegexSelf: false,
                inverseMatch: this.currentButtonOptions.enableInvertMatchMode,
                ignoreCase: this.currentButtonOptions.enableIgnoreCaseMode,
                showFilename: isDisplayFilenamesWhenFilterDir(),
            }
        );
        if (result.stderr.length > 0) {
            vscode.window.showErrorMessage('filter incorrect: ' + result.stderr, 'Failure');
        }
        return result;
    }

    protected override matchLineByFs(line: string): string | undefined{
        if(this._inputstring === undefined){
            return undefined;
        }
        if(this.currentButtonOptions.enableInvertMatchMode){
            if(line.indexOf(this._inputstring) === -1){
                return line;
            }
        }else{
            if(line.indexOf(this._inputstring) !== -1){
                return line;
            }
        }
        return undefined;
    }

    dispose(){
    }

}

export { FilterLineByInputString};