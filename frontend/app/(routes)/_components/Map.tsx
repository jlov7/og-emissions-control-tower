"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Map as MapLibreMap } from "maplibre-gl";

import type { EventRecord } from "../types";

interface Props {
  events: EventRecord[];
  selectedId: string | null;
  onSelect: (eventId: string) => void;
}

const severityColors: Record<string, string> = {
  HIGH: "#ef4444",
  MED: "#f97316",
  LOW: "#facc15",
};

export function Map({ events, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: [
              "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
              "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
              "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
          },
        ],
      },
      center: [-96.8, 30.5],
      zoom: 5,
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const geojson = {
      type: "FeatureCollection" as const,
      features: events.map((event) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [event.lon, event.lat],
        },
        properties: {
          id: event.id,
          severity: event.triage_bucket,
        },
      })),
    };

    const updateSource = () => {
      const source = map.getSource("events") as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData(geojson);
      }
    };

    const addLayers = () => {
      if (map.getSource("events")) {
        updateSource();
        return;
      }
      map.addSource("events", {
        type: "geojson",
        data: geojson,
      });
      map.addLayer({
        id: "event-circles",
        type: "circle",
        source: "events",
        paint: {
          "circle-radius": 10,
          "circle-color": [
            "match",
            ["get", "severity"],
            "HIGH",
            severityColors.HIGH,
            "MED",
            severityColors.MED,
            severityColors.LOW,
          ],
          "circle-opacity": 0.8,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#0f172a",
        },
      });
      map.addLayer({
        id: "event-highlight",
        type: "circle",
        source: "events",
        paint: {
          "circle-radius": 14,
          "circle-color": "rgba(255,255,255,0)",
          "circle-stroke-width": 3,
          "circle-stroke-color": "#1d4ed8",
        },
        filter: ["==", ["get", "id"], "__none__"],
      });

      map.on("click", "event-circles", (event) => {
        const feature = event.features?.[0];
        const id = feature?.properties?.id as string | undefined;
        if (id) {
          onSelect(id);
        }
      });

      map.on("mouseenter", "event-circles", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "event-circles", () => {
        map.getCanvas().style.cursor = "";
      });
    };

    if (!map.isStyleLoaded()) {
      map.once("load", addLayers);
    } else {
      addLayers();
      updateSource();
    }
  }, [events, onSelect]);

  // Highlight selection
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer("event-highlight")) {
      return;
    }
    map.setFilter("event-highlight", [
      "==",
      ["get", "id"],
      selectedId ?? "__none__",
    ]);

    if (selectedId) {
      const event = events.find((item) => item.id === selectedId);
      if (event) {
        map.easeTo({ center: [event.lon, event.lat], zoom: Math.max(map.getZoom(), 9) });
      }
    }
  }, [events, selectedId]);

  return <div ref={containerRef} className="h-full min-h-[520px] w-full overflow-hidden rounded-3xl" role="presentation" />;
}
