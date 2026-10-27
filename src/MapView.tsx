import {useEffect,useRef,useState} from 'react';
import * as maplibregl from 'maplibre-gl';
import type {Map as MapInstance,ExpressionSpecification} from 'maplibre-gl';
import type {FeatureCollection} from 'geojson';
import {Plus,Minus,Maximize,Navigation2} from 'lucide-react';
import type {Region} from './types';
import type {TravelGroup} from './travelGroups';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
maplibregl.setWorkerUrl(workerUrl);
export type Filter='all'|'visited'|'unvisited';
type Props={regions:Region[];visited:Set<string>;selected:Region|null;filter:Filter;onSelect:(r:Region|null)=>void;reset:number;expanded:boolean;group:TravelGroup|null;regionColors:Record<string,string>;active:boolean};
const labels:[string,number,number][]=[['서울',126.97,37.60],['경기도',127.3,37.25],['강원특별자치도',128.12,37.76],['충청북도',127.8,36.8],['충청남도',126.7,36.55],['전북특별자치도',127.1,35.75],['전남광주통합특별시',126.9,34.72],['경상북도',128.8,36.3],['경상남도',128.15,35.35],['부산',129.07,35.15],['제주특별자치도',126.6,33.42]];
export default function MapView({regions,visited,selected,filter,onSelect,reset,expanded,group,regionColors,active}:Props){
 const host=useRef<HTMLDivElement>(null),map=useRef<MapInstance|null>(null),pick=useRef(onSelect),[ready,setReady]=useState(false),[error,setError]=useState('');
 const stateRef=useRef({visited,filter});stateRef.current={visited,filter};pick.current=onSelect;
 const selectedRef=useRef<string|null>(null);
 const duration=()=>matchMedia('(prefers-reduced-motion: reduce)').matches?0:650;
 function settle(m:MapInstance){host.current?.setAttribute('data-rendered','false');m.once('idle',()=>host.current?.setAttribute('data-rendered','true'))}
 function home(m:MapInstance){settle(m);const mobile=innerWidth<768;m.fitBounds([[125.15,33.05],[129.8,38.65]],{padding:{top:mobile?140:38,bottom:mobile?290:65,left:mobile?28:330,right:mobile?28:350},duration:duration()});}
 useEffect(()=>{
  if(!host.current)return;let disposed=false;const markers:maplibregl.Marker[]=[];let m:MapInstance;
  try{m=new maplibregl.Map({container:host.current,style:{version:8,sources:{},layers:[{id:'sea',type:'background',paint:{'background-color':'#e9f3f6'}}]},center:[127.7,36],zoom:6,attributionControl:false,minZoom:5,maxZoom:16,maxBounds:[[120,29],[137,43]],renderWorldCopies:false,pitchWithRotate:false,dragRotate:false,touchPitch:false});map.current=m;
   m.addControl(new maplibregl.ScaleControl({maxWidth:110,unit:'metric'}),'bottom-right');
   m.on('load',async()=>{try{const res=await fetch('./data/regions.geojson');if(!res.ok)throw Error('경계 파일을 불러올 수 없어요.');const geo=await res.json() as FeatureCollection;if(disposed)return;
    m.addSource('regions',{type:'geojson',data:geo,promoteId:'id'});
    const color:ExpressionSpecification=['case',['boolean',['feature-state','hover'],false],'#b0ceca',['coalesce',['feature-state','regionColor'],'#dfe5e7']];
    m.addLayer({id:'regions-fill',type:'fill',source:'regions',paint:{'fill-color':color,'fill-opacity':['case',['boolean',['feature-state','muted'],false],0.3,1],'fill-color-transition':{duration:300}}});
    m.addLayer({id:'regions-line',type:'line',source:'regions',paint:{'line-color':'#ffffff','line-width':['interpolate',['linear'],['zoom'],5,0.5,8,1,11,1.6],'line-opacity':0.95}});
    m.addLayer({id:'selected-line',type:'line',source:'regions',paint:{'line-color':'#174e4b','line-width':2,'line-opacity':['case',['boolean',['feature-state','selected'],false],1,0]}});
    for(const [name,en,lng,lat] of [['서 해','WEST SEA',124.9,35.6],['동 해','EAST SEA',130.2,36.4],['남 해','SOUTH SEA',128.0,33.3]] as [string,string,number,number][]){const el=document.createElement('span');el.className='sea-label';el.textContent=name;const small=document.createElement('small');small.textContent=en;el.append(small);el.setAttribute('aria-hidden','true');markers.push(new maplibregl.Marker({element:el}).setLngLat([lng,lat]).addTo(m))}
    labels.forEach(([name,lng,lat])=>{const el=document.createElement('span');el.className='province-label';el.textContent=name;el.setAttribute('aria-hidden','true');markers.push(new maplibregl.Marker({element:el}).setLngLat([lng,lat]).addTo(m));});
    regions.filter(r=>!['travel:ulleung','travel:dokdo'].includes(r.id)).forEach(r=>{const el=document.createElement('span');el.className='district-label';el.textContent=r.name;el.setAttribute('aria-hidden','true');const [x,y,a,b]=r.bbox;const marker=new maplibregl.Marker({element:el}).setLngLat([(x+a)/2,(y+b)/2]).addTo(m);markers.push(marker);});
    const adjustLabels=()=>{const z=m.getZoom();host.current?.classList.toggle('detail-zoom',z>=8.6)};m.on('zoom',adjustLabels);adjustLabels();
    let hover:string|undefined;const popup=new maplibregl.Popup({closeButton:false,closeOnClick:false,offset:12,className:'region-tooltip'});
    m.on('mousemove','regions-fill',e=>{const id=String(e.features?.[0]?.id||'');if(hover&&hover!==id)m.setFeatureState({source:'regions',id:hover},{hover:false});hover=id;if(!id)return;m.getCanvas().style.cursor='pointer';m.setFeatureState({source:'regions',id},{hover:true});const r=regions.find(r=>r.id===id);if(r)popup.setLngLat(e.lngLat).setText(`${r.fullName} · ${stateRef.current.visited.has(id)?'방문 완료':'미방문'}`).addTo(m)});
    m.on('mouseleave','regions-fill',()=>{if(hover)m.setFeatureState({source:'regions',id:hover},{hover:false});hover=undefined;popup.remove();m.getCanvas().style.cursor=''});
    m.on('click','regions-fill',e=>{popup.remove();const r=regions.find(r=>r.id===String(e.features?.[0]?.id));if(r)pick.current(r)});
    for(const r of regions.filter(r=>['travel:ulleung','travel:dokdo'].includes(r.id))){const el=document.createElement('button');el.className='island-marker';el.textContent=r.name;el.setAttribute('aria-label',`${r.name} 지도에서 선택`);el.onclick=()=>pick.current(r);const [x,y,a,b]=r.bbox;markers.push(new maplibregl.Marker({element:el,anchor:'bottom',offset:[0,-4]}).setLngLat([(x+a)/2,(y+b)/2]).addTo(m))}home(m);setReady(true);
   }catch(e){if(!disposed)setError((e as Error).message)}});
   m.on('error',e=>{if(!disposed&&/WebGL|context|GPU|Worker/i.test(e.error.message))setError('이 브라우저에서 지도를 표시할 수 없어요. 지역 검색과 여행 기록은 계속 사용할 수 있어요.')});
  }catch{setError('WebGL 지도를 시작하지 못했어요. 지역 검색으로 여행 기록을 남길 수 있어요.')}
  const ro=new ResizeObserver(()=>map.current?.resize());ro.observe(host.current);
  return()=>{disposed=true;ro.disconnect();markers.forEach(x=>x.remove());m?.remove();map.current=null;setReady(false)};
 },[regions]);
 useEffect(()=>{const m=map.current;if(!ready||!m)return;regions.forEach(r=>m.setFeatureState({source:'regions',id:r.id},{visited:visited.has(r.id),regionColor:regionColors[r.id]||'#DFE5E7',muted:(group&&!group.regionIds.includes(r.id))||(filter==='visited'?!visited.has(r.id):filter==='unvisited'?visited.has(r.id):false)}));},[visited,filter,ready,regions,group,regionColors]);
 useEffect(()=>{const m=map.current;if(!m||!ready)return;if(selectedRef.current)m.setFeatureState({source:'regions',id:selectedRef.current},{selected:false});selectedRef.current=selected?.id||null;
 if(selected){settle(m);m.setFeatureState({source:'regions',id:selected.id},{selected:true});const mobile=innerWidth<768;const [x,y,a,b]=selected.bbox;m.fitBounds([[x,y],[a,b]],{maxZoom:selected.id==='travel:dokdo'?15:selected.id==='travel:ulleung'?10.7:9.3,padding:{top:mobile?150:100,bottom:mobile?(expanded?innerHeight*.72:innerHeight*.38):100,left:mobile?30:350,right:mobile?30:410},duration:duration()});}
 },[selected,ready,expanded]);
 useEffect(()=>{if(ready&&map.current)home(map.current)},[reset,ready]);
 useEffect(()=>{const m=map.current;if(!m||!ready||!group||selected)return;settle(m);const [x,y,a,b]=group.bbox;const mobile=innerWidth<768;m.fitBounds([[x,y],[a,b]],{maxZoom:group.id==='east-islands'?8.5:8,padding:{top:mobile?175:100,bottom:mobile?290:80,left:mobile?30:330,right:mobile?30:370},duration:duration()});},[group,selected,ready]);
 return <div className="map-scene" aria-hidden={!active} inert={!active}><div className="map-canvas" ref={host} aria-label="대한민국 도시 여행 지도"/>{!ready&&!error&&<div className="map-loading">지도를 펼치고 있어요…</div>}{error&&<div className="map-error" role="alert">{error}</div>}

 <div className="compass" aria-hidden="true"><span>N</span><Navigation2 size={22}/></div>
 <div className="map-controls"><button aria-label="전국 보기" title="전국 보기" onClick={()=>{onSelect(null);if(map.current)home(map.current)}}><Maximize size={18}/></button><div><button aria-label="지도 확대" onClick={()=>map.current?.zoomIn({duration:duration()})}><Plus size={21}/></button><button aria-label="지도 축소" onClick={()=>map.current?.zoomOut({duration:duration()})}><Minus size={21}/></button></div></div>
 </div>
}
