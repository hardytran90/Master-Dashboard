import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

// HAVERSINE FORMULA to calculate distance between 2 points in sphere 📌⚠️
function haversineMeters(lat1, lon1, lat2, lon2) {              //lat: latitude and lon: longitude 🌐
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Above this average speed (km/h) an activity is treated as a ride
const RIDE_MIN_KMH = 14;
 
// Turn a raw <type> or <name> value into 'run' | 'ride' | null
function normalizeType(raw) {
    if (raw == null) return null;
    const v = String(raw).toLowerCase().trim();
    if (v === '9') return 'run'; // older Strava exports use numeric codes
    if (v === '1') return 'ride';
    if (/ride|cycl|bik|đạp/.test(v)) return 'ride'; // "cycling", "Morning Ride", "Đạp xe buổi sáng"
    if (/run|jog|chạy/.test(v)) return 'run'; // "running", "Morning Run", "Chạy bộ buổi sáng"
    return null;
}
 
// Priority: <trk><type> → <trk><name> / <metadata><name> → average speed
function detectType(gpx, tracks, distanceMeters, durationSec) {
    for (const trk of tracks) {
        const t = normalizeType(trk?.type);
        if (t) return t;
    }
    for (const name of [...tracks.map((trk) => trk?.name), gpx.metadata?.name]) {
        const t = normalizeType(name);
        if (t) return t;
    }
    if (durationSec > 0) {
        const kmh = distanceMeters / 1000 / (durationSec / 3600);
        return kmh >= RIDE_MIN_KMH ? 'ride' : 'run';
    }
    return 'run';
}

export function parseGpx(xmlString) {
    const doc = parser.parse(xmlString);
    const gpx = doc.gpx;
    if (!gpx) {
        throw new Error('Wrong GPX file format!');
    }

    // GPX can contain many tracks, each track might has many track segments, each track segment might has track points
    const tracks = Array.isArray(gpx.trk) ? gpx.trk : [gpx.trk];
    const points = [];

    for (const trk of tracks) {
        if (!trk?.trkseg) continue;
        const segments = Array.isArray(trk.trkseg) ? trk.trkseg : [trk.trkseg];
        for (const seg of segments) {
            if (!seg?.trkpt) continue;
            const trkpts = Array.isArray(seg.trkpt) ? seg.trkpt : [seg.trkpt];
            for (const pt of trkpts) {
                points.push({
                    lat: parseFloat(pt.lat),
                    lon: parseFloat(pt.lon),
                    ele: pt.ele != null ? parseFloat(pt.ele) : null,
                    time: pt.time ? new Date(pt.time) : null,
                });
            }
        }
    }

    if (points.length < 2) {
        throw new Error('File GPX has no enough data!');
    }

    let distanceMeters = 0;
    let elevationGainM = 0;

    for (let i = 1; i < points.length; i++) {
        const prev = points[i -1];
        const curr = points[i];
        distanceMeters += haversineMeters(prev.lat, prev.lon, curr.lat, curr.lon);

        if (prev.ele != null && curr.ele != null && curr.ele > prev.ele) {
            elevationGainM += curr.ele - prev.ele;
        }
    }

    const firstTime = points[0].time;
    const lastTime = points[points.length - 1].time;
    const durationSec = firstTime && lastTime ? Math.round((lastTime - firstTime) / 1000) : null;

    return {
        distanceKm: (distanceMeters / 1000).toFixed(2),
        durationSec, 
        elevationGainM: Math.round(elevationGainM),
        activityDate: firstTime || new Date(),
        type: parsed.type,
    };
}