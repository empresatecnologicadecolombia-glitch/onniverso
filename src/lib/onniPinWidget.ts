const ONIPIN_SRC = "https://onnivers.store/widget.js";
const ONIPIN_PIN = "onp_vuzadcjv3xw7";

type OniPinWidgetApi = {
  open: () => void;
  close: () => void;
  toggle: () => void;
};

declare global {
  interface Window {
    OniPinWidget?: OniPinWidgetApi;
    openOnniPinChat?: () => void;
  }
}

let loadPromise: Promise<void> | null = null;

function waitForApi(timeoutMs = 8000): Promise<OniPinWidgetApi> {
  return new Promise((resolve, reject) => {
    const existing = window.OniPinWidget;
    if (existing?.open) {
      resolve(existing);
      return;
    }

    const started = Date.now();
    const timer = window.setInterval(() => {
      if (window.OniPinWidget?.open) {
        window.clearInterval(timer);
        resolve(window.OniPinWidget);
        return;
      }
      if (Date.now() - started > timeoutMs) {
        window.clearInterval(timer);
        reject(new Error("OniPin widget no inicializó"));
      }
    }, 40);
  });
}

/** Carga el script oficial solo cuando hace falta (home / Contáctanos). */
export function ensureOnniPinWidget(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  if (window.OniPinWidget?.open) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${ONIPIN_SRC}"][data-pin="${ONIPIN_PIN}"]`,
    );
    if (existing) {
      waitForApi().then(() => resolve()).catch((err) => {
        loadPromise = null;
        reject(err);
      });
      return;
    }

    const script = document.createElement("script");
    script.src = ONIPIN_SRC;
    script.async = true;
    script.setAttribute("data-pin", ONIPIN_PIN);
    script.setAttribute("data-hide-launcher", "1");
    script.setAttribute("data-lang", "es");
    script.onload = () => {
      waitForApi().then(() => resolve()).catch((err) => {
        loadPromise = null;
        reject(err);
      });
    };
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("No se pudo cargar OniPin widget.js"));
    };
    document.body.appendChild(script);
  });

  return loadPromise;
}

export function openOnniPinChat(): void {
  const open = () => {
    window.OniPinWidget?.open();
  };

  if (window.OniPinWidget?.open) {
    open();
    return;
  }

  void ensureOnniPinWidget()
    .then(open)
    .catch((err) => {
      console.error("[OniPin]", err);
    });
}
