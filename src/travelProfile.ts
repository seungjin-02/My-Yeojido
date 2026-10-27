import type {TravelCategory,UserData,Region,RegionClassification} from './types';
import {createTravelGroups} from './travelGroups';
import {COLOR_THEMES} from './palettes';
export {PALETTE,DEFAULT_VISITED_COLOR} from './palettes';
export const REPEAT_CATEGORY='category:repeat';
export const defaultCategories=():TravelCategory[]=>[
 {id:'category:return',name:'다시 가고 싶은 곳',color:'#CB695D',rule:'manual'},
 {id:'category:food',name:'맛집이 많은 곳',color:'#E2A14A',rule:'manual'},
 {id:REPEAT_CATEGORY,name:'여러 번 간 곳',color:'#7569B1',rule:'repeat'},
 {id:'category:favorite',name:'나만의 최애 여행지',color:'#BE6D85',rule:'manual'},
 {id:'category:rest',name:'쉬어 가기 좋은 곳',color:'#4D9371',rule:'manual'},
 {id:'category:scenery',name:'풍경이 아름다운 곳',color:'#568CC4',rule:'manual'},
 {id:'category:culture',name:'문화·역사가 있는 곳',color:'#A69683',rule:'manual'}
].map((c,index)=>({...c,color:COLOR_THEMES[0].colors[index]})) as TravelCategory[];
export const visitCounts=(data:UserData)=>data.records.reduce<Record<string,number>>((counts,r)=>{counts[r.regionId]=(counts[r.regionId]||0)+1;return counts},{});
export function categoriesForRegion(data:UserData,regionId:string,counts=visitCounts(data)){const assigned=data.regionClassifications.find(r=>r.regionId===regionId)?.categoryIds||[];return data.categories.filter(c=>c.rule==='repeat'?(counts[regionId]||0)>=2:assigned.includes(c.id))}
export function primaryCategory(data:UserData,regionId:string,counts=visitCounts(data)){const available=categoriesForRegion(data,regionId,counts);const chosen=data.regionClassifications.find(r=>r.regionId===regionId)?.primaryCategoryId;return available.find(c=>c.id===chosen)||available[0]}
export function classifyRegion(data:UserData,entry:RegionClassification):UserData{return {...data,regionClassifications:[...data.regionClassifications.filter(r=>r.regionId!==entry.regionId),entry].filter(r=>r.categoryIds.length||r.primaryCategoryId)}}
export function replaceCategories(data:UserData,categories:TravelCategory[],visitedColor:string):UserData{const ids=new Set(categories.map(c=>c.id));return {...data,categories,mapPreferences:{visitedColor,colorMode:['visited','categories'].includes(data.mapPreferences.colorMode)||ids.has(data.mapPreferences.colorMode)?data.mapPreferences.colorMode:'categories'},regionClassifications:data.regionClassifications.map(r=>({...r,categoryIds:r.categoryIds.filter(id=>ids.has(id)),primaryCategoryId:r.primaryCategoryId&&ids.has(r.primaryCategoryId)?r.primaryCategoryId:null})).filter(r=>r.categoryIds.length||r.primaryCategoryId)}}
export function mapRegionColors(data:UserData,regions:Region[]){const counts=visitCounts(data),mode=data.mapPreferences.colorMode;return Object.fromEntries(regions.map(r=>{let color=(counts[r.id]||0)>0?data.mapPreferences.visitedColor:'#DFE5E7';if(mode==='categories')color=primaryCategory(data,r.id,counts)?.color||color;else if(mode!=='visited')color=categoriesForRegion(data,r.id,counts).find(c=>c.id===mode)?.color||'#DFE5E7';return [r.id,color]}))}
export const ACHIEVEMENT_GROUPS=['탐방','다시 찾기','취향','명소와 기록','계절과 시간','여행권'] as const;
type AchievementGroup=typeof ACHIEVEMENT_GROUPS[number];
export type Achievement={id:string;name:string;description:string;current:number;target:number;icon:'footprints'|'map'|'repeat'|'place'|'heart'|'food'|'island'|'calendar'|'compass';achieved:boolean;group:AchievementGroup};

export function getAchievements(data:UserData,regions:Region[]):Achievement[]{
  const known=new Set(regions.map(r=>r.id)),records=data.records.filter(r=>known.has(r.regionId));
  const ids=new Set(records.map(r=>r.regionId)),counts=visitCounts({...data,records}),places=new Set(records.flatMap(r=>r.placeIds));
  const provinceCount=new Set(regions.filter(r=>ids.has(r.id)).map(r=>r.provinceId)).size;
  const dated=records.filter(r=>r.visitedOn),days=[...new Set(dated.map(r=>r.visitedOn!))];
  const season=(day:string)=>Math.floor(Number(day.slice(5,7))%12/3);
  const seasons=new Set(days.map(season)),years=new Set(days.map(day=>day.slice(0,4))),months=new Set(days.map(day=>day.slice(5,7)));
  const weekends=days.filter(day=>[0,6].includes(new Date(day+'T12:00:00Z').getUTCDay())).length;
  const seasonCities=(index:number)=>new Set(dated.filter(r=>season(r.visitedOn!)===index).map(r=>r.regionId)).size;
  const categoryCount=(id:string)=>regions.filter(r=>categoriesForRegion(data,r.id,counts).some(c=>c.id===id)).length;
  const categoryName=(id:string)=>data.categories.find(c=>c.id===id)?.name||id;
  const classified=regions.filter(r=>categoriesForRegion(data,r.id,counts).length).length;
  const most=Math.max(0,...Object.values(counts)),groups=regions.length?createTravelGroups(regions):[];
  const completeGroups=groups.filter(g=>g.regionIds.every(id=>ids.has(id))).length;
  const notes=records.filter(r=>r.note.trim()).length,customPlaces=[...places].filter(id=>id.startsWith('custom:')).length;
  type Definition=[string,string,string,number,number,Achievement['icon'],AchievementGroup];
  const defs:Definition[]=[
    ['first','첫 발걸음','방문 기록 1개 남기기',records.length,1,'footprints','탐방'],
    ['journal-5','여행의 조각','방문 기록 5개 모으기',records.length,5,'footprints','탐방'],
    ['journal-20','차곡차곡 여행가','방문 기록 20개 모으기',records.length,20,'footprints','탐방'],
    ['journal-50','쉰 번의 출발','방문 기록 50개 모으기',records.length,50,'footprints','탐방'],
    ['cities-3','새로운 세 곳','서로 다른 도시·지역 3곳 방문',ids.size,3,'map','탐방'],
    ['cities-10','열 곳의 이야기','서로 다른 도시·지역 10곳 방문',ids.size,10,'map','탐방'],
    ['cities-30','전국 여행 수집가','서로 다른 도시·지역 30곳 방문',ids.size,30,'map','탐방'],
    ['cities-50','오십 빛깔 지도','서로 다른 도시·지역 50곳 방문',ids.size,50,'map','탐방'],
    ['cities-all','나의 완성된 여지도','지도의 모든 도시·지역 방문',ids.size,regions.length||1,'map','탐방'],
    ['provinces-3','여행의 반경','3개 시·도에 기록 남기기',provinceCount,3,'compass','탐방'],
    ['provinces-7','넓어지는 지도','7개 시·도에 기록 남기기',provinceCount,7,'compass','탐방'],
    ['provinces-all','전국의 색을 만나다','모든 시·도에 한 곳 이상 방문',provinceCount,new Set(regions.map(r=>r.provinceId)).size||1,'compass','탐방'],
    ['repeat-2','다시 만난 도시','같은 도시·지역에 기록 2개 남기기',most,2,'repeat','다시 찾기'],
    ['repeat-5','나만의 단골 여행지','같은 도시·지역에 기록 5개 남기기',most,5,'repeat','다시 찾기'],
    ['repeat-cities','다시 찾는 이유','서로 다른 지역 3곳을 각각 2회 이상 기록',Object.values(counts).filter(n=>n>=2).length,3,'repeat','다시 찾기'],
    ['places-3','장소를 기억하는 법','서로 다른 명소 3곳 방문 기록',places.size,3,'place','명소와 기록'],
    ['places-10','나만의 명소 지도','서로 다른 명소 10곳 방문 기록',places.size,10,'place','명소와 기록'],
    ['custom-place','내가 발견한 장소','직접 추가한 명소 1곳 방문 기록',customPlaces,1,'place','명소와 기록'],
    ['custom-places-5','나만 아는 다섯 곳','직접 추가한 명소 5곳 방문 기록',customPlaces,5,'place','명소와 기록'],
    ['notes-5','문장으로 남긴 풍경','메모가 있는 방문 기록 5개',notes,5,'footprints','명소와 기록'],
    ['notes-20','여행 작가의 노트','메모가 있는 방문 기록 20개',notes,20,'footprints','명소와 기록'],
    ['bookmarks-5','다음에 만날 장소','서로 다른 명소 5곳 북마크',data.bookmarkedPlaceIds.length,5,'heart','명소와 기록'],
    ['return-3','다음 여행의 약속',`${categoryName('category:return')} 3곳 분류`,categoryCount('category:return'),3,'heart','취향'],
    ['food-3','미식 여행의 지도',`${categoryName('category:food')} 3곳 분류`,categoryCount('category:food'),3,'food','취향'],
    ['favorite-3','마음에 담은 도시',`${categoryName('category:favorite')} 3곳 분류`,categoryCount('category:favorite'),3,'heart','취향'],
    ['rest-3','쉼표를 찾는 여행',`${categoryName('category:rest')} 3곳 분류`,categoryCount('category:rest'),3,'heart','취향'],
    ['scenery-3','풍경 수집가',`${categoryName('category:scenery')} 3곳 분류`,categoryCount('category:scenery'),3,'map','취향'],
    ['culture-3','시간을 걷는 사람',`${categoryName('category:culture')} 3곳 분류`,categoryCount('category:culture'),3,'place','취향'],
    ['labels-5','취향이 있는 여행','분류된 도시·지역 5곳 모으기',classified,5,'heart','취향'],
    ['taste-3','세 가지 여행 취향','서로 다른 수동 분류 3종 사용',data.categories.filter(c=>c.rule==='manual'&&categoryCount(c.id)>0).length,3,'heart','취향'],
    ['seasons','사계절의 기억','방문일 기준 네 계절 기록 모으기',seasons.size,4,'calendar','계절과 시간'],
    ['years','해를 잇는 여행','방문일 기준 서로 다른 두 해 기록',years.size,2,'calendar','계절과 시간'],
    ['months-6','달력을 넘기는 여행','방문일의 월이 서로 다른 여섯 달 기록',months.size,6,'calendar','계절과 시간'],
    ['months-12','열두 달 여행자','1월부터 12월까지 모든 월에 방문 기록',months.size,12,'calendar','계절과 시간'],
    ['weekend-3','주말의 작은 탈출','서로 다른 토·일요일 3일에 방문 기록',weekends,3,'calendar','계절과 시간'],
    ['weekday-3','평일의 여유','서로 다른 평일 3일에 방문 기록',days.length-weekends,3,'calendar','계절과 시간'],
    ['spring','봄의 세 장면','봄(3~5월)에 서로 다른 지역 3곳 방문',seasonCities(1),3,'calendar','계절과 시간'],
    ['summer','여름을 따라','여름(6~8월)에 서로 다른 지역 3곳 방문',seasonCities(2),3,'calendar','계절과 시간'],
    ['autumn','가을빛 산책','가을(9~11월)에 서로 다른 지역 3곳 방문',seasonCities(3),3,'calendar','계절과 시간'],
    ['winter','겨울의 온도','겨울(12~2월)에 서로 다른 지역 3곳 방문',seasonCities(0),3,'calendar','계절과 시간'],
    ['islands','동해의 두 섬','울릉도와 독도에 각각 방문 기록',Number(ids.has('travel:ulleung'))+Number(ids.has('travel:dokdo')),2,'island','여행권'],
    ['jeju','제주의 두 풍경','제주시와 서귀포시에 각각 방문 기록',regions.filter(r=>['제주시','서귀포시'].includes(r.name)&&ids.has(r.id)).length,2,'island','여행권'],
    ['group','여행권 한 바퀴','한 여행권의 모든 도시·지역 방문',completeGroups,1,'compass','여행권'],
    ['groups-3','여행권을 잇는 길','서로 다른 여행권 세 곳 완주',completeGroups,3,'compass','여행권'],
  ];
  const specificNames:Record<string,string>={capital:'도시의 네 가지 얼굴','gyeonggi-south':'경기 남부 한 바퀴','gangwon-coast':'동해를 따라 걷기','chungnam-coast':'서해의 여섯 장면','jeonbuk-west':'전북 서쪽 여행','jeonnam-east':'남도의 다섯 이야기','gyeongbuk-coast':'경북 바다 수집가','gyeongnam-coast':'남해안의 기억'};
  for(const group of groups.filter(g=>g.id in specificNames))defs.push([`group:${group.id}`,specificNames[group.id],`${group.name}의 모든 도시·지역 방문`,group.regionIds.filter(id=>ids.has(id)).length,group.regionIds.length,'compass','여행권']);
  // Loading has no group members yet; keep a stable 52-card catalogue.
  if(!regions.length)for(const id of Object.keys(specificNames))defs.push([`group:${id}`,specificNames[id],'여행권의 모든 도시·지역 방문',0,1,'compass','여행권']);
  return defs.map(([id,name,description,current,target,icon,group])=>({id,name,description,current,target,icon,group,achieved:current>=target}));
}
