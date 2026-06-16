const { app, BrowserWindow, ipcMain, dialog, shell, Menu, clipboard, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { version } = require('./package.json');

let mainWindow;

// 资源目录
// 开发模式：项目根目录的 src/（可写、可热重载）
// 打包模式：app.getPath('userData')/src/（必须可写，asar 里的只读）
const isDev = !app.isPackaged;
const DATA_DIR = isDev
  ? path.join(__dirname, 'src')
  : path.join(app.getPath('userData'), 'src');
const IMAGES_DIR = path.join(DATA_DIR, 'images');
const VIDEOS_DIR = path.join(DATA_DIR, 'videos');
const ICON_DIR = path.join(DATA_DIR, 'icon');
// 只读资源目录（图标、占位图等，存在于安装包/项目里）
const READONLY_ICON_DIR = path.join(__dirname, 'src', 'icon');

// 确保目录存在
function ensureDirs() {
  [DATA_DIR, IMAGES_DIR, VIDEOS_DIR, ICON_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// 解析文件路径：兼容绝对路径、相对路径（相对 DATA_DIR）、以及老式 src/xxx 写法
// renderer 端传过来时通常是 'src/images/xxx.jpg'，需要拼到 DATA_DIR
function resolveFilePath(filePath) {
  if (!filePath) return null;
  if (path.isAbsolute(filePath)) return filePath;
  // 去掉前导 src/（如果有），直接拼到 DATA_DIR
  const clean = filePath.replace(/^src[\\/]/, '');
  return path.join(DATA_DIR, clean);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: '奶蛙管理',
    autoHideMenuBar: true,
    show: false,
    icon: path.join(__dirname, 'src', 'icon', 'naiwa.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 去掉默认菜单栏
  Menu.setApplicationMenu(null);

  mainWindow.loadFile('index.html');

  // 页面加载完成后才显示窗口，避免白屏弹窗
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  ensureDirs();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ==================== 工具函数 ====================

// HTTP GET 请求封装
function httpGet(url, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ...extraHeaders,
    };
    const req = mod.get(url, { headers }, (res) => {
      // 处理重定向
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        httpGet(res.headers.location, extraHeaders).then(resolve).catch(reject);
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('请求超时')); });
  });
}

// 下载图片到本地
function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(destPath);
        downloadImage(res.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    });
    req.on('error', (err) => { file.close(); if (fs.existsSync(destPath)) fs.unlinkSync(destPath); reject(err); });
    req.setTimeout(20000, () => { req.destroy(); file.close(); if (fs.existsSync(destPath)) fs.unlinkSync(destPath); reject(new Error('下载超时')); });
  });
}

// ==================== IPC 处理 ====================

// 获取本地文件列表
ipcMain.handle('get-local-files', async () => {
  try {
    const toFileUrl = (relPath) => {
      const abs = path.join(DATA_DIR, relPath.replace(/^src[\\/]/, ''));
      return 'file:///' + abs.replace(/\\/g, '/').split('/').map(seg => encodeURIComponent(seg)).join('/');
    };

    const images = fs.readdirSync(IMAGES_DIR).filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'].includes(ext);
    }).map(f => ({
      name: f,
      path: `src/images/${f}`,
      url: toFileUrl(`src/images/${f}`),
      type: 'image',
    }));

    const videos = fs.readdirSync(VIDEOS_DIR).filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'].includes(ext);
    }).map(f => ({
      name: f,
      path: `src/videos/${f}`,
      url: toFileUrl(`src/videos/${f}`),
      type: 'video',
    }));

    return { success: true, data: { images, videos } };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 上传文件（复制到 src 目录）
ipcMain.handle('upload-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择要添加的图片或视频',
    filters: [
      { name: '图片和视频', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'] },
      { name: '图片', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'] },
      { name: '视频', extensions: ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'] },
    ],
    properties: ['openFile', 'multiSelections'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, error: 'canceled' };
  }

  const copied = [];
  const errors = [];

  for (const filePath of result.filePaths) {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);
    const isVideo = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'].includes(ext);
    const targetDir = isVideo ? VIDEOS_DIR : IMAGES_DIR;
    const targetPath = path.join(targetDir, fileName);

    try {
      let finalPath = targetPath;
      if (fs.existsSync(targetPath)) {
        const nameWithoutExt = path.basename(fileName, ext);
        finalPath = path.join(targetDir, `${nameWithoutExt}_${Date.now()}${ext}`);
      }
      fs.copyFileSync(filePath, finalPath);
      copied.push(path.basename(finalPath));
    } catch (err) {
      errors.push(`${fileName}: ${err.message}`);
    }
  }

  return {
    success: errors.length === 0,
    data: { copied, errors },
  };
});

// 删除文件
ipcMain.handle('delete-file', async (event, { filePath }) => {
  try {
    const fullPath = resolveFilePath(filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    } else {
      return { success: false, error: '文件不存在: ' + fullPath };
    }
    return { success: true };
  } catch (err) {
    console.error('[delete-file] Error:', err);
    return { success: false, error: err.message };
  }
});

// 获取文件的完整路径
ipcMain.handle('get-full-path', async (event, { filePath }) => {
  return resolveFilePath(filePath);
});

// 获取本地文件的 file:// URL（用于 img/video src 加载真实磁盘文件，避开 asar）
ipcMain.handle('get-file-url', async (event, { filePath }) => {
  const abs = resolveFilePath(filePath);
  // Windows 路径转 file:// URL：用正斜杠 + encodeURIComponent 处理中文/空格
  return 'file:///' + abs.replace(/\\/g, '/').split('/').map(seg => encodeURIComponent(seg)).join('/');
});

// ==================== 在线检索（多渠道并行） ====================

const PER_PAGE = 30;

// 构建搜索关键词（动图模式下追加关键词）
function buildQuery(keyword, gifOnly) {
  return gifOnly ? `${keyword} 动图` : keyword;
}

// 百度图片检索
async function searchBaidu(keyword, page = 0, gifOnly = false) {
  const query = buildQuery(keyword, gifOnly);
  const q = encodeURIComponent(query);
  const pn = page * PER_PAGE;

  // 动图模式：追加百度图片类型参数 istype=2（GIF），不额外加"动图"关键词
  const gifParams = gifOnly ? '&istype=2&z=&ic=0&st=-1&face=0' : '';

  const url = `https://image.baidu.com/search/acjson?tn=resultjson_com&ipn=rj&word=${q}&pn=${pn}&rn=${PER_PAGE}${gifParams}`;

  const body = await httpGet(url, {
    'Referer': 'https://image.baidu.com/',
    'Accept-Language': 'zh-CN,zh;q=0.9',
  });
  const text = body.toString('utf-8');

  let json;
  try {
    json = JSON.parse(text);
  } catch (e1) {
    try {
      const cb = text.replace(/^[^(]*\(/, '').replace(/\)\s*$/, '');
      json = JSON.parse(cb);
    } catch (e2) {
      console.error('[Baidu] JSON parse failed, raw:', text.substring(0, 200));
      return [];
    }
  }

  if (!json || !json.data || !Array.isArray(json.data)) {
    console.error('[Baidu] No data array, keys:', json ? Object.keys(json).join(',') : 'null');
    return [];
  }

  const results = json.data
    .filter(item => item && (item.thumbURL || item.middleURL || item.replaceUrl))
    .map(item => ({
      thumb: item.thumbURL || item.middleURL || item.replaceUrl || '',
      full: item.middleURL || item.thumbURL || item.replaceUrl || '',
      title: (item.fromPageTitle || '').replace(/<\/?[^>]+>/g, '').trim(),
      source: '百度',
    }));

  console.log(`[Baidu] page=${page} gifOnly=${gifOnly} results=${results.length}`);
  return results;
}

// 必应图片检索
async function searchBing(keyword, page = 0, gifOnly = false) {
  const query = buildQuery(keyword, gifOnly);
  const first = page * PER_PAGE;
  const url = `https://cn.bing.com/images/async?q=${encodeURIComponent(query)}&first=${first}&count=${PER_PAGE}&mmasync=1`;
  const body = await httpGet(url, {
    'Referer': 'https://cn.bing.com/',
    'Accept-Language': 'zh-CN,zh;q=0.9',
  });
  const html = body.toString('utf-8');
  const results = [];

  // 匹配 murl（原图）和 turl（缩略图）
  const murlRegex = /murl&quot;:&quot;(https?:\/\/[^&]+)&quot;/gi;
  const turlRegex = /turl&quot;:&quot;(https?:\/\/[^&]+)&quot;/gi;

  const murls = []; const turls = [];
  let match;
  while ((match = murlRegex.exec(html)) !== null) murls.push(match[1]);
  while ((match = turlRegex.exec(html)) !== null) turls.push(match[1]);

  const len = Math.min(murls.length, turls.length);
  for (let i = 0; i < len; i++) {
    results.push({
      thumb: turls[i],
      full: murls[i] || turls[i],
      title: '',
      source: '必应',
    });
  }

  console.log(`[Bing] found ${results.length} images`);
  return results;
}

// 搜狗图片检索（HTML 页面抓取）
async function searchSogou(keyword, page = 0, gifOnly = false) {
  const query = buildQuery(keyword, gifOnly);
  const start = page * PER_PAGE;
  const url = `https://pic.sogou.com/pics?query=${encodeURIComponent(query)}&mode=1&start=${start}&xml_len=${PER_PAGE}`;
  const body = await httpGet(url, {
    'Referer': 'https://pic.sogou.com/',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Accept': 'text/html,application/xhtml+xml',
  });
  const html = body.toString('utf-8');
  const results = [];

  // 搜狗页面中图片数据格式：pic_url:'URL' 或 "pic_url":"URL"
  const picUrlRegex = /pic_url['"]?\s*:\s*['"]?(https?:\/\/[^'",\s]+)['"]?/gi;
  const thumbUrlRegex = /thumbUrl['"]?\s*:\s*['"]?(https?:\/\/[^'",\s]+)['"]?/gi;

  const picUrls = []; const thumbUrls = [];
  let match;
  while ((match = picUrlRegex.exec(html)) !== null) picUrls.push(match[1]);
  while ((match = thumbUrlRegex.exec(html)) !== null) thumbUrls.push(match[1]);

  const len = Math.min(picUrls.length, thumbUrls.length);
  for (let i = 0; i < len; i++) {
    results.push({
      thumb: thumbUrls[i],
      full: picUrls[i] || thumbUrls[i],
      title: '',
      source: '搜狗',
    });
  }

  console.log(`[Sogou] found ${results.length} images`);
  return results;
}

// 360图片检索
async function search360(keyword, page = 0, gifOnly = false) {
  const query = buildQuery(keyword, gifOnly);
  const sn = page * PER_PAGE;
  const url = `https://image.so.com/j?q=${encodeURIComponent(query)}&sn=${sn}&ps=${PER_PAGE}`;
  const body = await httpGet(url, { 'Referer': 'https://image.so.com/' });
  const json = JSON.parse(body.toString('utf-8'));
  if (!json.list || !Array.isArray(json.list)) return [];
  return json.list.map(item => ({
    thumb: item.thumb || item.img || '',
    full: item.img || item.thumb || '',
    title: (item.title || '').replace(/<\/?[^>]+>/g, '').trim(),
    source: '360',
  }));
}

ipcMain.handle('search-images', async (event, { keyword, page = 0, gifOnly = false }) => {
  const query = keyword || '奶蛙';

  try {
    // 百度优先，4个引擎并行搜索
    const results = await Promise.allSettled([
      searchBaidu(query, page, gifOnly),
      searchBing(query, page, gifOnly),
      searchSogou(query, page, gifOnly),
      search360(query, page, gifOnly),
    ]);

    // 百度结果排最前面
    const allImages = [];
    results.forEach((r) => {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        allImages.push(...r.value);
      } else if (r.status === 'rejected') {
        console.error('[Search] engine failed:', r.reason?.message);
      }
    });

    console.log(`[Search] total=${allImages.length} page=${page}`);

    return {
      success: true,
      data: {
        images: allImages,
        page,
        hasMore: allImages.length >= PER_PAGE,
      },
    };
  } catch (err) {
    return { success: false, error: err.message || '检索失败，请检查网络连接' };
  }
});

// 下载在线图片到本地
ipcMain.handle('download-image', async (event, { imageUrl }) => {
  try {
    // 从 URL 提取文件名
    const urlObj = new URL(imageUrl);
    let fileName = path.basename(urlObj.pathname);
    if (!fileName || fileName.length < 3) {
      fileName = `naiwa_${Date.now()}.jpg`;
    }
    // 确保有扩展名
    if (!path.extname(fileName)) {
      fileName += '.jpg';
    }

    let destPath = path.join(IMAGES_DIR, fileName);
    if (fs.existsSync(destPath)) {
      const ext = path.extname(fileName);
      const base = path.basename(fileName, ext);
      destPath = path.join(IMAGES_DIR, `${base}_${Date.now()}${ext}`);
    }

    await downloadImage(imageUrl, destPath);

    return { success: true, data: { fileName: path.basename(destPath) } };
  } catch (err) {
    return { success: false, error: err.message || '下载失败' };
  }
});

// 打开文件所在目录
ipcMain.handle('open-file-location', async (event, { filePath }) => {
  const fullPath = resolveFilePath(filePath);
  if (fs.existsSync(fullPath)) {
    shell.showItemInFolder(fullPath);
  } else {
    shell.openPath(path.dirname(fullPath));
  }
  return { success: true };
});

// 用系统默认程序打开文件
ipcMain.handle('open-external', async (event, { filePath }) => {
  const fullPath = resolveFilePath(filePath);
  await shell.openPath(fullPath);
  return { success: true };
});

// 打开外部 URL
ipcMain.handle('open-external-url', async (event, { url }) => {
  await shell.openExternal(url);
  return { success: true };
});

// 切换开发者工具
ipcMain.handle('toggle-devtools', async () => {
  if (mainWindow) {
    mainWindow.webContents.toggleDevTools();
  }
  return { success: true };
});

// 批量删除文件
ipcMain.handle('delete-files', async (event, { filePaths }) => {
  const results = { deleted: [], failed: [] };
  for (const filePath of filePaths) {
    try {
      const fullPath = resolveFilePath(filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        results.deleted.push(filePath);
      } else {
        results.failed.push({ path: filePath, error: '文件不存在' });
      }
    } catch (err) {
      results.failed.push({ path: filePath, error: err.message });
    }
  }
  return { success: results.failed.length === 0, data: results };
});

// 获取应用信息
ipcMain.handle('get-app-info', async () => {
  return {
    version,
    author: 'OsDepK',
    updateUrl: 'http://osdepk.cn',
    name: '奶蛙管理',
  };
});

// 版本号转数字（1.0.0 → 100）
function versionToCode(ver) {
  const parts = ver.split('.');
  return parseInt(parts[0]) * 100 + parseInt(parts[1] || 0) * 10 + parseInt(parts[2] || 0);
}
const versionCode = versionToCode(version);
console.log(`[App] 当前版本: ${version} (${versionCode})`);

// 获取关于页面动态菜单选项
ipcMain.handle('get-about-menu', async () => {
  const apiUrls = [
    'http://osdepk.cn/ospm/api/about/naiwa_manager',
    'http://osdepk.cn/ospm/api/about.php?key=naiwa_manager',
  ];

  for (const apiUrl of apiUrls) {
    try {
      const body = await httpGet(apiUrl, {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      });
      const text = body.toString('utf-8');
      console.log('[AboutMenu] URL:', apiUrl, 'len:', text.length);

      let json;
      try { json = JSON.parse(text); } catch (parseErr) {
        console.error('[AboutMenu] JSON parse error:', parseErr.message, 'preview:', text.substring(0, 200));
        continue;
      }

      // 新格式：{ code, options: [{ title, url }], items: [{ name, url }] }
      // options[].title 和 items[].name 都可以作为显示名称
      let rawItems = json.items || json.options || json.data;

      // 兼容顶层直接数组
      if (!rawItems && Array.isArray(json)) rawItems = json;

      if (!Array.isArray(rawItems) || rawItems.length === 0) {
        console.log('[AboutMenu] No items found, keys:', Object.keys(json).join(','));
        continue;
      }

      const result = rawItems.map(item => ({
        name: item.name || item.title || item.label || '',
        url: item.url || item.link || '',
        action: item.action || 'openUrl',
      })).filter(item => item.name);

      if (result.length > 0) {
        console.log(`[AboutMenu] Got ${result.length} items`);
        return { success: true, data: { items: result } };
      }
    } catch (err) {
      console.error('[AboutMenu] Request failed:', apiUrl, err.message);
    }
  }

  // 所有地址都失败
  return { success: true, data: { items: [] } };
});

// 检查更新（从后台 API 获取最新版本信息）
// 文档地址：http://osdepk.cn/ospm/api/version.php?key=naiwa_manager
// 返回格式：{ code, version, version_code, download_url, changelog, force_update }
// 判断逻辑：server.version_code > localVersionCode → 有更新
ipcMain.handle('check-update', async () => {
  const apiUrl = 'http://osdepk.cn/ospm/api/version.php?key=naiwa_manager';

  // 尝试 http，失败回退 https
  for (const protocol of ['http', 'https']) {
    const url = protocol === 'http' ? apiUrl : apiUrl.replace('http://', 'https://');
    try {
      console.log('[CheckUpdate] Trying:', url);
      const body = await httpGet(url, {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      });
      const text = body.toString('utf-8');
      console.log('[CheckUpdate] Response len:', text.length);

      let json;
      try {
        json = JSON.parse(text);
      } catch {
        console.error('[CheckUpdate] Not JSON:', text.substring(0, 200));
        continue;
      }

      // 扁平格式：{ code, version, version_code, download_url, changelog, force_update }
      const serverVersion = json.version || '';
      const downloadUrl = json.download_url || '';
      const changelog = json.changelog || '';
      const forceUpdate = json.force_update === true;

      // 优先从 version 字符串解析（更可靠），兜底用 version_code 整数字段
      let serverVersionCode = versionToCode(serverVersion);
      if (serverVersionCode === 0 && json.version_code != null) {
        const raw = json.version_code;
        // version_code 可能是数字 101 或字符串 "1.0.1"
        if (typeof raw === 'string') {
          serverVersionCode = versionToCode(raw);
        } else {
          serverVersionCode = parseInt(raw) || 0;
        }
      }
      if (serverVersionCode === 0 && serverVersion) {
        // 最后兜底：直接比较字符串
        serverVersionCode = -1; // 标记用字符串比较
      }

      console.log(`[CheckUpdate] server: v${serverVersion}(code=${serverVersionCode}) local: v${version}(${versionCode})`);

      if (serverVersionCode > 0) {
        const hasUpdate = serverVersionCode > versionCode;
        console.log(`[CheckUpdate] compare: ${serverVersionCode} > ${versionCode} = ${hasUpdate}`);
        return {
          success: true,
          data: {
            url, reachable: true,
            currentVersion: version,
            latestVersion: serverVersion || String(serverVersionCode),
            hasUpdate,
            downloadUrl,
            changelog,
            isForce: forceUpdate,
          },
        };
      }

      if (serverVersionCode === -1 || (serverVersion && serverVersion !== '0.0.0')) {
        const hasUpdate = serverVersion !== version;
        console.log(`[CheckUpdate] string compare: "${serverVersion}" !== "${version}" = ${hasUpdate}`);
        return {
          success: true,
          data: {
            url, reachable: true,
            currentVersion: version,
            latestVersion: serverVersion,
            hasUpdate,
            downloadUrl,
            changelog,
            isForce: forceUpdate,
          },
        };
      }

      // 服务器可达但无版本（version=0.0.0 或 version_code=0）
      return {
        success: true,
        data: {
          url, reachable: true,
          currentVersion: version,
          latestVersion: null, hasUpdate: false,
          message: '更新服务器已连接，但暂无版本数据',
        },
      };
    } catch (err) {
      console.error('[CheckUpdate] Failed:', url, err.message);
    }
  }

  return {
    success: false,
    error: '无法连接到更新服务器，请稍后重试',
    data: { currentVersion: version },
  };
});

// 复制图片到剪贴板（支持本地文件路径或在线 URL）
// 关键原理（Windows）：
//   - 静态图：clipboard.writeImage() 即可，QQ/微信能识别 image/png
//   - 动图 GIF：用 Set-Clipboard -Path 写入真实文件路径
//     Electron 没有直接的 CF_HDROP API，PowerShell 的 Set-Clipboard -Path
//     走 OLE 通道正确访问用户会话剪贴板
ipcMain.handle('copy-to-clipboard', async (event, { imagePath, imageUrl }) => {
  try {
    if (imagePath) {
      // 解析到 userData 真实物理路径（开发模式 / 打包模式都正确）
      const absPath = resolveFilePath(imagePath);
      if (!fs.existsSync(absPath)) {
        return { success: false, error: '文件不存在：' + absPath };
      }

      const ext = path.extname(absPath).toLowerCase();
      const isGif = ext === '.gif';

      if (isGif && process.platform === 'win32') {
        // GIF 动图：用 PowerShell Set-Clipboard -Path 写入真实文件路径
        return await copyFileDropListWin32([absPath]);
      }

      // 静态图：用 NativeImage 写入位图
      const img = nativeImage.createFromPath(absPath);
      if (!img.isEmpty()) {
        clipboard.writeImage(img);
      } else {
        const buffer = fs.readFileSync(absPath);
        const mime = ext === '.webp' ? 'image/webp' : ext === '.bmp' ? 'image/bmp' : 'image/png';
        const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;
        clipboard.writeImage(nativeImage.createFromDataURL(dataUrl));
      }
      return { success: true };
    }

    if (imageUrl) {
      const isOnlineGif = /\.gif($|\?)/i.test(imageUrl);

      // 先下载图片
      const result = await new Promise((resolve, reject) => {
        const mod = imageUrl.startsWith('https') ? https : http;
        mod.get(imageUrl, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'image/*' }, timeout: 15000 }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const redirectMod = res.headers.location.startsWith('https') ? https : http;
            redirectMod.get(res.headers.location, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 }, (r2) => {
              const chunks = [];
              r2.on('data', c => chunks.push(c));
              r2.on('end', () => resolve(Buffer.concat(chunks)));
            }).on('error', reject);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error('HTTP ' + res.statusCode));
            return;
          }
          const chunks = [];
          res.on('data', c => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
        }).on('error', reject).setTimeout(15000);
      });

      if (isOnlineGif && process.platform === 'win32') {
        // 在线 GIF：先存到临时文件，再用 Set-Clipboard -Path
        const tmpDir = path.join(app.getPath('temp'), 'naiwa-copy');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        const tmpFile = path.join(tmpDir, `naiwa_${Date.now()}.gif`);
        fs.writeFileSync(tmpFile, result);
        return copyFileDropListWin32([tmpFile]);
      }

      // 在线静态图：用 NativeImage
      const dataUrl = `data:image/png;base64,${result.toString('base64')}`;
      const img = nativeImage.createFromDataURL(dataUrl);
      if (img.isEmpty()) return { success: false, error: '无法解析图片数据' };
      clipboard.writeImage(img);
      return { success: true };
    }

    return { success: false, error: '未指定图片路径或URL' };
  } catch (err) {
    console.error('[CopyToClipboard] Error:', err.message);
    return { success: false, error: err.message };
  }
});

// Windows: 用 PowerShell Set-Clipboard -LiteralPath 写入 CF_HDROP 格式
// 关键：使用 -LiteralPath（不做变量展开） + 通过 .ps1 脚本文件传参（避免命令行转义问题）
// PowerShell 必须 -STA（单线程单元）才能访问桌面 session 剪贴板
function copyFileDropListWin32(filePaths) {
  if (process.platform !== 'win32') {
    return { success: false, error: '此方法仅支持 Windows' };
  }

  const { spawn } = require('child_process');
  const tmpDir = path.join(app.getPath('temp'), 'naiwa-copy');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  // 写一个临时 ps1 脚本，避免命令行转义 / 长度限制
  // 用 [System.IO.Path]::GetFullPath 规范化路径（处理 \1 \2 等特殊字符）
  const scriptPath = path.join(tmpDir, `copy_${Date.now()}_${process.pid}.ps1`);
  // PowerShell here-string 用 @'...'@，单引号表示字面量不做变量展开
  const psLines = [
    "try {",
    "  $paths = @(",
  ];
  filePaths.forEach(p => {
    // PowerShell 单引号字符串字面量：唯一的转义是 '' → '
    // 反斜杠不需要转义（PowerShell 单引号字面量不做转义处理）
    const safe = String(p).replace(/'/g, "''");
    psLines.push(`    '${safe}'`);
  });
  psLines.push("  )");
  psLines.push("  # 规范化路径，避免 \\\\1 \\\\2 等转义字符陷阱");
  psLines.push("  $paths = $paths | ForEach-Object { [System.IO.Path]::GetFullPath($_) }");
  psLines.push("  foreach ($p in $paths) { if (-not (Test-Path -LiteralPath $p)) { throw \"文件不存在: $p\" } }");
  psLines.push("  Set-Clipboard -LiteralPath $paths");
  psLines.push("  exit 0");
  psLines.push("} catch {");
  psLines.push("  [Console]::Error.WriteLine($_.Exception.Message)");
  psLines.push("  exit 1");
  psLines.push("}");

  fs.writeFileSync(scriptPath, psLines.join('\r\n'), 'utf8');

  return new Promise((resolve) => {
    const child = spawn('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-STA',          // OLE 剪贴板硬性要求：单线程单元
      '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath,
    ], {
      stdio: 'pipe',
      windowsHide: true,
      shell: false,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => stdout += d.toString());
    child.stderr.on('data', d => stderr += d.toString());

    const timer = setTimeout(() => {
      try { child.kill(); } catch (e) {}
      // 清理临时脚本
      try { fs.unlinkSync(scriptPath); } catch (e) {}
      resolve({ success: false, error: 'PowerShell 调用超时' });
    }, 10000);

    child.on('error', (err) => {
      clearTimeout(timer);
      try { fs.unlinkSync(scriptPath); } catch (e) {}
      console.error('[copyFileDropListWin32] spawn error:', err.message);
      resolve({ success: false, error: err.message });
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      // 清理临时脚本
      try { fs.unlinkSync(scriptPath); } catch (e) {}
      if (code === 0) {
        resolve({ success: true });
      } else {
        console.error('[copyFileDropListWin32] PS exit code:', code, 'stderr:', stderr);
        // 提取关键错误信息
        const errLine = stderr.split(/\r?\n/).find(l => l.trim()) || 'PowerShell 退出码 ' + code;
        resolve({ success: false, error: errLine });
      }
    });
  });
}