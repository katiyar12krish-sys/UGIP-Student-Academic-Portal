// ===================================================================================================
// UBTER syllabus, Computer Science & Engineering, V Semester (3rd year).
// Source: "CSE (Computer Science & Engineering) - V Sem New Syllabus" booklet (UBTER, branch code 05).
// Typed in by hand from the "Detailed contents" of each subject. `hours` = periods given in the booklet.
// Credits are from the study and evaluation scheme on the first page of the booklet.
// ===================================================================================================
import type { SyllabusCourse } from './syllabusTypes';

export const SYLLABUS_CSE_SEM5: SyllabusCourse[] = [
  {
    key: 'cse5-se', semester: 5, branches: ['CSE'], boardCode: '055002', name: 'Software Engineering', credits: 5,
    match: ['software engineering'],
    units: [
      { unitNo: 1, unitTitle: 'Introduction to Software Engineering', hours: 15, topics: [
        'Need and definition of software engineering; software characteristics; software myths; program vs software product',
        'SDLC models: waterfall, prototyping, spiral, iterative enhancement, RAD, object-oriented; advantages, disadvantages and comparison',
        'Software Requirement Specification (SRS): value of a good SRS, requirement process, desirable characteristics, components, structure, problems',
        'Requirements gathering'] },
      { unitNo: 2, unitTitle: 'Software Design and Planning', hours: 20, topics: [
        'Software design: definition, objectives, process; architectural and modular design; structure chart',
        'Coupling and cohesion (types); interface design; human-computer interface design',
        'Software metrics: product and project metrics; function point and feature point metrics',
        'Project estimation: steps, reasons for poor estimation, guidelines, estimation models, COCOMO model'] },
      { unitNo: 3, unitTitle: 'Software Maintenance and Risk Management', hours: 15, topics: [
        'Software as an evolving entity; software configuration management activities; change control; version control',
        'Need and categories of maintenance; maintenance cost; factors affecting the effort',
        'Risk: definition, types of software risks, monitoring, management, avoidance and detection'] },
      { unitNo: 4, unitTitle: 'Software Quality Assurance', hours: 15, topics: [
        'Verification and validation; SQA objectives, goals and SQA plan',
        'Software quality: definition, classification, attributes, importance',
        'SEI-CMM five levels; ISO 9000: need, benefits, limitations, salient features; introduction to ISO 9126',
        'Software reliability: definition, terminology, measurement process'] },
      { unitNo: 5, unitTitle: 'Software Testing', hours: 15, topics: [
        'Testing principles and objectives; test oracles; fault, error, failure; test cases',
        'Black-box and white-box testing: methods, advantages and disadvantages',
        'Unit, integration and system testing', 'Static testing strategies; formal technical reviews; code reviews'] },
    ],
  },
  {
    key: 'cse5-android', semester: 5, branches: ['CSE'], boardCode: '055004', name: 'Android Application Development', credits: 6,
    match: ['android application development'],
    units: [
      { unitNo: 1, unitTitle: 'Open Source Mobile Technology', hours: 16, topics: [
        'Overview of Android: an open platform; Open Handset Alliance; Android marketplaces',
        'Setting up the Android development environment: Android SDK, IDE, emulators / AVD; custom emulator',
        'Android project framework and its applications'] },
      { unitNo: 2, unitTitle: 'Android Architecture Framework', hours: 10, topics: [
        'Linux kernel, libraries, Android runtime, application framework, applications',
        'Android start-up and Zygote', 'Android Debug Bridge (ADB)', 'Android permission model', 'AndroidManifest file'] },
      { unitNo: 3, unitTitle: 'Android UI Layout', hours: 14, topics: [
        'Application components: intent, activity, activity life cycle, broadcast receivers, services, manifest',
        'Creating an application and new activities; expressions and flow control',
        'Layouts and layout properties; drawable resources; resolution and density independence (px, dp, sp); XML',
        'GUI objects: push button, text / labels, edit text, toggle button, weight sum, padding'] },
      { unitNo: 4, unitTitle: 'Event-driven Programming in Android', hours: 8, topics: [
        'Event handling (text edit, button click, etc.)', 'Splash screen', 'Activity life cycle', 'Introduction to threads in Android'] },
      { unitNo: 5, unitTitle: 'Menus and Dialog Boxes', hours: 16, topics: [
        'Custom vs system menus; hardware menu button', 'Themes and dialogs; alert dialog', 'Toast; lists and adapters', 'AndroidManifest.xml'] },
      { unitNo: 6, unitTitle: 'Applications with Database', hours: 16, topics: [
        'SQLite: SQLiteOpenHelper and creating a database', 'Opening and closing a database'] },
    ],
  },
  {
    key: 'cse5-java', semester: 5, branches: ['CSE'], boardCode: '055001', name: 'Java Programming', credits: 6,
    match: ['java programming', 'programming in java'],
    units: [
      { unitNo: 1, unitTitle: 'Basics and Language Fundamentals', hours: 15, topics: [
        'Java features, JRE, JVM, Java API; elements of a Java application; compiling and running',
        'Lexical tokens, identifiers, keywords, literals (integer, floating point, boolean, character, string), comments',
        'Primitive data types; class and variable declarations; command-line arguments',
        'Arithmetic and logical operators; evaluation of expressions; type casting (widening and narrowing)'] },
      { unitNo: 2, unitTitle: 'Declarations, Control Structures, Arrays', hours: 15, topics: [
        'if-else, nested if-else, switch; while, do-while, for; break and continue',
        'Enumerated types: type-safe enums, constructors and members, implicit static methods, extending enums',
        'Arrays: declaring, constructing, initializing, anonymous and multidimensional arrays',
        'String array, String methods, StringBuffer class'] },
      { unitNo: 3, unitTitle: 'Classes, Interfaces and Access Control', hours: 20, topics: [
        'Classes and objects: declarations, methods, default and overloaded constructors, instance and static members, initializer blocks, this keyword',
        'Parameter passing: primitive and reference values, arrays, final parameters, varargs, the main method',
        'Packages: defining, using, compiling and running; scope rules; abstract and final classes',
        'Access modifiers: public, private, default, protected; static, final, abstract, synchronized, native, transient, volatile',
        'Inheritance: hierarchy, overriding, hiding, super and this constructor calls, inheritance vs aggregation, instanceof and casting',
        'Abstract classes and interfaces: defining, extending, implementing, constants in interfaces'] },
      { unitNo: 4, unitTitle: 'Applets and AWT Controls', hours: 15, topics: [
        'Applets: life cycle, creating and running, applet tags, parameter tag', 'Graphics class: lines, rectangles, polygons, circles, arcs, line graphs, bar charts',
        'AWT components, event handlers and listeners', 'Labels, text components, buttons, check boxes, choice, scrollbars, layout managers, input events, menus'] },
      { unitNo: 5, unitTitle: 'Exception Handling, Multithreading, JDBC, I/O Streams', hours: 15, topics: [
        'Exceptions: checked exceptions, try-catch-finally, try-finally, throw and throws',
        'Multithreading: Thread class, creating threads, life cycle, priority, synchronization, Runnable, scheduling',
        'JDBC: architecture (two-tier, three-tier), drivers, connecting a Java application to a database',
        'I/O streams: input / output streams, file streams, PrintWriter, write, read and readLine'] },
    ],
  },
  {
    key: 'cse5-hardware', semester: 5, branches: ['CSE'], boardCode: '055003', name: 'Computer Hardware and Servicing', credits: 6,
    match: ['computer hardware and servicing', 'computer hardware & servicing', 'computer hardware'],
    units: [
      { unitNo: 1, unitTitle: 'Motherboard Components, Processors, Chipsets and Buses', hours: 15, topics: [
        'Processor sockets, memory sockets, chipsets, cache, BIOS, clock generator, RTC, super I/O, connectors, jumpers, ports and headers',
        'Motherboard form factors; hardware, software and firmware; motherboard architecture and block diagram',
        'Processors: Core 2 Duo, Quad core, Core i3 / i5 / i7, AMD A10, Xeon', 'Chipsets: north / south bridge and hub architecture',
        'Bus standards: PCI, AGP, USB, processor bus'] },
      { unitNo: 2, unitTitle: 'Memory & I/O Devices', hours: 15, topics: [
        'Memory speed, access time, wait states; main memory types; memory errors',
        'Hard disk: construction, working, file systems, formatting and troubleshooting',
        'Keyboard: interfacing (USB, wireless), key matrix, key bouncing, types; mouse: optical mouse, cleaning, troubleshooting',
        'Printers: dot matrix, inkjet, laser, thermal, MFP; operation and troubleshooting',
        'Scanners: mechanism, types (bar code, handheld, flatbed), maintenance and troubleshooting'] },
      { unitNo: 3, unitTitle: 'Display, Power Supply & BIOS', hours: 15, topics: [
        'Displays: LCD, plasma, TFT, LED; graphic cards and video capture card',
        'SMPS: block diagram, operation, output voltages, cable colour code, connectors, power good, common failures',
        'BIOS: functions, cold and warm booting, error codes, interrupts, advanced setup, upgrading / flashing, AMI and Award BIOS',
        'POST: error and beep codes, error messages'] },
      { unitNo: 4, unitTitle: 'Maintenance & Troubleshooting of Desktop and Laptop Computers', hours: 17, topics: [
        'Laptop vs desktop; types of laptop; block diagram; configuring laptops and power settings; SMD components; ESD precautions',
        'Laptop components: adapter, battery, RAM, CPU, laptop motherboard, keyboard',
        'Formatting, partitioning and OS installation; troubleshooting laptop and desktop problems',
        'Preventive maintenance: tools, active and passive maintenance, diagnostics software, schedule; upgrading motherboard, memory, CPU, graphics card, BIOS'] },
      { unitNo: 5, unitTitle: 'Mobile Phone Servicing', hours: 18, topics: [
        'Basics of mobile communication; components: battery, antenna, earpiece, microphone, speaker, buzzer, LCD, keypad; ICs on the circuit board',
        'Servicing kit; soldering and de-soldering; multimeter and battery booster',
        'Assembling and disassembling phones; OS installation; fault finding; jumper techniques',
        'Software: flashing, formatting, unlocking', 'Mobile viruses, precautions and anti-virus software'] },
    ],
  },
  {
    key: 'cse5-minor', semester: 5, branches: ['CSE'], boardCode: '055005', name: 'Minor Project Work', credits: 7,
    match: ['minor project work', 'minor project'],
    outcome: 'Practical: a real-life project in a batch of up to 6 students, preferably with industry exposure of 2 to 4 weeks.',
    units: [
      { unitNo: 1, unitTitle: 'Project Work', hours: 0, topics: [
        'Apply theory and practicals to an application for a real working environment',
        'Develop software / applications for the actual needs of the community',
        'Industrial environment, work ethics and entrepreneurship',
        'Guided discussions, document sharing and a collaborative final project report',
        'Awareness of disaster management'] },
    ],
  },
];
