"use client";

import { AdminShell } from "@/components/admin-shell";
import { ProductForm } from "@/components/product-form";

export default function NewProductPage() {
  return (
    <AdminShell contentWidth="narrow" title="New product">
      <h1 className="mb-4 text-lg font-semibold sm:hidden">New product</h1>
      <ProductForm mode="create" />
    </AdminShell>
  );
}
