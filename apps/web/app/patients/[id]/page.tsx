"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, ArrowLeft, ClipboardList, FileImage, Printer, Stethoscope } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import AnatomyViewer from "../../../components/AnatomyViewer";
import DicomViewer from "../../../components/DicomViewer";
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { EmptyState } from "../../../components/ui/empty-state";
import { Input } from "../../../components/ui/input";
import { PageHeader } from "../../../components/ui/page-header";
import { Skeleton } from "../../../components/ui/skeleton";
import { StatCard } from "../../../components/ui/stat-card";
import { api } from "../../../lib/api";

type Point = { x: number; y: number; z: number };
type Tab = "anatomy" | "imaging" | "plan";

const annotationSchema = z.object({
  type: z.string().trim().min(2, "Informe o tipo de achado."),
  severity: z.enum(["mild", "moderate", "severe"]),
  notes: z.string().trim().optional(),
});

const imagingSchema = z.object({
  study_uid: z.string().trim().optional(),
  description: z.string().trim().optional(),
  modality: z.string().trim().min(1, "Informe a modalidade."),
  series_uid: z.string().trim().optional(),
  series_description: z.string().trim().optional(),
  finding: z.string().trim().optional(),
});

const planSchema = z.object({
  structure: z.string().trim().min(2, "Informe a estrutura anatomica."),
  objective: z.string().trim().min(2, "Informe o objetivo."),
  risk: z.enum(["Baixo", "Moderado", "Alto"]),
  steps: z.string().trim().optional(),
});

type AnnotationForm = z.infer<typeof annotationSchema>;
type ImagingForm = z.infer<typeof imagingSchema>;
type PlanForm = z.infer<typeof planSchema>;

const severityLabel: Record<string, string> = {
  mild: "Leve",
  moderate: "Moderada",
  severe: "Grave",
};

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "anatomy", label: "Anatomia 3D" },
  { id: "imaging", label: "Exames" },
  { id: "plan", label: "Plano cirurgico" },
];

export default function PatientPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const queryClient = useQueryClient();
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("anatomy");
  const [diagnosticFile, setDiagnosticFile] = useState<File | null>(null);
  const [selectedStudyUrl, setSelectedStudyUrl] = useState<string | null>(null);

  const annotationForm = useForm<AnnotationForm>({
    resolver: zodResolver(annotationSchema),
    defaultValues: { type: "observacao", severity: "mild", notes: "" },
  });
  const imagingForm = useForm<ImagingForm>({
    resolver: zodResolver(imagingSchema),
    defaultValues: { study_uid: "", description: "", modality: "RX", series_uid: "", series_description: "", finding: "" },
  });
  const planForm = useForm<PlanForm>({
    resolver: zodResolver(planSchema),
    defaultValues: { structure: "", objective: "", risk: "Baixo", steps: "" },
  });

  const { data: patient, isLoading: patientLoading, isError: patientError } = useQuery<any>({
    queryKey: ["patient", id],
    queryFn: () => api.patient(id),
  });
  const { data: annotations = [], isLoading: annotationsLoading } = useQuery<any[]>({
    queryKey: ["annotations", id],
    queryFn: () => api.annotationsByPatient(id),
  });
  const { data: studies = [], isLoading: studiesLoading } = useQuery<any[]>({
    queryKey: ["imaging-studies", id],
    queryFn: () => api.imagingStudiesByPatient(id),
  });
  const { data: findings = [], isLoading: findingsLoading } = useQuery<any[]>({
    queryKey: ["imaging-findings", id],
    queryFn: () => api.imagingFindingsByPatient(id),
  });
  const { data: surgicalPlans = [], isLoading: plansLoading } = useQuery<any[]>({
    queryKey: ["surgical-plans", id],
    queryFn: () => api.surgicalPlansByPatient(id),
  });
  const { data: templates = [], isLoading: templatesLoading } = useQuery<any[]>({
    queryKey: ["anatomical-templates", patient?.species_id, patient?.species_group],
    queryFn: () => api.anatomicalTemplates({ speciesId: patient?.species_id || undefined, group: patient?.species_group || undefined }),
    enabled: Boolean(patient),
  });

  const severeCount = useMemo(
    () => annotations.filter((annotation) => annotation.severity === "severe").length,
    [annotations],
  );
  const activeTemplate = templates[0] || null;

  const createAnnotation = useMutation({
    mutationFn: (formData: AnnotationForm) =>
      api.createAnnotation({
        patient_id: Number(id),
        geometry: { type: "point", coordinates: selectedPoint },
        annotation_type: formData.type,
        severity: formData.severity,
        notes: formData.notes || "",
        created_by: null,
      }),
    onSuccess: () => {
      annotationForm.reset({ type: "observacao", severity: "mild", notes: "" });
      setSelectedPoint(null);
      queryClient.invalidateQueries({ queryKey: ["annotations", id] });
    },
  });

  const createImagingRecord = useMutation({
    mutationFn: async (formData: ImagingForm) => {
      let fileUrl: string | null = null;
      if (diagnosticFile) {
        const upload = new FormData();
        upload.set("file", diagnosticFile);
        upload.set("patient_id", id);
        upload.set("category", "dicom");
        const attachment = await api.uploadAttachment(upload);
        fileUrl = attachment.url;
      }

      const study = await api.createImagingStudy({
        patient_id: Number(id),
        study_uid: formData.study_uid || `study-${id}-${Date.now()}`,
        description: formData.description || null,
        modality: formData.modality || null,
        file_url: fileUrl,
      });
      const series = await api.createImagingSeries({
        study_id: study.id,
        series_uid: formData.series_uid || `series-${id}-${Date.now()}`,
        description: formData.series_description || null,
      });
      if (formData.finding) {
        await api.createImagingFinding({
          series_id: series.id,
          findings: { summary: formData.finding },
        });
      }
      return study;
    },
    onSuccess: () => {
      imagingForm.reset({ study_uid: "", description: "", modality: "RX", series_uid: "", series_description: "", finding: "" });
      setDiagnosticFile(null);
      queryClient.invalidateQueries({ queryKey: ["imaging-studies", id] });
      queryClient.invalidateQueries({ queryKey: ["imaging-findings", id] });
    },
  });

  const createSurgicalPlan = useMutation({
    mutationFn: (formData: PlanForm) =>
      api.createSurgicalPlan({
        patient_id: Number(id),
        structure: formData.structure,
        plan: {
          objective: formData.objective,
          risk: formData.risk,
          steps: formData.steps || "",
        },
        created_by: null,
      }),
    onSuccess: () => {
      planForm.reset({ structure: "", objective: "", risk: "Baixo", steps: "" });
      queryClient.invalidateQueries({ queryKey: ["surgical-plans", id] });
    },
  });

  if (patientError) {
    return (
      <div className="clinical-container">
        <Alert className="border-danger/35 bg-[#FFF6F6]">
          <AlertTitle>Paciente nao encontrado</AlertTitle>
          <AlertDescription>Confira se a API esta disponivel ou volte para a lista de pacientes.</AlertDescription>
        </Alert>
        <Button asChild className="mt-4">
          <Link href="/patients">Voltar para pacientes</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="clinical-container">
      <PageHeader
        eyebrow="Prontuario veterinario"
        title={patientLoading ? "Carregando paciente..." : patient?.name || "Paciente"}
        description={`Registro ${patient?.record_number || "-"} | ${patient?.species_name || "Especie pendente"} | ${patient?.species_group_label || "Grupo nao definido"}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Exportar PDF
            </Button>
            <Button asChild variant="secondary">
              <Link href="/patients">
                <ArrowLeft className="h-4 w-4" />
                Pacientes
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <StatCard label="Anotacoes" value={annotationsLoading ? "..." : annotations.length} icon={<ClipboardList className="h-5 w-5" />} helper="Achados no modelo 3D" />
        <StatCard label="Graves" value={severeCount} icon={<Activity className="h-5 w-5" />} helper="Prioridade clinica" />
        <StatCard label="Exames" value={studiesLoading ? "..." : studies.length} icon={<FileImage className="h-5 w-5" />} helper="Imagem e DICOM" />
        <StatCard label="Planos" value={plansLoading ? "..." : surgicalPlans.length} icon={<Stethoscope className="h-5 w-5" />} helper="Planejamento cirurgico" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap gap-2 rounded-md border border-border bg-secondary-surface p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-primary/25 ${
                  activeTab === tab.id ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "anatomy" ? (
            <div className="grid gap-4">
              {templatesLoading ? <Skeleton className="h-12" /> : null}
              <AnatomyViewer
                onPick={setSelectedPoint}
                annotations={annotations}
                selectedPoint={selectedPoint}
                template={activeTemplate}
                patientLabel={`${patient?.species_name || "Paciente"} | ${patient?.species_group_label || "Template generico"}`}
              />
            </div>
          ) : null}

          {activeTab === "imaging" ? (
            <div className="grid gap-5">
              <Card>
                <CardHeader>
                  <CardTitle>Imagem diagnostica</CardTitle>
                  <p className="text-sm text-muted-foreground">Associe RX, imagem ou DICOM ao paciente e registre achados.</p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={imagingForm.handleSubmit((data) => createImagingRecord.mutate(data))} className="grid gap-4 md:grid-cols-2">
                    <FormInput label="UID do estudo" placeholder="auto se vazio" registration={imagingForm.register("study_uid")} />
                    <FormInput label="Modalidade" registration={imagingForm.register("modality")} error={imagingForm.formState.errors.modality?.message} />
                    <FormInput label="Descricao do estudo" registration={imagingForm.register("description")} />
                    <FormInput label="UID da serie" placeholder="auto se vazio" registration={imagingForm.register("series_uid")} />
                    <label className="block md:col-span-2">
                      <span className="text-sm font-medium text-foreground">Achado radiologico</span>
                      <textarea rows={3} className="mt-1 w-full rounded-md border border-border px-3 py-2.5 text-sm focus:border-primary-strong focus:outline-none focus:ring-4 focus:ring-primary/25" {...imagingForm.register("finding")} />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-foreground">Arquivo DICOM ou imagem</span>
                      <input
                        type="file"
                        accept=".dcm,application/dicom,application/octet-stream,image/png,image/jpeg,image/webp"
                        onChange={(event) => setDiagnosticFile(event.target.files?.[0] || null)}
                        className="mt-1 w-full rounded-md border border-border px-3 py-2.5 text-sm focus:border-primary-strong focus:outline-none focus:ring-4 focus:ring-primary/25"
                      />
                    </label>
                    <FormInput label="Descricao da serie" registration={imagingForm.register("series_description")} />
                    {createImagingRecord.isError ? (
                      <Alert className="md:col-span-2 border-danger/35 bg-[#FFF6F6]">
                        <AlertTitle>Exame nao salvo</AlertTitle>
                        <AlertDescription>Confira o arquivo, a serie e tente novamente.</AlertDescription>
                      </Alert>
                    ) : null}
                    <Button type="submit" disabled={createImagingRecord.isPending} className="md:col-span-2">
                      {createImagingRecord.isPending ? "Salvando..." : "Salvar exame"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
              <DicomViewer fileUrl={selectedStudyUrl || studies.find((study) => study.file_url)?.file_url} />
              <div className="grid gap-4 md:grid-cols-2">
                <RecordList title="Estudos" loading={studiesLoading} empty="Nenhum estudo registrado.">
                  {studies.map((study) => (
                    <Record
                      key={study.id}
                      title={study.description || study.study_uid}
                      meta={`${study.modality || "Sem modalidade"} | ${study.study_uid}`}
                      action={study.file_url ? () => setSelectedStudyUrl(study.file_url) : undefined}
                    />
                  ))}
                </RecordList>
                <RecordList title="Achados" loading={findingsLoading} empty="Nenhum achado registrado.">
                  {findings.map((finding) => (
                    <Record key={finding.id} title={finding.findings?.summary || "Achado sem resumo"} meta={`Serie ${finding.series_id}`} />
                  ))}
                </RecordList>
              </div>
            </div>
          ) : null}

          {activeTab === "plan" ? (
            <div className="grid gap-5">
              <Card>
                <CardHeader>
                  <CardTitle>Plano cirurgico</CardTitle>
                  <p className="text-sm text-muted-foreground">Registre objetivo, risco e conduta vinculados a estrutura anatomica.</p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={planForm.handleSubmit((data) => createSurgicalPlan.mutate(data))} className="grid gap-4 md:grid-cols-2">
                    <FormInput label="Estrutura anatomica" registration={planForm.register("structure")} error={planForm.formState.errors.structure?.message} />
                    <label className="block">
                      <span className="text-sm font-medium text-foreground">Risco</span>
                      <select className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm focus:border-primary-strong focus:outline-none focus:ring-4 focus:ring-primary/25" {...planForm.register("risk")}>
                        <option>Baixo</option>
                        <option>Moderado</option>
                        <option>Alto</option>
                      </select>
                    </label>
                    <FormInput label="Objetivo" registration={planForm.register("objective")} error={planForm.formState.errors.objective?.message} />
                    <label className="block">
                      <span className="text-sm font-medium text-foreground">Conduta</span>
                      <textarea rows={3} className="mt-1 w-full rounded-md border border-border px-3 py-2.5 text-sm focus:border-primary-strong focus:outline-none focus:ring-4 focus:ring-primary/25" {...planForm.register("steps")} />
                    </label>
                    {createSurgicalPlan.isError ? (
                      <Alert className="md:col-span-2 border-danger/35 bg-[#FFF6F6]">
                        <AlertTitle>Plano nao salvo</AlertTitle>
                        <AlertDescription>Revise os dados obrigatorios e tente novamente.</AlertDescription>
                      </Alert>
                    ) : null}
                    <Button type="submit" disabled={createSurgicalPlan.isPending} className="md:col-span-2">
                      {createSurgicalPlan.isPending ? "Salvando..." : "Salvar plano"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
              <RecordList title="Planos registrados" loading={plansLoading} empty="Nenhum plano cirurgico registrado.">
                {surgicalPlans.map((plan) => (
                  <Record
                    key={plan.id}
                    title={plan.structure || "Plano sem estrutura"}
                    meta={`${plan.plan?.risk || "Sem risco"} | ${plan.plan?.objective || "Sem objetivo"}`}
                    detail={plan.plan?.steps}
                  />
                ))}
              </RecordList>
            </div>
          ) : null}
        </section>

        <aside className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Adicionar anotacao</CardTitle>
              <p className="text-sm text-muted-foreground">Selecione um ponto no modelo 3D e registre o achado clinico.</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={annotationForm.handleSubmit((data) => createAnnotation.mutate(data))} className="space-y-4">
                <FormInput label="Tipo" registration={annotationForm.register("type")} error={annotationForm.formState.errors.type?.message} />
                <label className="block">
                  <span className="text-sm font-medium text-foreground">Severidade</span>
                  <select className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm focus:border-primary-strong focus:outline-none focus:ring-4 focus:ring-primary/25" {...annotationForm.register("severity")}>
                    <option value="mild">Leve</option>
                    <option value="moderate">Moderada</option>
                    <option value="severe">Grave</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-foreground">Notas</span>
                  <textarea rows={4} className="mt-1 w-full rounded-md border border-border px-3 py-2.5 text-sm focus:border-primary-strong focus:outline-none focus:ring-4 focus:ring-primary/25" {...annotationForm.register("notes")} />
                </label>
                <div className="rounded-md border border-border bg-secondary-surface p-3 text-xs text-muted-foreground">
                  Ponto: {selectedPoint ? `${selectedPoint.x}, ${selectedPoint.y}, ${selectedPoint.z}` : "clique no modelo 3D"}
                </div>
                {createAnnotation.isError ? (
                  <Alert className="border-danger/35 bg-[#FFF6F6]">
                    <AlertTitle>Anotacao nao salva</AlertTitle>
                    <AlertDescription>Selecione um ponto anatomico e tente novamente.</AlertDescription>
                  </Alert>
                ) : null}
                <Button type="submit" disabled={createAnnotation.isPending || !selectedPoint} className="w-full">
                  {createAnnotation.isPending ? "Salvando..." : "Salvar anotacao"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <RecordList title="Historico anatomico" loading={annotationsLoading} empty="Nenhuma anotacao registrada.">
            {annotations.map((annotation) => (
              <Record
                key={annotation.id}
                title={annotation.annotation_type}
                meta={severityLabel[annotation.severity] || "Sem nivel"}
                detail={annotation.notes}
              />
            ))}
          </RecordList>
        </aside>
      </div>
    </div>
  );
}

function FormInput({ label, registration, placeholder, error }: { label: string; registration: any; placeholder?: string; error?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <Input placeholder={placeholder} aria-invalid={Boolean(error)} {...registration} />
      {error ? <span className="mt-1 block text-sm text-danger">{error}</span> : null}
    </label>
  );
}

function RecordList({ title, loading, empty, children }: { title: string; loading: boolean; empty: string; children: React.ReactNode }) {
  const hasChildren = React.Children.count(children) > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[28rem] space-y-3 overflow-auto pr-1">
          {loading ? (
            <>
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </>
          ) : hasChildren ? (
            children
          ) : (
            <EmptyState title={empty} description="Quando houver registros, eles aparecerao aqui com contexto clinico e acoes rapidas." />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Record({ title, meta, detail, action }: { title: string; meta?: string; detail?: string; action?: () => void }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="font-semibold text-foreground">{title}</div>
        {action ? (
          <Button type="button" variant="ghost" size="sm" onClick={action}>
            Visualizar
          </Button>
        ) : null}
      </div>
      {meta ? <div className="mt-1 text-sm text-muted-foreground">{meta}</div> : null}
      {detail ? <p className="mt-2 text-sm leading-6 text-foreground">{detail}</p> : null}
    </div>
  );
}
