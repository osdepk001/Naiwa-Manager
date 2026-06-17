<p align="center">
  <img src="src/icon/m.svg" width="110" alt="m">
  <img src="src/icon/m2.svg" width="110" alt="m2" style="margin-left: 20px;">
</p>

<h1 align="center">奶蛙管理</h1>

<p align="center">
  一款轻量级的表情包收集与管理工具，让你轻松找图、存图、发图。
</p>

<p align="center">
  <a href="https://gitee.com/osdepk/naiwa-manager"><img src="https://img.shields.io/badge/Gitee-奶蛙管理-C71D23?logo=gitee" alt="Gitee"></a>
  <a href="https://github.com/osdepk001/Naiwa-Manager"><img src="https://img.shields.io/badge/GitHub-奶蛙管理-181717?logo=github" alt="GitHub"></a>
  <br/>
  <img src="https://img.shields.io/badge/Electron-33.x-47848F?logo=electron" alt="Electron">
  <img src="https://img.shields.io/badge/平台-Windows%20%7C%20macOS-lightgrey" alt="Platform">
  <img src="https://img.shields.io/badge/版本-v1.0.0-brightgreen" alt="Version">
  <img src="https://img.shields.io/badge/许可-MIT-green" alt="License">
</p>

<p align="center">
  <a href="https://github.com/osdepk001/Naiwa-Manager/releases/latest"><img src="https://img.shields.io/badge/⬇_下载最新版本-奶蛙管理_1.0.0_Setup.exe-blue?logo=windows" alt="Download"></a>
</p>

---

> **多仓库同步说明**
>
> 本项目在两个平台同步发布，请按需选择：
>
> | 平台 | 仓库地址 | 用途 |
> |------|----------|------|
> | 🇨🇳 Gitee | [gitee.com/osdepk/naiwa-manager](https://gitee.com/osdepk/naiwa-manager) | 国内访问快，推荐国内用户 clone |
> | 🌍 GitHub | [github.com/osdepk001/Naiwa-Manager](https://github.com/osdepk001/Naiwa-Manager) | 国际访问，Release 下载 |

## 项目介绍

**奶蛙管理**是一款面向娱乐场景的表情包管理软件。无论你是想要：

- 搜索网络上热门的表情包（奶蛙、小马云、小黑子、杰瑞等）
- 将喜欢的图片一键保存到本地
- 鼠标悬停即可**一键复制图片到剪贴板**，在 QQ / 微信里直接粘贴发送
- 管理自己收藏的图片和视频
- 快速浏览动图（GIF）和静态图

奶蛙管理都能帮你搞定！软件内置多搜索引擎聚合检索，支持**百度、必应、搜狗、360** 等主流图片搜索，同时提供本地文件管理、批量操作、视频预览等功能，是表情包爱好者的得力助手。

## 功能特性

| 功能 | 说明 |
|------|------|
| 在线找图 | 聚合多搜索引擎，关键词搜索网络表情包 |
| 一键复制 | 鼠标悬停图片即显示「复制」按钮，GIF 动图/静态图均可一键复制到剪贴板 |
| 动图过滤 | 一键筛选仅显示 GIF 动图 |
| 无限滚动 | 向下滑动自动加载更多图片 |
| 本地管理 | 分类管理图片和视频文件，存储在用户数据目录（不受 asar 限制） |
| 批量操作 | 复选框勾选，批量删除文件 |
| 视频预览 | 自动捕获视频第一帧作为封面，支持点击播放 |
| 检查更新 | 对接后台 API，自动检测软件更新 |
| 中文安装 | 一键安装向导 + 顶部/侧栏品牌图 + 中文许可协议 |

## 技术栈

- **Electron 33** — 跨平台桌面应用框架
- **HTML + CSS + JavaScript** — 前端界面（无任何前端框架，开箱即用）
- **Node.js** — 后端 IPC 通信、文件操作、HTTP 抓取
- **electron-builder** — 打包 + NSIS 安装程序生成

## 运行环境要求

- **开发**：Node.js >= 18.x，npm >= 9.x
- **运行（用户）**：Windows 10/11（已打包为 NSIS 安装程序，无需 Node.js 环境）

## 快速开始（开发模式）

### 1. 克隆项目

```bash
git clone https://gitee.com/osdepk/naiwa-manager.git
cd "Naiwa Manager"
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动应用

```bash
npm start
```

应用启动后会自动打开主窗口，你可以立即开始使用。

### 4. 打开开发者工具

```bash
npm start -- --dev
```

## 目录结构

```
Naiwa Manager/
├── main.js                  # Electron 主进程（窗口、IPC、搜索引擎）
├── preload.js               # 预加载脚本（安全桥接主/渲染进程）
├── index.html               # 主界面 HTML
├── style.css                # 界面样式
├── renderer.js              # 前端交互逻辑
├── package.json             # 项目配置与依赖
├── electron-builder.yml     # electron-builder 打包配置
├── docs/                    # 文档目录
│   └── API对接文档.md       # 后台 API 对接说明
├── build/                   # 打包资源（图标、安装向导侧栏图、许可协议）
│   ├── icons/               # 7 尺寸 ICO + macOS ICNS
│   ├── icon.ico             # Windows 主图标
│   ├── installerSidebar.png # 安装向导顶部/侧栏图（奶蛙 logo）
│   └── license.txt          # 中文 MIT 许可协议（UTF-16 LE + BOM）
└── src/                     # 资源存储目录
    ├── icon/                # 应用图标
    │   ├── naiwa.png        # 窗口图标
    │   ├── m.svg            # Logo 矢量图
    │   └── m2.svg           # Logo 矢量图 2
    ├── images/              # 本地图片存储（开发模式）
    └── videos/              # 本地视频存储（开发模式）
```

## 数据存储位置

| 模式 | 位置 |
|------|------|
| **开发模式** | 项目根目录下 `src/images/`、`src/videos/` |
| **打包安装后** | `%APPDATA%\奶蛙管理\src\images\`、`%APPDATA%\奶蛙管理\src\videos\` |

> **设计原因**：Electron 打包后项目被压缩进 `app.asar`（只读归档），所以**所有可写数据必须放在 `userData` 目录**。程序内部通过 `isPackaged` 自动判断并切换路径。

## 配置说明

### 应用图标

默认图标位于 `src/icon/naiwa.png`，如需更换请将新图标放入该路径，并重新执行 `npx electron-icon-builder`。

### 后台 API 对接

软件支持对接后台管理系统实现动态菜单和自动更新，详细 API 格式请参考：

- [docs/API对接文档.md](docs/API对接文档.md)

主要涉及两个接口：

| 接口 | 用途 |
|------|------|
| `version.php` | 检查软件更新 |
| `about.php` | 获取关于页面动态菜单 |

### 搜索引擎配置

内置搜索引擎无需额外配置，已集成：

- 百度图片
- 必应图片
- 搜狗图片
- 360 图片

> **首选百度**：百度的图片资源最丰富，搜不到结果时自动 fallback 到其他引擎。

## 开发调试

### 终端日志

`npm start` 启动后，终端会输出搜索日志和 API 请求日志：

```
[CheckUpdate] server: v1.0.1(code=101) local: v1.0.0(100)
[CheckUpdate] 比较：101 > 100 = 真
[AboutMenu] 收到3个条目
```

## 打包构建

### 开发依赖

```bash
npm install --save-dev electron-builder electron-icon-builder
```

### 生成图标（PNG → ICO/ICNS）

```bash
npx electron-icon-builder --input=src/icon/naiwa.png --output=build --flatten
```

### 打包 Windows NSIS 安装程序

```bash
npx electron-builder --win --x64
```

打包后的安装包输出到 `dist/奶蛙管理-1.0.0-Setup.exe`（约 85 MB）。

### 安装包特性

- ✅ **中文安装向导**（NSIS language LCID 2052）
- ✅ **顶部 + 侧栏品牌图** = `src/icon/naiwa.png`
- ✅ **安装包图标** = 7 尺寸 ICO
- ✅ **桌面/开始菜单快捷方式**
- ✅ **自定义安装目录**
- ✅ **MIT 中文许可协议**（UTF-16 LE + BOM，NSIS 3 兼容）
- ✅ **卸载保留数据**（`deleteAppDataOnUninstall: false`）

### 重要细节

1. **许可协议必须是 UTF-16 LE + BOM**（`FF FE` 头）—— NSIS 3 的 `LicenseData` 指令不支持 UTF-8，会乱码
2. **数据目录不能放项目内** —— 打包后是只读 asar，会导致保存/上传/删除全部 ENOENT
3. **复制 GIF 走 PowerShell `-LiteralPath`** —— `-Path` 对含 `\1 \2` 等特殊字符的路径会做变量展开，导致 `ItemNotFoundException`

## 常见问题

### Q1：打包后保存图片/视频失败（ENOENT）
**A**：项目进了 asar 只读归档。所有可写数据必须在 `app.getPath('userData')` 下。代码里已用 `DATA_DIR` 统一处理。

### Q2：复制 GIF 动图到 QQ/微信显示为网站链接
**A**：QQ/微信优先识别剪贴板里的 `CF_HDROP`（真实文件路径），对 `image/gif` raw buffer 会 fall back 到 URL 解析。代码里用 PowerShell `Set-Clipboard -LiteralPath` 写真实路径，QQ 即可识别为动图文件。

### Q3：安装协议乱码
**A**：NSIS 3 `LicenseData` 指令只支持 ANSI 和 **UTF-16 LE + BOM**，不支持 UTF-8 BOM。`build/license.txt` 必须用 UTF-16 LE + BOM 编码。

## 更新日志

### v1.0.0（2026-06）
- 🎉 首发版本
- ✅ 本地图片/视频管理（用户数据目录）
- ✅ 在线找图（百度/必应/搜狗/360）
- ✅ 鼠标悬停「复制」按钮（GIF 动图 + 静态图）
- ✅ 批量删除（复选框）
- ✅ 视频第一帧缩略图
- ✅ 自动检查更新
- ✅ 动态关于菜单
- ✅ 中文 NSIS 安装包（带 logo + 许可协议）
- ✅ electron-builder 打包

## 发行版 / 下载

### v1.0.0（2026-06-16）— 最新稳定版

| 文件 | 平台 | 大小 | 下载 |
|------|------|------|------|
| `奶蛙管理-1.0.0-安装程序.exe` | Windows x64 | ~80 MB | [GitHub 发布](https://github.com/osdepk001/Naiwa-Manager/releases/tag/%E5%A5%B6%E5%A8%83%E7%AE%A1%E7%90%86) / [Gitee 发布](https://gitee.com/osdepk/naiwa-manager/releases/tag/v1.0.0) |

#### 安装包特性
- ✅ 中文安装向导
- ✅ 顶部 + 侧栏品牌图（奶蛙 logo）
- ✅ 7 尺寸 ICO 图标
- ✅ 桌面 / 开始菜单快捷方式
- ✅ 中文 MIT 许可协议（UTF-16 LE + BOM）
- ✅ 卸载保留用户数据

#### SHA-256 校验
安装包生成后请用 `certutil -hashfile 奶蛙管理-1.0.0-Setup.exe SHA256` 校验（首次发布，建议在 GitHub Release 页面查看实际哈希值）。

## 开源协议

[MIT License](build/license.txt) — Copyright (c) 2026 osdepk

## 作者

osdepk

## 致谢

本项目使用 [Electron](https://www.electronjs.org/) 构建，感谢所有开源贡献者。
