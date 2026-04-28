"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  PawPrint,
  Search,
  Settings,
  Stethoscope,
  X,
} from "lucide-react";
import { ReactNode, useEffect, useState } from "react";

import { api } from "../../lib/api";
import { useAuthStore } from "../../lib/store/authStore";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Pacientes", icon: PawPrint },
  { href: "/patients", label: "Prontuarios", icon: ClipboardList },
  { href: "/patients", label: "Agenda clinica", icon: CalendarDays },
  { href: "/patients", label: "Internacao", icon: Stethoscope },
  { href: "/patients", label: "Alertas", icon: Bell },
  { href: "/patients", label: "Configuracoes", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const token = useAuthStore((state) => state.accessToken);
  const setTokens = useAuthStore((state) => state.setTokens);
  const logout = useAuthStore((state) => state.logout);
  const isLogin = pathname === "/login";

  useEffect(() => {
    let active = true;

    async function ensureSession() {
      if (isLogin) {
        if (token) router.replace("/dashboard");
        if (active) setCheckingAuth(false);
        return;
      }

      if (token) {
        if (pathname === "/") router.replace("/dashboard");
        if (active) setCheckingAuth(false);
        return;
      }

      try {
        const refreshed = await api.refresh();
        const access = refreshed.access_token || refreshed.access || null;
        if (!access) throw new Error("Missing access token");
        setTokens(access);
        if (pathname === "/") router.replace("/dashboard");
        if (active) setCheckingAuth(false);
      } catch {
        logout();
        const next = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
        router.replace(`/login${next}`);
        if (active) setCheckingAuth(false);
      }
    }

    ensureSession();
    return () => {
      active = false;
    };
  }, [isLogin, logout, pathname, router, setTokens, token]);

  async function handleLogout() {
    try {
      await api.logout();
    } catch {
      // Local logout should clear the UI state even if the API is offline.
    }
    logout();
    router.replace("/login");
  }

  if (checkingAuth) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
        <div>
          <div className="text-lg font-bold text-foreground">VetAnatomy 3D</div>
          <div className="mt-2 text-sm text-muted-foreground">Verificando acesso...</div>
        </div>
      </div>
    );
  }

  if (isLogin) {
    return <>{children}</>;
  }

  if (!token) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-center">
        <div>
          <div className="text-lg font-bold text-foreground">Acesso restrito</div>
          <div className="mt-2 text-sm text-muted-foreground">Redirecionando para o login...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-border bg-white/95 shadow-clinical backdrop-blur lg:block">
        <ShellNav pathname={pathname} />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button aria-label="Fechar menu" className="absolute inset-0 bg-foreground/35" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-80 max-w-[85vw] border-r border-border bg-white shadow-clinical">
            <div className="absolute right-3 top-3">
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Fechar navegacao">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <ShellNav pathname={pathname} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir navegacao">
              <Menu className="h-5 w-5" />
            </Button>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input aria-label="Busca global" placeholder="Buscar paciente, prontuario ou exame" className="h-10 pl-9" />
            </div>
            {token ? (
              <Button variant="secondary" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            ) : (
              <Button asChild>
                <Link href="/login">
                  <LogIn className="h-4 w-4" />
                  Entrar
                </Link>
              </Button>
            )}
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}

function ShellNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-3 border-b border-border px-6 py-5">
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-primary-soft text-[#2F7A3A]">
          <Activity className="h-6 w-6" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-base font-bold text-foreground">VetAnatomy 3D</span>
          <span className="text-xs font-medium text-muted-foreground">Hospital veterinario digital</span>
        </span>
      </Link>

      <nav aria-label="Navegacao principal" className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={`${item.label}-${item.href}`}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition",
                active ? "bg-primary-soft text-foreground" : "text-muted-foreground hover:bg-secondary-surface hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4 text-xs leading-5 text-muted-foreground">
        Sistema preparado para pequenos animais, grandes animais, aves e exóticos.
      </div>
    </div>
  );
}
