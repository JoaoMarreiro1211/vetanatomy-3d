"use client";

import React, { useMemo, useRef, useState } from "react";
import { Canvas, ThreeEvent, useFrame } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { Group, Vector3 } from "three";

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

function roundedPoint(point: Vector3): AnatomyPoint {
  return {
    x: Number(point.x.toFixed(2)),
    y: Number(point.y.toFixed(2)),
    z: Number(point.z.toFixed(2)),
  };
}

function ClinicalAnimalModel({
  fallbackShape,
  onPick,
  autoRotate,
  layer,
}: {
  fallbackShape: string;
  onPick: (point: AnatomyPoint) => void;
  autoRotate: boolean;
  layer: "surface" | "skeleton";
}) {
  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const isLarge = fallbackShape === "large_quadruped" || fallbackShape === "ruminant";
  const isAvian = fallbackShape === "avian";
  const isExotic = fallbackShape === "exotic";

  useFrame(() => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += hovered ? 0.0005 : 0.0012;
    }
  });

  function handlePick(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    onPick(roundedPoint(event.point));
  }

  const bodyScale: [number, number, number] = isAvian
    ? [0.95, 0.68, 0.5]
    : isExotic
      ? [1.9, 0.36, 0.34]
      : isLarge
        ? [2.05, 0.88, 0.62]
        : [1.65, 0.72, 0.52];

  return (
    <group
      ref={groupRef}
      onPointerDown={handlePick}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      rotation={[0.08, -0.35, 0]}
    >
      <mesh position={[0, 0.05, 0]} scale={bodyScale}>
        <sphereGeometry args={[1, 56, 36]} />
        <meshStandardMaterial color={hovered ? "#DFF3E3" : "#EAF4EC"} roughness={0.58} metalness={0.04} transparent={layer === "skeleton"} opacity={layer === "skeleton" ? 0.34 : 1} />
      </mesh>

      <mesh position={[isAvian ? 0.92 : 1.65, isAvian ? 0.23 : 0.18, 0]} scale={isAvian ? [0.38, 0.32, 0.32] : [0.58, 0.42, 0.4]}>
        <sphereGeometry args={[1, 42, 28]} />
        <meshStandardMaterial color="#E5F0E8" roughness={0.6} transparent={layer === "skeleton"} opacity={layer === "skeleton" ? 0.38 : 1} />
      </mesh>

      {layer === "skeleton" ? (
        <>
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
        </>
      ) : null}

      {isAvian ? (
        <>
          <mesh position={[0.05, 0.04, 0.54]} rotation={[0.55, 0, 0]} scale={[0.72, 0.04, 0.34]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#CFE8D5" roughness={0.66} />
          </mesh>
          <mesh position={[0.05, 0.04, -0.54]} rotation={[-0.55, 0, 0]} scale={[0.72, 0.04, 0.34]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#CFE8D5" roughness={0.66} />
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
            <meshStandardMaterial color="#C9DDCF" roughness={0.64} />
          </mesh>
          <mesh position={[-1.82, 0.22, 0]} rotation={[0, 0, -1.15]} scale={[0.13, 0.13, isExotic ? 1.45 : 1.08]}>
            <cylinderGeometry args={[1, 0.55, 1, 24]} />
            <meshStandardMaterial color="#C9DDCF" roughness={0.64} />
          </mesh>
        </>
      )}

      {!isAvian
        ? [-0.9, -0.25, 0.55, 1.1].map((x) => (
            <React.Fragment key={x}>
              <mesh position={[x, isLarge ? -1.02 : -0.82, 0.27]} scale={[0.13, isLarge ? 0.74 : 0.58, 0.13]}>
                <capsuleGeometry args={[1, 1.25, 8, 20]} />
                <meshStandardMaterial color="#D8E8DC" roughness={0.7} />
              </mesh>
              <mesh position={[x, isLarge ? -1.02 : -0.82, -0.27]} scale={[0.13, isLarge ? 0.74 : 0.58, 0.13]}>
                <capsuleGeometry args={[1, 1.25, 8, 20]} />
                <meshStandardMaterial color="#D8E8DC" roughness={0.7} />
              </mesh>
            </React.Fragment>
          ))
        : null}

      <mesh position={[1.95, 0.22, 0.27]} scale={[0.035, 0.035, 0.035]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color="#1F2A22" />
      </mesh>
      <mesh position={[0.05, 0.34, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.025, 0.025, isLarge ? 1.55 : 1.25]}>
        <cylinderGeometry args={[1, 1, 1, 16]} />
        <meshStandardMaterial color="#8BB8A8" roughness={0.7} />
      </mesh>
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
      <Html center distanceFactor={7}>
        <div className="rounded-md border border-white/80 bg-white px-2 py-1 text-xs font-semibold text-[#1F2A22] shadow">
          Novo ponto
        </div>
      </Html>
    </group>
  );
}

export default function AnatomyViewer({ annotations = [], onPick, selectedPoint, template, patientLabel }: AnatomyViewerProps) {
  const [autoRotate, setAutoRotate] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [layer, setLayer] = useState<"surface" | "skeleton">("surface");
  const visibleAnnotations = useMemo(() => annotations.filter((annotation) => annotation.geometry?.coordinates), [annotations]);
  const regions = template?.regions_map || defaultRegions;
  const fallbackShape = template?.fallback_shape || "quadruped";
  const quickRegions: Array<{ key: string; label: string; point: AnatomyPoint }> = [
    { key: "head", label: regions.head || "Cabeca", point: { x: 1.58, y: 0.62, z: 0 } },
    { key: "thorax", label: regions.thorax || "Torax", point: { x: 0.38, y: 0.34, z: 0.28 } },
    { key: "abdomen", label: regions.abdomen || "Abdomen", point: { x: -0.78, y: 0.18, z: 0.25 } },
    { key: "limbs", label: regions.limbs || "Membros", point: { x: -0.25, y: -0.78, z: 0.28 } },
  ];

  return (
    <div className="relative h-[30rem] w-full overflow-hidden rounded-md border border-border bg-[#102018] shadow-sm">
      <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-sm rounded-md border border-white/10 bg-[#102018]/85 px-3 py-2 text-xs text-white shadow">
        <div className="font-semibold">{template?.name || "Template anatomico padrao"}</div>
        <div className="mt-0.5 text-white/75">{patientLabel || "Clique no modelo para selecionar um ponto anatomico"}</div>
      </div>
      <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex flex-wrap gap-2 rounded-md border border-white/10 bg-[#102018]/85 px-3 py-2 text-xs text-white shadow">
        <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#6FBF73]" /> Leve</span>
        <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#D7B267]" /> Moderada</span>
        <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#D97C7C]" /> Grave</span>
      </div>
      <div className="absolute right-4 top-4 z-10 flex flex-wrap justify-end gap-2 text-xs">
        <button type="button" onClick={() => setAutoRotate((value) => !value)} className="rounded-md border border-white/15 bg-white/95 px-3 py-1.5 font-semibold text-[#1F2A22] shadow">
          {autoRotate ? "Pausar" : "Girar"}
        </button>
        <button type="button" onClick={() => setShowLabels((value) => !value)} className="rounded-md border border-white/15 bg-white/95 px-3 py-1.5 font-semibold text-[#1F2A22] shadow">
          {showLabels ? "Ocultar regioes" : "Mostrar regioes"}
        </button>
        <button type="button" onClick={() => setLayer((value) => (value === "surface" ? "skeleton" : "surface"))} className="rounded-md border border-white/15 bg-white/95 px-3 py-1.5 font-semibold text-[#1F2A22] shadow">
          {layer === "surface" ? "Camada ossea" : "Superficie"}
        </button>
      </div>
      <div className="absolute bottom-4 right-4 z-10 flex max-w-[52%] flex-wrap justify-end gap-2">
        {quickRegions.map((region) => (
          <button
            key={region.key}
            type="button"
            onClick={() => onPick(region.point)}
            className="rounded-md border border-white/15 bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-[#1F2A22] shadow"
          >
            {region.label}
          </button>
        ))}
      </div>
      <Canvas camera={{ position: [0, 1.25, 5.4], fov: 42 }}>
        <color attach="background" args={["#102018"]} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 5, 3]} intensity={1.45} />
        <directionalLight position={[-3, 1, -2]} intensity={0.5} color="#DFF3E3" />
        <ClinicalAnimalModel fallbackShape={fallbackShape} onPick={onPick} autoRotate={autoRotate} layer={layer} />
        {showLabels ? (
          <>
            <RegionLabel label={regions.head || "Cabeca"} position={[1.58, 0.88, 0]} />
            <RegionLabel label={regions.thorax || "Torax"} position={[0.34, 0.96, 0]} />
            <RegionLabel label={regions.abdomen || "Abdomen"} position={[-0.86, 0.84, 0]} />
          </>
        ) : null}
        {visibleAnnotations.map((annotation) => (
          <AnnotationMarker key={annotation.id} annotation={annotation} />
        ))}
        {selectedPoint ? (
          <SelectedPointMarker point={selectedPoint} />
        ) : null}
        <OrbitControls enableDamping enablePan={false} minDistance={3} maxDistance={8} />
      </Canvas>
    </div>
  );
}
