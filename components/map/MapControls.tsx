"use client";

import { LayerName, LayerToggleState } from "@/lib/types";
import { Layers, AlertTriangle, Utensils, Zap, ArrowRight, Users, Flame } from "lucide-react";

interface MapControlsProps {
  layerToggles: LayerToggleState;
  onToggle: (layer: LayerName) => void;
}

const LAYERS: Array<{
  name: LayerName;
  label: string;
  icon: React.ReactNode;
  color: string;
  defaultOn: boolean;
}> = [
  { name: "choropleth", label: "Impact", icon: <Layers size={18} />, color: "#22c55e", defaultOn: true },
  { name: "heatmap", label: "Heatmap", icon: <Flame size={18} />, color: "#f59e0b", defaultOn: true },
  { name: "conflict", label: "Conflict", icon: <AlertTriangle size={18} />, color: "#ef4444", defaultOn: false },
  { name: "foodDesert", label: "Food", icon: <Utensils size={18} />, color: "#f97316", defaultOn: false },
  { name: "infrastructure", label: "Power", icon: <Zap size={18} />, color: "#6b7280", defaultOn: false },
  { name: "tradeArcs", label: "Trade", icon: <ArrowRight size={18} />, color: "#22c55e", defaultOn: true },
  { name: "displacementArcs", label: "Displace", icon: <Users size={18} />, color: "#3b82f6", defaultOn: false },
];

export default function MapControls({ layerToggles, onToggle }: MapControlsProps) {
  return (
    <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-10">
      <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg p-2 border border-slate-700">
        <div className="text-xs text-slate-400 px-2 pb-2 font-medium uppercase tracking-wider">
          Layers
        </div>
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {LAYERS.map((layer) => {
            const isActive = layerToggles[layer.name];
            return (
              <button
                key={layer.name}
                onClick={() => onToggle(layer.name)}
                className={`
                  flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium
                  transition-all duration-200 border-2
                  ${
                    isActive
                      ? "bg-slate-800 border-slate-600 text-white shadow-lg"
                      : "bg-slate-800/50 border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }
                `}
                style={isActive ? { borderColor: layer.color } : {}}
                title={layer.label}
              >
                <span style={{ color: isActive ? layer.color : "currentColor" }}>
                  {layer.icon}
                </span>
                <span className="hidden sm:inline">{layer.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
