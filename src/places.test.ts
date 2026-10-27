import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {emptyData,catalogPlaces,upsertCatalogPlace,deleteCatalogPlace,parseBackup,DATASET,PREVIOUS_DATASET,LEGACY_ISLAND} from './store';
import {createPlaces} from './content';
import type {Region,Place,VisitRecord} from './types';
import {createTravelGroups} from './travelGroups';
const regions:Region[]=JSON.parse(readFileSync(new URL('../public/data/regions.json',import.meta.url),'utf8'));
const base=createPlaces(regions),gangneung=regions.find(r=>r.name==='강릉시')!;
const custom:Place={id:'custom:test-1',regionId:gangneung.id,name:'나의 산책길',activityTags:['산책'],sourceUrl:'',checkedAt:'2026-10-27',icon:'tree'};
const visit=(regionId=gangneung.id,placeIds:string[]=[]):VisitRecord=>({id:'visit-1',regionId,placeIds,regionNameSnapshot:'이전 지역명',visitedOn:null,note:'기억',createdAt:'2026-08-16T00:00:00Z',updatedAt:'2026-08-16T00:00:00Z'});
const validate=(data:unknown)=>parseBackup(JSON.stringify(data),regions,base);
describe('나만의 명소',()=>{
 it('명소 추가와 백업 복원',()=>{const d=upsertCatalogPlace(emptyData(),custom);expect(catalogPlaces(base,validate(d))).toContainEqual(custom)});
 it('기본 명소 수정 시 ID와 방문 연결 유지',()=>{let d={...emptyData(),records:[visit(gangneung.id,['place:anmok'])]};d=upsertCatalogPlace(d,{...base.find(p=>p.id==='place:anmok')!,name:'나의 안목해변'});expect(validate(d).records[0].placeIds).toEqual(['place:anmok']);expect(catalogPlaces(base,d).find(p=>p.id==='place:anmok')!.name).toBe('나의 안목해변')});
 it('기록에 연결된 개인 명소 삭제는 기록·이름을 보존하고 북마크 해제',()=>{let d=upsertCatalogPlace({...emptyData(),records:[visit(gangneung.id,[custom.id])],bookmarkedPlaceIds:[custom.id]},custom);d=deleteCatalogPlace(d,custom.id);expect(validate(d).records).toHaveLength(1);expect(d.records[0].placeIds).toEqual([custom.id]);expect(d.bookmarkedPlaceIds).toEqual([]);expect(catalogPlaces(base,d)).toContainEqual(custom);expect(d.hiddenPlaceIds).toEqual([custom.id])});
 it('복원 시 같은 ID를 사용하고 중복 명소를 만들지 않는다',()=>{const d=upsertCatalogPlace(deleteCatalogPlace(upsertCatalogPlace(emptyData(),custom),custom.id),custom);expect(d.hiddenPlaceIds).toEqual([]);expect(d.placeOverrides).toHaveLength(1)});
 it.each([{name:''},{name:'x'.repeat(81)},{activityTags:['a','b','c','d']},{sourceUrl:'javascript:alert(1)'},{sourceUrl:'https://user:secret@example.com'},{regionId:'unknown'},{icon:'unknown'}])('잘못된 편집 입력을 거절: %j',invalid=>expect(()=>validate(upsertCatalogPlace(emptyData(),{...custom,...invalid} as Place))).toThrow());
 it('기본 명소를 다른 지역으로 이동하는 백업을 거절',()=>expect(()=>validate(upsertCatalogPlace(emptyData(),{...base[0],regionId:gangneung.id}))).toThrow());
 it('삭제된 명소를 북마크하는 백업을 거절',()=>{const d=deleteCatalogPlace(upsertCatalogPlace(emptyData(),custom),custom.id);expect(()=>validate({...d,bookmarkedPlaceIds:[custom.id]})).toThrow()});
 it('개인 명소 ID 중복을 거절',()=>expect(()=>validate({...emptyData(),placeOverrides:[custom,custom]})).toThrow());
});
describe('도시 통합과 이전 기록 이관',()=>{
 it('여행권 탐색은 도시 방문 집계를 변경하지 않는다',()=>{const before=emptyData();const groups=createTravelGroups(regions);expect(groups).toHaveLength(10);expect(groups.find(g=>g.id==='east-islands')!.regionIds).toEqual(expect.arrayContaining(['travel:ulleung','travel:dokdo']));expect(before.records).toEqual([]);expect(groups.find(g=>g.id==='gangwon-coast')!.regionIds).not.toContain(regions.find(r=>r.name==='고성군'&&r.provinceId==='48')!.id)});
 it('서울·부산·수원은 각각 하나의 지역',()=>{for(const name of ['서울특별시','부산광역시','수원시'])expect(regions.filter(r=>r.name===name)).toHaveLength(1);expect(regions.some(r=>r.name==='종로구'||r.name==='해운대구'||r.name==='수원시 장안구')).toBe(false)});
 it('기존 서울 기록 두 개를 삭제 없이 하나의 도시로 연결',()=>{const one=visit('adm20261001:11110',['place:gyeongbokgung']);const two={...visit('adm20261001:11170'),id:'visit-2'};const old={schemaVersion:1,datasetVersion:PREVIOUS_DATASET,records:[one,two],bookmarkedPlaceIds:[]};const restored=validate(old);expect(restored.records).toHaveLength(2);expect(new Set(restored.records.map(r=>r.regionId))).toEqual(new Set(['travel:metro:11']));expect(restored.datasetVersion).toBe(DATASET);expect(restored.records[0].regionNameSnapshot).toBe(one.regionNameSnapshot);expect(old.records[0].regionId).toBe('adm20261001:11110')});
 it('기존 수원 일반구 기록을 수원시로 연결',()=>{const old={schemaVersion:1,datasetVersion:PREVIOUS_DATASET,records:[visit('adm20261001:41111')],bookmarkedPlaceIds:[]};expect(validate(old).records[0].regionId).toBe(regions.find(r=>r.name==='수원시')!.id)});
 it('어느 섬인지 알 수 없는 이전 울릉군 기록을 임의 추정하지 않는다',()=>{const old={schemaVersion:1,datasetVersion:PREVIOUS_DATASET,records:[visit('adm20261001:47940')],bookmarkedPlaceIds:[]};const restored=validate(old);expect(restored.records[0].regionId).toBe(LEGACY_ISLAND);expect(restored.records).toHaveLength(1)});
 it('울릉도와 독도는 실제 좌표가 다른 별도 단위',()=>{const u=regions.find(r=>r.name==='울릉도')!,d=regions.find(r=>r.name==='독도')!;expect(u.id).not.toBe(d.id);expect(u.bbox[2]).toBeLessThan(131);expect(d.bbox[0]).toBeGreaterThan(131.8)});
});
