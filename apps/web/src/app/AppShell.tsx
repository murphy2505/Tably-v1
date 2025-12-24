import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { NAV, filterByRole } from "./nav";

export default function AppShell() {
  const [expanded, setExpanded] = useState(false);
  const location = useLocation();
  const nav = filterByRole(NAV);

  return (
    <div className={`app-shell ${expanded ? "rail-expanded" : "rail-collapsed"}`}>
      {/* Left rail */}
      <aside className="rail">
        <div className="rail-top">
          <div
            className="rail-hamburger-logo"
            role="button"
            tabIndex={0}
            onClick={() => setExpanded((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setExpanded((v) => !v);
              }
            }}
            aria-label={expanded ? "Menu inklappen" : "Menu uitklappen"}
          >
            <span className="rail-hamburger-icon" aria-hidden>
              {expanded ? (
                <X size={20} strokeWidth={1.75} />
              ) : (
                <Menu size={20} strokeWidth={1.75} />
              )}
            </span>
            <Link
              to="/pos"
              className="rail-logo-text"
              onClick={(e) => e.stopPropagation()}
            >
              Tably
            </Link>
          </div>
        </div>

        <nav className="rail-nav">
          {nav.map((item) => {
            const active =
              location.pathname === item.path ||
              location.pathname.startsWith(item.path + "/");

            return (
              <div key={item.path}>
                <NavLink
                  to={item.path}
                  className={() => `rail-item ${active ? "rail-active" : ""}`}
                >
                  <span className="rail-icon" aria-hidden>
                    <item.icon size={20} strokeWidth={1.75} />
                  </span>

                  {expanded && (
                    <span className="rail-label">{item.label}</span>
                  )}
                </NavLink>

                {expanded && item.children && location.pathname.startsWith(item.path) && (
                  <div className="rail-children">
                    {item.children.map((c) => (
                      <NavLink
                        key={c.path}
                        to={c.path}
                        className={({ isActive }) => `rail-child ${isActive ? "rail-active" : ""}`}
                      >
                        <span className="rail-icon" aria-hidden>
                          <c.icon size={18} strokeWidth={1.75} />
                        </span>
                        <span className="rail-label">{c.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
