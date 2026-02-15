"use client";

export default function MapLegend() {
  const choroplethColors = [
    { value: "1-2", color: "#22c55e", label: "Low" },
    { value: "3-4", color: "#eab308", label: "Moderate" },
    { value: "5-6", color: "#f97316", label: "High" },
    { value: "7-8", color: "#ef4444", label: "Severe" },
    { value: "9-10", color: "#7f1d1d", label: "Critical" },
  ];

  return (
    <div className="absolute bottom-4 right-4 z-10">
      <div className="bg-slate-900/90 backdrop-blur-sm rounded-lg p-3 border border-slate-700">
        <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2">
          Impact Score
        </div>
        <div className="flex flex-col gap-1 mb-3">
          {choroplethColors.map((item) => (
            <div key={item.value} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-slate-300">
                {item.value} — {item.label}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-700 pt-2 mt-2">
          <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2">
            Arc Types
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-gradient-to-r from-green-500 to-red-500 rounded" />
              <span className="text-xs text-slate-300">Trade/Supply</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-gradient-to-r from-blue-400 to-blue-600 rounded" />
              <span className="text-xs text-slate-300">Displacement</span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-2 mt-2">
          <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-2">
            Infrastructure
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-500" />
              <span className="text-xs text-slate-300">Power</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-xs text-slate-300">Water</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-xs text-slate-300">Telecom</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-xs text-slate-300">Transport</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
