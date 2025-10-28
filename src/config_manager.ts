import { ctx } from "./extension";
import * as vscode from 'vscode';

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
    return vscode.workspace.getConfiguration('filter-line').get('historySize', 30);
}

//////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////

export function setIgnoreCaseMode(enable: boolean) {
    ctx.globalState.update("enableIgnoreCase", enable);
}

export function getIgnoreCaseMode(): boolean {
    return ctx.globalState.get("enableIgnoreCase", false);
}

export function setRegexMode(enable: boolean) {
    ctx.globalState.update("enableRegexMode", enable);
}

export function getRegexMode(): boolean {
    return ctx.globalState.get("enableRegexMode", false);
}

export function setInvertMatchMode(enable: boolean) {
    ctx.globalState.update("enableInvertMatchMode", enable);
}

export function getInvertMatchMode(): boolean {
    return ctx.globalState.get("enableInvertMatchMode", false);
}
