const backend = "https://style-safari-backend.vercel.app";

async function search() {
    const q = document.getElementById("searchInput").value;
    if (!q) return;

    const res = await fetch(`${backend}/api/ai-search?secret=stylesafari&q=${encodeURIComponent(q)}&gender=female`);
    const data = await res.json();

    document.getElementById("results").innerHTML =
        data.map(p => `<img src="${p.image_url}" /> ${p.name}`).join("<br>");
}

async function refreshOutfits() {
    const profile = {
        gender: "female",
        style: ["minimalist", "classic"],
        budget_min: 50,
        budget_max: 1000,
        wardrobe: []
    };

    const res = await fetch(`${backend}/api/ai-outfits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile)
    });

    const data = await res.json();
    document.getElementById("outfits").innerHTML =
        data.outfits.map(o => `<div><b>Outfit:</b> ${JSON.stringify(o)}</div>`).join("<hr>");
}const backend = "https://style-safari-backend.vercel.app";

async function search() {
    const q = document.getElementById("searchInput").value;
    if (!q) return;

    const res = await fetch(`${backend}/api/ai-search?secret=stylesafari&q=${encodeURIComponent(q)}&gender=female`);
    const data = await res.json();

    document.getElementById("results").innerHTML =
        data.map(p => `<img src="${p.image_url}" /> ${p.name}`).join("<br>");
}

async function refreshOutfits() {
    const profile = {
        gender: "female",
        style: ["minimalist", "classic"],
        budget_min: 50,
        budget_max: 1000,
        wardrobe: []
    };

    const res = await fetch(`${backend}/api/ai-outfits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile)
    });

    const data = await res.json();
    document.getElementById("outfits").innerHTML =
        data.outfits.map(o => `<div><b>Outfit:</b> ${JSON.stringify(o)}</div>`).join("<hr>");
}
