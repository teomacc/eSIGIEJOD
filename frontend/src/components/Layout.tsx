import React, { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/api/client';
import { MENU_ITEMS, ADMIN_ITEMS, hasAccessToRoute, getRoleLabel, getDataScopeDescription } from '@/utils/permissions';
import '@/styles/Layout.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 900px)').matches);
  const [sidebarOpen, setSidebarOpen] = useState(() => !window.matchMedia('(max-width: 900px)').matches);
  const [churchName, setChurchName] = useState<string>('');
  const [churchCode, setChurchCode] = useState<string>('');

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 900px)');
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      setSidebarOpen(!e.matches);
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Carregar info da igreja para exibir no cabeçalho
  useEffect(() => {
    const loadChurch = async () => {
      if (!user?.churchId) {
        setChurchName('Acesso Global');
        setChurchCode('');
        return;
      }
      try {
        const { data } = await apiClient.get(`/churches/${user.churchId}`);
        setChurchName(data?.nome || 'Igreja');
        setChurchCode(data?.codigo || user.churchId.slice(0, 6));
      } catch (error) {
        setChurchName('Igreja Local');
        setChurchCode(user.churchId.slice(0, 6));
      }
    };

    loadChurch();
  }, [user?.churchId]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  // Filtrar items baseado nos roles do utilizador
  const visibleMenuItems = MENU_ITEMS.filter(
    (item) => user && hasAccessToRoute(user.roles, item.roles)
  );

  const visibleAdminItems = ADMIN_ITEMS.filter(
    (item) => user && hasAccessToRoute(user.roles, item.roles)
  );

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

        {/* Informações do utilizador e chiesa */}
        {user && (
          <div className="layout-user-info">
            <div className="user-card">
              <div className="user-details">
                <p className="user-name">{user.nomeCompleto || user.name || user.username}</p>
                <p className="user-role">{user.roles.map(getRoleLabel).join(', ')}</p>
                {churchName && churchName !== 'Acesso Global' && (
                  <p className="user-church">🏛️ {churchName}</p>
                )}
              </div>
              <button className="user-logout" onClick={logout} title="Sair">
                🚪
              </button>
            </div>
          </div>
        )}

        <div className="layout-section">
          <p className="layout-section-title">Menu Principal</p>
          <nav className="layout-nav">{renderLinks(visibleMenuItems)}</nav>
        </div>

        {visibleAdminItems.length > 0 && (
          <div className="layout-section">
            <p className="layout-section-title">Admin</p>
            <nav className="layout-nav">{renderLinks(visibleAdminItems)}</nav>
          </div>
        )}
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
