#!/bin/bash
# 🔥 老王的移动端性能测试脚本
# 用途: 使用 Lighthouse 测试移动端性能

echo "🚀 老王开始跑移动端性能测试..."
echo ""

# 检查 Lighthouse 是否安装
if ! command -v lighthouse &> /dev/null; then
    echo "⚠️  Lighthouse 未安装，正在安装..."
    npm install -g lighthouse
fi

# 测试首页
echo "📊 测试首页性能..."
lighthouse http://localhost:3000 \
  --only-categories=performance \
  --form-factor=mobile \
  --screenEmulation.mobile=true \
  --output=html \
  --output-path=./lighthouse-mobile-home.html \
  --quiet

# 测试视频生成页面
echo "📊 测试视频生成页面性能..."
lighthouse http://localhost:3000/tools/video-generation \
  --only-categories=performance \
  --form-factor=mobile \
  --screenEmulation.mobile=true \
  --output=html \
  --output-path=./lighthouse-mobile-video-generation.html \
  --quiet

echo ""
echo "✅ 测试完成！报告已生成："
echo "   - 首页: ./lighthouse-mobile-home.html"
echo "   - 视频生成页: ./lighthouse-mobile-video-generation.html"
echo ""
echo "📈 快速查看分数："
echo ""

# 提取分数（从HTML报告中）
if [ -f "./lighthouse-mobile-home.html" ]; then
    HOME_SCORE=$(grep -oP 'Performance.*?(\d+)' ./lighthouse-mobile-home.html | head -1 | grep -oP '\d+' || echo "N/A")
    echo "   首页性能分数: $HOME_SCORE/100"
fi

if [ -f "./lighthouse-mobile-video-generation.html" ]; then
    VIDEO_SCORE=$(grep -oP 'Performance.*?(\d+)' ./lighthouse-mobile-video-generation.html | head -1 | grep -oP '\d+' || echo "N/A")
    echo "   视频生成页性能分数: $VIDEO_SCORE/100"
fi

echo ""
echo "🎯 目标: ≥90 分"
