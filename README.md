# AirSense 🌍💨

**Interactive geospatial viewer for historical air quality data (Valle del Cauca, Colombia — 2011–2023).**

---

## Overview
AirSense is a web application that visualizes historical air quality data across 10 municipalities of Valle del Cauca. The platform provides an interactive map with monitoring stations, filters by municipality, year, and pollutant, and a color-coded legend aligned with environmental quality standards to help citizens, authorities, researchers, and organizations make informed decisions.

---

## Features
- Interactive map of Valle del Cauca with panning and zoom.
- Display of monitoring stations as map markers.
- Filters by municipality, year, and pollutant (contaminant).
- Color-coded legend to interpret air quality levels.
- Compound (pollutant) dictionary for non-technical users.
- (Planned) User comments section for release #3.
- User registration and login (Planned / Por definir).

---

## Tech Stack
- **Frontend:** HTML, CSS, JavaScript, Leaflet.js  
- **Backend:** Node.js, Express.js  
- **Database:** PostgreSQL  
- **Hosting (planned):** Render.com or Railway.app (free tier for MVP)

---

## Data Sources
- Historical datasets: DAGMA, CVC, regional monitoring stations, public community sensors (all public datasets).  
- Time range: 2011 — 2023.  
- ~24 monitored chemical compounds across 10 municipalities.

---

## Prerequisites (developers)
> **Note:** Many environment-specific details are currently **Por definir**. This is a placeholder list until the project reaches implementation:

- Git (to clone repository)  
- Node.js (version: Por definir)  
- Access credentials to the project database (the DB is pre-populated; connection details: Por definir)  
- (Optional) PostgreSQL client tools for local queries (if needed)

---

## Installation (placeholder / generic)
> These steps are a template. Replace or expand them when implementation details are defined.

1. Clone the repository:
```bash
git clone https://github.com/AirSense-Project/Airsense-V2.git
```

2. Install dependencies:
```bash
#\Airsense V2
npm install
```

3. Environment configuration:
- Create a `.env` file.  

```bash
#Airsense\backend
DB_USER=postgres.czcidrooqhaxysxhxqbr
DB_PASSWORD=contaminacionaire
DB_HOST=aws-1-us-east-2.pooler.supabase.com
DB_NAME=postgres
DB_PORT=6543
```

4. Start the development server:
```bash
#Airsense V2\backend
cd backend
node index.js
#or
node --watch index.js
```

5. Open the frontend in your browser (URL: Por definir or `http://localhost:PORT`).

---

## Deployment / Hosting
The project plans to use cloud hosting options suitable for Node.js backends and static frontends. Current candidate providers for the backend are:

- **Render.com** (free tier available for hobby projects)  
- **Railway.app** (free tier available for small apps)

Frontend can be served from the same host or from static hosting (Por definir). Example production URL will be added once deployed (e.g. `https://airsense.onrender.com`).

---

## Usage (end user)
- The final product will be a public web page. End users only need to open the deployed URL to:
  - See the interactive map
  - Use filters (municipality, year, pollutant)
  - Read the compound dictionary
  - Interpret the color legend to assess air quality

---

## Contributing
**Contribution guidelines:** Por definir.  
Until defined, please reach out to project maintainers (team members listed below) before opening significant pull requests.

Basic suggested workflow (to be formalized later):
1. Fork repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes with clear messages
4. Open a Pull Request to `main` with a description of changes

---

## Roadmap
- **Release 1 (MVP):** Map + station markers + filters by municipality/year/compound + legend + compound dictionary.  
- **Release 2:** Auth (registration/login) and improved analytics.  
- **Release 3:** User comments / feedback system (Planned).

---

## License
This project is released under the **MIT License**. See the `LICENSE` file for details.

---

## Authors
- Andres Lopez  
- Katherine Lopez  
- Luz Amelia Ibarguen  
- Nicolas Sanchez

---

## Contact
For questions or collaboration, contact the project team. (LinkedIn & emails: Por definir)
