"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
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
type ClipAxis = "x" | "y" | "z" | "oblique";
type ToolMode = "annotate" | "distance" | "angle";

type StructureInfo = {
  id: string;
  name: string;
  system: string;
  region: string;
  summary: string;
  commonFindings: string[];
  surgicalNotes: string;
};

type Measurement = {
  id: number;
  mode: "distance" | "angle";
  points: AnatomyPoint[];
  value: string;
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

const structureLibrary: Record<string, StructureInfo> = {
  skin_trunk: {
    id: "skin_trunk",
    name: "Pele e subcutaneo do tronco",
    system: "Tegumentar",
    region: "thorax",
    summary: "Camada superficial para avaliacao de feridas, massas, dor cutanea e acessos iniciais.",
    commonFindings: ["Dermatite", "Nodulos", "Feridas", "Edema subcutaneo"],
    surgicalNotes: "Definir linha de incisao, tricotomia e margem de seguranca antes de acessar camadas profundas.",
  },
  head_surface: {
    id: "head_surface",
    name: "Cabeca e face",
    system: "Tegumentar / neurologico",
    region: "head",
    summary: "Regiao craniana para avaliacao neurologica, odontologica, ocular e vias aereas superiores.",
    commonFindings: ["Dor oral", "Trauma craniano", "Alteracao ocular", "Secrecao nasal"],
    surgicalNotes: "Planejar acesso evitando olhos, vasos superficiais e estruturas odontologicas.",
  },
  axial_muscles: {
    id: "axial_muscles",
    name: "Musculatura axial",
    system: "Muscular",
    region: "thorax",
    summary: "Grupo muscular do tronco usado para dor localizada, trauma, contratura e planejamento de acesso.",
    commonFindings: ["Contratura", "Laceracao", "Miosite", "Hematoma"],
    surgicalNotes: "Separar fibras no sentido anatomico quando possivel e controlar sangramento muscular.",
  },
  limb_muscles: {
    id: "limb_muscles",
    name: "Musculatura dos membros",
    system: "Muscular",
    region: "limbs",
    summary: "Massas musculares de suporte locomotor, importantes em ortopedia e reabilitacao.",
    commonFindings: ["Claudicacao", "Atrofia", "Trauma", "Dor articular referida"],
    surgicalNotes: "Associar com pontos osseos e trajetos neurovasculares antes de incisao profunda.",
  },
  spine: {
    id: "spine",
    name: "Coluna vertebral",
    system: "Osseo / neurologico",
    region: "thorax",
    summary: "Eixo osseo principal para avaliacao ortopedica, neurologica e dor axial.",
    commonFindings: ["Dor cervical", "Espondilose", "Trauma", "Compressao medular suspeita"],
    surgicalNotes: "Planejar acesso com imagem, landmarks e protecao neurologica.",
  },
  ribs: {
    id: "ribs",
    name: "Arcos costais",
    system: "Osseo / respiratorio",
    region: "thorax",
    summary: "Estruturas toracicas para avaliar trauma, dor pleural e acessos ao torax.",
    commonFindings: ["Fratura costal", "Dor toracica", "Contusao", "Dispneia"],
    surgicalNotes: "Cuidado com pleura, vasos intercostais e expansao pulmonar.",
  },
  skull: {
    id: "skull",
    name: "Cranio",
    system: "Osseo / neurologico",
    region: "head",
    summary: "Estrutura protetora do encefalo, face e cavidade oral.",
    commonFindings: ["Trauma", "Alteracao dentaria", "Dor mandibular", "Assimetria facial"],
    surgicalNotes: "Acesso deve considerar nervos cranianos, orbitas e cavidade oral.",
  },
  limb_bones: {
    id: "limb_bones",
    name: "Ossos dos membros",
    system: "Osseo",
    region: "limbs",
    summary: "Alavancas locomotoras para avaliacao de fraturas, desvios e planejamento ortopedico.",
    commonFindings: ["Fratura", "Luxacao", "Osteoartrite", "Dor articular"],
    surgicalNotes: "Medir eixo e distancia antes de fixacao, osteotomia ou imobilizacao.",
  },
  heart: {
    id: "heart",
    name: "Coracao",
    system: "Cardiovascular",
    region: "thorax",
    summary: "Bomba central da circulacao, animada no modo fisiologico.",
    commonFindings: ["Sopro", "Cardiomegalia", "Arritmia", "Insuficiencia cardiaca"],
    surgicalNotes: "Qualquer intervencao toracica exige plano anestesico e monitorizacao rigorosa.",
  },
  lungs: {
    id: "lungs",
    name: "Pulmoes",
    system: "Respiratorio",
    region: "thorax",
    summary: "Par pulmonar com expansao visual no modo fisiologico.",
    commonFindings: ["Dispneia", "Bronquite", "Pneumonia", "Contusao pulmonar"],
    surgicalNotes: "Evitar trauma pleural e correlacionar com RX/US/TC quando disponivel.",
  },
  liver: {
    id: "liver",
    name: "Figado",
    system: "Digestorio / metabolico",
    region: "abdomen",
    summary: "Orgao metabolico abdominal usado em avaliacao de dor, ultrassom e cirurgia.",
    commonFindings: ["Hepatomegalia", "Nodulos", "Alteracao enzimatica", "Trauma abdominal"],
    surgicalNotes: "Acesso abdominal deve considerar vascularizacao e risco de sangramento.",
  },
  intestines: {
    id: "intestines",
    name: "Alcas intestinais",
    system: "Digestorio",
    region: "abdomen",
    summary: "Segmentos digestorios para dor abdominal, peristaltismo e obstrucao.",
    commonFindings: ["Ileo", "Corpo estranho", "Distensao", "Enterite"],
    surgicalNotes: "Planejar enterotomia/enterectomia com isolamento, irrigacao e controle de contaminacao.",
  },
  kidney: {
    id: "kidney",
    name: "Rim",
    system: "Urinario",
    region: "abdomen",
    summary: "Orgao urinario para avaliacao de dor, ultrassom, hidratacao e funcao renal.",
    commonFindings: ["Nefropatia", "Hidronefrose", "Urolitiase", "Dor lombar"],
    surgicalNotes: "Preservar vascularizacao renal e ureter; correlacionar com exames laboratoriais.",
  },
  vascular_axis: {
    id: "vascular_axis",
    name: "Eixo vascular principal",
    system: "Cardiovascular",
    region: "thorax",
    summary: "Trajeto esquematico de grandes vasos com fluxo animado.",
    commonFindings: ["Perfusao ruim", "Hemorragia", "Choque", "Alteracao de pulso"],
    surgicalNotes: "Identificar trajetos vasculares antes de incisao profunda.",
  },
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

function pointToVector(point: AnatomyPoint) {
  return new Vector3(point.x, point.y, point.z);
}

function distanceBetween(a: AnatomyPoint, b: AnatomyPoint) {
  return pointToVector(a).distanceTo(pointToVector(b));
}

function formatDistance(a: AnatomyPoint, b: AnatomyPoint) {
  const units = distanceBetween(a, b);
  return `${(units * 18).toFixed(1)} cm`;
}

function formatAngle(a: AnatomyPoint, b: AnatomyPoint, c: AnatomyPoint) {
  const ba = pointToVector(a).sub(pointToVector(b)).normalize();
  const bc = pointToVector(c).sub(pointToVector(b)).normalize();
  const angle = ba.angleTo(bc) * (180 / Math.PI);
  return `${angle.toFixed(1)}°`;
}

function GlobalClipping({ enabled, axis, value, slab, slabWidth }: { enabled: boolean; axis: ClipAxis; value: number; slab: boolean; slabWidth: number }) {
  const { gl } = useThree();

  useEffect(() => {
    gl.localClippingEnabled = enabled;
    const normal =
      axis === "x"
        ? new Vector3(-1, 0, 0)
        : axis === "y"
          ? new Vector3(0, -1, 0)
          : axis === "z"
            ? new Vector3(0, 0, -1)
            : new Vector3(-0.78, -0.28, -0.56).normalize();
    const planes = [new Plane(normal, value)];
    if (slab) {
      planes.push(new Plane(normal.clone().multiplyScalar(-1), slabWidth - value));
    }
    gl.clippingPlanes = enabled ? planes : [];
    return () => {
      gl.clippingPlanes = [];
    };
  }, [axis, enabled, gl, slab, slabWidth, value]);

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
  selectedStructureId,
  onStructurePick,
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
  selectedStructureId?: string | null;
  onStructurePick: (structure: StructureInfo, point: AnatomyPoint) => void;
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

  function pick(event: ThreeEvent<PointerEvent>, structureId: string) {
    event.stopPropagation();
    const point = roundedPoint(event.point);
    const structure = structureLibrary[structureId] || structureLibrary.skin_trunk;
    setHoveredRegion(structure.region);
    onStructurePick(structure, point);
    onPick(point);
  }

  function structureColor(structureId: string, base: string) {
    return selectedStructureId === structureId ? "#F6E7A8" : base;
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
            onPointerDown={(event) => pick(event, "skin_trunk")}
            onPointerEnter={() => setHoveredRegion("thorax")}
            onPointerLeave={() => setHoveredRegion("")}
          >
            <sphereGeometry args={[1, detail, Math.max(18, Math.floor(detail * 0.65))]} />
            <meshStandardMaterial
              color={structureColor("skin_trunk", hoveredRegion === "thorax" ? "#DFF3E3" : "#EAF4EC")}
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
            onPointerDown={(event) => pick(event, "head_surface")}
            onPointerEnter={() => setHoveredRegion("head")}
            onPointerLeave={() => setHoveredRegion("")}
          >
            <sphereGeometry args={[1, Math.max(24, detail - 8), Math.max(16, Math.floor(detail * 0.55))]} />
            <meshStandardMaterial
              color={structureColor("head_surface", hoveredRegion === "head" ? "#DFF3E3" : "#E5F0E8")}
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
            <mesh key={`muscle-band-${x}`} position={[x, 0.09, 0.42]} rotation={[0.18, 0, 0.1]} scale={[0.38, 0.055, 0.08]} onPointerDown={(event) => pick(event, "axial_muscles")}>
              <capsuleGeometry args={[1, 1.15, 8, 16]} />
              <meshStandardMaterial color={structureColor("axial_muscles", index % 2 ? "#C96D6A" : "#B95357")} roughness={0.72} transparent opacity={materialOpacity(muscleOpacity, xray, focusRegion, "thorax")} />
            </mesh>
          ))}
          {[-0.9, -0.25, 0.55, 1.1].map((x) => (
            <React.Fragment key={`muscle-limb-${x}`}>
              <mesh position={[x, isLarge ? -1.02 : -0.82, 0.34]} scale={[0.12, isLarge ? 0.72 : 0.56, 0.11]} onPointerDown={(event) => pick(event, "limb_muscles")}>
                <capsuleGeometry args={[1, 1.25, 8, 16]} />
                <meshStandardMaterial color={structureColor("limb_muscles", "#B95357")} roughness={0.74} transparent opacity={materialOpacity(muscleOpacity, xray, focusRegion, "limbs")} />
              </mesh>
              <mesh position={[x, isLarge ? -1.02 : -0.82, -0.34]} scale={[0.12, isLarge ? 0.72 : 0.56, 0.11]} onPointerDown={(event) => pick(event, "limb_muscles")}>
                <capsuleGeometry args={[1, 1.25, 8, 16]} />
                <meshStandardMaterial color={structureColor("limb_muscles", "#C96D6A")} roughness={0.74} transparent opacity={materialOpacity(muscleOpacity, xray, focusRegion, "limbs")} />
              </mesh>
            </React.Fragment>
          ))}
        </group>
      ) : null}

      {showSkeleton ? (
        <group position={[0, exploded ? 0.12 : 0, exploded ? explode : 0]}>
          <mesh position={[0.1, 0.35, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.035, 0.035, isLarge ? 1.75 : 1.35]} onPointerDown={(event) => pick(event, "spine")}>
            <cylinderGeometry args={[1, 1, 1, 16]} />
            <meshStandardMaterial color={structureColor("spine", "#F3FAF5")} roughness={0.48} />
          </mesh>
          {[-0.7, -0.25, 0.25, 0.7].map((x) => (
            <mesh key={`rib-${x}`} position={[x, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.018, 0.018, isLarge ? 0.78 : 0.58]} onPointerDown={(event) => pick(event, "ribs")}>
              <torusGeometry args={[1, 0.12, 10, 28, Math.PI]} />
              <meshStandardMaterial color={structureColor("ribs", "#F3FAF5")} roughness={0.5} />
            </mesh>
          ))}
          <mesh position={[1.52, 0.18, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.04, 0.04, 0.52]} onPointerDown={(event) => pick(event, "skull")}>
            <cylinderGeometry args={[1, 1, 1, 16]} />
            <meshStandardMaterial color={structureColor("skull", "#F3FAF5")} roughness={0.5} />
          </mesh>
          <mesh position={[1.92, 0.28, 0]} scale={[0.28, 0.22, 0.2]} onPointerDown={(event) => pick(event, "skull")}>
            <sphereGeometry args={[1, 28, 18]} />
            <meshStandardMaterial color={structureColor("skull", "#F3FAF5")} roughness={0.5} />
          </mesh>
          {[-0.9, -0.25, 0.55, 1.1].map((x) => (
            <React.Fragment key={`bone-${x}`}>
              <mesh position={[x, isLarge ? -0.9 : -0.72, 0.28]} scale={[0.035, isLarge ? 0.62 : 0.5, 0.035]} onPointerDown={(event) => pick(event, "limb_bones")}>
                <capsuleGeometry args={[1, 1.25, 8, 16]} />
                <meshStandardMaterial color={structureColor("limb_bones", "#F3FAF5")} roughness={0.5} />
              </mesh>
              <mesh position={[x, isLarge ? -0.9 : -0.72, -0.28]} scale={[0.035, isLarge ? 0.62 : 0.5, 0.035]} onPointerDown={(event) => pick(event, "limb_bones")}>
                <capsuleGeometry args={[1, 1.25, 8, 16]} />
                <meshStandardMaterial color={structureColor("limb_bones", "#F3FAF5")} roughness={0.5} />
              </mesh>
            </React.Fragment>
          ))}
        </group>
      ) : null}

      {showOrgans ? (
        <group position={[0, 0, exploded ? explode * 1.8 : 0]}>
          <mesh ref={heartRef} position={[0.55, 0.22, 0.12]} scale={[0.18, 0.22, 0.16]} onPointerDown={(event) => pick(event, "heart")}>
            <sphereGeometry args={[1, 28, 20]} />
            <meshStandardMaterial color={structureColor("heart", "#D97C7C")} roughness={0.56} emissive="#5A1D1D" emissiveIntensity={physiology ? 0.18 : 0.05} transparent opacity={materialOpacity(0.96, xray, focusRegion, "thorax")} />
          </mesh>
          <mesh ref={lungLeftRef} position={[0.2, 0.2, 0.24]} scale={[0.32, 0.23, 0.12]} onPointerDown={(event) => pick(event, "lungs")}>
            <sphereGeometry args={[1, 28, 18]} />
            <meshStandardMaterial color={structureColor("lungs", "#B9D7E8")} roughness={0.62} transparent opacity={materialOpacity(0.88, xray, focusRegion, "thorax")} />
          </mesh>
          <mesh ref={lungRightRef} position={[0.2, 0.2, -0.24]} scale={[0.32, 0.23, 0.12]} onPointerDown={(event) => pick(event, "lungs")}>
            <sphereGeometry args={[1, 28, 18]} />
            <meshStandardMaterial color={structureColor("lungs", "#B9D7E8")} roughness={0.62} transparent opacity={materialOpacity(0.88, xray, focusRegion, "thorax")} />
          </mesh>
          <mesh position={[-0.62, 0.02, 0.12]} scale={[0.34, 0.22, 0.18]} onPointerDown={(event) => pick(event, "liver")}>
            <sphereGeometry args={[1, 28, 18]} />
            <meshStandardMaterial color={structureColor("liver", "#D7B267")} roughness={0.62} transparent opacity={materialOpacity(0.96, xray, focusRegion, "abdomen")} />
          </mesh>
          <mesh position={[-0.92, -0.12, -0.08]} rotation={[0, 0.1, 0.45]} scale={[0.42, 0.06, 0.18]} onPointerDown={(event) => pick(event, "intestines")}>
            <torusGeometry args={[1, 0.18, 12, 42]} />
            <meshStandardMaterial color={structureColor("intestines", "#D8AFA3")} roughness={0.66} transparent opacity={materialOpacity(0.92, xray, focusRegion, "abdomen")} />
          </mesh>
          <mesh position={[-1.22, -0.2, 0]} scale={[0.18, 0.15, 0.13]} onPointerDown={(event) => pick(event, "kidney")}>
            <sphereGeometry args={[1, 24, 16]} />
            <meshStandardMaterial color={structureColor("kidney", "#C9D9F0")} roughness={0.62} transparent opacity={materialOpacity(0.92, xray, focusRegion, "abdomen")} />
          </mesh>
        </group>
      ) : null}

      {showVascular ? <VascularSystem xray={xray} physiology={physiology} focusRegion={focusRegion} selectedStructureId={selectedStructureId} onPick={pick} /> : null}

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

function VascularSystem({
  xray,
  physiology,
  focusRegion,
  selectedStructureId,
  onPick,
}: {
  xray: boolean;
  physiology: boolean;
  focusRegion: string;
  selectedStructureId?: string | null;
  onPick: (event: ThreeEvent<PointerEvent>, structureId: string) => void;
}) {
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
      <mesh position={[0, 0.28, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.025, 0.025, 1.35]} onPointerDown={(event) => onPick(event, "vascular_axis")}>
        <cylinderGeometry args={[1, 1, 1, 16]} />
        <meshStandardMaterial color={selectedStructureId === "vascular_axis" ? "#F6E7A8" : "#C74444"} roughness={0.54} emissive="#3A1010" emissiveIntensity={physiology ? 0.2 : 0.06} transparent opacity={materialOpacity(0.95, xray, focusRegion, "thorax")} />
      </mesh>
      <mesh position={[0.2, 0.12, 0.18]} rotation={[1.1, 0, Math.PI / 2]} scale={[0.018, 0.018, 0.75]} onPointerDown={(event) => onPick(event, "vascular_axis")}>
        <cylinderGeometry args={[1, 1, 1, 16]} />
        <meshStandardMaterial color={selectedStructureId === "vascular_axis" ? "#F6E7A8" : "#4E83C2"} roughness={0.54} transparent opacity={materialOpacity(0.8, xray, focusRegion, "thorax")} />
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

function MeasurementOverlay({ measurements, draft }: { measurements: Measurement[]; draft: AnatomyPoint[] }) {
  const all = draft.length > 1 ? [...measurements, { id: -1, mode: draft.length === 3 ? "angle" : "distance", points: draft, value: "" } as Measurement] : measurements;

  return (
    <>
      {all.map((measurement) => {
        const points = measurement.points.map((point) => [point.x, point.y, point.z] as [number, number, number]);
        if (points.length < 2) return null;
        const labelPoint = measurement.points[Math.min(1, measurement.points.length - 1)];
        const value =
          measurement.value ||
          (measurement.points.length === 3
            ? formatAngle(measurement.points[0], measurement.points[1], measurement.points[2])
            : formatDistance(measurement.points[0], measurement.points[1]));
        return (
          <group key={measurement.id}>
            <Line points={points} color={measurement.mode === "angle" ? "#F6E7A8" : "#FFFFFF"} lineWidth={3} dashed={measurement.id === -1} />
            {measurement.points.map((point, index) => (
              <mesh key={`${measurement.id}-${index}`} position={[point.x, point.y, point.z]} scale={[0.045, 0.045, 0.045]}>
                <sphereGeometry args={[1, 16, 12]} />
                <meshStandardMaterial color={measurement.mode === "angle" ? "#F6E7A8" : "#FFFFFF"} emissive="#8BB8A8" emissiveIntensity={0.25} />
              </mesh>
            ))}
            <Html position={[labelPoint.x, labelPoint.y + 0.16, labelPoint.z]} center distanceFactor={7}>
              <div className="rounded-md border border-white/80 bg-[#07130E]/95 px-2 py-1 text-xs font-semibold text-white shadow">
                {measurement.mode === "angle" ? "Angulo" : "Distancia"}: {value}
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
}

function StructurePanel({ structure }: { structure: StructureInfo | null }) {
  if (!structure) {
    return (
      <div className="text-white/70">
        Clique em uma estrutura para ver sistema, achados comuns e notas cirurgicas.
      </div>
    );
  }

  return (
    <div>
      <div className="text-sm font-semibold text-white">{structure.name}</div>
      <div className="mt-1 text-xs text-[#DFF3E3]">{structure.system}</div>
      <p className="mt-2 leading-5 text-white/78">{structure.summary}</p>
      <div className="mt-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Achados comuns</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {structure.commonFindings.map((finding) => (
            <span key={finding} className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-white/85">
              {finding}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 rounded-md border border-white/10 bg-white/5 p-2 text-white/78">
        {structure.surgicalNotes}
      </div>
    </div>
  );
}

function HudButton({ active, children, onClick }: { active?: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pointer-events-auto rounded-md border border-white/15 px-2.5 py-1.5 text-xs font-semibold shadow transition ${
        active ? "bg-[#DFF3E3] text-[#1F2A22]" : "bg-white/95 text-[#1F2A22] hover:bg-[#F4FBF6]"
      }`}
    >
      {children}
    </button>
  );
}

function ControlSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 border-t border-white/10 pt-3">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-white/45">{title}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export default function AnatomyViewer({ annotations = [], onPick, selectedPoint, template, patientLabel }: AnatomyViewerProps) {
  const [autoRotate, setAutoRotate] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
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
  const [clipSlab, setClipSlab] = useState(false);
  const [toolMode, setToolMode] = useState<ToolMode>("annotate");
  const [selectedStructure, setSelectedStructure] = useState<StructureInfo | null>(null);
  const [measureDraft, setMeasureDraft] = useState<AnatomyPoint[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
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

  function setClipPreset(axis: ClipAxis, value: number, region: string, nextLayer: AnatomyLayer = "combined", slab = false) {
    setClipAxis(axis);
    setClipValue(value);
    setFocusRegion(region);
    setLayer(nextLayer);
    setXray(true);
    setClipSlab(slab);
    setClipEnabled(true);
  }

  function handleStructurePick(structure: StructureInfo, point: AnatomyPoint) {
    setSelectedStructure(structure);
    setFocusRegion(structure.region);
    if (toolMode === "annotate") return;

    setMeasureDraft((current) => {
      const next = [...current, point];
      if (toolMode === "distance" && next.length === 2) {
        setMeasurements((items) => [...items, { id: Date.now(), mode: "distance", points: next, value: formatDistance(next[0], next[1]) }]);
        return [];
      }
      if (toolMode === "angle" && next.length === 3) {
        setMeasurements((items) => [...items, { id: Date.now(), mode: "angle", points: next, value: formatAngle(next[0], next[1], next[2]) }]);
        return [];
      }
      return next;
    });
  }

  return (
    <div className="grid w-full gap-3 rounded-md border border-[#20372B] bg-[#07130E] p-3 shadow-sm 2xl:grid-cols-[17rem_minmax(34rem,1fr)_20rem]">
      <aside className="rounded-md border border-white/10 bg-white/[0.04] p-3 text-xs text-white">
        <div className="font-semibold">{template?.name || "VetAnatomy Digital Twin Engine"}</div>
        <div className="mt-1 text-white/65">{patientLabel || "Selecione uma estrutura no modelo."}</div>

        <ControlSection title="Visual">
          <HudButton active={autoRotate} onClick={() => setAutoRotate((value) => !value)}>{autoRotate ? "Giro on" : "Giro off"}</HudButton>
          <HudButton active={showLabels} onClick={() => setShowLabels((value) => !value)}>Rotulos</HudButton>
          <HudButton active={xray} onClick={() => setXray((value) => !value)}>Raio-X</HudButton>
          <HudButton active={exploded} onClick={() => setExploded((value) => !value)}>Explodido</HudButton>
          <HudButton active={physiology} onClick={() => setPhysiology((value) => !value)}>Fisiologia</HudButton>
        </ControlSection>

        <ControlSection title="Camadas">
          {(["combined", "surface", "muscles", "skeleton", "organs", "vascular"] as AnatomyLayer[]).map((item) => (
            <HudButton key={item} active={layer === item} onClick={() => setLayer(item)}>
              {item === "combined" ? "Completo" : item === "surface" ? "Pele" : item === "muscles" ? "Musculos" : item === "skeleton" ? "Osseo" : item === "organs" ? "Orgaos" : "Vasos"}
            </HudButton>
          ))}
        </ControlSection>

        <ControlSection title="Vista">
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
        </ControlSection>

        <ControlSection title="Ferramentas">
          <HudButton active={toolMode === "annotate"} onClick={() => { setToolMode("annotate"); setMeasureDraft([]); }}>Anotar</HudButton>
          <HudButton active={toolMode === "distance"} onClick={() => { setToolMode("distance"); setMeasureDraft([]); }}>Distancia</HudButton>
          <HudButton active={toolMode === "angle"} onClick={() => { setToolMode("angle"); setMeasureDraft([]); }}>Angulo</HudButton>
          <HudButton active={measurements.length > 0} onClick={() => { setMeasurements([]); setMeasureDraft([]); }}>Limpar</HudButton>
        </ControlSection>

        <ControlSection title="Cortes">
          <HudButton active={clipEnabled} onClick={() => setClipEnabled((value) => !value)}>Ativar corte</HudButton>
          <HudButton active={clipEnabled && focusRegion === "thorax"} onClick={() => setClipPreset("x", -0.28, "thorax", "combined", true)}>Toracico</HudButton>
          <HudButton active={clipEnabled && focusRegion === "abdomen"} onClick={() => setClipPreset("x", 0.58, "abdomen", "organs", true)}>Abdominal</HudButton>
          <HudButton active={clipEnabled && focusRegion === "head"} onClick={() => setClipPreset("oblique", -0.12, "head", "skeleton", false)}>Craniano</HudButton>
          <HudButton active={clipSlab} onClick={() => setClipSlab((value) => !value)}>Slab</HudButton>
        </ControlSection>

        <ControlSection title="Plano">
          {(["x", "y", "z"] as ClipAxis[]).map((axis) => (
            <HudButton key={axis} active={clipAxis === axis && clipEnabled} onClick={() => { setClipAxis(axis); setClipEnabled(true); }}>Eixo {axis.toUpperCase()}</HudButton>
          ))}
          <HudButton active={clipAxis === "oblique" && clipEnabled} onClick={() => { setClipAxis("oblique"); setClipEnabled(true); }}>Obliquo</HudButton>
        </ControlSection>

        {clipEnabled ? (
          <label className="mt-3 block">
            <span className="mb-1 block text-white/70">Profundidade do corte</span>
            <input
              type="range"
              min="-1.4"
              max="1.4"
              step="0.05"
              value={clipValue}
              onChange={(event) => setClipValue(Number(event.target.value))}
              className="w-full accent-[#8BB8A8]"
            />
            <div className="mt-1 text-white/45">{clipSlab ? "Slab isolando uma faixa anatomica." : "Corte simples por plano."}</div>
          </label>
        ) : null}

        <ControlSection title="Qualidade">
          {(["eco", "clinical", "ultra"] as QualityPreset[]).map((item) => (
            <HudButton key={item} active={quality === item} onClick={() => setQuality(item)}>{qualityConfig[item].label}</HudButton>
          ))}
        </ControlSection>
      </aside>

      <section className="relative h-[28rem] min-w-0 overflow-hidden rounded-md border border-[#20372B] bg-[#07130E] md:h-[34rem]">
        <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_50%_42%,rgba(112,178,132,0.16),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.03),transparent)]" />
        <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-md border border-white/10 bg-[#07130E]/80 px-3 py-2 text-xs text-white shadow">
          <div className="font-semibold">{selectedStructure?.name || activeRegionLabel}</div>
          <div className="mt-0.5 text-white/60">{layer} | {view} | {toolMode} | {qualityPreset.label}</div>
        </div>

        <Canvas
          camera={{ position: [0, 1.25, 5.4], fov: 42 }}
          dpr={qualityPreset.dpr}
          shadows={qualityPreset.shadows}
          gl={{ preserveDrawingBuffer: true }}
        >
        <CameraPreset view={view} />
        <GlobalClipping enabled={clipEnabled} axis={clipAxis} value={clipValue} slab={clipSlab} slabWidth={0.92} />
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
          selectedStructureId={selectedStructure?.id}
          onStructurePick={handleStructurePick}
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
        <MeasurementOverlay measurements={measurements} draft={measureDraft} />
        <OrbitControls enableDamping enablePan={false} minDistance={2.35} maxDistance={9} />
      </Canvas>

        <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex flex-wrap gap-2 text-xs text-white/75">
          <span className="flex items-center gap-1 rounded-full bg-[#07130E]/80 px-2 py-1"><i className="h-2 w-2 rounded-full bg-[#6FBF73]" /> Leve</span>
          <span className="flex items-center gap-1 rounded-full bg-[#07130E]/80 px-2 py-1"><i className="h-2 w-2 rounded-full bg-[#D7B267]" /> Moderada</span>
          <span className="flex items-center gap-1 rounded-full bg-[#07130E]/80 px-2 py-1"><i className="h-2 w-2 rounded-full bg-[#D97C7C]" /> Grave</span>
        </div>
      </section>

      <aside className="rounded-md border border-white/10 bg-white/[0.04] p-3 text-xs text-white">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold">Ficha anatomica</div>
            <div className="mt-0.5 text-white/50">Estrutura selecionada</div>
          </div>
          <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-white/75">{visibleAnnotations.length} marc.</span>
        </div>
        <StructurePanel structure={selectedStructure} />

        <div className="mt-5 border-t border-white/10 pt-4">
          <div className="font-semibold">Medidas</div>
          <div className="mt-1 text-white/50">{measureDraft.length ? `${measureDraft.length} ponto(s) selecionado(s)` : "Nenhuma medida em andamento"}</div>
          <div className="mt-3 space-y-2">
            {measurements.length ? (
              measurements.slice(-4).map((measurement) => (
                <div key={measurement.id} className="rounded-md border border-white/10 bg-white/5 p-2">
                  <div className="font-semibold">{measurement.mode === "angle" ? "Angulo" : "Distancia"}</div>
                  <div className="mt-0.5 text-white/70">{measurement.value}</div>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-white/10 bg-white/5 p-2 text-white/55">
                Use Distancia ou Angulo e clique nos pontos do modelo.
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
