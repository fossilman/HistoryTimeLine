# 环境变量配置指南

## 创建 .env 文件

在 `backend` 目录下创建 `.env` 文件，内容如下：

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=history_timezone
DB_USER=root
DB_PASSWORD=your_password_here

# API Configuration
API_BASE_URL=http://localhost:3000/api/v1
```

## 配置说明

### Server Configuration
- `PORT`: 服务器端口，默认 3000
- `NODE_ENV`: 运行环境，development 或 production

### Database Configuration
- `DB_HOST`: MySQL 数据库主机地址
- `DB_PORT`: MySQL 数据库端口，默认 3306
- `DB_NAME`: 数据库名称，默认 history_timezone
- `DB_USER`: 数据库用户名，默认 root
- `DB_PASSWORD`: 数据库密码，**请修改为你的实际密码**

## 快速创建命令

在 `backend` 目录下运行：

```bash
cat > .env << 'EOF'
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=history_timezone
DB_USER=root
DB_PASSWORD=password

# API Configuration
API_BASE_URL=http://localhost:3000/api/v1
EOF
```

**注意**：请将 `DB_PASSWORD` 修改为你的实际 MySQL 密码。

