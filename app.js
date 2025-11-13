// Global variables
let rawData = [];
let filteredData = [];
let wardChart = null;
let coverageDistChart = null;

// DOM Elements
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const dashboard = document.getElementById('dashboard');
const uploadBox = document.querySelector('.upload-box');

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    fileInput.addEventListener('change', handleFileUpload);
    
    // Drag and drop
    uploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadBox.style.borderColor = '#764ba2';
    });
    
    uploadBox.addEventListener('dragleave', () => {
        uploadBox.style.borderColor = '#667eea';
    });
    
    uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadBox.style.borderColor = '#667eea';
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            handleFileUpload({ target: { files: files } });
        }
    });

    // Filter event listeners
    document.getElementById('wardFilter').addEventListener('change', applyFilters);
    document.getElementById('vehicleFilter').addEventListener('change', applyFilters);
    document.getElementById('coverageFilter').addEventListener('input', (e) => {
        document.getElementById('coverageValue').textContent = e.target.value + '%';
        applyFilters();
    });
    
    // Search
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    
    // Export
    document.getElementById('exportBtn').addEventListener('click', exportFilteredData);
    document.getElementById('exportImageBtn').addEventListener('click', exportAsImage);
});

// Handle file upload
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    fileName.textContent = `📁 ${file.name}`;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const csv = e.target.result;
        parseCSV(csv);
    };
    reader.readAsText(file);
}

// Parse CSV data
function parseCSV(csv) {
    const lines = csv.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',');
    
    rawData = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length === headers.length) {
            const row = {
                sno: values[0],
                zoneCircle: values[1],
                wardName: values[2],
                vehicleNumber: values[3],
                routeName: values[4],
                total: parseInt(values[5]) || 0,
                covered: parseInt(values[6]) || 0,
                notCovered: parseInt(values[7]) || 0,
                coverage: parseInt(values[8]) || 0,
                date: values[9],
                startTime: values[10],
                endTime: values[11]
            };
            rawData.push(row);
        }
    }
    
    filteredData = [...rawData];
    initializeDashboard();
}

// Initialize dashboard
function initializeDashboard() {
    dashboard.classList.remove('hidden');
    document.querySelector('.upload-section').style.display = 'none';
    
    populateFilters();
    updateSummaryCards();
    renderCharts();
    renderTable();
    renderStatistics();
}

// Populate filter dropdowns
function populateFilters() {
    const wardFilter = document.getElementById('wardFilter');
    const vehicleFilter = document.getElementById('vehicleFilter');
    
    // Get unique wards and vehicles
    const wards = [...new Set(rawData.map(row => row.wardName))].sort();
    const vehicles = [...new Set(rawData.map(row => row.vehicleNumber))].sort();
    
    wardFilter.innerHTML = '<option value="">All Wards</option>';
    wards.forEach(ward => {
        wardFilter.innerHTML += `<option value="${ward}">${ward}</option>`;
    });
    
    vehicleFilter.innerHTML = '<option value="">All Vehicles</option>';
    vehicles.forEach(vehicle => {
        vehicleFilter.innerHTML += `<option value="${vehicle}">${vehicle}</option>`;
    });
}

// Apply filters
function applyFilters() {
    const wardFilter = document.getElementById('wardFilter').value;
    const vehicleFilter = document.getElementById('vehicleFilter').value;
    const coverageFilter = parseInt(document.getElementById('coverageFilter').value);
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    filteredData = rawData.filter(row => {
        const matchesWard = !wardFilter || row.wardName === wardFilter;
        const matchesVehicle = !vehicleFilter || row.vehicleNumber === vehicleFilter;
        const matchesCoverage = row.coverage >= coverageFilter;
        const matchesSearch = !searchTerm || 
            row.wardName.toLowerCase().includes(searchTerm) ||
            row.vehicleNumber.toLowerCase().includes(searchTerm) ||
            row.routeName.toLowerCase().includes(searchTerm);
        
        return matchesWard && matchesVehicle && matchesCoverage && matchesSearch;
    });
    
    updateSummaryCards();
    renderCharts();
    renderTable();
    renderStatistics();
}

// Update summary cards
function updateSummaryCards() {
    const totalRoutes = filteredData.length;
    const totalPOIs = filteredData.reduce((sum, row) => sum + row.total, 0);
    const coveredPOIs = filteredData.reduce((sum, row) => sum + row.covered, 0);
    const avgCoverage = totalRoutes > 0 
        ? Math.round(filteredData.reduce((sum, row) => sum + row.coverage, 0) / totalRoutes)
        : 0;
    
    document.getElementById('totalRoutes').textContent = totalRoutes;
    document.getElementById('totalPOIs').textContent = totalPOIs.toLocaleString();
    document.getElementById('coveredPOIs').textContent = coveredPOIs.toLocaleString();
    document.getElementById('avgCoverage').textContent = avgCoverage + '%';
}

// Render charts
function renderCharts() {
    renderWardChart();
    renderCoverageDistributionChart();
}

// Render ward chart
function renderWardChart() {
    const wardData = {};
    
    filteredData.forEach(row => {
        if (!wardData[row.wardName]) {
            wardData[row.wardName] = { total: 0, covered: 0 };
        }
        wardData[row.wardName].total += row.total;
        wardData[row.wardName].covered += row.covered;
    });
    
    const sortedWards = Object.entries(wardData)
        .sort((a, b) => b[1].covered - a[1].covered)
        .slice(0, 10);
    
    const labels = sortedWards.map(([ward]) => ward.split('.')[1] || ward);
    const covered = sortedWards.map(([, data]) => data.covered);
    const uncovered = sortedWards.map(([, data]) => data.total - data.covered);
    
    if (wardChart) wardChart.destroy();
    
    const ctx = document.getElementById('wardChart').getContext('2d');
    wardChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Covered',
                    data: covered,
                    backgroundColor: 'rgba(102, 126, 234, 0.8)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Not Covered',
                    data: uncovered,
                    backgroundColor: 'rgba(244, 67, 54, 0.8)',
                    borderColor: 'rgba(244, 67, 54, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true,
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });
}

// Render coverage distribution chart
function renderCoverageDistributionChart() {
    const ranges = {
        '0%': 0,
        '1-20%': 0,
        '21-40%': 0,
        '41-60%': 0,
        '61-80%': 0,
        '81-100%': 0
    };
    
    filteredData.forEach(row => {
        const coverage = row.coverage;
        if (coverage === 0) ranges['0%']++;
        else if (coverage <= 20) ranges['1-20%']++;
        else if (coverage <= 40) ranges['21-40%']++;
        else if (coverage <= 60) ranges['41-60%']++;
        else if (coverage <= 80) ranges['61-80%']++;
        else ranges['81-100%']++;
    });
    
    if (coverageDistChart) coverageDistChart.destroy();
    
    const ctx = document.getElementById('coverageDistChart').getContext('2d');
    coverageDistChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(ranges),
            datasets: [{
                data: Object.values(ranges),
                backgroundColor: [
                    'rgba(244, 67, 54, 0.8)',
                    'rgba(255, 152, 0, 0.8)',
                    'rgba(255, 235, 59, 0.8)',
                    'rgba(156, 204, 101, 0.8)',
                    'rgba(102, 187, 106, 0.8)',
                    'rgba(76, 175, 80, 0.8)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

// Render table
function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    filteredData.forEach(row => {
        const tr = document.createElement('tr');
        
        if (row.coverage === 0) {
            tr.classList.add('low-coverage');
        } else if (row.coverage > 30) {
            tr.classList.add('high-coverage');
        }
        
        tr.innerHTML = `
            <td>${row.sno}</td>
            <td>${row.wardName}</td>
            <td>${row.vehicleNumber}</td>
            <td>${row.routeName}</td>
            <td>${row.total}</td>
            <td>${row.covered}</td>
            <td>${row.notCovered}</td>
            <td><strong>${row.coverage}%</strong></td>
            <td>${row.startTime}</td>
            <td>${row.endTime}</td>
        `;
        
        tbody.appendChild(tr);
    });
}

// Render statistics
function renderStatistics() {
    const topRoutes = [...filteredData]
        .filter(row => row.coverage > 0)
        .sort((a, b) => b.coverage - a.coverage)
        .slice(0, 5);
    
    const lowRoutes = [...filteredData]
        .sort((a, b) => a.coverage - b.coverage)
        .slice(0, 5);
    
    const topRoutesHTML = topRoutes.map(row => `
        <div class="stat-item">
            <span class="stat-item-name">${row.routeName} - ${row.wardName.split('.')[1] || row.wardName}</span>
            <span class="stat-item-value">${row.coverage}%</span>
        </div>
    `).join('');
    
    const lowRoutesHTML = lowRoutes.map(row => `
        <div class="stat-item low">
            <span class="stat-item-name">${row.routeName} - ${row.wardName.split('.')[1] || row.wardName}</span>
            <span class="stat-item-value">${row.coverage}%</span>
        </div>
    `).join('');
    
    document.getElementById('topRoutes').innerHTML = topRoutesHTML;
    document.getElementById('lowRoutes').innerHTML = lowRoutesHTML;
}

// Export filtered data
function exportFilteredData() {
    const headers = ['S.No.', 'Zone & Circle', 'Ward Name', 'Vehicle Number', 'Route Name', 
                    'Total', 'Covered', 'Not Covered', 'Coverage', 'Date', 'Start Time', 'End Time'];
    
    let csv = headers.join(',') + '\n';
    
    filteredData.forEach(row => {
        csv += `${row.sno},${row.zoneCircle},${row.wardName},${row.vehicleNumber},${row.routeName},` +
               `${row.total},${row.covered},${row.notCovered},${row.coverage},${row.date},${row.startTime},${row.endTime}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `filtered-poi-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Export as high-quality image
function exportAsImage() {
    const exportBtn = document.getElementById('exportImageBtn');
    exportBtn.textContent = 'Generating...';
    exportBtn.disabled = true;
    
    // Get the dashboard element
    const dashboardElement = document.getElementById('dashboard');
    const container = document.querySelector('.container');
    
    // Temporarily show header for export
    const header = document.querySelector('header');
    const originalDisplay = header.style.display;
    header.style.display = 'block';
    
    // Hide charts section
    const chartsSection = document.querySelector('.charts-section');
    const chartsOriginalDisplay = chartsSection.style.display;
    chartsSection.style.display = 'none';
    
    // Create a wrapper for export
    const exportWrapper = document.createElement('div');
    exportWrapper.style.background = 'white';
    exportWrapper.style.padding = '20px';
    exportWrapper.style.width = container.offsetWidth + 'px';
    
    // Clone header and dashboard
    const headerClone = header.cloneNode(true);
    const dashboardClone = dashboardElement.cloneNode(true);
    
    exportWrapper.appendChild(headerClone);
    exportWrapper.appendChild(dashboardClone);
    document.body.appendChild(exportWrapper);
    
    // Use html2canvas with high quality settings
    html2canvas(exportWrapper, {
        scale: 3, // High quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 0,
        removeContainer: false
    }).then(canvas => {
        // Convert to high-quality image
        canvas.toBlob((blob) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `POI-Report-Dashboard-${new Date().toISOString().split('T')[0]}.png`;
            a.click();
            window.URL.revokeObjectURL(url);
            
            // Cleanup
            document.body.removeChild(exportWrapper);
            header.style.display = originalDisplay;
            chartsSection.style.display = chartsOriginalDisplay;
            exportBtn.textContent = 'Export as Image';
            exportBtn.disabled = false;
        }, 'image/png', 1.0);
    }).catch(error => {
        console.error('Error generating image:', error);
        document.body.removeChild(exportWrapper);
        header.style.display = originalDisplay;
        chartsSection.style.display = chartsOriginalDisplay;
        exportBtn.textContent = 'Export as Image';
        exportBtn.disabled = false;
        alert('Error generating image. Please try again.');
    });
}
