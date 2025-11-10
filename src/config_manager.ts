import { ctx } from "./extension";
import * as vscode from 'vscode';

export type PresetFilterItem = { "name": string, "pattern": string, "ignoreCase": boolean, "regexMode": boolean, "invertMatch": boolean };
export function getPresetFilters(): PresetFilterItem[] {
    return vscode.workspace.getConfiguration('filter-line').get<PresetFilterItem[]>('presetFilters', []);
}

export function isDisplayFilenamesWhenFilterDir(): boolean {
    return vscode.workspace.getConfiguration('filter-line').get('displayFilenamesWhenFilterDir', true);
}

export function isEnableStringMatchInRegex(): boolean {
    return vscode.workspace.getConfiguration('filter-line').get('enableStringMatchInRegex', true);
}

export function isSingleSeachBoxMode(): boolean {
    return vscode.workspace.getConfiguration('filter-line').get('enableSingleSeachBoxMode', false);
}

export function getHistoryMaxSizeConfig(): number {
    return vscode.workspace.getConfiguration('filter-line').get('historySize', 300);
}

export function getNumberOfTargetContextLines(): number {
    return vscode.workspace.getConfiguration('filter-line').get('numberOfTargetContextLines', 1000);
}

//////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////
export function setLastUserInput(text: string): Thenable<void> {
   return ctx.globalState.update("lastInputValue", text);
}

export function getLastUserInput(): string {
    return ctx.globalState.get("lastInputValue", '');
}

export function setIgnoreCaseMode(enable: boolean): Thenable<void> {
    return ctx.globalState.update("enableIgnoreCase", enable);
}

export function getIgnoreCaseMode(): boolean {
    return ctx.globalState.get("enableIgnoreCase", true);
}

export function setRegexMode(enable: boolean): Thenable<void> {
    return ctx.globalState.update("enableRegexMode", enable);
}

export function getRegexMode(): boolean {
    return ctx.globalState.get("enableRegexMode", true);
}

export function setInvertMatchMode(enable: boolean): Thenable<void> {
    return ctx.globalState.update("enableInvertMatchMode", enable);
}

export function getInvertMatchMode(): boolean {
    return ctx.globalState.get("enableInvertMatchMode", false);
}
