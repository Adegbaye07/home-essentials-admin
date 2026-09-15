"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Form, Input, InputNumber, Select, Switch, Upload } from "antd";
import type { UploadFile } from "antd";
import { useRouter } from "next/navigation";

import { useAppMessage } from "@/hooks/use-app-message";
import { categorySelectOptions, isCleaningCategory } from "@/lib/constants";
import {
  createProduct,
  updateProduct,
  uploadProductImage,
  uploadProductVideo,
} from "@/lib/api";
import type { Product, SizePricing } from "@/lib/types";

type ImageSlot = {
  displayUrl: string;
  file?: File;
  isLocal?: boolean;
};

type VideoSlot = ImageSlot;

type SizePricingForm = {
  size: string;
  piecePriceNgn: number;
  bundlePriceNgn: number;
  piecesPerBundle: number;
};

type ProductFormValues = {
  title: string;
  description: string;
  category: string;
  variants: string[];
  active: boolean;
  variantImagesByVariant: Record<string, ImageSlot>;
  authenticityVideo?: VideoSlot | null;
  sizeLabels: string[];
  sizeConfigs: Record<string, Omit<SizePricingForm, "size">>;
  cleaningPieceNgn?: number;
  cleaningDozenNgn?: number;
};

const ACCEPT_IMAGE_TYPES = "image/jpeg,image/png,image/webp,image/gif";
const MAX_IMAGE_BYTES = 5 << 20;
const ACCEPT_VIDEO_TYPES = "video/mp4,video/webm,video/quicktime";
const MAX_VIDEO_BYTES = 5 << 20;

function koboToNgn(kobo: number): number {
  return kobo / 100;
}

function ngnToKobo(ngn: number): number {
  return Math.round(ngn * 100);
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function revokeSlot(slot?: ImageSlot) {
  if (slot?.isLocal && slot.displayUrl.startsWith("blob:")) {
    URL.revokeObjectURL(slot.displayUrl);
  }
}

function slotForVariant(
  map: Record<string, ImageSlot>,
  variant: string,
): ImageSlot | undefined {
  if (map[variant]) return map[variant];
  const target = normalizeKey(variant);
  for (const [key, slot] of Object.entries(map)) {
    if (normalizeKey(key) === target) return slot;
  }
  return undefined;
}

function productToFormValues(product: Product): ProductFormValues {
  const variantImagesByVariant: Record<string, ImageSlot> = {};
  const imagesByNormalized = new Map<string, string>();
  for (const vi of product.variantImages ?? []) {
    if (vi.imageUrl?.trim()) {
      imagesByNormalized.set(normalizeKey(vi.variant), vi.imageUrl);
    }
  }
  for (const v of product.variants) {
    const url = imagesByNormalized.get(normalizeKey(v));
    if (url) {
      variantImagesByVariant[v] = { displayUrl: url, isLocal: false };
    }
  }

  const sizeLabels = (product.sizePricings ?? []).map((s) => s.size);
  const sizeConfigs: ProductFormValues["sizeConfigs"] = {};
  for (const sp of product.sizePricings ?? []) {
    sizeConfigs[sp.size] = {
      piecePriceNgn: koboToNgn(sp.piecePriceKobo),
      bundlePriceNgn: koboToNgn(sp.bundlePriceKobo),
      piecesPerBundle: sp.piecesPerBundle,
    };
  }

  const videoUrl = product.videoUrl?.trim();

  return {
    title: product.title,
    description: product.description,
    category: product.category,
    variants: product.variants,
    active: product.active,
    variantImagesByVariant,
    authenticityVideo: videoUrl
      ? { displayUrl: videoUrl, isLocal: false }
      : null,
    sizeLabels,
    sizeConfigs,
    cleaningPieceNgn: product.cleaningPricing
      ? koboToNgn(product.cleaningPricing.piecePriceKobo)
      : undefined,
    cleaningDozenNgn: product.cleaningPricing
      ? koboToNgn(product.cleaningPricing.dozenPriceKobo)
      : undefined,
  };
}

function formValuesToPayload(
  values: ProductFormValues,
  resolvedUrls: Record<string, string>,
  videoUrl: string,
) {
  const cleaning = isCleaningCategory(values.category);
  const variantImages = values.variants.map((variant) => ({
    variant,
    imageUrl: resolvedUrls[variant] ?? "",
  }));

  const base = {
    title: values.title,
    description: values.description,
    category: values.category,
    variants: values.variants,
    variantImages,
    videoUrl,
    active: values.active,
  };

  if (cleaning) {
    return {
      ...base,
      cleaningPricing: {
        piecePriceKobo: ngnToKobo(values.cleaningPieceNgn ?? 0),
        dozenPriceKobo: ngnToKobo(values.cleaningDozenNgn ?? 0),
      },
    };
  }

  const sizePricings: SizePricing[] = (values.sizeLabels ?? []).map((size) => {
    const cfg = values.sizeConfigs[size];
    return {
      size,
      piecePriceKobo: ngnToKobo(cfg?.piecePriceNgn ?? 0),
      bundlePriceKobo: ngnToKobo(cfg?.bundlePriceNgn ?? 0),
      piecesPerBundle: cfg?.piecesPerBundle ?? 1,
    };
  });

  return {
    ...base,
    sizePricings,
  };
}

function VariantImageUpload({
  variant,
  slot,
  onChange,
}: {
  variant: string;
  slot?: ImageSlot;
  onChange: (next?: ImageSlot) => void;
}) {
  const message = useAppMessage();
  const fileList: UploadFile[] = slot?.displayUrl
    ? [
        {
          uid: variant,
          name: slot.file?.name ?? `${variant}-image`,
          status: "done",
          url: slot.displayUrl,
          thumbUrl: slot.displayUrl,
        },
      ]
    : [];

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-700">
      <p className="mb-2 text-sm font-medium capitalize">{variant}</p>
      <Upload
        key={slot?.displayUrl ?? `${variant}-empty`}
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

function VariantImagesField({
  value,
  onChange,
  variants,
}: {
  value?: Record<string, ImageSlot>;
  onChange?: (next: Record<string, ImageSlot>) => void;
  variants: string[];
}) {
  const map = value ?? {};
  const mapRef = useRef(map);
  mapRef.current = map;

  useEffect(() => {
    if (!onChange) return;
    const staleKeys = Object.keys(map).filter((k) => !variants.includes(k));
    if (staleKeys.length === 0) return;
    const next: Record<string, ImageSlot> = {};
    for (const v of variants) {
      const slot = slotForVariant(map, v);
      if (slot) next[v] = slot;
    }
    for (const key of staleKeys) {
      revokeSlot(map[key]);
    }
    onChange(next);
  }, [variants, map, onChange]);

  useEffect(() => {
    return () => {
      for (const slot of Object.values(mapRef.current)) {
        revokeSlot(slot);
      }
    };
  }, []);

  if (variants.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        Add variants above to attach an image for each.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {variants.map((variant) => (
          <VariantImageUpload
            key={variant}
            variant={variant}
            slot={slotForVariant(map, variant)}
            onChange={(nextSlot) => {
              const next: Record<string, ImageSlot> = { ...map };
              if (nextSlot) {
                next[variant] = nextSlot;
              } else {
                delete next[variant];
                for (const key of Object.keys(next)) {
                  if (normalizeKey(key) === normalizeKey(variant)) {
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
        Each variant needs one photo. Images upload when you save — not when you
        pick a file.
      </p>
    </>
  );
}

function AuthenticityVideoField({
  value,
  onChange,
}: {
  value?: VideoSlot | null;
  onChange?: (next: VideoSlot | null) => void;
}) {
  const message = useAppMessage();
  const slot = value ?? undefined;
  const slotRef = useRef(slot);
  slotRef.current = slot;

  const fileList: UploadFile[] = slot?.displayUrl
    ? [
        {
          uid: "authenticity-video",
          name: slot.file?.name ?? "authenticity-video",
          status: "done",
          url: slot.displayUrl,
        },
      ]
    : [];

  useEffect(() => {
    return () => {
      revokeSlot(slotRef.current);
    };
  }, []);

  return (
    <div className="space-y-3">
      <Upload
        key={slot?.displayUrl ?? "video-empty"}
        fileList={fileList}
        maxCount={1}
        accept={ACCEPT_VIDEO_TYPES}
        beforeUpload={(file) => {
          const okType =
            ACCEPT_VIDEO_TYPES.split(",").includes(file.type) ||
            /\.(mp4|webm|mov|m4v)$/i.test(file.name);
          if (!okType) {
            message.error("Use MP4, WebM, or MOV");
            return Upload.LIST_IGNORE;
          }
          if (file.size > MAX_VIDEO_BYTES) {
            message.error("Video must be 5MB or smaller");
            return Upload.LIST_IGNORE;
          }
          const previewUrl = URL.createObjectURL(file);
          revokeSlot(slot);
          onChange?.({ displayUrl: previewUrl, file, isLocal: true });
          return false;
        }}
        onRemove={() => {
          revokeSlot(slot);
          onChange?.(null);
          return true;
        }}
      >
        {fileList.length >= 1 ? null : (
          <Button type="default">Upload authenticity video</Button>
        )}
      </Upload>
      {slot?.displayUrl ? (
        <video
          key={slot.displayUrl}
          src={slot.displayUrl}
          className="max-h-56 w-full max-w-md rounded-lg border border-neutral-200 bg-black object-contain"
          muted
          playsInline
          autoPlay
          loop
          controls
        />
      ) : null}
      <p className="text-xs text-neutral-500">
        Optional. Max 5MB (MP4, WebM, or MOV). Uploads when you save. Shown on
        the storefront as authenticity media.
      </p>
    </div>
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

  const selectedVariants: string[] = Form.useWatch("variants", form) ?? [];
  const selectedSizes: string[] = Form.useWatch("sizeLabels", form) ?? [];
  const category = Form.useWatch("category", form);
  const cleaning = isCleaningCategory(category);

  useEffect(() => {
    if (cleaning) return;
    for (const size of selectedSizes) {
      const cfg = form.getFieldValue(["sizeConfigs", size]);
      if (!cfg) {
        form.setFieldValue(["sizeConfigs", size], {
          piecePriceNgn: 0,
          bundlePriceNgn: 0,
          piecesPerBundle: 1,
        });
      }
    }
  }, [selectedSizes, cleaning, form]);

  const initialValues = useMemo(() => {
    if (initialProduct) {
      return productToFormValues(initialProduct);
    }
    return {
      active: true,
      variants: [],
      variantImagesByVariant: {},
      authenticityVideo: null,
      sizeLabels: [],
      sizeConfigs: {},
    };
  }, [initialProduct]);

  useEffect(() => {
    if (initialProduct) {
      form.setFieldsValue(productToFormValues(initialProduct));
    }
  }, [initialProduct, form]);

  async function onFinish(values: ProductFormValues) {
    const images = values.variantImagesByVariant ?? {};

    for (const v of values.variants) {
      const slot = slotForVariant(images, v);
      if (!slot?.displayUrl?.trim() && !slot?.file) {
        message.error(`Add an image for variant "${v}"`);
        return;
      }
    }

    if (isCleaningCategory(values.category)) {
      if (
        (values.cleaningPieceNgn ?? 0) <= 0 ||
        (values.cleaningDozenNgn ?? 0) <= 0
      ) {
        message.error("Enter piece and dozen prices greater than zero");
        return;
      }
    } else {
      if ((values.sizeLabels ?? []).length === 0) {
        message.error("Add at least one size");
        return;
      }
      for (const size of values.sizeLabels) {
        const cfg = values.sizeConfigs[size];
        if (!cfg || cfg.piecePriceNgn <= 0 || cfg.bundlePriceNgn <= 0) {
          message.error(`Enter piece and bundle prices for size "${size}"`);
          return;
        }
        if (!cfg.piecesPerBundle || cfg.piecesPerBundle < 1) {
          message.error(`Pieces per bundle must be at least 1 for "${size}"`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const resolvedUrls: Record<string, string> = {};
      for (const v of values.variants) {
        const slot = slotForVariant(images, v);
        if (!slot) throw new Error(`Missing image for variant "${v}"`);
        if (slot.file) {
          resolvedUrls[v] = await uploadProductImage(slot.file);
        } else {
          resolvedUrls[v] = slot.displayUrl;
        }
      }

      let videoUrl = "";
      const videoSlot = values.authenticityVideo;
      if (videoSlot?.file) {
        videoUrl = await uploadProductVideo(videoSlot.file);
      } else if (videoSlot?.displayUrl?.trim()) {
        videoUrl = videoSlot.displayUrl.trim();
      }

      const payload = formValuesToPayload(values, resolvedUrls, videoUrl);
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

      <Form.Item
        name="description"
        label="Description"
        rules={[{ required: true }]}
      >
        <Input.TextArea rows={4} />
      </Form.Item>

      <Form.Item name="category" label="Category" rules={[{ required: true }]}>
        <Select options={categorySelectOptions(initialProduct?.category)} />
      </Form.Item>

      <Form.Item
        name="variants"
        label="Variants"
        rules={[{ required: true, message: "Add at least one variant" }]}
        extra="Free-text labels (e.g. suede). Type and press Enter."
      >
        <Select mode="tags" placeholder="e.g. suede" tokenSeparators={[","]} />
      </Form.Item>

      <Form.Item name="active" label="Active" valuePropName="checked">
        <Switch />
      </Form.Item>

      <Form.Item
        name="variantImagesByVariant"
        label="Image per variant"
        required={selectedVariants.length > 0}
        initialValue={{}}
        rules={[
          {
            validator: async (
              _,
              val: Record<string, ImageSlot> | undefined,
            ) => {
              const variants: string[] = form.getFieldValue("variants") ?? [];
              if (variants.length === 0) return;
              const map = val ?? {};
              for (const v of variants) {
                const slot = slotForVariant(map, v);
                if (!slot?.displayUrl?.trim() && !slot?.file) {
                  throw new Error(`Add an image for variant "${v}"`);
                }
              }
            },
          },
        ]}
      >
        <VariantImagesField variants={selectedVariants} />
      </Form.Item>

      <Form.Item
        name="authenticityVideo"
        label="Authenticity video"
        initialValue={null}
      >
        <AuthenticityVideoField />
      </Form.Item>

      {cleaning ? (
        <div className="mb-6 rounded-lg border border-neutral-200 bg-neutral-50/80 p-4 dark:border-neutral-700 dark:bg-neutral-900/40">
          <p className="mb-3 text-sm font-semibold sm:text-base">
            Cleaning pricing
          </p>
          <p className="mb-3 text-xs text-neutral-500">
            Dozen is always 12 pieces. Delivery is fixed at 1–3 business days
            (Mon–Sat).
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Form.Item
              name="cleaningPieceNgn"
              label="Piece price (₦)"
              rules={[{ required: true, message: "Required" }]}
            >
              <InputNumber min={0} step={100} className="w-full!" />
            </Form.Item>
            <Form.Item
              name="cleaningDozenNgn"
              label="Dozen price (₦)"
              rules={[{ required: true, message: "Required" }]}
            >
              <InputNumber min={0} step={100} className="w-full!" />
            </Form.Item>
          </div>
        </div>
      ) : (
        <>
          <Form.Item
            name="sizeLabels"
            label="Sizes"
            rules={[{ required: true, message: "Add at least one size" }]}
            extra="Free-text dimensions (e.g. 2 x 5 ft, 60cm x 90cm). Type and press Enter."
          >
            <Select
              mode="tags"
              placeholder="e.g. 2 x 5 ft"
              tokenSeparators={[","]}
            />
          </Form.Item>

          {selectedSizes.map((size: string) => (
            <div
              key={size}
              className="mb-6 rounded-lg border border-neutral-200 bg-neutral-50/80 p-4 dark:border-neutral-700 dark:bg-neutral-900/40"
            >
              <p className="mb-3 text-sm font-semibold sm:text-base">
                Pricing — {size}
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <Form.Item
                  name={["sizeConfigs", size, "piecePriceNgn"]}
                  label="Piece price (₦)"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <InputNumber min={0} step={100} className="w-full!" />
                </Form.Item>
                <Form.Item
                  name={["sizeConfigs", size, "bundlePriceNgn"]}
                  label="Bundle price (₦)"
                  rules={[{ required: true, message: "Required" }]}
                >
                  <InputNumber min={0} step={100} className="w-full!" />
                </Form.Item>
                <Form.Item
                  name={["sizeConfigs", size, "piecesPerBundle"]}
                  label="Pieces per bundle"
                  rules={[
                    { required: true, message: "Required" },
                    { type: "number", min: 1, message: "At least 1" },
                  ]}
                >
                  <InputNumber min={1} className="w-full!" />
                </Form.Item>
              </div>
            </div>
          ))}
          <p className="mb-4 text-xs text-neutral-500">
            Delivery is fixed at 1–3 business days (Mon–Sat) for all products.
          </p>
        </>
      )}

      <Button
        type="primary"
        htmlType="submit"
        loading={submitting}
        block
        className="sm:inline-block sm:w-auto"
      >
        {mode === "create" ? "Create product" : "Save changes"}
      </Button>
    </Form>
  );
}
