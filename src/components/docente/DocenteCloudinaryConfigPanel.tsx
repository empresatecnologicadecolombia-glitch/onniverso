import { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2, PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  fetchCloudinaryPlatformConfig,
  isCloudinaryConfigComplete,
  saveCloudinaryPlatformConfig,
  testCloudinaryConnection,
  type CloudinaryPlatformConfigForm,
} from "@/lib/cloudinaryPlatformConfig";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const EMPTY_FORM: CloudinaryPlatformConfigForm = {
  cloud_name: "dmbpk37l5",
  api_key: "",
  api_secret: "",
  upload_preset: "",
  folder_prefix: "onnivers/docentes",
};

export default function DocenteCloudinaryConfigPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [hasStoredSecret, setHasStoredSecret] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [form, setForm] = useState<CloudinaryPlatformConfigForm>(EMPTY_FORM);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const row = await fetchCloudinaryPlatformConfig();
      if (row) {
        setForm({
          cloud_name: row.cloud_name || EMPTY_FORM.cloud_name,
          api_key: row.api_key || "",
          api_secret: "",
          upload_preset: row.upload_preset ?? "",
          folder_prefix: row.folder_prefix || EMPTY_FORM.folder_prefix,
        });
        setHasStoredSecret(Boolean(row.api_secret?.trim()));
        setConfigured(isCloudinaryConfigComplete(row));
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo cargar la configuración.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    if (!form.cloud_name.trim() || !form.api_key.trim()) {
      toast.error("Cloud name y API Key son obligatorios.");
      return;
    }
    if (!form.api_secret.trim() && !hasStoredSecret) {
      toast.error("Escribe el API Secret.");
      return;
    }

    setSaving(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) throw new Error("Sesión no válida.");

      await saveCloudinaryPlatformConfig(form, user.id, { keepExistingSecret: !form.api_secret.trim() });
      setHasStoredSecret(true);
      setConfigured(true);
      setForm((prev) => ({ ...prev, api_secret: "" }));
      toast.success("Configuración Cloudinary guardada.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    const secretForTest = form.api_secret.trim();
    if (!secretForTest && !hasStoredSecret) {
      toast.error("Guarda el API Secret antes de probar, o escríbelo en el campo.");
      return;
    }

    setTesting(true);
    try {
      let secret = secretForTest;
      if (!secret) {
        const row = await fetchCloudinaryPlatformConfig();
        secret = row?.api_secret?.trim() ?? "";
      }
      const result = await testCloudinaryConnection({
        cloud_name: form.cloud_name.trim(),
        api_key: form.api_key.trim(),
        api_secret: secret,
      });
      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al probar conexión.");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Cargando configuración API…</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-base font-semibold text-cyan-50">Claves API Cloudinary</h3>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Dashboard Cloudinary → Settings → API Keys. El secret solo se usa en el servidor para firmar
            subidas.
          </p>
        </div>
        <span
          className={
            configured
              ? "rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200"
              : "rounded-full border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-100"
          }
        >
          {configured ? "Configurado" : "Pendiente"}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="cloudinary-cloud-name">Cloud name</Label>
          <Input
            id="cloudinary-cloud-name"
            value={form.cloud_name}
            onChange={(e) => setForm((prev) => ({ ...prev, cloud_name: e.target.value }))}
            placeholder="dmbpk37l5"
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cloudinary-api-key">API Key</Label>
          <Input
            id="cloudinary-api-key"
            value={form.api_key}
            onChange={(e) => setForm((prev) => ({ ...prev, api_key: e.target.value }))}
            placeholder="123456789012345"
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cloudinary-api-secret">API Secret</Label>
          <Input
            id="cloudinary-api-secret"
            type="password"
            value={form.api_secret}
            onChange={(e) => setForm((prev) => ({ ...prev, api_secret: e.target.value }))}
            placeholder={hasStoredSecret ? "•••••••• (guardado — deja vacío para mantener)" : "Tu API Secret"}
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cloudinary-upload-preset">Upload preset (opcional)</Label>
          <Input
            id="cloudinary-upload-preset"
            value={form.upload_preset}
            onChange={(e) => setForm((prev) => ({ ...prev, upload_preset: e.target.value }))}
            placeholder="onnivers_docente_unsigned"
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cloudinary-folder">Carpeta base en Cloudinary</Label>
          <Input
            id="cloudinary-folder"
            value={form.folder_prefix}
            onChange={(e) => setForm((prev) => ({ ...prev, folder_prefix: e.target.value }))}
            placeholder="onnivers/docentes"
            autoComplete="off"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => void handleSave()} disabled={saving || testing} className="gap-1.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <KeyRound className="h-4 w-4" aria-hidden />}
          Guardar claves
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleTest()}
          disabled={saving || testing}
          className="gap-1.5"
        >
          {testing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <PlugZap className="h-4 w-4" aria-hidden />}
          Probar conexión
        </Button>
      </div>
    </div>
  );
}
