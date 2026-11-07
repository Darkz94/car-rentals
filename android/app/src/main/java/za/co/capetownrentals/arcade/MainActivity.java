package za.co.capetownrentals.arcade;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.provider.Settings;
import android.view.Gravity;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.FileOutputStream;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public final class MainActivity extends Activity {
    private static final String ORIGIN = "https://appassets.androidplatform.net/assets/";
    private static final String RELEASE_API = "https://api.github.com/repos/Darkz94/car-rentals/releases/latest";
    private static final int PICK_BACKUP = 211, SAVE_BACKUP = 212;
    private WebView web;
    private ValueCallback<Uri[]> pendingImport;
    private String pendingText;
    private static final String APK_URL_PREFIX = "https://github.com/Darkz94/car-rentals/releases/download/";
    private volatile boolean cancelDownload;
    private File pendingApk;
    private AlertDialog downloadDialog;

    @Override public void onCreate(Bundle savedState) {
        super.onCreate(savedState);
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        web = new WebView(this);
        setContentView(web);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        web.addJavascriptInterface(new FileBridge(), "AndroidBridge");
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (pendingImport != null) pendingImport.onReceiveValue(null);
                pendingImport = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                try { startActivityForResult(intent, PICK_BACKUP); }
                catch (Exception ex) {
                    pendingImport.onReceiveValue(null); pendingImport = null;
                    Toast.makeText(MainActivity.this, "Cannot open backup picker", Toast.LENGTH_LONG).show();
                }
                return true;
            }
        });
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (!url.startsWith(ORIGIN)) return null;
                String name = assetName(url);
                if (name == null) return null;
                try {
                    InputStream input = getAssets().open(name);
                    String mime = mimeFor(name);
                    boolean text = mime.startsWith("text/") || mime.endsWith("json") || mime.endsWith("javascript") || mime.endsWith("xml");
                    return new WebResourceResponse(mime, text ? "UTF-8" : null, input);
                } catch (Exception ignored) { return null; }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !request.getUrl().toString().startsWith(ORIGIN);
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (!url.startsWith(ORIGIN)) return;
                String js = "(function(){if(window.__ctrNativeExportHook)return;"
                    + "window.__ctrNativeExportHook=true;var original=HTMLAnchorElement.prototype.click;"
                    + "HTMLAnchorElement.prototype.click=function(){if(this.download&&this.href.indexOf('blob:')===0){"
                    + "var name=this.download;fetch(this.href).then(function(r){return r.text()})"
                    + ".then(function(value){AndroidBridge.exportFile(name,name.endsWith('.csv')?'text/csv':'application/json',value)})"
                    + ".catch(function(e){console.error('Backup export failed',e)});return;}"
                    + "return original.apply(this,arguments)};})();";
                view.evaluateJavascript(js,null);
            }
        });
        web.loadUrl(ORIGIN + "index.html");
        cleanOldUpdateFiles();
        checkForUpdates(false);
    }

    /** Maps a request URL to a safe bundled asset path (subfolders like assets/ and icons/ allowed), or null. */
    static String assetName(String url) {
        if (url == null || !url.startsWith(ORIGIN)) return null;
        String name = url.substring(ORIGIN.length());
        int cut = name.indexOf('?'); if (cut >= 0) name = name.substring(0, cut);
        cut = name.indexOf('#'); if (cut >= 0) name = name.substring(0, cut);
        if (name.isEmpty()) name = "index.html";
        if (name.startsWith("/") || name.contains("..") || name.contains("\\") || name.contains("//")) return null;
        return name;
    }

    static String mimeFor(String name) {
        String n = name.toLowerCase(java.util.Locale.ROOT);
        if (n.endsWith(".html")) return "text/html";
        if (n.endsWith(".png")) return "image/png";
        if (n.endsWith(".webp")) return "image/webp";
        if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
        if (n.endsWith(".gif")) return "image/gif";
        if (n.endsWith(".svg")) return "image/svg+xml";
        if (n.endsWith(".css")) return "text/css";
        if (n.endsWith(".js")) return "application/javascript";
        if (n.endsWith(".json") || n.endsWith(".webmanifest")) return "application/json";
        return "application/octet-stream";
    }

    public final class FileBridge {
        @JavascriptInterface public void exportFile(String name, String mime, String contents) {
            runOnUiThread(() -> {
                pendingText = contents;
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType(mime == null ? "application/json" : mime);
                intent.putExtra(Intent.EXTRA_TITLE, name == null ? "cape-town-rentals-save.json"
                    : name.replaceAll("[^A-Za-z0-9._-]","_"));
                try { startActivityForResult(intent, SAVE_BACKUP); }
                catch (Exception ex) {
                    pendingText = null;
                    Toast.makeText(MainActivity.this,"Cannot export backup",Toast.LENGTH_LONG).show();
                }
            });
        }
        @JavascriptInterface public void checkForUpdates() {
            runOnUiThread(() -> MainActivity.this.checkForUpdates(true));
        }
    }

    private void checkForUpdates(boolean manual) {
        new Thread(() -> {
            HttpURLConnection connection = null;
            try {
                connection = (HttpURLConnection) new URL(RELEASE_API).openConnection();
                connection.setConnectTimeout(6000);
                connection.setReadTimeout(6000);
                connection.setRequestProperty("Accept","application/vnd.github+json");
                connection.setRequestProperty("User-Agent","CapeTownRentals-Android");
                if (connection.getResponseCode()!=200) throw new Exception("No published release");
                StringBuilder buffer = new StringBuilder();
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(),StandardCharsets.UTF_8))) {
                    String line; while((line=reader.readLine())!=null) buffer.append(line);
                }
                JSONObject release = new JSONObject(buffer.toString());
                String tag = release.optString("tag_name","");
                if (!tag.matches("v1\\.0\\.[0-9]+")) throw new Exception("Unknown release tag");
                int latest = 1000 + Integer.parseInt(tag.substring("v1.0.".length()));
                PackageInfo info = getPackageManager().getPackageInfo(getPackageName(),0);
                long installed = android.os.Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode;
                String apk = ""; long apkSize = 0;
                JSONArray assets=release.optJSONArray("assets");
                if(assets!=null) for(int i=0;i<assets.length();i++) {
                    JSONObject a=assets.optJSONObject(i);
                    if(a!=null && a.optString("name","").endsWith(".apk")) {
                        apk=a.optString("browser_download_url",""); apkSize=a.optLong("size",0); break;
                    }
                }
                if(latest>installed && apk.startsWith(APK_URL_PREFIX)) {
                    final String link=apk, version=tag; final long size=apkSize;
                    final String notes=release.optString("body","Update available.");
                    runOnUiThread(() -> new AlertDialog.Builder(MainActivity.this)
                        .setTitle("Cape Town Rentals update")
                        .setMessage("Version "+version+" is available.\n\n"+
                            notes.substring(0,Math.min(notes.length(),700))+
                            "\n\nThe update downloads inside the game. Android will then ask you to confirm the install. Your saved game is kept.")
                        .setNegativeButton("Later",(d,w)->{})
                        .setPositiveButton("Update now",(d,w)-> startInAppUpdate(link,version,size))
                        .show());
                } else if(manual) {
                    runOnUiThread(() -> Toast.makeText(this,"You're up to date",Toast.LENGTH_SHORT).show());
                }
            } catch(Exception ex) {
                Log.i("CapeTownRentals","Update check unavailable: "+ex.getMessage());
                if(manual) runOnUiThread(() -> Toast.makeText(this,"Update check unavailable",Toast.LENGTH_SHORT).show());
            } finally { if(connection!=null) connection.disconnect(); }
        },"CTR-update-check").start();
    }


    // ---- In-app update: download the release APK, verify it, then hand it to Android's installer ----

    private void startInAppUpdate(final String link, final String version, final long expectedSize) {
        cancelDownload = false;
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        int pad = (int)(20 * getResources().getDisplayMetrics().density);
        box.setPadding(pad, pad, pad, pad / 2);
        final TextView label = new TextView(this);
        label.setText("Downloading " + version + "…");
        label.setGravity(Gravity.CENTER_HORIZONTAL);
        final ProgressBar bar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        bar.setMax(100); bar.setIndeterminate(true);
        box.addView(label); box.addView(bar);
        downloadDialog = new AlertDialog.Builder(this).setTitle("Updating Cape Town Rentals").setView(box)
            .setCancelable(false)
            .setNegativeButton("Cancel",(d,w)-> cancelDownload = true).show();

        new Thread(() -> {
            File dir = new File(getCacheDir(), "updates");
            File part = new File(dir, "update.apk.part"), apk = new File(dir, "update.apk");
            HttpURLConnection c = null;
            try {
                if (!dir.isDirectory() && !dir.mkdirs()) throw new Exception("Cannot create update folder");
                part.delete(); apk.delete();
                c = (HttpURLConnection) new URL(link).openConnection();
                c.setConnectTimeout(15000); c.setReadTimeout(30000);
                c.setRequestProperty("User-Agent","CapeTownRentals-Android");
                if (c.getResponseCode() != 200) throw new Exception("Server answered " + c.getResponseCode());
                long total = c.getContentLengthLong() > 0 ? c.getContentLengthLong() : expectedSize;
                long done = 0; int lastPct = -1;
                try (InputStream in = c.getInputStream(); FileOutputStream out = new FileOutputStream(part)) {
                    byte[] buf = new byte[32768]; int n;
                    while ((n = in.read(buf)) != -1) {
                        if (cancelDownload) { part.delete(); runOnUiThread(() -> { if (downloadDialog != null) downloadDialog.dismiss(); }); return; }
                        out.write(buf, 0, n); done += n;
                        if (total > 0) {
                            final int pct = (int)(done * 100 / total);
                            if (pct != lastPct) { lastPct = pct; runOnUiThread(() -> { bar.setIndeterminate(false); bar.setProgress(pct); label.setText("Downloading " + version + "… " + pct + "%"); }); }
                        }
                    }
                }
                if (expectedSize > 0 && part.length() != expectedSize) throw new Exception("Download incomplete");
                if (!part.renameTo(apk)) throw new Exception("Cannot save update");
                PackageInfo archive = getPackageManager().getPackageArchiveInfo(apk.getAbsolutePath(), 0);
                PackageInfo current = getPackageManager().getPackageInfo(getPackageName(), 0);
                if (archive == null || !getPackageName().equals(archive.packageName)) throw new Exception("Not a Cape Town Rentals APK");
                long newCode = android.os.Build.VERSION.SDK_INT >= 28 ? archive.getLongVersionCode() : archive.versionCode;
                long curCode = android.os.Build.VERSION.SDK_INT >= 28 ? current.getLongVersionCode() : current.versionCode;
                if (newCode <= curCode) throw new Exception("Downloaded file is not newer");
                runOnUiThread(() -> { if (downloadDialog != null) downloadDialog.dismiss(); installApk(apk); });
            } catch (Exception ex) {
                Log.w("CapeTownRentals", "In-app update failed: " + ex.getMessage());
                part.delete(); apk.delete();
                runOnUiThread(() -> {
                    if (downloadDialog != null) downloadDialog.dismiss();
                    new AlertDialog.Builder(MainActivity.this).setTitle("Update could not finish")
                        .setMessage("The in-app download failed. You can try again, or download the APK in your browser.")
                        .setNegativeButton("Later",(d,w)->{})
                        .setNeutralButton("Try again",(d,w)-> startInAppUpdate(link, version, expectedSize))
                        .setPositiveButton("Open in browser",(d,w)-> {
                            try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(link))); }
                            catch (Exception e2) { Toast.makeText(MainActivity.this,"Cannot open link",Toast.LENGTH_LONG).show(); }
                        }).show();
                });
            } finally { if (c != null) c.disconnect(); }
        }, "CTR-update-download").start();
    }

    private void installApk(File apk) {
        if (!getPackageManager().canRequestPackageInstalls()) {
            pendingApk = apk;
            Toast.makeText(this, "Allow installs from Cape Town Rentals, then press Back to continue.", Toast.LENGTH_LONG).show();
            try { startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getPackageName()))); }
            catch (Exception ex) { Toast.makeText(this, "Cannot open install settings", Toast.LENGTH_LONG).show(); }
            return;
        }
        try {
            Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".updates", apk);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(intent);
        } catch (Exception ex) {
            Log.w("CapeTownRentals", "Install launch failed: " + ex.getMessage());
            Toast.makeText(this, "Could not start the installer", Toast.LENGTH_LONG).show();
        }
    }

    @Override protected void onResume() {
        super.onResume();
        File apk = pendingApk;
        if (apk != null && getPackageManager().canRequestPackageInstalls()) {
            pendingApk = null;
            if (apk.exists()) installApk(apk);
        }
    }

    private void cleanOldUpdateFiles() {
        try {
            File[] old = new File(getCacheDir(), "updates").listFiles();
            if (old != null) for (File f : old) f.delete();
        } catch (Exception ignored) { }
    }

    @Override protected void onActivityResult(int request,int result,Intent data) {
        super.onActivityResult(request,result,data);
        if(request==PICK_BACKUP) {
            if(pendingImport!=null) {
                Uri[] selected=result==RESULT_OK && data!=null && data.getData()!=null
                    ? new Uri[]{data.getData()} : null;
                pendingImport.onReceiveValue(selected);pendingImport=null;
            }
            return;
        }
        if(request==SAVE_BACKUP) {
            if(result==RESULT_OK && data!=null && data.getData()!=null && pendingText!=null) {
                try(OutputStream stream=getContentResolver().openOutputStream(data.getData())) {
                    if(stream==null) throw new Exception("No output stream");
                    stream.write(pendingText.getBytes(StandardCharsets.UTF_8));
                    Toast.makeText(this,"Backup saved",Toast.LENGTH_SHORT).show();
                } catch(Exception ex) { Toast.makeText(this,"Backup export failed",Toast.LENGTH_LONG).show(); }
            }
            pendingText=null;
        }
    }
    @Override public void onBackPressed() {
        if(web!=null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }
    @Override protected void onDestroy() {
        if(web!=null) { web.destroy();web=null; }
        super.onDestroy();
    }
}
