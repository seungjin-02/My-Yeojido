import type {UserData,Region} from './types';
import {categoriesForRegion,visitCounts} from './travelProfile';

export function getTravelStats(data:UserData,regions:Region[],year:number){
  const known=new Set(regions.map(r=>r.id)),records=data.records.filter(r=>known.has(r.regionId));
  const counts=visitCounts({...data,records}),visited=regions.filter(r=>counts[r.id]),dated=records.filter(r=>r.visitedOn);
  const months=Array.from({length:12},(_,month)=>({month:month+1,count:dated.filter(r=>Number(r.visitedOn!.slice(0,4))===year&&Number(r.visitedOn!.slice(5,7))===month+1).length}));
  const provinces=[...new Set(regions.map(r=>r.provinceId))].map(id=>{const members=regions.filter(r=>r.provinceId===id);const name=members.length===1&&members[0].provinceName==='대한민국'?members[0].name:members[0].provinceName;return {id,name,total:members.length,visited:members.filter(r=>counts[r.id]).length}}).sort((a,b)=>b.visited/b.total-a.visited/a.total||b.visited-a.visited||a.name.localeCompare(b.name,'ko'));
  const tastes=data.categories.map(c=>({...c,count:regions.filter(r=>categoriesForRegion(data,r.id,counts).some(x=>x.id===c.id)).length})).sort((a,b)=>b.count-a.count);
  return {totalRecords:data.records.length,unresolved:data.records.length-records.length,visitedCount:visited.length,revisitedCount:visited.filter(r=>counts[r.id]>=2).length,placeCount:new Set(records.flatMap(r=>r.placeIds)).size,unknownDates:records.length-dated.length,months,yearRecordCount:months.reduce((sum,m)=>sum+m.count,0),years:[...new Set([...dated.map(r=>Number(r.visitedOn!.slice(0,4))),year])].sort((a,b)=>b-a),provinces,tastes,frequent:visited.map(r=>({...r,count:counts[r.id]})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'ko')).slice(0,5)};
}
