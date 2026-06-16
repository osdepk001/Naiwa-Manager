<p align="center">
  <img src="src/icon/m.svg" width="110" alt="m">
  <img src="src/icon/m2.svg" width="110" alt="m2" style="margin-left: 20px;">
</p>

<h1 align="center">奶蛙管理</h1>

<p align="center">
  一款轻量级的表情包收集与管理工具，让你轻松找图、存图、发图。
</p>

---

## 项目介绍

**奶蛙管理**是一款面向娱乐场景的表情包管理软件。无论你是想要：

- 搜索网络上热门的表情包（奶蛙、小马云、小黑子、杰瑞等）
- 将喜欢的图片一键保存到本地
- 鼠标悬停即可一键复制图片到剪贴板，在 QQ / 微信里直接粘贴发送
- 管理自己收藏的图片和视频
- 快速浏览动图（GIF）和静态图

奶蛙管理都能帮你搞定！软件内置多搜索引擎聚合检索，支持百度、必应、搜狗、360 等主流图片搜索，同时提供本地文件管理、批量操作、视频预览等功能，是表情包爱好者的得力助手。

## 功能特性

| 功能 | 说明 |
|------|------|
| 在线找图 | 聚合多搜索引擎，关键词搜索网络表情包 |
| 一键复制 | 鼠标悬停图片即显示复制按钮，一键复制到剪贴板 |
| 动图过滤 | 一键筛选仅显示 GIF 动图 |
| 无限滚动 | 向下滑动自动加载更多图片 |
| 本地管理 | 分类管理图片和视频文件 |
| 批量操作 | 复选框勾选，批量删除文件 |
| 视频预览 | 自动捕获视频第一帧作为封面 |
| 检查更新 | 对接后台 API，自动检测软件更新 |

## 技术栈

- **Electron** — 跨平台桌面应用框架
- **HTML + CSS + JavaScript** — 前端界面
- **Node.js** — 后端 IPC 通信与文件操作

## 运行环境要求

- Node.js >= 16.x
- npm >= 8.x
- Windows / macOS / Linux

## 快速开始

### 1. 克隆项目

```bash
git clone <仓库地址>
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

## 目录结构

```
Naiwa Manager/
├── main.js              # Electron 主进程（窗口管理、IPC、搜索引擎对接）
├── preload.js           # 预加载脚本（安全桥接主进程与渲染进程）
├── index.html           # 主界面 HTML
├── style.css            # 界面样式
├── renderer.js          # 前端交互逻辑
├── package.json         # 项目配置与依赖
├── docs/                # 文档目录
│   └── API对接文档.md   # 后台 API 对接说明
├── src/                 # 资源存储目录
│   ├── icon/            # 应用图标
│   │   ├── naiwa.png    # 窗口图标
│   │   ├── m.svg         # Logo 矢量图
│   │   └── m2.svg        # Logo 矢量图 2
│   ├── images/          # 本地图片存储
│   └── videos/          # 本地视频存储
```

## 配置说明

### 应用图标

默认图标位于 `src/icon/naiwa.png`，如需更换请将新图标放入该路径。

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

## 开发调试

### 打开开发者工具

应用运行后，按 `Ctrl + Shift + I` 或点击菜单「视图 → 开发者工具」即可打开 DevTools 调试界面。

### 查看终端日志

`npm start` 启动后，终端会输出搜索日志和 API 请求日志，方便排查问题：

```
[CheckUpdate] server: v1.0.1(code=101) local: v1.0.0(100)
[CheckUpdate] compare: 101 > 100 = true
[AboutMenu] Got 3 items
```

## 打包构建

```bash
# 安装打包工具
npm install --save-dev electron-builder

# 打包（当前平台）
npm run dist

# 打包 Windows 版本
npm run dist:win
```

打包后的可执行文件将输出到 `dist/` 目录。

## 开源协议

本项目仅供学习和娱乐使用。

## 作者

- **OsDepK**
- 官网：[http://osdepk.cn](http://osdepk.cn)
