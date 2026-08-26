import type { PeriodType } from "../../pages/Dashboard";

interface PeriodSelectorProps {
  period: PeriodType;
  setPeriod: (p: PeriodType) => void;
  customFrom: string;
  setCustomFrom: (val: string) => void;
  customTo: string;
  setCustomTo: (val: string) => void;
}

export default function PeriodSelector({
  period,
  setPeriod,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
}: PeriodSelectorProps) {
  
  const periods: [PeriodType, string][] = [
    ["today", "Hoy"],
    ["yesterday", "Ayer"],
    ["7days", "7 días"],
    ["30days", "30 días"],
    ["3months", "3 meses"],
    ["custom", "Personalizado"],
  ];

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {periods.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setPeriod(value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              period === value
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {period === "custom" && (
        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Desde
              </label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Hasta
              </label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}