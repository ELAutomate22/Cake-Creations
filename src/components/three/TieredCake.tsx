"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * A three-tier celebration cake, built from geometry rather than a model file.
 *
 * Nothing here is downloaded: no .glb, no textures, no CDN. That matters for a
 * site whose photography does not exist yet — this renders the moment the page
 * loads, on any connection, and it is always in the brand palette because the
 * colours come from the same values as the rest of the site.
 *
 * The detail that sells it as a cake rather than a stack of cylinders is the
 * piped pearl border at each tier, which is drawn as a single instanced mesh —
 * around 150 pearls for the cost of one draw call.
 */

/* Matches the design tokens in globals.css. */
const PALETTE = {
  buttercream: "#fbf7f1",
  buttercreamShade: "#f4ece1",
  gold: "#c9a882",
  board: "#2a1d17",
  pearl: "#fdfaf5",
};

type Tier = {
  radius: number;
  height: number;
  y: number;
  pearls: number;
};

/** Three tiers, narrowing upward, with the pearl count scaled to each rim. */
const TIERS: Tier[] = [
  { radius: 1.42, height: 0.66, y: 0.37, pearls: 64 },
  { radius: 1.02, height: 0.58, y: 0.99, pearls: 48 },
  { radius: 0.66, height: 0.5, y: 1.53, pearls: 34 },
];

const PEARL_RADIUS = 0.052;

export function TieredCake() {
  const pearlsRef = useRef<THREE.InstancedMesh>(null);

  /* ── Geometry, built once ─────────────────────────────────────────────── */

  const geometries = useMemo(() => {
    const tiers = TIERS.map(
      (tier) =>
        new THREE.CylinderGeometry(tier.radius, tier.radius, tier.height, 72),
    );

    // A thin band of gold sitting just under each tier's top edge.
    const bands = TIERS.map(
      (tier) =>
        new THREE.CylinderGeometry(
          tier.radius + 0.006,
          tier.radius + 0.006,
          0.035,
          72,
        ),
    );

    const board = new THREE.CylinderGeometry(1.86, 1.9, 0.09, 80);
    const pedestal = new THREE.CylinderGeometry(0.52, 0.78, 0.4, 48);
    const pearl = new THREE.SphereGeometry(PEARL_RADIUS, 14, 12);

    // A small domed finial, so the top tier does not read as cut off.
    const finial = new THREE.SphereGeometry(0.1, 20, 16);

    return { tiers, bands, board, pedestal, pearl, finial };
  }, []);

  const totalPearls = useMemo(
    () => TIERS.reduce((sum, tier) => sum + tier.pearls, 0),
    [],
  );

  /* ── Place every pearl ────────────────────────────────────────────────── */

  useLayoutEffect(() => {
    const mesh = pearlsRef.current;
    if (!mesh) return;

    const dummy = new THREE.Object3D();
    let index = 0;

    for (const tier of TIERS) {
      // The border sits in the crease where the tier meets the one below.
      const y = tier.y - tier.height / 2 + PEARL_RADIUS * 0.65;
      const ringRadius = tier.radius + PEARL_RADIUS * 0.35;

      for (let i = 0; i < tier.pearls; i += 1) {
        const angle = (i / tier.pearls) * Math.PI * 2;
        dummy.position.set(
          Math.cos(angle) * ringRadius,
          y,
          Math.sin(angle) * ringRadius,
        );
        // A touch of variation so the piping looks handmade, not printed.
        const wobble = 0.88 + Math.sin(i * 2.4) * 0.12;
        dummy.scale.setScalar(wobble);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
        index += 1;
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);

  /* ── Geometry created with useMemo is not disposed by R3F ─────────────── */

  useEffect(
    () => () => {
      for (const geometry of [
        ...geometries.tiers,
        ...geometries.bands,
        geometries.board,
        geometries.pedestal,
        geometries.pearl,
        geometries.finial,
      ]) {
        geometry.dispose();
      }
    },
    [geometries],
  );

  return (
    <group position={[0, -0.85, 0]}>
      {/* ── Pedestal and board ─────────────────────────────────────────── */}
      <mesh geometry={geometries.pedestal} position={[0, -0.24, 0]} castShadow>
        <meshStandardMaterial
          color={PALETTE.board}
          roughness={0.34}
          metalness={0.16}
        />
      </mesh>

      <mesh geometry={geometries.board} position={[0, 0, 0]} receiveShadow castShadow>
        <meshStandardMaterial
          color={PALETTE.board}
          roughness={0.26}
          metalness={0.22}
        />
      </mesh>

      {/* ── Tiers ──────────────────────────────────────────────────────── */}
      {TIERS.map((tier, index) => (
        <group key={index}>
          <mesh
            geometry={geometries.tiers[index]}
            position={[0, tier.y, 0]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial
              color={index % 2 === 0 ? PALETTE.buttercream : PALETTE.buttercreamShade}
              roughness={0.86}
              metalness={0.02}
            />
          </mesh>

          {/* The gold band, just below the top edge of the tier. */}
          <mesh
            geometry={geometries.bands[index]}
            position={[0, tier.y + tier.height / 2 - 0.05, 0]}
          >
            <meshStandardMaterial
              color={PALETTE.gold}
              roughness={0.29}
              metalness={0.85}
            />
          </mesh>
        </group>
      ))}

      {/* ── Piped pearl borders, one draw call ─────────────────────────── */}
      <instancedMesh
        ref={pearlsRef}
        args={[geometries.pearl, undefined, totalPearls]}
        castShadow
      >
        <meshStandardMaterial
          color={PALETTE.pearl}
          roughness={0.22}
          metalness={0.08}
        />
      </instancedMesh>

      {/* ── Finial ─────────────────────────────────────────────────────── */}
      <mesh
        geometry={geometries.finial}
        position={[0, TIERS[2].y + TIERS[2].height / 2 + 0.06, 0]}
        castShadow
      >
        <meshStandardMaterial
          color={PALETTE.gold}
          roughness={0.26}
          metalness={0.9}
        />
      </mesh>
    </group>
  );
}
