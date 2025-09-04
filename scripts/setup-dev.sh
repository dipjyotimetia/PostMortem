#!/bin/bash

# Development setup script for PostMortem
# This script properly sets up the workspace with correct dependencies

set -e

echo "🚀 Setting up PostMortem development environment..."

# Clean any previous builds
echo "🧹 Cleaning previous builds..."
npm run clean

# Install root dependencies
echo "📦 Installing workspace dependencies..."
npm ci

# Build CLI first
echo "🔨 Building CLI package..."
npm run build:cli

# Test CLI build
if [ ! -f "dist/index.js" ]; then
    echo "❌ CLI build failed - index.js not found"
    exit 1
fi

# Create package tarball
echo "📋 Creating CLI package..."
npm run package:cli

# Install CLI package as extension dependency
echo "🔗 Installing CLI as extension dependency..."
npm run install:extension-deps

# Build extension
echo "🔨 Building VS Code extension..."
npm run build:extension

# Verify extension build
if [ ! -f "vscode-extension/dist/extension.js" ]; then
    echo "❌ Extension build failed - extension.js not found"
    exit 1
fi

# Verify dependency installation
if [ ! -d "vscode-extension/node_modules/@dipjyotimetia/postmortem" ]; then
    echo "❌ Extension dependency not properly installed"
    exit 1
fi

echo "✅ Development environment setup complete!"
echo ""
echo "Available commands:"
echo "  npm run build:with-deps  - Build everything with proper dependencies"
echo "  npm run package:extension - Create VS Code extension package"
echo "  npm run dev             - Run CLI in development mode"
echo "  npm test                - Run all tests"
echo ""
echo "To install the extension locally:"
echo "  code --install-extension vscode-extension/*.vsix"