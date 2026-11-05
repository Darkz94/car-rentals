package za.co.capetownrentals.arcade;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageInfo;
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
                String name = url.substring(ORIGIN.length());
                if (name.isEmpty()) name = "index.html";
                if (name.contains("..") || name.contains("/") || name.contains("\\")) return null;
                try {
                    InputStream input = getAssets().open(name);
                    String mime = name.endsWith(".html") ? "text/html" : "application/octet-stream";
                    return new WebResourceResponse(mime, "UTF-8", input);
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
        checkForUpdates(false);
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
                String apk = "";
                JSONArray assets=release.optJSONArray("assets");
                if(assets!=null) for(int i=0;i<assets.length();i++) {
                    JSONObject a=assets.optJSONObject(i);
                    if(a!=null && a.optString("name","").endsWith(".apk")) {
                        apk=a.optString("browser_download_url",""); break;
                    }
                }
                if(latest>installed && apk.startsWith("https://github.com/")) {
                    final String link=apk, version=tag;
                    final String notes=release.optString("body","Update available.");
                    runOnUiThread(() -> new AlertDialog.Builder(MainActivity.this)
                        .setTitle("Cape Town Rentals update")
                        .setMessage("Version "+version+" is available.\n\n"+
                            notes.substring(0,Math.min(notes.length(),700))+
                            "\n\nDownload the APK and approve the Android install prompt. Your saved game is preserved when updating the installed app.")
                        .setNegativeButton("Later",(d,w)->{})
                        .setPositiveButton("Download APK",(d,w)-> {
                            try { startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(link))); }
                            catch(Exception ex) { Toast.makeText(this,"Cannot open update link",Toast.LENGTH_LONG).show(); }
                        }).show());
                } else if(manual) {
                    runOnUiThread(() -> Toast.makeText(this,"You're up to date",Toast.LENGTH_SHORT).show());
                }
            } catch(Exception ex) {
                Log.i("CapeTownRentals","Update check unavailable: "+ex.getMessage());
                if(manual) runOnUiThread(() -> Toast.makeText(this,"Update check unavailable",Toast.LENGTH_SHORT).show());
            } finally { if(connection!=null) connection.disconnect(); }
        },"CTR-update-check").start();
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
