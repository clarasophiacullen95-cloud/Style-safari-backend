const backend = "https://style-safari-backend.vercel.app";

async function search() {
    const q = document.getElementById("searchInput").value;

    const res = await fetch(
        `${backend}/api/ai-search?secret=stylesafari&q=${encodeURIComponent(q)}&gender=female`
    );

    const data = await res.json();

    document.getElementById("results").innerHTML =
        data.map(p => `<img src="${p.image_url}" /> ${p.name}`).join("<br>");
}
