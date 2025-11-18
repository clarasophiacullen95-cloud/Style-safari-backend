const backendUrl = "https://style-safari-backend.vercel.app";

const form = document.getElementById("profileForm");
const outfitsDiv = document.getElementById("outfits");
const refreshBtn = document.getElementById("refreshBtn");

form.addEventListener("submit", async e => {
    e.preventDefault();
    outfitsDiv.innerHTML = "<p>Loading outfits...</p>";

    const formData = new FormData(form);
    const profile = Object.fromEntries(formData.entries());

    try {
        const res = await fetch(`${backendUrl}/api/ai-outfits`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(profile)
        });

        const outfits = await res.json();
        renderOutfits(outfits);
    } catch (err) {
        outfitsDiv.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    }
});

refreshBtn.addEventListener("click", async () => {
    outfitsDiv.innerHTML = "<p>Refreshing products...</p>";

    try {
        const res = await fetch(`${backendUrl}/api/sync?secret=stylesafari`);
        const data = await res.json();
        outfitsDiv.innerHTML = `<p>${data.message} — ${data.count} products</p>`;
    } catch (err) {
        outfitsDiv.innerHTML = `<p style="color:red;">Sync Error: ${err.message}</p>`;
    }
});

function renderOutfits(outfits) {
    if (!outfits || !outfits.length) {
        outfitsDiv.innerHTML = "<p>No outfits found.</p>";
        return;
    }

    outfitsDiv.innerHTML = "";
    outfits.forEach((outfit, idx) => {
        const div = document.createElement("div");
        div.className = "outfit";
        div.innerHTML = `<h3>Outfit ${idx + 1}</h3>` +
            outfit.products.map(p => `
                <div class="product">
                    <img src="${p.image_url}" alt="${p.name}">
                    <p>${p.name}</p>
                    <p>${p.brand}</p>
                    <p>${p.price} ${p.currency}</p>
                    <p>${p.size || ""} | ${p.fabric || ""}</p>
                </div>
            `).join("");
        outfitsDiv.appendChild(div);
    });
}
