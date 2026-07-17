import axios from "axios";

export async function getPlacesData(city) {
    try {
        // Nominatim requires a descriptive User-Agent header to comply with their usage policy.
        const url = "https://nominatim.openstreetmap.org/search";
        const response = await axios.get(url, {
            params: {
                q: `attraction in ${city}`, // This phrasing matches Nominatim's parser far more reliably than "${city} tourist", which returns zero results for many cities (e.g. Seattle)
                format: "json",
                addressdetails: 1,
                limit: 15,            // Returns a raw list of up to 15 records for the MCP agent to chew through
            },
            headers: {
                "User-Agent": "MCPAgentLocationTool/1.0 (contact@yourdomain.com)"
            }
        });

        const data = response.data;

        if (!data || data.length === 0) {
            throw new Error(`No famous places found for "${city}".`);
        }

        // Returns the raw array of places right to the MCP agent for custom filtering/parsing
        return data;

    } catch (error) {
        console.error("Places API error: ", error.message);
        throw new Error(`Unable to retrieve places for "${city}".`);
    }
}