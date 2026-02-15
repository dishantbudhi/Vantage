"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AgentResults, AgentName } from "@/lib/types";
import { AGENT_COLORS } from "./constants";

interface CountryContext {
  name: string;
  iso3: string;
  economics: {
    gdp: number;
    population: number;
    poverty_rate: number;
    arable_land_pct: number;
    energy_use_per_capita: number;
    trade_pct_gdp: number;
  };
  risk: {
    risk_score: number;
    hazard_exposure: number;
    vulnerability: number;
    lack_of_coping_capacity: number;
  };
  displacement: {
    refugees: number;
    asylum_seekers: number;
    idps: number;
    stateless: number;
  };
}

interface RegionDetailProps {
  iso3: string;
  agentResults: AgentResults;
  countryData: CountryContext | null;
  onBack: () => void;
}

interface DomainData {
  score: number;
  label: string;
  color: string;
  summary: string;
}

const AGENT_KEYS: SpecialistAgentName[] = [
  "geopolitics",
  "economy",
  "food_supply",
  "infrastructure",
  "civilian_impact",
];

// ISO 3166-1 alpha-3 to alpha-2 mapping for flag emojis
const ISO3_TO_ISO2: Record<string, string> = {
  USA: "US",
  EGY: "EG",
  IND: "IN",
  CHN: "CN",
  RUS: "RU",
  BRA: "BR",
  GBR: "GB",
  DEU: "DE",
  FRA: "FR",
  JPN: "JP",
  AUS: "AU",
  CAN: "CA",
  MEX: "MX",
  SAU: "SA",
  ARE: "AE",
  TUR: "TR",
  ITA: "IT",
  ESP: "ES",
  KOR: "KR",
  IDN: "ID",
  PAK: "PK",
  BGD: "BD",
  NGA: "NG",
  ETH: "ET",
  ZAF: "ZA",
  DNK: "DK",
  NOR: "NO",
  SWE: "SE",
  FIN: "FI",
  GRL: "GL",
  NLD: "NL",
  BEL: "BE",
  CHE: "CH",
  AUT: "AT",
  POL: "PL",
  UKR: "UA",
  GRC: "GR",
  PRT: "PT",
  IRN: "IR",
  IRQ: "IQ",
  ISR: "IL",
  LBN: "LB",
  SYR: "SY",
  YEM: "YE",
  THA: "TH",
  VNM: "VN",
  MYS: "MY",
  SGP: "SG",
  PHL: "PH",
  NZL: "NZ",
  ARG: "AR",
  CHL: "CL",
  COL: "CO",
  PER: "PE",
  VEN: "VE",
};

function getFlagEmoji(iso3: string): string {
  const iso2 = ISO3_TO_ISO2[iso3];
  if (!iso2) return "";
  
  const codePoints = iso2
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  
  return String.fromCodePoint(...codePoints);
}

function formatNumber(num: number | undefined | null, type: "number" | "currency" | "percent"): string {
  if (num === undefined || num === null || isNaN(num)) return "N/A";
  
  switch (type) {
    case "currency":
      if (num >= 1e12) return `$${(num / 1e12).toFixed(1)}T`;
      if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
      if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
      return `$${num.toLocaleString()}`;
    case "percent":
      return `${num.toFixed(1)}%`;
    case "number":
    default:
      if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
      if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
      return num.toLocaleString();
  }
}

type SpecialistAgentName = "geopolitics" | "economy" | "food_supply" | "infrastructure" | "civilian_impact";

function getDomainData(agentResults: AgentResults, iso3: string): DomainData[] {
  const domainMap: Record<SpecialistAgentName, string> = {
    geopolitics: "impact_score",
    economy: "trade_disruption",
    food_supply: "food_security_impact",
    infrastructure: "infrastructure_risk",
    civilian_impact: "humanitarian_score",
  };

  const labelMap: Record<SpecialistAgentName, string> = {
    geopolitics: "Geopolitics",
    economy: "Economy",
    food_supply: "Food Supply",
    infrastructure: "Infrastructure",
    civilian_impact: "Civilian",
  };

  return AGENT_KEYS.map((agent) => {
    const result = agentResults[agent];
    let score = 0;
    let summary = "No data available";

    if (result && typeof result === "object" && "affected_countries" in result) {
      const affected = (result as any).affected_countries;
      const countryData = affected?.find((c: any) => c.iso3 === iso3);
      
      if (countryData) {
        const key = domainMap[agent];
        score = countryData[key] ?? 0;
        
        // Generate summary based on agent type
        switch (agent) {
          case "geopolitics":
            summary = `Stance: ${countryData.stance}. Concerns: ${countryData.key_concerns?.slice(0, 2).join(", ") || "N/A"}`;
            break;
          case "economy":
            summary = `GDP Impact: ${countryData.gdp_impact_pct?.toFixed(1) || "N/A"}%. Sectors: ${countryData.key_sectors?.slice(0, 2).join(", ") || "N/A"}`;
            break;
          case "food_supply":
            summary = `${countryData.is_food_desert ? "Food desert declared. " : ""}Pop at risk: ${formatNumber(countryData.population_at_risk, "number")}`;
            break;
          case "infrastructure":
            summary = `Systems: ${countryData.systems_at_risk?.slice(0, 3).join(", ") || "N/A"}. Cascade risk: ${countryData.cascade_risk}/10`;
            break;
          case "civilian_impact":
            summary = `Displaced: ${formatNumber(countryData.displaced_estimate, "number")}. Health risk: ${countryData.health_risk}/10`;
            break;
        }
      }
    }

    return {
      score,
      label: labelMap[agent],
      color: AGENT_COLORS[agent],
      summary,
    };
  });
}

function FlagEmoji({ iso3 }: { iso3: string }) {
  const flag = getFlagEmoji(iso3);
  if (!flag) return null;
  
  return <span className="text-2xl ml-2">{flag}</span>;
}

export default function RegionDetail({
  iso3,
  agentResults,
  countryData,
  onBack,
}: RegionDetailProps) {
  const domainData = useMemo(() => getDomainData(agentResults, iso3), [agentResults, iso3]);

  const chartData = domainData.map((d) => ({
    name: d.label.charAt(0),
    fullName: d.label,
    score: d.score,
    fill: d.color,
  }));

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="flex items-center gap-1 hover:bg-accent"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>

      {/* Country Name */}
      <div className="flex items-center py-4">
        <h2 className="text-xl font-semibold">
          {countryData?.name || iso3}
        </h2>
        <FlagEmoji iso3={iso3} />
      </div>

      {/* Bar Chart */}
      <div className="h-48 w-full pb-4 border-b border-border">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <XAxis
              type="number"
              domain={[0, 10]}
              tick={{ fill: "#888", fontSize: 12 }}
              axisLine={{ stroke: "#444" }}
              tickLine={{ stroke: "#444" }}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: "#888", fontSize: 14, fontWeight: 600 }}
              axisLine={{ stroke: "#444" }}
              tickLine={false}
              width={30}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e1e1e",
                border: "1px solid #333",
                borderRadius: "8px",
                color: "#fff",
              }}
              formatter={(value: number, name: string, props: any) => [
                `${value}/10 - ${props.payload.fullName}`,
                "Score",
              ]}
            />
            <Bar dataKey="score" radius={[0, 4, 4, 0]} animationDuration={500}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Domain Summaries */}
      <div className="flex-1 overflow-y-auto py-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Domain Analysis
        </h3>
        <div className="space-y-3">
          {domainData.map((domain, idx) => (
            <div
              key={domain.label}
              className="p-3 rounded-lg bg-card/50 border border-border/50"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: domain.color }}
                />
                <span className="font-medium text-sm">{domain.label}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {domain.score}/10
                </span>
              </div>
              <p className="text-xs text-muted-foreground pl-4">
                {domain.summary}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Statistics Table */}
      <div className="border-t border-border pt-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Key Statistics
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-2 rounded bg-card/30">
            <div className="text-xs text-muted-foreground">Population</div>
            <div className="font-medium">
              {formatNumber(countryData?.economics.population, "number")}
            </div>
          </div>
          <div className="p-2 rounded bg-card/30">
            <div className="text-xs text-muted-foreground">GDP</div>
            <div className="font-medium">
              {formatNumber(countryData?.economics.gdp, "currency")}
            </div>
          </div>
          <div className="p-2 rounded bg-card/30">
            <div className="text-xs text-muted-foreground">Displacement</div>
            <div className="font-medium">
              {formatNumber(
                (countryData?.displacement.refugees || 0) +
                  (countryData?.displacement.idps || 0),
                "number"
              )}
            </div>
          </div>
          <div className="p-2 rounded bg-card/30">
            <div className="text-xs text-muted-foreground">Risk Index</div>
            <div className="font-medium">
              {countryData?.risk.risk_score?.toFixed(1) || "N/A"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
