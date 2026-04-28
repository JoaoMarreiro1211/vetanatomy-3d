"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { API_ORIGIN } from "../lib/api";

type DicomViewerProps = {
  fileUrl?: string | null;
};

function absoluteUrl(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_ORIGIN}${url}`;
}

export default function DicomViewer({ fileUrl }: DicomViewerProps) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState("Selecione um estudo com arquivo para visualizar.");
  const [contentType, setContentType] = useState("");
  const [contentTypeChecked, setContentTypeChecked] = useState(false);
  const resolvedUrl = useMemo(() => (fileUrl ? absoluteUrl(fileUrl) : ""), [fileUrl]);
  const hasImageExtension = /\.(png|jpe?g|webp)$/i.test(resolvedUrl);
  const isRegularImage = hasImageExtension || contentType.startsWith("image/");

  useEffect(() => {
    let active = true;
    setContentType("");
    setContentTypeChecked(false);
    setStatus(resolvedUrl ? "Verificando arquivo..." : "Selecione um estudo com arquivo para visualizar.");

    async function detectContentType() {
      if (!resolvedUrl || hasImageExtension) {
        if (active) setContentTypeChecked(true);
        return;
      }
      try {
        const response = await fetch(resolvedUrl, { method: "HEAD", mode: "cors" });
        if (!active) return;
        setContentType(response.headers.get("content-type") || "");
      } catch {
        if (active) setContentType("");
      } finally {
        if (active) setContentTypeChecked(true);
      }
    }

    detectContentType();
    return () => {
      active = false;
    };
  }, [hasImageExtension, resolvedUrl]);

  useEffect(() => {
    if (!resolvedUrl || isRegularImage || !contentTypeChecked || !elementRef.current) return;

    let active = true;
    let cornerstone: any;

    async function loadDicom() {
      try {
        setStatus("Carregando DICOM...");
        const cornerstoneModule = await import("cornerstone-core");
        const wadoModule = await import("cornerstone-wado-image-loader");
        const dicomParserModule = await import("dicom-parser");
        cornerstone = cornerstoneModule.default || cornerstoneModule;
        const wado = wadoModule.default || wadoModule;
        const dicomParser = dicomParserModule.default || dicomParserModule;

        wado.external.cornerstone = cornerstone;
        wado.external.dicomParser = dicomParser;
        wado.configure({ useWebWorkers: false });

        const element = elementRef.current;
        if (!element || !active) return;
        cornerstone.enable(element);
        const image = await cornerstone.loadImage(`wadouri:${resolvedUrl}`);
        if (!active) return;
        cornerstone.displayImage(element, image);
        setStatus("");
      } catch {
        setStatus("Nao foi possivel renderizar o DICOM. Confira se o arquivo e valido e acessivel.");
      }
    }

    loadDicom();

    return () => {
      active = false;
      if (cornerstone && elementRef.current) {
        try {
          cornerstone.disable(elementRef.current);
        } catch {
          // Ignore cleanup failures from partially initialized viewers.
        }
      }
    };
  }, [contentType, contentTypeChecked, isRegularImage, resolvedUrl]);

  if (!resolvedUrl) {
    return (
      <div className="grid min-h-80 place-items-center rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
        {status}
      </div>
    );
  }

  if (isRegularImage) {
    return (
      <div className="overflow-hidden rounded-md border border-slate-200 bg-slate-950">
        <img src={resolvedUrl} alt="Imagem diagnostica" className="max-h-[28rem] w-full object-contain" />
      </div>
    );
  }

  return (
    <div className="relative min-h-80 overflow-hidden rounded-md border border-slate-200 bg-black">
      <div ref={elementRef} className="h-[28rem] w-full" />
      {status ? (
        <div className="absolute inset-0 grid place-items-center bg-black/70 p-6 text-center text-sm text-white">
          {status}
        </div>
      ) : null}
    </div>
  );
}
