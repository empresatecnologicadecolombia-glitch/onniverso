import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { ESCENA_360_CAMERA_FOV, ESCENA_360_CAMERA_ZOOM } from "@/data/escena360vrVideos";

/** Fuerza cámara muy abierta (FOV + zoom) en Escena 360 VR. */
export default function Escena360CameraSetup() {
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    camera.fov = ESCENA_360_CAMERA_FOV;
    camera.zoom = ESCENA_360_CAMERA_ZOOM;
    camera.updateProjectionMatrix();
  }, [camera]);

  return null;
}
