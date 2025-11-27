"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Loader2, LogOut } from "lucide-react";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const user = session?.user;

  const initial =
    user?.name?.charAt(0).toUpperCase() ??
    user?.email?.charAt(0).toUpperCase() ??
    "U";

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <PublicHeader />

      <main className="flex-1">
        <div className="container max-w-4xl mx-auto px-4 py-12">
          {status === "loading" ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
              <p className="text-muted-foreground">Cargando tu perfil…</p>
            </div>
          ) : status !== "authenticated" || !user ? (
            <Card className="max-w-lg mx-auto">
              <CardHeader>
                <CardTitle>Necesitas iniciar sesión</CardTitle>
                <CardDescription>
                  Inicia sesión para ver y administrar los detalles de tu cuenta.
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button asChild variant="outline">
                  <Link href="/">Ir al inicio</Link>
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card className="shadow-lg">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-2xl font-semibold bg-black text-white">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-2xl font-semibold">{user.name}</CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </Button>
              </CardHeader>

              <Separator />

              <CardContent className="space-y-6 py-6">
                <section className="space-y-2">
                  <h2 className="text-lg font-semibold text-foreground">Información básica</h2>
                  <p className="text-muted-foreground">
                    Gestiona tus datos personales y revisa la información asociada a tu
                    cuenta MuyTuna.
                  </p>
                </section>

                <section className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                      Nombre completo
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {user.name ?? "Sin nombre"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                      Correo electrónico
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground break-words">
                      {user.email ?? "No disponible"}
                    </p>
                  </div>
                </section>
              </CardContent>

              <CardFooter className="justify-end">
                <div className="text-xs text-muted-foreground">
                  ¿Necesitas ayuda? Escríbenos a
                  <a
                    href="mailto:soporte@muytuna.com"
                    className="ml-1 font-semibold text-yellow-500 hover:underline"
                  >
                    soporte@muytuna.com
                  </a>
                </div>
              </CardFooter>
            </Card>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
