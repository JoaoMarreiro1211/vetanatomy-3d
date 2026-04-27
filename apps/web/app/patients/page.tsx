"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Search } from "lucide-react";
import { z } from "zod";

import { api } from "../../lib/api";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { EmptyState } from "../../components/ui/empty-state";
import { Input } from "../../components/ui/input";
import { PageHeader } from "../../components/ui/page-header";
import { Skeleton } from "../../components/ui/skeleton";

type SpeciesGroup = {
  id: number;
  code: string;
  name: string;
};

type Species = {
  id: number;
  name: string;
  common_name?: string | null;
  group?: SpeciesGroup | null;
};

type Patient = {
  id: number;
  name: string;
  record_number?: string | null;
  sex?: string | null;
  weight?: number | null;
  species_id?: number | null;
  species_name?: string | null;
  species_group?: string | null;
  species_group_label?: string | null;
};

const patientSchema = z.object({
  name: z.string().trim().min(2, "Informe ao menos 2 caracteres."),
  record_number: z.string().trim().optional(),
  sex: z.string().optional(),
  weight: z.string().optional(),
  species_id: z.string().optional(),
});

type PatientForm = z.infer<typeof patientSchema>;

export default function PatientsPage() {
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PatientForm>({ resolver: zodResolver(patientSchema) });

  const { data: speciesGroups = [] } = useQuery<SpeciesGroup[]>({
    queryKey: ["species-groups"],
    queryFn: api.speciesGroups,
  });
  const { data: species = [] } = useQuery<Species[]>({
    queryKey: ["species", groupFilter],
    queryFn: () => api.species(groupFilter || undefined),
  });
  const { data: patients = [], isLoading, isError } = useQuery<Patient[]>({
    queryKey: ["patients", search, groupFilter],
    queryFn: () => api.patients({ search: search.trim() || undefined, group: groupFilter || undefined }),
  });

  const speciesById = useMemo(() => new Map(species.map((item) => [item.id, item])), [species]);

  const createPatient = useMutation({
    mutationFn: (data: PatientForm) =>
      api.createPatient({
        name: data.name.trim(),
        record_number: data.record_number?.trim() || null,
        sex: data.sex || null,
        weight: data.weight ? Number(data.weight) : null,
        species_id: data.species_id ? Number(data.species_id) : null,
        breed_id: null,
        birth_date: null,
        owner_id: null,
      }),
    onSuccess: () => {
      reset();
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });

  const groupSummary = groupFilter ? speciesGroups.find((group) => group.code === groupFilter)?.name : "Todos os grupos";

  return (
    <div className="clinical-container grid gap-6 xl:grid-cols-[1fr_26rem]">
      <section>
        <PageHeader
          eyebrow="Base clinica multiespecie"
          title="Pacientes"
          description="Triagem, busca e abertura rapida de prontuarios para pequenos animais, grandes animais, aves e exoticos."
          actions={<Badge variant="muted">{patients.length} registros</Badge>}
        />

        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_16rem]">
              <label className="block">
                <span className="text-sm font-medium text-foreground">Buscar paciente</span>
                <div className="relative mt-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome ou prontuario" className="pl-9" />
                </div>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-foreground">Grupo</span>
                <select
                  value={groupFilter}
                  onChange={(event) => setGroupFilter(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-foreground shadow-sm focus:border-primary-strong focus:outline-none focus:ring-4 focus:ring-primary/25"
                >
                  <option value="">Todos os grupos</option>
                  {speciesGroups.map((group) => (
                    <option key={group.code} value={group.code}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </CardContent>
        </Card>

        {isError ? (
          <Alert className="mt-4 border-danger/35 bg-[#FFF6F6]">
            <AlertTitle>Falha ao carregar pacientes</AlertTitle>
            <AlertDescription>Confira a conexao com a API e tente novamente.</AlertDescription>
          </Alert>
        ) : null}

        <Card className="mt-4 overflow-hidden">
          {isLoading ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : patients.length ? (
            <div className="divide-y divide-border">
              {patients.map((patient) => {
                const selectedSpecies = patient.species_id ? speciesById.get(patient.species_id) : undefined;
                return (
                  <Link key={patient.id} href={`/patients/${patient.id}`} className="grid gap-3 p-4 transition hover:bg-secondary-surface sm:grid-cols-[1fr_auto] sm:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-semibold">{patient.name}</div>
                        <Badge variant="success">Em acompanhamento</Badge>
                        <Badge variant="muted">{patient.species_group_label || selectedSpecies?.group?.name || "Especie pendente"}</Badge>
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Prontuario: {patient.record_number || "-"} | Especie: {patient.species_name || selectedSpecies?.common_name || "-"} | Peso: {patient.weight || "-"} kg
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-[#3D7B51]">Abrir prontuario</span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="p-5">
              <EmptyState title="Nenhum paciente encontrado" description="Ajuste a busca, remova filtros ou cadastre um novo paciente." />
            </div>
          )}
        </Card>
      </section>

      <aside className="h-fit">
        <Card>
          <CardHeader>
            <CardTitle>Novo paciente</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              Registro minimo para iniciar o prontuario. O filtro atual esta em: <span className="font-medium text-foreground">{groupSummary}</span>.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit((data) => createPatient.mutate(data))} className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-foreground">Nome</span>
                <Input aria-invalid={Boolean(errors.name)} {...register("name")} />
                {errors.name ? <span className="mt-1 block text-sm text-danger">{errors.name.message}</span> : null}
              </label>
              <label className="block">
                <span className="text-sm font-medium text-foreground">Prontuario</span>
                <Input {...register("record_number")} />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-foreground">Especie</span>
                <select
                  className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-foreground shadow-sm focus:border-primary-strong focus:outline-none focus:ring-4 focus:ring-primary/25"
                  {...register("species_id")}
                >
                  <option value="">Selecionar depois</option>
                  {species.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.common_name || item.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-foreground">Sexo</span>
                  <select className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-foreground shadow-sm focus:border-primary-strong focus:outline-none focus:ring-4 focus:ring-primary/25" {...register("sex")}>
                    <option value="">-</option>
                    <option value="Femea">Femea</option>
                    <option value="Macho">Macho</option>
                    <option value="Indefinido">Indefinido</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-foreground">Peso kg</span>
                  <Input type="number" step="0.1" min="0" {...register("weight")} />
                </label>
              </div>
              {createPatient.isError ? (
                <Alert className="border-danger/35 bg-[#FFF6F6]">
                  <AlertTitle>Cadastro nao concluido</AlertTitle>
                  <AlertDescription>Verifique os dados, a especie selecionada e tente novamente.</AlertDescription>
                </Alert>
              ) : null}
              <Button type="submit" disabled={createPatient.isPending} className="w-full">
                {createPatient.isPending ? "Salvando..." : "Cadastrar paciente"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
