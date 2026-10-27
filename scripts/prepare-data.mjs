import fs from 'node:fs';
import path from 'node:path';
// Input: mapshaper-dissolved source, in WGS84. No geometry simplification.
const input = process.argv[2] || '../../work/data/districts.geojson';
const geo = JSON.parse(fs.readFileSync(input, 'utf8'));
const out = path.resolve(process.argv[3] || 'work/district-data');
fs.mkdirSync(out,{recursive:true});
const regions = geo.features.map(f => {
  const p=f.properties, id=`adm20261001:${p.sgg}`;
  const name=p.sggnm.replace(/시(?=.+구$)/,'시 ');
  const bbox=[Infinity,Infinity,-Infinity,-Infinity];
  const walk=a=> {if(typeof a[0]==='number'){bbox[0]=Math.min(bbox[0],a[0]);bbox[1]=Math.min(bbox[1],a[1]);bbox[2]=Math.max(bbox[2],a[0]);bbox[3]=Math.max(bbox[3],a[1]);}else a.forEach(walk)};
  walk(f.geometry.coordinates);
  const r={id,sourceCode:p.sgg,name,fullName:`${p.sidonm} ${name}`,provinceId:p.sido,provinceName:p.sidonm,aliases:[name.replace(/\s/g,''),name.replace(/[시군구]$/,'')],bbox};
  f.id=id;f.properties={id,name,provinceId:p.sido};
  return r;
});
if(new Set(regions.map(r=>r.id)).size!==regions.length) throw Error('Duplicate IDs');
const required=['종로구','해운대구','강릉시','속초시','경주시','여수시','제주시','서귀포시'];
for(const name of required)if(!regions.some(r=>r.name===name))throw Error(`Missing ${name}`);
if(regions.find(r=>r.name==='울릉군').bbox[2]<131.85)throw Error('Dokdo not preserved');
fs.writeFileSync(path.join(out,'regions.geojson'),JSON.stringify(geo));
fs.writeFileSync(path.join(out,'regions.json'),JSON.stringify(regions));
console.log(`${regions.length} regions; original dissolved geometry preserved`);
