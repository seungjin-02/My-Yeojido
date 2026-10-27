import fs from 'node:fs';
const root='.',input=process.argv[2]||'work/district-data',regions=JSON.parse(fs.readFileSync(`${input}/regions.json`)),geo=JSON.parse(fs.readFileSync(`${input}/regions.geojson`));
fs.mkdirSync('work/data',{recursive:true});
// Preserve the shipped source for deterministic future reprojections/grouping.

const merged=[],mapping={},newRegions=new Map();
const bbox=(coords)=>{const b=[Infinity,Infinity,-Infinity,-Infinity];const walk=a=>{if(typeof a[0]==='number'){b[0]=Math.min(b[0],a[0]);b[1]=Math.min(b[1],a[1]);b[2]=Math.max(b[2],a[0]);b[3]=Math.max(b[3],a[1])}else a.forEach(walk)};walk(coords);return b};
for(const f of geo.features){const r=regions.find(r=>r.id===f.id);let id,name,provinceName=r.provinceName,provinceId=r.provinceId;
 if(r.sourceCode==='47940'){
  const polygons=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
  for(const [key,nm,predicate] of [['ulleung','울릉도',x=>x<131.5],['dokdo','독도',x=>x>=131.5]]){
   const coords=polygons.filter(p=>predicate(bbox(p)[0]));if(!coords.length)throw Error(`Missing ${nm}`);
   const island={...r,id:`travel:${key}`,sourceCode:r.sourceCode,name:nm,fullName:`경상북도 울릉군 ${nm}`,aliases:[nm,'울릉군'],bbox:bbox(coords)};
   newRegions.set(island.id,island);merged.push({type:'Feature',properties:{id:island.id,name:nm,provinceId},geometry:{type:'MultiPolygon',coordinates:coords}});
  }
  mapping[r.id]='legacy:ulleung-county';continue;
 }
 if(['11','26','27','28','30','31'].includes(r.provinceId)){id=`travel:metro:${r.provinceId}`;name=r.provinceName;provinceName='대한민국'}
 else if(/^12[23]/.test(r.sourceCode)){id='travel:metro:gwangju';name='광주';provinceName=r.provinceName}
 else if(r.name.includes('시 ')){const city=r.name.split(' ')[0];id=`travel:city:${r.provinceId}:${city}`;name=city}
 else{id=r.id;name=r.name}
 mapping[r.id]=id;
 const existing=newRegions.get(id),b=r.bbox;
 const next=existing?{...existing,aliases:[...new Set([...existing.aliases,r.name,r.fullName,...r.aliases])],bbox:[Math.min(existing.bbox[0],b[0]),Math.min(existing.bbox[1],b[1]),Math.max(existing.bbox[2],b[2]),Math.max(existing.bbox[3],b[3])]}:{...r,id,name,provinceName,fullName:provinceName==='대한민국'?name:`${provinceName} ${name}`,aliases:[name,name.replace(/[시군구]$/,''),r.name,r.fullName,...r.aliases],bbox:b};
 newRegions.set(id,next);merged.push({...f,properties:{id,name,provinceId}});
}
fs.writeFileSync('work/data/group-input.geojson',JSON.stringify({type:'FeatureCollection',features:merged}));
fs.writeFileSync(`${root}/public/data/regions.json`,JSON.stringify([...newRegions.values()]));
fs.writeFileSync(`${root}/public/data/region-mapping.json`,JSON.stringify(mapping));
console.log(`${regions.length} → ${newRegions.size} travel regions; ${merged.length} parts`);
fs.mkdirSync('src/data',{recursive:true});fs.writeFileSync('src/data/region-mapping.json',JSON.stringify(mapping));
