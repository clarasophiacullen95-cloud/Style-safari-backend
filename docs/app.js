// ---------------------------
// CONFIG
// ---------------------------
const BACKEND = "https://style-safari-backend.vercel.app";

// Endpoints
const URL_SEARCH = `${BACKEND}/api/search`;
const URL_AI_OUTFITS = `${BACKEND}/api/ai-outfits`;
const URL_REFRESH = `${BACKEND}/api/refresh?secret=stylesafari`;

// UI Elements
const searchInput = document.getElementById("searchInput");
const resultsBox = document.getElementById("results");
const outfitBox = document.getElementById("outfits");
const refreshBtn = document.getElementById("manualRefresh");

// ---------------------------
// SEARCH PRODUCTS
// ---------------------------
async function searchProducts() {
    const query = searchInput.value.trim();
    if (!query) {
        resultsBox.innerHTML = "<p>Enter something to search.</p>";
        return;
    }

    resultsBox.innerHTML = "<p>Searching…</p>";

    try {
        const res = await fetch(`${URL_SEARCH}?q=${encodeURIComponent(query)}&gender=female`);
        const data = await res.json();

        if (data.length === 0) {
            resultsBox.innerHTML = "<p>No matching products found.</p>";
            return;
        }

        resultsBox.innerHTML = data.map(prod => `
            <div class="product">
                <img src="${prod.image_url}" />
                <h3>${prod.name}</h3>
                <p>${prod.brand} — ${prod.price} ${prod.currency}</p>
                <p><b>Category:</b> ${prod.category}</p>
                <p><b>Fabric:</b> ${prod.fabric || "N/A"}</p>
                <p><b>Size:</b> ${prod.size || "Unknown"}</p>
            </div>
        `).join("");

    } catch (e) {
        resultsBox.innerHTML = `<p>Error: ${e.message}</p>`;
    }
}

searchInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") searchProducts();
});

// ---------------------------
// AI OUTFIT GENERATOR
// ---------------------------
async function generateOutfits() {
    outfitBox.innerHTML = "<p>Generating AI outfits…</p>";

    const profile = {
        gender: "female",
        style: "chic-minimal",
        budget_min: 50,
        budget_max: 800,
        colors: ["white", "black", "beige"],
        occasions: ["casual", "dinner", "work"],
    };

    try {
        const res = await fetch(URL_AI_OUTFITS, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(profile)
        });

        const outfits = await res.json();

        if (!Array.isArray(outfits) || outfits.length === 0) {
            outfitBox.innerHTML = "<p>No outfits available.</p>";
            return;
        }

        outfitBox.innerHTML = outfits.map((outfit, idx) => `
            <div class="outfit-block">
                <h2>Outfit ${idx + 1}</h2>
                <p>${outfit.description}</p>
                <div class="outfit-items">
                    ${outfit.items.map(i => `
                        <div class="product">
                            <img src="${i.image_url}" />
                            <h3>${i.name}</h3>
                            <p>${i.brand} — ${i.price} ${i.currency}</p>
                        </div>
                    `).join("")}
                </div>
            </div>
        `).join("");

    } catch (err) {
        outfitBox.innerHTML = `<p>Error: ${err.message}</p>`;
    }
}

// Auto-generate outfits on page load
generateOutfits();

// ---------------------------
// MANUAL REFRESH BUTTON
// ---------------------------
refreshBtn.addEventListener("click", async () => {
    refreshBtn.innerText = "Refreshing…";
    refreshBtn.disabled = true;

    try {
        const res = await fetch(URL_REFRESH);
        const data = await res.json();

        alert("Products synced: " + data.count);
    } catch (e) {
        alert("Error: " + e.message);
    }

    refreshBtn.disabled = false;
    refreshBtn.innerText = "Refresh Products";
});
