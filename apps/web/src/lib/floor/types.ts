export type ZoneSettings = {
  backgroundTint?: string; // e.g. #f3f4f6
  gridEnabled?: boolean;
  snapEnabled?: boolean;
  showAmountsOnTables?: boolean;
  showNamesOnTables?: boolean;
  defaultTableShape?: "RECT" | "ROUND";
  baseWidth?: number; // canvas reference width used when saving
  baseHeight?: number; // canvas reference height used when saving
};

export type Zone = {
  id: string;
  name: string;
  sortOrder?: number;
  settings?: ZoneSettings;
};

export type FloorObjectKind = "TABLE" | "DECOR";
export type DecorSubtype = "BAR" | "PLANT" | "WALL" | "TEXT" | "DOOR" | "COUNTER";
export type TableShape = "RECT" | "ROUND";

export type FloorObjectMeta = {
  seats?: number;
  shape?: TableShape;
  color?: string;
  note?: string;
};

export type FloorObject = {
  id: string;
  zoneId: string;
  kind: FloorObjectKind;
  subtype?: DecorSubtype; // for DECOR
  label?: string; // e.g. T3 or Bar
  x: number; // pixels in base canvas
  y: number; // pixels in base canvas
  w: number; // pixels in base canvas
  h: number; // pixels in base canvas
  rotation?: number;
  tableId?: string | null;
  meta?: FloorObjectMeta;
};
