import { useCallback, useId, useRef, useState } from "react";
import { ImagePlus, Loader2, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import VideosEducativosVideoCard from "@/components/salas/VideosEducativosVideoCard";
import type { DocenteConocimientoRecurso } from "@/lib/docenteConocimientoResources";
import {
  deleteDocenteConocimientoTarjeta,
  docenteTarjetaPlaceholderImage,
  publishDocenteConocimientoTarjeta,
  unpublishDocenteConocimientoTarjeta,
  uploadDocenteTarjetaImage,
  type DocenteConocimientoTarjeta,
} from "@/lib/docenteConocimientoTarjetas";
import { toast } from "sonner";

type DocenteConocimientoTarjetaEditorProps = {
  docenteId: string;
  recursos: DocenteConocimientoRecurso[];
  tarjetas: DocenteConocimientoTarjeta[];
  onChanged: () => void;
};

export default function DocenteConocimientoTarjetaEditor({
  docenteId,
  recursos,
  tarjetas,
  onChanged,
}: DocenteConocimientoTarjetaEditorProps) {
  const imageInputId = useId();
  const imageRef = useRef<HTMLInputElement>(null);

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [badge, setBadge] = useState("Contenido docente");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const videoRecursos = recursos.filter((r) => r.tipo === "video");

  const resetForm = useCallback(() => {
    setTitulo("");
    setDescripcion("");
    setVideoUrl("");
    setBadge("Contenido docente");
    setImageUrl("");
    if (imageRef.current) imageRef.current.value = "";
  }, []);

  const handleImagePick = () => {
    imageRef.current?.click();
  };

  const handleImageFile = async (file: File | undefined) => {
    if (!file || uploadingImage) return;
    setUploadingImage(true);
    try {
      const url = await uploadDocenteTarjetaImage(docenteId, file);
      setImageUrl(url);
      toast.success("Imagen subida.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo subir la imagen.");
    } finally {
      setUploadingImage(false);
      if (imageRef.current) imageRef.current.value = "";
    }
  };

  const handlePublish = async () => {
    if (publishing) return;
    setPublishing(true);
    try {
      await publishDocenteConocimientoTarjeta({
        docenteId,
        titulo,
        descripcion,
        videoUrl,
        imageUrl,
        badge,
      });
      toast.success("Tarjeta publicada en Videos educativos y en tu panel docente.");
      resetForm();
      onChanged();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo publicar la tarjeta.");
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async (id: string) => {
    try {
      await unpublishDocenteConocimientoTarjeta(id, docenteId);
      toast.success("Tarjeta retirada de la sección pública.");
      onChanged();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo retirar la tarjeta.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDocenteConocimientoTarjeta(id, docenteId);
      toast.success("Tarjeta eliminada.");
      onChanged();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar la tarjeta.");
    }
  };

  const previewImage = imageUrl.trim() || docenteTarjetaPlaceholderImage();
  const previewTitle = titulo.trim() || "Nombre de la tarjeta";
  const previewDescription = descripcion.trim() || "La descripción aparecerá aquí mientras escribes.";
  const previewSubtitle = badge.trim() || "Contenido docente";

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Completa los campos y mira la vista previa. Al publicar, la tarjeta aparece en{" "}
        <strong className="text-cyan-100">Videos educativos</strong> y en la pestaña Videos de tu panel
        docente.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-cyan-400/25 bg-black/20 p-4">
          <div className="space-y-2">
            <Label htmlFor="tarjeta-titulo">Nombre de la tarjeta</Label>
            <Input
              id="tarjeta-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Introducción a la realidad virtual"
              className="border-cyan-400/30 bg-background/60"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tarjeta-descripcion">Descripción</Label>
            <Textarea
              id="tarjeta-descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Breve resumen del contenido del video"
              rows={4}
              className="border-cyan-400/30 bg-background/60"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tarjeta-video">Enlace del video (MP4)</Label>
            <Input
              id="tarjeta-video"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://res.cloudinary.com/.../video.mp4"
              className="border-cyan-400/30 bg-background/60 font-mono text-xs"
            />
            {videoRecursos.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {videoRecursos.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-100 hover:bg-cyan-500/20"
                    onClick={() => setVideoUrl(item.resource_url)}
                  >
                    Usar: {item.titulo}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Sube un MP4 en la pestaña Subir y vuelve aquí para pegar o elegir el enlace.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tarjeta-badge">Categoría (opcional)</Label>
            <Input
              id="tarjeta-badge"
              value={badge}
              onChange={(e) => setBadge(e.target.value)}
              placeholder="Contenido docente"
              className="border-cyan-400/30 bg-background/60"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={imageInputId}>Imagen de portada</Label>
            <input
              ref={imageRef}
              id={imageInputId}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp"
              className="sr-only"
              disabled={uploadingImage}
              onChange={(e) => void handleImageFile(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full gap-1.5 border-cyan-400/40 text-cyan-100"
              disabled={uploadingImage}
              onClick={handleImagePick}
            >
              {uploadingImage ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <ImagePlus className="h-4 w-4" aria-hidden />
              )}
              {uploadingImage ? "Subiendo imagen…" : imageUrl ? "Cambiar imagen" : "Subir imagen"}
            </Button>
            {imageUrl ? (
              <p className="break-all rounded-lg border border-border/40 bg-background/40 px-2 py-1.5 font-mono text-[10px] text-cyan-100/80">
                {imageUrl}
              </p>
            ) : null}
          </div>

          <Button
            type="button"
            variant="hero"
            className="w-full gap-1.5"
            disabled={publishing || uploadingImage}
            onClick={() => void handlePublish()}
          >
            {publishing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
            {publishing ? "Publicando…" : "Publicar"}
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-cyan-200/80">Vista previa</p>
          <div className="max-w-md">
            <VideosEducativosVideoCard
              id="preview"
              name={previewTitle}
              image={previewImage}
              subtitle={previewSubtitle}
              description={previewDescription}
              online={false}
              onPlay={() => toast.info("Vista previa: al publicar podrán reproducir el video.")}
            />
          </div>
        </div>
      </div>

      {tarjetas.length > 0 ? (
        <section className="space-y-3 border-t border-cyan-400/20 pt-5">
          <h3 className="font-display text-sm font-semibold text-cyan-50">Tus tarjetas publicadas</h3>
          <ul className="space-y-2">
            {tarjetas.map((tarjeta) => (
              <li
                key={tarjeta.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-400/20 bg-black/25 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{tarjeta.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {tarjeta.published ? "Publicada" : "Retirada"} · {tarjeta.badge}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {tarjeta.published ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-amber-400/40 text-amber-100"
                      onClick={() => void handleUnpublish(tarjeta.id)}
                    >
                      Retirar
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="border-red-400/30 text-red-200 hover:bg-red-500/10"
                    aria-label="Eliminar tarjeta"
                    onClick={() => void handleDelete(tarjeta.id)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
