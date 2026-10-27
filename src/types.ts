export type Region={id:string;sourceCode:string;name:string;fullName:string;provinceId:string;provinceName:string;aliases:string[];bbox:[number,number,number,number]};
export type Place={id:string;regionId:string;name:string;activityTags:string[];sourceUrl:string;checkedAt:string;icon:'coffee'|'waves'|'landmark'|'tree'|'mountain'|'store'};
export type VisitRecord={id:string;regionId:string;regionNameSnapshot:string;visitedOn:string|null;placeIds:string[];note:string;createdAt:string;updatedAt:string};
export type TravelCategory={id:string;name:string;color:string;rule:'manual'|'repeat'};
export type RegionClassification={regionId:string;categoryIds:string[];primaryCategoryId:string|null};
export type MapPreferences={visitedColor:string;colorMode:string};
export type UserData={schemaVersion:3;datasetVersion:string;records:VisitRecord[];bookmarkedPlaceIds:string[];placeOverrides:Place[];hiddenPlaceIds:string[];categories:TravelCategory[];regionClassifications:RegionClassification[];mapPreferences:MapPreferences};
