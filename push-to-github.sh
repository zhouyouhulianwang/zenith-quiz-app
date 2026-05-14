#!/bin/bash
# 推送到 GitHub 脚本
# 使用方法：
# 1. 先在 https://github.com/new 创建空仓库（不要初始化 README）
# 2. 复制仓库地址（如 https://github.com/用户名/zenith-quiz-app.git）
# 3. 运行：bash push-to-github.sh https://github.com/用户名/zenith-quiz-app.git

set -e

REMOTE_URL=$1

if [ -z "$REMOTE_URL" ]; then
  echo "❌ 请提供 GitHub 仓库地址"
  echo "用法: bash push-to-github.sh https://github.com/用户名/仓库名.git"
  exit 1
fi

echo "📦 准备推送到: $REMOTE_URL"

# 设置 git 用户信息（如果未设置）
git config user.name "Developer" 2>/dev/null || true
git config user.email "dev@example.com" 2>/dev/null || true

# 确保所有文件已提交
git add -A
git commit -m "feat: ZENITH quiz app complete" || echo "⚠️ 没有新变更需要提交"

# 添加远程仓库（如果已存在则更新）
git remote remove origin 2>/dev/null || true
git remote add origin "$REMOTE_URL"

# 推送
echo "🚀 推送到 GitHub..."
git push -u origin main || git push -u origin master

echo "✅ 推送完成！"
echo "🌐 访问: ${REMOTE_URL%.git}"
