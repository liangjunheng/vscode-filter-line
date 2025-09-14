'use strict';
import * as vscode from 'vscode';
import {FilterLineBase} from './filter_base';

class FilterLineByInputRegex extends FilterLineBase{
    private _regex?: RegExp;
    private readonly HIST_KEY = 'inputRegex';

    constructor(context: vscode.ExtensionContext) {
        super(context);

        let history = this.historyCommand.getHistory(this.HIST_KEY);
        if (history === undefined) {
            history = [];
            this.historyCommand.updateHistory(this.HIST_KEY, history);
        }
    }

    protected async prepare(callback : (succeed: boolean)=>void){
        let title = "filter to lines machting(regex)"
        if(this.isInverseMatchMode) {
            title = "filter to lines not machting(regex)"
        }
        const usrChoice: string = await this.showHistoryPick(this.HIST_KEY, title, "please input...");

        const makeRegEx = async (text: string | undefined) => {
            if(text === undefined || text === ''){
                // console.log('No input');
                callback(false);
                return;
            }
            // console.log('input : ' + text);
            try{
                if (this.isEnableSmartCaseInRegex() && !/[A-Z]/.test(text)) {
                    this._regex = new RegExp(text, 'gi');
                } else {
                    this._regex = new RegExp(text, 'g');
                }
            }catch(e){
                this.showError('Regex incorrect :' + e);
                callback(false);
                return;
            }
            await this.historyCommand.addToHistory(this.HIST_KEY, text);
            callback(true);
        };

        if (usrChoice !== this.NEW_PATTERN_CHOISE) {
            makeRegEx(usrChoice);
        } else {
            vscode.window.showInputBox().then(makeRegEx);
        }
    }

    protected matchLine(line: string): string | undefined{
        if(this._regex === undefined){
            return undefined;
        }
        if(this.isInverseMatchMode){
            if(line.match(this._regex) === null){
                return line;
            }
        }else{
            if(line.match(this._regex) !== null){
                return line;
            }
        }
        return undefined;
    }

    dispose(){
    }
}

export { FilterLineByInputRegex};
