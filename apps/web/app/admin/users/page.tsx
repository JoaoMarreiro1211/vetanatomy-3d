"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, UserPlus, Users } from "lucide-react";
import { useForm } from "react-hook-form";

import { api } from "../../../lib/api";
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { EmptyState } from "../../../components/ui/empty-state";
import { Input } from "../../../components/ui/input";
import { PageHeader } from "../../../components/ui/page-header";
import { Skeleton } from "../../../components/ui/skeleton";
import { StatCard } from "../../../components/ui/stat-card";

type UserForm = {
  full_name: string;
  email: string;
  password: string;
  is_superuser: boolean;
};

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const form = useForm<UserForm>({
    defaultValues: { full_name: "", email: "", password: "", is_superuser: false },
  });

  const { data: users = [], isLoading, isError, error } = useQuery<any[]>({
    queryKey: ["users"],
    queryFn: () => api.users(),
  });

  const createUser = useMutation({
    mutationFn: (payload: UserForm) =>
      api.createUser({
        full_name: payload.full_name,
        email: payload.email,
        password: payload.password,
        is_superuser: payload.is_superuser,
      }),
    onSuccess: () => {
      form.reset({ full_name: "", email: "", password: "", is_superuser: false });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  const updateUser = useMutation({
    mutationFn: ({ userId, payload }: { userId: number; payload: any }) => api.updateUser(userId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const deactivateUser = useMutation({
    mutationFn: (userId: number) => api.deactivateUser(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  function editUser(user: any) {
    const fullName = window.prompt("Nome completo", user.full_name || "");
    if (fullName === null) return;
    const email = window.prompt("Email", user.email || "");
    if (email === null) return;
    const password = window.prompt("Nova senha temporaria (opcional)", "");
    updateUser.mutate({
      userId: user.id,
      payload: {
        full_name: fullName,
        email,
        ...(password ? { password } : {}),
      },
    });
  }

  const admins = users.filter((user: any) => user.is_superuser).length;
  const activeUsers = users.filter((user: any) => user.is_active).length;

  return (
    <div className="clinical-container">
      <PageHeader
        eyebrow="Administracao"
        title="Usuarios e acessos"
        description="Cadastro de contas para equipe veterinaria, administradores e apresentacao do sistema."
      />

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard label="Usuarios" value={isLoading ? "..." : users.length} icon={<Users className="h-5 w-5" />} helper="Contas cadastradas" />
        <StatCard label="Ativos" value={isLoading ? "..." : activeUsers} icon={<ShieldCheck className="h-5 w-5" />} helper="Liberados para acesso" />
        <StatCard label="Administradores" value={isLoading ? "..." : admins} icon={<UserPlus className="h-5 w-5" />} helper="Com permissao elevada" />
      </div>

      {isError ? (
        <Alert className="mt-6 border-danger/35 bg-[#FFF6F6]">
          <AlertTitle>Acesso administrativo necessario</AlertTitle>
          <AlertDescription>{error instanceof Error ? error.message : "Entre com uma conta administradora para gerenciar usuarios."}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Novo usuario</CardTitle>
            <p className="text-sm text-muted-foreground">Crie acessos para demonstracao, atendimento e administracao.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit((data) => createUser.mutate(data))} className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-foreground">Nome completo</span>
                <Input required {...form.register("full_name")} />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-foreground">Email</span>
                <Input type="email" required {...form.register("email")} />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-foreground">Senha temporaria</span>
                <Input type="password" minLength={8} required {...form.register("password")} />
              </label>
              <label className="flex items-center gap-3 rounded-md border border-border p-3 text-sm font-medium text-foreground">
                <input type="checkbox" className="h-4 w-4 accent-[#2F7A3A]" {...form.register("is_superuser")} />
                Administrador
              </label>
              {createUser.isError ? (
                <Alert className="border-danger/35 bg-[#FFF6F6]">
                  <AlertTitle>Usuario nao criado</AlertTitle>
                  <AlertDescription>Confira se o email ja existe e se sua conta tem permissao administrativa.</AlertDescription>
                </Alert>
              ) : null}
              {createUser.isSuccess ? (
                <Alert className="border-[#A6D6B1] bg-[#F2FBF4]">
                  <AlertTitle>Usuario criado</AlertTitle>
                  <AlertDescription>A conta ja pode acessar o sistema com a senha temporaria.</AlertDescription>
                </Alert>
              ) : null}
              <Button type="submit" className="w-full" disabled={createUser.isPending || isError}>
                {createUser.isPending ? "Criando..." : "Criar usuario"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Equipe cadastrada</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : users.length ? (
              <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
                {users.map((user: any) => (
                  <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 bg-white p-4">
                    <div>
                      <div className="font-semibold text-foreground">{user.full_name || "Sem nome"}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{user.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={user.is_active ? "success" : "warning"}>{user.is_active ? "Ativo" : "Inativo"}</Badge>
                      {user.is_superuser ? <Badge>Admin</Badge> : <Badge variant="muted">Equipe</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-2 sm:basis-full">
                      <Button type="button" variant="secondary" size="sm" onClick={() => editUser(user)}>
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => updateUser.mutate({ userId: user.id, payload: { is_superuser: !user.is_superuser } })}
                      >
                        {user.is_superuser ? "Remover admin" : "Tornar admin"}
                      </Button>
                      <Button
                        type="button"
                        variant={user.is_active ? "danger" : "secondary"}
                        size="sm"
                        onClick={() =>
                          user.is_active
                            ? deactivateUser.mutate(user.id)
                            : updateUser.mutate({ userId: user.id, payload: { is_active: true } })
                        }
                      >
                        {user.is_active ? "Excluir" : "Reativar"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Nenhum usuario listado" description="Usuarios criados pelo administrador aparecerao aqui." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
