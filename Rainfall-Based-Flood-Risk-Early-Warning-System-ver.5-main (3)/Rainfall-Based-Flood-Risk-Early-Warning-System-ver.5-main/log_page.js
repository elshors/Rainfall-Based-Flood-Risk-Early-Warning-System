let LOGS = [];

/* ==========================
   FETCH LOG DATA
========================== */
async function loadLogs() {
    const tbody = document.getElementById("logBody");
    tbody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Loading logs...</td></tr>";

    try {
        const response = await fetch("api/get_logs.php");
        if (!response.ok) throw new Error("Network response was not ok");
        
        LOGS = await response.json();

        if (LOGS.length === 0) {
            tbody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>No logs found.</td></tr>";
        } else {
            renderLogs(LOGS);
        }
    } catch (err) {
        console.error("Failed to load logs:", err);
        tbody.innerHTML = "<tr><td colspan='5' style='text-align:center; color:red;'>Failed to load logs. Please try again.</td></tr>";
    }
}

/* ==========================
   RENDER LOG TABLE
========================= */
function renderLogs(data) {
    const tbody = document.getElementById("logBody");
    tbody.innerHTML = "";

    data.forEach(log => {
        const row = document.createElement("tr");

        // Normalize status for class assignment
        const status = (log.status || "").toLowerCase();
        let statusClass = "";
        
        if (status === "success") statusClass = "status-success";
        else if (status === "warning") statusClass = "status-warning";
        else if (status === "failed") statusClass = "status-failed";

        row.innerHTML = `
            <td>${formatDate(log.timestamp)}</td>
            <td><strong>${log.user || 'System'}</strong></td>
            <td>${log.action || 'N/A'}</td>
            <td><span class="${statusClass}">${log.status || 'Unknown'}</span></td>
            <td><small>${log.details || ''}</small></td>
        `;

        tbody.appendChild(row);
    });
}

/* ==========================
   SEARCH LOGS (Filtered)
========================== */
document.getElementById("searchInput").addEventListener("input", function() {
    const keyword = this.value.toLowerCase();

    const filtered = LOGS.filter(log => {
        return (
            (log.user?.toLowerCase().includes(keyword)) ||
            (log.action?.toLowerCase().includes(keyword)) ||
            (log.details?.toLowerCase().includes(keyword)) ||
            (log.status?.toLowerCase().includes(keyword))
        );
    });

    if (filtered.length === 0) {
        document.getElementById("logBody").innerHTML = "<tr><td colspan='5' style='text-align:center;'>No matching logs found.</td></tr>";
    } else {
        renderLogs(filtered);
    }
});

/* ==========================
   DATE FORMAT
========================== */
function formatDate(dateStr) {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    // Returns format: MM/DD/YYYY, HH:MM:SS AM/PM
    return d.toLocaleString([], { 
        year: 'numeric', 
        month: 'short', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

loadLogs();