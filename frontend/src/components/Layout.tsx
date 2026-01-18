import React, { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import '@/styles/Layout.css';

const MENU_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/receitas', label: 'Receitas', icon: '💰' },
  { to: '/requisitions', label: 'Requisições', icon: '📝' },
  { to: '/despesas', label: 'Despesas', icon: '💸' },
  { to: '/audit', label: 'Auditoria', icon: '🕵️' },
  { to: '/reports', label: 'Relatórios', icon: '📑' },
];

const ADMIN_ITEMS = [
  { to: '/igrejas', label: 'Gestão de Igrejas', icon: '🏛️' },
  { to: '/utilizadores', label: 'Utilizadores', icon: '👥' },
  { to: '/fundos', label: 'Fundos', icon: '🏦' },
  { to: '/configuracoes', label: 'Configurações Globais', icon: '⚙️' },
  { to: '/transferencias', label: 'Transferências', icon: '🔁' },
];

export default function Layout() {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 900px)').matches);
  const [sidebarOpen, setSidebarOpen] = useState(() => !window.matchMedia('(max-width: 900px)').matches);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 900px)');
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      setSidebarOpen(!e.matches); // close on mobile, open on desktop
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  const renderLinks = (items: typeof MENU_ITEMS) =>
    items.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        className={({ isActive }) =>
          `layout-nav-item ${isActive ? 'active' : ''}`
        }
      >
        <span className="layout-nav-icon">{item.icon}</span>
        <span>{item.label}</span>
      </NavLink>
    ));

  return (
    <div className={`layout-shell ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <aside className={`layout-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="layout-logo">
          <h2>eSIGIEJOD</h2>
          <p>Gestão Financeira</p>
        </div>

        <div className="layout-section">
          <p className="layout-section-title">Menu Principal</p>
          <nav className="layout-nav">{renderLinks(MENU_ITEMS)}</nav>
        </div>

        <div className="layout-section">
          <p className="layout-section-title">Admin</p>
          <nav className="layout-nav">{renderLinks(ADMIN_ITEMS)}</nav>
        </div>
      </aside>

      {isMobile && sidebarOpen && <div className="layout-backdrop" onClick={toggleSidebar} />}

      <main className="layout-main">
        <div className="layout-topbar">
          {isMobile && (
            <button className="layout-burger" onClick={toggleSidebar} aria-label="Abrir menu">
              ☰
            </button>
          )}
        </div>
        <Outlet />
      </main>
    </div>
  );
}
