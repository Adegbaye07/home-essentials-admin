"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Button, Card, Form, Input, Spin, Typography } from "antd";

import { ApiError, login } from "@/lib/api";
import { BrandMark } from "@/components/brand-mark";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onFinish(values: { email: string; password: string }) {
    setLoading(true);
    setError(null);
    try {
      await login(values.email, values.password);
      const next = searchParams.get("next") ?? "/products";
      router.replace(next.startsWith("/") ? next : "/products");
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("Login failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <Card className="w-full min-w-0 max-w-md shadow-sm">
        <div className="mb-2 text-hek-primary">
          <BrandMark size="lg" suffix="Admin" />
        </div>
        <Typography.Paragraph type="secondary">Sign in to manage the catalogue.</Typography.Paragraph>
        {error ? (
          <Alert type="error" message={error} showIcon className="mb-4 wrap-break-word [&_.ant-alert-message]:wrap-break-word" />
        ) : null}
        <Form layout="vertical" onFinish={onFinish} className="w-full">
          <Form.Item name="email" label="Email" rules={[{ required: true, type: "email" }]}>
            <Input autoComplete="email" size="large" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true }]}>
            <Input.Password autoComplete="current-password" size="large" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading} size="large">
            Log in
          </Button>
        </Form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-12">
          <Spin description="Loading…" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
