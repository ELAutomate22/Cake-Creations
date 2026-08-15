"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { TieredCake } from "./TieredCake";
import { useMediaQuery } from "@/hooks/useMediaQuery";

/**
 * The cake, turning as the page is scrolled.
 *
 * Scroll position arrives through a ref rather than through props or state.
 * That is deliberate: a scrubbed scroll updates on nearly every frame, and
 * putting that through React would re-render the tree dozens of times a second.
 * The ref is written by the section's ScrollTrigger and read inside `useFrame`,
 * so React renders once and the animation loop does the rest.
 *
 * Rotation is eased toward its target rather than snapped to it, which keeps
 * the movement smooth on a trackpad that reports scroll in coarse jumps.
 */

export type CakeCanvasProps = {
  /** 0 → 1 across the section. Mutated directly by the parent's ScrollTrigger. */
  progress: RefObject<number>;
  /** Paused entirely when the section is off screen. */
  active: boolean;
  /** Movement is removed, not just shortened, when reduced motion is asked for. */
  reducedMotion: boolean;
  onError?: () => void;
};

/** How far the cake turns across the whole section. Just over half a turn. */
const TOTAL_ROTATION = Math.PI * 1.15;

/**
 * Framing for a given viewport shape.
 *
 * Aspect ratio decides the composition, not pixel width — a short landscape
 * window and a tall phone need different treatment at the same width. The cake
 * is moved rather than the camera aimed, so the camera can stay declarative.
 */
function framingFor(aspect: number) {
  if (aspect < 0.85) {
    // Portrait phone: further back, and the cake sits a little lower in frame.
    return { z: 6.5, fov: 34, y: -0.15 };
  }
  if (aspect < 1.4) {
    return { z: 5.9, fov: 32, y: -0.05 };
  }
  return { z: 5.2, fov: 30, y: 0 };
}

function Rig({
  progress,
  reducedMotion,
}: {
  progress: RefObject<number>;
  reducedMotion: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const current = useRef(0);
  const { size } = useThree();

  const framing = useMemo(
    () => framingFor(size.width / size.height),
    [size.width, size.height],
  );

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    if (reducedMotion) {
      // Held at a three-quarter view, which is the most flattering angle.
      group.rotation.y = -0.5;
      return;
    }

    const target = progress.current * TOTAL_ROTATION - 0.5;
    // Frame-rate independent easing, so a 120Hz screen is not faster than 60.
    const ease = 1 - Math.pow(0.0016, delta);
    current.current += (target - current.current) * ease;

    group.rotation.y = current.current;
    // A very small tilt that follows the turn, so it does not read as a
    // turntable. Two or three degrees is enough.
    group.rotation.z = Math.sin(current.current * 0.5) * 0.035;
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, framing.z]} fov={framing.fov} />
      <group ref={groupRef} position={[0, framing.y, 0]}>
        <TieredCake />
      </group>
    </>
  );
}

/** Reports WebGL context loss up to the parent so it can fall back. */
function ContextWatch({ onError }: { onError?: () => void }) {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    const onLost = (event: Event) => {
      event.preventDefault();
      onError?.();
    };
    canvas.addEventListener("webglcontextlost", onLost);
    return () => canvas.removeEventListener("webglcontextlost", onLost);
  }, [gl, onError]);

  return null;
}

export default function CakeCanvas({
  progress,
  active,
  reducedMotion,
  onError,
}: CakeCanvasProps) {
  const mobile = useMediaQuery("(max-width: 767px)");

  return (
    <Canvas
      // Capped, and capped harder on phones. A phone at DPR 3 renders nine
      // times the pixels of DPR 1 for no visible benefit at this size.
      dpr={mobile ? [1, 1.5] : [1, 2]}
      // Nothing is drawn while the section is off screen, and reduced motion
      // needs a single frame rather than a running loop.
      frameloop={!active || reducedMotion ? "demand" : "always"}
      gl={{
        antialias: !mobile,
        alpha: true,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
      style={{ width: "100%", height: "100%" }}
    >
      <ContextWatch onError={onError} />

      {/* ── Lighting ───────────────────────────────────────────────────── */}
      {/* Warm and soft, matching the photography this site is built for. */}
      <ambientLight intensity={0.75} color="#fff4e6" />

      {/* Key, upper left front. */}
      <directionalLight position={[-3.4, 5.2, 4.4]} intensity={2.3} color="#fff1d9" />

      {/* Fill, opposite side, deliberately weak so the form keeps its shape. */}
      <directionalLight position={[4.2, 1.4, 2.6]} intensity={0.6} color="#eef2f6" />

      {/* Rim, behind, to lift the cake off the background. */}
      <directionalLight position={[0.8, 3.2, -4.6]} intensity={1.5} color="#f7dcae" />

      {/* A soft pool of light on the board, hinting at a studio surface. */}
      <pointLight
        position={[0, -1.4, 2.2]}
        intensity={mobile ? 8 : 14}
        color="#e8c79a"
        distance={9}
      />

      <Rig progress={progress} reducedMotion={reducedMotion} />
    </Canvas>
  );
}
