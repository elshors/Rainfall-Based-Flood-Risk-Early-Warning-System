let REPORTS = [];

/* ==========================
   FETCH REPORT DATA
========================== */

async function loadReports() {
    try {
        const response = await fetch("api/get_reports.php");
        REPORTS = await response.json();

        renderReports();
        updateSummary();
    populateBarangayFilter();


    } catch (err) {
        console.error("Failed to load reports:", err);
    }
}


/* ==========================
   RENDER REPORT TABLE
========================== */

function renderReports(filteredReports = REPORTS) {
    const tbody = document.getElementById("reportBody");
    tbody.innerHTML = "";

    filteredReports.forEach(report => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${report.barangay}</td>
            <td>${formatDate(report.created_at)}</td>
            <td>${report.rain_3h}</td>
            <td>${report.risk_level}</td>
        `;

        tbody.appendChild(row);
    });
}

/* ==========================
   UPDATE SUMMARY CARDS
========================== */

function updateSummary() {
    const totalReports = REPORTS.length;

    let barangayCount = {};
    let monthReports = 0;
    const now = new Date();
    const currentMonth = now.getMonth();

    REPORTS.forEach(r => {
        const risk = (r.risk_level || "").toUpperCase();

        // Count ALERT or CRITICAL events per barangay
        if (risk === "ALERT" || risk === "CRITICAL") {
            barangayCount[r.barangay] = (barangayCount[r.barangay] || 0) + 1;
        }

        // Count reports for current month
        const date = new Date(r.created_at);
        if (date.getMonth() === currentMonth) {
            monthReports++;
        }
    });

    // Determine most flooded barangay
    let mostFlooded = "No Flood Events";
    let max = 0;
    Object.entries(barangayCount).forEach(([barangay, count]) => {
        if (count > max) {
            max = count;
            mostFlooded = barangay;
        }
    });

    // Update UI
    document.getElementById("totalReports").textContent = totalReports;
    document.getElementById("mostFlooded").textContent = mostFlooded;
    document.getElementById("monthReports").textContent = monthReports;
}

/* ==========================
   DATE FORMATTER
========================== */

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleString();
}

/* ==========================
   FILTER FUNCTIONALITY
========================== */

const barangayFilter = document.getElementById("barangayFilter");
const startDate = document.getElementById("startDate");
const endDate = document.getElementById("endDate");

function filterReports() {
    const barangayValue = barangayFilter.value;
    const start = startDate.value;
    const end = endDate.value;

    let filtered = REPORTS;

    if (barangayValue) {
        filtered = filtered.filter(r => r.barangay === barangayValue);
    }

    if (start) {
        filtered = filtered.filter(r => new Date(r.created_at) >= new Date(start));
    }

    if (end) {
        filtered = filtered.filter(r => new Date(r.created_at) <= new Date(end));
    }

    renderReports(filtered);
}

function populateBarangayFilter() {
        const select = document.getElementById("barangayFilter");

        // Remove old options except the first one
        select.querySelectorAll("option:not(:first-child)").forEach(opt => opt.remove());

        // Get unique barangays and sort alphabetically
        const uniqueBarangays = [...new Set(REPORTS.map(r => r.barangay))].sort();

        // Add options dynamically
        uniqueBarangays.forEach(barangay => {
            const option = document.createElement("option");
            option.value = barangay;
            option.text = barangay;
            select.appendChild(option);
        });
    }



    
// Event listeners for filters
barangayFilter.addEventListener("change", filterReports);
startDate.addEventListener("change", filterReports);
endDate.addEventListener("change", filterReports);

/* ==========================
   START PAGE
========================== */

loadReports();


document.addEventListener("DOMContentLoaded", () => {
    const downloadBtn = document.getElementById("download-btn");

    if (!downloadBtn) {
        console.warn("Download button not found in HTML!");
        return;
    }

    downloadBtn.addEventListener("click", () => {
        // 1. Get the data. 
        // We use the same filter logic as your table so the CSV matches what the user sees.
        const barangayValue = document.getElementById("barangayFilter").value;
        const start = document.getElementById("startDate").value;
        const end = document.getElementById("endDate").value;

        let dataToExport = REPORTS;

        if (barangayValue) {
            dataToExport = dataToExport.filter(r => r.barangay === barangayValue);
        }
        if (start) {
            dataToExport = dataToExport.filter(r => new Date(r.created_at) >= new Date(start));
        }
        if (end) {
            dataToExport = dataToExport.filter(r => new Date(r.created_at) <= new Date(end));
        }

        if (dataToExport.length === 0) {
            alert("No reports found for the selected filters!");
            return;
        }

        // 2. Define Clean Headers for the CSV
        const headers = ["Barangay", "Date", "Rainfall (mm)", "Risk Level"];
        
        // 3. Map the data to rows
        const csvRows = [
            headers.join(","),
            ...dataToExport.map(row => [
                `"${row.barangay}"`,
                `"${formatDate(row.created_at)}"`,
                `"${row.rain_3h}"`,
                `"${row.risk_level}"`
            ].join(","))
        ];

        // 4. Create and trigger download
        const csvString = csvRows.join("\n");
        const blob = new Blob(["\ufeff" + csvString], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        
        link.href = url;
        link.download = `flood_report_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
    });
});
