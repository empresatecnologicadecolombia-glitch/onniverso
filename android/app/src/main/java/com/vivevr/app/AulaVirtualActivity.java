package com.vivevr.app;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.button.MaterialButton;

import java.util.Locale;

/**
 * Visor estéreo nativo ({@link StereoContainer}): Aula Virtual por defecto; la Tierra pasa
 * {@link ImmersiveStereoExtras#EXTRA_URL} con {@value #LOBBY_IMMERSIVE_URL}.
 */
public class AulaVirtualActivity extends AppCompatActivity {

  public static final String AULA_VIRTUAL_URL = "https://onnivers.com/aula-virtual";
  public static final String LOBBY_IMMERSIVE_URL = "https://onnivers.com/lobby-inmersivo";

  private static final String STEREO_MOBILE_UA =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

  /** Sitios externos (Caracol, etc.) cargan mejor con UA de escritorio. */
  private static final String STEREO_EXTERNAL_DESKTOP_UA =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

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
    webView.loadUrl(resolveStereoUrl());

    float density = getResources().getDisplayMetrics().density;
    int margin = (int) (12f * density);
    MaterialButton closeBtn = new MaterialButton(this);
    closeBtn.setText("Cerrar");
    closeBtn.setAllCaps(false);
    FrameLayout.LayoutParams closeLp =
        new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    closeLp.gravity = android.view.Gravity.TOP | android.view.Gravity.END;
    closeLp.setMargins(margin, margin, margin, margin);
    closeBtn.setLayoutParams(closeLp);
    closeBtn.setElevation(24f);
    closeBtn.setOnClickListener(v -> finish());
    root.addView(closeBtn);

    setContentView(root);
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    if (webView != null) {
      webView.loadUrl(resolveStereoUrl());
    }
  }

  private String resolveStereoUrl() {
    if (getIntent() != null) {
      String extra = getIntent().getStringExtra(ImmersiveStereoExtras.EXTRA_URL);
      if (extra != null && !extra.trim().isEmpty()) {
        return MainActivity.normalizeStereoWebUrl(extra.trim());
      }
    }
    return AULA_VIRTUAL_URL;
  }

  private void configureWebView(WebView wv) {
    WebSettings settings = wv.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setDatabaseEnabled(true);
    settings.setMediaPlaybackRequiresUserGesture(false);
    settings.setAllowFileAccess(true);
    settings.setAllowContentAccess(true);
    settings.setUseWideViewPort(true);
    settings.setLoadWithOverviewMode(true);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
    }
    String stereoUrl = resolveStereoUrl().toLowerCase(Locale.ROOT);
    if (stereoUrl.contains("youtube.com") || stereoUrl.contains("youtu.be")) {
      settings.setUserAgentString(STEREO_MOBILE_UA);
    } else if (!stereoUrl.contains("onnivers.com")) {
      settings.setUserAgentString(STEREO_EXTERNAL_DESKTOP_UA);
    }
    wv.setLayerType(View.LAYER_TYPE_HARDWARE, null);
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
}
