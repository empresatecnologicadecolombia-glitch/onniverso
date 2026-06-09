import dinosauriosPreviewImg from "@/assets/aula-preview/dinosaurios.png";
import { DOCENTE_EDUCATIONAL_VIDEOS } from "@/data/docenteEducationalVideos";
import { cloudinaryVideoPosterUrl } from "@/lib/cloudinaryVideoPoster";
import { publicAssetUrl, publicLocalGlbUrl } from "@/lib/publicAssetUrl";

export type DocenteContentTabId = "videos" | "pdf" | "elementos-3d";

export type DocenteCatalogElement3dItem = {
  id: string;
  title: string;
  description: string;
  /** Enlace remoto (Cloudinary, etc.) para «Copiar». */
  resourceUrl: string;
  /** Archivo en public/assets/models: muestra «Seleccionar» en el panel docente. */
  localGlbPath?: string;
  imageUrl: string;
  badge: string;
};

export type DocenteCatalogVideoItem = {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  imageUrl: string;
  badge: string;
};

export type DocenteCatalogPdfItem = {
  id: string;
  title: string;
  description: string;
  /** Enlace al PDF para «Copiar»; vacío hasta publicar el archivo. */
  pdfUrl: string;
  imageUrl: string;
  badge: string;
};

const PRESENTACION_VR_1 =
  "https://res.cloudinary.com/dmbpk37l5/video/upload/v1780439303/presentacion_vr1_nklmmf_ead8hs.mp4";
const PRESENTACION_VR_2 =
  "https://res.cloudinary.com/dmbpk37l5/video/upload/v1780439318/presentacion_vr_2_yf0xys_auwcro.mp4";

export const DOCENTE_CATALOG_VIDEOS: DocenteCatalogVideoItem[] = [
  {
    id: "presentacion-vr-1",
    title: "Presentación educación inmersiva I",
    description:
      "Recorrido introductorio en 360° para presentar el aula virtual: escena, pantalla de clase y experiencia del estudiante con visor.",
    videoUrl: PRESENTACION_VR_1,
    imageUrl: cloudinaryVideoPosterUrl(PRESENTACION_VR_1),
    badge: "Educación inmersiva",
  },
  {
    id: "presentacion-vr-2",
    title: "Presentación educación inmersiva II",
    description:
      "Segunda presentación VR: refuerza el flujo docente–alumno, recursos en sala y uso del Coliseo como aula en vivo.",
    videoUrl: PRESENTACION_VR_2,
    imageUrl: publicAssetUrl("2.jpeg"),
    badge: "Educación inmersiva",
  },
];

/** Videos educativos del panel docente (catálogo propio, independiente de Nuestras Salas). */
export { DOCENTE_EDUCATIONAL_VIDEOS };

/** Todos los videos visibles en la pestaña Videos del panel docente. */
export const DOCENTE_PANEL_VIDEOS: DocenteCatalogVideoItem[] = [
  ...DOCENTE_CATALOG_VIDEOS,
  ...DOCENTE_EDUCATIONAL_VIDEOS,
];

/** PDFs de cursos (categoría Tecnología): enlaces se completan cuando estén publicados. */
export const DOCENTE_CATALOG_PDF: DocenteCatalogPdfItem[] = [
  {
    id: "ia-generativa",
    title: "IA Generativa",
    description: "Crea apps y agentes con modelos de última generación.",
    pdfUrl: "",
    imageUrl:
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80",
    badge: "8 horas",
  },
  {
    id: "desarrollo-vr",
    title: "Desarrollo VR",
    description: "Diseño de experiencias inmersivas para eventos en vivo.",
    pdfUrl: "",
    imageUrl:
      "https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?auto=format&fit=crop&w=1200&q=80",
    badge: "10 horas",
  },
  {
    id: "python-para-expertos",
    title: "Python para Expertos",
    description: "Optimización, arquitectura y automatización avanzada.",
    pdfUrl: "",
    imageUrl:
      "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=1200&q=80",
    badge: "12 horas",
  },
  {
    id: "ciberseguridad-360",
    title: "Ciberseguridad 360",
    description: "Protege identidades y plataformas en entornos digitales.",
    pdfUrl: "",
    imageUrl:
      "https://images.unsplash.com/photo-1510511459019-5dda7724fd87?auto=format&fit=crop&w=1200&q=80",
    badge: "9 horas",
  },
  {
    id: "blockchain-aplicado",
    title: "Blockchain Aplicado",
    description: "Smart contracts y modelos de negocio descentralizados.",
    pdfUrl: "",
    imageUrl:
      "https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&w=1200&q=80",
    badge: "7 horas",
  },
  {
    id: "devops-cloud",
    title: "DevOps Cloud",
    description: "CI/CD y despliegue automatizado para apps de alto tráfico.",
    pdfUrl: "",
    imageUrl:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
    badge: "8 horas",
  },
  {
    id: "ux-para-metaverso",
    title: "UX para Metaverso",
    description: "Interfaces inmersivas con foco en retención y experiencia.",
    pdfUrl: "",
    imageUrl:
      "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1200&q=80",
    badge: "6 horas",
  },
  {
    id: "arquitectura-de-apis",
    title: "Arquitectura de APIs",
    description: "Diseño robusto para plataformas escalables en tiempo real.",
    pdfUrl: "",
    imageUrl:
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80",
    badge: "6 horas",
  },
  {
    id: "prompt-engineering",
    title: "Prompt Engineering",
    description: "Optimiza prompts para resultados precisos y consistentes.",
    pdfUrl: "",
    imageUrl:
      "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80",
    badge: "4 horas",
  },
  {
    id: "automatizacion-no-code",
    title: "Automatización No-Code",
    description: "Flujos inteligentes sin programar desde cero.",
    pdfUrl: "",
    imageUrl:
      "https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&w=1200&q=80",
    badge: "5 horas",
  },
];

const REPTISECT_GLB =
  "https://res.cloudinary.com/dmbpk37l5/image/upload/v1780439265/reptisect_oqtyip_z0mwfk.glb";
const CORAZON_GLB =
  "https://res.cloudinary.com/dmbpk37l5/image/upload/v1780439269/el_corazon_dbhvfn_wjwe5k.glb";
const GEOQUIMICO_GLB =
  "https://res.cloudinary.com/dmbpk37l5/image/upload/v1780439309/modelo_geoquimico_lwbh6v_s3hcjj.glb";
const EARTH_MOON_LOBBY_GLB =
  "https://res.cloudinary.com/dmbpk37l5/image/upload/v1780542025/earth_moon_lobby_daifrb.glb";
const PIRAMIDE_EGIPTO_GLB =
  "https://res.cloudinary.com/dmbpk37l5/image/upload/v1780971812/piramide_3d_modelo_lmafow.glb";
const CEREBRO_HUMANO_GLB =
  "https://res.cloudinary.com/dmbpk37l5/image/upload/v1780973228/cerebro_3d_modelo_qtpeez.glb";
const VOLCAN_GLB =
  "https://res.cloudinary.com/dmbpk37l5/image/upload/v1780974210/volc%C3%A1n_lava_3d_modelo_bsbarf.glb";
const ANATOMIA_HUMANA_LOCAL = "assets/models/modello 3d anatomia umana.glb";

export const DOCENTE_CATALOG_ELEMENTS_3D: DocenteCatalogElement3dItem[] = [
  {
    id: "corazon-glb",
    title: "Corazón humano 3D",
    description:
      "Holograma del corazón en la pared del Coliseo. Anatomía cardiovascular para estudiantes en VR o web.",
    resourceUrl: CORAZON_GLB,
    imageUrl: encodeURI(publicAssetUrl("corazon humano.png")),
    badge: "Elemento 3D",
  },
  {
    id: "cerebro-humano",
    title: "Cerebro humano",
    description:
      "Modelo 3D del cerebro humano para la pared del Coliseo. Ideal para biología, neurociencia y anatomía en clase inmersiva.",
    resourceUrl: CEREBRO_HUMANO_GLB,
    imageUrl: encodeURI(publicAssetUrl("cerebro humano.png")),
    badge: "Elemento 3D",
  },
  {
    id: "anatomia-cuerpo-humano",
    title: "Anatomía del cuerpo humano 3D",
    description:
      "Modelo 3D de anatomía humana (28 MB en el servidor). Copia el enlace y pégalo en el GLB de la clase: mismo archivo para docente y estudiantes.",
    localGlbPath: ANATOMIA_HUMANA_LOCAL,
    resourceUrl: publicLocalGlbUrl(ANATOMIA_HUMANA_LOCAL),
    imageUrl: encodeURI(publicAssetUrl("assets/anatomia 2.png")),
    badge: "Elemento 3D",
  },
  {
    id: "modelo-geoquimico",
    title: "Modelo geoquímico 3D",
    description:
      "Estructuras y procesos geoquímicos en 3D para geología, química de la Tierra y educación ambiental.",
    resourceUrl: GEOQUIMICO_GLB,
    imageUrl: encodeURI(publicAssetUrl("geoquimico tierra.png")),
    badge: "Elemento 3D",
  },
  {
    id: "tierra-luna-lobby",
    title: "Tierra y la Luna",
    description:
      "Modelo 3D del planeta con la Luna en órbita. Ideal para astronomía y ciencias de la Tierra en la pared del Coliseo.",
    resourceUrl: EARTH_MOON_LOBBY_GLB,
    imageUrl: encodeURI(publicAssetUrl("tierra y luna.png")),
    badge: "Elemento 3D",
  },
  {
    id: "piramide-egipto",
    title: "Pirámide de Egipto",
    description:
      "Modelo 3D de una pirámide egipcia para la pared del Coliseo. Ideal para historia, civilizaciones antiguas y geografía.",
    resourceUrl: PIRAMIDE_EGIPTO_GLB,
    imageUrl: publicAssetUrl("piramide-de-egipto.png"),
    badge: "Elemento 3D",
  },
  {
    id: "volcan",
    title: "Volcan",
    description:
      "Modelo 3D de volcán activo con flujo de lava. Ideal para geología, ciencias de la Tierra y fenómenos naturales en la clase inmersiva.",
    resourceUrl: VOLCAN_GLB,
    imageUrl: publicAssetUrl("volcan.png"),
    badge: "Elemento 3D",
  },
  {
    id: "reptisect",
    title: "Reptisect 3D",
    description:
      "Modelo de reptil para la pared del aula: ideal para biología, paleontología y ciencias naturales en la clase inmersiva.",
    resourceUrl: REPTISECT_GLB,
    imageUrl: dinosauriosPreviewImg,
    badge: "Elemento 3D",
  },
];
