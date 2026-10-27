import {describe,it,expect,vi,afterEach} from 'vitest';
import {readFileSync} from 'node:fs';
import {emptyData,parseBackup,validateData,visitedRegions,visitedPlaces,sortedRecords,saveAtomic,KEY,validDay} from './store';
import {createPlaces} from './content';
import type {Region,VisitRecord} from './types';
const regions:Region[]=JSON.parse(readFileSync(new URL('../public/data/regions.json',import.meta.url),'utf8'));
const geo=JSON.parse(readFileSync(new URL('../public/data/regions.geojson',import.meta.url),'utf8'));
const places=createPlaces(regions),gangneung=regions.find(r=>r.name==='강릉시')!,gyeongju=regions.find(r=>r.name==='경주시')!;
const record=(extra:Partial<VisitRecord>={}):VisitRecord=>({id:'test-1',regionId:gangneung.id,regionNameSnapshot:gangneung.fullName,visitedOn:null,placeIds:[],note:'바다 <script>alert(1)</script>',createdAt:'2026-08-16T00:00:00Z',updatedAt:'2026-08-16T00:00:00Z',...extra});
afterEach(()=>vi.unstubAllGlobals());
describe('경계와 명소 참조',()=>{
 it('지도와 지역 ID가 일대일이며 해금 단위가 중복되지 않는다',()=>{expect(new Set(regions.map(r=>r.id)).size).toBe(regions.length);expect(geo.features.map((f:{id:string})=>f.id).sort()).toEqual(regions.map(r=>r.id).sort());expect(regions.filter(r=>r.name==='수원시')).toHaveLength(1);expect(regions.filter(r=>r.name.startsWith('수원시 '))).toHaveLength(0);expect(regions.filter(r=>r.name==='서울특별시')).toHaveLength(1)});
 it('기존 명소 ID와 확장 명소의 지역 연결을 보존한다',()=>{expect(places).toHaveLength(56);expect(new Set(places.map(p=>p.id)).size).toBe(56);expect(places.find(p=>p.id==='place:anmok')!.regionId).toBe(gangneung.id);for(const p of places)expect(regions.some(r=>r.id===p.regionId)).toBe(true)});
 it('제주와 독도를 실제 좌표에 유지한다',()=>{expect(regions.find(r=>r.name==='제주시')!.bbox[1]).toBeLessThan(33.5);expect(regions.find(r=>r.name==='독도')!.bbox[2]).toBeGreaterThan(131.85)});
 it('동명이름의 전체 경로와 ID를 구분한다',()=>{expect(regions.some(r=>r.aliases.includes('종로구'))).toBe(true);expect(regions.some(r=>r.aliases.includes('수원시 장안구'))).toBe(true)});
});
describe('기록에서 파생되는 방문 상태',()=>{
 it('첫 실행은 빈 기록이며 방문 지역이 없다',()=>expect(visitedRegions(emptyData().records).size).toBe(0));
 it('재방문해도 지역 수가 늘지 않는다',()=>expect(visitedRegions([record(),record({id:'two'})]).size).toBe(1));
 it('기록한 명소만 방문 처리하고 마지막 삭제 시 해제한다',()=>{expect([...visitedPlaces([record({placeIds:['place:anmok']})])]).toEqual(['place:anmok']);expect(visitedPlaces([]).size).toBe(0)});
 it('지역 변경 시 이전 지역이 해제되고 새 지역이 방문 처리된다',()=>{expect([...visitedRegions([record({regionId:gyeongju.id})])]).toEqual([gyeongju.id])});
 it('방문일 내림차순 뒤에 날짜 미상 기록을 생성일 순으로 정렬한다',()=>{expect(sortedRecords([record(),record({id:'date',visitedOn:'2026-08-16'}),record({id:'new',createdAt:'2026-09-01T00:00:00Z'})]).map(r=>r.id)).toEqual(['date','new','test-1'])});
});
describe('가져오기 검증과 원본 보존',()=>{
 it('날짜 미상, 메모, 북마크를 왕복 복원한다',()=>{const d={...emptyData(),records:[record()],bookmarkedPlaceIds:['place:gyeongpo']};expect(parseBackup(JSON.stringify(d),regions,places)).toEqual(d)});
 it.each([['잘못된 JSON','{'],['지원하지 않는 버전',JSON.stringify({...emptyData(),schemaVersion:4})],['다른 지도 버전',JSON.stringify({...emptyData(),datasetVersion:'other'})],['알 수 없는 지역',JSON.stringify({...emptyData(),records:[record({regionId:'unknown'})]})],['중복 기록 ID',JSON.stringify({...emptyData(),records:[record(),record()]})],['다른 지역 명소',JSON.stringify({...emptyData(),records:[record({placeIds:['place:bulguksa']})]})],['잘못된 날짜',JSON.stringify({...emptyData(),records:[record({visitedOn:'2026-02-30'})]})],['초과 메모',JSON.stringify({...emptyData(),records:[record({note:'a'.repeat(501)})]})],['없는 북마크',JSON.stringify({...emptyData(),bookmarkedPlaceIds:['place:unknown']})]])('%s를 거절하고 입력을 변형하지 않는다',(_,raw)=>{const original=raw;expect(()=>parseBackup(raw,regions,places)).toThrow();expect(raw).toBe(original)});
 it('파일 크기 상한을 확인한다',()=>expect(()=>parseBackup('x'.repeat(5*1024*1024+1),regions,places)).toThrow('5MiB'));
 it('미래 날짜를 거절한다',()=>{expect(validDay('2999-01-01')).toBe(false)});
 it('참조 무결성을 확인하며 내부 HTML 텍스트를 보존한다',()=>{expect(validateData({...emptyData(),records:[record()]},regions,places).records[0].note).toContain('<script>')});
});
describe('저장 실패와 다른 탭 충돌',()=>{
 it('다른 탭의 변경을 덮어쓰지 않는다',()=>{const setItem=vi.fn();vi.stubGlobal('localStorage',{getItem:()=> 'new-value',setItem});expect(()=>saveAtomic(emptyData(),'old-value')).toThrow('다른 탭');expect(setItem).not.toHaveBeenCalled()});
 it('저장 용량 오류를 성공으로 처리하지 않는다',()=>{vi.stubGlobal('localStorage',{getItem:()=>null,setItem:()=>{throw new DOMException('QuotaExceeded','QuotaExceededError')}});expect(()=>saveAtomic(emptyData(),null)).toThrow('QuotaExceeded')});
 it('한 저장 문서로 원자적으로 쓴다',()=>{const setItem=vi.fn();vi.stubGlobal('localStorage',{getItem:()=>null,setItem});const raw=saveAtomic(emptyData(),null);expect(setItem).toHaveBeenCalledExactlyOnceWith(KEY,raw)});
});
