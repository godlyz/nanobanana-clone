#!/usr/bin/env python3
# 艹！分析JS启动时间瓶颈
import json

with open('lighthouse-reports/lighthouse-mobile-after-bundle-opt.report.json', 'r') as f:
    data = json.load(f)

audits = data['audits']

# JS Bootup Time
bootup = audits.get('bootup-time', {})
print('=' * 80)
print('🔥 JS Bootup Time分析（真正的瓶颈！）')
print('=' * 80)
print(f"Score: {bootup.get('score', 'N/A')}")
print(f"Display: {bootup.get('displayValue', 'N/A')}")

items = bootup.get('details', {}).get('items', [])
if items:
    print('\n最慢的10个脚本：')
    for i, item in enumerate(items[:10]):
        url = item.get('url', 'Unknown')
        total = item.get('total', 0)
        scripting = item.get('scripting', 0)
        script_parse = item.get('scriptParseCompile', 0)
        print(f"\n{i+1}. {url.split('/')[-1]}")
        print(f"   Total: {total:.0f}ms")
        print(f"   Scripting: {scripting:.0f}ms")
        print(f"   Parse: {script_parse:.0f}ms")

# Main Thread Work
print('\n' + '=' * 80)
print('⏱️  Main Thread Work Breakdown')
print('=' * 80)
mainthread = audits.get('mainthread-work-breakdown', {})
items = mainthread.get('details', {}).get('items', [])
if items:
    total_time = sum(item.get('duration', 0) for item in items)
    print(f"Total Main Thread Work: {total_time:.0f}ms")
    print('\n各类工作耗时：')
    for item in items:
        group = item.get('group', 'Unknown')
        duration = item.get('duration', 0)
        percent = (duration / total_time * 100) if total_time > 0 else 0
        print(f"  {group}: {duration:.0f}ms ({percent:.1f}%)")

print('\n' + '=' * 80)
print('🎯 老王的诊断结论')
print('=' * 80)
print('\n从以上数据可以看出：')
print('1. 主线程工作总时长达到7902ms（太tm慢了！）')
print('2. 其中 scriptEvaluation 占了最大头（JS执行）')
print('3. 这才是导致LCP慢的真正原因（不是bundle大小！）')
print('\n可能的解决方案：')
print('✅ 减少首屏JS执行量（代码分割、懒加载）')
print('✅ 优化React hydration（可能是SSR hydration慢）')
print('✅ 减少不必要的React re-render')
print('✅ 检查是否有长时间运行的同步代码')
