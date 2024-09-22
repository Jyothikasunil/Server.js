const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const cookieSession = require('cookie-session');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const cors = require('cors');
require('dotenv').config();

// Original server.js functionality

const port = 8080;
const rootDirectory = __dirname;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors({ origin: ["http://localhost:8081"] }));
app.use(helmet({ contentSecurityPolicy: false }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Cookie session setup
app.use(cookieSession({
    name: "echo-session",
    keys: [process.env.COOKIE_SECRET],
    httpOnly: true,
}));

// Initialize requests.json if it doesn't exist
const filePath = path.join(__dirname, 'public', 'requests.json');
if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([]), 'utf8');
}

// Helper function to sanitize inputs
function escapeHtmlEntities(input) {
    return input.replace(/[\u00A0-\u9999<>&]/gim, function (i) {
        return "&#" + i.charCodeAt(0) + ";";
    });
}

// Animal Sighting Submission API
app.post('/api/sightings', (req, res) => {
    const { species, location, dateTime, observations } = req.body;

    console.log('Species:', species);
    console.log('Location:', location);
    console.log('Date/Time:', dateTime);
    console.log('Observations:', observations);

    // Input validation
    if (!species || !location || !dateTime || !location.latitude || !location.longitude) {
        return res.status(400).json({ message: 'All required fields must be filled' });
    }

    if (isNaN(location.latitude) || location.latitude < -90 || location.latitude > 90 || isNaN(location.longitude) || location.longitude < -180 || location.longitude > 180) {
        return res.status(400).json({ message: 'Invalid latitude or longitude' });
    }

    const sanitizedSpecies = escapeHtmlEntities(species);
    const sanitizedObservations = escapeHtmlEntities(observations || '');

    // Save animal sighting to requests.json
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ message: 'Failed to read requests file' });
        }

        let requests;
        try {
            requests = JSON.parse(data);
        } catch (parseError) {
            return res.status(500).json({ message: 'Failed to parse requests file' });
        }

        const newSighting = {
            species: sanitizedSpecies,
            location: {
                latitude: parseFloat(location.latitude),
                longitude: parseFloat(location.longitude)
            },
            dateTime,
            observations: sanitizedObservations,
        };

        requests.push(newSighting);

        fs.writeFile(filePath, JSON.stringify(requests, null, 2), err => {
            if (err) {
                return res.status(500).json({ message: 'Failed to save request' });
            }

            console.log('New sighting submitted:', newSighting);
            res.json({ message: 'Sighting submitted successfully', sighting: newSighting });
        });
    });
});

// Other routes from the existing server.js go here...

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
