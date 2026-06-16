// ========== 奶蛙管理 - 渲染进程 ==========

let currentPreviewFile = null;
let searchPage = 0;
let searchKeyword = '';
let searchLoading = false;
let searchHasMore = true;
let searchObserver = null;
let selectMode = false;
let selectedFiles = new Set();
let currentGridId = '';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initUpload();
  initSearch();
  initPreviewModal();
  initBatchBar();
  initAbout();
  loadLocalFiles();
});

// ========== Tab 切换 ==========
function initTabs() {
  const navBtns = $$('.nav-btn');
  const tabs = $$('.tab-content');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;

      navBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      tabs.forEach(t => t.classList.remove('active'));
      $(`#tab-${tabName}`).classList.add('active');

      exitSelectMode();
      if (tabName === 'local') loadLocalFiles();
      if (tabName === 'images') loadImages();
      if (tabName === 'videos') loadVideos();
    });
  });
}

// ========== 文件上传 ==========
function initUpload() {
  $('#btn-upload')?.addEventListener('click', handleUpload);
  $('#btn-upload-top')?.addEventListener('click', handleUpload);
  $('#btn-upload-images')?.addEventListener('click', handleUpload);
  $('#btn-upload-videos')?.addEventListener('click', handleUpload);
  $('#btn-refresh')?.addEventListener('click', () => { exitSelectMode(); loadLocalFiles(); });
}

async function handleUpload() {
  const result = await window.naiwaAPI.uploadFiles();
  if (result.success) {
    loadLocalFiles();
    if (result.data?.copied?.length > 0) {
      showToast(`已添加 ${result.data.copied.length} 个文件`);
    }
  }
  if (result.data?.errors?.length > 0) {
    showToast(`部分文件添加失败: ${result.data.errors.join(', ')}`, 'error');
  }
}

// ========== 批量选择工具栏 ==========
function initBatchBar() {
  $('#btn-operate-mode')?.addEventListener('click', () => enterSelectMode('local-images-grid,local-videos-grid'));
  $('#btn-operate-mode-images')?.addEventListener('click', () => enterSelectMode('images-grid'));
  $('#btn-operate-mode-videos')?.addEventListener('click', () => enterSelectMode('videos-grid'));
  $('#btn-exit-select')?.addEventListener('click', exitSelectMode);
  $('#btn-select-all')?.addEventListener('click', selectAll);
  $('#btn-deselect-all')?.addEventListener('click', deselectAll);
  $('#btn-batch-delete')?.addEventListener('click', batchDelete);

  // 区域全选复选框
  $('#check-all-images')?.addEventListener('change', () => toggleSection('local-images-grid', $('#check-all-images').checked));
  $('#check-all-videos')?.addEventListener('change', () => toggleSection('local-videos-grid', $('#check-all-videos').checked));
}

function toggleSection(gridId, checked) {
  const grid = $(`#${gridId}`);
  if (!grid) return;
  grid.querySelectorAll('.media-card').forEach(card => {
    const cb = card.querySelector('.card-checkbox');
    if (cb) {
      cb.checked = checked;
      if (checked) {
        card.classList.add('selected');
        selectedFiles.add(cb.dataset.path);
      } else {
        card.classList.remove('selected');
        selectedFiles.delete(cb.dataset.path);
      }
    }
  });
  updateBatchCount();
}

function enterSelectMode(gridIds) {
  selectMode = true;
  currentGridId = gridIds;
  selectedFiles.clear();
  $('#batch-bar').classList.add('active');
  document.body.classList.add('select-mode');
  // 显示所有复选框和区域全选
  const grids = gridIds.split(',').map(id => $(`#${id}`)).filter(Boolean);
  grids.forEach(grid => {
    grid.querySelectorAll('.card-checkbox').forEach(cb => cb.style.display = '');
  });
  // 显示全部文件页的区域全选复选框
  $$('.section-select').forEach(el => el.style.display = '');
  // 清除区域复选框
  $('#check-all-images').checked = false;
  $('#check-all-videos').checked = false;
  updateBatchCount();
}

function exitSelectMode() {
  selectMode = false;
  selectedFiles.clear();
  $('#batch-bar').classList.remove('active');
  document.body.classList.remove('select-mode');
  $$('.card-checkbox').forEach(cb => cb.style.display = 'none');
  $$('.media-card.selected').forEach(c => c.classList.remove('selected'));
  $$('.card-checkbox').forEach(cb => cb.checked = false);
  // 隐藏区域全选复选框
  $$('.section-select').forEach(el => el.style.display = 'none');
  $('#check-all-images').checked = false;
  $('#check-all-videos').checked = false;
}

function selectAll() {
  const grids = currentGridId.split(',').map(id => $(`#${id}`)).filter(Boolean);
  grids.forEach(grid => {
    grid.querySelectorAll('.media-card').forEach(card => {
      const cb = card.querySelector('.card-checkbox');
      if (cb) {
        cb.checked = true;
        card.classList.add('selected');
        selectedFiles.add(cb.dataset.path);
      }
    });
  });
  updateBatchCount();
}

function deselectAll() {
  const grids = currentGridId.split(',').map(id => $(`#${id}`)).filter(Boolean);
  grids.forEach(grid => {
    grid.querySelectorAll('.media-card').forEach(card => {
      const cb = card.querySelector('.card-checkbox');
      if (cb) {
        cb.checked = false;
        card.classList.remove('selected');
      }
    });
  });
  selectedFiles.clear();
  updateBatchCount();
}

function updateBatchCount() {
  $('#batch-count').textContent = `已选 ${selectedFiles.size} 项`;
}

async function batchDelete() {
  if (selectedFiles.size === 0) {
    showToast('请先选择要删除的文件', 'error');
    return;
  }
  if (!confirm(`确定要删除选中的 ${selectedFiles.size} 个文件吗？此操作不可恢复。`)) return;

  const filePaths = Array.from(selectedFiles);
  const result = await window.naiwaAPI.deleteFiles(filePaths);

  if (result.success) {
    showToast(`已成功删除 ${result.data.deleted.length} 个文件`);
    exitSelectMode();
    loadLocalFiles();
  } else {
    showToast(`删除完成，${result.data.deleted.length} 成功，${result.data.failed.length} 失败`, 'error');
  }
}

// ========== 在线搜索 ==========
function initSearch() {
  const doSearch = () => {
    searchKeyword = $('#search-input').value.trim() || '奶蛙';
    searchPage = 0;
    searchHasMore = true;
    performSearch(searchKeyword, 0, true);
  };

  $('#btn-search')?.addEventListener('click', doSearch);
  $('#search-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });

  $('#gif-only')?.addEventListener('change', () => {
    if (searchKeyword) {
      searchPage = 0;
      searchHasMore = true;
      performSearch(searchKeyword, 0, true);
    }
  });

  $$('.tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const keyword = tag.dataset.keyword;
      $('#search-input').value = keyword;
      searchKeyword = keyword;
      searchPage = 0;
      searchHasMore = true;
      performSearch(keyword, 0, true);
    });
  });
}

async function performSearch(keyword, page, resetResults) {
  if (searchLoading) return;
  searchLoading = true;

  const gifOnly = $('#gif-only')?.checked || false;

  if (resetResults) {
    hideSearchSections();
    $('#search-loading').classList.add('active');
  } else {
    $('#loading-more')?.classList.add('active');
  }

  const result = await window.naiwaAPI.searchImages(keyword, page, gifOnly);

  if (resetResults) $('#search-loading').classList.remove('active');
  $('#loading-more')?.classList.remove('active');
  searchLoading = false;

  if (!result.success) {
    if (resetResults) showSearchError(result.error || '检索失败，请检查网络');
    searchHasMore = false;
    return;
  }

  let images = result.data?.images || [];
  searchHasMore = result.data?.hasMore ?? false;

  // 动图模式下额外过滤：只保留 URL 含 .gif 的
  if (gifOnly) {
    images = images.filter(img => /\.gif/i.test(img.full) || /\.gif/i.test(img.thumb));
  }

  if (resetResults && images.length === 0) {
    $('#search-empty').classList.add('visible');
    $('#search-empty p').textContent = '没有找到相关图片，试试其他关键词';
    return;
  }

  $('#search-results').classList.add('active');
  const grid = $('#search-results-grid');

  if (resetResults) {
    grid.innerHTML = '';
    $('#search-result-count').textContent = `找到 ${images.length}+ 张图片（${gifOnly ? '仅动图' : '全部'}）`;
  } else {
    const currentCount = grid.querySelectorAll('.search-result-card').length;
    $('#search-result-count').textContent = `已加载 ${currentCount + images.length}+ 张图片`;
  }

  images.forEach(img => {
    const card = createSearchResultCard(img);
    grid.appendChild(card);
  });

  setupInfiniteScroll();
}

function setupInfiniteScroll() {
  if (searchObserver) searchObserver.disconnect();

  let sentinel = $('#search-results-grid + .scroll-sentinel');
  if (!sentinel) {
    sentinel = document.createElement('div');
    sentinel.className = 'scroll-sentinel';
    sentinel.style.cssText = 'width:100%;height:1px;';
    $('#search-results-grid').after(sentinel);
  }

  let loadingMore = $('#loading-more');
  if (!loadingMore) {
    loadingMore = document.createElement('div');
    loadingMore.id = 'loading-more';
    loadingMore.className = 'loading-more';
    loadingMore.textContent = '加载更多中…';
    sentinel.after(loadingMore);
  }

  if (!searchHasMore) {
    loadingMore.classList.remove('active');
    if (sentinel) sentinel.remove();
    return;
  }

  searchObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !searchLoading && searchHasMore) {
        searchPage++;
        performSearch(searchKeyword, searchPage, false);
      }
    });
  }, { root: document.querySelector('.main-content'), rootMargin: '300px', threshold: 0 });

  searchObserver.observe(sentinel);

  // 如果 sentinel 已经在视口内，立即触发一次加载
  requestAnimationFrame(() => {
    const rect = sentinel.getBoundingClientRect();
    const mainRect = document.querySelector('.main-content').getBoundingClientRect();
    if (rect.top < mainRect.bottom + 300 && !searchLoading && searchHasMore) {
      searchPage++;
      performSearch(searchKeyword, searchPage, false);
    }
  });
}

function createSearchResultCard(img) {
  const card = document.createElement('div');
  card.className = 'search-result-card';

  card.innerHTML = `
    <img class="result-img" src="${img.thumb}" alt="${img.title}" loading="lazy" referrerpolicy="no-referrer">
    <div class="result-info">
      <span class="result-title" title="${img.title}">${img.title || '奶蛙图片'}</span>
      <button class="btn-save" data-image-url="${img.full}">保存</button>
    </div>
  `;

  card.querySelector('.result-img').addEventListener('click', () => {
    openOnlinePreview(img.full, img.title);
  });

  card.querySelector('.btn-save').addEventListener('click', async (e) => {
    e.stopPropagation();
    const btn = e.target;
    btn.textContent = '保存中…';
    btn.disabled = true;

    const result = await window.naiwaAPI.downloadImage(btn.dataset.imageUrl);
    if (result.success) {
      btn.textContent = '已保存';
      btn.classList.add('saved');
      loadLocalFiles();
      showToast(`已保存到本地：${result.data.fileName}`);
    } else {
      btn.textContent = '保存';
      btn.disabled = false;
      showToast(`保存失败：${result.error}`, 'error');
    }
  });

  return card;
}

function hideSearchSections() {
  $('#search-results').classList.remove('active');
  $('#search-loading').classList.remove('active');
  $('#search-empty').classList.remove('visible');
  $('#search-error').classList.remove('active');
  if (searchObserver) { searchObserver.disconnect(); searchObserver = null; }
}

function showSearchError(msg) {
  $('#search-error').classList.add('active');
  $('#search-error-msg').textContent = msg;
}

function openOnlinePreview(imageUrl, title) {
  currentPreviewFile = { name: title || '在线图片', path: imageUrl, type: 'online' };
  $('#modal-filename').textContent = title || '在线图片';
  const body = $('#modal-body');
  body.innerHTML = '';
  const img = document.createElement('img');
  img.src = imageUrl;
  img.alt = title || '';
  img.referrerPolicy = 'no-referrer';
  body.appendChild(img);
  $('#modal-open-folder').style.display = 'none';
  $('#modal-delete').style.display = 'none';
  $('#modal-open-system').style.display = 'none';
  $('#preview-modal').classList.add('active');
}

// ========== 关于页面 ==========
async function initAbout() {
  const info = await window.naiwaAPI.getAppInfo();
  if (info) {
    $('#about-version').textContent = `版本 ${info.version}`;
  }

  // 官方网站按钮（始终可见）
  $('#btn-about-official-site')?.addEventListener('click', () => {
    window.naiwaAPI.openUrl('http://osdepk.cn/');
  });

  // 加载动态菜单
  loadAboutMenu();

  // 检查更新按钮
  $('#btn-check-update')?.addEventListener('click', async () => {
    const status = $('#about-status');
    status.textContent = '正在检查更新…';
    status.className = 'about-status checking';

    const result = await window.naiwaAPI.checkUpdate();
    if (result.success) {
      const d = result.data;
      if (d.hasUpdate) {
        // 有更新 → 弹出对话框
        status.textContent = '';
        status.className = '';
        showUpdateDialog(d);
      } else if (d.latestVersion) {
        status.textContent = `已是最新版本（${d.currentVersion}）`;
        status.className = 'about-status success';
        $('#about-latest-row').style.display = '';
        $('#about-latest-version').textContent = d.latestVersion;
      } else if (d.message) {
        status.textContent = d.message;
        status.className = 'about-status checking';
      } else {
        status.textContent = `更新服务器连接正常（${d.url}）`;
        status.className = 'about-status success';
      }
    } else {
      status.textContent = result.error || '检查更新失败';
      status.className = 'about-status error';
    }
  });

  // 前往下载
  $('#btn-open-update-url')?.addEventListener('click', () => {
    const url = $('#btn-open-update-url').dataset.url || 'http://osdepk.cn';
    window.naiwaAPI.openUrl(url);
  });

  // 更新对话框按钮
  $('#btn-update-now')?.addEventListener('click', () => {
    const url = $('#btn-update-now').dataset.url;
    if (url) window.naiwaAPI.openUrl(url);
    closeUpdateDialog();
  });
  $('#btn-update-cancel')?.addEventListener('click', closeUpdateDialog);
  $('#update-dialog-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeUpdateDialog();
  });
}

// 显示更新对话框
function showUpdateDialog(data) {
  if (data.isForce) {
    $('#btn-update-cancel').style.display = 'none';
  } else {
    $('#btn-update-cancel').style.display = '';
  }
  $('#update-dialog-version').textContent = data.latestVersion;
  $('#update-dialog-current').textContent = data.currentVersion;
  $('#update-dialog-changelog').textContent = data.changelog || '暂无更新日志';
  if (data.downloadUrl) {
    $('#btn-update-now').dataset.url = data.downloadUrl;
    $('#btn-update-now').style.display = '';
  } else {
    $('#btn-update-now').style.display = 'none';
  }
  if (data.isForce) {
    $('#update-dialog-force').style.display = '';
  } else {
    $('#update-dialog-force').style.display = 'none';
  }
  $('#update-dialog-overlay').classList.add('active');
}

// 关闭更新对话框
function closeUpdateDialog() {
  $('#update-dialog-overlay').classList.remove('active');
}

// 加载关于页面动态菜单
async function loadAboutMenu() {
  const menuList = $('#about-menu-list');
  const extraSection = $('#about-menu-extra');
  if (!menuList || !extraSection) return;

  const result = await window.naiwaAPI.getAboutMenu();
  if (!result || !result.success || !result.data || !result.data.items) return;

  const items = result.data.items;
  if (!items || items.length === 0) {
    extraSection.style.display = 'none';
    return;
  }

  // 渲染动态菜单项
  menuList.innerHTML = '';
  items.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'about-menu-item';
    btn.textContent = item.name;
    btn.addEventListener('click', () => {
      if (item.action === 'openUrl' && item.url) {
        window.naiwaAPI.openUrl(item.url);
      }
    });
    menuList.appendChild(btn);
  });

  extraSection.style.display = '';
}

// ========== 加载本地文件 ==========
async function loadLocalFiles() {
  const result = await window.naiwaAPI.getLocalFiles();
  if (!result.success) return;

  const { images, videos } = result.data;

  renderMediaGrid('local-images-grid', images, 'image');
  renderMediaGrid('local-videos-grid', videos, 'video');
  $('#local-image-count').textContent = images.length;
  $('#local-video-count').textContent = videos.length;

  renderMediaGrid('images-grid', images, 'image');
  toggleEmptyState('images-empty', images.length === 0);
  toggleGrid('images-grid', images.length > 0);

  renderMediaGrid('videos-grid', videos, 'video');
  toggleEmptyState('videos-empty', videos.length === 0);
  toggleGrid('videos-grid', videos.length > 0);

  // 如果当前在选择模式，重新显示 checkbox
  if (selectMode) {
    const grids = currentGridId.split(',').map(id => $(`#${id}`)).filter(Boolean);
    grids.forEach(grid => {
      grid.querySelectorAll('.card-checkbox').forEach(cb => cb.style.display = '');
    });
    $$('.section-select').forEach(el => el.style.display = '');
  }
}

async function loadImages() {
  const result = await window.naiwaAPI.getLocalFiles();
  if (!result.success) return;
  const { images } = result.data;
  renderMediaGrid('images-grid', images, 'image');
  toggleEmptyState('images-empty', images.length === 0);
  toggleGrid('images-grid', images.length > 0);
}

async function loadVideos() {
  const result = await window.naiwaAPI.getLocalFiles();
  if (!result.success) return;
  const { videos } = result.data;
  renderMediaGrid('videos-grid', videos, 'video');
  toggleEmptyState('videos-empty', videos.length === 0);
  toggleGrid('videos-grid', videos.length > 0);
}

// ========== 渲染媒体网格 ==========
function renderMediaGrid(gridId, files, type) {
  const grid = $(`#${gridId}`);
  if (!grid) return;
  grid.innerHTML = '';

  files.forEach(file => {
    const card = createMediaCard(file, type);
    grid.appendChild(card);
  });
}

function createMediaCard(file, type) {
  const card = document.createElement('div');
  card.className = `media-card ${type === 'video' ? 'video-card' : ''}`;

  const isGif = file.name.toLowerCase().endsWith('.gif');

  // 复选框（所有卡片都有，默认隐藏）
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'card-checkbox';
  checkbox.dataset.path = file.path;
  checkbox.style.display = selectMode ? '' : 'none';
  checkbox.addEventListener('click', (e) => {
    e.stopPropagation();
    if (checkbox.checked) {
      card.classList.add('selected');
      selectedFiles.add(file.path);
    } else {
      card.classList.remove('selected');
      selectedFiles.delete(file.path);
    }
    updateBatchCount();
  });
  card.appendChild(checkbox);

  if (type === 'video') {
    const wrapper = document.createElement('div');
    wrapper.className = 'card-preview-wrapper';
    wrapper.innerHTML = `
      <img class="card-preview video-thumb" src="" alt="${file.name}" data-video-path="${file.url}">
      <div class="play-overlay">&#9654;</div>
    `;
    card.appendChild(wrapper);

    const info = document.createElement('div');
    info.className = 'card-info';
    info.innerHTML = `<div class="card-name" title="${file.name}">${file.name}</div>`;
    card.appendChild(info);

    generateVideoThumbnail(file.url, card.querySelector('.video-thumb'));
  } else {
    const img = document.createElement('img');
    img.className = 'card-preview';
    img.src = file.url;
    img.alt = file.name;
    img.loading = 'lazy';
    card.appendChild(img);

    const info = document.createElement('div');
    info.className = 'card-info';
    info.innerHTML = `<div class="card-name" title="${file.name}">${file.name}</div>`;
    card.appendChild(info);

    if (isGif) {
      const tag = document.createElement('div');
      tag.className = 'card-type gif-tag';
      tag.textContent = 'GIF';
      card.appendChild(tag);
    }

    // 复制到剪贴板按钮（仅图片，hover 显示在右下角）
    const copyBtn = document.createElement('button');
    copyBtn.className = 'card-copy-btn';
    copyBtn.title = '复制到剪贴板';
    copyBtn.textContent = '复制';
    copyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      const result = await window.naiwaAPI.copyToClipboard(file.path, null);
      if (result.success) {
        showToast('已复制到剪贴板');
      } else {
        showToast('复制失败: ' + (result.error || '未知错误'), 'error');
      }
    });
    card.appendChild(copyBtn);
  }

  // 点击卡片：选择模式则切换 checkbox，否则预览
  card.addEventListener('click', (e) => {
    if (selectMode && e.target !== checkbox) {
      checkbox.checked = !checkbox.checked;
      if (checkbox.checked) {
        card.classList.add('selected');
        selectedFiles.add(file.path);
      } else {
        card.classList.remove('selected');
        selectedFiles.delete(file.path);
      }
      updateBatchCount();
      return;
    }
    if (!selectMode) openPreview(file);
  });

  return card;
}

// ========== 视频缩略图 ==========
function generateVideoThumbnail(videoPath, imgEl) {
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  // file:// 协议下不能设 crossOrigin，会导致 video 加载失败
  // video.crossOrigin = 'anonymous';
  video.src = videoPath;

  let resolved = false;

  const resolveThumb = () => {
    if (resolved) return;
    resolved = true;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 180;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      imgEl.src = canvas.toDataURL('image/jpeg', 0.7);
    } catch (e) {
      imgEl.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="140" viewBox="0 0 160 140"><rect fill="#e8e8ec" width="160" height="140"/><text x="80" y="75" text-anchor="middle" fill="#999" font-size="14" font-family="sans-serif">视频</text></svg>');
    }
    video.remove();
  };

  video.addEventListener('loadeddata', () => { video.currentTime = 0.5; });
  video.addEventListener('seeked', () => resolveThumb());
  video.addEventListener('error', () => resolveThumb());
  setTimeout(() => resolveThumb(), 5000);
}

function toggleEmptyState(id, show) {
  const el = $(`#${id}`);
  if (el) el.classList.toggle('visible', show);
}

function toggleGrid(id, show) {
  const el = $(`#${id}`);
  if (el) el.style.display = show ? '' : 'none';
}

// ========== 预览弹窗 ==========
function initPreviewModal() {
  $('#modal-close')?.addEventListener('click', closePreview);
  $('#preview-modal')?.addEventListener('click', (e) => {
    if (e.target === $('#preview-modal')) closePreview();
  });

  $('#modal-delete')?.addEventListener('click', handleDeletePreview);
  $('#modal-open-folder')?.addEventListener('click', () => {
    if (currentPreviewFile && currentPreviewFile.type !== 'online') {
      window.naiwaAPI.openFileLocation(currentPreviewFile.path);
    }
  });
  $('#modal-open-system')?.addEventListener('click', () => {
    if (currentPreviewFile && currentPreviewFile.type !== 'online') {
      window.naiwaAPI.openExternal(currentPreviewFile.path);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePreview();
  });
}

async function openPreview(file) {
  if (selectMode) return;
  currentPreviewFile = file;
  $('#modal-filename').textContent = file.name;
  const body = $('#modal-body');
  body.innerHTML = '';

  $('#modal-open-folder').style.display = '';
  $('#modal-delete').style.display = '';
  $('#modal-open-system').style.display = '';

  if (file.type === 'video') {
    const video = document.createElement('video');
    video.src = file.url;
    video.controls = true;
    video.autoplay = true;
    video.style.maxWidth = '85vw';
    video.style.maxHeight = '70vh';
    body.appendChild(video);
  } else {
    const img = document.createElement('img');
    img.src = file.url;
    img.alt = file.name;
    body.appendChild(img);
  }

  $('#preview-modal').classList.add('active');
}

function closePreview() {
  $('#preview-modal').classList.remove('active');
  const body = $('#modal-body');
  if (body) {
    const video = body.querySelector('video');
    if (video) { video.pause(); video.removeAttribute('src'); }
    body.innerHTML = '';
  }
  currentPreviewFile = null;
}

async function handleDeletePreview() {
  if (!currentPreviewFile || currentPreviewFile.type === 'online') return;
  if (!confirm(`确定要删除「${currentPreviewFile.name}」吗？此操作不可恢复。`)) return;

  try {
    const result = await window.naiwaAPI.deleteFile(currentPreviewFile.path);
    if (result && result.success) {
      const name = currentPreviewFile.name;
      closePreview();
      showToast(`已删除「${name}」`);
      await loadLocalFiles();
    } else {
      showToast(`删除失败: ${(result && result.error) || '未知错误'}`, 'error');
    }
  } catch (err) {
    console.error('[handleDeletePreview] Error:', err);
    showToast(`删除异常: ${err.message || err}`, 'error');
  }
}

// ========== Toast 提示 ==========
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: ${type === 'error' ? '#e05050' : '#4f8cff'}; color: #fff;
    padding: 10px 24px; border-radius: 8px; font-size: 13px; font-weight: 600;
    z-index: 2000; box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    animation: toastIn 0.3s ease, toastOut 0.3s ease 2.5s forwards;
  `;

  if (!document.querySelector('#toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
      @keyframes toastOut { from { opacity: 1; } to { opacity: 0; } }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}