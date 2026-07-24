# Google Places Autocomplete Fix

The autocomplete API route now:

- sends the required response field mask;
- returns the actual Google API error to the form;
- uses an autocomplete session token;
- limits results to India.

## Google Cloud checks

Enable **Places API (New)** in the same Google Cloud project used by `GOOGLE_MAPS_SERVER_API_KEY`.

For the server key:

- API restriction: **Places API (New)** and **Geocoding API**
- Do not use a Website / HTTP referrer restriction on this server key.
- Do not use an IP restriction unless you have configured fixed Vercel outbound IPs.

The browser key can remain website-referrer restricted.

After changing a key or environment variable, redeploy the Vercel project.
