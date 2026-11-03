let BARANGAYS = [];
let map = null;
let marker = null;
let fullscreenMap = null; // global reference for fullscreen map
let fsMarker = null;

/* ===============================
   FETCH BARANGAY DATA
================================= */
async function getBarangayList() {
    try {
        const response = await fetch("api/barangay_list.php");
        if (!response.ok) throw new Error("Failed to fetch barangay data");

        BARANGAYS = await response.json();
        renderTable(BARANGAYS);
    } catch (error) {
        console.error("Error:", error);
    }
}

/* ===============================
   INITIALIZE MAP
================================= */    

function initMap() {
    if (!map) {
        map = L.map("mapPicker").setView([8.4542, 124.6319], 12);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap"
        }).addTo(map);

        // When small map is clicked
        map.on("click", function (e) {
            const { lat, lng } = e.latlng;
            updateMarkers(lat, lng);
            openFullscreenMap(lat, lng);
        });
    } else {
        setTimeout(() => map.invalidateSize(), 100);
    }
}

async function updateMarkers(lat, lng) {
    // 1. Update Map Markers (Small & Fullscreen)
    if (marker) marker.setLatLng([lat, lng]);
    else marker = L.marker([lat, lng]).addTo(map);

    if (fullscreenMap) {
        if (fsMarker) fsMarker.setLatLng([lat, lng]);
        else fsMarker = L.marker([lat, lng]).addTo(fullscreenMap);
    }

    // 2. Update Coordinate Inputs
    document.getElementById("lat").value = lat.toFixed(6);
    document.getElementById("lon").value = lng.toFixed(6);

    // 3. Trigger Nominatim (Reverse Geocode)
    // We call this so the 'Name' field fills automatically
    await getBarangayName(lat, lng);

    // 4. Trigger Elevation API
    const elevation = await fetchElevation(lat, lng);
    if (elevation !== null) {
        const elevInput = document.getElementById("elev");
        elevInput.value = Math.round(elevation);
        
        // Manually trigger the Highland/Lowland logic
        updateLocationType(); 
    }
}

function openFullscreenMap(lat, lng) {
    const modal = document.getElementById("fullscreenMapModal");
    modal.classList.add("show");
    modal.style.display = "flex";

    setTimeout(() => {
        if (!fullscreenMap) {
            fullscreenMap = L.map("fullscreenMap").setView([lat, lng], 15);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "© OpenStreetMap"
            }).addTo(fullscreenMap);
            
            fsMarker = L.marker([lat, lng]).addTo(fullscreenMap);

            // --- ADD SEARCH BAR (GEOCODER) HERE ---
            const geocoder = L.Control.geocoder({
                defaultMarkGeocode: false,
                placeholder: "Search for a place...",
                errorMessage: "Location not found."
            })
            .on('markgeocode', function(e) {
                const center = e.geocode.center;
                // Move marker and sync data
                updateMarkers(center.lat, center.lng);
                fullscreenMap.setView(center, 16);
                map.setView(center); // Sync small map
            })
            .addTo(fullscreenMap);

            fullscreenMap.on("click", function(e) {
                updateMarkers(e.latlng.lat, e.latlng.lng);
                map.setView(e.latlng);
            });
        } else {
            fullscreenMap.invalidateSize();
            fullscreenMap.setView([lat, lng], 15);
        }
    }, 200);
}
function closeFullscreenMap() {
    const modal = document.getElementById("fullscreenMapModal");
    modal.classList.remove("show");
    setTimeout(() => { modal.style.display = "none"; }, 300);
}

// Event Listeners
document.getElementById("closeFullscreenBtn").addEventListener("click", closeFullscreenMap);

/* ===============================
   FETCH ELEVATION
================================= */
async function fetchElevation(lat, lon) {
    try {
        const url = `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`;
        const response = await fetch(url);
        const data = await response.json();
        return data.results[0].elevation ?? null;
    } catch (error) {
        console.error("Elevation API error:", error);
        return null;
    }
}

/* ===============================
   RENDER TABLE
================================= */
function renderTable(data) {
    const tableBody = document.getElementById("barangayBody");
    tableBody.innerHTML = "";

    data.forEach(barangay => {
        const locationType = barangay.low_land == "1" ? "LOWLAND" : "HIGHLAND";

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${barangay.name}</td>
            <td>${barangay.lat}</td>
            <td>${barangay.lon}</td>
            <td>${barangay.elev}</td>
            <td>${locationType}</td>
            <td>
                <div class="action-btns">
                    <button class="btn-edit" onclick="editBarangay('${barangay.id}')">
                        <i class="fa-solid fa-pen-to-square"></i> Edit
                    </button>
                    <button class="btn-delete" onclick="deleteBarangay('${barangay.id}')">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

/* ===============================
   SEARCH
================================= */
function setupSearch() {
    const searchInput = document.getElementById("searchInput");
    searchInput.addEventListener("input", function () {
        const keyword = this.value.toLowerCase();
        const filtered = BARANGAYS.filter(b => b.name.toLowerCase().includes(keyword));
        renderTable(filtered);
    });
}

/* ===============================
   EDIT BARANGAY
================================= */
function editBarangay(id) {
    const barangay = BARANGAYS.find(b => String(b.id) === String(id));
    if (!barangay) return console.error("Barangay not found:", id);

    document.getElementById("formTitle").innerText = "Edit Barangay";
    document.getElementById("barangayId").value = barangay.id;
    document.getElementById("name").value = barangay.name;
    document.getElementById("lat").value = barangay.lat;
    document.getElementById("lon").value = barangay.lon;
    document.getElementById("elev").value = barangay.elev;
    document.getElementById("low_land").value = barangay.low_land;

    document.getElementById("modalOverlay").style.display = "flex";

    setTimeout(() => {
        initMap();
        map.invalidateSize();
        if (marker) marker.setLatLng([barangay.lat, barangay.lon]);
        else marker = L.marker([barangay.lat, barangay.lon]).addTo(map);
    }, 300);
}

/* ===============================
   DELETE BARANGAY
================================= */
async function deleteBarangay(id) {
    if (!confirm("Delete this barangay?")) return;

    try {
        const response = await fetch(`api/delete_barangay.php?id=${encodeURIComponent(id)}`);
        const result = await response.json();
        if (result.success) getBarangayList();
        else alert("Delete failed");
    } catch (error) {
        console.error("Delete request failed:", error);
    }
}

/* ===============================
   SAVE BARANGAY
================================= */
async function saveBarangay() {
    const id = document.getElementById("barangayId").value.trim();
    const data = {
        id,
        name: document.getElementById("name").value.trim(),
        lat: document.getElementById("lat").value.trim(),
        lon: document.getElementById("lon").value.trim(),
        elev: document.getElementById("elev").value.trim(),
        low_land: parseInt(document.getElementById("low_land").value)
    };

    let url = "";
    if (!id) {
        data.id = data.name.toLowerCase().replace(/\s+/g, "_");
        if (BARANGAYS.some(b => b.id === data.id)) return alert("Barangay already exists!");
        url = "api/add_barangay.php";
    } else {
        url = "api/update_barangay.php";
    }

    await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    closeForm();
    getBarangayList();
}

/* ===============================
   OPEN MODAL
================================= */
function openAddForm() {
    document.getElementById("formTitle").innerText = "Add Barangay";
    ["barangayId", "name", "lat", "lon", "elev"].forEach(id => document.getElementById(id).value = "");
    document.getElementById("low_land").value = "1";
    document.getElementById("modalOverlay").style.display = "flex";

    setTimeout(() => {
        initMap();
        map.invalidateSize();
    }, 300);
}

/* ===============================
   GET BARANGAY NAME FROM COORDS
================================= */
async function getBarangayName(lat, lon) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
        const data = await response.json();

        if (data.address) {
            const barangay =
                data.address.suburb ||
                data.address.village ||
                data.address.neighbourhood ||
                data.address.hamlet ||
                "";
            document.getElementById("name").value = barangay;
        }
    } catch (error) {
        console.error("Reverse geocoding failed:", error);
    }
}

/* ===============================
   CLOSE MODAL
================================= */
function closeForm() {
    document.getElementById("modalOverlay").style.display = "none";
}

/* ===============================
   AUTO LOWLAND / HIGHLAND
================================= */
function updateLocationType() {
    const elevation = parseFloat(document.getElementById("elev").value);
    if (!isNaN(elevation)) {
        document.getElementById("low_land").value = elevation > 10 ? "0" : "1";
    }
}

/* ===============================
   PAGE LOAD
================================= */
document.addEventListener("DOMContentLoaded", () => {
    getBarangayList();
    setupSearch();

    const elevInput = document.getElementById("elev");
    if (elevInput) elevInput.addEventListener("input", updateLocationType);

    // Close modal by clicking outside
    window.addEventListener("click", e => {
        if (e.target.id === "modalOverlay") closeForm();
    });
});