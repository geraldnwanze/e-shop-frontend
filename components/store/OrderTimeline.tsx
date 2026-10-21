import { timelineSteps, type TimelineState } from "@/lib/order-timeline";

const DOT: Record<TimelineState, string> = {
  done: "border-primary bg-primary text-primary-fg",
  current: "border-primary bg-surface text-primary ring-4 ring-primary/20",
  upcoming: "border-black/20 bg-surface text-transparent",
  cancelled: "border-red-600 bg-red-600 text-white",
};

function Mark({ state }: { state: TimelineState }) {
  if (state === "done") {
    return (
      <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4.5 10.5l3.5 3.5 7.5-8" />
      </svg>
    );
  }
  if (state === "cancelled") {
    return (
      <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
        <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />
      </svg>
    );
  }
  return <span className={`size-2 rounded-full ${state === "current" ? "bg-primary" : "bg-transparent"}`} />;
}

export function OrderTimeline({ status, placedAt }: { status: string; placedAt: string }) {
  const steps = timelineSteps(status);

  return (
    <ol className="mt-6" aria-label="Order progress">
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        const nextDone = !last && steps[index + 1].state !== "upcoming" && step.state === "done";

        return (
          <li key={step.key} className="flex gap-4" aria-current={step.state === "current" ? "step" : undefined}>
            <div className="flex flex-col items-center">
              <span className={`grid size-7 shrink-0 place-items-center rounded-full border-2 ${DOT[step.state]}`}>
                <Mark state={step.state} />
              </span>
              {last ? null : <span className={`my-1 w-0.5 grow ${nextDone ? "bg-primary" : "bg-black/15"}`} />}
            </div>
            <div className={last ? "pb-0" : "pb-6"}>
              <p className={`font-semibold ${step.state === "upcoming" ? "opacity-50" : ""} ${step.state === "cancelled" ? "text-red-700" : ""}`}>{step.label}</p>
              <p className={`text-sm ${step.state === "upcoming" ? "opacity-40" : "opacity-70"}`}>
                {step.key === "placed" ? new Date(placedAt).toLocaleDateString(undefined, { dateStyle: "medium" }) : step.description}
              </p>
              <span className="sr-only">{step.state === "done" ? "Completed" : step.state === "current" ? "In progress" : step.state === "upcoming" ? "Not yet reached" : "Cancelled"}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
