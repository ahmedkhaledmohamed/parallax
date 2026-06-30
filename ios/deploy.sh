#!/bin/bash
set -e

# Use system rsync (Homebrew rsync breaks Xcode export)
export PATH="/usr/bin:$PATH"

# App Store Connect API credentials
API_KEY_ID="532Q5RZF4S"
API_ISSUER_ID="b9178d52-7721-4076-b666-61a81aec07a6"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
KEY_PATH="$SCRIPT_DIR/keys/AuthKey_${API_KEY_ID}.p8"
ARCHIVE_PATH="$SCRIPT_DIR/build/Parallax.xcarchive"
EXPORT_PATH="$SCRIPT_DIR/build/export"
EXPORT_OPTIONS="$SCRIPT_DIR/ExportOptions.plist"

# Verify key exists
if [ ! -f "$KEY_PATH" ]; then
    echo "Error: API key not found at $KEY_PATH"
    exit 1
fi

echo "=== Deploying Parallax to TestFlight ==="

# Step 1: Generate project
echo "→ Generating Xcode project..."
cd "$SCRIPT_DIR"
xcodegen generate 2>&1 | tail -1

# Step 2: Archive
echo "→ Archiving..."
xcodebuild archive \
    -project Parallax.xcodeproj \
    -scheme Parallax \
    -archivePath "$ARCHIVE_PATH" \
    -destination "generic/platform=iOS" \
    -authenticationKeyPath "$KEY_PATH" \
    -authenticationKeyID "$API_KEY_ID" \
    -authenticationKeyIssuerID "$API_ISSUER_ID" \
    -allowProvisioningUpdates \
    CODE_SIGN_STYLE=Automatic \
    2>&1 | tail -5

if [ ! -d "$ARCHIVE_PATH" ]; then
    echo "Error: Archive failed"
    exit 1
fi

# Step 3: Export and upload
echo "→ Exporting and uploading to App Store Connect..."
xcodebuild -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportPath "$EXPORT_PATH" \
    -exportOptionsPlist "$EXPORT_OPTIONS" \
    -authenticationKeyPath "$KEY_PATH" \
    -authenticationKeyID "$API_KEY_ID" \
    -authenticationKeyIssuerID "$API_ISSUER_ID" \
    -allowProvisioningUpdates \
    2>&1 | tail -5

echo ""
echo "=== Done! Build uploaded to TestFlight ==="
echo "Check status: https://appstoreconnect.apple.com"
