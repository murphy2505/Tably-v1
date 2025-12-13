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

export type ActivePosMenuResponse = { data: PosMenuDTO | null };
