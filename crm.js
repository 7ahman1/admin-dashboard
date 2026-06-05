// CRM Dashboard JavaScript
let currentEditingLeadId = null;
let allLeads = [];
let filteredLeads = [];
let syncInterval = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  initializeEventListeners();
  await initializeDatabase();
  await syncBookingsToLeads();
  await loadLeads();
  updateDashboard();
  
  // Auto-sync bookings every 30 seconds
  syncInterval = setInterval(syncBookingsToLeads, 30000);
});

// Initialize Event Listeners
function initializeEventListeners() {
  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (item.getAttribute('href') !== '#' && item.getAttribute('href') !== 'index.html') {
        e.preventDefault();
      }
      if (item.getAttribute('data-section')) {
        e.preventDefault();
        switchSection(item.getAttribute('data-section'));
      }
    });
  });

  // Add Lead Form
  document.getElementById('add-lead-form').addEventListener('submit', handleAddLead);

  // Edit Lead Form
  document.getElementById('edit-lead-form').addEventListener('submit', handleEditLead);

  // Delete Button
  document.getElementById('delete-btn').addEventListener('click', handleDeleteLead);

  // Status Filter
  document.getElementById('status-filter').addEventListener('change', filterLeads);

  // Search
  document.getElementById('search-input').addEventListener('input', searchLeads);

  // Export Button
  document.getElementById('export-btn').addEventListener('click', exportLeadsToCSV);

  // Sync Button
  document.getElementById('sync-btn').addEventListener('click', handleManualSync);

  // Modal Close
  document.querySelector('.modal-close').addEventListener('click', closeEditModal);
  document.getElementById('edit-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('edit-modal')) {
      closeEditModal();
    }
  });
}

// Initialize Database (Create table if not exists)
async function initializeDatabase() {
  if (!client) {
    console.warn('Supabase client not initialized');
    return;
  }

  try {
    // Check if leads table exists
    const { data: leadsData, error: leadsError } = await client.from('leads').select('*').limit(1);
    
    if (leadsError && leadsError.code === 'PGRST205') {
      console.error('❌ Leads table not found. Please create it in Supabase using the CRM-SETUP.md instructions');
      showNotification('⚠️ Leads table not found. Check console for setup instructions.', 'error');
      return;
    }
    
    if (!leadsError) {
      console.log('✅ Leads table found and accessible');
    }

    // Check if bookings table exists
    const { data: bookingsData, error: bookingsError } = await client.from('bookings').select('*').limit(1);
    
    if (bookingsError && bookingsError.code === 'PGRST205') {
      console.warn('⚠️ Bookings table not found. Existing bookings will not sync.');
    } else if (!bookingsError) {
      console.log('✅ Bookings table found and accessible');
      
      // Check if new columns exist
      const { data: sample } = await client.from('bookings').select('phone, booking_date, booking_time').limit(1);
      if (sample && sample.length > 0) {
        console.log('✅ New booking fields (phone, date, time) are available');
      }
    }
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

// Sync bookings from "bookings" table to "leads" table
async function syncBookingsToLeads() {
  if (!client) {
    console.warn('Supabase client not available for sync');
    return;
  }

  try {
    // Fetch all bookings
    const { data: bookings, error: bookingsError } = await client
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return;
    }

    if (!bookings || bookings.length === 0) {
      console.log('No bookings to sync');
      return;
    }

    console.log(`Found ${bookings.length} bookings to check`);

    // Get existing leads to check for duplicates (use id as source indicator)
    const { data: existingLeads, error: leadsError } = await client
      .from('leads')
      .select('*');

    if (leadsError) {
      console.error('Error fetching existing leads:', leadsError);
      return;
    }

    // Convert bookings to leads and check for duplicates
    const leadsToInsert = [];
    let syncedCount = 0;
    
    bookings.forEach(booking => {
      // Check if this booking already exists as a lead
      // Match by email + service (more flexible for existing bookings)
      const isDuplicate = existingLeads.some(lead =>
        lead.email.toLowerCase() === (booking.email || '').toLowerCase() &&
        lead.service === booking.service
      );

      if (!isDuplicate && booking.name && booking.email && booking.service) {
        // Build remarks with booking date/time if available
        let remarks = booking.remarks ? booking.remarks : '';
        if (booking.booking_date || booking.booking_time) {
          const dateStr = booking.booking_date || '';
          const timeStr = booking.booking_time || '';
          const dateTimeStr = dateStr && timeStr ? `${dateStr} at ${timeStr}` : (dateStr || timeStr || '');
          remarks = remarks ? `${remarks}\n📅 Preferred: ${dateTimeStr}` : `📅 Booked for: ${dateTimeStr}`;
        }

        const leadData = {
          name: booking.name,
          email: booking.email,
          phone: booking.phone || null,
          service: booking.service,
          status: 'pending',
          company: null,
          budget: null,
          remarks: remarks || `From booking - ${booking.service}`,
          followup_date: null,
          created_at: booking.created_at
        };
        
        leadsToInsert.push(leadData);
        console.log(`✓ Will sync: ${booking.name} (${booking.email}) - ${booking.service}`);
        syncedCount++;
      } else if (isDuplicate) {
        console.log(`⊘ Skipping duplicate: ${booking.email} - ${booking.service}`);
      }
    });

    console.log(`Found ${syncedCount} bookings to convert to leads`);

    // Insert new leads if any
    if (leadsToInsert.length > 0) {
      const { data: insertedLeads, error: insertError } = await client
        .from('leads')
        .insert(leadsToInsert)
        .select();

      if (insertError) {
        console.error('Error inserting leads from bookings:', insertError);
        showNotification(`Error syncing bookings: ${insertError.message}`, 'error');
      } else {
        console.log(`Successfully synced ${insertedLeads.length} new leads from bookings`);
        showNotification(`✓ Synced ${insertedLeads.length} bookings as leads`, 'success');
      }
    } else {
      console.log('All bookings are already in leads');
    }
  } catch (err) {
    console.error('Error syncing bookings:', err);
    showNotification(`Sync error: ${err.message}`, 'error');
  }
}

// Load Leads from Supabase
async function loadLeads() {
  try {
    if (!client) {
      console.warn('Supabase client not initialized');
      showLocalLeads();
      return;
    }

    const { data, error } = await client
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading leads:', error);
      showLocalLeads();
      return;
    }

    allLeads = data || [];
    filteredLeads = [...allLeads];
    renderLeadsTable();
    updateDashboard();
  } catch (err) {
    console.error('Error:', err);
    showLocalLeads();
  }
}

// Show leads from localStorage if Supabase fails
function showLocalLeads() {
  const localLeads = JSON.parse(localStorage.getItem('crm_leads') || '[]');
  allLeads = localLeads;
  filteredLeads = [...allLeads];
  renderLeadsTable();
}

// Add Lead
async function handleAddLead(e) {
  e.preventDefault();

  const leadData = {
    name: document.getElementById('lead-name').value,
    email: document.getElementById('lead-email').value,
    phone: document.getElementById('lead-phone').value || null,
    service: document.getElementById('lead-service').value,
    status: document.getElementById('lead-status').value,
    company: document.getElementById('lead-company').value || null,
    budget: parseFloat(document.getElementById('lead-budget').value) || null,
    remarks: document.getElementById('lead-remarks').value || null,
    followup_date: document.getElementById('lead-followup').value || null
  };

  try {
    if (client) {
      const { data, error } = await client
        .from('leads')
        .insert([leadData])
        .select();

      if (error) throw error;
      allLeads.unshift(data[0]);
    } else {
      leadData.id = Date.now();
      leadData.created_at = new Date().toISOString();
      allLeads.unshift(leadData);
      localStorage.setItem('crm_leads', JSON.stringify(allLeads));
    }

    filteredLeads = [...allLeads];
    renderLeadsTable();
    updateDashboard();
    document.getElementById('add-lead-form').reset();
    switchSection('leads');
    showNotification('Lead added successfully!', 'success');
  } catch (error) {
    console.error('Error adding lead:', error);
    showNotification('Error adding lead', 'error');
  }
}

// Edit Lead
async function handleEditLead(e) {
  e.preventDefault();

  const leadId = document.getElementById('edit-lead-id').value;
  const updates = {
    name: document.getElementById('edit-name').value,
    email: document.getElementById('edit-email').value,
    phone: document.getElementById('edit-phone').value || null,
    service: document.getElementById('edit-service').value,
    status: document.getElementById('edit-status').value,
    company: document.getElementById('edit-company').value || null,
    budget: parseFloat(document.getElementById('edit-budget').value) || null,
    remarks: document.getElementById('edit-remarks').value || null,
    followup_date: document.getElementById('edit-followup').value || null,
    updated_at: new Date().toISOString()
  };

  try {
    if (client) {
      const { error } = await client
        .from('leads')
        .update(updates)
        .eq('id', leadId);

      if (error) throw error;
    } else {
      const index = allLeads.findIndex(l => l.id == leadId);
      if (index !== -1) {
        allLeads[index] = { ...allLeads[index], ...updates };
        localStorage.setItem('crm_leads', JSON.stringify(allLeads));
      }
    }

    const leadIndex = allLeads.findIndex(l => l.id == leadId);
    if (leadIndex !== -1) {
      allLeads[leadIndex] = { ...allLeads[leadIndex], ...updates };
    }
    filteredLeads = [...allLeads];
    renderLeadsTable();
    updateDashboard();
    closeEditModal();
    showNotification('Lead updated successfully!', 'success');
  } catch (error) {
    console.error('Error updating lead:', error);
    showNotification('Error updating lead', 'error');
  }
}

// Delete Lead
async function handleDeleteLead() {
  if (!confirm('Are you sure you want to delete this lead?')) return;

  const leadId = document.getElementById('edit-lead-id').value;

  try {
    if (client) {
      const { error } = await client
        .from('leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;
    } else {
      allLeads = allLeads.filter(l => l.id != leadId);
      localStorage.setItem('crm_leads', JSON.stringify(allLeads));
    }

    allLeads = allLeads.filter(l => l.id != leadId);
    filteredLeads = [...allLeads];
    renderLeadsTable();
    updateDashboard();
    closeEditModal();
    showNotification('Lead deleted successfully!', 'success');
  } catch (error) {
    console.error('Error deleting lead:', error);
    showNotification('Error deleting lead', 'error');
  }
}

// Render Leads Table
function renderLeadsTable() {
  const tbody = document.getElementById('leads-tbody');
  tbody.innerHTML = '';

  if (filteredLeads.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No leads found</td></tr>';
    return;
  }

  filteredLeads.forEach(lead => {
    const row = document.createElement('tr');
    const date = new Date(lead.created_at).toLocaleDateString();
    const statusColor = getStatusColor(lead.status);

    row.innerHTML = `
      <td>${lead.name}</td>
      <td>${lead.email}</td>
      <td>${lead.service}</td>
      <td><span class="status-badge status-${lead.status}" style="background: ${statusColor};">${capitalize(lead.status)}</span></td>
      <td>${date}</td>
      <td>
        <button class="btn-sm btn-primary" onclick="openEditModal(${lead.id})">
          <i class="fas fa-edit"></i> Edit
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Open Edit Modal
function openEditModal(leadId) {
  const lead = allLeads.find(l => l.id === leadId);
  if (!lead) return;

  currentEditingLeadId = leadId;
  document.getElementById('edit-lead-id').value = leadId;
  document.getElementById('edit-name').value = lead.name;
  document.getElementById('edit-email').value = lead.email;
  document.getElementById('edit-phone').value = lead.phone || '';
  document.getElementById('edit-service').value = lead.service;
  document.getElementById('edit-status').value = lead.status;
  document.getElementById('edit-company').value = lead.company || '';
  document.getElementById('edit-budget').value = lead.budget || '';
  document.getElementById('edit-remarks').value = lead.remarks || '';
  document.getElementById('edit-followup').value = lead.followup_date || '';

  document.getElementById('edit-modal').style.display = 'flex';
}

// Close Edit Modal
function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
  currentEditingLeadId = null;
}

// Update Dashboard
function updateDashboard() {
  const total = allLeads.length;
  const pending = allLeads.filter(l => l.status === 'pending').length;
  const qualified = allLeads.filter(l => l.status === 'qualified').length;
  const converted = allLeads.filter(l => l.status === 'won').length;

  document.getElementById('total-leads').textContent = total;
  document.getElementById('pending-leads').textContent = pending;
  document.getElementById('qualified-leads').textContent = qualified;
  document.getElementById('converted-leads').textContent = converted;

  // Recent Leads
  renderRecentLeads();

  // Status Chart
  renderStatusChart();

  // Reports
  updateReports();
}

// Render Recent Leads
function renderRecentLeads() {
  const container = document.getElementById('recent-leads-table');
  const recent = allLeads.slice(0, 5);

  if (recent.length === 0) {
    container.innerHTML = '<p style="padding: 20px; text-align: center;">No leads yet</p>';
    return;
  }

  let html = '<table class="mini-table"><tbody>';
  recent.forEach(lead => {
    const date = new Date(lead.created_at).toLocaleDateString();
    const statusColor = getStatusColor(lead.status);
    html += `
      <tr>
        <td>${lead.name}</td>
        <td>${lead.service}</td>
        <td><span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${capitalize(lead.status)}</span></td>
        <td>${date}</td>
        <td><button class="btn-sm btn-primary" onclick="openEditModal(${lead.id})">Edit</button></td>
      </tr>
    `;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

// Render Status Chart
function renderStatusChart() {
  const statuses = {
    pending: allLeads.filter(l => l.status === 'pending').length,
    contacted: allLeads.filter(l => l.status === 'contacted').length,
    qualified: allLeads.filter(l => l.status === 'qualified').length,
    won: allLeads.filter(l => l.status === 'won').length,
    lost: allLeads.filter(l => l.status === 'lost').length
  };

  const container = document.getElementById('status-chart');
  let html = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;">';

  Object.entries(statuses).forEach(([status, count]) => {
    const color = getStatusColor(status);
    html += `
      <div style="background: ${color}; color: white; padding: 15px; border-radius: 8px; text-align: center;">
        <div style="font-size: 24px; font-weight: bold;">${count}</div>
        <div style="font-size: 12px; text-transform: capitalize;">${status}</div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

// Update Reports
function updateReports() {
  const total = allLeads.length;
  const won = allLeads.filter(l => l.status === 'won').length;
  const contacted = allLeads.filter(l => l.status === 'contacted').length;
  const thisMonth = allLeads.filter(l => {
    const date = new Date(l.created_at);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const totalBudget = allLeads.reduce((sum, l) => sum + (l.budget || 0), 0);

  document.getElementById('conversion-rate').textContent = total > 0 ? Math.round((won / total) * 100) + '%' : '0%';
  document.getElementById('month-leads').textContent = thisMonth;
  document.getElementById('avg-value').textContent = '$' + (total > 0 ? Math.round(totalBudget / total) : 0);
  document.getElementById('response-rate').textContent = total > 0 ? Math.round((contacted / total) * 100) + '%' : '0%';

  // Service Chart
  renderServiceChart();

  // Status Report Chart
  renderStatusReportChart();
}

// Render Service Chart
function renderServiceChart() {
  const services = {};
  allLeads.forEach(lead => {
    services[lead.service] = (services[lead.service] || 0) + 1;
  });

  const container = document.getElementById('service-chart');
  let html = '<ul style="list-style: none; padding: 0;">';

  Object.entries(services).forEach(([service, count]) => {
    const percentage = (count / allLeads.length * 100).toFixed(1);
    html += `
      <li style="padding: 8px 0; display: flex; justify-content: space-between; align-items: center;">
        <span>${service}</span>
        <div style="display: flex; gap: 10px; align-items: center;">
          <div style="background: #e0e0e0; height: 8px; width: 100px; border-radius: 4px; overflow: hidden;">
            <div style="background: #3498db; height: 100%; width: ${percentage}%;"></div>
          </div>
          <span style="font-weight: bold; min-width: 40px;">${count}</span>
        </div>
      </li>
    `;
  });

  html += '</ul>';
  container.innerHTML = html;
}

// Render Status Report Chart
function renderStatusReportChart() {
  const statuses = {
    pending: allLeads.filter(l => l.status === 'pending').length,
    contacted: allLeads.filter(l => l.status === 'contacted').length,
    qualified: allLeads.filter(l => l.status === 'qualified').length,
    won: allLeads.filter(l => l.status === 'won').length,
    lost: allLeads.filter(l => l.status === 'lost').length
  };

  const container = document.getElementById('report-status-chart');
  let html = '<ul style="list-style: none; padding: 0;">';

  const colors = {
    pending: '#f39c12',
    contacted: '#3498db',
    qualified: '#27ae60',
    won: '#2ecc71',
    lost: '#e74c3c'
  };

  Object.entries(statuses).forEach(([status, count]) => {
    const percentage = allLeads.length > 0 ? (count / allLeads.length * 100).toFixed(1) : 0;
    html += `
      <li style="padding: 8px 0; display: flex; justify-content: space-between; align-items: center;">
        <span style="text-transform: capitalize;">${status}</span>
        <div style="display: flex; gap: 10px; align-items: center;">
          <div style="background: #e0e0e0; height: 8px; width: 100px; border-radius: 4px; overflow: hidden;">
            <div style="background: ${colors[status]}; height: 100%; width: ${percentage}%;"></div>
          </div>
          <span style="font-weight: bold; min-width: 40px;">${count}</span>
        </div>
      </li>
    `;
  });

  html += '</ul>';
  container.innerHTML = html;
}

// Filter Leads
function filterLeads() {
  const status = document.getElementById('status-filter').value;
  const searchTerm = document.getElementById('search-input').value.toLowerCase();

  filteredLeads = allLeads.filter(lead => {
    const statusMatch = !status || lead.status === status;
    const searchMatch = !searchTerm ||
      lead.name.toLowerCase().includes(searchTerm) ||
      lead.email.toLowerCase().includes(searchTerm) ||
      lead.service.toLowerCase().includes(searchTerm);

    return statusMatch && searchMatch;
  });

  renderLeadsTable();
}

// Search Leads
function searchLeads() {
  filterLeads();
}

// Switch Section
function switchSection(section) {
  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-section') === section) {
      item.classList.add('active');
    }
  });

  // Update active section
  document.querySelectorAll('.content-section').forEach(s => {
    s.classList.remove('active');
  });
  document.getElementById(section).classList.add('active');

  // Update title
  const titles = {
    dashboard: 'Dashboard',
    leads: 'All Leads',
    'add-lead': 'Add New Lead',
    reports: 'Reports & Analytics'
  };
  document.getElementById('section-title').textContent = titles[section];

  if (section === 'leads') {
    document.querySelector('.filter-group').style.display = 'flex';
    document.getElementById('export-btn').style.display = 'inline-block';
  } else {
    document.querySelector('.filter-group').style.display = 'none';
    document.getElementById('export-btn').style.display = 'none';
  }
}

// Manual Sync Bookings
async function handleManualSync() {
  const syncBtn = document.getElementById('sync-btn');
  syncBtn.disabled = true;
  syncBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';

  try {
    await syncBookingsToLeads();
    await loadLeads();
    updateDashboard();
    showNotification('Bookings synced successfully!', 'success');
  } catch (error) {
    console.error('Error during manual sync:', error);
    showNotification('Error syncing bookings', 'error');
  } finally {
    syncBtn.disabled = false;
    syncBtn.innerHTML = '<i class="fas fa-sync"></i> Sync Bookings';
  }
}

// Export to CSV
function exportLeadsToCSV() {
  let csv = 'Name,Email,Phone,Service,Status,Company,Budget,Remarks,Follow-up Date,Created Date\n';

  filteredLeads.forEach(lead => {
    csv += `"${lead.name}","${lead.email}","${lead.phone || ''}","${lead.service}","${lead.status}","${lead.company || ''}","${lead.budget || ''}","${(lead.remarks || '').replace(/"/g, '""')}","${lead.followup_date || ''}","${new Date(lead.created_at).toLocaleDateString()}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// Utility Functions
function getStatusColor(status) {
  const colors = {
    pending: '#f39c12',
    contacted: '#3498db',
    qualified: '#27ae60',
    won: '#2ecc71',
    lost: '#e74c3c'
  };
  return colors[status] || '#95a5a6';
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function showNotification(message, type) {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    background: ${type === 'success' ? '#2ecc71' : '#e74c3c'};
    color: white;
    border-radius: 4px;
    z-index: 9999;
    animation: slideIn 0.3s ease;
  `;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
