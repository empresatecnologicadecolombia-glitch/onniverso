import * as THREE from "three";

export function isEarthMoonLobbyGlbUrl(url: string): boolean {
  return /earth_moon_lobby|daifrb/i.test(url);
}

/** Opciones de encaje en el marco del Coliseo para el GLB Tierra-Luna del lobby. */
export const EARTH_MOON_LOBBY_COLISEO_BUILD_OPTIONS = {
  skipAutoOrient: true,
  rotationFix: [Math.PI, 0, 0] as [number, number, number],
};

export function isGeoquimicoGlbUrl(url: string): boolean {
  return /modelo_geoquimico|geoquimico_lwbh6v|s3hcjj/i.test(url);
}

export function isVolcanGlbUrl(url: string): boolean {
  try {
    const decoded = decodeURIComponent(url).toLowerCase();
    return decoded.includes("volc") && decoded.includes("lava");
  } catch {
    return /volc[aá]n.*lava|volcan_lava|bsbarf/i.test(url);
  }
}

export function isAnatomiaHumanaGlbUrl(url: string): boolean {
  try {
    const decoded = decodeURIComponent(url).toLowerCase();
    return decoded.includes("anatomia") && decoded.includes("umana");
  } catch {
    return /anatomia|modello.*3d/i.test(url.toLowerCase());
  }
}

/** Cuerpo humano: orientación manual y +20 % en el marco del Coliseo. */
export const ANATOMIA_HUMANA_COLISEO_BUILD_OPTIONS = {
  skipAutoOrient: true,
  scaleMultiplier: 1.2,
};

/** Gira el eje más largo del cuerpo hacia arriba (Y). */
export function orientAnatomiaHumanaStanding(root: THREE.Object3D): void {
  root.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(root, true).getSize(new THREE.Vector3());
  const { x, y, z } = size;
  const max = Math.max(x, y, z);
  if (max < 1e-6) return;

  if (x >= max * 0.92 && x >= y) {
    root.rotation.z = Math.PI / 2;
    return;
  }
  if (z >= max * 0.92 && z >= y) {
    root.rotation.x = -Math.PI / 2;
    return;
  }
  if (y < max * 0.92) {
    root.rotation.z = Math.PI / 2;
  }
}

/** Modelo geoquímico más grande en la pared del Coliseo (base × 1.65). */
export const GEOQUIMICO_COLISEO_BUILD_OPTIONS = {
  scaleMultiplier: 1.65,
};

/** Giro más lento que el resto del catálogo (rad/s; catálogo ≈ 0.35). */
export const GEOQUIMICO_COLISEO_SPIN_SPEED = 0.16;

function fixTextureColorSpace(tex: THREE.Texture | null | undefined): void {
  if (!tex) return;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
}

function brightenGlbMaterial(mat: THREE.Material, strength = 1): THREE.Material {
  if (mat instanceof THREE.MeshBasicMaterial) {
    const clone = mat.clone();
    fixTextureColorSpace(clone.map);
    clone.toneMapped = true;
    return clone;
  }

  if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
    const clone = mat.clone();
    fixTextureColorSpace(clone.map);
    fixTextureColorSpace(clone.emissiveMap);
    fixTextureColorSpace(clone.normalMap);
    if (clone.map) {
      clone.emissiveMap = clone.map;
      clone.emissive.setHex(0xffffff);
      clone.emissiveIntensity = 0.45 * strength;
    } else {
      clone.emissive.copy(clone.color);
      clone.emissiveIntensity = 0.22 * strength;
    }
    clone.roughness = Math.min(clone.roughness ?? 0.85, 0.45);
    clone.metalness = Math.min(clone.metalness ?? 0, 0.05);
    if (!clone.map) clone.color.multiplyScalar(1 + 0.4 * strength);
    return clone;
  }

  return mat;
}

function applyBrighterColiseoMaterials(root: THREE.Object3D, strength = 1): void {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    if (Array.isArray(node.material)) {
      node.material = node.material.map((mat) => brightenGlbMaterial(mat, strength));
      return;
    }
    node.material = brightenGlbMaterial(node.material, strength);
  });
}

/** El GLB de lobby trae texturas oscuras bajo la luz tenue del Coliseo. */
export function prepareEarthMoonLobbyColiseoMaterials(root: THREE.Object3D): void {
  applyBrighterColiseoMaterials(root, 1);
}

/** Anatomía humana: mismo tratamiento con un poco más de brillo en materiales. */
export function prepareAnatomiaHumanaColiseoMaterials(root: THREE.Object3D): void {
  applyBrighterColiseoMaterials(root, 1.28);
}

/** Volcán: un poco más bajo dentro del marco del Coliseo. */
export const VOLCAN_COLISEO_POSITION_OFFSET: [number, number, number] = [0, -0.34, 0];

/** Volcán: roca oscura y lava — más brillo y emisión cálida en la escena 360. */
export function prepareVolcanColiseoMaterials(root: THREE.Object3D): void {
  applyBrighterColiseoMaterials(root, 1.42);
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const isArray = Array.isArray(node.material);
    const mats = isArray ? node.material : [node.material];
    const updated = mats.map((mat) => {
      if (!(mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial)) {
        return mat;
      }
      const clone = mat.clone();
      const { r, g } = clone.color;
      const looksLikeLava = r > 0.35 && g < r * 0.72;
      if (looksLikeLava) {
        clone.emissive.setRGB(Math.min(1, r * 1.15), Math.min(1, g * 0.55), 0.04);
        clone.emissiveIntensity = 0.95;
      } else {
        clone.emissive.copy(clone.color);
        clone.emissiveIntensity = 0.32;
      }
      clone.roughness = Math.min(clone.roughness ?? 0.85, 0.55);
      return clone;
    });
    node.material = isArray ? updated : updated[0];
  });
}

/** Lobby en móvil: materiales simples (sin PBR) para más FPS. */
export function simplifyAnatomiaHumanaMaterialsForMobile(root: THREE.Object3D): void {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const apply = (mat: THREE.Material) => {
      if (mat instanceof THREE.MeshBasicMaterial) {
        const clone = mat.clone();
        if (clone.map) clone.map.colorSpace = THREE.SRGBColorSpace;
        return clone;
      }
      const basic = new THREE.MeshBasicMaterial({
        map: "map" in mat && mat.map instanceof THREE.Texture ? mat.map : null,
        color: "color" in mat && mat.color instanceof THREE.Color ? mat.color.clone() : new THREE.Color(0xffffff),
        toneMapped: true,
      });
      if (basic.map) basic.map.colorSpace = THREE.SRGBColorSpace;
      return basic;
    };
    if (Array.isArray(node.material)) {
      node.material = node.material.map((m) => apply(m));
      return;
    }
    node.material = apply(node.material);
  });
}
