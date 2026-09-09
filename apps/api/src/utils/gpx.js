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
    };
}