
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// Avatares predeterminados
// Si tus archivos tienen otra extensión, ajusta estos imports.
import ardillaImg from "@/assets/ardilla.jpg";
import guatinImg from "@/assets/guatin.jpg";
import iguanaImg from "@/assets/iguana.jpg";
import patoImg from "@/assets/pato.jpg";

export const PRESET_AVATARS = {
  ardilla: { label: "Ardilla", src: ardillaImg },
  guatin: { label: "Guatín", src: guatinImg },
  iguana: { label: "Iguana", src: iguanaImg },
  pato: { label: "Pato", src: patoImg },
} as const;

export async function uploadMedia(file: File, folder: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Debes iniciar sesión");
  if (!file.type.startsWith("image/")) throw new Error("Solo se permiten imágenes");
  if (file.size > 10 * 1024 * 1024) throw new Error("La imagen supera 10 MB");

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${u.user.id}/${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("media")
    .upload(path, file, { contentType: file.type });

  if (error) throw error;
  return path;
}

export function useMediaUrl(path?: string | null) {
  const isPreset = path?.startsWith("preset:") ?? false;

  return useQuery({
    queryKey: ["media", path],
    enabled: !!path && !isPreset,
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("media")
        .createSignedUrl(path!, 3600);

      if (error) throw error;
      return data.signedUrl;
    },
  });
}

export function MediaImage({
  path,
  alt,
  className,
}: {
  path?: string | null | undefined;
  alt: string;
  className?: string | undefined;
}) {
  const { data } = useMediaUrl(path);

  if (!data) {
    return <div className={cn("animate-pulse bg-muted", className)} />;
  }

  return <img src={data} alt={alt} loading="lazy" className={className} />;
}

export function Avatar({
  path,
  name,
  className,
}: {
  path?: string | null | undefined;
  name?: string | null | undefined;
  className?: string | undefined;
}) {
  const { data } = useMediaUrl(path);

  const presetKey = path?.startsWith("preset:")
    ? path.slice(7) as keyof typeof PRESET_AVATARS
    : null;

  const presetImage = presetKey
    ? PRESET_AVATARS[presetKey]?.src
    : undefined;

  const initials = (name || "?").trim().slice(0, 2).toUpperCase();

  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-violet font-display font-bold text-violet-foreground",
        className ?? "h-10 w-10 text-sm"
      )}
    >
      {presetImage ? (
        <img
          src={presetImage}
          alt={PRESET_AVATARS[presetKey!].label}
          className="h-full w-full object-cover"
        />
      ) : data ? (
        <img
          src={data}
          alt={name ?? "avatar"}
          className="h-full w-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  );
}
