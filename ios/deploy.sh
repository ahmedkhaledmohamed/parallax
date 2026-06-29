#!/bin/bash
set -euo pipefail

SCHEME="Parallax"
PROJECT="Parallax.xcodeproj"
ARCHIVE_PATH="build/Parallax.xcarchive"
EXPORT_PATH="build/export"
TEAM_ID="VMXQN9K3P2"

echo "==> Generating Xcode project..."
xcodegen generate

echo "==> Archiving..."
xcodebuild archive \
  -project "$PROJECT" \
  -scheme "$SCHEME" \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE_PATH" \
  DEVELOPMENT_TEAM="$TEAM_ID" \
  CODE_SIGN_STYLE=Automatic \
  -allowProvisioningUpdates \
  -quiet

echo "==> Archive succeeded"

echo "==> Uploading to App Store Connect..."
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportOptionsPlist ExportOptions.plist \
  -exportPath "$EXPORT_PATH" \
  -allowProvisioningUpdates

echo "==> Upload complete! Check App Store Connect for the build."
echo "    https://appstoreconnect.apple.com"
