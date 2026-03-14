import { app, BrowserWindow } from 'electron';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeAppContext } from './services/app-context';
import { registerIpc } from './ipc/register';

let mainWindow: BrowserWindow | null = null;
const __dirname = dirname(fileURLToPath(import.meta.url));

async function createWindow() {
  const context = await initializeAppContext(app);
  registerIpc(context);

  mainWindow = new BrowserWindow({
    width: 1520,
    height: 940,
    minWidth: 1280,
    minHeight: 820,
    show: false,
    backgroundColor: '#05060f',
    autoHideMenuBar: true,
    title: 'Mid-Mine Launcher',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});
