import { app, Menu, MenuItemConstructorOptions, shell } from 'electron';

export function setupMenu() {
  const isMac = process.platform === 'darwin';

  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{
      label: app.getName(),
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Export Favorites',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            // Will be implemented via IPC
          }
        },
        { type: 'separator' as const },
        isMac ? { role: 'close' as const } : { role: 'quit' as const }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle' as const },
          { role: 'delete' as const },
          { role: 'selectAll' as const }
        ] : [
          { role: 'delete' as const },
          { type: 'separator' as const },
          { role: 'selectAll' as const }
        ])
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const }
      ]
    },
    {
      label: 'Navigate',
      submenu: [
        {
          label: 'Explore',
          accelerator: '1',
          click: () => {
            // Will be implemented via IPC
          }
        },
        {
          label: 'Birthday',
          accelerator: '2',
          click: () => {
            // Will be implemented via IPC
          }
        },
        {
          label: 'Observe',
          accelerator: '3',
          click: () => {
            // Will be implemented via IPC
          }
        },
        {
          label: 'Objects',
          accelerator: '4',
          click: () => {
            // Will be implemented via IPC
          }
        },
        {
          label: 'Favorites',
          accelerator: '5',
          click: () => {
            // Will be implemented via IPC
          }
        },
        {
          label: 'Settings',
          accelerator: '6',
          click: () => {
            // Will be implemented via IPC
          }
        },
        { type: 'separator' as const },
        {
          label: 'Search',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            // Will be implemented via IPC
          }
        },
        {
          label: 'Quick Actions',
          accelerator: 'CmdOrCtrl+K',
          click: () => {
            // Will be implemented via IPC
          }
        }
      ]
    },
    {
      label: 'Tools',
      submenu: [
        {
          label: 'Refresh Data',
          accelerator: 'R',
          click: () => {
            // Will be implemented via IPC
          }
        },
        {
          label: 'Clear Cache',
          click: () => {
            // Will be implemented via IPC
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: async () => {
            await shell.openExternal('https://github.com/astronomer/docs');
          }
        },
        {
          label: 'Report Issue',
          click: async () => {
            await shell.openExternal('https://github.com/astronomer/issues');
          }
        },
        { type: 'separator' as const },
        {
          label: 'About NASA APIs',
          click: async () => {
            await shell.openExternal('https://api.nasa.gov/');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}