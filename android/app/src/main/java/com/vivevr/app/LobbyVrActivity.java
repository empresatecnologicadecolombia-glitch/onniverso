package com.vivevr.app;

import android.content.Intent;
import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.button.MaterialButton;

/**
 * Lobby inmersivo (respaldo si el WebView Capacitor no está listo): assets locales o
 * {@value #LOBBY_IMMERSIVE_URL}.
 */
public class LobbyVrActivity extends AppCompatActivity {

  public static final String LOBBY_IMMERSIVE_URL = "https://localhost/lobby-inmersivo";
  private static final String LOBBY_ASSET_ENTRY = "file:///android_asset/public/lobby-inmersivo/index.html";

  private WebView webView;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    String clipFromIntent = "";
    if (getIntent() != null && getIntent().getStringExtra(StreamExtras.STREAM_URL) != null) {
      clipFromIntent = getIntent().getStringExtra(StreamExtras.STREAM_URL).trim();
    }

    FrameLayout root = new FrameLayout(this);
    root.setLayoutParams(
        new ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    root.setBackgroundColor(0xff000000);

    webView = new WebView(this);
    webView.setLayoutParams(
        new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    configureWebView(webView);
    webView.addJavascriptInterface(new LobbyReturnJsApi(this), "Android");
    String lobbyUrl = resolveLobbyEntryUrl();
    webView.loadUrl(lobbyUrl);
    root.addView(webView);

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

    if (!clipFromIntent.isEmpty() && StreamUrlResolver.isPlayableHttpUrl(clipFromIntent)) {
      try {
        Intent selector = new Intent(this, SelectorActivity.class);
        selector.putExtra(SelectorActivity.EXTRA_PREFERRED_SCENE, "split");
        selector.putExtra(StreamExtras.STREAM_URL, clipFromIntent);
        selector.putExtra(SelectorActivity.EXTRA_PLAYBACK_URL, clipFromIntent);
        selector.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(selector);
      } catch (Exception ignored) {
        Toast.makeText(this, "No se pudo abrir el selector con el clip.", Toast.LENGTH_SHORT).show();
      }
    }
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
    return LOBBY_IMMERSIVE_URL;
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
    super.onDestroy();
  }

  /**
   * Puente mínimo para salir del lobby: {@code window.Android.onVrClick()} o
   * {@code window.Android.openSelector()} cierran esta Activity y vuelven al menú (Tierra).
   */
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
