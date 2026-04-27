"use client";

import AnatomyViewer from "../../components/AnatomyViewer";

export default function ThreeScene() {
  return (
    <AnatomyViewer
      annotations={[
        {
          id: "demo-heart",
          annotation_type: "Torax",
          severity: "moderate",
          geometry: { coordinates: { x: 0.45, y: 0.22, z: 0.38 } },
        },
      ]}
      onPick={() => undefined}
    />
  );
}
