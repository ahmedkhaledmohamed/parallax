import { RelevantReview } from "@/lib/types";

interface ReviewCardProps {
  review: RelevantReview;
}

function stars(rating: number) {
  return Array.from({ length: 5 }, (_, i) => (
    <span
      key={i}
      className={i < rating ? "text-amber-400" : "text-zinc-700"}
    >
      *
    </span>
  ));
}

export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-zinc-300">
          {review.author}
        </span>
        <span className="font-mono text-sm tracking-wider">
          {stars(review.rating)}
        </span>
      </div>

      <blockquote className="text-sm text-zinc-400 leading-relaxed mb-3 border-l-2 border-amber-600/40 pl-3">
        &ldquo;{review.excerpt}&rdquo;
      </blockquote>

      <p className="text-xs text-zinc-500 italic">{review.whyRelevant}</p>

      {review.dimensionScores.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {review.dimensionScores.map((ds) => {
            const color =
              ds.sentiment >= 0.3
                ? "border-emerald-800 text-emerald-500"
                : ds.sentiment >= -0.3
                  ? "border-amber-800 text-amber-500"
                  : "border-red-800 text-red-500";
            return (
              <span
                key={ds.dimension}
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${color}`}
              >
                {ds.dimension.replace(/_/g, " ")}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
