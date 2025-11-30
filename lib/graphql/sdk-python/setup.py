"""
艹！Nano Banana Python SDK 安装配置

这个SB文件定义了 Python SDK 的安装配置！
"""

from setuptools import setup, find_packages
import os

# 读取 README
def read_readme():
    readme_path = os.path.join(os.path.dirname(__file__), "README.md")
    if os.path.exists(readme_path):
        with open(readme_path, "r", encoding="utf-8") as f:
            return f.read()
    return ""

# 读取版本号
def get_version():
    version_path = os.path.join(os.path.dirname(__file__), "nanobanana_sdk", "__init__.py")
    with open(version_path, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("__version__"):
                return line.split("=")[1].strip().strip('"').strip("'")
    return "1.0.0"

setup(
    name="nanobanana-sdk",
    version=get_version(),
    author="Nano Banana Team",
    author_email="support@nanobanana.com",
    description="艹！官方 Nano Banana GraphQL SDK for Python",
    long_description=read_readme(),
    long_description_content_type="text/markdown",
    url="https://github.com/nanobanana/nanobanana-sdk-python",
    packages=find_packages(exclude=["tests", "tests.*", "examples", "examples.*"]),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Software Development :: Libraries :: Python Modules",
    ],
    python_requires=">=3.8",
    install_requires=[
        "gql[requests,aiohttp]>=3.4.0",
        "aiohttp>=3.8.0",
        "requests>=2.28.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-asyncio>=0.21.0",
            "pytest-cov>=4.0.0",
            "black>=22.0.0",
            "isort>=5.10.0",
            "mypy>=0.991",
            "flake8>=4.0.0",
        ],
        "all": [
            "gql[all]>=3.4.0",
        ],
    },
    keywords=[
        "nanobanana",
        "graphql",
        "sdk",
        "api",
        "client",
        "video",
        "ai",
    ],
    project_urls={
        "Bug Reports": "https://github.com/nanobanana/nanobanana-sdk-python/issues",
        "Source": "https://github.com/nanobanana/nanobanana-sdk-python",
        "Documentation": "https://docs.nanobanana.com",
    },
)
