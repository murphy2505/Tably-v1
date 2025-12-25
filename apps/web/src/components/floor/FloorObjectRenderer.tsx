import React from "react";
import type { FloorObject, ZoneSettings } from "../../lib/floor/types";
import TableObject from "./TableObject";
import DecorObject from "./DecorObject";
import type { TableDTO } from "../../api/pos/tables";

type Props = {
  obj: FloorObject;
  scale: number;
  mode: "USE" | "EDIT";
  zoneSettings: ZoneSettings;
  tableById: Map<string, TableDTO>;
};

export default function FloorObjectRenderer({ obj, scale, mode, zoneSettings, tableById }: Props) {
  if (obj.kind === "TABLE") {
    const info = obj.tableId ? tableById.get(obj.tableId) || null : null;
    return <TableObject obj={obj} scale={scale} mode={mode} zoneSettings={zoneSettings} tableInfo={info} />;
  }
  return <DecorObject obj={obj} scale={scale} mode={mode} />;
}
