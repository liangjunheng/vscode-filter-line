'use strict';
import * as vscode from 'vscode';
import {FilterLineBase} from './filter_base';
import {checkRegexByRipgrep, checkRipgrep, searchByRipgrep} from './search_ripgex_util';
import { isEnableStringMatchInRegex, getIgnoreCaseMode, isDisplayFilenamesWhenFilterDir, isEnableSmartCase } from './config_manager';

class FilterLineByInputRegex extends FilterLineBase{
    private _regex?: RegExp;
    private _rawRegexString: string = "";
    private readonly HIST_KEY = 'inputRegex';
    private isEnableStringMatchInRegexMode = false;

    constructor(context: vscode.ExtensionContext) {
        super(context);

        let history = this.historyCommand.getHistory(this.HIST_KEY);
        if (history === undefined) {
            history = [];
            this.historyCommand.updateHistory(this.HIST_KEY, history);
        }
    }

    protected override async awaitUserInput(): Promise<string> {
        // Match the regular expression pattern itself
        this.isEnableStringMatchInRegexMode = isEnableStringMatchInRegex()
        console.log('prepare, isEnableStringMatchInRegexMode: ' + this.isEnableStringMatchInRegexMode);

        let title = "filter to lines machting(regex)"
        if(this.currentButtonOptions.enableInvertMatchMode) {
            title = "filter to lines not machting(regex)"
        }
        let usrChoice: string = await this.showHistoryPick(
            this.HIST_KEY,
            title, "please input...",
            {
                enableRegexMode: true,
                enableIgnoreCaseMode: getIgnoreCaseMode(),
                enableInvertMatchMode: this.currentButtonOptions.enableInvertMatchMode,
            }
        );
        if (usrChoice === this.NEW_PATTERN_CHOISE) {
            usrChoice = await vscode.window.showInputBox() ?? ''
        }
        return usrChoice;
    }

    
    protected override async prepareFilterFileEnv(userInputText: string): Promise<void> {
        if (userInputText === undefined || userInputText === '') {
            // console.log('No input');
            return;
        }
        // console.log('input : ' + text);
        this.isRipgrepSeachMode = checkRipgrep();
        if (this.isRipgrepSeachMode) {
            if (!checkRegexByRipgrep(userInputText, { matchSelf: this.isEnableStringMatchInRegexMode })) {
                this.showError('checkRegexByRipgrep incorrect: ' + userInputText);
                return;
            }
        } else {
            if (!this.checkRegexByFs(userInputText)) {
                this.showError('checkRegexByFs incorrect: ' + userInputText);
                return;
            }
            this.makeRegexByFs(userInputText);
        }
        await this.historyCommand.addToHistory(this.HIST_KEY, userInputText);
        return
    }

    protected override matchLineByRipgrep(inputPath: string, outputPath: string, pattern: string): Promise<any> | any {
        const result = searchByRipgrep(
            inputPath,
            outputPath,
            pattern,
            {
                matchRegexSelf: isEnableStringMatchInRegex(),
                isRegexMode: this.currentButtonOptions.enableRegexMode,
                inverseMatch: this.currentButtonOptions.enableInvertMatchMode,
                ignoreCase: this.currentButtonOptions.enableIgnoreCaseMode,
                showFilename: isDisplayFilenamesWhenFilterDir(),
            }
        );
        if(result.stderr.length > 0) {
            vscode.window.showErrorMessage('filter incorrect: ' + result.stderr, 'Failure');
        }
        return result;
    }

    private checkRegexByFs(pattern: string): Boolean {
        try {
            new RegExp(pattern);
            return true;
        } catch (e) {
            this.showError('Regex incorrect :' + e);
            return false;
        }
    }
    private makeRegexByFs(pattern: string) {
        this._rawRegexString = pattern
        if (isEnableSmartCase() && !/[A-Z]/.test(pattern)) {
            this._regex = new RegExp(pattern, 'i');
        } else {
            this._regex = new RegExp(pattern);
        }
    }
    protected override matchLineByFs(line: string): string | undefined{
        if(this._regex === undefined){
            return undefined;
        }
        if(this.currentButtonOptions.enableInvertMatchMode){
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
