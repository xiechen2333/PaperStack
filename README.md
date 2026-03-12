# PaperStack (研栈) - 个人文献管理中心

## 1. 项目简介

这是一个本地运行的、轻量级的个人文献与笔记管理工具。项目基于现代 Web 技术 (React, Vite, Tailwind CSS) 构建，旨在提供一个简洁、高效的界面，帮助用户记录和组织学术研究、阅读笔记等内容。

从项目结构和文件名推断，本应用的核心是 **"Research Hub"**，它似乎是您进行文献管理和笔记记录的主要工作区。

## 2. 项目特色

*   **本地优先**: 所有数据和应用都在您的本地计算机上运行，确保了隐私和数据安全。
*   **现代化界面**: 使用 React 和 Tailwind CSS 构建，界面简洁、响应迅速。
*   **笔记功能**: 项目中包含 `MarkdownView.jsx` 组件，表明支持使用 Markdown 语法进行笔记记录，这对于技术和学术写作非常方便。
*   **数据备份**: `backupJSON` 目录的存在说明项目具备数据备份功能，可以将您的记录导出为 JSON 格式，便于迁移和存档。
*   **轻量化**: 使用 Vite 作为构建工具，开发服务器启动快，反应迅速。

## 3. 技术栈

*   **前端框架**: React.js
*   **构建工具**: Vite
*   **CSS 框架**: Tailwind CSS
*   **代码规范**: ESLint

## 4. 如何运行

该项目是一个标准的 Node.js 前端应用。要运行它，您需要先安装 [Node.js](https://nodejs.org/)。

1.  **安装依赖**: 第一次运行时，需要进入 `research-hub` 目录并安装所需依赖。
    ```bash
    cd research-hub
    npm install
    ```

2.  **启动开发服务器**: 安装完成后，运行以下命令来启动应用。
    ```bash
    npm run dev
    ```
    此命令会启动一个本地开发服务器 (通常地址为 `http://localhost:5173`)。您可以在浏览器中打开此地址来使用本应用。

3.  **关于 `启动文献记录.bat`**:
    这个批处理文件可能是您为了方便启动项目而创建的。为了让它能正常工作，您可以在其中填入以下内容：
    ```batch
    @echo off
    echo 正在启动文献管理中心...
    cd /d "%~dp0research-hub"
    start "Research Hub" npm run dev
    ```
    *请注意：这会以开发模式启动。如果需要构建生产版本，请运行 `npm run build`。*

## 5. 目录结构说明

```
PaperManegement/
├── research-hub/         # 核心应用代码目录
│   ├── src/              # 前端源代码 (React组件等)
│   ├── package.json      # 项目依赖与脚本
│   └── vite.config.js    # Vite 配置文件
├── backupJSON/           # JSON 备份文件存放目录
└── 启动文献记录.bat        # Windows 启动脚本
```

---
*这份 README 是由 Gemini 根据您的项目结构自动生成的。*
