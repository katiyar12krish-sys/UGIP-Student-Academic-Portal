// ===================================================================================================
// UBTER detailed syllabus, I & II Semester, common to all engineering branches (w.e.f. 2025-26).
// Source: "2025-26 Common to all Engineering Branches I & II Sem. Complete Booklet" (UBTER / IRDT).
// Typed in by hand from the booklet's "Theory learning outcomes and aligned course content" tables.
// The same syllabus applies to CSE and Civil 1st year. `boardCode` is the code printed in this booklet;
// the portal's subject list may still use the older codes (991xxx / 992xxx), so subjects are matched by name.
// `hours` = suggested number of lectures in the booklet (0 = not given / practical course).
// ===================================================================================================
import type { SyllabusCourse } from './syllabusTypes';

export const SYLLABUS_YEAR1: SyllabusCourse[] = [
  // ------------------------------------------------ SEMESTER I ------------------------------------------------
  {
    key: 'english-1', semester: 1, boardCode: '100199', name: 'English and Communication Skills - I', credits: 2,
    match: ['english and communication skills - i', 'english and communication skills-i'],
    outcome: 'Communicate in written and oral form of English effectively at the workplace.',
    units: [
      { unitNo: 1, unitTitle: 'Applied Grammar', hours: 11, topics: [
        'Articles: definite and indefinite', 'Prepositions: definition, types and usage', 'Conjunctions: coordinating and subordinating',
        'Active and passive voice', 'Direct and indirect speech', 'Tenses: present, past (simple, continuous, perfect) and simple future',
        'Connectors: and, but, or, nor, though, although, if, unless, otherwise, because, therefore, so, who, whom, whose, which, where, when, why, what'] },
      { unitNo: 2, unitTitle: 'Introduction (Self & Others) and Comprehension', hours: 8, topics: [
        'Introducing yourself and others', 'Comprehension: unseen passages from different sources', 'Translation: Hindi to English and English to Hindi'] },
      { unitNo: 3, unitTitle: 'Paragraph & Dialogue Writing', hours: 8, topics: [
        'Paragraph writing', 'Types of paragraphs: technical, descriptive, narrative, compare and contrast',
        'Dialogue writing: greetings, development of dialogue, closing sentence'] },
      { unitNo: 4, unitTitle: 'Vocabulary Building', hours: 10, topics: [
        'Words often confused', 'Collocations', 'Prefix and suffix', 'Synonyms and antonyms'] },
      { unitNo: 5, unitTitle: 'Presentation Skills', hours: 11, topics: [
        'Dressing & grooming: dressing for the occasion, proper grooming',
        'Speech writing: situation, salutations, introduction of the topic, description / body, conclusion',
        'PowerPoint presentation: layout, font size, colour combination',
        'Kinesics: facial expressions, eye contact, postures, gestures'] },
    ],
  },
  {
    key: 'maths-1', semester: 1, boardCode: '100299', name: 'Applied Mathematics - I', credits: 3,
    match: ['applied mathematics - i', 'applied mathematics-i'],
    units: [
      { unitNo: 1, unitTitle: 'Algebra', hours: 10, topics: [
        'Logarithm: concept and laws of logarithm', 'Determinants: definition, properties, expansion (order 2 and 3)',
        "Solution of simultaneous equations by Cramer's rule (2 and 3 unknowns)",
        'Matrices: algebra of matrices, transpose, inverse by adjoint method',
        'Partial fractions: types based on nature of factors, related problems'] },
      { unitNo: 2, unitTitle: 'Trigonometry', hours: 10, topics: [
        'Trigonometric ratios of allied and compound angles', 'Sum and difference formulae, multiple angles (2A, 3A), sub-multiple angles (without proof)',
        'Factorization and de-factorization formulae (without proof)', 'Inverse trigonometric ratios and related problems',
        'Principal values; relation between trigonometric and inverse trigonometric ratios', 'Graphs of trigonometric functions'] },
      { unitNo: 3, unitTitle: 'Coordinate Geometry', hours: 10, topics: [
        'Straight line and slope; angle between two lines; condition for parallel and perpendicular lines',
        'Forms of a straight line: slope-point, two-point, double-intercept, general form',
        'Perpendicular distance of a point from a line', 'Perpendicular distance between two parallel lines',
        'Circle as locus of a point: standard, central, diameter and general forms'] },
      { unitNo: 4, unitTitle: 'Differential Calculus', hours: 18, topics: [
        'Functions: variable, constant, function; value of a function at a point', 'Limit: concept, definition, simple examples',
        'Derivative as rate of change; rules: sum, product, quotient', 'Derivative of function of a function, implicit and parametric functions',
        'Derivatives of inverse trigonometric, logarithmic and exponential functions', 'Successive derivatives (up to third order)',
        'Applications: equation of tangent and normal, maxima and minima', "L'Hospital's rule for indeterminate forms (0/0, ∞/∞)"] },
    ],
  },
  {
    key: 'physics-1', semester: 1, boardCode: '100399', name: 'Applied Physics - I', credits: 3,
    match: ['applied physics - i', 'applied physics-i'],
    units: [
      { unitNo: 1, unitTitle: 'Basic Mathematics for Physics', hours: 4, topics: [
        'Algebraic identities: (x+y)², (x−y)², x²−y²', 'Binomial theorem: (1+x)ⁿ, (1−x)ⁿ',
        'Trigonometry: Pythagoras theorem and basic trigonometric ratios', 'Basic idea of integration and differentiation', 'Line graph representation'] },
      { unitNo: 2, unitTitle: 'Units and Measurements', hours: 6, topics: [
        'Physical quantities: fundamental and derived; systems of units CGS, MKS, SI',
        'Dimensions and dimensional formula; principle of homogeneity; checking equations; conversion of units',
        'Errors: instrumental, systematic, random; absolute, relative and percentage error; significant figures',
        'Vernier calipers, screw gauge, spherometer',
        'Vectors: scalar and vector quantities, resolution, composition, addition and multiplication of vectors'] },
      { unitNo: 3, unitTitle: 'Basics of Mechanics', hours: 12, topics: [
        "Force: Newton's laws, linear momentum and its conservation, impulse, parallelogram law of forces",
        'Friction: types, applications; lubricants (general idea)',
        'Circular motion: angular displacement, velocity, acceleration; relation with linear quantities; centripetal and centrifugal force; banking of roads, bending of cyclists',
        'Rotational motion: torque, angular momentum, centre of mass, moment of inertia, radius of gyration, parallel and perpendicular axes theorems (statements)',
        'Work, power and energy: definitions, SI units, kinetic and potential energy with derivation',
        'Work-energy theorem; conservation of mechanical energy (freely falling body); transformation of energy'] },
      { unitNo: 4, unitTitle: 'Some Properties of Matter', hours: 8, topics: [
        "Elasticity: stress, strain, moduli of elasticity, stress-strain diagram, Hooke's law, engineering applications",
        "Pressure: units, atmospheric pressure, Fortin's barometer, gauge and absolute pressure, Pascal's law (concept), Bernoulli's theorem (concept), compressibility of fluids",
        'Surface tension: concept, units, applications, effect of temperature and impurity',
        "Viscosity: coefficient of viscosity, Stokes' law, terminal velocity, effect of temperature"] },
      { unitNo: 5, unitTitle: 'Basic Thermodynamics', hours: 10, topics: [
        'Heat vs temperature; measurement of temperature; temperature scales and their relation',
        'Expansion of solids, liquids and gases; coefficients of linear, surface and cubical expansion and their relation',
        'Modes of heat transfer: conduction, convection, radiation; coefficient of thermal conductivity; engineering applications'] },
      { unitNo: 6, unitTitle: 'Waves and Oscillations', hours: 8, topics: [
        'S.H.M.: displacement, velocity, acceleration, time period, frequency, energy; time period of simple pendulum',
        'Wave motion: transverse and longitudinal waves; sound waves, frequency, wavelength, amplitude, speed of sound',
        'Acoustics of buildings: reverberation, reverberation time, echo, absorption coefficient, control of reverberation',
        'Ultrasonic waves: engineering and medical applications'] },
    ],
  },
  {
    key: 'chemistry-1', semester: 1, boardCode: '100499', name: 'Engineering Chemistry - I', credits: 2,
    match: ['engineering chemistry - i', 'applied chemistry - i', 'applied chemistry-i'],
    units: [
      { unitNo: 1, unitTitle: 'Atomic Structure and Chemical Bonding', hours: 10, topics: [
        'Indian chemistry: philosophy of atom by Acharya Kanad', "Rutherford model; Bohr's theory; hydrogen spectrum",
        "Heisenberg's uncertainty principle; quantum numbers; orbital concept; shapes of s, p, d orbitals",
        'Chemical bonding: electronic theory; ionic (NaCl), covalent (H₂, F₂, HF), hybridization in BeCl₂, BF₃, CH₄, NH₃, H₂O',
        'Coordination bond (NH₄⁺); hydrogen bonding and anomalous properties of NH₃, H₂O; metallic bonding',
        'Molecular arrangement in solids, liquids, gases; crystalline and amorphous solids',
        'Unit cell: simple cubic, BCC, FCC, hexagonal close packed'] },
      { unitNo: 2, unitTitle: 'Solutions', hours: 10, topics: [
        'Solute, solvent and solution', 'Concentration: molarity, molality, normality, ppm, mass %, volume %, mole fraction (with numericals)',
        'Buffer solution and its mechanism', 'Indicator and its theory',
        'Nano-particles: definition, importance, applications in mechanical, electrical, electronics engineering'] },
      { unitNo: 3, unitTitle: 'Water Technology', hours: 12, topics: [
        'Distribution of water on Earth', 'Soft and hard water (soap test), salts causing hardness, units of hardness, numericals',
        'Problems of hard water in boilers: scale and sludge, foaming and priming, corrosion',
        'Measuring hardness by EDTA method; total dissolved solids; alkalinity',
        'Water softening: soda-lime, zeolite and ion-exchange processes',
        'Municipal water treatment: sedimentation, coagulation, filtration, sterilization',
        'Drinking water standards (Indian Standard specification)'] },
      { unitNo: 4, unitTitle: 'Electro Chemistry', hours: 8, topics: [
        'pH and pOH, pH scale and its importance', 'Electronic concept of oxidation, reduction and redox reactions',
        'Electrolytes, non-electrolytes, ionization, cathode, anode; electrochemical series',
        "Electrolysis of CuSO₄; Faraday's first and second laws; electrochemical and chemical equivalent; numericals",
        'Industrial applications: electrometallurgy, electroplating, electrolytic refining',
        'Electrochemical cells: primary (dry cell), secondary (lead storage battery), fuel cell and solar cell'] },
      { unitNo: 5, unitTitle: 'Environmental Chemistry', hours: 8, topics: [
        'Pollution and pollutants', 'Air pollution: sources, harmful effects, acid rain, greenhouse effect, global warming, ozone depletion, smog, control',
        'Water pollution: sewage, industrial effluents, heavy metals (Pb, Cd, Zn, Cu), effluent treatment, eutrophication',
        'Solid waste management: types, landfill and incineration', 'Green chemistry and recycling (basic ideas)'] },
    ],
  },
  {
    key: 'computer-fundamentals', semester: 1, boardCode: '100599', name: 'Computer Fundamentals', credits: 2,
    match: ['computer fundamentals'],
    units: [
      { unitNo: 1, unitTitle: 'Computer Introduction', hours: 6, topics: [
        'Data vs information', 'Block diagram and components of a computer', 'Types of computers (analog / digital) and generations',
        'Input / output devices', 'Memory hierarchy and CPU', 'System software vs application software'] },
      { unitNo: 2, unitTitle: 'Number System', hours: 6, topics: [
        'Binary, BCD, Gray, octal, hexadecimal', 'Conversions between number systems', 'Floating point numbers', 'Binary arithmetic'] },
      { unitNo: 3, unitTitle: 'Operating System', hours: 4, topics: [
        'Definition and responsibilities of an OS', 'Types of operating systems', 'GUI vs CUI', 'MS-DOS commands for file and directory operations'] },
      { unitNo: 4, unitTitle: 'Networks & Internet', hours: 4, topics: [
        'LAN, MAN, WAN', 'Switches, routers and network tools', 'Network topologies', 'Internet protocols, browsers, e-mail, search engines'] },
      { unitNo: 5, unitTitle: 'Office Application', hours: 8, topics: [
        'Word: editing and formatting', 'Excel: formulas and charts', 'PowerPoint: slides and animations'] },
      { unitNo: 6, unitTitle: 'Role of IT', hours: 4, topics: [
        'Cyber laws', 'E-commerce', 'GIS and e-Governance', 'IT services', 'Codes: QR, MICR, etc.'] },
    ],
  },
  {
    key: 'graphics-1', semester: 1, boardCode: '100699', name: 'Engineering Graphics - I', credits: 2,
    match: ['engineering graphics - i', 'engineering graphics-i'],
    units: [
      { unitNo: 1, unitTitle: 'Drawing Office Practice, Lines & Lettering', hours: 8, topics: [
        'Graphics instruments and their uses', 'Sizes and layout of standard drawing sheets and boards',
        'Types of lines as per BIS', 'Free-hand lettering: upper and lower case letters and numerals',
        'Single-stroke vertical and inclined lettering (2.5, 3, 5, 7, 10, 15 mm)'] },
      { unitNo: 2, unitTitle: 'Dimensioning', hours: 6, topics: [
        'Need and types of dimensioning: chain, parallel, progressive', 'Size and location dimensioning',
        'Aligned and unidirectional systems; leader lines; general principles',
        'Dimensioning circles, threaded holes, chamfers, angles, tapers, holes on PCD, countersunk and counterbored holes, radii, curves, arches'] },
      { unitNo: 3, unitTitle: 'Geometrical Constructions and Conic Sections', hours: 12, topics: [
        'Construction of regular polygons (triangle, square, pentagon, hexagon) and circle',
        'Ellipse: concentric circle, intersecting arcs, directrix-focus methods', 'Parabola: rectangle, tangent, directrix-focus methods',
        'Hyperbola: directrix-focus, transverse axis and focus methods', 'Cycloid, epicycloid, hypocycloid; involutes of polygons and circles',
        'Helix (conical, parallel) and spiral', 'Loci of points from given data'] },
      { unitNo: 4, unitTitle: 'Scale', hours: 6, topics: [
        'Need of scales; representative fraction (R.F.); full, enlarged and reduced scales', 'Construction of plain and diagonal scales; marking distances'] },
      { unitNo: 5, unitTitle: 'Principle of Projection', hours: 16, topics: [
        'Orthographic projection; first-angle and third-angle methods and symbols', 'Orthographic views of simple 2D objects (lines, circles, arcs)',
        'Conversion of pictorial views into orthographic views', 'Projection of points in different quadrants',
        'Projection of lines: parallel / inclined to one or both reference planes', 'Projection of planes (triangle, square, rectangle, pentagon, hexagon, circle)',
        'Projection of solids: prism, pyramid, cone, cube, cylinder, tetrahedron, frustum'] },
      { unitNo: 6, unitTitle: 'Isometric Projections', hours: 14, topics: [
        'Fundamentals of isometric projection and isometric scale', 'Isometric views of planes and solids',
        'Isometric views of combinations of cylinder, cone, cube, prism, pyramid', 'Conversion of orthographic views into isometric views'] },
      { unitNo: 7, unitTitle: 'Symbols and Conventions', hours: 6, topics: [
        'Civil engineering sanitary fitting symbols', 'Electrical fitting symbols for interior installations', 'Electronic symbols'] },
      { unitNo: 8, unitTitle: 'Basics of AutoCAD', hours: 8, topics: [
        'CAD concept, hardware, software and system requirements', 'AutoCAD window: title bar, toolbars, menu bar, command window, status bar, drawing area, UCS icon',
        'File features: new, save, open, templates, quit', 'Units, limits, grid, snap; undo and redo',
        'Drawing line, circle, arc, polygon, ellipse, rectangle, multiline; dimensioning; text',
        'Constraints: horizontal, vertical, parallel, concentric, perpendicular'] },
    ],
  },
  {
    key: 'workshop-1', semester: 1, boardCode: '100799', name: 'General Workshop Practice - I', credits: 2,
    match: ['general workshop practice - i', 'general workshop practice-i'],
    outcome: 'Practical course: jobs are made in each shop and assessed in the workshop.',
    units: [
      { unitNo: 1, unitTitle: 'General Workshop Practice', hours: 0, topics: ['Workshop safety and fire-fighting equipment', 'Workshop layout', 'Raw materials and their basic properties', 'Basic measuring tools'] },
      { unitNo: 2, unitTitle: 'Fitting and Assembly Shop', hours: 0, topics: ['Fitting shop tools and machines (bench vice, hammers, files, etc.)', 'Materials: mild steel, stainless steel, aluminium', 'Fitting operations and a fitting job; inspection'] },
      { unitNo: 3, unitTitle: 'Plumbing Shop', hours: 0, topics: ['Plumbing tools and pipe fittings', 'Pipe cutting, threading and joining', 'Plumbing job'] },
      { unitNo: 4, unitTitle: 'Carpentry Shop', hours: 0, topics: ['Carpentry tools and types of wood', 'Carpentry operations and joints', 'Carpentry job'] },
      { unitNo: 5, unitTitle: 'Black Smithy Shop', hours: 0, topics: ['Smithy tools and furnace', 'Forging operations', 'Simple smithy job'] },
      { unitNo: 6, unitTitle: 'Electric & Electronic Shop - I', hours: 0, topics: ['Electrical safety', 'Electrical tools, wires and accessories', 'Basic wiring and electronic operations'] },
    ],
  },

  // ------------------------------------------------ SEMESTER II ------------------------------------------------
  {
    key: 'english-2', semester: 2, boardCode: '200199', name: 'English and Communication Skills - II', credits: 2,
    match: ['english and communication skills - ii', 'english and communication skills-ii'],
    units: [
      { unitNo: 1, unitTitle: 'Digital Communication', hours: 8, topics: [
        'E-mail writing: format, subject line, tone, structure', 'Professional report writing: types, structure, style',
        'Digital platforms for communication (Zoom, Teams, Meet) and etiquette'] },
      { unitNo: 2, unitTitle: 'Business Correspondence', hours: 9, topics: [
        'Business letters: structure, formal tone, clarity', 'Memos and proposals: formats, purpose-driven writing',
        'Executive summaries: condensing information'] },
      { unitNo: 3, unitTitle: 'Soft Skills for Employability', hours: 12, topics: [
        'Teamwork and collaboration', 'Leadership communication: persuasion, delegation', 'Problem-solving and decision-making frameworks'] },
      { unitNo: 4, unitTitle: 'Communication', hours: 9, topics: [
        'Definition and process of effective communication', 'Barriers to communication: types and overcoming them',
        'Conflict resolution: active listening, empathy'] },
      { unitNo: 5, unitTitle: 'Identifying Common Errors in Writing', hours: 10, topics: [
        'Subject-verb agreement', 'Noun-pronoun agreement', 'Misplaced modifiers', 'Common English errors'] },
    ],
  },
  {
    key: 'maths-2', semester: 2, boardCode: '200299', name: 'Applied Mathematics - II', credits: 3,
    match: ['applied mathematics - ii', 'applied mathematics-ii'],
    units: [
      { unitNo: 1, unitTitle: 'Indefinite Integration', hours: 13, topics: [
        'Rules of integration; integrals of standard functions', 'Integration by substitution', 'Integration by parts',
        'Integration by partial fractions (linear, non-repeated factors)'] },
      { unitNo: 2, unitTitle: 'Definite Integration', hours: 10, topics: [
        'Definition and rules of definite integration', 'Properties of definite integrals (without proof)',
        'Area bounded by a curve and the axes', "Numerical integration: Trapezoidal rule and Simpson's 1/3 rule"] },
      { unitNo: 3, unitTitle: 'Differential Equation', hours: 7, topics: [
        'Order and degree of a differential equation', 'Formation of differential equations',
        'Solving: variable separable, homogeneous, linear and exact equations'] },
      { unitNo: 4, unitTitle: 'Transform Techniques', hours: 0, topics: [
        'Laplace transform: definition, properties, standard functions, elementary theorems',
        'Inverse Laplace transform: definition, properties, standard functions, elementary theorems'] },
      { unitNo: 5, unitTitle: 'Statistics', hours: 0, topics: [
        'Measures of central tendency: mean, median, mode', 'Measures of dispersion: mean deviation, standard deviation',
        'Correlation; coefficient of rank correlation'] },
    ],
  },
  {
    key: 'physics-2', semester: 2, boardCode: '200399', name: 'Applied Physics - II', credits: 3,
    match: ['applied physics - ii', 'applied physics-ii'],
    units: [
      { unitNo: 1, unitTitle: 'Charge and Electricity', hours: 13, topics: [
        "Electric charge and its properties; Coulomb's law", 'Electric potential, potential difference, electric field and intensity, lines of force, electric flux',
        "Gauss's law and applications (point charge, straight conductor, plane sheet, parallel sheets)",
        'Current, DC and AC, voltage, potential difference, e.m.f.',
        "Ohm's law; resistance, conductance, specific resistance; effect of temperature; heating effect of current",
        'Series and parallel combinations of resistors, inductors and capacitors', "Kirchhoff's laws; Wheatstone bridge and meter bridge"] },
      { unitNo: 2, unitTitle: 'Magnetism', hours: 9, topics: [
        'Magnetic field, intensity, lines of force, flux; right-hand thumb rule; field of straight conductor, circular coil, solenoid',
        'Lorentz force; force on a current-carrying conductor; torque on a rectangular coil; force between parallel conductors',
        'Moving coil galvanometer; conversion into ammeter and voltmeter; multimeter',
        "Electromagnetic induction: Faraday's and Lenz's laws; self and mutual induction; eddy currents"] },
      { unitNo: 3, unitTitle: 'Semiconductor Physics', hours: 8, topics: [
        "Bohr's model", 'Energy bands: conductor, insulator, semiconductor', 'Intrinsic and extrinsic semiconductors',
        'P-N junction diode and its characteristics', 'Diode as half-wave and full-wave rectifier', 'Transistor: PNP and NPN (concept)'] },
      { unitNo: 4, unitTitle: 'Basics of Engineering Materials', hours: 8, topics: [
        'Fundamentals of engineering materials', 'Conducting materials: copper, aluminium, gold, silver',
        'High-resistivity materials: tungsten, nichrome, manganin', 'Superconductors: type I and type II',
        'Insulating materials: mica, ceramics (porcelain, steatite), enamels for winding wires'] },
      { unitNo: 5, unitTitle: 'Modern Physics', hours: 10, topics: [
        'Photoelectric effect and work function; engineering applications', 'X-rays: properties, medical and industrial applications',
        'Lasers: spontaneous and stimulated emission, population inversion, types, applications',
        'Refraction, total internal reflection; optical fibre: materials, types, applications in communication',
        'Nanoscience and nanotechnology: nanoparticles, nanomaterials, applications'] },
    ],
  },
  {
    key: 'chemistry-2', semester: 2, boardCode: '200499', name: 'Engineering Chemistry - II', credits: 2,
    match: ['engineering chemistry - ii', 'applied chemistry - ii', 'applied chemistry-ii'],
    units: [
      { unitNo: 1, unitTitle: 'Metal and Alloy', hours: 10, topics: [
        'Ancient Indian metallurgy; minerals and ores of iron, aluminium, copper; gangue, flux, slag',
        'Metallurgy: concentration (gravity, electromagnetic separation, froth flotation), roasting, calcination, smelting, refining',
        'Extraction of iron from haematite (blast furnace) and aluminium from bauxite',
        'Mechanical properties: hardness, ductility, malleability, tensile strength, toughness, machinability, weldability, castability',
        'Alloys: purpose, ferrous (stainless steel, nickel steel) and non-ferrous (aluminium, copper alloys) with applications'] },
      { unitNo: 2, unitTitle: 'Engineering Materials', hours: 6, topics: [
        'Portland cement: manufacture, setting and hardening', 'Glass: manufacture, optical, windshield and photochromic glass',
        'Refractory and composite materials', 'Polymers: monomers; classification; thermoplastics and thermosetting',
        'Addition and condensation polymerization; degree of polymerization',
        'Polyethylene, PVC, polystyrene, PTFE, nylon-6, nylon-66, bakelite, epoxy resin; rubber and vulcanization'] },
      { unitNo: 3, unitTitle: 'Chemistry of Fuels', hours: 10, topics: [
        'Fuel and combustion; classification; calorific value (HCV, LCV); ignition temperature',
        "Dulong's formula; bomb calorimeter; numericals", 'Proximate analysis of coal',
        'Liquid fuels: knocking, cracking, octane and cetane numbers', 'Gaseous fuels: LPG, CNG, water gas, coal gas, producer gas, biogas',
        'Green hydrogen by electrolysis from renewable sources: advantages and disadvantages',
        'Conductance in metals and electrolytes; specific and equivalent conductance; cell constant',
        'Cells and batteries: dry cell, lead-acid cell, H₂-O₂ fuel cell, Ni-Cd and lithium-ion batteries'] },
      { unitNo: 4, unitTitle: 'Lubricants', hours: 8, topics: [
        'Functions and properties of a good lubricant; classification', 'Lubrication mechanism: hydrodynamic and boundary',
        'Physical properties: viscosity, viscosity index, oiliness, flash, fire, cloud and pour point',
        'Chemical properties: coke number, total acid number, saponification value'] },
      { unitNo: 5, unitTitle: 'Corrosion and its Prevention; Organic Coatings', hours: 6, topics: [
        'Corrosion: definition, types, theories (galvanic cell, differential aeration), factors affecting rate',
        'Prevention: control of environment, alloying, metal coating, electroplating, galvanization, tinning, anodizing',
        'Cathodic protection: sacrificial anode and impressed voltage methods',
        'Paints: purpose, components and their functions; varnish; paint vs varnish; special paints'] },
      { unitNo: 6, unitTitle: 'Catalysis', hours: 8, topics: [
        'Catalyst: positive and negative', 'Homogeneous and heterogeneous catalysis', 'Promoters and catalyst poisons',
        'Characteristics of a catalyst', 'Industrial applications of catalysts'] },
    ],
  },
  {
    key: 'evs', semester: 2, boardCode: '200599', name: 'Environmental Science & Energy Management', credits: 2,
    match: ['environmental science & energy management', 'environmental science and energy management'],
    units: [
      { unitNo: 1, unitTitle: 'Environment, Ecosystem and Natural Resources', hours: 14, topics: [
        'Environment: definition and scope', 'Ecosystem: components and structure', 'Sustainable development', 'Water and forest resources'] },
      { unitNo: 2, unitTitle: 'Environmental Pollution', hours: 15, topics: [
        'Air, water, soil, marine, noise and thermal pollution', 'Solid waste management', 'Role of individuals'] },
      { unitNo: 3, unitTitle: 'Social Issues and Environment', hours: 14, topics: [
        'Rainwater harvesting', 'Global warming', 'Disaster management', 'Green buildings', 'Environmental acts', 'Organic farming'] },
      { unitNo: 4, unitTitle: 'Energy Conservation and Audit', hours: 14, topics: [
        'Efficiency in lighting, appliances and motors', 'Energy audit methodology', 'BEE (Bureau of Energy Efficiency) schemes'] },
      { unitNo: 5, unitTitle: 'Renewable Energy', hours: 7, topics: [
        'Types of renewable energy sources (solar, wind, etc.)', 'Electric vehicles'] },
    ],
  },
  {
    key: 'graphics-2', semester: 2, boardCode: '200699', name: 'Engineering Graphics - II', credits: 3,
    match: ['engineering graphics - ii', 'engineering graphics-ii'],
    units: [
      { unitNo: 1, unitTitle: 'Sectional Views of Solids', hours: 14, topics: [
        'Introduction to sections of solids; hatching (BIS conventions)', 'Sections of prisms, cubes, pyramids, tetrahedrons',
        'Sections of cylinders, cones, spheres', 'Sections of combinations and truncated / frustum solids',
        'Sectional views; conventions of materials and steel sections'] },
      { unitNo: 2, unitTitle: 'Development of Surfaces', hours: 14, topics: [
        'Methods of developing lateral surfaces', 'Development of cubes, prisms and cylinders (including truncated)',
        'Development of pyramids and cones (including frustum)', 'Applications: tray, funnel, chimney, pipe bends'] },
      { unitNo: 3, unitTitle: 'Screw Threads', hours: 0, topics: [
        'Nomenclature and types of threads', 'Forms of external threads: V, square, Acme, BA, BSW, knuckle, metric, Seller, buttress',
        'Conventions of left- and right-hand, external and internal threads', 'Single, double and multi-start threads'] },
      { unitNo: 4, unitTitle: 'Nuts and Bolts', hours: 4, topics: [
        'Views of hexagonal and square nuts', 'Assembly of hexagonal and square headed bolts with nuts and washers',
        'Locking devices: lock nut, castle nut, split-pin nut, sawn nut, slotted nut'] },
      { unitNo: 5, unitTitle: 'Screws, Studs, Washers', hours: 10, topics: [
        'Types of machine screws', 'Studs and set screws', 'Wood screws'] },
      { unitNo: 6, unitTitle: 'Keys and Cotters', hours: 6, topics: [
        'Types of keys and cotters and their applications', 'Cotter joints: gib and cotter joint, knuckle joint'] },
      { unitNo: 7, unitTitle: 'Free-hand Sketching (Rivets and Couplings)', hours: 14, topics: [
        'Screws, studs, washers, rivets and riveted joints', 'Structural and general-purpose rivet heads',
        'Caulking and fullering', 'Riveted joints: lap, butt (single / double riveted, single / double cover plate), chain and zig-zag',
        'Muff (box) coupling and half-lap muff coupling'] },
      { unitNo: 8, unitTitle: 'Basic AutoCAD', hours: 12, topics: [
        'CAD software and its tools', 'Commands to make 3D / isometric views',
        'Drawing solids on the system: nut and bolt assembly, washer, riveted joint, sleeve and cotter joint'] },
    ],
  },
  {
    key: 'workshop-2', semester: 2, boardCode: '200799', name: 'General Workshop Practice - II', credits: 3,
    match: ['general workshop practice - ii', 'general workshop practice-ii'],
    outcome: 'Practical course: jobs are made in each shop and assessed in the workshop.',
    units: [
      { unitNo: 1, unitTitle: 'Welding and Fabrication Shop', hours: 0, topics: ['Welding equipment: arc welding transformer, spot welding', 'Welding safety and joints', 'Welding / fabrication job'] },
      { unitNo: 2, unitTitle: 'Sheet Metal Shop', hours: 0, topics: ['Sheet metal tools and materials', 'Marking, cutting, bending and joining', 'Sheet metal job'] },
      { unitNo: 3, unitTitle: 'Foundry Shop and Plastic Moulding', hours: 0, topics: ['Moulding sand, patterns and tools', 'Mould making and casting', 'Plastic moulding'] },
      { unitNo: 4, unitTitle: 'Painting and Polishing Shop', hours: 0, topics: ['Selection of paints and surface preparation', 'Painting and polishing methods', 'Painting job'] },
      { unitNo: 5, unitTitle: 'Electric & Electronic Shop - II', hours: 0, topics: ['Electrical and electronic tools and components', 'Wiring and circuit practice', 'Elective shop job (as allotted by the institute)'] },
    ],
  },
];
