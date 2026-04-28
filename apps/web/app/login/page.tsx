"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { api } from "../../lib/api";
import { useAuthStore } from "../../lib/store/authStore";

type LoginForm = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const [error, setError] = useState("");
  const { register, handleSubmit, formState } = useForm<LoginForm>();
  const setTokens = useAuthStore((state) => state.setTokens);
  const router = useRouter();
  const searchParams = useSearchParams();

  async function onSubmit(data: LoginForm) {
    setError("");
    try {
      const res = await api.login(data.email, data.password);
      setTokens(res.access_token);
      router.push(searchParams.get("next") || "/dashboard");
    } catch {
      setError("Nao foi possivel entrar. Confira email e senha.");
    }
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[1fr_28rem] lg:items-center">
      <section>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">Acesso clinico</p>
        <h1 className="mt-4 max-w-3xl text-5xl font-bold leading-tight text-slate-950">
          Controle hospitalar e anatomia 3D no mesmo prontuario.
        </h1>
        <div className="mt-8 grid max-w-3xl gap-4 sm:grid-cols-3">
          {["Prontuario digital", "Anotacoes 3D", "Planejamento"].map((item) => (
            <div key={item} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">{item}</div>
              <div className="mt-2 h-1.5 w-12 rounded-full bg-cyan-600" />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold">Entrar</h2>
        <p className="mt-2 text-sm text-slate-600">Acesse o painel da equipe veterinaria.</p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              autoComplete="email"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5"
              required
              {...register("email")}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Senha</span>
            <input
              type="password"
              autoComplete="current-password"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2.5"
              required
              {...register("password")}
            />
          </label>
          {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
          <button
            type="submit"
            disabled={formState.isSubmitting}
            className="w-full rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {formState.isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-600">Acesso restrito a equipe autorizada.</p>
      </section>
    </main>
  );
}
