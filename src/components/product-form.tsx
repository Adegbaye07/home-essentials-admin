"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Upload,
} from "antd";
import type { UploadFile } from "antd";
import { useRouter } from "next/navigation";

import { useAppMessage } from "@/hooks/use-app-message";
import { categorySelectOptions, SIZE_CODES } from "@/lib/constants";
import { createProduct, updateProduct, uploadProductImage } from "@/lib/api";
import { formatDeliveryWindow } from "@/lib/delivery-display";
import {
  applyMaxQtyChange,
  applyMinQtyChange,
  defaultNewTier,
  relinkTiersAfterRemove,
  tierSectionLabel,
  type TierForm,
} from "@/lib/product-tier-utils";
import type { ColorImage, Product, SizeVariant } from "@/lib/types";

type ColorImageSlot = {
  /** Preview or existing remote URL shown in the Upload control. */
  displayUrl: string;
  /** Pending file — uploaded only on save. */
  file?: File;
  /** True when displayUrl is an object URL we must revoke. */
  isLocal?: boolean;
};

type ProductFormValues = {
  title: string;
  description: string;
  category: string;
  colors: string[];
  active: boolean;
  colorImagesByColor: Record<string, ColorImageSlot>;
  sizes: string[];
  sizeConfigs: Record<string, { tiers: TierForm[] }>;
};

const ACCEPT_IMAGE_TYPES = "image/jpeg,image/png,image/webp,image/gif";
const MAX_IMAGE_BYTES = 5 << 20;

function koboToNgn(kobo: number): number {
  return kobo / 100;
}

function ngnToKobo(ngn: number): number {
  return Math.round(ngn * 100);
}

function normalizeColorKey(color: string): string {
  return color.trim().toLowerCase();
}

function revokeSlot(slot?: ColorImageSlot) {
  if (slot?.isLocal && slot.displayUrl.startsWith("blob:")) {
    URL.revokeObjectURL(slot.displayUrl);
  }
}

function slotForColor(
  map: Record<string, ColorImageSlot>,
  color: string,
): ColorImageSlot | undefined {
  if (map[color]) return map[color];
  const target = normalizeColorKey(color);
  for (const [key, slot] of Object.entries(map)) {
    if (normalizeColorKey(key) === target) return slot;
  }
  return undefined;
}

function productToFormValues(product: Product): ProductFormValues {
  const sizes = product.sizes.map((s) => s.code);
  const sizeConfigs: ProductFormValues["sizeConfigs"] = {};
  const colorImagesByColor: Record<string, ColorImageSlot> = {};

  const imagesByNormalized = new Map<string, string>();
  for (const ci of product.colorImages ?? []) {
    if (ci.imageUrl?.trim()) {
      imagesByNormalized.set(normalizeColorKey(ci.color), ci.imageUrl);
    }
  }

  for (const c of product.colors) {
    const url = imagesByNormalized.get(normalizeColorKey(c));
    if (url) {
      colorImagesByColor[c] = { displayUrl: url, isLocal: false };
    }
  }

  for (const sv of product.sizes) {
    sizeConfigs[sv.code] = {
      tiers: sv.tiers.map((t) => ({
        minQty: t.minQty,
        maxQty: t.maxQty,
        priceNgn: koboToNgn(t.unitPriceKobo),
        deliveryDays: t.deliveryDays >= 1 ? t.deliveryDays : 7,
      })),
    };
  }

  return {
    title: product.title,
    description: product.description,
    category: product.category,
    colors: product.colors,
    active: product.active,
    colorImagesByColor,
    sizes,
    sizeConfigs,
  };
}

function formValuesToPayload(values: ProductFormValues, resolvedUrls: Record<string, string>) {
  const sizes: SizeVariant[] = values.sizes.map((code) => {
    const tiers = values.sizeConfigs[code]?.tiers ?? [];
    return {
      code,
      tiers: tiers.map((t) => ({
        minQty: t.minQty,
        maxQty: t.maxQty === undefined || t.maxQty === null ? undefined : t.maxQty,
        unitPriceKobo: ngnToKobo(t.priceNgn),
        deliveryDays: t.deliveryDays,
      })),
    };
  });

  const colorImages: ColorImage[] = values.colors.map((color) => ({
    color,
    imageUrl: resolvedUrls[color] ?? "",
  }));

  return {
    title: values.title,
    description: values.description,
    category: values.category,
    colors: values.colors,
    colorImages,
    active: values.active,
    sizes,
  };
}

function ColorImageUpload({
  color,
  slot,
  onChange,
}: {
  color: string;
  slot?: ColorImageSlot;
  onChange: (next?: ColorImageSlot) => void;
}) {
  const message = useAppMessage();
  const fileList: UploadFile[] = slot?.displayUrl
    ? [
        {
          uid: color,
          name: slot.file?.name ?? `${color}-image`,
          status: "done",
          url: slot.displayUrl,
          thumbUrl: slot.displayUrl,
        },
      ]
    : [];

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-700">
      <p className="mb-2 text-sm font-medium capitalize">{color}</p>
      <Upload
        key={slot?.displayUrl ?? `${color}-empty`}
        listType="picture-card"
        fileList={fileList}
        maxCount={1}
        accept={ACCEPT_IMAGE_TYPES}
        className="[&_.ant-upload-list]:flex [&_.ant-upload-list]:flex-wrap"
        beforeUpload={(file) => {
          if (!ACCEPT_IMAGE_TYPES.split(",").includes(file.type)) {
            message.error("Use JPEG, PNG, WebP, or GIF");
            return Upload.LIST_IGNORE;
          }
          if (file.size > MAX_IMAGE_BYTES) {
            message.error("Image must be 5MB or smaller");
            return Upload.LIST_IGNORE;
          }
          const previewUrl = URL.createObjectURL(file);
          revokeSlot(slot);
          onChange({ displayUrl: previewUrl, file, isLocal: true });
          return false;
        }}
        onRemove={() => {
          revokeSlot(slot);
          onChange(undefined);
          return true;
        }}
      >
        {fileList.length >= 1 ? null : "+ Add photo"}
      </Upload>
    </div>
  );
}

function ColorImagesField({
  value,
  onChange,
  colors,
}: {
  value?: Record<string, ColorImageSlot>;
  onChange?: (next: Record<string, ColorImageSlot>) => void;
  colors: string[];
}) {
  const map = value ?? {};
  const mapRef = useRef(map);
  mapRef.current = map;

  useEffect(() => {
    if (!onChange) return;
    const staleKeys = Object.keys(map).filter((k) => !colors.includes(k));
    if (staleKeys.length === 0) return;
    const next: Record<string, ColorImageSlot> = {};
    for (const c of colors) {
      const slot = slotForColor(map, c);
      if (slot) next[c] = slot;
    }
    for (const key of staleKeys) {
      revokeSlot(map[key]);
    }
    onChange(next);
  }, [colors, map, onChange]);

  useEffect(() => {
    return () => {
      for (const slot of Object.values(mapRef.current)) {
        revokeSlot(slot as ColorImageSlot);
      }
    };
  }, []);

  if (colors.length === 0) {
    return (
      <p className="text-sm text-neutral-500">Add colors above to add an image for each.</p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {colors.map((color) => (
          <ColorImageUpload
            key={color}
            color={color}
            slot={slotForColor(map, color)}
            onChange={(nextSlot) => {
              const next: Record<string, ColorImageSlot> = { ...map };
              if (nextSlot) {
                next[color] = nextSlot;
              } else {
                delete next[color];
                for (const key of Object.keys(next)) {
                  if (normalizeColorKey(key) === normalizeColorKey(color)) {
                    delete next[key];
                  }
                }
              }
              onChange?.(next);
            }}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        Each color needs one photo. Images upload when you save the product — not when you pick a
        file.
      </p>
    </>
  );
}

export function ProductForm({
  mode,
  productId,
  initialProduct,
}: {
  mode: "create" | "edit";
  productId?: string;
  initialProduct?: Product;
}) {
  const router = useRouter();
  const [form] = Form.useForm<ProductFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const message = useAppMessage();

  const selectedSizes = Form.useWatch("sizes", form) ?? [];
  const selectedColors: string[] = Form.useWatch("colors", form) ?? [];

  useEffect(() => {
    for (const size of selectedSizes) {
      const tiers = form.getFieldValue(["sizeConfigs", size, "tiers"]);
      if (!tiers || tiers.length === 0) {
        form.setFieldValue(["sizeConfigs", size, "tiers"], [{ minQty: 1, priceNgn: 0, deliveryDays: 7 }]);
      }
    }
  }, [selectedSizes, form]);

  const initialValues = useMemo(() => {
    if (initialProduct) {
      return productToFormValues(initialProduct);
    }
    return {
      active: true,
      colors: [],
      colorImagesByColor: {},
      sizes: [],
      sizeConfigs: {},
    };
  }, [initialProduct]);

  useEffect(() => {
    if (initialProduct) {
      form.setFieldsValue(productToFormValues(initialProduct));
    }
  }, [initialProduct, form]);

  async function onFinish(values: ProductFormValues) {
    const colorImagesByColor = values.colorImagesByColor ?? {};

    for (const c of values.colors) {
      const slot = slotForColor(colorImagesByColor, c);
      if (!slot?.displayUrl?.trim() && !slot?.file) {
        message.error(`Add an image for color "${c}"`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const resolvedUrls: Record<string, string> = {};
      for (const c of values.colors) {
        const slot = slotForColor(colorImagesByColor, c);
        if (!slot) {
          throw new Error(`Missing image for color "${c}"`);
        }
        if (slot.file) {
          resolvedUrls[c] = await uploadProductImage(slot.file);
        } else {
          resolvedUrls[c] = slot.displayUrl;
        }
      }

      const payload = formValuesToPayload(values, resolvedUrls);
      if (mode === "create") {
        await createProduct(payload);
        message.success("Product created");
      } else if (productId) {
        await updateProduct(productId, payload);
        message.success("Product updated");
      }
      router.push("/products");
      router.refresh();
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form
      key={initialProduct?.id ?? "new"}
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={onFinish}
      className="w-full max-w-none"
    >
      <Form.Item name="title" label="Title" rules={[{ required: true }]}>
        <Input />
      </Form.Item>

      <Form.Item name="description" label="Description" rules={[{ required: true }]}>
        <Input.TextArea rows={4} />
      </Form.Item>

      <Form.Item name="category" label="Category" rules={[{ required: true }]}>
        <Select options={categorySelectOptions(initialProduct?.category)} />
      </Form.Item>

      <Form.Item name="colors" label="Colors" rules={[{ required: true, message: "Add at least one color" }]}>
        <Select mode="tags" placeholder="e.g. black, tan" tokenSeparators={[","]} />
      </Form.Item>

      <Form.Item name="active" label="Active" valuePropName="checked">
        <Switch />
      </Form.Item>

      <Form.Item
        name="colorImagesByColor"
        label="Image per color"
        required={selectedColors.length > 0}
        initialValue={{}}
        rules={[
          {
            validator: async (_, val: Record<string, ColorImageSlot> | undefined) => {
              const colors: string[] = form.getFieldValue("colors") ?? [];
              if (colors.length === 0) return;
              const map = val ?? {};
              for (const c of colors) {
                const slot = slotForColor(map, c);
                if (!slot?.displayUrl?.trim() && !slot?.file) {
                  throw new Error(`Add an image for color "${c}"`);
                }
              }
            },
          },
        ]}
      >
        <ColorImagesField colors={selectedColors} />
      </Form.Item>

      <Form.Item name="sizes" label="Sizes" rules={[{ required: true, message: "Select at least one size" }]}>
        <Checkbox.Group
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
          options={SIZE_CODES.map((s) => ({ label: s, value: s }))}
        />
      </Form.Item>

      {selectedSizes.map((size: string) => (
        <div
          key={size}
          className="mb-6 rounded-lg border border-neutral-200 bg-neutral-50/80 p-4 dark:border-neutral-700 dark:bg-neutral-900/40"
        >
          <TypographySection title={`Pricing tiers — ${size}`} />
          <Form.List name={["sizeConfigs", size, "tiers"]}>
            {(fields, { add }) => (
              <>
                {fields.map((field) => (
                  <TierFields
                    key={field.key}
                    field={field}
                    size={size}
                    tierCount={fields.length}
                    onRemove={() => {
                      const tiersPath = tiersPathForSize(size);
                      const current = (form.getFieldValue(tiersPath) ?? []) as TierForm[];
                      const remaining = current.filter((_, index) => index !== field.name);
                      const nextTiers =
                        remaining.length > 0
                          ? relinkTiersAfterRemove(remaining)
                          : [{ minQty: 1, priceNgn: 0, deliveryDays: 7 }];
                      form.setFieldValue(tiersPath, nextTiers);
                    }}
                  />
                ))}
                <Button
                  type="dashed"
                  onClick={() => {
                    const tiersPath = tiersPathForSize(size);
                    const current = (form.getFieldValue(tiersPath) ?? []) as TierForm[];
                    add(defaultNewTier(current));
                  }}
                  block
                >
                  Add tier
                </Button>
              </>
            )}
          </Form.List>
        </div>
      ))}

      <Button type="primary" htmlType="submit" loading={submitting} block className="sm:inline-block sm:w-auto">
        {mode === "create" ? "Create product" : "Save changes"}
      </Button>
    </Form>
  );
}

function tiersPathForSize(size: string): ["sizeConfigs", string, "tiers"] {
  return ["sizeConfigs", size, "tiers"];
}

function TypographySection({ title }: { title: string }) {
  return <p className="mb-3 text-sm font-semibold sm:text-base">{title}</p>;
}

function TierFields({
  field,
  size,
  tierCount,
  onRemove,
}: {
  field: { name: number; key: React.Key };
  size: string;
  tierCount: number;
  onRemove: () => void;
}) {
  const form = Form.useFormInstance<ProductFormValues>();
  const tiersPath = useMemo(() => tiersPathForSize(size), [size]);
  const deliveryDays = Form.useWatch([...tiersPath, field.name, "deliveryDays"]) as
    | number
    | undefined;
  const preview =
    deliveryDays != null && deliveryDays >= 1 ? formatDeliveryWindow(deliveryDays) : null;
  const isFirstTier = field.name === 0;

  function updateTiers(nextTiers: TierForm[]) {
    form.setFieldValue(tiersPath, nextTiers);
  }

  function handleMinQtyChange(value: number | null) {
    if (value == null || isFirstTier) {
      return;
    }
    const current = (form.getFieldValue(tiersPath) ?? []) as TierForm[];
    updateTiers(applyMinQtyChange(current, field.name, value));
  }

  function handleMaxQtyChange(value: number | null) {
    const current = (form.getFieldValue(tiersPath) ?? []) as TierForm[];
    updateTiers(applyMaxQtyChange(current, field.name, value));
  }

  return (
    <div className="mb-3 border-b border-neutral-200 pb-3 last:border-0">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {tierSectionLabel(field.name, tierCount)}
      </p>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5 xl:items-end">
        <Form.Item
          {...field}
          name={[field.name, "minQty"]}
          label="Min qty"
          rules={[{ required: true }]}
          className="mb-0"
        >
          <InputNumber
            min={1}
            className="w-full!"
            disabled={isFirstTier}
            onChange={handleMinQtyChange}
          />
        </Form.Item>
        <Form.Item
          {...field}
          name={[field.name, "maxQty"]}
          label="Max qty (empty = no limit)"
          className="mb-0"
        >
          <InputNumber min={1} className="w-full!" onChange={handleMaxQtyChange} />
        </Form.Item>
        <Form.Item
          {...field}
          name={[field.name, "priceNgn"]}
          label="Price (₦)"
          rules={[{ required: true }]}
          className="mb-0"
        >
          <InputNumber min={0} step={100} className="w-full!" />
        </Form.Item>
        <Form.Item
          {...field}
          name={[field.name, "deliveryDays"]}
          label="Delivery (days)"
          rules={[
            { required: true, message: "Required" },
            { type: "number", min: 1, message: "At least 1 day" },
          ]}
          className="mb-0"
        >
          <InputNumber min={1} max={365} className="w-full!" />
        </Form.Item>
        <Button
          danger
          type="link"
          onClick={onRemove}
          className="h-fit justify-self-start xl:mb-1"
        >
          Remove tier
        </Button>
      </div>
      {preview ? (
        <p className="mt-2 text-xs leading-relaxed text-neutral-600">{preview}</p>
      ) : null}
    </div>
  );
}
