const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('naiwaAPI', {
  // 获取本地文件列表
  getLocalFiles: () => ipcRenderer.invoke('get-local-files'),

  // 上传文件
  uploadFiles: () => ipcRenderer.invoke('upload-files'),

  // 删除单个文件
  deleteFile: (filePath) => ipcRenderer.invoke('delete-file', { filePath }),

  // 批量删除文件
  deleteFiles: (filePaths) => ipcRenderer.invoke('delete-files', { filePaths }),

  // 获取完整路径
  getFullPath: (filePath) => ipcRenderer.invoke('get-full-path', { filePath }),
  getFileUrl: (filePath) => ipcRenderer.invoke('get-file-url', { filePath }),

  // 在线搜索图片
  searchImages: (keyword, page = 0, gifOnly = false) => ipcRenderer.invoke('search-images', { keyword, page, gifOnly }),

  // 下载在线图片到本地
  downloadImage: (imageUrl) => ipcRenderer.invoke('download-image', { imageUrl }),

  // 打开文件所在目录
  openFileLocation: (filePath) => ipcRenderer.invoke('open-file-location', { filePath }),

  // 用系统程序打开
  openExternal: (filePath) => ipcRenderer.invoke('open-external', { filePath }),

  // 检查更新
  checkUpdate: () => ipcRenderer.invoke('check-update'),

  // 获取应用信息
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // 切换开发者工具
  toggleDevTools: () => ipcRenderer.invoke('toggle-devtools'),

  // 打开外部链接（URL）
  openUrl: (url) => ipcRenderer.invoke('open-external-url', { url }),

  // 获取关于页面动态菜单
  getAboutMenu: () => ipcRenderer.invoke('get-about-menu'),

  // 复制图片到剪贴板（本地文件路径或在线URL）
  copyToClipboard: (imagePath, imageUrl) => ipcRenderer.invoke('copy-to-clipboard', { imagePath, imageUrl }),
});