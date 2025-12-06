import './Jobs.css';

const Opportunities = () => {
  return (
    <div className="opportunities-page">
      <div className="page-header">
        <h1>Opportunities</h1>
        <button className="btn-primary">🔄 Scan Now</button>
      </div>
      
      <div className="opportunities-content">
        <div className="empty-state">
          <span className="empty-icon">💰</span>
          <h3>No opportunities found</h3>
          <p>Start scanning to find arbitrage opportunities</p>
        </div>
      </div>
    </div>
  );
};

export default Opportunities;
