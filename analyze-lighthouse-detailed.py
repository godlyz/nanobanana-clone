#!/usr/bin/env python3
# 艹！老王的深度Lighthouse分析脚本
import json

with open('lighthouse-reports/lighthouse-mobile-after-bundle-opt.report.json', 'r') as f:
    data = json.load(f)

audits = data['audits']

print('=' * 80)
print('🔍 老王的深度Lighthouse分析报告')
print('=' * 80)

# 1. LCP详细分解
print('\n【1. LCP Breakdown - 最关键的分析！】')
lcp_breakdown = audits.get('lcp-breakdown', {})
if lcp_breakdown and 'details' in lcp_breakdown:
    items = lcp_breakdown['details'].get('items', [])
    if items:
        phases = items[0]
        print(f"LCP元素: {phases.get('element', 'Unknown')}")
        print(f"\n各阶段耗时：")
        for key, val in phases.items():
            if key != 'element' and isinstance(val, (int, float)):
                print(f"  {key}: {val:.0f}ms")

# 2. 阻塞渲染的资源
print('\n【2. Render Blocking Resources - 阻塞首屏渲染！】')
render_blocking = audits.get('render-blocking-resources', {})
if render_blocking and 'details' in render_blocking:
    items = render_blocking['details'].get('items', [])
    if items:
        for item in items:
            url = item.get('url', 'Unknown')
            wasted = item.get('wastedMs', 0)
            print(f"  {url.split('/')[-1]}: {wasted:.0f}ms")
    else:
        print("  ✅ 无阻塞渲染的资源")
else:
    print("  ✅ 无阻塞渲染的资源")

# 3. 字体显示策略
print('\n【3. Font Display - 字体加载策略！】')
font_display = audits.get('font-display', {})
if font_display and 'details' in font_display:
    items = font_display['details'].get('items', [])
    if items:
        for item in items:
            url = item.get('url', 'Unknown')
            wasted = item.get('wastedMs', 0)
            print(f"  {url.split('/')[-1]}: {wasted:.0f}ms wasted")
    else:
        print("  ✅ 字体加载策略正确")
else:
    print("  ✅ 字体加载策略正确")

# 4. 未使用的JavaScript
print('\n【4. Unused JavaScript - 未使用的JS代码！】')
unused_js = audits.get('unused-javascript', {})
if unused_js and 'details' in unused_js:
    items = unused_js['details'].get('items', [])
    total_wasted = 0
    if items:
        print(f"  发现 {len(items)} 个文件有未使用代码：")
        for item in items[:5]:  # 只显示前5个
            url = item.get('url', 'Unknown')
            wasted_bytes = item.get('wastedBytes', 0)
            total_wasted += wasted_bytes
            print(f"  - {url.split('/')[-1]}: {wasted_bytes/1024:.1f}KB 未使用")
        print(f"  总计未使用: {total_wasted/1024:.1f}KB")

# 5. 图片优化建议
print('\n【5. Image Optimization - 图片优化！】')
image_opt = audits.get('modern-image-formats', {})
if image_opt and 'details' in image_opt:
    items = image_opt['details'].get('items', [])
    if items:
        total_savings = sum(item.get('wastedBytes', 0) for item in items)
        print(f"  可节省: {total_savings/1024:.1f}KB (使用WebP/AVIF)")
        for item in items[:3]:
            url = item.get('url', 'Unknown')
            savings = item.get('wastedBytes', 0)
            print(f"  - {url.split('/')[-1]}: {savings/1024:.1f}KB")

# 6. 主线程工作分解
print('\n【6. Main Thread Work - 主线程工作分解！】')
main_thread = audits.get('mainthread-work-breakdown', {})
if main_thread and 'details' in main_thread:
    items = main_thread['details'].get('items', [])
    if items:
        for item in items[:5]:
            group = item.get('group', 'Unknown')
            duration = item.get('duration', 0)
            print(f"  {group}: {duration:.0f}ms")

# 7. 网络请求分析
print('\n【7. Network Requests - 关键网络请求！】')
network = audits.get('network-requests', {})
if network and 'details' in network:
    items = network['details'].get('items', [])
    # 找出最慢的5个请求
    slow_requests = sorted(items, key=lambda x: x.get('endTime', 0) - x.get('startTime', 0), reverse=True)[:5]
    print(f"  最慢的5个请求：")
    for req in slow_requests:
        url = req.get('url', 'Unknown')
        duration = req.get('endTime', 0) - req.get('startTime', 0)
        resource_size = req.get('resourceSize', 0)
        print(f"  - {url.split('/')[-1]}: {duration*1000:.0f}ms, {resource_size/1024:.1f}KB")

# 8. 缓存策略
print('\n【8. Cache Policy - 缓存策略！】')
cache_policy = audits.get('uses-long-cache-ttl', {})
if cache_policy and 'details' in cache_policy:
    items = cache_policy['details'].get('items', [])
    if items and len(items) > 0:
        print(f"  发现 {len(items)} 个资源缓存配置不佳")
        for item in items[:3]:
            url = item.get('url', 'Unknown')
            cache_ttl = item.get('cacheLifetimeMs', 0) / 1000
            print(f"  - {url.split('/')[-1]}: TTL={cache_ttl:.0f}s")

# 9. CLS元凶
print('\n【9. CLS Culprits - 布局偏移元凶！】')
cls = audits.get('cumulative-layout-shift', {})
cls_value = cls.get('numericValue', 0)
print(f"  CLS值: {cls_value:.3f}")
if cls_value > 0.1:
    print("  ⚠️ CLS过高！可能原因：")
    print("  - 图片/iframe没有明确的width/height")
    print("  - 字体闪烁（FOIT/FOUT）")
    print("  - 动态插入内容")

# 10. 服务器响应时间
print('\n【10. Server Response Time - 服务器响应！】')
ttfb = audits.get('server-response-time', {})
if ttfb:
    ttfb_value = ttfb.get('numericValue', 0)
    print(f"  TTFB: {ttfb_value:.0f}ms")
    if ttfb_value > 600:
        print("  ⚠️ 服务器响应较慢！")

print('\n' + '=' * 80)
print('📌 老王的建议优先级（基于以上分析）：')
print('=' * 80)
