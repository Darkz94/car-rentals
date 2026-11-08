package za.co.capetownrentals.arcade;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.Context;
import android.database.Cursor;
import android.os.Environment;
import android.content.Intent;
import android.content.res.ColorStateList;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.GradientDrawable;
import android.util.TypedValue;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.ScrollView;
import android.content.pm.PackageInfo;
import android.provider.Settings;
import android.view.Gravity;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileInputStream;
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


    // Native update windows use the same navy, cyan and gold arcade palette as the game.
    // The in-game WebView and its saved progress are never recreated by these dialogs.
    private static final int ARCADE_NAVY = Color.rgb(7, 25, 53);
    private static final int ARCADE_BLUE = Color.rgb(14, 48, 84);
    private static final int ARCADE_CYAN = Color.rgb(101, 215, 255);
    private static final int ARCADE_GOLD = Color.rgb(255, 205, 75);
    private static final int ARCADE_WHITE = Color.rgb(245, 251, 255);

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private GradientDrawable arcadeFill(int first, int second, int stroke, int radius) {
        GradientDrawable fill = new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[]{first, second});
        fill.setCornerRadius(dp(radius));
        if (stroke != Color.TRANSPARENT) fill.setStroke(dp(2), stroke);
        return fill;
    }

    private TextView arcadeLabel(String content, int sizeSp, int color, boolean bold) {
        TextView label = new TextView(this);
        label.setText(content);
        label.setTextSize(TypedValue.COMPLEX_UNIT_SP, sizeSp);
        label.setTextColor(color);
        label.setTypeface(Typeface.create("sans-serif", bold ? Typeface.BOLD : Typeface.NORMAL));
        label.setLineSpacing(dp(2), 1f);
        return label;
    }

    private void arcadeSpace(LinearLayout container, int heightDp) {
        View space = new View(this);
        container.addView(space, new LinearLayout.LayoutParams(1, dp(heightDp)));
    }

    private Button arcadeButton(String caption, boolean gold) {
        Button button = new Button(this);
        button.setText(caption);
        button.setAllCaps(false);
        button.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        button.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        button.setTextColor(gold ? Color.rgb(13, 39, 69) : ARCADE_WHITE);
        button.setBackground(arcadeFill(
            gold ? Color.rgb(255, 233, 130) : Color.rgb(20, 68, 110),
            gold ? Color.rgb(241, 169, 36) : Color.rgb(8, 37, 74),
            gold ? Color.rgb(255, 244, 168) : ARCADE_CYAN, 14));
        button.setMinimumHeight(dp(49));
        button.setMinHeight(dp(49));
        button.setPadding(dp(7), 0, dp(7), 0);
        button.setElevation(dp(2));
        return button;
    }

    private static final class ArcadeUpdateContent {
        final LinearLayout card;
        final LinearLayout body;
        ArcadeUpdateContent(LinearLayout card, LinearLayout body) {
            this.card = card;
            this.body = body;
        }
    }

    private ArcadeUpdateContent arcadeUpdateContent() {
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setBackground(arcadeFill(ARCADE_BLUE, ARCADE_NAVY, ARCADE_CYAN, 22));
        card.setClipToOutline(true);

        FrameLayout banner = new FrameLayout(this);
        banner.setBackgroundColor(ARCADE_NAVY);
        card.addView(banner, new LinearLayout.LayoutParams(-1, dp(122)));
        try (InputStream input = getAssets().open("assets/cape-town-waterfront-header.webp")) {
            ImageView photo = new ImageView(this);
            photo.setImageBitmap(BitmapFactory.decodeStream(input));
            photo.setScaleType(ImageView.ScaleType.CENTER_CROP);
            banner.addView(photo, new FrameLayout.LayoutParams(-1, -1));
        } catch (Exception ex) {
            Log.i("CapeTownRentals", "Using navy update header fallback");
        }
        View shade = new View(this);
        shade.setBackground(new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM,
            new int[]{0xA9051831, 0xC6071B39, 0xF0081A36}));
        banner.addView(shade, new FrameLayout.LayoutParams(-1, -1));

        LinearLayout brand = new LinearLayout(this);
        brand.setOrientation(LinearLayout.VERTICAL);
        brand.setGravity(Gravity.CENTER_VERTICAL);
        brand.setPadding(dp(19), dp(12), dp(12), dp(12));
        TextView cape = arcadeLabel("CAPE TOWN", 20, ARCADE_WHITE, true);
        cape.setTypeface(Typeface.create("sans-serif-black", Typeface.BOLD_ITALIC));
        TextView rentals = arcadeLabel("RENTALS", 28, ARCADE_GOLD, true);
        rentals.setTypeface(Typeface.create("sans-serif-black", Typeface.BOLD_ITALIC));
        TextView edition = arcadeLabel("CAR RENTAL TYCOON   •   ANDROID", 10, ARCADE_CYAN, true);
        brand.addView(cape);
        brand.addView(rentals);
        arcadeSpace(brand, 5);
        brand.addView(edition);
        banner.addView(brand, new FrameLayout.LayoutParams(-1, -1));

        LinearLayout body = new LinearLayout(this);
        body.setOrientation(LinearLayout.VERTICAL);
        body.setPadding(dp(20), dp(18), dp(20), dp(21));
        card.addView(body, new LinearLayout.LayoutParams(-1, -2));
        return new ArcadeUpdateContent(card, body);
    }

    private AlertDialog showArcadeUpdateDialog(ArcadeUpdateContent content, boolean cancelable) {
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(false);
        scroll.setVerticalScrollBarEnabled(false);
        scroll.addView(content.card, new ScrollView.LayoutParams(-1, -2));
        AlertDialog dialog = new AlertDialog.Builder(this).setView(scroll).create();
        dialog.setCancelable(cancelable);
        dialog.setOnShowListener(ignored -> {
            Window window = dialog.getWindow();
            if (window != null) {
                window.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
                int width = Math.min(getResources().getDisplayMetrics().widthPixels - dp(30), dp(450));
                window.setLayout(width, WindowManager.LayoutParams.WRAP_CONTENT);
                window.addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);
                WindowManager.LayoutParams params = window.getAttributes();
                params.dimAmount = 0.78f;
                window.setAttributes(params);
            }
        });
        dialog.show();
        return dialog;
    }

    private String friendlyReleaseNotes(String raw) {
        StringBuilder result = new StringBuilder();
        for (String line : raw.split("\\r?\\n")) {
            String text = line.trim();
            if (text.isEmpty() || text.startsWith("Cape Town Rentals Modern Arcade") ||
                text.startsWith("Signed APK update") || text.startsWith("Export saves") ||
                text.startsWith("Commit ")) continue;
            if (result.length() > 0) result.append(' ');
            result.append(text);
            if (result.length() >= 200) break;
        }
        return result.length() > 200 ? result.substring(0, 200) + "…" : result.toString();
    }

    private void showUpdateAvailable(String version, String notes, String link, long size) {
        ArcadeUpdateContent content = arcadeUpdateContent();
        TextView badge = arcadeLabel("✦  UPDATE AVAILABLE   " + version, 13, ARCADE_GOLD, true);
        content.body.addView(badge);
        arcadeSpace(content.body, 12);
        content.body.addView(arcadeLabel("A new version is ready!", 21, ARCADE_WHITE, true));
        arcadeSpace(content.body, 8);
        String summary = friendlyReleaseNotes(notes);
        content.body.addView(arcadeLabel(summary.isEmpty() ?
            "Get the latest improvements for your Cape Town rental empire." : summary, 14,
            Color.rgb(207, 232, 250), false));
        arcadeSpace(content.body, 15);
        TextView assurance = arcadeLabel("✓  YOUR SAVED GAME IS KEPT", 12, Color.rgb(139, 255, 195), true);
        assurance.setPadding(dp(10), dp(11), dp(10), dp(11));
        assurance.setBackground(arcadeFill(Color.rgb(9, 82, 76), Color.rgb(7, 47, 64),
            Color.rgb(72, 222, 178), 11));
        content.body.addView(assurance);
        arcadeSpace(content.body, 13);
        content.body.addView(arcadeLabel(
            "The APK downloads inside the game. Android will ask you to confirm installation. " +
            "For extra protection, export your JSON backup before updating.",
            12, Color.rgb(178, 205, 225), false));
        arcadeSpace(content.body, 17);

        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        Button later = arcadeButton("LATER", false);
        Button update = arcadeButton("UPDATE NOW", true);
        LinearLayout.LayoutParams left = new LinearLayout.LayoutParams(0, dp(50), 1f);
        left.rightMargin = dp(9);
        actions.addView(later, left);
        actions.addView(update, new LinearLayout.LayoutParams(0, dp(50), 1.35f));
        content.body.addView(actions);
        final AlertDialog dialog = showArcadeUpdateDialog(content, true);
        later.setOnClickListener(view -> dialog.dismiss());
        update.setOnClickListener(view -> {
            dialog.dismiss();
            startInAppUpdate(link, version, size);
        });
    }

    private void showUpdateFailure(String link, String version, long expectedSize, String reason) {
        ArcadeUpdateContent content = arcadeUpdateContent();
        content.body.addView(arcadeLabel("UPDATE INTERRUPTED", 13, ARCADE_GOLD, true));
        arcadeSpace(content.body, 9);
        content.body.addView(arcadeLabel("The download didn't finish", 21, ARCADE_WHITE, true));
        arcadeSpace(content.body, 9);
        content.body.addView(arcadeLabel(
            "Your saved game is unchanged. Try again, or download the signed update in your browser.",
            13, Color.rgb(207, 232, 250), false));
        if (reason != null && !reason.isEmpty()) {
            arcadeSpace(content.body, 9);
            String detail = reason.replace('\n', ' ').replace('\r', ' ');
            if (detail.length() > 150) detail = detail.substring(0, 150) + "…";
            content.body.addView(arcadeLabel("Download detail: " + detail, 11,
                Color.rgb(168, 204, 236), false));
        }
        arcadeSpace(content.body, 18);
        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        Button later = arcadeButton("LATER", false);
        Button retry = arcadeButton("TRY AGAIN", true);
        LinearLayout.LayoutParams left = new LinearLayout.LayoutParams(0, dp(49), 1f);
        left.rightMargin = dp(9);
        actions.addView(later, left);
        actions.addView(retry, new LinearLayout.LayoutParams(0, dp(49), 1f));
        content.body.addView(actions);
        arcadeSpace(content.body, 10);
        Button browser = arcadeButton("OPEN IN BROWSER", false);
        content.body.addView(browser, new LinearLayout.LayoutParams(-1, dp(49)));
        final AlertDialog dialog = showArcadeUpdateDialog(content, true);
        later.setOnClickListener(view -> dialog.dismiss());
        retry.setOnClickListener(view -> { dialog.dismiss(); startInAppUpdate(link, version, expectedSize); });
        browser.setOnClickListener(view -> {
            dialog.dismiss();
            try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(link))); }
            catch (Exception ex) { Toast.makeText(this, "Cannot open link", Toast.LENGTH_LONG).show(); }
        });
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
                    if(a!=null && "Cape-Town-Rentals-Android.apk".equals(a.optString("name",""))) {
                        apk=a.optString("browser_download_url",""); apkSize=a.optLong("size",0); break;
                    }
                }
                if(latest>installed && apk.startsWith(APK_URL_PREFIX)) {
                    final String link=apk, version=tag; final long size=apkSize;
                    final String notes=release.optString("body","Update available.");
                    runOnUiThread(() -> showUpdateAvailable(version, notes, link, size));
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
        ArcadeUpdateContent content = arcadeUpdateContent();
        content.body.addView(arcadeLabel("DOWNLOADING UPDATE", 13, ARCADE_GOLD, true));
        arcadeSpace(content.body, 12);
        final TextView label = arcadeLabel("Downloading " + version + "…", 17, ARCADE_WHITE, true);
        label.setGravity(Gravity.CENTER_HORIZONTAL);
        content.body.addView(label);
        arcadeSpace(content.body, 17);
        final ProgressBar bar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        bar.setMax(100);
        bar.setIndeterminate(true);
        bar.setProgressTintList(ColorStateList.valueOf(ARCADE_GOLD));
        bar.setProgressBackgroundTintList(ColorStateList.valueOf(Color.rgb(28, 64, 100)));
        content.body.addView(bar, new LinearLayout.LayoutParams(-1, dp(14)));
        arcadeSpace(content.body, 17);
        Button cancel = arcadeButton("CANCEL DOWNLOAD", false);
        content.body.addView(cancel, new LinearLayout.LayoutParams(-1, dp(49)));
        downloadDialog = showArcadeUpdateDialog(content, false);
        cancel.setOnClickListener(view -> {
            cancelDownload = true;
            cancel.setEnabled(false);
            label.setText("Cancelling download…");
        });

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
                finishDownloadedUpdate(part, apk, expectedSize);
            } catch (Exception ex) {
                Log.w("CapeTownRentals", "Direct update download failed: " + ex.getMessage());
                part.delete(); apk.delete();
                if (cancelDownload) {
                    runOnUiThread(() -> { if (downloadDialog != null) downloadDialog.dismiss(); });
                    return;
                }
                runOnUiThread(() -> {
                    bar.setIndeterminate(true);
                    label.setText("Retrying with Android's download service…");
                });
                try {
                    downloadWithAndroidManager(link, version, part, bar, label);
                    if (cancelDownload) {
                        runOnUiThread(() -> { if (downloadDialog != null) downloadDialog.dismiss(); });
                        return;
                    }
                    finishDownloadedUpdate(part, apk, expectedSize);
                } catch (Exception second) {
                    Log.w("CapeTownRentals", "Android download retry failed: " + second.getMessage());
                    part.delete(); apk.delete();
                    final String detail = "Direct: " + ex.getMessage() + " • Android: " + second.getMessage();
                    runOnUiThread(() -> {
                        if (downloadDialog != null) downloadDialog.dismiss();
                        if (!cancelDownload) showUpdateFailure(link, version, expectedSize, detail);
                    });
                }
            } finally { if (c != null) c.disconnect(); }
        }, "CTR-update-download").start();
    }

    // Validate every download source before passing an APK to Android's installer.
    private void finishDownloadedUpdate(File part, File apk, long expectedSize) throws Exception {
        if (!part.isFile() || part.length() < 1024) throw new Exception("APK download is empty");
        if (expectedSize > 0 && part.length() != expectedSize) throw new Exception("Download incomplete");
        if (!part.renameTo(apk)) throw new Exception("Cannot save update");
        PackageInfo archive = getPackageManager().getPackageArchiveInfo(apk.getAbsolutePath(), 0);
        PackageInfo current = getPackageManager().getPackageInfo(getPackageName(), 0);
        if (archive == null || !getPackageName().equals(archive.packageName))
            throw new Exception("Not a Cape Town Rentals APK");
        long newCode = android.os.Build.VERSION.SDK_INT >= 28 ? archive.getLongVersionCode() : archive.versionCode;
        long curCode = android.os.Build.VERSION.SDK_INT >= 28 ? current.getLongVersionCode() : current.versionCode;
        if (newCode <= curCode) throw new Exception("Downloaded file is not newer");
        runOnUiThread(() -> { if (downloadDialog != null) downloadDialog.dismiss(); installApk(apk); });
    }

    // System-managed retry handles GitHub CDN redirects and transient network failures.
    // Its temporary external copy is removed after moving bytes into our private cache.
    private void downloadWithAndroidManager(String link, String version, File part,
                                            ProgressBar bar, TextView label) throws Exception {
        DownloadManager manager = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
        if (manager == null) throw new Exception("Android download service unavailable");
        File dir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (dir == null) throw new Exception("Android download folder unavailable");
        File staging = new File(dir, "cape-town-rentals-update.apk");
        if (staging.exists() && !staging.delete()) throw new Exception("Cannot clear previous download");
        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(link));
        request.setTitle("Cape Town Rentals " + version);
        request.setDescription("Signed Android game update");
        request.setMimeType("application/vnd.android.package-archive");
        request.setAllowedOverMetered(true);
        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE);
        request.setDestinationInExternalFilesDir(this, Environment.DIRECTORY_DOWNLOADS,
            "cape-town-rentals-update.apk");
        long id = manager.enqueue(request);
        try {
            final long start = System.currentTimeMillis();
            while (true) {
                if (cancelDownload) throw new Exception("Download cancelled");
                if (System.currentTimeMillis() - start > 600000)
                    throw new Exception("Android download service timed out");
                try (Cursor cursor = manager.query(new DownloadManager.Query().setFilterById(id))) {
                    if (cursor == null || !cursor.moveToFirst())
                        throw new Exception("Android download status unavailable");
                    int status = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
                    if (status == DownloadManager.STATUS_SUCCESSFUL) break;
                    if (status == DownloadManager.STATUS_FAILED) {
                        int reason = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_REASON));
                        throw new Exception("Android download error " + reason);
                    }
                    long received = cursor.getLong(cursor.getColumnIndexOrThrow(
                        DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
                    long total = cursor.getLong(cursor.getColumnIndexOrThrow(
                        DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
                    if (total > 0) {
                        int pct = (int) Math.min(100, received * 100 / total);
                        runOnUiThread(() -> {
                            bar.setIndeterminate(false);
                            bar.setProgress(pct);
                            label.setText("Android download " + version + "… " + pct + "%");
                        });
                    }
                }
                Thread.sleep(600);
            }
            if (!staging.isFile() || staging.length() < 1024)
                throw new Exception("Android download was empty");
            try (FileInputStream input = new FileInputStream(staging);
                 FileOutputStream output = new FileOutputStream(part)) {
                byte[] bytes = new byte[32768];
                int count;
                while ((count = input.read(bytes)) != -1) {
                    if (cancelDownload) throw new Exception("Download cancelled");
                    output.write(bytes, 0, count);
                }
            }
        } finally {
            manager.remove(id);
            if (staging.exists()) staging.delete();
        }
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
