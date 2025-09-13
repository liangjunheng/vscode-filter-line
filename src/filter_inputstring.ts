'use strict';
import * as vscode from 'vscode';
import { FilterLineBase } from './filter_base';

class FilterLineByInputString extends FilterLineBase{
    private _inputstring?: string;
    private readonly HIST_KEY = 'inputStr';

    public notcontain: boolean = false;

    constructor(context: vscode.ExtensionContext) {
        super(context);

        let history = this.historyCommand.getAllHistory();
        if (history[this.HIST_KEY] === undefined) {
            history[this.HIST_KEY] = [];
            this.historyCommand.updateHistory(history);
        }
    }

    protected async prepare(callback : (succeed: boolean)=>void){
        let title = "filter to lines machting(string)"
        if(this.notcontain) {
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

    protected matchLine(line: string): string | undefined{
        if(this._inputstring === undefined){
            return undefined;
        }
        if(this.notcontain){
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