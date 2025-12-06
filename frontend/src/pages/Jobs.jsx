import './Jobs.css';

const Jobs = () => {
  return (
    <div className="jobs-page">
      <div className="page-header">
        <h1>Jobs</h1>
        <button className="btn-primary">+ New Job</button>
      </div>
      
      <div className="jobs-content">
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <h3>No active jobs</h3>
          <p>Create your first job to get started</p>
        </div>
      </div>
    </div>
  );
};

export default Jobs;
