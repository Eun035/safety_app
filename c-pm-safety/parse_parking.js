// parse_parking.js
import fs from 'fs';

async function processLineByLine() {
    const parsedData = [];
    const files = ['raw_parking_1.txt', 'raw_parking_2.txt', 'raw_parking_3.txt'];

    for (const file of files) {
        if (!fs.existsSync(file)) continue;
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');

        for (const line of lines) {
            if (line.trim() === '' || line.startsWith('연번') || line.startsWith('천안시 PM주차장 위치 목록')) {
                continue;
            }

            const cols = line.split('\t').map(c => c.trim());
            // Expecting standard columns: No, Gu, Dong, Bunji, Location, Lat, Lng, Capacity
            // Sometimes there are fewer columns if some are merged, but we mainly need lat, lng, location, capacity

            // Let's find lat/lng by guessing the floats since columns might shift.
            let lat = NaN;
            let lng = NaN;
            let capacity = '';
            let locationName = '';

            // Usually Lat and Lng are cols 5 and 6, and capacity is 7.
            // E.g., 1	동남구	청당동 	951	한양수자인 하늘약국 앞 	36.7823895807996	127.152812892566	5대~7대
            if (cols.length >= 7) {
                // Find which columns look like coordinates
                for (let i = 0; i < cols.length - 1; i++) {
                    let val1 = parseFloat(cols[i]);
                    let val2 = parseFloat(cols[i + 1]);
                    if (val1 > 35 && val1 < 38 && val2 > 126 && val2 < 128) {
                        lat = val1;
                        lng = val2;
                        // Everything before this is location info
                        locationName = cols.slice(3, i).join(' ').trim();
                        // the column after lng is capacity
                        capacity = cols[i + 2] || '알 수 없음';
                        break;
                    }
                }
            }

            if (!isNaN(lat) && !isNaN(lng)) {
                parsedData.push({
                    lat,
                    lng,
                    locationName: locationName || cols[4], // fallback
                    capacity
                });
            }
        }
    }

    // Ensure directory exists
    if (!fs.existsSync('c:/Users/ComHolic/pm_onaj/c-pm-safety/src/data')) {
        fs.mkdirSync('c:/Users/ComHolic/pm_onaj/c-pm-safety/src/data', { recursive: true });
    }

    fs.writeFileSync('c:/Users/ComHolic/pm_onaj/c-pm-safety/src/data/pm_parking_data.json', JSON.stringify(parsedData, null, 2), 'utf8');
    console.log(`Successfully parsed and saved ${parsedData.length} parking locations.`);
}

processLineByLine();
