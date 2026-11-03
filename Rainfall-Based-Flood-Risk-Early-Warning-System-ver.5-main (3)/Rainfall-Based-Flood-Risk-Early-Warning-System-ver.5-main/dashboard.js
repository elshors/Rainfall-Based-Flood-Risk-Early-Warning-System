let BARANGAYS = [];
window.BARANGAYS = []; // Global variable to hold barangay data
/* ===============================
   FETCH BARANGAY DATA
================================= */
async function getBarangayList() {
    try {
        const response = await fetch('api/barangay_list.php');
        
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        BARANGAYS = await response.json();

        console.log("Fetched barangays:", BARANGAYS);

        renderBarangays();

    } catch (error) {
        console.error("Error fetching barangay list:", error);
    }
}


/* ===============================
   RENDER TABLE
================================= */
function renderBarangays() {
    const tbody = document.getElementById("barangayBody");

    if (!tbody) return;

    tbody.innerHTML = ""; // Clear old rows

    BARANGAYS.forEach(barangay => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${barangay.name ?? "-"}</td>
            <td>${barangay.elevation ?? "-"}</td>
            <td>${barangay.rain ?? "-"}</td>
            <td>${barangay.intensity ?? "-"}</td>
            <td>${barangay.duration ?? "-"}</td>
            <td>
                <span class="badge ${getBadgeClass(barangay.risk)}">
                    ${barangay.risk ?? "Safe"}
                </span>
            </td>
        `;

        tbody.appendChild(row);
    });
}


/* ===============================
   BADGE CLASS MAPPER
================================= */
function getBadgeClass(risk) {
    if (!risk) return "safe";

    switch (risk.toLowerCase()) {
        case "safe":
            return "safe";
        case "monitor":
            return "monitor";
        case "alert":
            return "alert";
        case "critical":
            return "critical";
        default:
            return "safe";
    }
}


/* ===============================
   AUTO LOAD ON PAGE START
================================= */
document.addEventListener("DOMContentLoaded", () => {
    
    updateBarangays();
    getBarangayList();
    setInterval(updateBarangays, 5 * 60 * 1000); 

    const searchInput = document.getElementById("searchInput");

    if (searchInput) {
        searchInput.addEventListener("keyup", filterBarangays);
    }
    
    }
);


async function updateBarangays() {
    const tbody = document.getElementById("barangayBody");
    if (!tbody) return;

    try {
        const res = await fetch("api/get_forecasts.php");

        if (!res.ok) {
            throw new Error(`Failed to fetch forecasts: ${res.status}`);
        }

        const data = await res.json();
        tbody.innerHTML = ""; // Clear existing rows

        if (!Array.isArray(data) || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px;">No forecasts available.</td></tr>`;
            return;
        }

        const seen = new Set();

        data.forEach(forecast => {
            if (!forecast) return;

            const barangayId = forecast.barangay_id ?? forecast.id ?? null;
            if (barangayId && seen.has(barangayId)) return;
            if (barangayId) seen.add(barangayId);

            // Data extraction
            const name = forecast.barangay_name ?? forecast.name ?? "Unknown";
            const rain = parseFloat(forecast.rain_3h ?? 0) || 0;
            const risk = forecast.risk_level ?? "N/A";
            const intensity = parseFloat(forecast.intensity ?? 0).toFixed(2);
            const riskClass = getBadgeClass(risk);
            
            // Matches the column we added in PHP
            const duration = Number(forecast.rain_duration ?? 0);

            // Geography Logic
           const staticInfo = BARANGAYS.find(
            b => String(b.id) === String(barangayId)
            );

            const elevation = staticInfo?.elev ?? "N/A";

            const isLowLand = Number(staticInfo?.low_land) === 1;

            const geographyLabel = isLowLand ? "LOWLAND" : "HIGHLAND";
            // Risk Styling
           

            // Create Table Row
            const row = document.createElement("tr");
            row.style.cursor = "pointer";
            row.onclick = () => showForecast(forecast);

            row.innerHTML = `
                <td><strong>${name}</strong></td>
                <td>
                    <span class="geo-badge ${isLowLand ? 'geo-lowland' : 'geo-highland'}">
                        ${geographyLabel} (${elevation}m)
                    </span>
                </td>
                <td>${rain.toFixed(1)} <small>mm</small></td>
                <td>${intensity} <small>mm/h</small></td>
                <td>${duration} <small>${duration > 1 ? "hrs" : "hr"}</small></td>
            <td>
    <span class="badge ${riskClass}">
        ${risk}
    </span>
</td>
             
            `;

            tbody.appendChild(row);
        });

    } catch (e) {
        console.error("Table update failed:", e);
        tbody.innerHTML = `<tr><td colspan="7" style="color:red; text-align:center;">Failed to sync data.</td></tr>`;
    }
}

function filterBarangays() {

    const input = document.getElementById("searchInput");
    const filter = input.value.toLowerCase();

    const table = document.getElementById("barangayTable");
    const rows = table.getElementsByTagName("tr");

    for (let i = 1; i < rows.length; i++) {

        const barangayCell = rows[i].getElementsByTagName("td")[0];

        if (!barangayCell) continue;

        const barangayName = barangayCell.textContent.toLowerCase();

        if (barangayName.includes(filter)) {
            rows[i].style.display = "";
        } else {
            rows[i].style.display = "none";
        }
    }
}