export async function searchGDELT(query: string, maxRecords = 5): Promise<string> {
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&format=json&maxrecords=${maxRecords}`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) {
            console.warn(`GDELT API error: ${res.statusText}`);
            return "No recent news context available.";
        }

        const json = await res.json();
        if (json && json.articles && Array.isArray(json.articles)) {
            if (json.articles.length === 0) return "No recent news context available.";

            // Return titles formatted as list
            return json.articles.map((a: { title: string, url: string }) => `- ${a.title}`).join("\n");
            // Or return just a blob of text?
            // Spec says "return formatted titles".
        }

        return "No recent news context available.";
    } catch (error) {
        console.warn("GDELT fetch failed", error);
        return "No recent news context available.";
    }
}
