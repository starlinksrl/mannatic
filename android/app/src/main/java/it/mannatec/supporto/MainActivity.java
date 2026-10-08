package it.mannatec.supporto;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ClipData;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {

    private static final String APP_URL = "https://supporto.mannatec.it";
    private static final String CHANNEL_ID = "mannatic_alerts";
    private static final String CHANNEL_NAME = "Notifiche MannaTic";
    private static final int FILECHOOSER_RESULTCODE = 1001;
    private static final int PERMISSION_REQUEST_CODE = 2001;
    private static final int NOTIFICATION_PERMISSION_REQUEST_CODE = 2002;

    private WebView webView;
    private SwipeRefreshLayout swipeRefresh;
    private ProgressBar progressBar;
    private LinearLayout errorView;
    private Button btnRetry;

    private ValueCallback<Uri[]> mUploadMessage;
    private String mCameraPhotoPath;
    private GeolocationPermissions.Callback mGeoCallback;
    private String mGeoOrigin;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        createNotificationChannel();

        webView = findViewById(R.id.webView);
        swipeRefresh = findViewById(R.id.swipeRefresh);
        progressBar = findViewById(R.id.progressBar);
        errorView = findViewById(R.id.errorView);
        btnRetry = findViewById(R.id.btnRetry);

        setupSwipeRefresh();
        setupWebView();

        btnRetry.setOnClickListener(v -> {
            errorView.setVisibility(View.GONE);
            webView.setVisibility(View.VISIBLE);
            webView.loadUrl(APP_URL);
        });

        String initialUrl = APP_URL;
        if (getIntent() != null && getIntent().hasExtra("TARGET_URL")) {
            String target = getIntent().getStringExtra("TARGET_URL");
            if (target != null && !target.isEmpty()) {
                initialUrl = target.startsWith("http") ? target : APP_URL + target;
            }
        }

        if (savedInstanceState == null) {
            webView.loadUrl(initialUrl);
        } else {
            webView.restoreState(savedInstanceState);
            if (getIntent() != null && getIntent().hasExtra("TARGET_URL")) {
                webView.loadUrl(initialUrl);
            }
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (intent != null && intent.hasExtra("TARGET_URL")) {
            String target = intent.getStringExtra("TARGET_URL");
            if (target != null && !target.isEmpty() && webView != null) {
                String fullUrl = target.startsWith("http") ? target : APP_URL + target;
                webView.loadUrl(fullUrl);
            }
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifiche per interventi, ticket di supporto e aggiornamenti");
            channel.enableLights(true);
            channel.enableVibration(true);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void setupSwipeRefresh() {
        swipeRefresh.setColorSchemeColors(ContextCompat.getColor(this, R.color.accent));
        swipeRefresh.setOnRefreshListener(() -> webView.reload());
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadsImagesAutomatically(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        String defaultUa = settings.getUserAgentString();
        settings.setUserAgentString(defaultUa + " MannaTicApp/1.0");

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        webView.addJavascriptInterface(new WebAppInterface(this), "AndroidApp");
        webView.setWebViewClient(new CustomWebViewClient());
        webView.setWebChromeClient(new CustomWebChromeClient());

        // Keep swipeRefresh synchronized with scroll
        webView.setOnScrollChangeListener((v, scrollX, scrollY, oldScrollX, oldScrollY) -> {
            swipeRefresh.setEnabled(scrollY == 0);
        });
    }

    public class WebAppInterface {
        Context mContext;

        WebAppInterface(Context c) {
            mContext = c;
        }

        @JavascriptInterface
        public boolean isAndroidApp() {
            return true;
        }

        @JavascriptInterface
        public boolean hasNotificationPermission() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                return ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.POST_NOTIFICATIONS)
                        == PackageManager.PERMISSION_GRANTED;
            }
            return NotificationManagerCompat.from(MainActivity.this).areNotificationsEnabled();
        }

        @JavascriptInterface
        public void requestNotificationPermission() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                ActivityCompat.requestPermissions(MainActivity.this,
                        new String[]{Manifest.permission.POST_NOTIFICATIONS},
                        NOTIFICATION_PERMISSION_REQUEST_CODE);
            }
        }

        @JavascriptInterface
        public void showNotification(String title, String message, String targetUrl) {
            MainActivity.this.triggerNotification(title, message, targetUrl);
        }
    }

    public void triggerNotification(String title, String message, String targetUrl) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                return;
            }
        } else {
            if (!NotificationManagerCompat.from(this).areNotificationsEnabled()) {
                return;
            }
        }

        try {
            Intent intent = new Intent(this, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            if (targetUrl != null && !targetUrl.isEmpty()) {
                intent.putExtra("TARGET_URL", targetUrl);
            }

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent pendingIntent = PendingIntent.getActivity(
                    this,
                    (int) System.currentTimeMillis(),
                    intent,
                    flags
            );

            String notifTitle = (title != null && !title.trim().isEmpty()) ? title : "MannaTic";
            String notifText = (message != null) ? message : "";

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle(notifTitle)
                    .setContentText(notifText)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(notifText))
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setDefaults(NotificationCompat.DEFAULT_ALL)
                    .setAutoCancel(true)
                    .setContentIntent(pendingIntent);

            NotificationManagerCompat notificationManager = NotificationManagerCompat.from(this);
            int notificationId = (int) (System.currentTimeMillis() & 0xfffffff);
            notificationManager.notify(notificationId, builder.build());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private class CustomWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            String url = uri.toString();

            // External intent handling (phone, email, whatsapp, maps)
            if (url.startsWith("tel:") || url.startsWith("mailto:") || 
                url.startsWith("sms:") || url.startsWith("geo:") || 
                url.startsWith("whatsapp:") || url.contains("wa.me") ||
                url.contains("maps.google.com") || url.contains("google.com/maps")) {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                    startActivity(intent);
                    return true;
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Nessuna applicazione disponibile per questa azione", Toast.LENGTH_SHORT).show();
                    return true;
                }
            }

            // Keep inside webview if inside mannatec.it domain
            if (uri.getHost() != null && uri.getHost().contains("mannatec.it")) {
                return false;
            }

            // Open any other external domains in device browser
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                startActivity(intent);
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            super.onPageStarted(view, url, favicon);
            progressBar.setVisibility(View.VISIBLE);
            errorView.setVisibility(View.GONE);
            webView.setVisibility(View.VISIBLE);
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            progressBar.setVisibility(View.GONE);
            swipeRefresh.setRefreshing(false);

            // Polyfill window.Notification using the native AndroidApp bridge
            String polyfillJs = "(function() {" +
                    "  if (window.AndroidApp) {" +
                    "    if (!window.Notification) {" +
                    "      window.Notification = {" +
                    "        get permission() {" +
                    "          return window.AndroidApp.hasNotificationPermission() ? 'granted' : 'default';" +
                    "        }," +
                    "        requestPermission: function() {" +
                    "          return new Promise(function(resolve) {" +
                    "            window.AndroidApp.requestNotificationPermission();" +
                    "            var checkCount = 0;" +
                    "            var interval = setInterval(function() {" +
                    "              checkCount++;" +
                    "              if (window.AndroidApp.hasNotificationPermission()) {" +
                    "                clearInterval(interval);" +
                    "                resolve('granted');" +
                    "              } else if (checkCount > 20) {" +
                    "                clearInterval(interval);" +
                    "                resolve('default');" +
                    "              }" +
                    "            }, 300);" +
                    "          });" +
                    "        }" +
                    "      };" +
                    "    }" +
                    "  }" +
                    "})();";
            view.evaluateJavascript(polyfillJs, null);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request.isForMainFrame()) {
                progressBar.setVisibility(View.GONE);
                swipeRefresh.setRefreshing(false);
                webView.setVisibility(View.GONE);
                errorView.setVisibility(View.VISIBLE);
            }
        }
    }

    private class CustomWebChromeClient extends WebChromeClient {
        @Override
        public void onProgressChanged(WebView view, int newProgress) {
            progressBar.setProgress(newProgress);
            if (newProgress == 100) {
                progressBar.setVisibility(View.GONE);
                swipeRefresh.setRefreshing(false);
            } else {
                progressBar.setVisibility(View.VISIBLE);
            }
        }

        @Override
        public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
            mGeoOrigin = origin;
            mGeoCallback = callback;
            if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.ACCESS_FINE_LOCATION)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(MainActivity.this,
                        new String[]{Manifest.permission.ACCESS_FINE_LOCATION},
                        PERMISSION_REQUEST_CODE);
            } else {
                callback.invoke(origin, true, false);
            }
        }

        // Android 5.0+ file/camera chooser
        @Override
        public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback,
                                         FileChooserParams fileChooserParams) {
            if (mUploadMessage != null) {
                mUploadMessage.onReceiveValue(null);
            }
            mUploadMessage = filePathCallback;

            Intent takePictureIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
            if (takePictureIntent.resolveActivity(getPackageManager()) != null) {
                File photoFile = null;
                try {
                    photoFile = createImageFile();
                    takePictureIntent.putExtra("PhotoPath", mCameraPhotoPath);
                } catch (IOException ex) {
                    // Error occurred while creating the File
                }

                if (photoFile != null) {
                    mCameraPhotoPath = "file:" + photoFile.getAbsolutePath();
                    Uri photoURI = FileProvider.getUriForFile(MainActivity.this,
                            getApplicationContext().getPackageName() + ".fileprovider", photoFile);
                    takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, photoURI);
                    takePictureIntent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                } else {
                    takePictureIntent = null;
                }
            }

            Intent contentSelectionIntent = fileChooserParams.createIntent();

            Intent[] intentArray;
            if (takePictureIntent != null) {
                intentArray = new Intent[]{takePictureIntent};
            } else {
                intentArray = new Intent[0];
            }

            Intent chooserIntent = new Intent(Intent.ACTION_CHOOSER);
            chooserIntent.putExtra(Intent.EXTRA_INTENT, contentSelectionIntent);
            chooserIntent.putExtra(Intent.EXTRA_TITLE, "Seleziona file o scatta foto");
            chooserIntent.putExtra(Intent.EXTRA_INITIAL_INTENTS, intentArray);

            startActivityForResult(chooserIntent, FILECHOOSER_RESULTCODE);
            return true;
        }
    }

    private File createImageFile() throws IOException {
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
        String imageFileName = "JPEG_" + timeStamp + "_";
        File storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES);
        return File.createTempFile(imageFileName, ".jpg", storageDir);
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILECHOOSER_RESULTCODE) {
            if (mUploadMessage == null) {
                super.onActivityResult(requestCode, resultCode, data);
                return;
            }

            Uri[] results = null;

            if (resultCode == Activity.RESULT_OK) {
                if (data == null || data.getData() == null) {
                    // Photo was taken with camera
                    if (mCameraPhotoPath != null) {
                        results = new Uri[]{Uri.parse(mCameraPhotoPath)};
                    }
                } else {
                    String dataString = data.getDataString();
                    ClipData clipData = data.getClipData();
                    if (clipData != null) {
                        results = new Uri[clipData.getItemCount()];
                        for (int i = 0; i < clipData.getItemCount(); i++) {
                            results[i] = clipData.getItemAt(i).getUri();
                        }
                    } else if (dataString != null) {
                        results = new Uri[]{Uri.parse(dataString)};
                    }
                }
            }

            mUploadMessage.onReceiveValue(results);
            mUploadMessage = null;
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
                                           @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_CODE) {
            if (mGeoCallback != null && mGeoOrigin != null) {
                boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
                mGeoCallback.invoke(mGeoOrigin, granted, false);
                mGeoCallback = null;
                mGeoOrigin = null;
            }
        } else if (requestCode == NOTIFICATION_PERMISSION_REQUEST_CODE) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (webView != null) {
                String js = String.format(Locale.ROOT,
                        "if (typeof window.onNotificationPermissionResult === 'function') { window.onNotificationPermissionResult(%b); }", granted);
                webView.evaluateJavascript(js, null);
            }
        }
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            handleBackPressed();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    private void handleBackPressed() {
        if (webView == null) {
            finish();
            return;
        }

        // Check if any modal / dialog / sheet is currently open in the DOM and close it
        String js = "(function() {" +
                "  try {" +
                "    var closeSelectors = [" +
                "      '[role=\"dialog\"][data-state=\"open\"] button[aria-label=\"Chiudi\"]'," +
                "      '[role=\"dialog\"][data-state=\"open\"] button[aria-label=\"Close\"]'," +
                "      '[role=\"alertdialog\"][data-state=\"open\"] button[aria-label=\"Chiudi\"]'," +
                "      '[role=\"alertdialog\"][data-state=\"open\"] button[aria-label=\"Close\"]'," +
                "      '[data-state=\"open\"] [data-radix-dialog-close]'," +
                "      '[data-state=\"open\"] button.close'," +
                "      'button[aria-label=\"Chiudi\"]'," +
                "      'button[aria-label=\"Close\"]'" +
                "    ];" +
                "    for (var i = 0; i < closeSelectors.length; i++) {" +
                "      var btn = document.querySelector(closeSelectors[i]);" +
                "      if (btn && btn.offsetParent !== null) {" +
                "        btn.click();" +
                "        return 'closed';" +
                "      }" +
                "    }" +
                "    var openModal = document.querySelector('[role=\"dialog\"][data-state=\"open\"], [role=\"alertdialog\"][data-state=\"open\"], [data-radix-portal] [data-state=\"open\"]');" +
                "    if (openModal) {" +
                "      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true }));" +
                "      return 'closed';" +
                "    }" +
                "  } catch(e) {}" +
                "  return 'none';" +
                "})();";

        webView.evaluateJavascript(js, result -> {
            boolean wasModalClosed = result != null && result.contains("closed");
            if (wasModalClosed) {
                // A modal was dismissed, do not navigate back
                return;
            }

            runOnUiThread(() -> {
                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    finish();
                }
            });
        });
    }

    @Override
    protected void onSaveInstanceState(@NonNull Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }
}
