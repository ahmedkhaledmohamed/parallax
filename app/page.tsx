import Link from "next/link";

const STEPS = [
  {
    number: "1",
    title: "Name the restaurant",
    description: "Type a name, paste a Google Maps URL, or share from your Maps app.",
  },
  {
    number: "2",
    title: "Describe what you care about",
    description: "\"Quiet date night\" scores differently than \"cheap family lunch\" — tell us your angle.",
  },
  {
    number: "3",
    title: "Get your Parallax Score",
    description: "We decompose every review by dimension and re-weight for you. Same data, your viewpoint.",
  },
];

const EXAMPLES = [
  { intent: "Quiet date night, authentic Italian, good wine", parallax: 4.6, google: 4.2, delta: "+0.4" },
  { intent: "Cheap eats, big portions, don't care about decor", parallax: 3.8, google: 4.5, delta: "-0.7" },
  { intent: "Post-workout protein, quick in and out", parallax: 4.3, google: 4.1, delta: "+0.2" },
];

export default function LandingPage() {
  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 pt-24 pb-20 text-center">
        <div className="mb-6">
          <span className="text-5xl font-bold tracking-tight text-amber-500">P</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-100 mb-4 max-w-2xl">
          Same reviews, your viewpoint
        </h1>
        <p className="text-lg text-zinc-400 max-w-xl mb-10 leading-relaxed">
          Google gives every restaurant one score. Parallax re-scores it based
          on what actually matters to you right now.
        </p>
        <Link
          href="/app"
          className="rounded-lg bg-amber-600 px-8 py-3.5 text-base font-medium text-white hover:bg-amber-500 transition-colors"
        >
          Try it free
        </Link>
        <p className="mt-3 text-xs text-zinc-600">No sign-up required</p>
      </section>

      {/* How it works */}
      <section className="px-4 py-20 border-t border-zinc-800/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-sm font-medium uppercase tracking-wider text-amber-500 text-center mb-12">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div key={step.number} className="text-center">
                <div className="w-10 h-10 rounded-full border border-zinc-700 flex items-center justify-center mx-auto mb-4">
                  <span className="text-sm font-bold text-zinc-400">{step.number}</span>
                </div>
                <h3 className="text-base font-semibold text-zinc-200 mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Same restaurant, different angle */}
      <section className="px-4 py-20 border-t border-zinc-800/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-sm font-medium uppercase tracking-wider text-amber-500 text-center mb-4">
            Same restaurant, different angle
          </h2>
          <p className="text-center text-zinc-500 mb-12 max-w-xl mx-auto">
            The gap between what Google shows everyone and what Parallax shows you IS the insight.
          </p>
          <div className="space-y-3">
            {EXAMPLES.map((ex) => (
              <div
                key={ex.intent}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <p className="text-sm text-zinc-300 flex-1">
                  &ldquo;{ex.intent}&rdquo;
                </p>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-600">Google</p>
                    <p className="text-lg font-bold text-zinc-400">{ex.google}</p>
                  </div>
                  <span className={`text-sm font-mono font-bold ${ex.delta.startsWith("+") ? "text-emerald-400" : "text-red-400"}`}>
                    {ex.delta}
                  </span>
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider text-amber-500">Parallax</p>
                    <p className="text-lg font-bold text-zinc-100">{ex.parallax}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20 border-t border-zinc-800/50 text-center">
        <h2 className="text-2xl font-bold text-zinc-100 mb-3">
          Stop trusting the average
        </h2>
        <p className="text-zinc-500 mb-8 max-w-md mx-auto">
          A 4.5 means nothing without context. Get a score that reflects what you actually care about.
        </p>
        <Link
          href="/app"
          className="rounded-lg bg-amber-600 px-8 py-3.5 text-base font-medium text-white hover:bg-amber-500 transition-colors"
        >
          Get your Parallax Score
        </Link>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 border-t border-zinc-800/50">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-600">
          <span>Built by Ahmed Khaled</span>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/ahmedkhaledmohamed/parallax"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-400 transition-colors"
            >
              GitHub
            </a>
            <span>Powered by Next.js on Vercel</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
