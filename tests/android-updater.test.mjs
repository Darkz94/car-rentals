import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const android=fs.readFileSync(path.join(root,'android/app/src/main/java/za/co/capetownrentals/arcade/MainActivity.java'),'utf8');
const manifest=fs.readFileSync(path.join(root,'android/app/src/main/AndroidManifest.xml'),'utf8');
const build=fs.readFileSync(path.join(root,'android/app/build.gradle'),'utf8');

// The update remains optional and must not touch the game's persistent WebView data.
for(const required of [
  'https://api.github.com/repos/Darkz94/car-rentals/releases/latest',
  '"Cape-Town-Rentals-Android.apk".equals(a.optString("name",""))',
  'new URL(link).openConnection()',
  'downloadWithAndroidManager(link, version, part, bar, label)',
  'manager.enqueue(request)',
  'DownloadManager.STATUS_SUCCESSFUL',
  'DownloadManager.STATUS_FAILED',
  'setDestinationInExternalFilesDir(this, Environment.DIRECTORY_DOWNLOADS',
  'finishDownloadedUpdate(part, apk, expectedSize)',
  'getPackageName().equals(archive.packageName)',
  'newCode <= curCode',
  'getCacheDir(), "updates"',
  'manager.remove(id)',
  'showUpdateFailure(link, version, expectedSize, detail)',
  'OPEN IN BROWSER',
  'FileProvider.getUriForFile(this, getPackageName() + ".updates", apk)'
])assert.ok(android.includes(required),'Android updater missing: '+required);
assert.match(manifest,/<uses-permission android:name="android.permission.INTERNET"/);
assert.match(manifest,/android:authorities="\$\{applicationId\}\.updates"/);
assert.match(build,/applicationId 'za\.co\.capetownrentals\.arcade'/);
assert.ok(!android.includes('localStorage.clear()'),'Update must not wipe game saves');
console.log('PASS: In-app updater retries via Android downloads, validates APK and preserves game identity/save boundaries.');
