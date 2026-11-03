/* ===============================
   INITIAL PAGE LOAD
================================= */
document.addEventListener("DOMContentLoaded", initPage);

async function initPage() {
    try {
        // We only need one main call now because your PHP 
        // already joins barangays with their forecasts.
        await loadAllBarangayForecasts();
        initSearch();
    } catch (error) {
        console.error("Initialization error:", error);
    }
}

/* ===============================
   LOAD FORECAST FOR ALL BARANGAYS
================================= */
async function loadAllBarangayForecasts() {
    const container = document.getElementById("allBarangaysContainer");

    if (!container) {
        console.error("Missing #allBarangaysContainer in HTML");
        return;
    }

    container.innerHTML = "<p style='text-align:center;'>Fetching forecast data...</p>";

    try {
        // Updated to use your new PHP endpoint
        const response = await fetch("api/get_5_day_forecast.php");

        if (!response.ok) {
            throw new Error("Failed to fetch consolidated forecast data");
        }

        const barangayData = await response.json();

        if (barangayData.error) {
            throw new Error(barangayData.error);
        }

        // Generate the HTML for every barangay in the list
        const htmlContent = barangayData.map(b => buildBarangayTable(b)).join("");

        container.innerHTML = htmlContent;

    } catch (error) {
        console.error("Forecast loading failed:", error);
        container.innerHTML = `
            <div style="text-align:center; padding: 20px;">
                <p style="color:red;">Error: ${error.message}</p>
                <button onclick="location.reload()">Retry</button>
            </div>`;
    }
}

/* ===============================
   MAP RISK DATA TO STYLING
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
    // Determine the category based on elevation
    const elevValue = barangay.elevation ?? 0;
    const elevCategory = elevValue >= 10 ? "Highland" : "Lowland";
    
    let tableHTML = `
        <div class="barangay-section">
            <div class="barangay-header">
                <div class="header-main">
                    <h2 class="barangay-section-title">${barangay.name}</h2>
                    <span class="elevation-badge ${elevCategory.toLowerCase()}">
                        ${elevValue}m (${elevCategory})
                    </span>
                </div>
            </div>

            <table class="forecast-table">
                <thead>
                    <tr>
                        <th style="color:white;">Date</th>
                        <th>Rainfall</th>
                        <th>Intensity</th>
                        <th>Duration</th>
                        <th>Risk Level</th>
                    </tr>
                </thead>
                <tbody>`;

    if (!barangay.forecast || barangay.forecast.length === 0) {
        tableHTML += `<tr><td colspan="5" style="text-align:center;">No forecast data available</td></tr>`;
    } else {
       barangay.forecast.forEach(f => {
    const risk = getRiskStyle(f.risk);
    
    // Use "|| 0" to provide a fallback if the value is missing
    const rain = (f.rainfall || 0).toFixed(2);
    const intensity = (f.intensity || 0).toFixed(2);
    const duration = f.duration || 0;

    tableHTML += `
        <tr>
            <td style="font-weight:700;">
                ${f.date}<br><small>${f.day || ''}</small>
            </td>
            <td>${rain} mm</td>
            <td>${intensity} mm/h</td>
            <td>${duration} hrs</td>
            <td class="risk-column">
                <span class="risk-badge ${risk.class}">
                    ${risk.icon} ${f.risk || 'N/A'}
                </span>
            </td>
        </tr>`;
        });
    }

    tableHTML += `
                </tbody>
            </table>
        </div>`;
    
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