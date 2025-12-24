import { NavLink, Outlet, useLocation, Navigate } from "react-router-dom";

export default function SettingsHardwareShell() {
  const loc = useLocation();
  const baseActive = loc.pathname === "/settings/hardware";
  return (
    <div className="page settings-page">
      <h1>Instellingen • Hardware</h1>
      <div className="settings-tabs">
        <NavLink to="/settings/hardware" className={({ isActive }) => `settings-tab ${baseActive ? "active" : ""}`}>Overzicht</NavLink>
        <NavLink to="/settings/hardware/printers" className={({ isActive }) => `settings-tab ${isActive ? "active" : ""}`}>Bonnenprinters</NavLink>
      </div>
      <div className="settings-content">
        {/* Default redirect to printers */}
        {baseActive ? <Navigate to="/settings/hardware/printers" replace /> : <Outlet />}
      </div>
    </div>
  );
}
