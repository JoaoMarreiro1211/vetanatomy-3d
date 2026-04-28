"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, ArrowLeft, Bell, CheckCircle2, FileImage, HeartPulse, Printer, Stethoscope } from "lucide-react";
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
type Tab = "timeline" | "anatomy" | "imaging" | "plan";
type CareProtocol = {
  title: string;
  type: "follow_up" | "vaccine" | "imaging" | "medication" | "lab" | "procedure";
  days: number;
  priority: "normal" | "high";
  note: string;
};

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

const clinicalNoteSchema = z.object({
  title: z.string().trim().min(2, "Informe um titulo para a evolucao."),
  subjective: z.string().trim().optional(),
  objective: z.string().trim().optional(),
  assessment: z.string().trim().optional(),
  plan: z.string().trim().optional(),
  temperature_c: z.coerce.number().optional(),
  heart_rate_bpm: z.coerce.number().optional(),
  respiratory_rate_bpm: z.coerce.number().optional(),
  pain_score: z.coerce.number().min(0).max(10).optional(),
});

type AnnotationForm = z.infer<typeof annotationSchema>;
type ImagingForm = z.infer<typeof imagingSchema>;
type PlanForm = z.infer<typeof planSchema>;
type ClinicalNoteForm = z.infer<typeof clinicalNoteSchema>;

const severityLabel: Record<string, string> = {
  mild: "Leve",
  moderate: "Moderada",
  severe: "Grave",
};

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "timeline", label: "Timeline SOAP" },
  { id: "anatomy", label: "Anatomia 3D" },
  { id: "imaging", label: "Exames" },
  { id: "plan", label: "Plano cirurgico" },
];

const defaultCareProtocols: CareProtocol[] = [
  { title: "Retorno clinico", type: "follow_up", days: 7, priority: "normal", note: "Reavaliacao padrao criada pelo protocolo do prontuario." },
  { title: "Revisao de exame", type: "imaging", days: 3, priority: "high", note: "Conferir resultado, laudo e conduta associada." },
  { title: "Conferir medicacao", type: "medication", days: 1, priority: "normal", note: "Checar adesao, efeitos adversos e resposta clinica." },
];

const careProtocolsByGroup: Record<string, CareProtocol[]> = {
  small_animals: [
    { title: "Vacina ou reforco", type: "vaccine", days: 30, priority: "normal", note: "Revisar carteira vacinal e protocolo preventivo." },
    { title: "Controle de peso", type: "follow_up", days: 14, priority: "normal", note: "Acompanhar escore corporal, dieta e peso." },
    ...defaultCareProtocols,
  ],
  equine: [
    { title: "Reavaliacao locomotora", type: "follow_up", days: 7, priority: "high", note: "Reavaliar claudicacao, dor, edema e resposta ao repouso." },
    { title: "Imagem de tendao/articulacao", type: "imaging", days: 3, priority: "high", note: "Programar ultrassom ou radiografia de controle." },
    ...defaultCareProtocols,
  ],
  bovine: [
    { title: "Controle reprodutivo", type: "follow_up", days: 10, priority: "normal", note: "Revisar involucao uterina, producao e temperatura." },
    { title: "Manejo de lote", type: "procedure", days: 14, priority: "normal", note: "Registrar orientacao de manejo, dieta e sanidade." },
    ...defaultCareProtocols,
  ],
  small_ruminants: [
    { title: "Revisao digestiva", type: "follow_up", days: 5, priority: "normal", note: "Checar apetite, fezes, motilidade ruminal e hidratacao." },
    { title: "Manejo parasitario", type: "procedure", days: 21, priority: "normal", note: "Conferir escore, mucosas, fezes e calendario sanitario." },
    ...defaultCareProtocols,
  ],
  avian: [
    { title: "Reavaliacao respiratoria", type: "follow_up", days: 2, priority: "high", note: "Checar respiracao, apetite, peso e resposta ao manejo." },
    { title: "Controle de peso diario", type: "follow_up", days: 1, priority: "high", note: "Aves instaveis precisam de acompanhamento de peso proximo." },
    ...defaultCareProtocols,
  ],
  exotics: [
    { title: "Revisao de manejo ambiental", type: "follow_up", days: 7, priority: "normal", note: "Checar temperatura, umidade, dieta, substrato e enriquecimento." },
    { title: "Controle odontologico/nutricional", type: "procedure", days: 30, priority: "normal", note: "Aplicar quando especie e sinais clinicos indicarem." },
    ...defaultCareProtocols,
  ],
};

function protocolsForPatient(patient: any): CareProtocol[] {
  if (!patient?.species_group) return defaultCareProtocols;
  return careProtocolsByGroup[patient.species_group] || defaultCareProtocols;
}

export default function PatientPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const queryClient = useQueryClient();
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("timeline");
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
  const clinicalNoteForm = useForm<ClinicalNoteForm>({
    resolver: zodResolver(clinicalNoteSchema),
    defaultValues: {
      title: "Evolucao SOAP",
      subjective: "",
      objective: "",
      assessment: "",
      plan: "",
      temperature_c: undefined,
      heart_rate_bpm: undefined,
      respiratory_rate_bpm: undefined,
      pain_score: undefined,
    },
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
  const { data: clinicalNotes = [], isLoading: notesLoading } = useQuery<any[]>({
    queryKey: ["clinical-notes", id],
    queryFn: () => api.clinicalNotesByPatient(id),
  });
  const { data: reminders = [], isLoading: remindersLoading } = useQuery<any[]>({
    queryKey: ["reminders", id],
    queryFn: () => api.remindersByPatient(id),
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
  const careProtocols = useMemo(() => protocolsForPatient(patient), [patient?.species_group]);

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

  const createClinicalNote = useMutation({
    mutationFn: (formData: ClinicalNoteForm) =>
      api.createClinicalNote({
        patient_id: Number(id),
        note_type: "soap",
        title: formData.title,
        subjective: formData.subjective || "",
        objective: formData.objective || "",
        assessment: formData.assessment || "",
        plan: formData.plan || "",
        vitals: {
          temperature_c: formData.temperature_c || null,
          heart_rate_bpm: formData.heart_rate_bpm || null,
          respiratory_rate_bpm: formData.respiratory_rate_bpm || null,
          pain_score: formData.pain_score || null,
        },
        created_by: null,
      }),
    onSuccess: () => {
      clinicalNoteForm.reset({
        title: "Evolucao SOAP",
        subjective: "",
        objective: "",
        assessment: "",
        plan: "",
        temperature_c: undefined,
        heart_rate_bpm: undefined,
        respiratory_rate_bpm: undefined,
        pain_score: undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["clinical-notes", id] });
    },
  });

  const createReminder = useMutation({
    mutationFn: (payload: any) => api.createReminder(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reminders", id] }),
  });

  const completeReminder = useMutation({
    mutationFn: (reminderId: number) => api.updateReminder(reminderId, { is_done: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reminders", id] }),
  });

  function addQuickReminder(kind: "follow_up" | "vaccine" | "imaging" | "medication") {
    const days = kind === "follow_up" ? 7 : kind === "vaccine" ? 30 : kind === "imaging" ? 3 : 1;
    const due = new Date();
    due.setDate(due.getDate() + days);
    const titles = {
      follow_up: "Retorno clinico",
      vaccine: "Vacina ou reforco",
      imaging: "Revisao de exame",
      medication: "Conferir medicacao",
    };
    createReminder.mutate({
      patient_id: Number(id),
      title: titles[kind],
      reminder_type: kind,
      due_date: due.toISOString().slice(0, 10),
      priority: kind === "imaging" ? "high" : "normal",
      notes: "Criado por acao rapida no prontuario.",
    });
  }

  function addProtocolReminder(protocol: CareProtocol) {
    const due = new Date();
    due.setDate(due.getDate() + protocol.days);
    createReminder.mutate({
      patient_id: Number(id),
      title: protocol.title,
      reminder_type: protocol.type,
      due_date: due.toISOString().slice(0, 10),
      priority: protocol.priority,
      notes: protocol.note,
    });
  }

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

      <div className="mt-6 grid gap-4 md:grid-cols-5">
        <StatCard label="Evolucoes" value={notesLoading ? "..." : clinicalNotes.length} icon={<HeartPulse className="h-5 w-5" />} helper="SOAP e sinais vitais" />
        <StatCard label="Graves" value={severeCount} icon={<Activity className="h-5 w-5" />} helper="Prioridade clinica" />
        <StatCard label="Exames" value={studiesLoading ? "..." : studies.length} icon={<FileImage className="h-5 w-5" />} helper="Imagem e DICOM" />
        <StatCard label="Planos" value={plansLoading ? "..." : surgicalPlans.length} icon={<Stethoscope className="h-5 w-5" />} helper="Planejamento cirurgico" />
        <StatCard label="Pendencias" value={remindersLoading ? "..." : reminders.filter((item: any) => !item.is_done).length} icon={<Bell className="h-5 w-5" />} helper="Retornos e tarefas" />
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

          {activeTab === "timeline" ? (
            <div className="grid gap-5">
              <Card>
                <CardHeader>
                  <CardTitle>Nova evolucao SOAP</CardTitle>
                  <p className="text-sm text-muted-foreground">Registre subjetivo, objetivo, avaliacao, plano e sinais vitais em uma linha do tempo clinica.</p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={clinicalNoteForm.handleSubmit((data) => createClinicalNote.mutate(data))} className="grid gap-4">
                    <FormInput label="Titulo" registration={clinicalNoteForm.register("title")} error={clinicalNoteForm.formState.errors.title?.message} />
                    <div className="grid gap-4 md:grid-cols-2">
                      <SoapTextArea label="S - Subjetivo" registration={clinicalNoteForm.register("subjective")} />
                      <SoapTextArea label="O - Objetivo" registration={clinicalNoteForm.register("objective")} />
                      <SoapTextArea label="A - Avaliacao" registration={clinicalNoteForm.register("assessment")} />
                      <SoapTextArea label="P - Plano" registration={clinicalNoteForm.register("plan")} />
                    </div>
                    <div className="grid gap-3 md:grid-cols-4">
                      <FormInput label="Temp. C" registration={clinicalNoteForm.register("temperature_c")} />
                      <FormInput label="FC bpm" registration={clinicalNoteForm.register("heart_rate_bpm")} />
                      <FormInput label="FR rpm" registration={clinicalNoteForm.register("respiratory_rate_bpm")} />
                      <FormInput label="Dor 0-10" registration={clinicalNoteForm.register("pain_score")} error={clinicalNoteForm.formState.errors.pain_score?.message} />
                    </div>
                    {createClinicalNote.isError ? (
                      <Alert className="border-danger/35 bg-[#FFF6F6]">
                        <AlertTitle>Evolucao nao salva</AlertTitle>
                        <AlertDescription>Revise os campos e tente novamente.</AlertDescription>
                      </Alert>
                    ) : null}
                    <Button type="submit" disabled={createClinicalNote.isPending}>
                      {createClinicalNote.isPending ? "Salvando..." : "Salvar evolucao SOAP"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <RecordList title="Timeline clinica" loading={notesLoading} empty="Nenhuma evolucao registrada.">
                {clinicalNotes.map((note) => (
                  <ClinicalNoteCard key={note.id} note={note} />
                ))}
              </RecordList>
            </div>
          ) : null}

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

          <Card>
            <CardHeader>
              <CardTitle>Pendencias e retornos</CardTitle>
              <p className="text-sm text-muted-foreground">Crie tarefas avulsas ou use protocolos sugeridos para a especie.</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => addQuickReminder("follow_up")}>Retorno</Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => addQuickReminder("vaccine")}>Vacina</Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => addQuickReminder("imaging")}>Exame</Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => addQuickReminder("medication")}>Medicacao</Button>
              </div>
              <div className="mt-4 rounded-md border border-border bg-secondary-surface p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Protocolos sugeridos</div>
                <div className="grid gap-2">
                  {careProtocols.slice(0, 4).map((protocol) => (
                    <button
                      key={`${protocol.type}-${protocol.title}`}
                      type="button"
                      onClick={() => addProtocolReminder(protocol)}
                      className="rounded-md border border-border bg-white px-3 py-2 text-left text-sm transition hover:border-primary hover:bg-white"
                    >
                      <span className="block font-semibold text-foreground">{protocol.title}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">Vence em {protocol.days} dia{protocol.days === 1 ? "" : "s"} | {protocol.priority === "high" ? "alta prioridade" : "prioridade normal"}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 max-h-72 space-y-3 overflow-auto pr-1">
                {remindersLoading ? (
                  <>
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                  </>
                ) : reminders.length ? (
                  reminders.map((reminder: any) => (
                    <div key={reminder.id} className={`rounded-md border border-border p-3 ${reminder.is_done ? "bg-secondary-surface opacity-70" : "bg-white"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-foreground">{reminder.title}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{reminder.reminder_type} | {reminder.due_date}</div>
                        </div>
                        {!reminder.is_done ? (
                          <Button type="button" variant="ghost" size="icon" onClick={() => completeReminder.mutate(reminder.id)} aria-label="Concluir pendencia">
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                      {reminder.notes ? <p className="mt-2 text-sm text-muted-foreground">{reminder.notes}</p> : null}
                    </div>
                  ))
                ) : (
                  <EmptyState title="Sem pendencias" description="Acoes rapidas criam lembretes de acompanhamento." />
                )}
              </div>
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

function SoapTextArea({ label, registration }: { label: string; registration: any }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <textarea rows={4} className="mt-1 w-full rounded-md border border-border px-3 py-2.5 text-sm focus:border-primary-strong focus:outline-none focus:ring-4 focus:ring-primary/25" {...registration} />
    </label>
  );
}

function ClinicalNoteCard({ note }: { note: any }) {
  const vitals = note.vitals || {};
  const vitalItems = [
    vitals.temperature_c ? `${vitals.temperature_c} C` : null,
    vitals.heart_rate_bpm ? `FC ${vitals.heart_rate_bpm}` : null,
    vitals.respiratory_rate_bpm ? `FR ${vitals.respiratory_rate_bpm}` : null,
    vitals.pain_score || vitals.pain_score === 0 ? `Dor ${vitals.pain_score}/10` : null,
  ].filter(Boolean);

  return (
    <div className="rounded-md border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-foreground">{note.title}</div>
          <div className="mt-1 text-sm text-muted-foreground">{new Date(note.created_at).toLocaleString("pt-BR")}</div>
        </div>
        {vitalItems.length ? <Badge variant="muted">{vitalItems.join(" | ")}</Badge> : null}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <SoapBlock label="S" value={note.subjective} />
        <SoapBlock label="O" value={note.objective} />
        <SoapBlock label="A" value={note.assessment} />
        <SoapBlock label="P" value={note.plan} />
      </div>
    </div>
  );
}

function SoapBlock({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-md bg-secondary-surface p-3">
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <p className="mt-1 text-sm leading-6 text-foreground">{value || "-"}</p>
    </div>
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
