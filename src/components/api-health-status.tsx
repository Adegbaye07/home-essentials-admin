"use client";

import { useEffect, useState } from "react";
import { Alert, Spin, Typography } from "antd";

type HealthResponse = {
  status: string;
  service?: string;
};

type ReadyResponse = {
  status: string;
  reason?: string;
};

export function ApiHealthStatus() {
  const base = process.env.NEXT_PUBLIC_API_URL;

  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [ready, setReady] = useState<ReadyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!base) {
      setError("NEXT_PUBLIC_API_URL is not set");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const [healthRes, readyRes] = await Promise.all([
          fetch(`${base}/health`),
          fetch(`${base}/ready`),
        ]);

        if (!healthRes.ok) {
          throw new Error(`/health returned ${healthRes.status}`);
        }

        const healthJson = (await healthRes.json()) as HealthResponse;
        const readyJson = (await readyRes.json()) as ReadyResponse;

        if (!cancelled) {
          setHealth(healthJson);
          setReady(readyJson);
          if (!readyRes.ok) {
            setError("API reachable but /ready is not OK (check MONGODB_URI)");
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to reach API");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [base]);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Spin description="Checking API…" />
      </div>
    );
  }

  if (error && !health) {
    return (
      <Alert type="error" message="API connection" description={error} showIcon />
    );
  }

  return (
    <div className="flex flex-col gap-3 text-sm sm:text-base">
      {error ? <Alert type="warning" message={error} showIcon /> : null}
      <Typography.Paragraph className="mb-0! wrap-break-word">
        <strong>/health</strong>: {health?.status}
        {health?.service ? ` (${health.service})` : ""}
      </Typography.Paragraph>
      <Typography.Paragraph className="mb-0! wrap-break-word">
        <strong>/ready</strong>: {ready?.status}
        {ready?.reason ? ` — ${ready.reason}` : ""}
      </Typography.Paragraph>
      <Typography.Text type="secondary" className="break-all">
        API: {base}
      </Typography.Text>
    </div>
  );
}
