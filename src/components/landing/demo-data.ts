export type DemoSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type DemoStatus = "OPEN" | "INVESTIGATING" | "RESOLVED";
export type DemoPostmortemStatus = "DRAFT" | "PUBLISHED";

export type DemoTimelineEntry =
  | {
      id: string;
      type: "STATUS_CHANGED";
      at: string;
      from: DemoStatus;
      to: DemoStatus;
      author: string;
    }
  | {
      id: string;
      type: "COMMENT";
      at: string;
      author: string;
      body: string;
    }
  | {
      id: string;
      type: "SEVERITY_CHANGED";
      at: string;
      from: DemoSeverity;
      to: DemoSeverity;
      author: string;
    };

export type DemoIncident = {
  id: string;
  title: string;
  description: string;
  severity: DemoSeverity;
  status: DemoStatus;
  createdBy: string;
  createdAt: string;
  timeline: DemoTimelineEntry[];
  postmortem: {
    status: DemoPostmortemStatus;
    versionCount: number;
    summary: string;
    impact: string;
    rootCause: string;
    actions: string[];
  } | null;
};

export const DEMO_WORKSPACE = {
  name: "ops-platform",
  role: "ADMIN" as const,
};

export const DEMO_INCIDENTS: DemoIncident[] = [
  {
    id: "inc-demo-1",
    title: "Elevated latency on the checkout API",
    description:
      "p95 response times above 2s on the /checkout endpoint since 14:12 UTC.",
    severity: "HIGH",
    status: "INVESTIGATING",
    createdBy: "Ana Costa",
    createdAt: "Oct 10 · 14:18",
    timeline: [
      {
        id: "t1",
        type: "STATUS_CHANGED",
        at: "14:18",
        from: "OPEN",
        to: "INVESTIGATING",
        author: "Ana Costa",
      },
      {
        id: "t2",
        type: "COMMENT",
        at: "14:26",
        author: "Miguel Santos",
        body: "Read-replica connection pool saturated. Temporarily raised the limit.",
      },
      {
        id: "t3",
        type: "SEVERITY_CHANGED",
        at: "14:31",
        from: "MEDIUM",
        to: "HIGH",
        author: "Ana Costa",
      },
    ],
    postmortem: {
      status: "DRAFT",
      versionCount: 0,
      summary:
        "Checkout degradation caused by connection-pool saturation on the read replica.",
      impact: "Conversion rate dropped ~18% for 47 minutes.",
      rootCause:
        "A recent migration increased average query time without adjusting the pool size.",
      actions: [
        "Review pool limits after schema changes",
        "Add an alert for connection-pool saturation",
      ],
    },
  },
  {
    id: "inc-demo-2",
    title: "Intermittent webhook delivery failures",
    description:
      "Excess retries on the webhook worker; partners reporting missing events.",
    severity: "MEDIUM",
    status: "RESOLVED",
    createdBy: "João Ribeiro",
    createdAt: "Oct 8 · 09:04",
    timeline: [
      {
        id: "t4",
        type: "STATUS_CHANGED",
        at: "09:04",
        from: "OPEN",
        to: "INVESTIGATING",
        author: "João Ribeiro",
      },
      {
        id: "t5",
        type: "COMMENT",
        at: "09:40",
        author: "João Ribeiro",
        body: "Dead-letter queue with malformed messages blocking the consumer.",
      },
      {
        id: "t6",
        type: "STATUS_CHANGED",
        at: "10:12",
        from: "INVESTIGATING",
        to: "RESOLVED",
        author: "João Ribeiro",
      },
    ],
    postmortem: {
      status: "PUBLISHED",
      versionCount: 2,
      summary:
        "Webhook consumer blocked by invalid messages in the dead-letter queue.",
      impact: "Average 38-minute delay delivering events to 3 partners.",
      rootCause:
        "Insufficient payload validation after a change to the event schema.",
      actions: [
        "Reject invalid payloads before they enter the queue",
        "Publish a metric for DLQ depth",
      ],
    },
  },
  {
    id: "inc-demo-3",
    title: "Internal metrics dashboard outage",
    description:
      "Observability dashboard unavailable; production telemetry continues to flow.",
    severity: "LOW",
    status: "OPEN",
    createdBy: "Sara Mendes",
    createdAt: "Oct 10 · 16:02",
    timeline: [
      {
        id: "t7",
        type: "COMMENT",
        at: "16:05",
        author: "Sara Mendes",
        body: "502 error on the dashboards service gateway. No customer impact.",
      },
    ],
    postmortem: null,
  },
];
