"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { DoubleSide, Group, Mesh, Plane, Vector3 } from "three";

type AnatomyPoint = { x: number; y: number; z: number };

type Annotation = {
  id: number | string;
  annotation_type: string;
  severity?: string;
  notes?: string;
  geometry?: {
    coordinates?: AnatomyPoint;
  };
};

export type AnatomicalTemplate = {
  code?: string;
  name?: string;
  fallback_shape?: "quadruped" | "large_quadruped" | "ruminant" | "avian" | "exotic" | string;
  regions_map?: Record<string, string> | null;
};

type AnatomyViewerProps = {
  annotations?: Annotation[];
  onPick: (point: AnatomyPoint) => void;
  selectedPoint?: AnatomyPoint | null;
  template?: AnatomicalTemplate | null;
  patientLabel?: string | null;
};

type AnatomyLayer = "surface" | "muscles" | "skeleton" | "organs" | "vascular" | "combined";
type ViewPreset = "lateral" | "dorsal" | "ventral" | "cranial";
type QualityPreset = "eco" | "clinical" | "ultra";
type ClipAxis = "x" | "y" | "z";

const severityColor: Record<string, string> = {
  mild: "#6FBF73",
  moderate: "#D7B267",
  severe: "#D97C7C",
};

const defaultRegions = {
  head: "Cabeca",
  thorax: "Torax",
  abdomen: "Abdomen",
  limbs: "Membros",
};

const viewPositions: Record<ViewPreset, [number, number, number]> = {
  lateral: [0, 1.25, 5.4],
  dorsal: [0, 6.3, 0.1],
  ventral: [0, -5.4, 1.6],
  cranial: [5.7, 1.1, 0],
};

const qualityConfig: Record<QualityPreset, { dpr: [number, number]; shadows: boolean; detail: number; label: string }> = {
  eco: { dpr: [0.75, 1], shadows: false, detail: 24, label: "Eco" },
  clinical: { dpr: [1, 1.5], shadows: true, detail: 40, label: "Clinico" },
  ultra: { dpr: [1.5, 2], shadows: true, detail: 64, label: "Ultra" },
};

function roundedPoint(point: Vector3): AnatomyPoint {
  return {
    x: Number(point.x.toFixed(2)),
    y: Number(point.y.toFixed(2)),
    z: Number(point.z.toFixed(2)),
  };
}

function materialOpacity(base: number, xray: boolean, focusRegion: string, region: string) {
  const focus = !focusRegion || focusRegion === region ? 1 : 0.18;
  return Math.min(1, base * focus * (xray ? 0.42 : 1));
}

function GlobalClipping({ enabled, axis, value }: { enabled: boolean; axis: ClipAxis; value: number }) {
  const { gl } = useThree();

  useEffect(() => {
    gl.localClippingEnabled = enabled;
    const normal = axis === "x" ? new Vector3(-1, 0, 0) : axis === "y" ? new Vector3(0, -1, 0) : new Vector3(0, 0, -1);
    gl.clippingPlanes = enabled ? [new Plane(normal, value)] : [];
    return () => {
      gl.clippingPlanes = [];
    };
  }, [axis, enabled, gl, value]);

  return null;
}

function CameraPreset({ view }: { view: ViewPreset }) {
  const { camera } = useThree();

  useEffect(() => {
    const [x, y, z] = viewPositions[view];
    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, view]);

  return null;
}

function AnatomyEngineModel({
  fallbackShape,
  onPick,
  autoRotate,
  layer,
  focusRegion,
  xray,
  exploded,
  physiology,
  detail,
}: {
  fallbackShape: string;
  onPick: (point: AnatomyPoint) => void;
  autoRotate: boolean;
  layer: AnatomyLayer;
  focusRegion: string;
  xray: boolean;
  exploded: boolean;
  physiology: boolean;
  detail: number;
}) {
  const groupRef = useRef<Group>(null);
  const heartRef = useRef<Mesh>(null);
  const lungLeftRef = useRef<Mesh>(null);
  const lungRightRef = useRef<Mesh>(null);
  const [hoveredRegion, setHoveredRegion] = useState("");
  const isLarge = fallbackShape === "large_quadruped" || fallbackShape === "ruminant";
  const isAvian = fallbackShape === "avian";
  const isExotic = fallbackShape === "exotic";

  useFrame(({ clock }) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += hoveredRegion ? 0.0005 : 0.0012;
    }
    if (physiology) {
      const beat = 1 + Math.sin(clock.elapsedTime * 7.2) * 0.085;
      const breath = 1 + Math.sin(clock.elapsedTime * 1.8) * 0.12;
      heartRef.current?.scale.set(0.18 * beat, 0.22 * beat, 0.16 * beat);
      lungLeftRef.current?.scale.set(0.32, 0.23 * breath, 0.12 * breath);
      lungRightRef.current?.scale.set(0.32, 0.23 * breath, 0.12 * breath);
    }
  });

  function pick(event: ThreeEvent<PointerEvent>, region: string) {
    event.stopPropagation();
    setHoveredRegion(region);
    onPick(roundedPoint(event.point));
  }

  const bodyScale: [number, number, number] = isAvian
    ? [0.95, 0.68, 0.5]
    : isExotic
      ? [1.9, 0.36, 0.34]
      : isLarge
        ? [2.05, 0.88, 0.62]
        : [1.65, 0.72, 0.52];
  const showSurface = layer === "surface" || layer === "combined";
  const showMuscles = layer === "muscles" || layer === "combined";
  const showSkeleton = layer === "skeleton" || layer === "combined";
  const showOrgans = layer === "organs" || layer === "combined";
  const showVascular = layer === "vascular" || layer === "combined";
  const surfaceOpacity = layer === "combined" ? 0.24 : layer === "surface" ? 0.96 : 0.1;
  const muscleOpacity = layer === "muscles" ? 0.88 : 0.34;
  const explode = exploded ? 0.36 : 0;

  return (
    <group ref={groupRef} rotation={[0.08, -0.35, 0]}>
      {showSurface ? (
        <>
          <mesh
            castShadow
            receiveShadow
            position={[0, 0.05, 0]}
            scale={bodyScale}
            onPointerDown={(event) => pick(event, "thorax")}
            onPointerEnter={() => setHoveredRegion("thorax")}
            onPointerLeave={() => setHoveredRegion("")}
          >
            <sphereGeometry args={[1, detail, Math.max(18, Math.floor(detail * 0.65))]} />
            <meshStandardMaterial
              color={hoveredRegion === "thorax" ? "#DFF3E3" : "#EAF4EC"}
              roughness={0.52}
              metalness={0.04}
              transparent
              opacity={materialOpacity(surfaceOpacity, xray, focusRegion, "thorax")}
              side={DoubleSide}
            />
          </mesh>
          <mesh
            castShadow
            position={[isAvian ? 0.92 : 1.65, isAvian ? 0.23 : 0.18, 0]}
            scale={isAvian ? [0.38, 0.32, 0.32] : [0.58, 0.42, 0.4]}
            onPointerDown={(event) => pick(event, "head")}
            onPointerEnter={() => setHoveredRegion("head")}
            onPointerLeave={() => setHoveredRegion("")}
          >
            <sphereGeometry args={[1, Math.max(24, detail - 8), Math.max(16, Math.floor(detail * 0.55))]} />
            <meshStandardMaterial
              color={hoveredRegion === "head" ? "#DFF3E3" : "#E5F0E8"}
              roughness={0.58}
              transparent
              opacity={materialOpacity(surfaceOpacity, xray, focusRegion, "head")}
              side={DoubleSide}
            />
          </mesh>
        </>
      ) : null}

      {showMuscles ? (
        <group position={[0, exploded ? 0.02 : 0, exploded ? -explode : 0]}>
          {[-0.55, -0.15, 0.25, 0.65].map((x, index) => (
            <mesh key={`muscle-band-${x}`} position={[x, 0.09, 0.42]} rotation={[0.18, 0, 0.1]} scale={[0.38, 0.055, 0.08]}>
              <capsuleGeometry args={[1, 1.15, 8, 16]} />
              <meshStandardMaterial color={index % 2 ? "#C96D6A" : "#B95357"} roughness={0.72} transparent opacity={materialOpacity(muscleOpacity, xray, focusRegion, "thorax")} />
            </mesh>
          ))}
          {[-0.9, -0.25, 0.55, 1.1].map((x) => (
            <React.Fragment key={`muscle-limb-${x}`}>
              <mesh position={[x, isLarge ? -1.02 : -0.82, 0.34]} scale={[0.12, isLarge ? 0.72 : 0.56, 0.11]}>
                <capsuleGeometry args={[1, 1.25, 8, 16]} />
                <meshStandardMaterial color="#B95357" roughness={0.74} transparent opacity={materialOpacity(muscleOpacity, xray, focusRegion, "limbs")} />
              </mesh>
              <mesh position={[x, isLarge ? -1.02 : -0.82, -0.34]} scale={[0.12, isLarge ? 0.72 : 0.56, 0.11]}>
                <capsuleGeometry args={[1, 1.25, 8, 16]} />
                <meshStandardMaterial color="#C96D6A" roughness={0.74} transparent opacity={materialOpacity(muscleOpacity, xray, focusRegion, "limbs")} />
              </mesh>
            </React.Fragment>
          ))}
        </group>
      ) : null}

      {showSkeleton ? (
        <group position={[0, exploded ? 0.12 : 0, exploded ? explode : 0]}>
          <mesh position={[0.1, 0.35, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.035, 0.035, isLarge ? 1.75 : 1.35]}>
            <cylinderGeometry args={[1, 1, 1, 16]} />
            <meshStandardMaterial color="#F3FAF5" roughness={0.48} />
          </mesh>
          {[-0.7, -0.25, 0.25, 0.7].map((x) => (
            <mesh key={`rib-${x}`} position={[x, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.018, 0.018, isLarge ? 0.78 : 0.58]}>
              <torusGeometry args={[1, 0.12, 10, 28, Math.PI]} />
              <meshStandardMaterial color="#F3FAF5" roughness={0.5} />
            </mesh>
          ))}
          <mesh position={[1.52, 0.18, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.04, 0.04, 0.52]}>
            <cylinderGeometry args={[1, 1, 1, 16]} />
            <meshStandardMaterial color="#F3FAF5" roughness={0.5} />
          </mesh>
          <mesh position={[1.92, 0.28, 0]} scale={[0.28, 0.22, 0.2]}>
            <sphereGeometry args={[1, 28, 18]} />
            <meshStandardMaterial color="#F3FAF5" roughness={0.5} />
          </mesh>
          {[-0.9, -0.25, 0.55, 1.1].map((x) => (
            <React.Fragment key={`bone-${x}`}>
              <mesh position={[x, isLarge ? -0.9 : -0.72, 0.28]} scale={[0.035, isLarge ? 0.62 : 0.5, 0.035]}>
                <capsuleGeometry args={[1, 1.25, 8, 16]} />
                <meshStandardMaterial color="#F3FAF5" roughness={0.5} />
              </mesh>
              <mesh position={[x, isLarge ? -0.9 : -0.72, -0.28]} scale={[0.035, isLarge ? 0.62 : 0.5, 0.035]}>
                <capsuleGeometry args={[1, 1.25, 8, 16]} />
                <meshStandardMaterial color="#F3FAF5" roughness={0.5} />
              </mesh>
            </React.Fragment>
          ))}
        </group>
      ) : null}

      {showOrgans ? (
        <group position={[0, 0, exploded ? explode * 1.8 : 0]}>
          <mesh ref={heartRef} position={[0.55, 0.22, 0.12]} scale={[0.18, 0.22, 0.16]}>
            <sphereGeometry args={[1, 28, 20]} />
            <meshStandardMaterial color="#D97C7C" roughness={0.56} emissive="#5A1D1D" emissiveIntensity={physiology ? 0.18 : 0.05} transparent opacity={materialOpacity(0.96, xray, focusRegion, "thorax")} />
          </mesh>
          <mesh ref={lungLeftRef} position={[0.2, 0.2, 0.24]} scale={[0.32, 0.23, 0.12]}>
            <sphereGeometry args={[1, 28, 18]} />
            <meshStandardMaterial color="#B9D7E8" roughness={0.62} transparent opacity={materialOpacity(0.88, xray, focusRegion, "thorax")} />
          </mesh>
          <mesh ref={lungRightRef} position={[0.2, 0.2, -0.24]} scale={[0.32, 0.23, 0.12]}>
            <sphereGeometry args={[1, 28, 18]} />
            <meshStandardMaterial color="#B9D7E8" roughness={0.62} transparent opacity={materialOpacity(0.88, xray, focusRegion, "thorax")} />
          </mesh>
          <mesh position={[-0.62, 0.02, 0.12]} scale={[0.34, 0.22, 0.18]}>
            <sphereGeometry args={[1, 28, 18]} />
            <meshStandardMaterial color="#D7B267" roughness={0.62} transparent opacity={materialOpacity(0.96, xray, focusRegion, "abdomen")} />
          </mesh>
          <mesh position={[-0.92, -0.12, -0.08]} rotation={[0, 0.1, 0.45]} scale={[0.42, 0.06, 0.18]}>
            <torusGeometry args={[1, 0.18, 12, 42]} />
            <meshStandardMaterial color="#D8AFA3" roughness={0.66} transparent opacity={materialOpacity(0.92, xray, focusRegion, "abdomen")} />
          </mesh>
          <mesh position={[-1.22, -0.2, 0]} scale={[0.18, 0.15, 0.13]}>
            <sphereGeometry args={[1, 24, 16]} />
            <meshStandardMaterial color="#C9D9F0" roughness={0.62} transparent opacity={materialOpacity(0.92, xray, focusRegion, "abdomen")} />
          </mesh>
        </group>
      ) : null}

      {showVascular ? <VascularSystem xray={xray} physiology={physiology} focusRegion={focusRegion} /> : null}

      {isAvian ? (
        <>
          <mesh position={[0.05, 0.04, 0.54]} rotation={[0.55, 0, 0]} scale={[0.72, 0.04, 0.34]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#CFE8D5" roughness={0.66} transparent opacity={xray ? 0.25 : 0.9} />
          </mesh>
          <mesh position={[0.05, 0.04, -0.54]} rotation={[-0.55, 0, 0]} scale={[0.72, 0.04, 0.34]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#CFE8D5" roughness={0.66} transparent opacity={xray ? 0.25 : 0.9} />
          </mesh>
          <mesh position={[1.22, 0.26, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.1, 0.08, 0.16]}>
            <coneGeometry args={[1, 1.2, 24]} />
            <meshStandardMaterial color="#D7B267" roughness={0.62} />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[2.08, 0.34, 0]} scale={[0.2, 0.14, 0.08]}>
            <coneGeometry args={[1, 1.4, 24]} />
            <meshStandardMaterial color="#C9DDCF" roughness={0.64} transparent opacity={xray ? 0.28 : 1} />
          </mesh>
          <mesh position={[-1.82, 0.22, 0]} rotation={[0, 0, -1.15]} scale={[0.13, 0.13, isExotic ? 1.45 : 1.08]}>
            <cylinderGeometry args={[1, 0.55, 1, 24]} />
            <meshStandardMaterial color="#C9DDCF" roughness={0.64} transparent opacity={xray ? 0.28 : 1} />
          </mesh>
        </>
      )}
    </group>
  );
}

function VascularSystem({ xray, physiology, focusRegion }: { xray: boolean; physiology: boolean; focusRegion: string }) {
  const pulseRef = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (pulseRef.current && physiology) {
      pulseRef.current.children.forEach((child, index) => {
        const t = (clock.elapsedTime * 0.85 + index * 0.18) % 1;
        child.position.x = 0.95 - t * 2.2;
        child.position.y = 0.29 - Math.sin(t * Math.PI) * 0.12;
      });
    }
  });

  return (
    <group>
      <mesh position={[0, 0.28, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.025, 0.025, 1.35]}>
        <cylinderGeometry args={[1, 1, 1, 16]} />
        <meshStandardMaterial color="#C74444" roughness={0.54} emissive="#3A1010" emissiveIntensity={physiology ? 0.2 : 0.06} transparent opacity={materialOpacity(0.95, xray, focusRegion, "thorax")} />
      </mesh>
      <mesh position={[0.2, 0.12, 0.18]} rotation={[1.1, 0, Math.PI / 2]} scale={[0.018, 0.018, 0.75]}>
        <cylinderGeometry args={[1, 1, 1, 16]} />
        <meshStandardMaterial color="#4E83C2" roughness={0.54} transparent opacity={materialOpacity(0.8, xray, focusRegion, "thorax")} />
      </mesh>
      <group ref={pulseRef}>
        {[0, 1, 2, 3, 4].map((item) => (
          <mesh key={item} position={[0.8 - item * 0.35, 0.29, 0.03]} scale={[0.035, 0.035, 0.035]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color="#FF7676" emissive="#B84040" emissiveIntensity={0.35} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function RegionLabel({ label, position }: { label: string; position: [number, number, number] }) {
  return (
    <Html position={position} center distanceFactor={9}>
      <span className="rounded border border-white/70 bg-white/95 px-2 py-1 text-[11px] font-semibold text-[#1F2A22] shadow-sm">
        {label}
      </span>
    </Html>
  );
}

function AnnotationMarker({ annotation }: { annotation: Annotation }) {
  const point = annotation.geometry?.coordinates || { x: 0, y: 0, z: 0 };
  const color = severityColor[annotation.severity || ""] || "#8BB8A8";

  return (
    <group position={[point.x, point.y, point.z]}>
      <mesh>
        <sphereGeometry args={[0.075, 20, 20]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.28} />
      </mesh>
      <mesh>
        <torusGeometry args={[0.13, 0.008, 8, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.18} transparent opacity={0.65} />
      </mesh>
      <Html center distanceFactor={8}>
        <div className="min-w-20 rounded-md border border-border bg-white px-2 py-1 text-xs font-medium text-foreground shadow-sm">
          {annotation.annotation_type}
        </div>
      </Html>
    </group>
  );
}

function SelectedPointMarker({ point }: { point: AnatomyPoint }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      const scale = 1 + Math.sin(clock.elapsedTime * 4) * 0.08;
      ref.current.scale.setScalar(scale);
    }
  });
  return (
    <group ref={ref} position={[point.x, point.y, point.z]}>
      <mesh>
        <sphereGeometry args={[0.095, 24, 24]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#8BB8A8" emissiveIntensity={0.45} />
      </mesh>
      <mesh>
        <torusGeometry args={[0.18, 0.01, 10, 36]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#8BB8A8" emissiveIntensity={0.35} />
      </mesh>
      <Html center distanceFactor={7}>
        <div className="rounded-md border border-white/80 bg-white px-2 py-1 text-xs font-semibold text-[#1F2A22] shadow">
          Novo ponto
        </div>
      </Html>
    </group>
  );
}

function HudButton({ active, children, onClick }: { active?: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border border-white/15 px-2.5 py-1.5 text-xs font-semibold shadow transition ${
        active ? "bg-[#DFF3E3] text-[#1F2A22]" : "bg-white/95 text-[#1F2A22] hover:bg-[#F4FBF6]"
      }`}
    >
      {children}
    </button>
  );
}

export default function AnatomyViewer({ annotations = [], onPick, selectedPoint, template, patientLabel }: AnatomyViewerProps) {
  const [autoRotate, setAutoRotate] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [layer, setLayer] = useState<AnatomyLayer>("combined");
  const [view, setView] = useState<ViewPreset>("lateral");
  const [focusRegion, setFocusRegion] = useState("");
  const [quality, setQuality] = useState<QualityPreset>("clinical");
  const [xray, setXray] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [physiology, setPhysiology] = useState(true);
  const [clipEnabled, setClipEnabled] = useState(false);
  const [clipAxis, setClipAxis] = useState<ClipAxis>("x");
  const [clipValue, setClipValue] = useState(0);
  const visibleAnnotations = useMemo(() => annotations.filter((annotation) => annotation.geometry?.coordinates), [annotations]);
  const regions = template?.regions_map || defaultRegions;
  const fallbackShape = template?.fallback_shape || "quadruped";
  const qualityPreset = qualityConfig[quality];
  const quickRegions: Array<{ key: string; label: string; point: AnatomyPoint }> = [
    { key: "head", label: regions.head || "Cabeca", point: { x: 1.58, y: 0.62, z: 0 } },
    { key: "thorax", label: regions.thorax || "Torax", point: { x: 0.38, y: 0.34, z: 0.28 } },
    { key: "abdomen", label: regions.abdomen || "Abdomen", point: { x: -0.78, y: 0.18, z: 0.25 } },
    { key: "limbs", label: regions.limbs || "Membros", point: { x: -0.25, y: -0.78, z: 0.28 } },
  ];
  const activeRegionLabel = quickRegions.find((region) => region.key === focusRegion)?.label || "Corpo inteiro";

  return (
    <div className="relative h-[34rem] w-full overflow-hidden rounded-md border border-[#20372B] bg-[#07130E] shadow-sm">
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_50%_42%,rgba(112,178,132,0.16),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent)]" />
      <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-sm rounded-md border border-white/10 bg-[#07130E]/85 px-3 py-2 text-xs text-white shadow">
        <div className="font-semibold">{template?.name || "VetAnatomy Digital Twin Engine"}</div>
        <div className="mt-0.5 text-white/75">{patientLabel || "Clique no modelo para selecionar um ponto anatomico"}</div>
        <div className="mt-1 text-white/80">Camada: {layer} | Vista: {view} | Foco: {activeRegionLabel}</div>
        <div className="mt-1 text-white/60">Qualidade: {qualityPreset.label} | Marcacoes: {visibleAnnotations.length}</div>
      </div>

      <div className="absolute right-4 top-4 z-10 flex max-w-[64%] flex-wrap justify-end gap-2">
        <HudButton active={autoRotate} onClick={() => setAutoRotate((value) => !value)}>{autoRotate ? "Giro on" : "Giro off"}</HudButton>
        <HudButton active={showLabels} onClick={() => setShowLabels((value) => !value)}>Rotulos</HudButton>
        <HudButton active={xray} onClick={() => setXray((value) => !value)}>Raio-X</HudButton>
        <HudButton active={exploded} onClick={() => setExploded((value) => !value)}>Explodido</HudButton>
        <HudButton active={physiology} onClick={() => setPhysiology((value) => !value)}>Fisiologia</HudButton>
        <HudButton active={clipEnabled} onClick={() => setClipEnabled((value) => !value)}>Corte 3D</HudButton>
      </div>

      <div className="absolute left-4 top-[6.8rem] z-10 flex flex-wrap gap-2">
        {(["combined", "surface", "muscles", "skeleton", "organs", "vascular"] as AnatomyLayer[]).map((item) => (
          <HudButton key={item} active={layer === item} onClick={() => setLayer(item)}>
            {item === "combined" ? "Completo" : item === "surface" ? "Pele" : item === "muscles" ? "Musculos" : item === "skeleton" ? "Osseo" : item === "organs" ? "Orgaos" : "Vasos"}
          </HudButton>
        ))}
      </div>

      <div className="absolute left-4 top-[10.1rem] z-10 flex flex-wrap gap-2">
        {(["lateral", "dorsal", "ventral", "cranial"] as ViewPreset[]).map((item) => (
          <HudButton
            key={item}
            active={view === item}
            onClick={() => {
              setAutoRotate(false);
              setView(item);
            }}
          >
            {item === "lateral" ? "Lateral" : item === "dorsal" ? "Dorsal" : item === "ventral" ? "Ventral" : "Cranial"}
          </HudButton>
        ))}
      </div>

      <div className="absolute bottom-4 right-4 z-10 flex max-w-[58%] flex-wrap justify-end gap-2">
        {quickRegions.map((region) => (
          <HudButton
            key={region.key}
            active={focusRegion === region.key}
            onClick={() => {
              setFocusRegion(region.key);
              onPick(region.point);
            }}
          >
            {region.label}
          </HudButton>
        ))}
        <HudButton active={!focusRegion} onClick={() => setFocusRegion("")}>Corpo inteiro</HudButton>
      </div>

      <div className="absolute bottom-4 left-4 z-10 w-[min(24rem,calc(100%-2rem))] rounded-md border border-white/10 bg-[#07130E]/85 p-3 text-xs text-white shadow">
        <div className="flex flex-wrap gap-2">
          {(["eco", "clinical", "ultra"] as QualityPreset[]).map((item) => (
            <HudButton key={item} active={quality === item} onClick={() => setQuality(item)}>{qualityConfig[item].label}</HudButton>
          ))}
          {(["x", "y", "z"] as ClipAxis[]).map((axis) => (
            <HudButton key={axis} active={clipAxis === axis && clipEnabled} onClick={() => { setClipAxis(axis); setClipEnabled(true); }}>Eixo {axis.toUpperCase()}</HudButton>
          ))}
        </div>
        {clipEnabled ? (
          <label className="mt-3 block">
            <span className="mb-1 block text-white/70">Plano de corte</span>
            <input
              type="range"
              min="-1.4"
              max="1.4"
              step="0.05"
              value={clipValue}
              onChange={(event) => setClipValue(Number(event.target.value))}
              className="w-full accent-[#8BB8A8]"
            />
          </label>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2 text-white/75">
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#6FBF73]" /> Leve</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#D7B267]" /> Moderada</span>
            <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#D97C7C]" /> Grave</span>
          </div>
        )}
      </div>

      <Canvas
        camera={{ position: [0, 1.25, 5.4], fov: 42 }}
        dpr={qualityPreset.dpr}
        shadows={qualityPreset.shadows}
        gl={{ preserveDrawingBuffer: true }}
      >
        <CameraPreset view={view} />
        <GlobalClipping enabled={clipEnabled} axis={clipAxis} value={clipValue} />
        <color attach="background" args={["#07130E"]} />
        <fog attach="fog" args={["#07130E", 8, 13]} />
        <ambientLight intensity={0.65} />
        <hemisphereLight args={["#DFF3E3", "#172A20", 0.85]} />
        <directionalLight castShadow={qualityPreset.shadows} position={[4, 5, 3]} intensity={1.65} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
        <directionalLight position={[-3, 1, -2]} intensity={0.62} color="#DFF3E3" />
        <pointLight position={[0, 1.3, 2.4]} intensity={0.6} color="#8BB8A8" />
        <AnatomyEngineModel
          fallbackShape={fallbackShape}
          onPick={onPick}
          autoRotate={autoRotate}
          layer={layer}
          focusRegion={focusRegion}
          xray={xray}
          exploded={exploded}
          physiology={physiology}
          detail={qualityPreset.detail}
        />
        {showLabels ? (
          <>
            <RegionLabel label={regions.head || "Cabeca"} position={[1.58, 0.88, 0]} />
            <RegionLabel label={regions.thorax || "Torax"} position={[0.34, 0.96, 0]} />
            <RegionLabel label={regions.abdomen || "Abdomen"} position={[-0.86, 0.84, 0]} />
            <RegionLabel label={regions.limbs || "Membros"} position={[-0.2, -1.24, 0]} />
          </>
        ) : null}
        {visibleAnnotations.map((annotation) => (
          <AnnotationMarker key={annotation.id} annotation={annotation} />
        ))}
        {selectedPoint ? <SelectedPointMarker point={selectedPoint} /> : null}
        <OrbitControls enableDamping enablePan={false} minDistance={2.35} maxDistance={9} />
      </Canvas>
    </div>
  );
}
