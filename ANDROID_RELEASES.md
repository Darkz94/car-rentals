# Cape Town Rentals — Android app releases

Signed APK download (after one-time release signing setup):
https://github.com/Darkz94/car-rentals/releases/latest/download/Cape-Town-Rentals-Android.apk

The installed Android game checks GitHub Releases on launch. When a higher app version is published, it asks whether to download it. Android then requires the player to approve APK installation; apps cannot silently replace themselves. The game works offline between checks.

## One-time secrets: ask Claude to help

Create a private release keystore (PKCS12 or JKS) and add these four **GitHub Actions repository secrets** at Settings → Secrets and variables → Actions:
- APK_KEYSTORE_BASE64 — single-line base64 of the complete keystore.
- APK_KEYSTORE_PASSWORD — keystore password.
- APK_KEY_ALIAS — release key alias.
- APK_KEY_PASSWORD — key password.

**Never commit the key or share its passwords in ChatGPT, GitHub issues or logs. Keep a private offline backup of the keystore and passwords.** The same key must sign every update. Changing the key breaks in-place updates.

After adding the secrets run Actions → **Build and publish Android APK** → **Run workflow** on main. The first signed APK will appear under Releases. Future updates to index.html or android/** on main automatically trigger another build and signed release.

The package identifier is **za.co.capetownrentals.arcade** and must remain unchanged for Android updates. The versionCode uses 1000 + GitHub Actions run number and release tags v1.0.N. The app checks /releases/latest, compares the version and opens the new APK download on approval.

Installing a new signed APK over an existing install normally preserves local data. Saves made in Chrome when opening a downloaded HTML file are separate: export your JSON backup and import it into the installed app. Uninstalling or clearing app data can erase saves. Keep backups.

When signing secrets are absent, GitHub Actions creates a debug test artifact but does not publish it as a production release (debug signing keys are not stable across GitHub runners).
