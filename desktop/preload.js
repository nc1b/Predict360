'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('predict360', {
  invoke: (action) => {
    if (!['get', 'start', 'pause', 'connect', 'sync', 'website', 'disconnect', 'delete', 'explain'].includes(action)) return Promise.reject(new Error('Unknown action'));
    return ipcRenderer.invoke(`activity:${action}`);
  },
  subscribe: (callback) => {
    const listener = (event, state) => callback(state);
    ipcRenderer.on('activity:state', listener);
    return () => ipcRenderer.removeListener('activity:state', listener);
  },
});
