#!/bin/bash
# cleanup-old-structure.sh
# This script removes the old unorganized files from the root directory
# since they've been moved to the organized src/ and tests/ directories

echo "Cleaning up old unorganized files..."
echo ""
echo "Files to be removed:"
echo "  - Old config files: jest.config.js, jest.setup.js, playwright.config.js"
echo "  - Old source files: app.js, app-exports.js, ably-config.js, styles.css"
echo "  - Old test directories: __tests__/, e2e/"
echo "  - Old documentation: TESTING.md, TEST-*.md, TESTING-CHECKLIST.md"
echo ""
echo "New locations:"
echo "  ✓ Config files moved to: config/"
echo "  ✓ Source files moved to: src/js/ and src/css/"
echo "  ✓ Unit tests moved to: tests/unit/__tests__/"
echo "  ✓ E2E tests moved to: tests/e2e/specs/"
echo "  ✓ Documentation moved to: docs/"
echo ""

read -p "Continue with cleanup? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Remove old config files
    rm -f jest.config.js jest.setup.js playwright.config.js
    echo "✓ Removed old config files"

    # Remove old JavaScript source files
    rm -f app.js app-exports.js ably-config.js styles.css
    echo "✓ Removed old source files"

    # Remove old test directories
    rm -rf __tests__ e2e
    echo "✓ Removed old test directories"

    # Remove old documentation files
    rm -f TESTING.md TEST-COVERAGE-REPORT.md TEST-SUMMARY.md TESTING-CHECKLIST.md
    echo "✓ Removed old documentation"

    echo ""
    echo "Cleanup completed successfully!"
    echo ""
    echo "Your repository structure is now clean and organized."
    echo "All tests should still pass - verify with: npm test"
else
    echo "Cleanup cancelled."
fi
