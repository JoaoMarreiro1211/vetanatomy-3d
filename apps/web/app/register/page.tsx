"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { api } from "../../lib/api";
import { useAuthStore } from "../../lib/store/authStore";

type RegisterForm = {
  full_name: string;
  email: string;
  password: string;
};

export default function RegisterPage() {
  const [error, setError] = useState("");
  const { register, handleSubmit, formState } = useForm<RegisterForm>();
  const router = useRouter();
  const setTokens = useAuthStore((state) => state.setTokens);

  async function onSubmit(data: RegisterForm) {
    setError("");
    try {
      await api.register({ email: data.email, password: data.password, full_name: data.full_name });
      const res = await api.login(data.email, data.password);
      setTokens(res.access_token);
      router.push("/dashboard");
    } catch {
      setError("Nao foi possivel criar a conta. Verifique os dados informados.");
    }
  }

  return (
    <main className="mx-auto grid min-h-[calc(100vh-57px)] max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[1fr_30rem] lg:items-center">
      <section>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Nova equipe</p>
        <h1 className="mt-4 max-w-3xl text-5xl font-bold leading-tight text-slate-950">
          Comece com uma base clinica organizada desde o primeiro paciente.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
          O cadastro cria o acesso inicial para testar dashboard, pacientes e anotacoes anatomicas.
        </p>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold">Criar acesso</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Nome completo</span>
            <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5" required {...register("full_name")} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input type="email" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5" required {...register("email")} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Senha</span>
            <input type="password" minLength={8} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5" required {...register("password")} />
          </label>
          {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
          <button
            type="submit"
            disabled={formState.isSubmitting}
            className="w-full rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {formState.isSubmitting ? "Criando..." : "Criar conta"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-600">
          Ja tem conta?{" "}
          <Link href="/login" className="font-semibold text-cyan-700 hover:text-cyan-800">
            Entrar
          </Link>
        </p>
      </section>
    </main>
  );
}
