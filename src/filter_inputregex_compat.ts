'use strict';
import * as vscode from 'vscode';
import {FilterLineBase} from './filter_base';
import {checkRegexByRipgrep, searchByRipgrep} from './search_ripgex_util';
import { isEnableStringMatchInRegex, isDisplayFilenamesWhenFilterDir } from './config_manager';
import { checkRegexByFs, searchByFs } from './search_classic_util';

class FilterLineByInputCompat extends FilterLineBase{
    private isEnableStringMatchInRegexMode = false;

    constructor(context: vscode.ExtensionContext) {
        super(context);
        
        // Match the regular expression pattern itself
        this.isEnableStringMatchInRegexMode = isEnableStringMatchInRegex()
    }

    protected override async awaitUserInput(): Promise<string> {
        console.log('prepare, isEnableStringMatchInRegexMode: ' + this.isEnableStringMatchInRegexMode);
        let title = "filter to lines machting"
        let usrChoice: string = await this.showHistoryPick(
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
        console.log('input : ' + userInputText);
        if (this.isRipgrepExecVaild) {
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
        await this.historyCommand.addToHistory(userInputText);
        return
    }

    protected override search(inputFilePath: string, outputFilePath: string, pattern: string) {
        if(this.currentSearchOptions.enableRegexMode) {
            return this.searchByRegex(inputFilePath, outputFilePath, pattern);
        } else {
            return this.searchByString(inputFilePath, outputFilePath, pattern);
        }
    }

    private async searchByRegex(inputFilePath: string, outputFilePath: string, pattern: string) {
        if (this.isRipgrepExecVaild) {
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
            const result = await searchByFs(
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

    private async searchByString(inputFilePath: string, outputFilePath: string, pattern: string) {
        if (this.isRipgrepExecVaild) {
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
            const result = await searchByFs(
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
