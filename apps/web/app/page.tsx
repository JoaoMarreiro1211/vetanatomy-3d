import Link from "next/link";
import ThreeScene from "./components/ThreeScene";

const capabilities = [
  { title: "Prontuario unico", detail: "Dados clinicos, historico anatomico e acompanhamento em uma tela." },
  { title: "Gemeo digital 3D", detail: "Clique no modelo para registrar pontos, severidade e observacoes." },
  { title: "Rotina hospitalar", detail: "Dashboard, fila de pacientes e base para imagem e planejamento cirurgico." },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <section className="grid min-h-[calc(100vh-105px)] gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
            Hospital veterinario digital
          </p>
          <h1 className="mt-4 text-5xl font-bold leading-tight text-slate-950 lg:text-6xl">
            VetAnatomy 3D
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Plataforma para transformar prontuarios veterinarios em uma experiencia visual, rapida e segura para a equipe clinica.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/dashboard" className="rounded-md bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              Abrir dashboard
            </Link>
            <Link href="/patients" className="rounded-md border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
              Gerenciar pacientes
            </Link>
          </div>
        </div>
        <div className="min-h-[30rem]">
          <ThreeScene />
        </div>
      </section>

      <section className="grid gap-4 pb-10 md:grid-cols-3">
        {capabilities.map((item) => (
          <article key={item.title} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-950">{item.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{item.detail}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
