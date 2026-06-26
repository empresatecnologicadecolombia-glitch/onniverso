import { supabase } from "@/integrations/supabase/client";
import type { DocenteCatalogVideoItem } from "@/data/docenteContentCatalog";
import { buildAgoraChannel } from "@/lib/agoraRooms";
import { fetchCloudinaryPlatformConfig, isCloudinaryConfigComplete } from "@/lib/cloudinaryPlatformConfig";
import type { RoomCard } from "@/lib/salaRoomCards";

export type DocenteConocimientoTarjeta = {
  id: string;
  docente_id: string;
  slug: string;
  titulo: string;
  descripcion: string;
  video_url: string;
  image_url: string;
  badge: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PublishDocenteTarjetaInput = {
  docenteId: string;
  titulo: string;
  descripcion: string;
  videoUrl: string;
  imageUrl: string;
  badge?: string;
};

const DEFAULT_BADGE = "Contenido docente";
const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80";

export function docenteTarjetaPlaceholderImage(): string {
  return PLACEHOLDER_IMAGE;
}

function slugifyTitle(text: string): string {
  const base = text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
  return base || "tarjeta";
}

function buildTarjetaSlug(titulo: string): string {
  const suffix = Date.now().toString(36);
  return `docente-${slugifyTitle(titulo)}-${suffix}`;
}

async function requestSignedImageUpload(params: {
  cloud_name: string;
  api_key: string;
  api_secret: string;
  folder: string;
  public_id: string;
  upload_preset?: string | null;
}) {
  const res = await fetch("/api/cloudinary/sign-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cloud_name: params.cloud_name,
      api_key: params.api_key,
      api_secret: params.api_secret,
      resource_type: "image",
      folder: params.folder,
      public_id: params.public_id,
      upload_preset: params.upload_preset ?? undefined,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    api_key?: string;
    timestamp?: number;
    signature?: string;
  };
  if (!res.ok || !body.ok || !body.signature || !body.timestamp) {
    throw new Error(body.error ?? `No se pudo firmar la imagen (${res.status}).`);
  }
  return body;
}

export async function uploadDocenteTarjetaImage(docenteId: string, file: File): Promise<string> {
  const config = await fetchCloudinaryPlatformConfig();
  if (!isCloudinaryConfigComplete(config)) {
    throw new Error("Configura las claves API Cloudinary antes de subir la imagen.");
  }

  const folder = `${config!.folder_prefix.replace(/\/+$/, "")}/${docenteId}/tarjetas`;
  const baseName = file.name.replace(/\.[^.]+$/, "").trim() || "portada";
  const publicId = `${folder}/${baseName}-${Date.now()}`;
  const cloudName = config!.cloud_name.trim();

  const formData = new FormData();
  formData.append("file", file);

  if (config!.upload_preset?.trim()) {
    formData.append("upload_preset", config!.upload_preset.trim());
    formData.append("folder", folder);
  } else {
    const signed = await requestSignedImageUpload({
      cloud_name: cloudName,
      api_key: config!.api_key,
      api_secret: config!.api_secret,
      folder,
      public_id: publicId,
      upload_preset: config!.upload_preset,
    });
    formData.append("api_key", signed.api_key!);
    formData.append("timestamp", String(signed.timestamp));
    formData.append("signature", signed.signature);
    formData.append("folder", folder);
    formData.append("public_id", publicId);
  }

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });
  const payload = (await uploadRes.json().catch(() => ({}))) as {
    secure_url?: string;
    url?: string;
    error?: { message?: string };
  };
  if (!uploadRes.ok) {
    throw new Error(payload.error?.message ?? `Cloudinary rechazó la imagen (${uploadRes.status}).`);
  }
  const secureUrl = payload.secure_url?.trim() || payload.url?.trim() || "";
  if (!secureUrl) {
    throw new Error("Cloudinary no devolvió URL de la imagen.");
  }
  return secureUrl;
}

export async function fetchPublishedDocenteTarjetas(): Promise<DocenteConocimientoTarjeta[]> {
  const { data, error } = await supabase
    .from("docente_conocimiento_tarjetas" as never)
    .select(
      "id,docente_id,slug,titulo,descripcion,video_url,image_url,badge,published,published_at,created_at,updated_at",
    )
    .eq("published", true)
    .order("published_at", { ascending: false, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as DocenteConocimientoTarjeta[];
}

export async function fetchDocenteOwnTarjetas(docenteId: string): Promise<DocenteConocimientoTarjeta[]> {
  const { data, error } = await supabase
    .from("docente_conocimiento_tarjetas" as never)
    .select(
      "id,docente_id,slug,titulo,descripcion,video_url,image_url,badge,published,published_at,created_at,updated_at",
    )
    .eq("docente_id", docenteId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DocenteConocimientoTarjeta[];
}

export async function publishDocenteConocimientoTarjeta(
  input: PublishDocenteTarjetaInput,
): Promise<DocenteConocimientoTarjeta> {
  const titulo = input.titulo.trim();
  const videoUrl = input.videoUrl.trim();
  const imageUrl = input.imageUrl.trim();

  if (!titulo) throw new Error("Escribe el nombre de la tarjeta.");
  if (!videoUrl.startsWith("http")) throw new Error("Pega un enlace de video válido (http/https).");
  if (!imageUrl.startsWith("http")) throw new Error("Sube una imagen de portada para la tarjeta.");

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("docente_conocimiento_tarjetas" as never)
    .insert({
      docente_id: input.docenteId,
      slug: buildTarjetaSlug(titulo),
      titulo,
      descripcion: input.descripcion.trim(),
      video_url: videoUrl,
      image_url: imageUrl,
      badge: input.badge?.trim() || DEFAULT_BADGE,
      published: true,
      published_at: now,
      updated_at: now,
    } as never)
    .select(
      "id,docente_id,slug,titulo,descripcion,video_url,image_url,badge,published,published_at,created_at,updated_at",
    )
    .single();

  if (error) throw error;
  return data as DocenteConocimientoTarjeta;
}

export async function unpublishDocenteConocimientoTarjeta(id: string, docenteId: string): Promise<void> {
  const { error } = await supabase
    .from("docente_conocimiento_tarjetas" as never)
    .update({ published: false, updated_at: new Date().toISOString() } as never)
    .eq("id", id)
    .eq("docente_id", docenteId);

  if (error) throw error;
}

export async function deleteDocenteConocimientoTarjeta(id: string, docenteId: string): Promise<void> {
  const { error } = await supabase
    .from("docente_conocimiento_tarjetas" as never)
    .delete()
    .eq("id", id)
    .eq("docente_id", docenteId);

  if (error) throw error;
}

export function tarjetaToRoomCard(tarjeta: DocenteConocimientoTarjeta): RoomCard {
  return {
    id: tarjeta.slug,
    name: tarjeta.titulo,
    image: tarjeta.image_url,
    subtitle: tarjeta.badge,
    description: tarjeta.descripcion || tarjeta.titulo,
    status: "Offline",
    channel: buildAgoraChannel(tarjeta.slug),
    isPremium: false,
    priceUsd: 0,
    ownerUserId: tarjeta.docente_id,
    mp4Url: tarjeta.video_url,
  };
}

export function tarjetaToCatalogVideo(tarjeta: DocenteConocimientoTarjeta): DocenteCatalogVideoItem {
  return {
    id: tarjeta.slug,
    title: tarjeta.titulo,
    description: tarjeta.descripcion,
    videoUrl: tarjeta.video_url,
    imageUrl: tarjeta.image_url,
    badge: tarjeta.badge,
  };
}
