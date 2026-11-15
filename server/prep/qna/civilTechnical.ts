import type { PlacementMcq } from '../bank';
import { fmt, fromRows, generate, mcq, numDistractors, type Row } from './builder';

const C = 'Civil Technical' as const;

const ROWS: Row[] = [
  // ---- Building materials ----
  ['Main raw materials of Portland cement', 'Limestone and clay', 'Sand and gravel', 'Gypsum only', 'Fly ash only'],
  ['Gypsum is added to cement to', 'control (retard) setting time', 'increase colour', 'reduce strength', 'make it waterproof'],
  ['Final setting time of OPC should not exceed', '600 minutes', '30 minutes', '120 minutes', '1000 minutes'],
  ['Specific gravity of OPC is about', '3.15', '1.5', '2.0', '4.5'],
  ['Weight of one bag of cement', '50 kg', '40 kg', '25 kg', '100 kg'],
  ['Fineness of cement is tested by', 'Blaine air permeability / sieve test', 'Slump test', 'Vicat apparatus', 'Le Chatelier apparatus'],
  ['Vicat apparatus is used to find', 'setting time and consistency of cement', 'soundness', 'fineness', 'compressive strength of steel'],
  ['Soundness of cement is tested by', 'Le Chatelier apparatus', 'Vicat apparatus', 'Slump cone', 'Compaction factor apparatus'],
  ['Cement that gains strength fastest', 'Rapid hardening cement', 'Low heat cement', 'PPC', 'White cement'],
  ['Cement used for mass concrete like dams', 'Low heat cement', 'Rapid hardening cement', 'White cement', 'High alumina cement'],
  ['PPC stands for', 'Portland Pozzolana Cement', 'Pure Portland Cement', 'Pre-stressed Portland Cement', 'Portland Plaster Cement'],
  ['Fine aggregate particles pass through', '4.75 mm IS sieve', '10 mm sieve', '20 mm sieve', '75 micron only'],
  ['Coarse aggregate is retained on', '4.75 mm IS sieve', '75 micron sieve', '150 micron sieve', '1.18 mm sieve'],
  ['Fineness modulus is an index of', 'aggregate particle size', 'cement strength', 'water content', 'steel grade'],
  ['Bulking of sand is caused by', 'moisture content', 'clay content', 'temperature', 'size of grains only'],
  ['Water absorption of a first-class brick should not exceed', '20%', '40%', '5%', '50%'],
  ['Minimum compressive strength of a first-class brick (approx.)', '10.5 N/mm2', '3.5 N/mm2', '1 N/mm2', '50 N/mm2'],
  ['Efflorescence in bricks is due to', 'soluble salts', 'iron oxide', 'excess burning', 'lime nodules only'],
  ['Number of modular bricks in 1 cubic metre (approx.)', '500', '100', '1000', '250'],
  ['Seasoning of timber means', 'removing moisture', 'painting', 'cutting', 'polishing'],
  ['Mild steel contains carbon about', '0.1 - 0.25%', '1.5 - 2%', '3 - 4%', '0%'],
  ['Fe 500 means steel with yield strength', '500 N/mm2', '500 kg/cm2', '500 kN', '500 MPa ultimate only'],
  ['TMT bars stand for', 'Thermo-Mechanically Treated bars', 'Tension Mild Torsion bars', 'Tested Mild Tor bars', 'Thermal Metal Tube bars'],
  ['Lime that sets under water', 'Hydraulic lime', 'Fat lime', 'Quick lime', 'Slaked lime'],
  // ---- Concrete ----
  ['M25 concrete has characteristic compressive strength', '25 N/mm2 at 28 days', '25 N/mm2 at 7 days', '25 kN', '2.5 N/mm2'],
  ['Nominal mix for M15 concrete', '1:2:4', '1:1.5:3', '1:1:2', '1:3:6'],
  ['Nominal mix for M10 concrete', '1:3:6', '1:2:4', '1:1.5:3', '1:4:8'],
  ['Water-cement ratio mainly affects', 'strength of concrete', 'colour', 'setting time only', 'weight of steel'],
  ['Increase in water-cement ratio generally', 'decreases strength', 'increases strength', 'has no effect', 'increases density'],
  ['Compaction factor test measures', 'workability', 'strength', 'durability', 'air content'],
  ['Standard concrete cube size for testing', '150 mm', '100 mm only', '200 mm', '70.6 mm'],
  ['Concrete cubes are usually tested at', '7 and 28 days', '1 and 3 days', '60 and 90 days', '14 days only'],
  ['Admixture used to delay setting in hot weather', 'Retarder', 'Accelerator', 'Air-entraining agent', 'Plasticiser only'],
  ['Admixture used to speed up setting', 'Accelerator (e.g. calcium chloride)', 'Retarder', 'Fly ash', 'Gypsum'],
  ['Honeycombing in concrete is due to', 'improper compaction', 'excess curing', 'high cement content', 'cold weather'],
  ['Segregation in concrete means', 'separation of coarse aggregate from mortar', 'too much curing', 'setting too fast', 'cracks due to heat'],
  ['Bleeding in concrete means', 'water rising to the surface', 'loss of cement', 'colour change', 'rusting of bars'],
  ['Vibrator used for compacting concrete inside formwork', 'Needle (immersion) vibrator', 'Plate vibrator', 'Road roller', 'Rammer'],
  ['Minimum clear cover to main bars in a slab (moderate exposure, IS 456)', '30 mm', '75 mm', '5 mm', '100 mm'],
  ['Minimum clear cover for footings (IS 456)', '50 mm', '15 mm', '25 mm', '10 mm'],
  ['IS code for plain and reinforced concrete', 'IS 456:2000', 'IS 800:2007', 'IS 875', 'IS 1893'],
  ['IS code for steel structures', 'IS 800', 'IS 456', 'IS 383', 'IS 1200'],
  ['IS code for earthquake-resistant design', 'IS 1893', 'IS 456', 'IS 800', 'IS 10262'],
  ['IS code for concrete mix design', 'IS 10262', 'IS 456', 'IS 1893', 'IS 2720'],
  ['IS code for design loads (dead, live, wind)', 'IS 875', 'IS 456', 'IS 1200', 'IS 383'],
  ['IS code for method of measurement of building works', 'IS 1200', 'IS 875', 'IS 456', 'IS 800'],
  ['Unit weight of reinforced concrete (approx.)', '25 kN/m3', '10 kN/m3', '78.5 kN/m3', '18 kN/m3'],
  ['Unit weight of steel (approx.)', '78.5 kN/m3', '25 kN/m3', '10 kN/m3', '50 kN/m3'],
  ['Pre-stressed concrete uses', 'high-tensile steel', 'mild steel only', 'timber', 'aluminium'],
  // ---- Surveying ----
  ['Length of a metric (Gunter) chain commonly used', '20 m or 30 m', '66 ft only', '100 m', '5 m'],
  ['Ranging rods are painted in', 'alternate red and white bands', 'black only', 'green and yellow', 'blue'],
  ['Prismatic compass measures', 'whole circle bearing', 'reduced bearing only', 'vertical angles', 'levels'],
  ['Levelling is used to find', 'relative heights (elevations)', 'horizontal distance only', 'bearings', 'areas'],
  ['Reading taken on a point of known elevation is', 'Back sight', 'Fore sight', 'Intermediate sight', 'Change point'],
  ['Last reading before shifting the level is', 'Fore sight', 'Back sight', 'Intermediate sight', 'Bench mark'],
  ['A point of known elevation is called', 'Bench mark', 'Change point', 'Station', 'Datum line only'],
  ['Rise and fall method / height of instrument method are used in', 'levelling', 'chaining', 'compass survey', 'plane table'],
  ['Contour lines join points of', 'equal elevation', 'equal distance', 'equal bearing', 'equal area'],
  ['Closely spaced contours indicate', 'steep slope', 'flat ground', 'a lake', 'a valley only'],
  ['Total station combines theodolite with', 'electronic distance meter (EDM)', 'level tube only', 'compass only', 'plumb bob'],
  ['GPS stands for', 'Global Positioning System', 'General Plotting Survey', 'Ground Point Station', 'Grid Position Scale'],
  ['Plane table survey gives', 'map plotted directly in the field', 'only levels', 'only angles', 'soil test results'],
  ['Simpson\'s rule is used for', 'area calculation', 'levelling', 'bearing', 'curve setting only'],
  ['1 hectare equals', '10,000 m2', '1,000 m2', '100 m2', '1,00,000 m2'],
  ['1 acre is approximately', '4047 m2', '10,000 m2', '1000 m2', '2500 m2'],
  ['Local attraction affects', 'compass readings', 'level readings', 'chain length', 'tape length'],
  // ---- Building construction ----
  ['Damp proof course (DPC) is provided at', 'plinth level', 'roof level', 'lintel level', 'foundation bottom'],
  ['Lintel is provided over', 'door and window openings', 'the foundation', 'the roof slab', 'the plinth'],
  ['English bond has', 'alternate courses of headers and stretchers', 'headers and stretchers in the same course', 'only stretchers', 'only headers'],
  ['Flemish bond has', 'headers and stretchers alternately in each course', 'alternate header and stretcher courses', 'only headers', 'only stretchers'],
  ['A brick laid with its length along the wall face is a', 'Stretcher', 'Header', 'Closer', 'Bat'],
  ['A brick laid with its width along the wall face is a', 'Header', 'Stretcher', 'Queen closer', 'Frog'],
  ['The depression on a brick face is called', 'Frog', 'Bat', 'Closer', 'Arris'],
  ['Mortar ratio commonly used for brick masonry', '1:6', '1:1', '1:15', '1:0.5'],
  ['Foundation used when good soil is very deep', 'Pile foundation', 'Isolated footing', 'Strip footing', 'Raft only'],
  ['A single footing for one column is', 'Isolated footing', 'Raft foundation', 'Pile cap', 'Combined footing'],
  ['A foundation covering the whole building area is', 'Raft (mat) foundation', 'Isolated footing', 'Strip footing', 'Pier'],
  ['Formwork for slabs is generally removed after (OPC, IS 456)', '7 days (props 14 days)', '1 day', '28 days', '3 hours'],
  ['Riser and tread are terms used in', 'stairs', 'roofs', 'foundations', 'doors'],
  ['Plastering thickness for internal walls (common)', '12 mm', '50 mm', '2 mm', '100 mm'],
  ['Scaffolding is used for', 'temporary working platforms', 'permanent support', 'water supply', 'drainage'],
  ['Shoring is used to', 'temporarily support unsafe structures', 'level the ground', 'cure concrete', 'test soil'],
  ['Underpinning means', 'strengthening an existing foundation', 'painting the floor', 'laying bricks', 'roof waterproofing'],
  // ---- Soil, hydraulics, environment, transport ----
  ['Liquid limit and plastic limit are found in', 'soil mechanics (Atterberg limits)', 'concrete testing', 'steel testing', 'surveying'],
  ['Standard Proctor test finds', 'optimum moisture content and max dry density', 'shear strength only', 'permeability', 'bearing capacity directly'],
  ['CBR test is used for', 'design of flexible pavements', 'concrete mix', 'steel strength', 'water quality'],
  ['Soil with the highest permeability', 'Gravel', 'Clay', 'Silt', 'Loam'],
  ['Bernoulli\'s theorem relates to', 'conservation of energy in fluids', 'mass of steel', 'soil compaction', 'surveying angles'],
  ['Venturimeter measures', 'discharge in a pipe', 'pressure in tyres', 'soil moisture', 'wind speed'],
  ['Unit of discharge', 'm3/s', 'm/s', 'N/m2', 'kg'],
  ['pH of pure water', '7', '0', '14', '5'],
  ['BOD is a measure of', 'organic pollution in water', 'soil strength', 'air speed', 'noise'],
  ['Chlorination of water is done for', 'disinfection', 'softening', 'colour removal only', 'adding minerals'],
  ['Hardness of water is due to', 'calcium and magnesium salts', 'sodium chloride only', 'iron rust', 'chlorine'],
  ['Camber in roads is provided for', 'drainage of rain water', 'beauty', 'speed', 'reducing cost'],
  ['Bitumen is used in', 'flexible pavements', 'rigid pavements only', 'brick masonry', 'plastering'],
  ['WBM stands for', 'Water Bound Macadam', 'Wet Bitumen Mix', 'Wide Base Material', 'Water Based Mortar'],
  ['Super-elevation is provided on', 'horizontal curves of roads', 'straight roads', 'bridges only', 'footpaths'],
  ['Standard broad gauge width in India', '1676 mm', '1000 mm', '762 mm', '1435 mm'],
  // ---- Estimation & software ----
  ['Estimation that gives approximate cost per sq. m of plinth area', 'Plinth area estimate', 'Detailed estimate', 'Revised estimate', 'Supplementary estimate'],
  ['BOQ stands for', 'Bill of Quantities', 'Bill of Quality', 'Book of Queries', 'Basic Order Quote'],
  ['Brickwork is measured in', 'cubic metres', 'square metres', 'running metres', 'kg'],
  ['Plastering is measured in', 'square metres', 'cubic metres', 'running metres', 'numbers'],
  ['Steel reinforcement is measured in', 'kg / quintal (by weight)', 'cubic metres', 'square metres', 'numbers only'],
  ['Weight of steel bar per metre formula', 'd^2 / 162 kg (d in mm)', 'd / 162 kg', 'd^2 / 100 kg', 'd^3 / 162 kg'],
  ['Software used for drafting building plans', 'AutoCAD', 'Tally', 'Photoshop', 'MS Paint only'],
  ['Software for 3D building information modelling', 'Revit', 'Excel', 'Notepad', 'Tally'],
  ['Software for structural analysis and design', 'STAAD Pro / ETABS', 'MS Word', 'CorelDraw', 'Chrome'],
  ['MS Project / Primavera are used for', 'project planning and scheduling', 'drawing only', 'accounting', 'surveying'],
  ['CPM and PERT are', 'project scheduling techniques', 'soil tests', 'concrete mixes', 'surveying instruments'],
  ['Safety gear compulsory on a construction site', 'Helmet and safety shoes', 'Sunglasses only', 'Tie', 'Watch'],
];

const PI = 22 / 7;

export const CIVIL_QUESTIONS: PlacementMcq[] = [
  ...fromRows('civ-t', 501, C, ROWS),
  ...generate('civ-area', 502, 166, (r, id) => {
    const l = r.int(5, 60);
    const b = r.int(4, 40);
    return mcq(r, id, C, `Area of a rectangular plot ${l} m x ${b} m?`, `${fmt(l * b)} m2`, [`${fmt(2 * (l + b))} m2`, ...numDistractors(r, l * b, 10).map(x => `${fmt(x)} m2`)], `Area = L x B = ${l} x ${b} = ${l * b} m2`);
  }),
  ...generate('civ-slab', 503, 160, (r, id) => {
    const l = r.int(3, 12);
    const b = r.int(3, 10);
    const t = r.pick([0.1, 0.12, 0.15, 0.2]);
    const v = Math.round(l * b * t * 1000) / 1000;
    return mcq(r, id, C, `Volume of concrete in a slab ${l} m x ${b} m x ${Math.round(t * 1000)} mm thick?`, `${fmt(v)} m3`, numDistractors(r, v, Math.max(0.5, Math.round(v * 0.1 * 10) / 10)).map(x => `${fmt(x)} m3`), `${l} x ${b} x ${t} = ${fmt(v)} m3`);
  }),
  ...generate('civ-circle', 504, 110, (r, id) => {
    const rad = r.int(1, 10) * 7;
    const a = PI * rad * rad;
    return mcq(r, id, C, `Area of a circular tank of radius ${rad} m (take pi = 22/7)?`, `${fmt(a)} m2`, [`${fmt(2 * PI * rad)} m2`, ...numDistractors(r, a, 22).map(x => `${fmt(x)} m2`)], `pi x r^2 = 22/7 x ${rad} x ${rad} = ${fmt(a)} m2`);
  }),
  ...generate('civ-steel', 505, 110, (r, id) => {
    const d = r.pick([8, 10, 12, 16, 20, 25, 32]);
    const len = r.int(2, 12) * 6;
    const w = Math.round(((d * d) / 162) * len * 100) / 100;
    return mcq(r, id, C, `Approximate weight of ${len} m of ${d} mm steel bar? (d^2/162 kg per m)`, `${fmt(w)} kg`, numDistractors(r, w, Math.max(1, Math.round(w * 0.1))).map(x => `${fmt(x)} kg`), `${d}^2/162 = ${fmt((d * d) / 162)} kg/m x ${len} = ${fmt(w)} kg`);
  }),
  ...generate('civ-rl', 506, 160, (r, id) => {
    const bm = r.int(95, 110) + r.int(0, 9) / 10;
    const bs = r.int(10, 30) / 10;
    const fs = r.int(5, 35) / 10;
    const hi = Math.round((bm + bs) * 1000) / 1000;
    const rl = Math.round((hi - fs) * 1000) / 1000;
    return mcq(r, id, C, `RL of bench mark = ${bm} m, back sight = ${bs} m, fore sight = ${fs} m. RL of the new point?`, `${fmt(rl)} m`, [`${fmt(Math.round((bm - bs + fs) * 1000) / 1000)} m`, `${fmt(hi)} m`, `${fmt(Math.round((rl + 0.5) * 1000) / 1000)} m`], `HI = ${bm} + ${bs} = ${fmt(hi)}; RL = ${fmt(hi)} - ${fs} = ${fmt(rl)} m`);
  }),
  ...generate('civ-cement', 507, 110, (r, id) => {
    const bags = r.int(2, 40);
    return mcq(r, id, C, `How many kg of cement are there in ${bags} bags?`, `${bags * 50} kg`, [`${bags * 40} kg`, `${bags * 25} kg`, `${bags * 60} kg`], `1 bag = 50 kg; ${bags} x 50 = ${bags * 50} kg`);
  }),
  ...generate('civ-unit', 508, 110, (r, id) => {
    const kind = r.int(0, 2);
    const n = r.int(2, 40);
    if (kind === 0) return mcq(r, id, C, `${n} hectares = how many square metres?`, `${fmt(n * 10000)} m2`, [`${fmt(n * 1000)} m2`, `${fmt(n * 100)} m2`, `${fmt(n * 100000)} m2`], `1 ha = 10,000 m2`);
    if (kind === 1) return mcq(r, id, C, `${n} kN = how many newtons?`, `${fmt(n * 1000)} N`, [`${fmt(n * 100)} N`, `${fmt(n * 10)} N`, `${fmt(n * 10000)} N`], `1 kN = 1000 N`);
    return mcq(r, id, C, `${n} N/mm2 = how many MPa?`, `${n} MPa`, [`${n * 10} MPa`, `${n * 1000} MPa`, `${n / 10} MPa`], `1 N/mm2 = 1 MPa`);
  }),
];
