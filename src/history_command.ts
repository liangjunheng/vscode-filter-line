import * as vscode from 'vscode';
import * as fs from 'fs';
import { getHistoryMaxSizeConfig } from './config_manager';
import path = require('path');

class HistoryCommand {
    private mHistory: string[] = [];
    private histroyStorePath = ''

    constructor(ctx: vscode.ExtensionContext) {
        const globalStoragePath = path.dirname(ctx.globalStorageUri.fsPath)
        this.histroyStorePath = path.join(path.dirname(globalStoragePath), "snippets", "history.filterlinepro.json")
        if (!fs.existsSync(path.dirname(this.histroyStorePath))) {
            fs.mkdirSync(this.histroyStorePath, { recursive: true });
        }
        console.log(`histroyStorePath: ${this.histroyStorePath}`)
        if (fs.existsSync(this.histroyStorePath)) {
            this.mHistory = fs.readFileSync(this.histroyStorePath, { encoding: "utf8" }).split('\n')
        }
        console.log(`histroyStorePath: ${this.mHistory.join(',')}`)
    }

    getHistory(): string[] {
        return this.mHistory;
    }

    async updateHistory(hist: string[]) {
        this.mHistory = hist;
        fs.writeFileSync(this.histroyStorePath, this.mHistory.join('\n'), { encoding: "utf8" });
    }

    async addToHistory(newEl: string) {
        // deduplication
        if (newEl.trim() === '' || newEl.trim() === '\n' || this.mHistory.indexOf(newEl) === 0) {
            return
        }

        const maxSz = getHistoryMaxSizeConfig();
        if (this.mHistory.length >= maxSz) {
            for (let i = this.mHistory.length; i > maxSz - 1; i--) {
                this.mHistory.pop();
            }
        }
        // remove duplicate data
        this.mHistory = this.mHistory.filter((item: string) => item !== newEl);
        // add data
        this.mHistory.unshift(newEl);
        fs.writeFileSync(this.histroyStorePath, this.mHistory.join('\n'), { encoding: "utf8" });
    }
}
export { HistoryCommand };


