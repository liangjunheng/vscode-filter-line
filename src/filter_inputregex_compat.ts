'use strict';
import * as vscode from 'vscode';
import {FilterLineBase} from './filter_base';
import {checkRegexByRipgrep, checkRipgrep, searchByRipgrep} from './search_ripgex_util';
import { isEnableStringMatchInRegex, isDisplayFilenamesWhenFilterDir } from './config_manager';
import { checkRegexByFs, searchByFs } from './search_classic_utils';

class FilterLineByInputCompat extends FilterLineBase{
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
        let title = "filter to lines machting"
        let usrChoice: string = await this.showHistoryPick(
            this.HIST_KEY,
            title, 
            "please input...",
            {
                enableRegexMode: this.currentSearchOptions.enableRegexMode,
                enableIgnoreCaseMode: this.currentSearchOptions.enableIgnoreCaseMode,
                enableInvertMatchMode: this.currentSearchOptions.enableInvertMatchMode,
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
        if (checkRipgrep()) {
            if (!checkRegexByRipgrep(userInputText, { matchSelf: this.isEnableStringMatchInRegexMode })) {
                this.showError('checkRegexByRipgrep incorrect: ' + userInputText);
                return;
            }
        } else {
            if (this.currentSearchOptions.enableRegexMode && !checkRegexByFs(userInputText)) {
                this.showError('checkRegexByFs incorrect: ' + userInputText);
                return;
            }
        }
        await this.historyCommand.addToHistory(this.HIST_KEY, userInputText);
        return
    }

    protected override search(inputFilePath: string, outputFilePath: string, pattern: string) {
        if(this.currentSearchOptions.enableRegexMode) {
            this.searchByRegex(inputFilePath, outputFilePath, pattern);
        } else {
            this.searchByString(inputFilePath, outputFilePath, pattern);
        }
    }

    private searchByRegex(inputFilePath: string, outputFilePath: string, pattern: string) {
        if (checkRipgrep()) {
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
                    contextLineCount: 0,
                }
            );
            if (result.stderr.length > 0) {
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

    private searchByString(inputFilePath: string, outputFilePath: string, pattern: string) {
        if (checkRipgrep()) {
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
                    contextLineCount: 0,
                }
            );
            if (result.stderr.length > 0) {
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

    dispose(){
    }
}

export { FilterLineByInputCompat };
