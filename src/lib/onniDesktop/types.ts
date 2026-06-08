export type OnniDesktopJob =
  | {
      v: 1;
      tipo: "accion";
      accion: string;
      params?: Record<string, unknown>;
      confirmar?: boolean;
    }
  | {
      v: 1;
      tipo: "secuencia";
      pasos: Array<{ accion: string; params?: Record<string, unknown> }>;
      confirmar?: boolean;
    }
  | {
      v: 1;
      tipo: "flujo";
      flujo: string;
      params?: Record<string, unknown>;
      confirmar?: boolean;
    };

export type OnniDesktopResult = {
  ok: boolean;
  accion?: string;
  carpeta?: string;
  archivos?: string[];
  mensaje?: string;
  delegar_electron?: boolean;
};
