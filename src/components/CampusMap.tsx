import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CAMPUS_BOUNDS, CAMPUS_CENTER, isLocated, type Monument } from "@/lib/monuments";
import { speciesByKey } from "@/lib/species";

export default function CampusMap({ monuments, selected, onSelect }: {
  monuments: Monument[]; selected: string; onSelect: (id: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const callback = useRef(onSelect);
  callback.current = onSelect;
  const [error, setError] = useState(false);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    async function mount() {
      const L = await import("leaflet");
      if (disposed || !host.current) return;
      const instance = L.map(host.current, { scrollWheelZoom: false, minZoom: 14, maxZoom: 20 })
        .setView(CAMPUS_CENTER, 17);
      map.current = instance;
      const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(instance);
      tiles.on("tileerror", () => setError(true));
      tiles.on("tileload", () => setError(false));
      instance.fitBounds(CAMPUS_BOUNDS, { padding: [12, 12] });
      for (const m of monuments.filter(isLocated)) {
        const species = speciesByKey[m.species];
        const node = document.createElement("div");
        node.className = `campus-marker ${m.id === selected ? "campus-marker-selected" : ""}`;
        const image = document.createElement("img");
        image.src = species.image;
        image.alt = species.name;
        node.append(image);
        const marker = L.marker([m.latitude, m.longitude], {
          title: `${m.label}: ${species.name}`,
          icon: L.divIcon({ html: node, className: "campus-marker-wrapper", iconSize: [48, 48], iconAnchor: [24, 48] }),
        }).addTo(instance);
        marker.on("click", () => callback.current(m.id));
      }
      const resize = new ResizeObserver(() => instance.invalidateSize());
      resize.observe(host.current);
      cleanup = () => { resize.disconnect(); instance.remove(); map.current = null; };
    }
    void mount().catch(() => setError(true));
    return () => { disposed = true; cleanup?.(); };
  }, [monuments, selected]);

  return (
    <div className="relative isolate overflow-hidden rounded-3xl border border-border">
      <div ref={host} className="h-[330px] w-full bg-muted md:h-[420px]" aria-label="Mapa interactivo de la Universidad Icesi" />
      <Button variant="secondary" size="icon" className="absolute bottom-8 right-3 z-[500]" aria-label="Centrar en Icesi" title="Centrar en Icesi" onClick={() => map.current?.fitBounds(CAMPUS_BOUNDS)}>
        <LocateFixed />
      </Button>
      {error && <p role="status" className="absolute left-3 right-16 top-3 z-[500] rounded-xl bg-card p-3 text-sm">No se pudo cargar el mapa. Revisa tu conexión.</p>}
    </div>
  );
}