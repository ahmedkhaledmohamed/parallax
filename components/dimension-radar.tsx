"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { DimensionScore } from "@/lib/types";

interface DimensionRadarProps {
  dimensions: DimensionScore[];
}

function formatDimension(dim: string): string {
  return dim
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function sentimentToScore(sentiment: number): number {
  return Math.round(((sentiment + 1) / 2) * 100);
}

export function DimensionRadar({ dimensions }: DimensionRadarProps) {
  if (dimensions.length < 3) return null;

  const data = dimensions.map((d) => ({
    dimension: formatDimension(d.dimension),
    parallax: sentimentToScore(d.averageSentiment),
    google: sentimentToScore(d.googleSentiment),
    weight: d.weight,
    reviewCount: d.reviewCount,
  }));

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h3 className="text-sm font-medium uppercase tracking-wider text-amber-500 mb-1">
        Dimension Profile
      </h3>
      <p className="text-xs text-zinc-600 mb-4">
        Gray = Google&apos;s view (equal weights) | Amber = your Parallax
        view (weighted by intent)
      </p>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke="#27272a" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: "#a1a1aa", fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name="Google"
            dataKey="google"
            stroke="#52525b"
            fill="#52525b"
            fillOpacity={0.15}
            strokeWidth={1.5}
          />
          <Radar
            name="Parallax"
            dataKey="parallax"
            stroke="#d97706"
            fill="#d97706"
            fillOpacity={0.2}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            itemStyle={{ color: "#e4e4e7" }}
            formatter={(value, name) => [
              `${value}%`,
              String(name),
            ]}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
