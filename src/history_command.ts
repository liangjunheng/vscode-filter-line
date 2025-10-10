import * as vscode from 'vscode';

class HistoryCommand {
    private mHistory: any;
    private ctx: vscode.ExtensionContext;

    constructor(ctx: vscode.ExtensionContext) {
        this.ctx = ctx
        this.mHistory = ctx.globalState.get('history', {});
    }

    getHistoryMaxSizeConfig(): number {
        return vscode.workspace.getConfiguration('filter-line').get('historySize', 30);
    }

    getHistory(key: string): string[] {
        return this.mHistory[key];
    }

    async updateHistory(key: string, hist: string[]) {
        this.mHistory[key] = hist;
        await this.ctx.globalState.update('history', this.mHistory);
    }

    async addToHistory(key: string, newEl: string) {
        if (this.mHistory[key] === undefined) {
            console.warn(`History doesn't contain '${key}' field`);
            return;
        }

        // deduplication
        if (this.mHistory[key].indexOf(newEl) === 0) {
            return
        }

        const maxSz = this.getHistoryMaxSizeConfig();
        if (this.mHistory[key].length >= maxSz) {
            for (let i = this.mHistory[key].length; i > maxSz - 1; i--) {
                this.mHistory[key].pop();
            }
        }
        // remove duplicate data
        this.mHistory[key] = this.mHistory[key].filter((item: string) => item !== newEl);
        // add data
        this.mHistory[key].unshift(newEl);
        await this.ctx.globalState.update('history', this.mHistory);
    }
}
export { HistoryCommand };


