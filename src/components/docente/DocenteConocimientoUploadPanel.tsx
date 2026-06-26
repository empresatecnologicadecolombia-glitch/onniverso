import { useCallback, useId, useRef, useState } from "react";
import { Box, FileText, Film, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  acceptForTipo,
  DOCENTE_VIDEO_UPLOAD_LIMIT,
  labelForTipo,
  saveDocenteConocimientoRecurso,
  uploadDocenteRecursoToCloudinary,
  uploadErrorMessage,
  type DocenteRecursoTipo,
} from "@/lib/docenteConocimientoResources";
import { toast } from "sonner";

type UploadCardProps = {
  tipo: DocenteRecursoTipo;
  docenteId: string;
  videoCount: number;
  onUploaded: () => void;
};

function UploadTypeCard({ tipo, docenteId, videoCount, onUploaded }: UploadCardProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const Icon = tipo === "video" ? Film : tipo === "pdf" ? FileText : Box;
  const atVideoLimit = tipo === "video" && videoCount >= DOCENTE_VIDEO_UPLOAD_LIMIT;

  const handlePick = () => {
    if (atVideoLimit) {
      toast.error(`Límite de ${DOCENTE_VIDEO_UPLOAD_LIMIT} videos alcanzado.`);
      return;
    }
    inputRef.current?.click();
  };

  const handleFile = async (file: File | undefined) => {
    if (!file || uploading) return;
    if (atVideoLimit) {
      toast.error(`Límite de ${DOCENTE_VIDEO_UPLOAD_LIMIT} videos alcanzado.`);
      return;
    }

    setUploading(true);
    try {
      const { secureUrl, publicId } = await uploadDocenteRecursoToCloudinary({
        docenteId,
        tipo,
        file,
      });
      await saveDocenteConocimientoRecurso({
        docenteId,
        tipo,
        titulo: file.name.replace(/\.[^.]+$/, "") || labelForTipo(tipo),
        resourceUrl: secureUrl,
        publicId,
        fileName: file.name,
      });
      toast.success(`${labelForTipo(tipo)} subido correctamente.`);
      onUploaded();
    } catch (e: unknown) {
      toast.error(uploadErrorMessage(e));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col rounded-xl border border-dashed border-cyan-400/35 bg-black/20 p-4 text-center">
      <Icon className="mx-auto mb-2 h-8 w-8 text-cyan-300/80" aria-hidden />
      <p className="text-sm font-medium text-cyan-50">{labelForTipo(tipo)}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {tipo === "video"
          ? `${videoCount}/${DOCENTE_VIDEO_UPLOAD_LIMIT} videos`
          : tipo === "pdf"
            ? "Material de apoyo"
            : "Archivo GLB"}
      </p>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={acceptForTipo(tipo)}
        className="sr-only"
        disabled={uploading || atVideoLimit}
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-4 w-full gap-1.5 border-cyan-400/40 text-cyan-100"
        disabled={uploading || atVideoLimit}
        onClick={handlePick}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Upload className="h-4 w-4" aria-hidden />
        )}
        {uploading ? "Subiendo…" : atVideoLimit ? "Límite alcanzado" : "Seleccionar archivo"}
      </Button>
    </div>
  );
}

type DocenteConocimientoUploadPanelProps = {
  docenteId: string;
  videoCount: number;
  onUploaded: () => void;
};

export default function DocenteConocimientoUploadPanel({
  docenteId,
  videoCount,
  onUploaded,
}: DocenteConocimientoUploadPanelProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Sube archivos a Cloudinary. Los enlaces quedarán en <strong className="text-cyan-100">Mis recursos</strong>{" "}
        para copiarlos a tus clases.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <UploadTypeCard tipo="video" docenteId={docenteId} videoCount={videoCount} onUploaded={onUploaded} />
        <UploadTypeCard tipo="pdf" docenteId={docenteId} videoCount={videoCount} onUploaded={onUploaded} />
        <UploadTypeCard tipo="glb" docenteId={docenteId} videoCount={videoCount} onUploaded={onUploaded} />
      </div>
    </div>
  );
}
