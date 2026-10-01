#!/bin/bash
# CRM 客户关系管理系统 - 一键启动脚本
# 双击即可启动本地服务并打开浏览器

cd "$(dirname "$0")"

PORT=18789
TOOL_NAME="CRM客户关系管理系统"
SITE_DIR="dist-local"  # 由 server.js 内部定位
LOG_FILE="crm-server.log"

# 检查端口是否已被占用（服务是否已启动）
if curl -s "http://localhost:$PORT" >/dev/null 2>&1; then
  echo "$TOOL_NAME 服务已在运行，直接打开浏览器..."
  open "http://localhost:$PORT"
  exit 0
fi

echo "正在启动 $TOOL_NAME ..."
echo "服务地址: http://localhost:$PORT"
echo "提示: 关闭本窗口或按 Ctrl+C 可停止服务"

# 后台启动静态服务器（Node 服务，禁用缓存，更新后刷新页面即生效）
nohup node server.cjs > "$LOG_FILE" 2>&1 &
SERVER_PID=$!

# 等待服务就绪
for i in {1..20}; do
  if curl -s "http://localhost:$PORT" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

# 打开浏览器
open "http://localhost:$PORT"

echo "已启动 (PID $SERVER_PID)，浏览器已自动打开。"
echo "如需停止服务，请关闭本窗口（或按 Ctrl+C）"

# 保持窗口打开
wait $SERVER_PID 2>/dev/null || true