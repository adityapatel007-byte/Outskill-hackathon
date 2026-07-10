import { useEffect, useRef, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import * as THREE from "three";

/**
 * The site's ONE 3D moment: a warm glass "lens" — the analyst's desk lamp,
 * lit from within. It lives wherever the page places it (large in the landing
 * hero corner, small elsewhere) and BRIGHTENS + slowly breathes whenever a
 * scan or chat request is running, tying the object to real app state.
 *
 * Procedural only. Reduced-motion → frozen, static glow (no spin, no pulse).
 */

function usePrefersReducedMotion() {
  const ref = useRef(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    ref.current = mq.matches;
    const on = () => (ref.current = mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return ref;
}

function Lens({
  active,
  pointer,
}: {
  active: boolean;
  pointer: RefObject<{ x: number; y: number }>;
}) {
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.MeshStandardMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  const reduced = usePrefersReducedMotion();

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;

    if (!reduced.current) {
      // Ease rotation toward the pointer — parallax without re-renders.
      const p = pointer.current;
      const targetY = p.x * 0.5;
      const targetX = -p.y * 0.35;
      g.rotation.y += (targetY - g.rotation.y) * Math.min(1, delta * 3);
      g.rotation.x += (targetX - g.rotation.x) * Math.min(1, delta * 3);
      g.rotation.z = Math.sin(t * 0.2) * 0.04;
      g.position.y = Math.sin(t * 0.6) * 0.06;
    }

    // Glow: idle warm, brighter + breathing while active.
    const breathe = active && !reduced.current ? 0.5 + Math.sin(t * 3) * 0.5 : 1;
    const targetGlow = active ? 1.7 + breathe * 0.8 : 0.85;
    if (core.current) {
      core.current.emissiveIntensity +=
        (targetGlow - core.current.emissiveIntensity) * Math.min(1, delta * 4);
    }
    if (light.current) {
      const targetLi = active ? 3.2 + breathe * 1.4 : 1.4;
      light.current.intensity +=
        (targetLi - light.current.intensity) * Math.min(1, delta * 4);
    }
  });

  return (
    <group ref={group}>
      {/* Warm inner light so the lens casts glow onto its surroundings */}
      <pointLight
        ref={light}
        position={[0, 0, 0]}
        color="#f2b45e"
        intensity={1.4}
        distance={9}
        decay={1.4}
      />

      {/* The glowing glass core */}
      <mesh>
        <icosahedronGeometry args={[1, 4]} />
        <meshStandardMaterial
          ref={core}
          color="#e79a3f"
          emissive="#f2c078"
          emissiveIntensity={0.85}
          roughness={0.28}
          metalness={0.1}
        />
      </mesh>

      {/* Instrument ring around the lens — the "reading" apparatus */}
      <mesh rotation={[Math.PI / 2.6, 0.3, 0]}>
        <torusGeometry args={[1.42, 0.045, 24, 120]} />
        <meshStandardMaterial
          color="#b98235"
          roughness={0.35}
          metalness={0.6}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2.1, -0.5, 0.4]}>
        <torusGeometry args={[1.62, 0.02, 20, 120]} />
        <meshStandardMaterial
          color="#8a5f24"
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>
    </group>
  );
}

export function LensScene({
  active = false,
  className = "",
}: {
  active?: boolean;
  className?: string;
}) {
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const on = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", on, { passive: true });
    return () => window.removeEventListener("pointermove", on);
  }, []);

  return (
    <div
      className={className}
      style={{ pointerEvents: "none" }}
      aria-hidden="true"
    >
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 5.2], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[4, 6, 5]} intensity={1.5} color="#fff2dc" />
        <directionalLight position={[-5, -2, -3]} intensity={0.5} color="#7a5a30" />
        <Lens active={active} pointer={pointer} />
        <ContactShadows
          position={[0, -1.9, 0]}
          opacity={0.35}
          scale={9}
          blur={2.6}
          far={4}
          color="#2a1e10"
        />
      </Canvas>
    </div>
  );
}
