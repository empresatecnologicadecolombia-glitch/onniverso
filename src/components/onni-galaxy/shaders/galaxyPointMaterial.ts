import * as THREE from "three";

/**
 * Shader de estrellas con atributos 100% propios (aColor/aSize/aPhase/aDistNorm)
 * para no depender de los defines internos de Three (USE_COLOR), que era lo que
 * dejaba las partículas invisibles. ShaderMaterial inyecta position y matrices.
 */
const vertexShader = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aPhase;
  attribute float aDistNorm;

  uniform float uTime;
  uniform float uBreath;
  uniform float uBrightness;
  uniform float uSizeFactor;
  uniform float uPixelScale;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = aColor;

    float twinkle = 0.76 + 0.24 * sin(uTime * (1.1 + aPhase * 0.4) + aPhase * 6.2831);
    float depthFade = 0.62 + 0.38 * (1.0 - aDistNorm * 0.4);
    vAlpha = depthFade * twinkle * uBrightness;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = max(1.0, aSize * uSizeFactor * uBreath * uPixelScale / max(-mvPosition.z, 0.1));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  precision mediump float;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv) * 2.0;
    if (d > 1.0) discard;

    float core = exp(-d * d * 6.0);
    float halo = exp(-d * 3.0) * 0.42;
    float alpha = (core + halo) * vAlpha;

    vec3 col = vColor * (1.0 + core * 1.25);
    gl_FragColor = vec4(col, alpha);
  }
`;

export type GalaxyStarMaterialOptions = {
  /** Escala de tamaño en unidades de mundo por unidad de aSize. */
  sizeFactor: number;
  brightness?: number;
};

export function createGalaxyStarMaterial(options: GalaxyStarMaterialOptions): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBreath: { value: 1 },
      uBrightness: { value: options.brightness ?? 1 },
      uSizeFactor: { value: options.sizeFactor },
      uPixelScale: { value: 300 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });
}

type StarUniformState = {
  size: { height: number };
  gl: THREE.WebGLRenderer;
  camera: THREE.Camera;
};

/** Actualiza uTime/uBreath/uBrightness y la escala px según canvas + fov reales. */
export function updateGalaxyStarUniforms(
  material: THREE.ShaderMaterial,
  state: StarUniformState,
  time: number,
  breath: number,
  brightness: number,
): void {
  material.uniforms.uTime!.value = time;
  material.uniforms.uBreath!.value = breath;
  material.uniforms.uBrightness!.value = brightness;

  const cam = state.camera as THREE.PerspectiveCamera;
  const fov = typeof cam.fov === "number" ? cam.fov : 50;
  const heightPx = state.size.height * state.gl.getPixelRatio();
  material.uniforms.uPixelScale!.value = heightPx / (2 * Math.tan(THREE.MathUtils.degToRad(fov) / 2));
}

/** Asigna los atributos que espera el shader a una geometría de partículas. */
export function assignGalaxyStarAttributes(
  geo: THREE.BufferGeometry,
  buffers: {
    positions: Float32Array;
    colors: Float32Array;
    sizes: Float32Array;
    phases: Float32Array;
    distNorm: Float32Array;
  },
): void {
  geo.setAttribute("position", new THREE.BufferAttribute(buffers.positions, 3));
  geo.setAttribute("aColor", new THREE.BufferAttribute(buffers.colors, 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(buffers.sizes, 1));
  geo.setAttribute("aPhase", new THREE.BufferAttribute(buffers.phases, 1));
  geo.setAttribute("aDistNorm", new THREE.BufferAttribute(buffers.distNorm, 1));
}
