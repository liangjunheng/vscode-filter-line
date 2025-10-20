'use strict';
import * as vscode from 'vscode';
import { FilterLineBase } from './filter_base';
import {checkRegexByRipgrep, checkRipgrep, searchStringByRipgrep} from './ripgex_util';

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

    protected async awaitUserInput(): Promise<string> {
        let title = "filter to lines machting(string)"
        if(this.isInverseMatchMode) {
            title = "filter to lines not machting(string)"
        }
        let usrChoice: string = await this.showHistoryPick(this.HIST_KEY, title, "please input...");
        if (usrChoice === this.NEW_PATTERN_CHOISE) {
            usrChoice = await vscode.window.showInputBox() ?? ''
        }
        return usrChoice;
    }

    protected async awaitUserInputEnd(text: string): Promise<any> {
        if (text === undefined || text === '') {
            console.log('No input');
            return;
        }
        console.log('input : ' + text);
        this.isRipgrepMode = checkRipgrep()
        if (this.isRipgrepMode && !checkRegexByRipgrep(text)) {
            this.showError('checkRegexByRipgrep incorrect: ' + text);
            return;
        }
        this._inputstring = text;
        await this.historyCommand.addToHistory(this.HIST_KEY, text);
    }
    
    protected matchLineByRipgrep(inputPath: string, outputPath: string, pattern: string): Promise<any> | any {
        const result = searchStringByRipgrep(
            inputPath,
            outputPath,
            pattern,
            {
                inverseMatch: this.isInverseMatchMode,
                ingoreCase: this.isEnableSmartCase() && !/[A-Z]/.test(pattern),
            }
        );
        if (result.stderr.length > 0) {
            vscode.window.showErrorMessage('filter incorrect: ' + result.stderr, 'Failure');
        }
        return result;
    }

    protected matchLineByFs(line: string): string | undefined{
        if(this._inputstring === undefined){
            return undefined;
        }
        if(this.isInverseMatchMode){
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