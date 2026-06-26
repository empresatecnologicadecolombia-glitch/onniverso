import { supabase } from "@/integrations/supabase/client";

export type CloudinaryPlatformConfig = {
  cloud_name: string;
  api_key: string;
  api_secret: string;
  upload_preset: string | null;
  folder_prefix: string;
  updated_at: string | null;
};

export type CloudinaryPlatformConfigForm = {
  cloud_name: string;
  api_key: string;
  api_secret: string;
  upload_preset: string;
  folder_prefix: string;
};

const CONFIG_ROW_ID = 1;

export async function fetchCloudinaryPlatformConfig(): Promise<CloudinaryPlatformConfig | null> {
  const { data, error } = await supabase
    .from("cloudinary_platform_config" as never)
    .select("cloud_name,api_key,api_secret,upload_preset,folder_prefix,updated_at")
    .eq("id", CONFIG_ROW_ID)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return data as CloudinaryPlatformConfig;
}

export async function saveCloudinaryPlatformConfig(
  form: CloudinaryPlatformConfigForm,
  userId: string,
  options?: { keepExistingSecret?: boolean },
): Promise<void> {
  const existing = await fetchCloudinaryPlatformConfig();
  const secretToSave =
    form.api_secret.trim() || (options?.keepExistingSecret ? existing?.api_secret ?? "" : "");

  const payload = {
    id: CONFIG_ROW_ID,
    cloud_name: form.cloud_name.trim(),
    api_key: form.api_key.trim(),
    api_secret: secretToSave,
    upload_preset: form.upload_preset.trim() || null,
    folder_prefix: form.folder_prefix.trim() || "onnivers/docentes",
    updated_at: new Date().toISOString(),
    updated_by: userId,
  };

  const { error } = await supabase
    .from("cloudinary_platform_config" as never)
    .upsert(payload as never, { onConflict: "id" });

  if (error) throw error;
}

export function isCloudinaryConfigComplete(config: CloudinaryPlatformConfig | null): boolean {
  if (!config) return false;
  return Boolean(config.cloud_name.trim() && config.api_key.trim() && config.api_secret.trim());
}

export async function testCloudinaryConnection(credentials: {
  cloud_name: string;
  api_key: string;
  api_secret: string;
}): Promise<{ ok: boolean; message: string }> {
  const res = await fetch("/api/cloudinary/test-connection", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });

  const body = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string };
  if (!res.ok || !body.ok) {
    return { ok: false, message: body.error ?? body.message ?? `Error ${res.status}` };
  }
  return { ok: true, message: body.message ?? "Conexión correcta con Cloudinary." };
}
