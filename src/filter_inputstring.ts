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

    protected async prepare(callback : (succeed: boolean)=>void){
        let title = "filter to lines machting(string)"
        if(this.isInverseMatchMode) {
            title = "filter to lines not machting(string)"
        }
        let usrChoice: string = await this.showHistoryPick(this.HIST_KEY, title, "please input...");

        const makeInputStr = async (text: string | undefined) => {
            if(text === undefined || text === ''){
                console.log('No input');
                callback(false);
                return;
            }
            console.log('input : ' + text);
            this.isRipgrepMode = checkRipgrep()
            if(this.isRipgrepMode && !checkRegexByRipgrep(text)) {
                this.showError('checkRegexByRipgrep incorrect: ' + text);
                callback(false);
                return;
            }
            this._inputstring = text;
            await this.historyCommand.addToHistory(this.HIST_KEY, text);
            callback(true);
        };

        if (usrChoice !== this.NEW_PATTERN_CHOISE) {
            makeInputStr(usrChoice);
        } else {
            vscode.window.showInputBox().then(makeInputStr);
        }
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