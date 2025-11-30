#!/usr/bin/env python3
# 艹！这个SB脚本用来解析Lighthouse JSON报告
import json
import sys

with open('lighthouse-reports/lighthouse-mobile-after-bundle-opt.report.json', 'r') as f:
    data = json.load(f)

cats = data['categories']
audits = data['audits']
perf = cats['performance']

print('\n=== Performance Score ===')
print(f"Score: {perf['score']*100:.0f}/100")

print('\n=== Core Web Vitals ===')
print(f"FCP: {audits['first-contentful-paint']['displayValue']}")
print(f"LCP: {audits['largest-contentful-paint']['displayValue']}")
print(f"TBT: {audits['total-blocking-time']['displayValue']}")
print(f"CLS: {audits['cumulative-layout-shift']['displayValue']}")
print(f"Speed Index: {audits['speed-index']['displayValue']}")

print('\n=== Timing Breakdown ===')
print(f"TTI: {audits['interactive']['displayValue']}")
print(f"Max FID: {audits['max-potential-fid']['displayValue']}")

# LCP Breakdown
lcp_breakdown = audits.get('lcp-breakdown', {})
if lcp_breakdown and 'details' in lcp_breakdown:
    print('\n=== LCP Breakdown ===')
    items = lcp_breakdown['details'].get('items', [])
    if items and len(items) > 0:
        phases = items[0]
        for key, val in phases.items():
            if key != 'element':
                print(f"{key}: {val:.0f}ms")

# FCP数值
fcp_num = audits['first-contentful-paint'].get('numericValue', 0) / 1000
lcp_num = audits['largest-contentful-paint'].get('numericValue', 0) / 1000
print(f'\n=== LCP-FCP Gap ===')
print(f"FCP: {fcp_num:.2f}s")
print(f"LCP: {lcp_num:.2f}s")
print(f"Gap: {lcp_num - fcp_num:.2f}s")
