#!/usr/bin/env python3
"""
🔥 老王的客户端组件批量修复脚本
用途：移除客户端组件中错误添加的服务端代码
警告：运行前请先提交代码到 Git！
"""

import re
import os
from pathlib import Path

# 项目根目录
PROJECT_ROOT = Path("/Users/kening/biancheng/nanobanana-clone")

def find_client_components_with_server_code():
    """查找所有需要修复的客户端组件"""
    client_components = []

    # 查找所有 page.tsx 文件
    for page_file in (PROJECT_ROOT / "app" / "[locale]").rglob("page.tsx"):
        content = page_file.read_text(encoding='utf-8')

        # 检查是否是客户端组件并包含 setRequestLocale
        if '"use client"' in content and 'setRequestLocale' in content:
            client_components.append(page_file)

    return client_components

def fix_client_component(file_path: Path):
    """修复单个客户端组件"""
    print(f"🔧 修复：{file_path.relative_to(PROJECT_ROOT)}")

    # 读取文件内容
    content = file_path.read_text(encoding='utf-8')
    original_content = content

    # 1. 移除 setRequestLocale 导入
    # 匹配：import { setRequestLocale } from 'next-intl/server'
    # 或：import { ..., setRequestLocale, ... } from 'next-intl/server'
    content = re.sub(
        r"import\s+\{\s*setRequestLocale\s*\}\s+from\s+['\"]next-intl/server['\"]\s*\n",
        "",
        content
    )

    # 如果 setRequestLocale 是多个导入之一，只移除它
    content = re.sub(
        r",\s*setRequestLocale\s*",
        "",
        content
    )
    content = re.sub(
        r"setRequestLocale\s*,\s*",
        "",
        content
    )

    # 2. 移除函数签名中的 async、params 参数
    # 匹配模式：export default async function FunctionName({ params }: { params: Promise<{ locale: string }> }) {
    # 替换为：export default function FunctionName() {

    # 先找到函数名
    func_match = re.search(r'export\s+default\s+(?:async\s+)?function\s+(\w+)', content)
    if func_match:
        func_name = func_match.group(1)

        # 构建替换模式
        # 匹配：async function FuncName({ params, ...}: { params: Promise<...> }) {
        pattern = (
            rf'export\s+default\s+async\s+function\s+{re.escape(func_name)}\s*\('
            r'[^)]*params[^)]*\)\s*\{'
        )
        replacement = f'export default function {func_name}() {{'

        content = re.sub(pattern, replacement, content, flags=re.DOTALL)

    # 3. 移除 const { locale } = await params 行
    content = re.sub(
        r'\s*const\s+\{\s*locale\s*\}\s*=\s*await\s+params\s*\n',
        '\n',
        content
    )

    # 4. 移除 setRequestLocale(locale) 行
    content = re.sub(
        r'\s*setRequestLocale\(locale\)\s*\n',
        '\n',
        content
    )

    # 检查是否有修改
    if content != original_content:
        # 创建备份
        backup_path = file_path.with_suffix('.tsx.backup')
        backup_path.write_text(original_content, encoding='utf-8')

        # 写入修复后的内容
        file_path.write_text(content, encoding='utf-8')
        print(f"✅ 修复成功（备份：{backup_path.name}）")
        return True
    else:
        print(f"⏭️  无需修复")
        return False

def main():
    print("🔥 老王开始批量修复客户端组件！")
    print()

    # 查找需要修复的文件
    files_to_fix = find_client_components_with_server_code()

    if not files_to_fix:
        print("✅ 所有客户端组件都正常，无需修复！")
        return

    print(f"🔍 找到 {len(files_to_fix)} 个需要修复的客户端组件：")
    for file_path in files_to_fix:
        print(f"  - {file_path.relative_to(PROJECT_ROOT)}")
    print()

    # 确认修复
    print("🚨 准备执行以下修复操作：")
    print("1. 移除 import { setRequestLocale } from 'next-intl/server'")
    print("2. 移除函数的 async 关键字")
    print("3. 移除 params 参数")
    print("4. 移除 const { locale } = await params 和 setRequestLocale(locale)")
    print()

    response = input("是否继续？(y/n): ")
    if response.lower() != 'y':
        print("修复已取消")
        return

    print()
    print("🚀 开始修复...")
    print()

    # 修复每个文件
    success_count = 0
    for file_path in files_to_fix:
        if fix_client_component(file_path):
            success_count += 1
        print()

    print()
    print(f"✅ 批量修复完成！成功修复 {success_count}/{len(files_to_fix)} 个文件")
    print()

    # 下一步提示
    print("📝 下一步操作：")
    print("1. 检查修复结果：git diff")
    print("2. 测试应用：pnpm dev")
    print("3. 如果有问题，回滚备份：find app/[locale] -name '*.backup' | xargs -I {} bash -c 'mv \"{}\" \"$(echo {} | sed s/.backup$//)\"'")
    print("4. 删除备份：find app/[locale] -name '*.backup' -delete")
    print("5. 提交：git add -A && git commit -m 'fix: remove server-side code from client components'")
    print()
    print("🔥 老王提醒：备份文件位于 *.backup，确认无误后可手动删除")
    print()

if __name__ == "__main__":
    main()
