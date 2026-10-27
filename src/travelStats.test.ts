import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import type {Region,VisitRecord} from './types';
import {emptyData,parseBackup} from './store';
import {createPlaces} from './content';
import {getTravelStats} from './travelStats';
import {getAchievements,classifyRegion} from './travelProfile';
import {COLOR_THEMES,applyColorTheme,refreshLegacyColors} from './palettes';
const regions:Region[]=JSON.parse(readFileSync(new URL('../public/data/regions.json',import.meta.url),'utf8'));
const places=createPlaces(regions),gang=regions.find(r=>r.name==='강릉시')!,jeju=regions.find(r=>r.name==='제주시')!;
const record=(id:string,day:string|null=null,regionId=gang.id,extra:Partial<VisitRecord>={}):VisitRecord=>({id,regionId,regionNameSnapshot:'여행지',visitedOn:day,placeIds:[],note:'',createdAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-01T00:00:00Z',...extra});
describe('여행 통계',()=>{
 it('통합 광역도시를 국가명으로 반복 표시하지 않고 해당 도시명으로 구분한다',()=>{const stats=getTravelStats(emptyData(),regions,2026);const names=stats.provinces.map(p=>p.name);expect(names).not.toContain('대한민국');expect(new Set(names).size).toBe(names.length);for(const name of ['서울특별시','부산광역시','대구광역시','인천광역시','대전광역시','울산광역시'])expect(names).toContain(name);expect(stats.provinces.reduce((n,p)=>n+p.total,0)).toBe(regions.length)});
 it('빈 기록은 월별·지역별 집계가 0이다',()=>{const stats=getTravelStats(emptyData(),regions,2026);expect(stats.totalRecords).toBe(0);expect(stats.months).toHaveLength(12);expect(stats.months.every(m=>m.count===0)).toBe(true);expect(stats.provinces.every(p=>p.visited===0&&p.total>0)).toBe(true)});
 it('실제 방문일 연도로 집계하고 날짜 미상·이전 보류 기록을 따로 표시한다',()=>{const data={...emptyData(),records:[record('a','2025-05-01'),record('b','2026-05-01'),record('c',null,jeju.id),record('d',null,'legacy:ulleung-county')]};const s=getTravelStats(data,regions,2026);expect(s.totalRecords).toBe(4);expect(s.yearRecordCount).toBe(1);expect(s.months[4].count).toBe(1);expect(s.unknownDates).toBe(1);expect(s.unresolved).toBe(1);expect(s.visitedCount).toBe(2);expect(s.revisitedCount).toBe(1);expect(getTravelStats(data,regions,2025).yearRecordCount).toBe(1)});
 it('재방문·고유 명소는 중복 집계하지 않고 분류는 미방문 지역도 포함한다',()=>{const data=classifyRegion({...emptyData(),records:[record('a',null,gang.id,{placeIds:['place:anmok']}),record('b',null,gang.id,{placeIds:['place:anmok','place:ojukheon']})]},{regionId:jeju.id,categoryIds:['category:food'],primaryCategoryId:null});const s=getTravelStats(data,regions,2026);expect(s.visitedCount).toBe(1);expect(s.revisitedCount).toBe(1);expect(s.placeCount).toBe(2);expect(s.frequent[0].count).toBe(2);expect(s.tastes.find(t=>t.id==='category:food')!.count).toBe(1);expect(s.provinces.reduce((n,p)=>n+p.visited,0)).toBe(1)});
});
describe('조화로운 팔레트와 기존 설정',()=>{
 it.each([
  {index:0,visited:'#3B9C91',colors:['#E8796B','#E9B65A','#8981C1','#D06C92','#72A67A','#589CC5','#BA8763']},
  {index:1,visited:'#B87965',colors:['#DA7563','#D3A04B','#9475A7','#C16F88','#8D9D74','#728FA9','#B78D64']},
  {index:2,visited:'#558FC9',colors:['#F18776','#E4B54E','#A28BCA','#D779A0','#69A58C','#68ADD0','#B39069']},
 ])('이전 테마 $index를 대응하는 차분한 색상으로 읽고 사용자 지정은 보존한다',old=>{const d=emptyData();d.categories.forEach((c,i)=>c.color=old.colors[i]);d.categories[1].color='#123456';d.categories.push({id:'custom-category:my-color',name:'나의 색',color:'#E8796B',rule:'manual'});d.mapPreferences.visitedColor=old.visited;const restored=parseBackup(JSON.stringify(d),regions,places);expect(restored.mapPreferences.visitedColor).toBe(COLOR_THEMES[old.index].visited);expect(restored.categories[0].color).toBe(COLOR_THEMES[old.index].colors[0]);expect(restored.categories[1].color).toBe('#123456');expect(restored.categories.at(-1)!.color).toBe('#E8796B');expect(parseBackup(JSON.stringify(restored),regions,places)).toEqual(restored)});
 it('세 테마가 모두 검증되며 사용자 분류와 이름을 유지한다',()=>{const d=emptyData();d.categories[0].name='다음에 다시';d.categories.push({id:'custom-category:family',name:'가족',color:'#123456',rule:'manual'});for(const theme of COLOR_THEMES){const next=applyColorTheme(d.categories,theme.id);expect(next.categories[0].name).toBe('다음에 다시');expect(next.categories.at(-1)!.color).toBe('#123456');expect(parseBackup(JSON.stringify({...d,categories:next.categories,mapPreferences:{...d.mapPreferences,visitedColor:next.visitedColor}}),regions,places).categories).toEqual(next.categories)}});
 it('이전 기본 색만 갱신하고 직접 고른 색은 유지한다',()=>{const d=emptyData();d.categories[0].color='#CB695D';d.categories[1].color='#123456';d.mapPreferences.visitedColor='#79AAA3';const next=refreshLegacyColors(d);expect(next.categories[0].color).toBe(COLOR_THEMES[0].colors[0]);expect(next.categories[1].color).toBe('#123456');expect(next.mapPreferences.visitedColor).toBe(COLOR_THEMES[0].visited);expect(d.categories[0].color).toBe('#CB695D')});
});
describe('확장 업적의 의미',()=>{
 it('52개 고유 업적과 6종류를 제공한다',()=>{const badges=getAchievements(emptyData(),regions);expect(badges).toHaveLength(52);expect(new Set(badges.map(b=>b.id)).size).toBe(52);expect(new Set(badges.map(b=>b.group)).size).toBe(6);expect(badges.every(b=>b.target>0&&!b.achieved)).toBe(true)});
 it('요일 업적은 방문일만 쓰고 같은 날짜의 중복 기록은 하루로 센다',()=>{const data={...emptyData(),records:[record('a','2026-10-03'),record('b','2026-10-03'),record('c','2026-10-04'),record('d')]};const b=getAchievements(data,regions);expect(b.find(b=>b.id==='weekend-3')!.current).toBe(2);expect(b.find(b=>b.id==='weekday-3')!.current).toBe(0);expect(b.find(b=>b.id==='months-6')!.current).toBe(1)});
 it('계절 업적은 서로 다른 지역을 세며 메모·개인 명소는 실제 기록에서 계산한다',()=>{const data={...emptyData(),records:[record('a','2026-04-01',gang.id,{note:'봄',placeIds:['custom:mine']}),record('b','2026-05-01',gang.id,{placeIds:['custom:mine']}),record('c','2026-05-02',jeju.id)]};const b=getAchievements(data,regions);expect(b.find(b=>b.id==='spring')!.current).toBe(2);expect(b.find(b=>b.id==='notes-5')!.current).toBe(1);expect(b.find(b=>b.id==='custom-place')!.current).toBe(1);expect(b.find(b=>b.id==='custom-place')!.achieved).toBe(true);data.records=[];expect(getAchievements(data,regions).some(b=>b.achieved)).toBe(false)});
 it('사용자 분류 명칭 변경 후에도 업적 조건에 현재 이름을 표시한다',()=>{const d=emptyData();d.categories.find(c=>c.id==='category:food')!.name='한 끼의 기억';expect(getAchievements(d,regions).find(b=>b.id==='food-3')!.description).toContain('한 끼의 기억')});
});
