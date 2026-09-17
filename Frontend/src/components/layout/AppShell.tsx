import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export function AppShell() {
  return (
    <div className="stack" style={{ minHeight: '100%' }}>
      <Navbar />
      <main className="grow">
        <Outlet />
      </main>
      <footer style={{ borderTop: '1px solid var(--line)', marginTop: 48 }}>
        <div className="container row" style={{ height: 56, justifyContent: 'space-between' }}>
          <span className="mono">ProjectSphere · a showcase for the software you build</span>
          <span className="mono">v1.0</span>
        </div>
      </footer>
    </div>
  );
}
