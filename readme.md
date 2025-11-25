
# 三国志：霸业 (Three Kingdoms: Warlord Chronicles)

一款基于 Web 的三国策略 RPG 游戏，包含抽卡、战役、装备与签到系统。

## 📂 目录结构与构建结果说明

本项目采用了 **多包单体 (Monorepo-like)** 结构，但为了确保部署清晰，`frontend` 和 `admin` 是完全独立的工程。

**请严格按照以下说明操作，确保构建产物不混淆：**

```
project-root/
│
├── frontend/             # 游戏端工程
│     ├── package.json    # 独立依赖
│     ├── vite.config.ts  # 独立构建配置
│     └── dist/           # 【产物】运行 npm run build 后生成在此处
│
├── admin/                # 后台端工程
│     ├── package.json    # 独立依赖
│     ├── vite.config.ts  # 独立构建配置
│     └── dist/           # 【产物】运行 npm run build 后生成在此处
│
├── backend/              # Node.js 后端
│     └── src/
│
└── nginx.conf            # Nginx 完整配置文件
```

---

## 🔧 Nginx 关键配置示例 (核心)

这是部署成功的关键。请将以下配置复制到您的 Nginx 配置文件中，并**务必修改 `/absolute/path/to/...` 为您服务器上的实际绝对路径**。

### 配置逻辑
1.  **静态资源托管**：分别指向 `frontend/dist` 和 `admin/dist`。
2.  **SPA 路由支持**：使用 `try_files $uri $uri/ /index.html;` 防止刷新页面 404。
3.  **API 反向代理**：前端通过相对路径 `/api` 访问，Nginx 负责转发给后端 `3000` 端口。

```nginx
worker_processes  1;

events {
    worker_connections  1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile        on;
    keepalive_timeout  65;

    # =========================================
    # 1. 游戏主站 (Frontend) -> 监听 80 端口
    # =========================================
    server {
        listen       80;
        server_name  localhost;

        # 【关键修改点】指向 frontend 下的 dist 目录
        root   /absolute/path/to/your/project/frontend/dist;
        
        index  index.html index.htm;

        # 支持 React Router
        location / {
            try_files $uri $uri/ /index.html;
        }

        # 【核心配置】代理后端 API 请求 (转发到 Node.js 3000 端口)
        location /api/ {
            proxy_pass http://localhost:3000/api/;
            proxy_set_header Host $host;
        }
    }

    # =========================================
    # 2. 管理后台 (Admin) -> 监听 8080 端口
    # =========================================
    server {
        listen       8080;
        server_name  localhost;

        # 【关键修改点】指向 admin 下的 dist 目录
        root   /absolute/path/to/your/project/admin/dist;
        
        index  index.html index.htm;

        # 支持 React Router
        location / {
            try_files $uri $uri/ /index.html;
        }

        # 【核心配置】管理员也需要登录，转发 /api
        location /api/ {
            proxy_pass http://localhost:3000/api/;
            proxy_set_header Host $host;
        }

        # 【核心配置】管理后台专用接口转发
        location /admin/ {
            proxy_pass http://localhost:3000/admin/;
            proxy_set_header Host $host;
        }
    }
}
```

---

## 🚀 详细部署流程

### 1. 准备工作

*   安装 Node.js (v18+)
*   安装 Nginx

### 2. 构建游戏前端 (Frontend)

务必进入 `frontend` 目录操作：

```bash
cd frontend

# 1. 安装依赖
npm install

# 2. 构建 (已修复 TS 报错)
npm run build
```

*   **检查结果**：请查看 `frontend/dist` 文件夹是否存在。

### 3. 构建管理后台 (Admin)

务必进入 `admin` 目录操作：

```bash
cd ../admin  # 如果在 frontend 目录下

# 1. 安装依赖
npm install

# 2. 构建 (已修复 TS 报错)
npm run build
```

*   **检查结果**：请查看 `admin/dist` 文件夹是否存在。

### 4. 启动后端 (Backend)

```bash
cd ../backend

npm install
npm start
```
后端将在 `3000` 端口运行，并自动生成 `sanguo.db` 数据库文件。

### 5. 最终检查

1.  确保 Nginx 已启动并加载了上述配置。
2.  确保 Backend 正在运行。
3.  访问 `http://localhost` 开始游戏。
4.  访问 `http://localhost:8080` 管理后台。

---

## 🔑 初始账号

*   **普通玩家**：
    *   直接访问 `http://localhost` 注册。
*   **管理员**：
    *   **账号**: `admin`
    *   **密码**: `123456`
    *   **说明**: 后端系统启动时会自动创建此账号（或重置其密码）。请直接使用此账号在后台登录。
