"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Spin } from "antd";

import { AdminShell } from "@/components/admin-shell";
import { ProductForm } from "@/components/product-form";
import { getProduct } from "@/lib/api";
import type { Product } from "@/lib/types";
import { useAppMessage } from "@/hooks/use-app-message";

export default function EditProductPage() {
  const message = useAppMessage();
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    async function load() {
      setLoadFailed(false);
      try {
        const data = await getProduct(params.id);
        setProduct(data);
      } catch (e) {
        setLoadFailed(true);
        message.error(e instanceof Error ? e.message : "Failed to load product");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [params.id]);

  if (loading) {
    return (
      <AdminShell contentWidth="narrow" title="Edit product">
        <div className="flex justify-center py-16">
          <Spin description="Loading product…" />
        </div>
      </AdminShell>
    );
  }

  if (loadFailed || !product) {
    return (
      <AdminShell contentWidth="narrow" title="Edit product">
        <p className="text-neutral-600 dark:text-neutral-400">
          {loadFailed ? "Could not load this product." : "Product not found."}
        </p>
      </AdminShell>
    );
  }

  return (
    <AdminShell contentWidth="narrow" title="Edit product">
      <h1 className="mb-4 text-lg font-semibold sm:hidden">Edit product</h1>
      <ProductForm mode="edit" productId={params.id} initialProduct={product} />
    </AdminShell>
  );
}
