#!/usr/bin/env python3
import json
import re
import sys

# 读取 HTML 文件
filename = sys.argv[1] if len(sys.argv) > 1 else 'lighthouse-mobile-home.html'
with open(filename, 'r', encoding='utf-8') as f:
    html = f.read()

# 提取 JSON 数据
match = re.search(r'window\.__LIGHTHOUSE_JSON__ = ({.*?});', html, re.DOTALL)
data = json.loads(match.group(1))

print("=" * 60)
print(f"📊 Lighthouse Mobile Performance Report: {filename}")
print("=" * 60)

# 性能分数
perf_score = data['categories']['performance']['score'] * 100
print(f"\n🎯 Performance Score: {perf_score:.0f}/100")

# 关键指标
print("\n📈 Core Web Vitals:")
audits = data['audits']
print(f"   FCP (First Contentful Paint):    {audits['first-contentful-paint']['displayValue']} (score: {audits['first-contentful-paint']['score'] * 100:.0f}%)")
print(f"   LCP (Largest Contentful Paint):  {audits['largest-contentful-paint']['displayValue']} (score: {audits['largest-contentful-paint']['score'] * 100:.0f}%)")
print(f"   TBT (Total Blocking Time):       {audits['total-blocking-time']['displayValue']} (score: {audits['total-blocking-time']['score'] * 100:.0f}%)")
print(f"   CLS (Cumulative Layout Shift):   {audits['cumulative-layout-shift']['displayValue']} (score: {audits['cumulative-layout-shift']['score'] * 100:.0f}%)")
print(f"   Speed Index:                     {audits['speed-index']['displayValue']} (score: {audits['speed-index']['score'] * 100:.0f}%)")

# 优化机会
print("\n🔧 Top Optimization Opportunities:")
opportunities = [
    'render-blocking-resources',
    'uses-responsive-images',
    'offscreen-images',
    'unminified-css',
    'unminified-javascript',
    'unused-css-rules',
    'unused-javascript',
    'modern-image-formats',
    'uses-optimized-images',
    'uses-text-compression',
    'uses-rel-preconnect',
    'server-response-time',
    'uses-rel-preload',
    'font-display',
    'largest-contentful-paint-element',
]

critical_issues = []
for op_id in opportunities:
    if op_id in audits:
        audit = audits[op_id]
        if audit.get('score') is not None and audit['score'] < 1:
            savings = audit.get('details', {}).get('overallSavingsMs', 0)
            critical_issues.append((audit['title'], audit['score'] * 100, savings))

# 按潜在节省时间排序
critical_issues.sort(key=lambda x: x[2], reverse=True)

for i, (title, score, savings) in enumerate(critical_issues[:10], 1):
    if savings > 0:
        print(f"   {i}. ❌ {title} (score: {score:.0f}%, saves: {savings:.0f}ms)")
    else:
        print(f"   {i}. ⚠️  {title} (score: {score:.0f}%)")

# LCP 元素详情
if 'largest-contentful-paint-element' in audits:
    lcp_audit = audits['largest-contentful-paint-element']
    if 'details' in lcp_audit and 'items' in lcp_audit['details']:
        print("\n🖼️  LCP Element Details:")
        for item in lcp_audit['details']['items']:
            print(f"   Element: {item.get('node', {}).get('snippet', 'N/A')}")
            print(f"   Type: {item.get('type', 'N/A')}")

print("\n" + "=" * 60)
