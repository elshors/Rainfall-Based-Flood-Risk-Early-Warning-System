document.addEventListener("DOMContentLoaded", initAlerts);



async function initAlerts(){

    try{



        const response = await fetch("api/get_three_hour_forecast.php");



        if(!response.ok){

            throw new Error("Failed to fetch forecast data");

        }



        const data = await response.json();



        detectFloodAlerts(data);



    }catch(error){

        console.error("Alert system error:", error);

    }

}



function detectFloodAlerts(barangays){



    const container = document.querySelector(".alerts-container");



    container.innerHTML = "";



    barangays.forEach(barangay => {



        if(!barangay.forecast || barangay.forecast.length === 0) return;



        // Only check the next 3 hours

        const forecast = barangay.forecast[0];



        const risk = forecast.risk?.toUpperCase() || "SAFE";



        if(risk === "SAFE") return;



        const card = createAlertCard(

            risk,

            barangay.name,

            forecast.rainfall

        );



        container.appendChild(card);



    });



}



function createAlertCard(risk, barangay, rainfall, factors = {}) {

    const card = document.createElement("div");

    card.className = `alert-card ${risk.toLowerCase()}`;



    // Updated to FontAwesome 6 flood-specific icons

    const icons = {

        SAFE: "fa-circle-check",

        MONITOR: "fa-water",              // Water rising

        ALERT: "fa-house-flood-water",    // Water entering homes

        CRITICAL: "fa-person-walking-arrow-right" // Immediate evacuation

    };



    // Flood-impact focused messaging

    const messages = {

        SAFE: "No immediate flood threat. Drainage systems functioning normally.",

       

        MONITOR: factors.is_lowland

            ? "Potential for street-level ponding in low-lying areas. Clear local drains."

            : "Ground saturation rising. Monitoring for localized water accumulation.",

           

        ALERT: factors.is_upstream

            ? "Flash flood risk! Upstream runoff approaching. Move belongings to high ground."

            : "Significant flooding likely. Water levels expected to impact residential roads.",

           

        CRITICAL: "DANGEROUS FLOODING IMMINENT. Life-threatening water levels possible. Evacuate immediately if advised."

    };



    card.innerHTML = `

        <div class="alert-icon">

            <i class="fa-solid ${icons[risk]}"></i>

        </div>



        <div>

            <div class="alert-header">

                ${risk}

                <span class="alert-barangay">• ${barangay}</span>

            </div>



            <div class="alert-message">

                ${messages[risk]}

                <div class="alert-meta">

                    <i class="fa-solid fa-cloud-showers-heavy"></i> ${rainfall}mm precipitation detected

                </div>

            </div>

        </div>

    `;



    return card;

}