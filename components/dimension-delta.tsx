import { DimensionScore } from "@/lib/types";

interface DimensionDeltaProps {
  dimensions: DimensionScore[];
}

function formatDimension(dim: string): string {
  return dim.replace(/_/g, " ");
}

export function DimensionDelta({ dimensions }: DimensionDeltaProps) {
  if (dimensions.length === 0) return null;

  const sorted = [...dimensions].sort((a, b) => b.weight - a.weight);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h3 className="text-sm font-medium uppercase tracking-wider text-amber-500 mb-1">
        What shifted for you
      </h3>
      <p className="text-xs text-zinc-600 mb-5">
        How each dimension&apos;s score changes when weighted by your intent
      </p>

      <div className="space-y-4">
        {sorted.map((d) => {
          const delta = d.averageSentiment - d.googleSentiment;
          const absDelta = Math.abs(delta);
          const barPct = Math.min(absDelta * 100, 100);

          const isPositive = delta > 0;
          const isNeutral = absDelta < 0.05;

          const barColor = isNeutral
            ? "bg-zinc-600"
            : isPositive
              ? "bg-emerald-500"
              : "bg-red-500";

          const deltaLabel = isNeutral
            ? "~0"
            : `${isPositive ? "+" : ""}${(delta * 100).toFixed(0)}`;

          return (
            <div key={d.dimension}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-300 capitalize">
                    {formatDimension(d.dimension)}
                  </span>
                  <span className="text-xs text-zinc-600">
                    w:{(d.weight * 100).toFixed(0)}%
                  </span>
                </div>
                <span
                  className={`text-xs font-mono font-medium ${
                    isNeutral
                      ? "text-zinc-500"
                      : isPositive
                        ? "text-emerald-400"
                        : "text-red-400"
                  }`}
                >
                  {deltaLabel}
                </span>
              </div>

              <div className="relative h-2 flex items-center">
                {/* Center line */}
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full bg-zinc-800 h-1.5 rounded-full" />
                </div>
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-zinc-600" />

                {/* Delta bar */}
                {!isNeutral && (
                  <div
                    className="absolute h-1.5 rounded-full"
                    style={{
                      ...(isPositive
                        ? {
                            left: "50%",
                            width: `${barPct / 2}%`,
                          }
                        : {
                            right: "50%",
                            width: `${barPct / 2}%`,
                          }),
                      opacity: Math.max(0.4, d.weight),
                    }}
                  >
                    <div className={`w-full h-full rounded-full ${barColor}`} />
                  </div>
                )}
              </div>

              {d.reviewCount > 0 && (
                <p className="text-xs text-zinc-700 mt-1">
                  {d.reviewCount} review{d.reviewCount !== 1 ? "s" : ""} mention
                  this
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
