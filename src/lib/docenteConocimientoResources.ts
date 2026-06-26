import { supabase } from "@/integrations/supabase/client";
import { fetchCloudinaryPlatformConfig, isCloudinaryConfigComplete } from "@/lib/cloudinaryPlatformConfig";

export const DOCENTE_VIDEO_UPLOAD_LIMIT = 5;

export type DocenteRecursoTipo = "video" | "pdf" | "glb";

export type DocenteConocimientoRecurso = {
  id: string;
  docente_id: string;
  tipo: DocenteRecursoTipo;
  titulo: string;
  resource_url: string;
  public_id: string | null;
  file_name: string | null;
  created_at: string;
};

const CLOUDINARY_UPLOAD_PATH: Record<DocenteRecursoTipo, string> = {
  video: "video",
  pdf: "raw",
  glb: "image",
};

const ACCEPT_BY_TIPO: Record<DocenteRecursoTipo, string> = {
  video: "video/mp4,video/quicktime,.mp4",
  pdf: "application/pdf,.pdf",
  glb: "model/gltf-binary,.glb",
};

export function acceptForTipo(tipo: DocenteRecursoTipo): string {
  return ACCEPT_BY_TIPO[tipo];
}

export function labelForTipo(tipo: DocenteRecursoTipo): string {
  if (tipo === "video") return "Video MP4";
  if (tipo === "pdf") return "PDF";
  return "Modelo 3D";
}

function sanitizeBaseName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").trim() || "recurso";
  return base
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

type CloudinaryUploadResponse = {
  secure_url?: string;
  url?: string;
  public_id?: string;
  error?: { message?: string };
};

async function requestSignedUploadParams(params: {
  cloud_name: string;
  api_key: string;
  api_secret: string;
  resource_type: DocenteRecursoTipo;
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
      resource_type: CLOUDINARY_UPLOAD_PATH[params.resource_type],
      folder: params.folder,
      public_id: params.public_id,
      upload_preset: params.upload_preset ?? undefined,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    cloud_name?: string;
    api_key?: string;
    timestamp?: number;
    signature?: string;
    folder?: string;
    public_id?: string;
    upload_preset?: string;
  };
  if (!res.ok || !body.ok || !body.signature || !body.timestamp) {
    throw new Error(body.error ?? `No se pudo firmar la subida (${res.status}).`);
  }
  return body;
}

export async function uploadDocenteRecursoToCloudinary(params: {
  docenteId: string;
  tipo: DocenteRecursoTipo;
  file: File;
}): Promise<{ secureUrl: string; publicId: string | null }> {
  const config = await fetchCloudinaryPlatformConfig();
  if (!isCloudinaryConfigComplete(config)) {
    throw new Error("Configura las claves API Cloudinary antes de subir archivos.");
  }

  const folder = `${config!.folder_prefix.replace(/\/+$/, "")}/${params.docenteId}/${params.tipo}`;
  const publicId = `${folder}/${sanitizeBaseName(params.file.name)}-${Date.now()}`;
  const uploadPath = CLOUDINARY_UPLOAD_PATH[params.tipo];
  const cloudName = config!.cloud_name.trim();

  const formData = new FormData();
  formData.append("file", params.file);

  if (config!.upload_preset?.trim()) {
    formData.append("upload_preset", config!.upload_preset.trim());
    formData.append("folder", folder);
  } else {
    const signed = await requestSignedUploadParams({
      cloud_name: cloudName,
      api_key: config!.api_key,
      api_secret: config!.api_secret,
      resource_type: params.tipo,
      folder,
      public_id: publicId,
    });
    formData.append("api_key", signed.api_key!);
    formData.append("timestamp", String(signed.timestamp));
    formData.append("signature", signed.signature);
    formData.append("folder", folder);
    formData.append("public_id", publicId);
  }

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${uploadPath}/upload`, {
    method: "POST",
    body: formData,
  });

  const payload = (await uploadRes.json().catch(() => ({}))) as CloudinaryUploadResponse;
  if (!uploadRes.ok) {
    throw new Error(payload.error?.message ?? `Cloudinary rechazó la subida (${uploadRes.status}).`);
  }

  const secureUrl = payload.secure_url?.trim() || payload.url?.trim() || "";
  if (!secureUrl) {
    throw new Error("Cloudinary no devolvió URL del archivo.");
  }

  return { secureUrl, publicId: payload.public_id?.trim() || null };
}

export async function countDocenteVideos(docenteId: string): Promise<number> {
  const { count, error } = await supabase
    .from("docente_conocimiento_recursos" as never)
    .select("id", { count: "exact", head: true })
    .eq("docente_id", docenteId)
    .eq("tipo", "video");

  if (error) throw error;
  return count ?? 0;
}

export async function fetchDocenteConocimientoRecursos(
  docenteId: string,
): Promise<DocenteConocimientoRecurso[]> {
  const { data, error } = await supabase
    .from("docente_conocimiento_recursos" as never)
    .select("id,docente_id,tipo,titulo,resource_url,public_id,file_name,created_at")
    .eq("docente_id", docenteId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DocenteConocimientoRecurso[];
}

export async function saveDocenteConocimientoRecurso(params: {
  docenteId: string;
  tipo: DocenteRecursoTipo;
  titulo: string;
  resourceUrl: string;
  publicId: string | null;
  fileName: string;
}): Promise<DocenteConocimientoRecurso> {
  if (params.tipo === "video") {
    const count = await countDocenteVideos(params.docenteId);
    if (count >= DOCENTE_VIDEO_UPLOAD_LIMIT) {
      throw new Error("VIDEO_LIMIT_REACHED");
    }
  }

  const { data, error } = await supabase
    .from("docente_conocimiento_recursos" as never)
    .insert({
      docente_id: params.docenteId,
      tipo: params.tipo,
      titulo: params.titulo.trim() || params.fileName,
      resource_url: params.resourceUrl,
      public_id: params.publicId,
      file_name: params.fileName,
    } as never)
    .select("id,docente_id,tipo,titulo,resource_url,public_id,file_name,created_at")
    .single();

  if (error) {
    if (`${error.message}`.includes("VIDEO_LIMIT_REACHED")) {
      throw new Error("VIDEO_LIMIT_REACHED");
    }
    throw error;
  }

  return data as DocenteConocimientoRecurso;
}

export async function deleteDocenteConocimientoRecurso(id: string, docenteId: string): Promise<void> {
  const { error } = await supabase
    .from("docente_conocimiento_recursos" as never)
    .delete()
    .eq("id", id)
    .eq("docente_id", docenteId);

  if (error) throw error;
}

export function uploadErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message === "VIDEO_LIMIT_REACHED") {
      return `Ya tienes ${DOCENTE_VIDEO_UPLOAD_LIMIT} videos. Elimina uno para subir otro.`;
    }
    return error.message;
  }
  return "No se pudo subir el archivo.";
}
