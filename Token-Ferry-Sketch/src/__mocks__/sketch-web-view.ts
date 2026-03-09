// Mock for sketch-module-web-view
export default class BrowserWindow {
  constructor(_opts: unknown) {}
  once(_event: string, _cb: () => void) {}
  show() {}
  loadURL(_url: string) {}
  webContents = {
    on(_event: string, _cb: (...args: unknown[]) => void) {},
    executeJavaScript(_js: string) {},
  };
}
