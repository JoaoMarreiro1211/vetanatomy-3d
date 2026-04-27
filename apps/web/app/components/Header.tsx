"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, LayoutDashboard, LogIn, LogOut, PawPrint } from "lucide-react";
import { api } from "../../lib/api";
import { useAuthStore } from "../../lib/store/authStore";

const navItems = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/patients", label: "Pacientes", Icon: PawPrint },
];

export default function Header() {
  const pathname = usePathname();
  const logout = useAuthStore((state) => state.logout);
  const token = useAuthStore((state) => state.accessToken);

  async function handleLogout() {
    try {
      await api.logout();
    } catch {
      // Local logout should still clear the session if the API is unavailable.
    }
    logout();
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-950 text-sm font-bold text-white">
              <Activity className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="hidden font-semibold tracking-wide text-slate-950 sm:inline">
              VetAnatomy 3D
            </span>
          </Link>
          <nav className="flex items-center gap-1 rounded-md bg-slate-100 p-1 text-sm text-slate-600">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.Icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded px-3 py-2 font-medium transition ${
                    active ? "bg-white text-slate-950 shadow-sm" : "hover:text-slate-950"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
        {token ? (
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <span className="flex items-center gap-2">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sair
            </span>
          </button>
        ) : (
          <Link
            href="/login"
            className="rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <span className="flex items-center gap-2">
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Entrar
            </span>
          </Link>
        )}
      </div>
    </header>
  );
}
