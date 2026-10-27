import type {Region} from './types';
export type TravelGroup={id:string;name:string;regionIds:string[];bbox:Region['bbox']};
const definitions:[string,string,string[],string?][]=[
 ['capital','서울·인천권',['서울특별시','인천광역시','부천시','김포시']],
 ['gyeonggi-south','경기 남부권',['수원시','용인시','화성시','평택시','오산시','안성시']],
 ['gangwon-coast','강원 동해안',['강릉시','속초시','양양군','동해시','삼척시','고성군'],'51'],
 ['chungnam-coast','충남 서해안',['보령시','서산시','당진시','태안군','홍성군','서천군'],'44'],
 ['jeonbuk-west','전북 서부권',['군산시','익산시','김제시','부안군','고창군'],'52'],
 ['jeonnam-east','전남 동부권',['여수시','순천시','광양시','고흥군','보성군']],
 ['gyeongbuk-coast','경북 동해안',['포항시','경주시','영덕군','울진군'],'47'],
 ['gyeongnam-coast','경남 남해안',['통영시','거제시','남해군','고성군','사천시'],'48'],
 ['east-islands','울릉도·독도',['울릉도','독도']],
 ['jeju','제주 여행권',['제주시','서귀포시']]
];
export function createTravelGroups(regions:Region[]):TravelGroup[]{return definitions.map(([id,name,names,province])=>{const members=regions.filter(r=>names.includes(r.name)&&(!province||r.provinceId===province));if(members.length!==names.length)throw Error(`여행권 지역 연결 실패: ${name}`);return {id,name,regionIds:members.map(r=>r.id),bbox:[Math.min(...members.map(r=>r.bbox[0])),Math.min(...members.map(r=>r.bbox[1])),Math.max(...members.map(r=>r.bbox[2])),Math.max(...members.map(r=>r.bbox[3]))]}})}
