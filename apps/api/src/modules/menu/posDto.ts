import type { Menu, MenuItem, Product, ProductVariant, Course } from "@prisma/client";

export type PosProductDTO = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  vatRateBps: number;
  allergenTags: any | null;
};

export type PosVariantDTO = {
  id: string;
  name: string;
} | null;

export type PosCourseDTO = {
  id: string;
  name: string;
  shortLabel: string | null;
} | null;

export type PosMenuItemDTO = {
  id: string;
  sortOrder: number;
  priceCents: number;
  product: PosProductDTO;
  variant: PosVariantDTO;
  course: PosCourseDTO;
};

export type PosMenuDTO = {
  id: string;
  name: string;
  slug: string;
  channel: string;
  layoutType: string;
  columns: number;
  items: PosMenuItemDTO[];
};

export function mapActivePosMenu(menu: Menu, items: Array<MenuItem & { product: Product; variant: ProductVariant | null; course: Course | null }>): PosMenuDTO {
  const dtoItems: PosMenuItemDTO[] = items
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((mi) => {
      const priceCents = mi.priceOverrideCents ?? mi.variant?.priceOverrideCents ?? mi.product.basePriceCents;
      const product: PosProductDTO = {
        id: mi.product.id,
        name: mi.product.name,
        description: mi.product.description ?? null,
        imageUrl: mi.product.imageUrl ?? null,
        vatRateBps: mi.product.vatRateBps,
        allergenTags: mi.product.allergenTags ?? null,
      };
      const variant: PosVariantDTO = mi.variant ? { id: mi.variant.id, name: mi.variant.name } : null;
      const course: PosCourseDTO = mi.course ? { id: mi.course.id, name: mi.course.name, shortLabel: mi.course.shortLabel ?? null } : null;
      return {
        id: mi.id,
        sortOrder: mi.sortOrder,
        priceCents: priceCents ?? mi.product.basePriceCents,
        product,
        variant,
        course,
      };
    });

  return {
    id: menu.id,
    name: menu.name,
    slug: menu.slug,
    channel: menu.channel,
    layoutType: menu.layoutType,
    columns: menu.columns,
    items: dtoItems,
  };
}
