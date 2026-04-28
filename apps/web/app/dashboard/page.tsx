"use client";

import Link from "next/link";
import { Activity, BadgeCheck, Bell, Bone, PawPrint } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { api } from "../../lib/api";
import ThreeScene from "../components/ThreeScene";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/empty-state";
import { PageHeader } from "../../components/ui/page-header";
import { Skeleton } from "../../components/ui/skeleton";
import { StatCard } from "../../components/ui/stat-card";

export default function DashboardPage() {
  const today = new Date().toISOString().slice(0, 10);
  const { data: patients = [], isLoading, isError } = useQuery<any[]>({
    queryKey: ["patients"],
    queryFn: () => api.patients(),
  });
  const { data: dueReminders = [], isLoading: remindersLoading } = useQuery<any[]>({
    queryKey: ["reminders", today],
    queryFn: () => api.reminders({ dueBefore: today }),
  });

  const recentPatients = patients.slice(0, 5);
  const patientsWithWeight = patients.filter((patient: any) => patient.weight).length;

  return (
    <div className="clinical-container">
      <PageHeader
        eyebrow="Centro de comando"
        title="Dashboard hospitalar"
        description="Resumo operacional para triagem, diagnostico por imagem, pendencias clinicas, anotacoes anatomicas e fluxo multiespecie."
        actions={
          <Button asChild>
            <Link href="/patients">Cadastrar paciente</Link>
          </Button>
        }
      />

      {isError ? (
        <Alert className="mt-6 border-danger/35 bg-[#FFF6F6]">
          <AlertTitle>API indisponivel</AlertTitle>
          <AlertDescription>Nao foi possivel carregar os dados clinicos. Verifique se o backend esta rodando.</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-8 grid gap-4 md:grid-cols-4">
        <StatCard label="Pacientes cadastrados" value={isLoading ? "..." : patients.length} icon={<PawPrint className="h-5 w-5" />} helper="Base clinica ativa" />
        <StatCard label="Com biometria" value={isLoading ? "..." : patientsWithWeight} icon={<BadgeCheck className="h-5 w-5" />} helper="Peso informado no cadastro" />
        <StatCard label="Modulo anatomico" value="Online" icon={<Bone className="h-5 w-5" />} helper="3D pronto para anotacao" />
        <StatCard label="Pendencias hoje" value={remindersLoading ? "..." : dueReminders.length} icon={<Bell className="h-5 w-5" />} helper="Retornos, exames e vacinas" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Fila clinica recente</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Ultimos prontuarios disponiveis para atendimento.</p>
              </div>
              <Button asChild variant="secondary" size="sm">
                <Link href="/patients">Ver todos</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : recentPatients.length ? (
                <div className="space-y-3">
                  {recentPatients.map((patient: any) => (
                    <Link key={patient.id} href={`/patients/${patient.id}`} className="block rounded-md border border-border p-3 transition hover:bg-secondary-surface">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold">{patient.name}</div>
                          <div className="mt-1 text-sm text-muted-foreground">Prontuario: {patient.record_number || "-"}</div>
                        </div>
                        <Badge variant="success">Ativo</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Nenhum paciente cadastrado"
                  description="Cadastre o primeiro paciente para iniciar prontuario, exames e gemeo digital."
                  action={
                    <Button asChild>
                      <Link href="/patients">Cadastrar paciente</Link>
                    </Button>
                  }
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pendencias clinicas</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Retornos, vacinas, exames e tarefas vencidas ou para hoje.</p>
            </CardHeader>
            <CardContent>
              {remindersLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-14" />
                  <Skeleton className="h-14" />
                </div>
              ) : dueReminders.length ? (
                <div className="space-y-3">
                  {dueReminders.slice(0, 6).map((reminder: any) => (
                    <Link key={reminder.id} href={`/patients/${reminder.patient_id}`} className="block rounded-md border border-border p-3 transition hover:bg-secondary-surface">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">{reminder.title}</div>
                          <div className="mt-1 text-sm text-muted-foreground">{reminder.patient_name || `Paciente ${reminder.patient_id}`} | {reminder.due_date}</div>
                        </div>
                        <Badge variant={reminder.priority === "high" ? "danger" : "warning"}>{reminder.reminder_type}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState title="Nenhuma pendencia para hoje" description="Retornos e tarefas criados no prontuario aparecerao aqui." />
              )}
            </CardContent>
          </Card>
        </div>

        <section aria-label="Pre-visualizacao anatomica 3D">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Activity className="h-4 w-4" />
            Ambiente anatomico
          </div>
          <ThreeScene />
        </section>
      </div>
    </div>
  );
}
