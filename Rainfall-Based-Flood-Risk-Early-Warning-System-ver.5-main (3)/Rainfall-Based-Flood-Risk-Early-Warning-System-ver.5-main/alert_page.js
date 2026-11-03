// ===============================
// ALERT PAGE LOGIC
// ===============================

let ALERT_BARANGAYS = []; // Holds barangay + risk info

// Fetch latest alerts from forecasts and merge with barangay info
async function fetchAlerts(BARANGAYS) {
    try {
        const res = await fetch("api/get_forecasts.php");
        if (!res.ok) throw new Error("Failed to fetch forecasts");

        const data = await res.json();

        ALERT_BARANGAYS = data.map(forecast => {
            const b = BARANGAYS.find(b => String(b.id) === String(forecast.barangay_id));
            return {
                id: forecast.barangay_id,
                name: forecast.barangay_name ?? b?.name ?? "Unknown",
                level: forecast.risk_level?.toLowerCase() ?? "safe",
                elevation: b?.elev ?? "N/A",
                low_land: b?.low_land ?? 1
            };
        });

        updateAlertCounts();

    } catch (e) {
        console.error("Failed to fetch alerts:", e);
    }
}

// Update the top cards with counts per risk level
function updateAlertCounts() {
    const levels = { safe: 0, monitor: 0, alert: 0, critical: 0 };

    ALERT_BARANGAYS.forEach(b => {
        if (levels[b.level] !== undefined) levels[b.level]++;
    });

    document.getElementById("safeCount").innerText = levels.safe;
    document.getElementById("monitorCount").innerText = levels.monitor;
    document.getElementById("alertCount").innerText = levels.alert;
    document.getElementById("criticalCount").innerText = levels.critical;
}

// Open modal and show barangays by risk level
// Open modal and show barangays by risk level
function openRiskModal(level) {
    const modal = document.getElementById("riskModal");
    const title = document.getElementById("modalTitle");
    const list = document.getElementById("riskBarangayList");

    list.innerHTML = "";
    title.innerText = level.toUpperCase() + " LEVEL BARANGAYS";

    const filtered = ALERT_BARANGAYS.filter(b => b.level === level);

    // CHECK IF EMPTY
    if (filtered.length === 0) {
        const emptyRow = document.createElement("tr");
        emptyRow.innerHTML = `
            <td colspan="2" style="text-align: center; padding: 40px; color: #7f8c8d; font-style: italic;">
                No records to show for this level.
            </td>
        `;
        list.appendChild(emptyRow);
    } else {
        // PROCEED WITH POPULATING ROWS
        filtered.forEach(b => {
            const row = document.createElement("tr");

            let badgeClass;
            switch (b.level) {
                case "safe": badgeClass = "badge-safe"; break;
                case "monitor": badgeClass = "badge-monitor"; break;
                case "alert": badgeClass = "badge-alert"; break;
                case "critical": badgeClass = "badge-critical"; break;
                default: badgeClass = "badge-default";
            }

            row.innerHTML = `
                <td>${b.name}</td>
                <td style="text-align: right;"><span class="badge ${badgeClass}">${b.level.toUpperCase()}</span></td>
            `;

            list.appendChild(row);
        });
    }

    modal.style.display = "flex";
}

// Close modal
function closeRiskModal() {
    document.getElementById("riskModal").style.display = "none";
}

// ===============================
// INITIALIZE PAGE
// ===============================
document.addEventListener("DOMContentLoaded", async () => {
    // Fetch barangays directly
    let BARANGAYS = [];
    try {
        const res = await fetch('api/barangay_list.php');
        if (!res.ok) throw new Error("Failed to fetch barangay list");
        BARANGAYS = await res.json();
    } catch (e) {
        console.error("Failed to load barangays:", e);
    }

    // Fetch alerts and merge with barangays
    await fetchAlerts(BARANGAYS);

    // Auto-refresh alerts every 5 minutes
    setInterval(() => fetchAlerts(BARANGAYS), 5 * 60 * 1000);
});