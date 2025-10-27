"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import N8nIcon from "@/components/icons/n8n";
import WhatsappIcon from "@/components/icons/whatsapp";
import FormIcon from "@/components/icons/form";
import OdooIcon from "@/components/icons/odoo";
import SapIcon from "@/components/icons/sap";
import DriveIcon from "@/components/icons/drive";
import { Box } from "lucide-react";

interface PluginRow {
  id: string;
  name: string;
  slug: string;
  href: string;
  description?: string | null;
  isActiveGlobal: boolean;
  isActiveUser: boolean;
  effectiveActive: boolean;
}

const iconMap: Record<string, any> = {
  n8n: N8nIcon,
  whatsapp: WhatsappIcon,
  odoo: OdooIcon,
  sap: SapIcon,
  drive: DriveIcon,
  forms: FormIcon,
};

export default function PluginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [plugins, setPlugins] = useState<PluginRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);

  async function loadPlugins() {
    try {
      setLoading(true);
      const res = await fetch("/api/plugins", { method: "GET" });
      const data = await res.json();
      setPlugins(data.plugins ?? []);
    } catch (err) {
      console.error("Failed to load plugins", err);
      toast({
        title: "Failed to load plugins",
        description: "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlugins();
  }, []);

  async function handleToggle(slug: string, nextChecked: boolean) {
    try {
      setSavingSlug(slug);
      // optimistic update
      setPlugins((prev) =>
        prev.map((p) =>
          p.slug === slug
            ? {
                ...p,
                isActiveUser: nextChecked,
                effectiveActive: p.isActiveGlobal && nextChecked,
              }
            : p
        )
      );

      const res = await fetch("/api/plugins", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, isActive: nextChecked }),
      });

      if (!res.ok) {
        throw new Error(`Toggle failed: ${res.status}`);
      }
      const data = await res.json();
      const updated = data.plugin as PluginRow;
      setPlugins((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
      );
      toast({
        title: "Plugin updated",
        description: `${updated.name} is now ${
          updated.isActiveUser ? "active" : "inactive"
        } for you.`,
      });
    } catch (err) {
      console.error(err);
      // revert load from server for correctness
      await loadPlugins();
      toast({
        title: "Update failed",
        description: "Could not toggle plugin. Please try again.",
      });
    } finally {
      setSavingSlug(null);
    }
  }

  return (
    <div className="flex h-screen">
      {/* Main content area */}
      <div className="bg-white min-h-screen flex-1">
        {/* Header */}
        <div className="border-b p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-20 flex items-center w-full">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-3">
              <div>
                <h1 className="font-semibold">Plugin</h1>
                <p className="text-sm text-muted-foreground">
                  Search or manage your plugins
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 relative h-[calc(100vh-80px)] overflow-auto">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* skeleton */}
              {Array(6)
                .fill(0)
                .map((_, index) => (
                  <Card key={index} className="animate-pulse bg-white">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-md bg-muted"></div>
                        <div>
                          <div className="h-4 bg-muted/50 w-24"></div>
                          <div className="h-3 bg-muted/50 w-16"></div>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-md bg-muted"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-4 bg-muted/50 w-full"></div>
                      <div className="h-4 bg-muted/50 w-full mt-2"></div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          ) : plugins.length === 0 ? (
            <div className="text-center text-muted-foreground">
              No plugins found
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {plugins.map((p) => {
                const IconComp = iconMap[p.slug];
                return (
                  <Card
                    key={p.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-md bg-muted">
                          {IconComp ? (
                            <IconComp size="2rem" />
                          ) : (
                            <Box className="w-8 h-8" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-base">{p.name}</CardTitle>
                          <CardDescription>{p.slug}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={p.isActiveUser}
                          onCheckedChange={(checked) =>
                            handleToggle(p.slug, checked)
                          }
                          disabled={savingSlug === p.slug}
                          aria-label={`Toggle ${p.name}`}
                        />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground">
                        {p.description ? (
                          <p className="line-clamp-3">{p.description}</p>
                        ) : (
                          <p className="italic">No description</p>
                        )}
                      </div>
                    </CardContent>
                    {/* <CardFooter className="flex justify-between">
                      <Button variant="ghost" className="text-primary" asChild>
                        <a href={p.href} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleToggle(p.slug, !p.isActiveUser)}
                        disabled={savingSlug === p.slug}
                      >
                        {p.isActiveUser ? "Deactivate" : "Activate"}
                      </Button>
                    </CardFooter> */}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
