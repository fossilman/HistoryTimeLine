# 环境变量配置指南

## 创建 .env 文件

在 `frontend` 目录下创建 `.env` 文件，内容如下：

```bash
# API Base URL
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

## 配置说明

- `VITE_API_BASE_URL`: 后端 API 的基础 URL
  - 开发环境：`http://localhost:3000/api/v1`
  - 生产环境：根据实际部署地址修改

## 快速创建命令

在 `frontend` 目录下运行：

```bash
cat > .env << 'EOF'
# API Base URL
VITE_API_BASE_URL=http://localhost:3000/api/v1
EOF
```

## 注意事项

1. Vite 要求环境变量必须以 `VITE_` 开头才能在前端代码中访问
2. 修改 `.env` 文件后需要重启开发服务器
3. `.env` 文件已被 `.gitignore` 忽略，不会提交到版本控制

