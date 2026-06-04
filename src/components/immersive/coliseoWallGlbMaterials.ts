import * as THREE from "three";

export function isEarthMoonLobbyGlbUrl(url: string): boolean {
  return /earth_moon_lobby|daifrb/i.test(url);
}

function fixTextureColorSpace(tex: THREE.Texture | null | undefined): void {
  if (!tex) return;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
}

function brightenGlbMaterial(mat: THREE.Material): THREE.Material {
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
      clone.emissiveIntensity = 0.45;
    } else {
      clone.emissive.copy(clone.color);
      clone.emissiveIntensity = 0.22;
    }
    clone.roughness = Math.min(clone.roughness ?? 0.85, 0.45);
    clone.metalness = Math.min(clone.metalness ?? 0, 0.05);
    if (!clone.map) clone.color.multiplyScalar(1.4);
    return clone;
  }

  return mat;
}

/** El GLB de lobby trae texturas oscuras bajo la luz tenue del Coliseo. */
export function prepareEarthMoonLobbyColiseoMaterials(root: THREE.Object3D): void {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    if (Array.isArray(node.material)) {
      node.material = node.material.map((mat) => brightenGlbMaterial(mat));
      return;
    }
    node.material = brightenGlbMaterial(node.material);
  });
}
