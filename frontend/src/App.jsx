import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import Workers from './pages/Workers';
import Opportunities from './pages/Opportunities';
import Settings from './pages/Settings';
import './App.css';

function App() {
  const [activeMenu, setActiveMenu] = useState('dashboard');

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard':
        return <Dashboard />;
      case 'jobs':
        return <Jobs />;
      case 'workers':
        return <Workers />;
      case 'opportunities':
        return <Opportunities />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="App">
      <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
