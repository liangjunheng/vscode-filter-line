'use strict';
import * as vscode from 'vscode';
import {FilterLineBase} from './filter_base';
import {searchByRegex} from './ripgex_util';

class FilterLineByInputRegex extends FilterLineBase{
    private _regex?: RegExp;
    private _rawRegexString: string = "";
    private readonly HIST_KEY = 'inputRegex';
    private isEnableStringMatchInRegexMode = true

    constructor(context: vscode.ExtensionContext) {
        super(context);

        let history = this.historyCommand.getHistory(this.HIST_KEY);
        if (history === undefined) {
            history = [];
            this.historyCommand.updateHistory(this.HIST_KEY, history);
        }
    }

    protected async prepare(callback : (succeed: boolean)=>void){
        // Match the regular expression pattern itself
        this.isEnableStringMatchInRegexMode = this.isEnableStringMatchInRegex()
        console.log('prepare, isEnableStringMatchInRegexMode: ' + this.isEnableStringMatchInRegexMode);

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
                this._rawRegexString = text
                if (this.isEnableSmartCase() && !/[A-Z]/.test(text)) {
                    this._regex = new RegExp(text, 'i');
                } else {
                    this._regex = new RegExp(text);
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

    protected matchLineByRipgrep(inputPath: string, outputPath: string, pattern: string): Promise<any> | any {
        return searchByRegex(
            inputPath,
            outputPath,
            pattern,
            {
                matchSelf: this.isEnableStringMatchInRegex(),
                inverseMatch: this.isInverseMatchMode,
                ingoreCase: this.isEnableSmartCase() && !/[A-Z]/.test(pattern),
            }
        );
    }

    protected matchLineByFs(line: string): string | undefined{
        if(this._regex === undefined){
            return undefined;
        }
        if(this.isInverseMatchMode){
            // string match
            if(this.isEnableStringMatchInRegexMode && line.indexOf(this._rawRegexString) !== -1){
                // matched, return null
                return undefined;
            }
            // regex match
            this._regex.lastIndex = 0;
            if(!this._regex.test(line)){
                return line;
            }
        }else{
            // string match
            if(this.isEnableStringMatchInRegexMode && line.indexOf(this._rawRegexString) !== -1){
                return line;
            }
            // regex match
            this._regex.lastIndex = 0;
            if(this._regex.test(line)){
                return line;
            }
        }
        return undefined;
    }

    dispose(){
    }
}

export { FilterLineByInputRegex};
