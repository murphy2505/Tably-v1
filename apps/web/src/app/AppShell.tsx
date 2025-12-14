import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { CreditCard } from "lucide-react";
import { NAV, filterByRole, userRole } from "./nav";

export default function AppShell() {
  const [expanded, setExpanded] = useState(false);
  const location = useLocation();
  const nav = filterByRole(NAV, userRole);

  return (
    <div className={`app-shell ${expanded ? "rail-expanded" : "rail-collapsed"}`}>
      {/* Left rail */}
      <aside className="rail">
        <div className="rail-top">
          <Link to="/pos" className="rail-logo" aria-label="Naar kassa">
            <CreditCard size={20} strokeWidth={1.75} />
          </Link>

          <button
            className="rail-toggle"
            onClick={() => setExpanded((v) => !v)}
            aria-label="Toggle menu"
          >
            {expanded ? "«" : "»"}
          </button>
        </div>

        <nav className="rail-nav">
          {nav.map((item) => {
            const active =
              location.pathname === item.path ||
              location.pathname.startsWith(item.path + "/");

            return (
              <div key={item.path}>
                <NavLink
                  to={item.path === "/assortiment" ? "/assortiment/products" : item.path}
                  className={() =>
                    `rail-item ${active ? "rail-active" : ""}`
                  }
                >
                  <span className="rail-icon" aria-hidden>
                    <item.icon size={20} strokeWidth={1.75} />
                  </span>

                  {expanded && (
                    <span className="rail-label">{item.label}</span>
                  )}
                </NavLink>

                {/* Subnav */}
                {expanded &&
                  item.children &&
                  location.pathname.startsWith("/assortiment") && (
                    <div className="rail-children">
                      {item.children.map((c) => (
                        <NavLink
                          key={c.path}
                          to={c.path}
                          className={({ isActive }) =>
                            `rail-child ${isActive ? "rail-active" : ""}`
                          }
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
