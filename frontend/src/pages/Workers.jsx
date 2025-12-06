import './Jobs.css';

const Workers = () => {
  return (
    <div className="workers-page">
      <div className="page-header">
        <h1>Workers</h1>
        <button className="btn-primary">+ Add Worker</button>
      </div>
      
      <div className="workers-content">
        <div className="empty-state">
          <span className="empty-icon">🤖</span>
          <h3>No active workers</h3>
          <p>Add workers to start processing jobs</p>
        </div>
      </div>
    </div>
  );
};

export default Workers;
