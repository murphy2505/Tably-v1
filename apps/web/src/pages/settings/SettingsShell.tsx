import { NavLink, Outlet, useLocation } from "react-router-dom";

export default function SettingsShell() {
  const loc = useLocation();
  const baseActive = loc.pathname === "/settings";

  return (
    <div className="page settings-page">
      <h1>Instellingen</h1>
      <div className="settings-tabs">
        <NavLink to="/settings" className={({ isActive }) => `settings-tab ${baseActive ? "active" : ""}`}>Algemeen</NavLink>
        <NavLink to="/settings/printers" className={({ isActive }) => `settings-tab ${isActive ? "active" : ""}`}>Printers</NavLink>
        <NavLink to="/settings/print-routes" className={({ isActive }) => `settings-tab ${isActive ? "active" : ""}`}>Routes</NavLink>
        <NavLink to="/settings/print-configs" className={({ isActive }) => `settings-tab ${isActive ? "active" : ""}`}>Print configuraties</NavLink>
      </div>
      <div className="settings-content">
        <Outlet />
      </div>
    </div>
  );
}
