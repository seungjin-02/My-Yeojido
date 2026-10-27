import type {Region,Place,UserData,VisitRecord} from './types';
import {refreshLegacyColors} from './palettes';
import regionMapping from './data/region-mapping.json';
import {defaultCategories,DEFAULT_VISITED_COLOR,REPEAT_CATEGORY} from './travelProfile';
export const DATASET='travel-cities-2026-10-01-v2';
export const PREVIOUS_DATASET='admdongkor-2026-10-01-v1';
export const LEGACY_ISLAND='legacy:ulleung-county';
export const KEY='footprint.user.v1';
export const emptyData=():UserData=>({schemaVersion:3,datasetVersion:DATASET,records:[],bookmarkedPlaceIds:[],placeOverrides:[],hiddenPlaceIds:[],categories:defaultCategories(),regionClassifications:[],mapPreferences:{visitedColor:DEFAULT_VISITED_COLOR,colorMode:'visited'}});
export const catalogPlaces=(base:Place[],data:UserData):Place[]=>[...new Map([...base,...data.placeOverrides].map(p=>[p.id,p])).values()];
export const deleteCatalogPlace=(data:UserData,id:string):UserData=>({...data,hiddenPlaceIds:[...new Set([...data.hiddenPlaceIds,id])],bookmarkedPlaceIds:data.bookmarkedPlaceIds.filter(x=>x!==id)});
export const upsertCatalogPlace=(data:UserData,place:Place):UserData=>({...data,placeOverrides:[...data.placeOverrides.filter(p=>p.id!==place.id),place],hiddenPlaceIds:data.hiddenPlaceIds.filter(id=>id!==place.id)});
export const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const fail=(m:string):never=>{throw new Error(m)};
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function validDay(v:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v&&v<=today()}
export function validateData(value:unknown,regions:Region[],places:Place[]):UserData{
  if(!obj(value))return fail('올바른 백업 문서가 아니에요.');
  if(![1,2,3].includes(value.schemaVersion as number))return fail('지원하지 않는 저장 형식 버전이에요.');
  if(value.datasetVersion===PREVIOUS_DATASET){
    const mapId=(id:unknown)=>typeof id==='string'?(regionMapping as Record<string,string>)[id]||id:id;
    const mappedRecords=Array.isArray(value.records)?value.records.map(r=>obj(r)?{...r,regionId:mapId(r.regionId)}:r):value.records;
    const mappedPlaces=Array.isArray(value.placeOverrides)?value.placeOverrides.map(p=>obj(p)?{...p,regionId:mapId(p.regionId)}:p):value.placeOverrides;
    value={...value,datasetVersion:DATASET,records:mappedRecords,placeOverrides:mappedPlaces};
  }
  if(!obj(value)||value.datasetVersion!==DATASET)return fail('지도 데이터 버전이 달라요. 기존 기록은 유지됩니다.');
  if(!Array.isArray(value.records)||!Array.isArray(value.bookmarkedPlaceIds))return fail('기록 또는 북마크 배열이 올바르지 않아요.');
  if(value.records.length>20000)return fail('기록 수가 너무 많아요. 최대 20,000개를 지원해요.');
  const regionIds=new Set([...regions.map(r=>r.id),LEGACY_ISLAND]), baseMap=new Map(places.map(p=>[p.id,p])), ids=new Set<string>();
  const overrides=value.schemaVersion===1?[]:value.placeOverrides;
  const hidden=value.schemaVersion===1?[]:value.hiddenPlaceIds;
  if(!Array.isArray(overrides)||overrides.length>5000||!Array.isArray(hidden))return fail('명소 편집 데이터 형식이 올바르지 않아요.');
  const placeIds=new Set<string>();
  const placeOverrides:Place[]=overrides.map(p=>{
    if(!obj(p)||typeof p.id!=='string'||p.id.length>120||(!baseMap.has(p.id)&&!/^custom:[a-zA-Z0-9-]{1,80}$/.test(p.id))||placeIds.has(p.id))return fail('명소 ID가 올바르지 않거나 중복돼요.');
    placeIds.add(p.id);
    if(typeof p.regionId!=='string'||!regionIds.has(p.regionId)||baseMap.has(p.id)&&baseMap.get(p.id)!.regionId!==p.regionId)return fail('명소의 지역이 올바르지 않아요.');
    if(typeof p.name!=='string'||!p.name.trim()||p.name.length>80)return fail('명소 이름은 1~80자로 입력해 주세요.');
    if(!Array.isArray(p.activityTags)||p.activityTags.length>3||p.activityTags.some(t=>typeof t!=='string'||!t.trim()||t.length>20)||new Set(p.activityTags).size!==p.activityTags.length)return fail('활동 태그는 20자 이하로 최대 3개까지 입력해 주세요.');
    if(!['coffee','waves','landmark','tree','mountain','store'].includes(p.icon as string))return fail('명소 아이콘이 올바르지 않아요.');
    if(typeof p.sourceUrl!=='string'||p.sourceUrl.length>2000)return fail('출처 주소가 올바르지 않아요.');
    if(p.sourceUrl){try{const url=new URL(p.sourceUrl);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error()}catch{return fail('출처 주소는 http 또는 https 링크를 입력해 주세요.')}}
    if(typeof p.checkedAt!=='string'||!validDay(p.checkedAt))return fail('명소 저장일이 올바르지 않아요.');
    return {id:p.id,regionId:p.regionId,name:p.name.trim(),activityTags:[...p.activityTags],icon:p.icon,sourceUrl:p.sourceUrl,checkedAt:p.checkedAt} as Place;
  });
  const placeMap=new Map([...places,...placeOverrides].map(p=>[p.id,p]));
  if(hidden.some(id=>typeof id!=='string'||!placeMap.has(id))||new Set(hidden).size!==hidden.length)return fail('삭제된 명소의 참조가 올바르지 않아요.');
  const records:VisitRecord[]=value.records.map(v=>{
    if(!obj(v))return fail('기록 형식이 올바르지 않아요.');
    for(const key of ['id','regionId','regionNameSnapshot','note','createdAt','updatedAt'])if(typeof v[key]!=='string')return fail(`기록의 ${key} 값이 올바르지 않아요.`);
    if(!(v.id as string).length||(v.id as string).length>120||ids.has(v.id as string))return fail('기록 ID가 비어 있거나 중복돼요.');
    ids.add(v.id as string);
    if(!regionIds.has(v.regionId as string))return fail(`알 수 없는 지역 ID: ${v.regionId}`);
    if((v.note as string).length>500||(v.regionNameSnapshot as string).length>160)return fail('기록의 글자 수 제한을 초과했어요.');
    if(v.visitedOn!==null&&(typeof v.visitedOn!=='string'||!validDay(v.visitedOn)))return fail('방문일이 올바르지 않거나 미래 날짜예요.');
    if(!Array.isArray(v.placeIds)||new Set(v.placeIds).size!==v.placeIds.length)return fail('명소 목록이 올바르지 않아요.');
    for(const pid of v.placeIds)if(typeof pid!=='string'||placeMap.get(pid)?.regionId!==v.regionId)return fail(`명소가 없거나 기록 지역과 달라요: ${pid}`);
    for(const key of ['createdAt','updatedAt'])if(!/^\d{4}-\d{2}-\d{2}T/.test(v[key] as string)||!Number.isFinite(Date.parse(v[key] as string)))return fail('기록 시각이 올바르지 않아요.');
    return {id:v.id,regionId:v.regionId,regionNameSnapshot:v.regionNameSnapshot,visitedOn:v.visitedOn,placeIds:[...v.placeIds],note:v.note,createdAt:v.createdAt,updatedAt:v.updatedAt} as VisitRecord;
  });
  const bookmarks=value.bookmarkedPlaceIds;
  if(new Set(bookmarks).size!==bookmarks.length||bookmarks.some(v=>typeof v!=='string'||!placeMap.has(v)||hidden.includes(v)))return fail('알 수 없거나 삭제·중복된 북마크 ID가 있어요.');
  const profile=refreshLegacyColors(validateProfile(value,regions));
  return {schemaVersion:3,datasetVersion:DATASET,records,bookmarkedPlaceIds:[...bookmarks] as string[],placeOverrides,hiddenPlaceIds:[...hidden] as string[],...profile};
}
function validateProfile(value:Record<string,unknown>,regions:Region[]):Pick<UserData,'categories'|'regionClassifications'|'mapPreferences'>{
 if(value.schemaVersion!==3){const {categories,regionClassifications,mapPreferences}=emptyData();return {categories,regionClassifications,mapPreferences}}
 const hex=(v:unknown):v is string=>typeof v==='string'&&/^#[\da-fA-F]{6}$/.test(v);
 if(!Array.isArray(value.categories)||value.categories.length>30)return fail('분류 목록은 최대 30개까지 저장할 수 있어요.');
 const ids=new Set<string>(),names=new Set<string>();
 const defaults=defaultCategories();
 const categories:UserData['categories']=value.categories.map(c=>{
  if(!obj(c)||typeof c.id!=='string'||c.id.length>120||(!defaults.some(d=>d.id===c.id)&&!/^custom-category:[a-zA-Z0-9-]{1,80}$/.test(c.id))||ids.has(c.id))return fail('분류 ID가 올바르지 않거나 중복돼요.');
  if(typeof c.name!=='string'||!c.name.trim()||c.name.length>24||names.has(c.name.trim().toLocaleLowerCase()))return fail('분류 이름은 중복 없이 1~24자로 입력해 주세요.');
  if(!hex(c.color))return fail('분류 색상은 #RRGGBB 형식으로 입력해 주세요.');
  if(c.rule!==(c.id===REPEAT_CATEGORY?'repeat':'manual'))return fail('분류 계산 규칙이 올바르지 않아요.');
  ids.add(c.id);names.add(c.name.trim().toLocaleLowerCase());return {id:c.id,name:c.name.trim(),color:c.color,rule:c.id===REPEAT_CATEGORY?'repeat':'manual'};
 });
 if(defaults.some(c=>!ids.has(c.id)))return fail('기본 분류가 누락됐어요.');
 if(!Array.isArray(value.regionClassifications)||value.regionClassifications.length>regions.length)return fail('여행지 분류 데이터가 올바르지 않아요.');
 const assigned=new Set<string>(),regionIds=new Set(regions.map(r=>r.id));
 const regionClassifications:UserData['regionClassifications']=value.regionClassifications.map(r=>{
  if(!obj(r)||typeof r.regionId!=='string'||!regionIds.has(r.regionId)||assigned.has(r.regionId))return fail('여행지 분류의 지역이 없거나 중복돼요.');
  if(!Array.isArray(r.categoryIds)||new Set(r.categoryIds).size!==r.categoryIds.length||r.categoryIds.some(id=>typeof id!=='string'||!ids.has(id)||id===REPEAT_CATEGORY))return fail('여행지 분류의 참조가 올바르지 않아요.');
  if(r.primaryCategoryId!==null&&(typeof r.primaryCategoryId!=='string'||!ids.has(r.primaryCategoryId)||(r.primaryCategoryId!==REPEAT_CATEGORY&&!r.categoryIds.includes(r.primaryCategoryId))))return fail('대표 색상의 분류를 먼저 선택해 주세요.');
  assigned.add(r.regionId);return {regionId:r.regionId,categoryIds:[...r.categoryIds] as string[],primaryCategoryId:r.primaryCategoryId as string|null};
 });
 if(!obj(value.mapPreferences)||!hex(value.mapPreferences.visitedColor)||typeof value.mapPreferences.colorMode!=='string'||(!['visited','categories'].includes(value.mapPreferences.colorMode)&&!ids.has(value.mapPreferences.colorMode)))return fail('지도 색상 설정이 올바르지 않아요.');
 return {categories,regionClassifications,mapPreferences:{visitedColor:value.mapPreferences.visitedColor,colorMode:value.mapPreferences.colorMode}};
}
export function parseBackup(raw:string,regions:Region[],places:Place[]){if(new Blob([raw]).size>5*1024*1024)throw Error('5MiB 이하의 파일을 선택해 주세요.');let value;try{value=JSON.parse(raw)}catch{throw Error('JSON 파일을 읽을 수 없어요. 원본 기록은 유지됩니다.')}return validateData(value,regions,places)}
export const visitedRegions=(records:VisitRecord[])=>new Set(records.map(r=>r.regionId));
export const visitedPlaces=(records:VisitRecord[])=>new Set(records.flatMap(r=>r.placeIds));
export const sortedRecords=(records:VisitRecord[])=>[...records].sort((a,b)=>a.visitedOn&&b.visitedOn?b.visitedOn.localeCompare(a.visitedOn):a.visitedOn?-1:b.visitedOn?1:b.createdAt.localeCompare(a.createdAt));
export function saveAtomic(data:UserData,expectedRaw:string|null){if(localStorage.getItem(KEY)!==expectedRaw)throw Error('다른 탭에서 기록이 변경됐어요. 입력 내용은 유지됩니다. 최신 기록 확인 후 다시 열어 주세요.');const raw=JSON.stringify(data);localStorage.setItem(KEY,raw);return raw;}
export function download(name:string,raw:string){const url=URL.createObjectURL(new Blob([raw],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
