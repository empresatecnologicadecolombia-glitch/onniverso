package com.vivevr.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.button.MaterialButton;

import java.util.Locale;

/**
 * Iconos Redes — Cine: dos {@link WebView} lado a lado (estéreo SBS). Un solo WebView con recorte
 * ({@link StereoContainer}) rompe la reproducción de YouTube ("Source error").
 */
public class RedesStereoActivity extends AppCompatActivity {

  private static final String STEREO_MOBILE_UA =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

  private WebView leftWebView;
  private WebView rightWebView;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    String targetUrl = resolveTargetUrl();
    if (targetUrl.isEmpty()) {
      Toast.makeText(this, "URL de red social vacía.", Toast.LENGTH_SHORT).show();
      finish();
      return;
    }

    FrameLayout root = new FrameLayout(this);
    root.setLayoutParams(
        new ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    root.setBackgroundColor(0xff000000);

    LinearLayout row = new LinearLayout(this);
    row.setOrientation(LinearLayout.HORIZONTAL);
    row.setLayoutParams(
        new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

    leftWebView = createConfiguredWebView(targetUrl);
    rightWebView = createConfiguredWebView(targetUrl);

    LinearLayout.LayoutParams half =
        new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f);
    leftWebView.setLayoutParams(half);
    rightWebView.setLayoutParams(half);

    row.addView(leftWebView);
    row.addView(rightWebView);
    root.addView(row);

    float density = getResources().getDisplayMetrics().density;
    int margin = (int) (12f * density);
    MaterialButton closeBtn = new MaterialButton(this);
    closeBtn.setText("Cerrar");
    closeBtn.setAllCaps(false);
    FrameLayout.LayoutParams closeLp =
        new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    closeLp.gravity = Gravity.TOP | Gravity.END;
    closeLp.setMargins(margin, margin, margin, margin);
    closeBtn.setLayoutParams(closeLp);
    closeBtn.setElevation(24f);
    closeBtn.setOnClickListener(v -> finish());
    root.addView(closeBtn);

    setContentView(root);

    leftWebView.loadUrl(targetUrl);
    rightWebView.loadUrl(targetUrl);
  }

  private String resolveTargetUrl() {
    if (getIntent() != null) {
      String extra = getIntent().getStringExtra(ImmersiveStereoExtras.EXTRA_URL);
      if (extra != null && !extra.trim().isEmpty()) {
        return MainActivity.normalizeStereoWebUrl(extra.trim());
      }
    }
    return "";
  }

  private WebView createConfiguredWebView(String targetUrl) {
    WebView wv = new WebView(this);
    WebSettings settings = wv.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setDatabaseEnabled(true);
    settings.setLoadWithOverviewMode(true);
    settings.setUseWideViewPort(true);
    settings.setMediaPlaybackRequiresUserGesture(false);
    settings.setAllowFileAccess(true);
    settings.setAllowContentAccess(true);
    settings.setUserAgentString(STEREO_MOBILE_UA);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
    }

    wv.setLayerType(View.LAYER_TYPE_HARDWARE, null);
    wv.setBackgroundColor(0xff02030a);
    wv.setWebViewClient(
        new WebViewClient() {
          @Override
          public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request != null ? request.getUrl() : null;
            if (uri == null) {
              return false;
            }
            String scheme =
                uri.getScheme() != null ? uri.getScheme().toLowerCase(Locale.ROOT) : "";
            return !"http".equals(scheme) && !"https".equals(scheme);
          }
        });
    wv.setWebChromeClient(
        new WebChromeClient() {
          @Override
          public void onPermissionRequest(final PermissionRequest request) {
            if (request != null && request.getResources() != null) {
              request.grant(request.getResources());
            }
          }
        });
    return wv;
  }

  @Override
  protected void onDestroy() {
    destroyWebView(leftWebView);
    destroyWebView(rightWebView);
    leftWebView = null;
    rightWebView = null;
    super.onDestroy();
  }

  private void destroyWebView(WebView wv) {
    if (wv != null) {
      wv.destroy();
    }
  }
}
