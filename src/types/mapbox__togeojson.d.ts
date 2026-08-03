// @mapbox/togeojson no publica tipos ni los tiene en DefinitelyTyped.
// CommonJS puro: module.exports = { kml, gpx } — sin export default.
// Ver kmz-parser.service.ts para el import correcto (namespace, no default)
// y el bug real que causó el default-import silenciado con @ts-ignore.
declare module '@mapbox/togeojson' {
  // doc: any porque el parser real usado en este repo (@xmldom/xmldom) no
  // implementa el tipo Document del DOM del navegador — solo el shape que
  // togeojson necesita en runtime.
  export function kml(doc: any): { type: 'FeatureCollection'; features: any[] };
  export function gpx(doc: any): { type: 'FeatureCollection'; features: any[] };
}
