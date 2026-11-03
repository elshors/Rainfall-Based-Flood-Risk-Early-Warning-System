/* ===============================
   INITIAL PAGE LOAD
================================= */
document.addEventListener("DOMContentLoaded", initPage);

async function initPage() {
    try {
        await loadAllBarangayForecasts();
        initSearch();
    } catch (error) {
        console.error("Initialization error:", error);
    }
}

/* ===============================
   LOAD DATA FROM PHP
================================= */
async function loadAllBarangayForecasts() {
    const container = document.getElementById("allBarangaysContainer");

    if (!container) {
        console.error("Missing #allBarangaysContainer in HTML");
        return;
    }

    container.innerHTML = "<p style='text-align:center;'>Fetching 12-hour outlook (3h intervals)...</p>";

    try {
        const response = await fetch("api/get_three_hour_forecast.php");

        if (!response.ok) {
            throw new Error("Failed to fetch data from server");
        }

        const barangayData = await response.json();

        if (barangayData.error) {
            throw new Error(barangayData.error);
        }

        // Map each barangay object into a HTML table
        const htmlContent = barangayData.map(b => buildBarangayTable(b)).join("");
        container.innerHTML = htmlContent;

    } catch (error) {
        console.error("Loading failed:", error);
        container.innerHTML = `<p style='color:red;text-align:center;'>Error: ${error.message}</p>`;
    }
}

/* ===============================
   RISK STYLING & ICONS
================================= */
function getRiskStyle(riskLevel) {
    const level = riskLevel ? riskLevel.toUpperCase() : "SAFE";
    
    const styles = {
        "CRITICAL": { class: "risk-critical", icon: "🚨" },
        "ALERT":    { class: "risk-alert",    icon: "⚠️" },
        "MONITOR":  { class: "risk-monitor",  icon: "🔍" },
        "SAFE":     { class: "risk-safe",     icon: "✓" }
    };

    return styles[level] || styles["SAFE"];
}

/* ===============================
   BUILD HTML TABLE
================================= */
function buildBarangayTable(barangay) {
    // Categorize elevation
    const elevation = barangay.elevation ?? 0;
    const elevType = elevation >= 10 ? "Highland" : "Lowland";
    
    let tableHTML = `
        <div class="barangay-section">
            <div class="barangay-header">
                <div class="header-main">
                    <h2 class="barangay-section-title">${barangay.name}</h2>
                    <span class="elevation-badge ${elevType.toLowerCase()}">
                        ${elevation}m (${elevType})
                    </span>
                </div>
            </div>

            <table class="forecast-table">
                <thead>
                    <tr>
                        <th style="color:white;">Date / Day</th>
                        <th>Time Interval</th>
                        <th>Rainfall (mm)</th>
                        <th>Intensity</th>
                        <th>Duration</th>
                        <th>Risk Level</th>
                    </tr>
                </thead>
                <tbody>`;

    if (!barangay.forecast || barangay.forecast.length === 0) {
        tableHTML += `<tr><td colspan="6" style="text-align:center;">No data available for this area.</td></tr>`;
    } else {
        barangay.forecast.forEach(f => {
            const risk = getRiskStyle(f.risk);
            
            // Format time to 12-hour or simple HH:MM
            const timeDisplay = f.time ? f.time.substring(0, 5) : "--:--";

            tableHTML += `
                <tr>
                    <td>
                        <strong>${f.date}</strong><br>
                        <small>${f.day}</small>
                    </td>
                    <td style="font-weight:700; color:#2980b9;">${timeDisplay}</td>
                    <td>${(f.rainfall || 0).toFixed(2)} mm</td>
                    <td>${(f.intensity || 0).toFixed(2)} mm/h</td>
                    <td>${f.duration} hrs</td>
                    <td class="risk-column">
                        <span class="risk-badge ${risk.class}">
                            ${risk.icon} ${f.risk}
                        </span>
                    </td>
                </tr>`;
        });
    }

    tableHTML += `</tbody></table></div>`;
    return tableHTML;
}

/* ===============================
   SEARCH BARANGAYS
================================= */
function initSearch() {
    const input = document.getElementById("searchInput");
    if (!input) return;

    input.addEventListener("input", () => {
        const filter = input.value.toLowerCase();
        const sections = document.querySelectorAll(".barangay-section");

        sections.forEach(section => {
            const title = section.querySelector(".barangay-section-title")?.textContent.toLowerCase() || "";
            section.style.display = title.includes(filter) ? "" : "none";
        });
    });
}