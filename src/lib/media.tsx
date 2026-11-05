import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export async function uploadMedia(file: File, folder: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Debes iniciar sesión");
  if (!file.type.startsWith("image/")) throw new Error("Solo se permiten imágenes");
  if (file.size > 10 * 1024 * 1024) throw new Error("La imagen supera 10 MB");
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${u.user.id}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
}

export function useMediaUrl(path?: string | null) {
  return useQuery({
    queryKey: ["media", path],
    enabled: !!path,
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("media").createSignedUrl(path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

export function MediaImage({ path, alt, className }: { path?: string | null; alt: string; className?: string }) {
  const { data } = useMediaUrl(path);
  if (!data) return <div className={cn("animate-pulse bg-muted", className)} />;
  return <img src={data} alt={alt} loading="lazy" className={className} />;
}

export function Avatar({ path, name, className }: { path?: string | null; name?: string | null; className?: string }) {
  const { data } = useMediaUrl(path);
  const initials = (name || "?").trim().slice(0, 2).toUpperCase();
  return (
    <div className={cn("grid shrink-0 place-items-center overflow-hidden rounded-full bg-violet font-display font-bold text-violet-foreground", className ?? "h-10 w-10 text-sm")}>
      {data ? <img src={data} alt={name ?? "avatar"} className="h-full w-full object-cover" /> : initials}
    </div>
  );
}
