import React from 'react';
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
  { to: '/igrejas', label: 'Igrejas', icon: '🏛️' },
  { to: '/fundos', label: 'Fundos', icon: '🏦' },
  { to: '/configuracoes', label: 'Configurações Globais', icon: '⚙️' },
  { to: '/transferencias', label: 'Transferências', icon: '🔁' },
];

export default function Layout() {
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
    <div className="layout-shell">
      <aside className="layout-sidebar">
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

      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  );
}
