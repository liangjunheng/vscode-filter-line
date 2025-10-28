'use strict';
import * as vscode from 'vscode';
import { FilterLineBase } from './filter_base';
import {checkRegexByRipgrep, checkRipgrep, searchByRipgrep} from './search_ripgex_util';
import { isDisplayFilenamesWhenFilterDir, isEnableStringMatchInRegex } from './config_manager';
import { searchByFs } from './search_classic_utils';

class FilterLineByInputString extends FilterLineBase{
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
        if(this.currentSearchOptions.enableInvertMatchMode) {
            title = "filter to lines not machting(string)"
        }
        let usrChoice: string = await this.showHistoryPick(
            this.HIST_KEY,
            title, "please input...",
            {
                enableRegexMode: false,
                enableIgnoreCaseMode: this.currentSearchOptions.enableIgnoreCaseMode,
                enableInvertMatchMode: this.currentSearchOptions.enableInvertMatchMode
            }
        );
        if (usrChoice === this.NEW_PATTERN_CHOISE) {
            usrChoice = await vscode.window.showInputBox() ?? ''
        }
        return usrChoice;
    }

    protected override search(inputFilePath: string, outputFilePath: string, pattern: string) {
        if(checkRipgrep()) {
            const result = searchByRipgrep(
                inputFilePath,
                outputFilePath,
                pattern,
                {
                    matchRegexSelf: isEnableStringMatchInRegex(),
                    regexMode: this.currentSearchOptions.enableRegexMode,
                    invertMatchMode: this.currentSearchOptions.enableInvertMatchMode,
                    ignoreCaseMode: this.currentSearchOptions.enableIgnoreCaseMode,
                    showFilename: isDisplayFilenamesWhenFilterDir(),
                }
            );
            if(result.stderr.length > 0) {
                vscode.window.showErrorMessage('filter incorrect: ' + result.stderr, 'Failure');
            }
            return result;
        } else {
            const result = searchByFs(
                inputFilePath,
                outputFilePath,
                pattern,
                {
                    matchRegexSelf: isEnableStringMatchInRegex(),
                    regexMode: this.currentSearchOptions.enableRegexMode,
                    invertMatchMode: this.currentSearchOptions.enableInvertMatchMode,
                    ignoreCaseMode: this.currentSearchOptions.enableIgnoreCaseMode,
                }
            )
            return result;
        }
    }

    protected override async prepareFilterFileEnv(userInputText: string): Promise<any> {
        if (userInputText === undefined || userInputText === '') {
            console.log('No input');
            return;
        }
        console.log('input : ' + userInputText);
        if (checkRipgrep() && !checkRegexByRipgrep(userInputText)) {
            this.showError('checkRegexByRipgrep incorrect: ' + userInputText);
            return;
        }
        await this.historyCommand.addToHistory(this.HIST_KEY, userInputText);
    }
    
    dispose(){
    }

}

export { FilterLineByInputString};