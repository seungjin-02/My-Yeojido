import fs from 'node:fs';
const geo=JSON.parse(fs.readFileSync(process.argv[2]||'work/data/grouped.geojson'));
geo.features.forEach(f=>f.id=f.properties.id);
const regions=JSON.parse(fs.readFileSync('public/data/regions.json'));
if(geo.features.length!==regions.length||new Set(geo.features.map(f=>f.id)).size!==regions.length)throw Error('Region and geometry mismatch');
fs.writeFileSync('public/data/regions.geojson',JSON.stringify(geo));
console.log(`${geo.features.length} travel regions finalized`);
