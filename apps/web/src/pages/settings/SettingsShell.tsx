import { NavLink, Outlet, useLocation } from "react-router-dom";
import { API_ORIGIN } from "../../services/http";

export default function SettingsShell() {
  const loc = useLocation();
  const baseActive = loc.pathname === "/settings";

  return (
    <div className="page settings-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Instellingen</h1>
        <div style={{ fontSize: 12, padding: "4px 8px", borderRadius: 999, background: "rgba(16,185,129,0.12)", color: "#047857", border: "1px solid rgba(16,185,129,0.3)" }}>
          {(() => {
            const origin = API_ORIGIN || "(relatief)";
            const isLan = /^(http:\/\/)?(192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(origin) || origin.includes("localhost") || origin.includes("127.0.0.1");
            return isLan ? `Lokaal (LAN) — API: ${origin.replace(/^https?:\/\//, "")}` : `Waarschuwing: API niet op LAN (${origin})`;
          })()}
        </div>
      </div>
      <div className="settings-tabs">
        <NavLink to="/settings" className={({ isActive }) => `settings-tab ${baseActive ? "active" : ""}`}>Algemeen</NavLink>
        <NavLink to="/settings/hardware" className={({ isActive }) => `settings-tab ${isActive ? "active" : ""}`}>Hardware</NavLink>
      </div>
      <div className="settings-content">
        <Outlet />
      </div>
    </div>
  );
}
