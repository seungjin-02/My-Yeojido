import type {TravelCategory,UserData} from './types';

export const COLOR_THEMES = [
  {id:'coast',name:'세이지 가든',description:'세이지 · 더스티 로즈 · 오트밀',visited:'#A7C1B5',colors:['#D2B7B6','#D9C9A8','#C1BBD0','#CBB8C5','#B5C6AD','#AEC4D2','#C8BFAE']},
  {id:'sunset',name:'오트밀 노트',description:'모래빛 · 살구 베이지 · 모브',visited:'#C7BBA7',colors:['#D5BCB1','#DCCEAE','#C8BFCB','#D1BBC3','#BDC6AF','#BBC8CD','#C6B6A5']},
  {id:'daylight',name:'안개 바다',description:'미스트 블루 · 유칼립투스 · 라일락',visited:'#AFC5CE',colors:['#CFBEC2','#D7CEB5','#C1C2D3','#C9BDCE','#B6C8BD','#AFC5D6','#C7C2B6']},
] as const;
// Coordinated light, low-chroma colors for large areas on a pale map canvas.
export const PALETTE=['#A7C1B5','#B5C6AD','#C2CDB9','#C8CEC0','#C8BFAE','#D9C9A8','#DCCEAE','#D5BCB1','#D2B7B6','#D8C4C0','#CBB8C5','#D1BBC3','#C1BBD0','#C9BDCE','#C1C2D3','#B6C3D0','#AEC4D2','#AFC5CE','#B2CAC7','#BCCDC8'];
export const DEFAULT_VISITED_COLOR=COLOR_THEMES[0].visited;
export const DEFAULT_CATEGORY_IDS=['category:return','category:food','category:repeat','category:favorite','category:rest','category:scenery','category:culture'];

export function applyColorTheme(categories:TravelCategory[],id:string){
  const theme=COLOR_THEMES.find(t=>t.id===id);
  if(!theme)throw Error('색상 테마를 찾을 수 없어요.');
  return {visitedColor:theme.visited,categories:categories.map(c=>{const index=DEFAULT_CATEGORY_IDS.indexOf(c.id);return index<0?c:{...c,color:theme.colors[index]}})};
}

// Refresh only exact legacy defaults; a visitor's chosen colors stay intact.
export function refreshLegacyColors(profile:Pick<UserData,'categories'|'regionClassifications'|'mapPreferences'>){
  const previous=[
    {theme:0,visited:'#79AAA3',colors:['#CB695D','#E2A14A','#7569B1','#BE6D85','#4D9371','#568CC4','#A69683']},
    {theme:0,visited:'#3B9C91',colors:['#E8796B','#E9B65A','#8981C1','#D06C92','#72A67A','#589CC5','#BA8763']},
    {theme:1,visited:'#B87965',colors:['#DA7563','#D3A04B','#9475A7','#C16F88','#8D9D74','#728FA9','#B78D64']},
    {theme:2,visited:'#558FC9',colors:['#F18776','#E4B54E','#A28BCA','#D779A0','#69A58C','#68ADD0','#B39069']},
  ];
  const categories=profile.categories.map(c=>{const index=DEFAULT_CATEGORY_IDS.indexOf(c.id);if(index<0)return c;const old=previous.find(t=>c.color.toUpperCase()===t.colors[index]);return old?{...c,color:COLOR_THEMES[old.theme].colors[index]}:c});
  const oldVisited=previous.find(t=>profile.mapPreferences.visitedColor.toUpperCase()===t.visited);
  return {...profile,categories,mapPreferences:{...profile.mapPreferences,visitedColor:oldVisited?COLOR_THEMES[oldVisited.theme].visited:profile.mapPreferences.visitedColor}};
}
