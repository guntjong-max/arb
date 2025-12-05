// Configuration
const API_BASE = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : 'http://engine:3000';

// State
let currentPage = 'dashboard';
let workers = [];
let matches = [];
let credentials = [];
let logs = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    loadDashboard();
    
    // Auto-refresh every 30 seconds
    setInterval(() => {
        if (currentPage === 'dashboard' || currentPage === 'workers' || currentPage === 'odds') {
            refreshCurrentPage();
        }
    }, 30000);
});

// Navigation
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            navigateTo(page);
        });
    });
}

function navigateTo(page) {
    currentPage = page;
    
    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });
    
    // Update page visibility
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    document.getElementById(`${page}-page`).classList.add('active');
    
    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        workers: 'Workers Management',
        odds: 'Live Odds Monitor',
        credentials: 'Credentials Management',
        logs: 'System Logs'
    };
    document.getElementById('page-title').textContent = titles[page];
    
    // Load page data
    refreshCurrentPage();
}

function refreshCurrentPage() {
    switch(currentPage) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'workers':
            loadWorkers();
            break;
        case 'odds':
            loadOdds();
            break;
        case 'credentials':
            loadCredentials();
            break;
        case 'logs':
            loadLogs();
            break;
    }
}

// Dashboard
async function loadDashboard() {
    try {
        const [workersRes, matchesRes, oddsRes] = await Promise.all([
            fetch(`${API_BASE}/api/v1/workers`),
            fetch(`${API_BASE}/api/v1/matches?limit=10`),
            fetch(`${API_BASE}/api/v1/odds/latest?limit=100`)
        ]);
        
        const workersData = await workersRes.json();
        const matchesData = await matchesRes.json();
        const oddsData = await oddsRes.json();
        
        // Update stats
        document.getElementById('stat-workers').textContent = 
            workersData.data?.filter(w => w.status === 'running').length || 0;
        document.getElementById('stat-matches').textContent = matchesData.count || 0;
        document.getElementById('stat-odds').textContent = oddsData.count || 0;
        document.getElementById('stat-update').textContent = new Date().toLocaleTimeString();
        
        // Worker summary
        const summary = document.getElementById('worker-summary');
        if (workersData.data && workersData.data.length > 0) {
            summary.innerHTML = workersData.data.map(w => `
                <div class="stat-card mb-20">
                    <h3>${w.worker_name}</h3>
                    <p><strong>Sportsbook:</strong> ${w.sportsbook_name}</p>
                    <p><strong>Status:</strong> <span class="badge badge-${getStatusBadge(w.status)}">${w.status}</span></p>
                    <p><strong>Scrapes:</strong> ${w.total_scrapes || 0}</p>
                    <p><strong>Last Heartbeat:</strong> ${formatDate(w.last_heartbeat)}</p>
                </div>
            `).join('');
        } else {
            summary.innerHTML = '<div class="empty-state"><h3>No workers found</h3><p>Add workers to get started</p></div>';
        }
        
    } catch (error) {
        console.error('Dashboard load error:', error);
        showError('Failed to load dashboard');
    }
}

// Workers
async function loadWorkers() {
    try {
        const res = await fetch(`${API_BASE}/api/v1/workers`);
        const data = await res.json();
        workers = data.data || [];
        
        const tbody = document.getElementById('workers-table-body');
        if (workers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No workers found</td></tr>';
            return;
        }
        
        tbody.innerHTML = workers.map(w => `
            <tr>
                <td>${w.worker_name}</td>
                <td>${w.sportsbook_name}</td>
                <td><span class="badge badge-${getStatusBadge(w.status)}">${w.status}</span></td>
                <td>${formatDate(w.last_heartbeat)}</td>
                <td>${w.total_scrapes || 0}</td>
                <td>${((w.total_errors || 0) / Math.max(w.total_scrapes || 1, 1) * 100).toFixed(1)}%</td>
                <td>
                    <button class="btn btn-small btn-success" onclick="controlWorker('${w.id}', 'start')">Start</button>
                    <button class="btn btn-small btn-danger" onclick="controlWorker('${w.id}', 'stop')">Stop</button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Workers load error:', error);
        showError('Failed to load workers');
    }
}

async function controlWorker(workerId, action) {
    try {
        const res = await fetch(`${API_BASE}/api/v1/workers/${workerId}/control`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
        });
        
        const data = await res.json();
        if (data.success) {
            showSuccess(`Worker ${action} command sent`);
            loadWorkers();
        } else {
            showError(data.error || 'Failed to control worker');
        }
    } catch (error) {
        console.error('Control worker error:', error);
        showError('Failed to control worker');
    }
}

// Odds
async function loadOdds() {
    try {
        const sportsbook = document.getElementById('odds-sportsbook')?.value || '';
        const league = document.getElementById('odds-league')?.value || '';
        
        let url = `${API_BASE}/api/v1/matches?limit=50`;
        if (sportsbook) url += `&sportsbook=${sportsbook}`;
        if (league) url += `&league=${league}`;
        
        const res = await fetch(url);
        const data = await res.json();
        matches = data.data || [];
        
        const tbody = document.getElementById('odds-table-body');
        if (matches.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No odds available</td></tr>';
            return;
        }
        
        const rows = [];
        matches.forEach(match => {
            (match.markets || []).forEach(market => {
                const odds = market.odds || [];
                const homeOdds = odds.find(o => o.selection === 'home')?.odds_decimal || '-';
                const drawOdds = odds.find(o => o.selection === 'draw')?.odds_decimal || '-';
                const awayOdds = odds.find(o => o.selection === 'away')?.odds_decimal || '-';
                const lastUpdated = odds[0]?.last_updated || match.updated_at;
                
                rows.push(`
                    <tr>
                        <td><strong>${match.home_team}</strong> vs <strong>${match.away_team}</strong></td>
                        <td>${match.league}</td>
                        <td>${market.market_name}</td>
                        <td class="odds-cell">${homeOdds}</td>
                        <td class="odds-cell">${drawOdds}</td>
                        <td class="odds-cell">${awayOdds}</td>
                        <td>${formatDate(lastUpdated)}</td>
                    </tr>
                `);
            });
        });
        
        tbody.innerHTML = rows.join('');
        
    } catch (error) {
        console.error('Odds load error:', error);
        showError('Failed to load odds');
    }
}

// Credentials
async function loadCredentials() {
    try {
        const res = await fetch(`${API_BASE}/api/v1/credentials`);
        const data = await res.json();
        credentials = data.data || [];
        
        const tbody = document.getElementById('credentials-table-body');
        if (credentials.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No credentials found</td></tr>';
            return;
        }
        
        tbody.innerHTML = credentials.map(c => `
            <tr>
                <td>${c.sportsbook_name}</td>
                <td>${c.username}</td>
                <td><span class="badge badge-${c.active ? 'success' : 'danger'}">${c.active ? 'Active' : 'Inactive'}</span></td>
                <td>${formatDate(c.last_login_at)}</td>
                <td>
                    <button class="btn btn-small btn-warning" onclick="editCredential('${c.id}')">Edit</button>
                    <button class="btn btn-small btn-danger" onclick="deleteCredential('${c.id}')">Delete</button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Credentials load error:', error);
        showError('Failed to load credentials');
    }
}

function showAddCredentialModal() {
    document.getElementById('credential-modal').classList.add('show');
}

function closeModal() {
    document.getElementById('credential-modal').classList.remove('show');
    document.getElementById('credential-form').reset();
}

async function submitCredential(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData);
    
    try {
        const res = await fetch(`${API_BASE}/api/v1/credentials`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await res.json();
        if (result.success) {
            showSuccess('Credential added successfully');
            closeModal();
            loadCredentials();
        } else {
            showError(result.error || 'Failed to add credential');
        }
    } catch (error) {
        console.error('Submit credential error:', error);
        showError('Failed to add credential');
    }
}

async function deleteCredential(id) {
    if (!confirm('Are you sure you want to delete this credential?')) return;
    
    try {
        const res = await fetch(`${API_BASE}/api/v1/credentials/${id}`, {
            method: 'DELETE'
        });
        
        const data = await res.json();
        if (data.success) {
            showSuccess('Credential deleted');
            loadCredentials();
        } else {
            showError(data.error || 'Failed to delete credential');
        }
    } catch (error) {
        console.error('Delete credential error:', error);
        showError('Failed to delete credential');
    }
}

// Logs
async function loadLogs() {
    try {
        const level = document.getElementById('logs-level')?.value || '';
        
        let url = `${API_BASE}/api/v1/logs?limit=100`;
        if (level) url += `&level=${level}`;
        
        const res = await fetch(url);
        const data = await res.json();
        logs = data.data || [];
        
        const container = document.getElementById('logs-container');
        if (logs.length === 0) {
            container.innerHTML = '<div class="empty-state"><h3>No logs found</h3></div>';
            return;
        }
        
        container.innerHTML = logs.map(log => `
            <div class="log-entry ${log.level}">
                <span class="log-timestamp">${formatDate(log.created_at)}</span>
                <span class="log-level">[${log.level.toUpperCase()}]</span>
                <span>${log.message}</span>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Logs load error:', error);
        showError('Failed to load logs');
    }
}

function clearLogs() {
    document.getElementById('logs-container').innerHTML = '';
}

// Utilities
function getStatusBadge(status) {
    const badges = {
        running: 'success',
        stopped: 'danger',
        paused: 'warning',
        error: 'danger'
    };
    return badges[status] || 'info';
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString();
}

function showSuccess(message) {
    // Simple alert for now - can be replaced with toast notification
    alert(message);
}

function showError(message) {
    alert('Error: ' + message);
}

// Make functions global
window.refreshCurrentPage = refreshCurrentPage;
window.controlWorker = controlWorker;
window.loadOdds = loadOdds;
window.loadLogs = loadLogs;
window.showAddCredentialModal = showAddCredentialModal;
window.closeModal = closeModal;
window.submitCredential = submitCredential;
window.deleteCredential = deleteCredential;
window.clearLogs = clearLogs;
