// ===================================================================================================
// UBTER detailed syllabus, Computer Science & Engineering, III Semester (2026-27 scheme).
// Source: "2026-27_Computer Science Engineering III Sem" booklet (UBTER / IRDT).
// Typed in by hand from the booklet's theory / practical tables. Board codes are the 8-digit codes in the booklet.
// Note: some of these subjects are new in the 2026-27 scheme and may not yet be in the portal's subject list.
// ===================================================================================================
import type { SyllabusCourse } from './syllabusTypes';

export const SYLLABUS_CSE_SEM3: SyllabusCourse[] = [
  {
    key: 'cse3-c', semester: 3, branches: ['CSE'], boardCode: '25053001', name: 'Concepts of C Programming', credits: 4,
    match: ['concepts of c programming', 'programming in c'],
    units: [
      { unitNo: 1, unitTitle: "Basics of 'C' Programming", hours: 8, topics: [
        'Algorithms: notion of an algorithm; notation for assignment and basic control structures',
        "General structure of a C program; header files; main() function",
        'Character set, tokens, keywords, identifiers; number, character and string constants; variables',
        'Data types; declaring variables; type conversion', 'Input / output with printf() and scanf()',
        'Assignment and expressions: arithmetic, shift and bitwise operators; sizeof operator'] },
      { unitNo: 2, unitTitle: 'Control Structures', hours: 10, topics: [
        'Relational and logical operators', 'if, if-else, nested if-else, if-else ladder, switch',
        'Loops: while, do...while, for', "Branching: goto, break and continue"] },
      { unitNo: 3, unitTitle: 'Arrays', hours: 10, topics: [
        'Characteristics of an array', 'One-dimensional, two-dimensional and multi-dimensional arrays',
        'Declaration, initialization and operations on arrays', 'Character and string input / output; string operations'] },
      { unitNo: 4, unitTitle: 'Functions', hours: 10, topics: [
        'Concept and need of functions', 'Library functions: math, string handling, getchar(), putchar(), malloc(), calloc()',
        'User-defined functions: definition, declaration, call; local and global variables',
        'Parameter passing: call by value and call by reference; return values and return types', 'Recursive functions'] },
      { unitNo: 5, unitTitle: 'Structures & Pointers', hours: 10, topics: [
        'Structures: features, declaration, initialization, array of structures', 'typedef and enumerated data types',
        "Pointers: definition, use, '*' and '&' operators, declaring, initializing and accessing", 'Pointer arithmetic'] },
    ],
  },
  {
    key: 'cse3-co', semester: 3, branches: ['CSE'], boardCode: '25053002', name: 'Computer Organization', credits: 3,
    match: ['computer organization', 'computer organisation'],
    units: [
      { unitNo: 1, unitTitle: 'Number Systems, Logic Gates, Boolean Algebra', hours: 16, topics: [
        "Binary arithmetic; 1's and 2's complement; 9's and 10's complement", 'Fixed-point and floating-point representation',
        'Logic gates: AND, OR, NOT, NAND, NOR, EX-OR, EX-NOR and truth tables',
        "Boolean algebra: laws, duality, De Morgan's theorem; K-map simplification (up to 4 variables)"] },
      { unitNo: 2, unitTitle: 'Arithmetic and Logic Circuits', hours: 16, topics: [
        'Half adder and full adder', 'Combinational circuits: multiplexers, demultiplexers, encoders, decoders',
        'Sequential circuits: flip-flops S-R, J-K, T, D and truth tables'] },
      { unitNo: 3, unitTitle: 'Basic Structure of Computers, Register Transfer, Micro-operations', hours: 20, topics: [
        'Computer system organization; bus systems', 'Register transfer language',
        'Instruction codes; instruction cycle; memory-reference instructions', 'Data transfer and addressing modes'] },
      { unitNo: 4, unitTitle: 'Timing & Control, Control Memory', hours: 10, topics: [
        'Control memory; design of control units', 'Hardwired vs micro-programmed control'] },
      { unitNo: 5, unitTitle: 'Input-Output Organization', hours: 10, topics: [
        'Peripheral devices and I/O interfaces', 'Direct Memory Access (DMA)', 'Priority interrupts'] },
      { unitNo: 6, unitTitle: 'Pipeline and Vector Processing', hours: 8, topics: [
        'Basics of pipelining', 'Vector processing'] },
    ],
  },
  {
    key: 'cse3-os', semester: 3, branches: ['CSE'], boardCode: '25053003', name: 'Operating System', credits: 3,
    match: ['operating system', 'operating systems'],
    units: [
      { unitNo: 1, unitTitle: 'Introduction to Operating System', hours: 8, topics: [
        'Basics and types of operating systems', 'OS components', 'Core OS services and operations'] },
      { unitNo: 2, unitTitle: 'OS Components: Process Management', hours: 12, topics: [
        'Process management and process states', 'Scheduling objectives, types of schedulers, performance criteria, scheduling algorithms',
        'Inter-process communication (IPC), shared memory, semaphores', 'Deadlock and deadlock prevention'] },
      { unitNo: 3, unitTitle: 'Memory Management', hours: 12, topics: [
        'Memory management techniques', 'Paging and segmentation', 'Fragmentation and compaction',
        'Virtual memory and demand paging', 'Page replacement algorithms'] },
      { unitNo: 4, unitTitle: 'I/O and File Management, Security & Protection', hours: 8, topics: [
        'File management and file access methods', 'Disk allocation methods and disk formatting',
        'Security threats, mechanisms and policies'] },
      { unitNo: 5, unitTitle: 'General Topics in Advanced Operating Systems', hours: 8, topics: [
        'Linux OS', 'Virtual machines and virtualization', 'Microkernel architecture', 'Cloud OS and cloud computing', 'Mobile operating systems'] },
    ],
  },
  {
    key: 'cse3-web', semester: 3, branches: ['CSE'], boardCode: '25053004', name: 'Fundamentals of Internet & Web Design', credits: 3,
    match: ['fundamentals of internet & web design', 'fundamentals of internet and web design', 'internet and web technologies'],
    units: [
      { unitNo: 1, unitTitle: 'Internet Basics', hours: 6, topics: [
        'Concepts of the Internet and World Wide Web', 'Internet addressing, browsers, URLs, web servers, domain names', 'Applications in various fields'] },
      { unitNo: 2, unitTitle: 'Internet Connectivity', hours: 8, topics: [
        'Types of connectivity: telephone, cable, ISDN, VSAT, RF link', 'Devices: modem, router, dongle; role of the ISP'] },
      { unitNo: 3, unitTitle: 'Web Designing', hours: 6, topics: [
        'Web design software: HTML, CSS, Notepad++, Dreamweaver, WordPress, Sublime and more'] },
      { unitNo: 4, unitTitle: 'HTML', hours: 0, topics: [
        'Tags and formatting', 'Lists, graphics, tables, links, frames', 'Div and Span tags', 'URL encoding'] },
      { unitNo: 5, unitTitle: 'CSS', hours: 0, topics: [
        'Syntax and selectors', 'Box model and positioning', 'Backgrounds, fonts, tables, display'] },
      { unitNo: 6, unitTitle: 'JavaScript', hours: 8, topics: [
        'Introduction to DHTML and XML', 'Perl and CGI', 'JavaScript basics'] },
    ],
  },
  {
    key: 'cse3-oss', semester: 3, branches: ['CSE'], boardCode: '25053005', name: 'Open Source Software', credits: 2,
    match: ['open source software'],
    units: [
      { unitNo: 1, unitTitle: 'Introduction to Open Source', hours: 6, topics: [
        'Open source: need and principles; Open Source Initiative; open-source standards',
        'Free software vs proprietary software; public domain', 'History of the Free Software Foundation and the GNU project'] },
      { unitNo: 2, unitTitle: 'Open-Source Principles and Methodology', hours: 6, topics: [
        'Open-source history; open standards principles; methodologies', 'FOSS licences: Apache, BSD, GPL, LGPL; copyrights and patents',
        'Zero marginal cost; income generation opportunities'] },
      { unitNo: 3, unitTitle: 'Open-Source Projects', hours: 9, topics: [
        'Starting and maintaining an open-source project; open-source design', 'Collaboration on GitHub; communication and etiquette',
        'Contributing to projects: testing and reporting issues'] },
      { unitNo: 4, unitTitle: 'Open-Source Ethics and Social Impact', hours: 9, topics: [
        'Ethics of open source', 'Social and financial impacts', 'Open source as a business strategy'] },
      { unitNo: 5, unitTitle: 'Understanding the Open-Source Ecosystem', hours: 9, topics: [
        'GNU/Linux, Android, FreeBSD, OpenSolaris', 'Open-source hardware, Docker, LAMP stack', 'Open-source database technologies'] },
      { unitNo: 6, unitTitle: 'Case Studies', hours: 9, topics: [
        'Apache web server, GNU/Linux, Mozilla Firefox, Wikipedia', 'Licensing; commercial vs non-commercial use'] },
    ],
  },
  {
    key: 'cse3-office', semester: 3, branches: ['CSE'], boardCode: '25053006', name: 'Office Application', credits: 2,
    match: ['office application', 'office applications'],
    outcome: 'Practical course (lab only).',
    units: [
      { unitNo: 1, unitTitle: 'Spreadsheets', hours: 0, topics: [
        'Budget spreadsheet with multiple sheets; formulas for income, expenses and balance', 'Formatting cells for different data types',
        'Sales analysis: sorting and filtering', 'Bar, line and pie charts', 'Freeze panes'] },
      { unitNo: 2, unitTitle: 'Word Processing', hours: 0, topics: [
        'Formal letter; page layout, margins and alignment', 'Header, footer and page numbers', 'Newsletter with columns, images and text boxes',
        'Tables and visual styles', 'Mail merge for invitations'] },
      { unitNo: 3, unitTitle: 'Databases and Tables', hours: 0, topics: [
        'Student table with primary key; inserting and editing records', 'Queries to retrieve records',
        'Library books database: updating records and reports', 'Sales transactions database: sort, filter, query'] },
      { unitNo: 4, unitTitle: 'Presentations', hours: 0, topics: [
        'Business presentation with objectives, data and plans', 'Animations and transitions', 'Educational presentation; sound and animation effects'] },
      { unitNo: 5, unitTitle: 'Internet and E-mail', hours: 0, topics: [
        'Creating and managing an e-mail account', 'Sending, receiving and deleting e-mails with attachments', 'Group e-mails'] },
    ],
  },
  {
    key: 'cse3-minor', semester: 3, branches: ['CSE'], boardCode: '25053007', name: 'Minor Project - I', credits: 1,
    match: ['minor project - i', 'minor project-i', 'minor project'],
    outcome: 'Small working projects using C programming, office applications and web design (9 weeks).',
    units: [
      { unitNo: 1, unitTitle: 'Mini Project using C Programming (Week 1-3)', hours: 6, topics: ['Basic C programs solving a small problem'] },
      { unitNo: 2, unitTitle: 'Office Suite Project (Week 4-5)', hours: 8, topics: ['Report, data sheet and presentation'] },
      { unitNo: 3, unitTitle: 'Web Page Design (Week 6)', hours: 6, topics: ['Personal portfolio or resume page using HTML and CSS'] },
      { unitNo: 4, unitTitle: 'Combined Project (Week 7-8)', hours: 8, topics: ['E.g. billing system with documents and a web interface'] },
      { unitNo: 5, unitTitle: 'Final Report & Presentation (Week 9)', hours: 4, topics: ['Project documentation and PPT presentation'] },
    ],
  },
];
