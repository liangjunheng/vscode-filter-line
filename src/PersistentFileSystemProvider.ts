import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class PersistentFileSystemProvider implements vscode.FileSystemProvider {
  private storagePath: string;
  private _emitter: vscode.EventEmitter<vscode.FileChangeEvent[]>;

  constructor(context: vscode.ExtensionContext) {
    this.storagePath = path.join(context.globalStorageUri.fsPath, 'cache', 'virtual-files');
    fs.mkdirSync(this.storagePath, { recursive: true });

    this._emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  }

  get onDidChangeFile(): vscode.Event<vscode.FileChangeEvent[]> {
    return this._emitter.event;
  }

  private getFilePath(uri: vscode.Uri): string {
    return path.join(this.storagePath, encodeURIComponent(uri.path));
  }

  public exists(uri: vscode.Uri): boolean {
    return fs.existsSync(this.getFilePath(uri));
  }

  stat(uri: vscode.Uri): vscode.FileStat {
    return {
      type: vscode.FileType.File,
      ctime: Date.now(),
      mtime: Date.now(),
      size: this.readFile(uri).length
    };
  }

  readFile(uri: vscode.Uri): Uint8Array {
    // first, get realPath
    const realFilePath = this.getRealFileFromVirtureFile(uri);
    console.log("readFile, virtualFileUri " + uri + ", realFilePath " + realFilePath)
    if (realFilePath && fs.existsSync(realFilePath)) {
      console.log("readFile, get realFilePath success!")
      return fs.readFileSync(realFilePath);
    }

    // fail, get virtual file content
    const filePath = this.getFilePath(uri);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
    return Buffer.from('');
  }

  /**
   * realpath convert to virtualpath.
   * In order to change the tab label.
   */
  getVirtureFileFromRealFile(realFilePath: string, scheme: string, filename: string): vscode.Uri {
    // create virtual file path
    const virtualFileUri = vscode.Uri.parse(`${scheme}:/${Date.now()}/${encodeURIComponent(filename)}?realFilePath=${encodeURIComponent(realFilePath)}`);
    console.log("realFileToVirtureFile, virtualFileUri " + virtualFileUri + ", realFilePath " + realFilePath)
    return virtualFileUri
  }

  getRealFileFromVirtureFile(uri: vscode.Uri): string {
    const params = new URLSearchParams(uri.query);
    return decodeURIComponent(params.get('realFilePath') ?? "");
  }

  writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean }): void {
    const filePath = this.getFilePath(uri);
    fs.writeFileSync(filePath, content);
  }

  delete(uri: vscode.Uri): void {
    const filePath = this.getFilePath(uri);
    fs.unlinkSync(filePath);
  }

  rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): void {
    const oldPath = this.getFilePath(oldUri);
    const newPath = this.getFilePath(newUri);
    fs.renameSync(oldPath, newPath);
  }

  readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
    const files = fs.readdirSync(this.storagePath);
    return files.map(name => [decodeURIComponent(name), vscode.FileType.File]);
  }

  createDirectory(uri: vscode.Uri): void {
    // No-op for virtual FS
  }

  watch(uri: vscode.Uri, options: { recursive: boolean; excludes: string[] }): vscode.Disposable {
    const filePath = this.getFilePath(uri);
    if (!fs.existsSync(filePath)) return new vscode.Disposable(() => {});

    const watcher = fs.watch(filePath, () => {
      this._emitter.fire([{ type: vscode.FileChangeType.Changed, uri }]);
    });

    return new vscode.Disposable(() => watcher.close());
  }
}