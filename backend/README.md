# Hermes Dashboard — Backend Patches

前端 SPA 需要 Hermes Agent 后端的几个补丁才能完整工作。这些补丁让你的 Hermes Agent 实例支持 Dashboard 新增的 API 端点。

## 补丁列表

| 补丁文件 | 修改内容 | 必要性 |
|----------|----------|--------|
| `patches/web_server.patch` | 新增 2 个 API 端点：`/api/model/provider/configure` 和 `/api/model/fetch-models` | **必需** — 否则"添加 API Key"功能不可用 |
| `patches/tui_gateway.patch` | Provider 列表改为只显示已认证的，新增 `all_canonical` 字段供前端下拉选择 | **必需** — 否则 ModelPicker 无法获取 provider 列表 |
| `patches/cli.patch` | CLI 背景线程兼容性修复 | 可选 — 仅在使用 TUI 时有用 |

## 应用方法

### 方法 1：git apply（推荐）

前提：你的 Hermes Agent 是通过 git 克隆的。

```bash
# 进入 Hermes Agent 仓库根目录
cd /path/to/hermes-agent

# 应用补丁
git apply /path/to/hermes-dashboard/backend/patches/web_server.patch
git apply /path/to/hermes-dashboard/backend/patches/tui_gateway.patch
git apply /path/to/hermes-dashboard/backend/patches/cli.patch   # 可选

# 重启 Hermes Agent
hermes dashboard
```

### 方法 2：手动修改

如果不想用 git，可以手动编辑对应文件。每个 patch 文件顶部有文件路径，`-` 开头的是删除的行，`+` 开头的是新增的行。

## 验证

应用补丁后，启动 Dashboard：

```bash
hermes dashboard
```

然后打开浏览器访问 http://localhost:9119，进入 Models 页面，点击"选择模型"按钮，应该能看到内嵌的"Add API Key"表单。

## 卸载补丁

```bash
cd /path/to/hermes-agent
git checkout -- hermes_cli/web_server.py tui_gateway/server.py cli.py
```
