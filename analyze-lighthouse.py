#!/usr/bin/env python3
"""
🔥 老王的Lighthouse报告分析工具
分析移动端性能瓶颈，找出优化机会
"""

import json
import sys

def analyze_lighthouse_report(json_file):
    """分析Lighthouse报告，输出性能瓶颈和优化建议"""

    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    audits = data.get('audits', {})
    categories = data.get('categories', {})

    print("=" * 80)
    print("🔥 老王的移动端性能分析报告")
    print("=" * 80)

    # 1. 关键性能指标
    print("\n【1. 关键性能指标】")
    perf_score = categories.get('performance', {}).get('score', 0) * 100
    print(f"Performance Score: {perf_score:.1f}/100 (目标: 90+)")
    print(f"LCP (最大内容绘制): {audits.get('largest-contentful-paint', {}).get('displayValue', 'N/A')}")
    print(f"FCP (首次内容绘制): {audits.get('first-contentful-paint', {}).get('displayValue', 'N/A')}")
    print(f"TBT (总阻塞时间): {audits.get('total-blocking-time', {}).get('displayValue', 'N/A')}")
    print(f"CLS (累积布局偏移): {audits.get('cumulative-layout-shift', {}).get('displayValue', 'N/A')}")
    print(f"Speed Index: {audits.get('speed-index', {}).get('displayValue', 'N/A')}")

    # 2. LCP详细分析（这是主要问题）
    print("\n【2. LCP详细分析（当前4.2s，目标<2.5s）】")
    lcp_element = audits.get('largest-contentful-paint-element', {})
    if lcp_element:
        items = lcp_element.get('details', {}).get('items', [])
        if items:
            for item in items[:3]:  # Top 3 LCP元素
                print(f"  - 元素: {item.get('node', {}).get('snippet', 'N/A')}")

    # 3. 性能优化机会（按节省时间排序）
    print("\n【3. 性能优化机会（按潜在收益排序）】")

    opportunities = []
    for key, audit in audits.items():
        if audit.get('details', {}).get('type') == 'opportunity':
            savings = audit.get('numericValue', 0)
            if savings > 0:
                opportunities.append({
                    'id': key,
                    'title': audit.get('title', key),
                    'savings': savings,
                    'display': audit.get('displayValue', 'N/A'),
                    'score': audit.get('score', 1.0)
                })

    # 按节省时间排序
    opportunities.sort(key=lambda x: x['savings'], reverse=True)

    for i, opp in enumerate(opportunities[:10], 1):
        print(f"\n{i}. {opp['title']}")
        print(f"   潜在节省: {opp['display']}")
        print(f"   评分: {opp['score']:.2f}")

    # 4. 诊断信息（需要修复的问题）
    print("\n【4. 诊断问题（需要修复）】")

    diagnostics = []
    for key, audit in audits.items():
        if audit.get('details', {}).get('type') == 'table' and audit.get('score', 1.0) < 0.9:
            diagnostics.append({
                'id': key,
                'title': audit.get('title', key),
                'score': audit.get('score', 1.0),
                'display': audit.get('displayValue', '')
            })

    # 按评分排序（最差的在前）
    diagnostics.sort(key=lambda x: x['score'])

    for i, diag in enumerate(diagnostics[:10], 1):
        print(f"\n{i}. {diag['title']}")
        print(f"   评分: {diag['score']:.2f}")
        if diag['display']:
            print(f"   详情: {diag['display']}")

    # 5. 资源统计
    print("\n【5. 资源统计】")
    network_requests = audits.get('network-requests', {}).get('details', {}).get('items', [])
    if network_requests:
        total_size = sum(item.get('resourceSize', 0) for item in network_requests) / 1024  # KB
        total_time = sum(item.get('endTime', 0) - item.get('startTime', 0) for item in network_requests if item.get('endTime'))
        print(f"总请求数: {len(network_requests)}")
        print(f"总传输大小: {total_size:.1f} KB")
        print(f"总请求时间: {total_time:.1f} ms")

        # 按大小排序，找出最大的资源
        large_resources = sorted(network_requests, key=lambda x: x.get('resourceSize', 0), reverse=True)[:5]
        print("\n最大的5个资源:")
        for i, res in enumerate(large_resources, 1):
            size_kb = res.get('resourceSize', 0) / 1024
            url = res.get('url', '')
            # 只显示URL的最后部分
            url_short = url.split('/')[-1][:50] if '/' in url else url[:50]
            print(f"  {i}. {url_short} - {size_kb:.1f} KB")

    # 6. 老王的优化建议
    print("\n" + "=" * 80)
    print("【6. 🔥 老王的优化建议（按优先级排序）】")
    print("=" * 80)

    suggestions = []

    # 检查各个关键指标并给出建议
    lcp_value = audits.get('largest-contentful-paint', {}).get('numericValue', 0)
    if lcp_value > 2500:
        suggestions.append({
            'priority': 'P0',
            'title': 'LCP优化（最关键！）',
            'issue': f'当前LCP={lcp_value/1000:.1f}s，目标<2.5s',
            'actions': [
                '优化图片加载（使用next/image的priority属性）',
                '预加载关键资源（<link rel="preload">）',
                '减少服务端响应时间',
                '移除渲染阻塞资源'
            ]
        })

    # 检查未使用的JavaScript
    unused_js = audits.get('unused-javascript', {})
    if unused_js.get('score', 1.0) < 0.9:
        savings = unused_js.get('numericValue', 0) / 1000
        suggestions.append({
            'priority': 'P1',
            'title': '移除未使用的JavaScript',
            'issue': f'可节省 {savings:.1f}s',
            'actions': [
                '启用代码分割（dynamic import）',
                '移除未使用的依赖',
                '使用tree-shaking'
            ]
        })

    # 检查图片优化
    image_opt = audits.get('modern-image-formats', {})
    if image_opt.get('score', 1.0) < 0.9:
        suggestions.append({
            'priority': 'P1',
            'title': '图片格式优化',
            'issue': '使用WebP/AVIF格式可大幅减小体积',
            'actions': [
                '转换PNG/JPG为WebP格式',
                '使用next/image自动优化',
                '实现响应式图片'
            ]
        })

    # 输出建议
    for i, sug in enumerate(suggestions, 1):
        print(f"\n{sug['priority']} - {sug['title']}")
        print(f"问题: {sug['issue']}")
        print("行动方案:")
        for j, action in enumerate(sug['actions'], 1):
            print(f"  {j}. {action}")

    print("\n" + "=" * 80)
    print("🎯 目标: 从 86分 提升到 90+ 分（需要+4分）")
    print("=" * 80)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("用法: python3 analyze-lighthouse.py <lighthouse-report.json>")
        sys.exit(1)

    analyze_lighthouse_report(sys.argv[1])
