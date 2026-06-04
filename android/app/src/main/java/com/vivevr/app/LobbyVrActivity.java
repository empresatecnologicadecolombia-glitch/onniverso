package com.vivevr.app;

import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.button.MaterialButton;

/**
 * Lobby inmersivo VR estéreo: {@link StereoContainer} → {@value #LOBBY_IMMERSIVE_PRODUCTION_URL}
 * (o bundle local en assets si existe).
 */
public class LobbyVrActivity extends AppCompatActivity {

  public static final String LOBBY_IMMERSIVE_URL = "https://localhost/lobby-inmersivo";
  public static final String LOBBY_IMMERSIVE_PRODUCTION_URL = "https://onnivers.com/lobby-inmersivo";
  private static final String LOBBY_ASSET_ENTRY = "file:///android_asset/public/lobby-inmersivo/index.html";

  private StereoContainer stereoContainer;
  private WebView webView;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    FrameLayout root = new FrameLayout(this);
    root.setLayoutParams(
        new ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    root.setBackgroundColor(0xff000000);

    stereoContainer = new StereoContainer(this);
    stereoContainer.setLayoutParams(
        new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    root.addView(stereoContainer);

    webView = stereoContainer.getWebView();
    configureWebView(webView);
    webView.addJavascriptInterface(new LobbyReturnJsApi(this), "Android");
    webView.loadUrl(resolveLobbyEntryUrl());

    float density = getResources().getDisplayMetrics().density;
    int margin = (int) (12f * density);
    MaterialButton closeBtn = new MaterialButton(this);
    closeBtn.setText("La Tierra");
    closeBtn.setAllCaps(false);
    FrameLayout.LayoutParams closeLp =
        new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    closeLp.gravity = android.view.Gravity.TOP | android.view.Gravity.END;
    closeLp.setMargins(margin, margin, margin, margin);
    closeBtn.setLayoutParams(closeLp);
    closeBtn.setElevation(24f);
    closeBtn.setOnClickListener(
        v -> {
          if (webView != null) {
            webView.evaluateJavascript(
                "(function(){if(window.Android&&typeof window.Android.onVrClick==='function'){window.Android.onVrClick();return true;}return false;})()",
                value -> {
                  if (!"true".equals(String.valueOf(value))) {
                    finish();
                  }
                });
          } else {
            finish();
          }
        });
    root.addView(closeBtn);

    setContentView(root);
  }

  private String resolveLobbyEntryUrl() {
    try {
      String[] entries = getAssets().list("public/lobby-inmersivo");
      if (entries != null && entries.length > 0) {
        return LOBBY_ASSET_ENTRY;
      }
    } catch (Exception ignored) {
      // fallback
    }
    return LOBBY_IMMERSIVE_PRODUCTION_URL;
  }

  private void configureWebView(WebView wv) {
    WebSettings settings = wv.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setMediaPlaybackRequiresUserGesture(false);
    settings.setAllowFileAccess(true);
    settings.setAllowContentAccess(true);
    wv.setWebViewClient(new WebViewClient());
    wv.setWebChromeClient(
        new WebChromeClient() {
          @Override
          public void onPermissionRequest(final PermissionRequest request) {
            if (request != null && request.getResources() != null) {
              request.grant(request.getResources());
            }
          }
        });
  }

  @Override
  protected void onDestroy() {
    if (webView != null) {
      webView.destroy();
      webView = null;
    }
    stereoContainer = null;
    super.onDestroy();
  }

  /** Salida del lobby: {@code window.Android.onVrClick()} cierra y vuelve al inicio. */
  private static final class LobbyReturnJsApi {

    private final LobbyVrActivity activity;

    LobbyReturnJsApi(LobbyVrActivity activity) {
      this.activity = activity;
    }

    @JavascriptInterface
    public void onVrClick() {
      activity.runOnUiThread(activity::finish);
    }

    @JavascriptInterface
    public void openSelector() {
      activity.runOnUiThread(activity::finish);
    }
  }
}
