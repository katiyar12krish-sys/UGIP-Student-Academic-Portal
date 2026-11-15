import type { PlacementMcq } from '../bank';
import { fromRows, generate, mcq, type Row } from './builder';

const C = 'CSE Technical' as const;

const ROWS: Row[] = [
  // ---- C / programming basics ----
  ['Which symbol ends a statement in C?', ';', ':', '.', ','],
  ['Size of char in C (typically)?', '1 byte', '2 bytes', '4 bytes', '8 bytes'],
  ['Format specifier for int in printf?', '%d', '%f', '%c', '%s'],
  ['Format specifier for float in printf?', '%f', '%d', '%c', '%x'],
  ['Which loop runs at least once?', 'do-while', 'while', 'for', 'none'],
  ['Which keyword exits a loop immediately?', 'break', 'continue', 'exit', 'stop'],
  ['Which keyword skips to the next loop iteration?', 'continue', 'break', 'goto', 'return'],
  ['Header file needed for printf()?', 'stdio.h', 'conio.h', 'math.h', 'string.h'],
  ['Header file for strlen()?', 'string.h', 'stdio.h', 'stdlib.h', 'ctype.h'],
  ['Function used to allocate memory dynamically in C?', 'malloc()', 'alloc()', 'new()', 'create()'],
  ['Function to free dynamically allocated memory in C?', 'free()', 'delete()', 'remove()', 'clear()'],
  ['A pointer stores', 'the address of a variable', 'the value of a variable', 'a function name only', 'a data type'],
  ['Operator to get the address of a variable in C?', '&', '*', '#', '@'],
  ['Array index in C starts from', '0', '1', '-1', 'any number'],
  ['Which is not a valid C data type?', 'string', 'int', 'float', 'char'],
  ['Result of 7 % 3 in C?', '1', '2', '0', '3'],
  ['Result of 7 / 2 in C (both int)?', '3', '3.5', '4', '2'],
  ['Which operator is used for logical AND in C?', '&&', '&', 'AND', '||'],
  ['Which of these is a ternary operator?', '?:', '::', '->', '=='],
  ['Recursion means', 'a function calling itself', 'a loop inside a loop', 'a pointer to pointer', 'an array of functions'],
  ['Default return type of main() in C?', 'int', 'void', 'char', 'float'],
  ['Which storage class keeps a local variable value between calls?', 'static', 'auto', 'register', 'extern'],
  ['Keyword used to define a structure in C?', 'struct', 'class', 'record', 'object'],
  ['Which is the correct way to declare a constant in C?', 'const int x = 5;', 'constant int x = 5;', 'int const = 5;', '#const x 5'],
  // ---- OOP / C++ / Java ----
  ['Wrapping data and functions into a single unit is called', 'Encapsulation', 'Inheritance', 'Polymorphism', 'Abstraction'],
  ['Acquiring properties of one class into another is', 'Inheritance', 'Encapsulation', 'Overloading', 'Abstraction'],
  ['Same function name with different parameters is', 'Function overloading', 'Function overriding', 'Inheritance', 'Encapsulation'],
  ['Redefining a base-class method in a derived class is', 'Method overriding', 'Method overloading', 'Encapsulation', 'Abstraction'],
  ['A constructor has the same name as', 'the class', 'the object', 'the file', 'main()'],
  ['Which is called automatically when an object is destroyed (C++)?', 'Destructor', 'Constructor', 'Friend function', 'Virtual function'],
  ['Hiding internal details and showing only essentials is', 'Abstraction', 'Inheritance', 'Polymorphism', 'Overloading'],
  ['Access specifier that allows access only inside the class', 'private', 'public', 'protected', 'friend'],
  ['Java source code is compiled into', 'bytecode', 'machine code directly', 'assembly', 'HTML'],
  ['JVM stands for', 'Java Virtual Machine', 'Java Variable Method', 'Joint Virtual Memory', 'Java Visual Model'],
  ['Which keyword is used to inherit a class in Java?', 'extends', 'implements', 'inherits', 'super'],
  ['Which keyword is used to implement an interface in Java?', 'implements', 'extends', 'interface', 'uses'],
  ['Java does not support multiple inheritance of', 'classes', 'interfaces', 'methods', 'packages'],
  ['Which method is the entry point of a Java program?', 'public static void main(String[] args)', 'start()', 'run()', 'init()'],
  ['Which is not a Java primitive type?', 'String', 'int', 'boolean', 'double'],
  ['Garbage collection in Java is used to', 'free unused memory automatically', 'delete files', 'compile code', 'clear the screen'],
  ['Python is a ____ language.', 'interpreted, high-level', 'machine-level', 'assembly', 'markup'],
  ['Which keyword defines a function in Python?', 'def', 'function', 'func', 'define'],
  ['Which Python data type is immutable?', 'tuple', 'list', 'dict', 'set'],
  ['Output of len([1, 2, 3]) in Python?', '3', '2', '6', 'error'],
  ['Python uses ____ to define code blocks.', 'indentation', 'curly braces', 'semicolons', 'brackets'],
  // ---- Data structures ----
  ['Which data structure follows FIFO?', 'Queue', 'Stack', 'Tree', 'Graph'],
  ['Push and pop operations belong to', 'Stack', 'Queue', 'Array only', 'Graph'],
  ['Best data structure for recursion / function calls', 'Stack', 'Queue', 'Linked list', 'Heap'],
  ['Each node of a singly linked list contains', 'data and pointer to next node', 'only data', 'two data fields', 'pointer to previous only'],
  ['Maximum children of a node in a binary tree', '2', '1', '3', 'unlimited'],
  ['In-order traversal of a BST gives elements in', 'sorted order', 'reverse order', 'random order', 'level order'],
  ['Worst-case time of bubble sort', 'O(n^2)', 'O(n log n)', 'O(n)', 'O(log n)'],
  ['Average time complexity of quick sort', 'O(n log n)', 'O(n^2)', 'O(n)', 'O(1)'],
  ['Merge sort uses which technique?', 'Divide and conquer', 'Greedy', 'Backtracking', 'Brute force'],
  ['Linear search worst-case time', 'O(n)', 'O(log n)', 'O(1)', 'O(n^2)'],
  ['Binary search requires the array to be', 'sorted', 'unsorted', 'circular', 'two-dimensional'],
  ['BFS of a graph uses a', 'queue', 'stack', 'heap', 'tree'],
  ['DFS of a graph uses a', 'stack', 'queue', 'array only', 'hash table'],
  ['A queue where insertion and deletion happen at both ends', 'Deque', 'Circular queue', 'Priority queue', 'Stack'],
  ['Hashing is mainly used for', 'fast searching', 'sorting', 'printing', 'compression only'],
  // ---- DBMS / SQL ----
  ['SQL command to fetch data', 'SELECT', 'GET', 'FETCH', 'SHOW'],
  ['SQL command to add a new row', 'INSERT', 'ADD', 'UPDATE', 'CREATE'],
  ['SQL command to modify existing rows', 'UPDATE', 'MODIFY', 'ALTER', 'CHANGE'],
  ['SQL command to delete a table completely', 'DROP TABLE', 'DELETE TABLE', 'TRUNCATE', 'REMOVE'],
  ['Which clause filters rows in SQL?', 'WHERE', 'ORDER BY', 'GROUP BY', 'HAVING only'],
  ['Which clause sorts the result?', 'ORDER BY', 'SORT BY', 'GROUP BY', 'ARRANGE'],
  ['Which clause filters groups after GROUP BY?', 'HAVING', 'WHERE', 'ORDER BY', 'LIMIT'],
  ['DDL stands for', 'Data Definition Language', 'Data Deletion Language', 'Dynamic Data Language', 'Data Driven Logic'],
  ['DML command among these', 'INSERT', 'CREATE', 'DROP', 'ALTER'],
  ['DDL command among these', 'CREATE', 'SELECT', 'UPDATE', 'DELETE'],
  ['A foreign key refers to', 'primary key of another table', 'any column of the same table', 'an index', 'a view'],
  ['Normalization is done to', 'reduce data redundancy', 'increase redundancy', 'speed up the CPU', 'encrypt data'],
  ['A table is in 1NF if it has', 'atomic (single) values in each cell', 'no primary key', 'only one column', 'foreign keys'],
  ['ACID property "A" stands for', 'Atomicity', 'Accuracy', 'Availability', 'Authorization'],
  ['Aggregate function that counts rows', 'COUNT()', 'SUM()', 'TOTAL()', 'NUMBER()'],
  ['JOIN that returns only matching rows from both tables', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN'],
  ['Which is a NoSQL database?', 'MongoDB', 'MySQL', 'Oracle', 'PostgreSQL'],
  ['Command to undo uncommitted changes', 'ROLLBACK', 'COMMIT', 'UNDO', 'REVERT'],
  ['A view in SQL is', 'a virtual table', 'a physical table', 'an index', 'a trigger'],
  // ---- Networking ----
  ['Number of layers in the OSI model', '7', '5', '4', '6'],
  ['Number of layers in the TCP/IP model', '4', '7', '5', '3'],
  ['Which device works at the network layer?', 'Router', 'Hub', 'Repeater', 'Switch (Layer 2)'],
  ['Which device works at the data link layer?', 'Switch', 'Router', 'Hub', 'Gateway'],
  ['IPv4 address size', '32 bits', '64 bits', '128 bits', '16 bits'],
  ['IPv6 address size', '128 bits', '32 bits', '64 bits', '256 bits'],
  ['MAC address size', '48 bits', '32 bits', '64 bits', '128 bits'],
  ['Protocol that assigns IP addresses automatically', 'DHCP', 'DNS', 'FTP', 'SMTP'],
  ['Protocol that converts domain names to IP addresses', 'DNS', 'DHCP', 'ARP', 'HTTP'],
  ['Protocol used to send email', 'SMTP', 'POP3', 'FTP', 'HTTP'],
  ['Protocol used to receive email (download)', 'POP3', 'SMTP', 'SNMP', 'FTP'],
  ['Default port of HTTP', '80', '443', '21', '25'],
  ['Default port of FTP (control)', '21', '22', '23', '80'],
  ['Default port of SSH', '22', '21', '23', '25'],
  ['Which protocol is connection-less?', 'UDP', 'TCP', 'FTP', 'HTTP'],
  ['Which topology connects all devices to a central hub?', 'Star', 'Bus', 'Ring', 'Mesh'],
  ['Default subnet mask of class C', '255.255.255.0', '255.255.0.0', '255.0.0.0', '255.255.255.255'],
  ['Default subnet mask of class B', '255.255.0.0', '255.255.255.0', '255.0.0.0', '0.0.0.0'],
  ['Loopback IP address', '127.0.0.1', '192.168.0.1', '10.0.0.1', '255.255.255.0'],
  ['Command to check network connectivity to a host', 'ping', 'ipconfig', 'netstat', 'tracert only'],
  ['Cable commonly used in LANs', 'Cat-6 twisted pair', 'Coaxial TV cable', 'Telephone wire', 'Power cable'],
  ['Wi-Fi is based on which IEEE standard?', '802.11', '802.3', '802.15', '802.5'],
  ['Ethernet is based on which IEEE standard?', '802.3', '802.11', '802.15', '802.1'],
  ['A firewall is used to', 'filter network traffic', 'store files', 'speed up the CPU', 'print documents'],
  // ---- OS / hardware ----
  ['Brain of the computer', 'CPU', 'RAM', 'Hard disk', 'Monitor'],
  ['Volatile memory among these', 'RAM', 'ROM', 'Hard disk', 'SSD'],
  ['BIOS is stored in', 'ROM / flash chip', 'RAM', 'Hard disk', 'Cache'],
  ['Fastest memory among these', 'Cache', 'RAM', 'SSD', 'Hard disk'],
  ['1 KB equals', '1024 bytes', '1000 bytes', '512 bytes', '2048 bytes'],
  ['1 byte equals', '8 bits', '4 bits', '16 bits', '2 bits'],
  ['A program in execution is a', 'process', 'file', 'thread pool', 'driver'],
  ['Deadlock needs mutual exclusion, hold and wait, no pre-emption and', 'circular wait', 'paging', 'thrashing', 'caching'],
  ['CPU scheduling algorithm that runs the shortest job first', 'SJF', 'FCFS', 'Round Robin', 'LIFO'],
  ['Round Robin scheduling uses a', 'time quantum', 'priority only', 'stack', 'deadline'],
  ['Virtual memory is implemented using', 'paging', 'cache only', 'registers', 'BIOS'],
  ['Linux command to list files', 'ls', 'dir /s', 'list', 'show'],
  ['Linux command to change directory', 'cd', 'chdir only on Windows', 'move', 'go'],
  ['Linux command to show the current directory', 'pwd', 'cwd', 'dir', 'path'],
  ['Linux command to change file permissions', 'chmod', 'chown', 'perm', 'attrib'],
  ['Windows command to see IP configuration', 'ipconfig', 'ifconfig only', 'ping', 'netip'],
  ['Which is an open-source OS?', 'Linux', 'Windows 11', 'macOS', 'iOS'],
  ['Port used to connect a modern monitor with audio and video', 'HDMI', 'PS/2', 'RJ-11', 'Serial COM'],
  ['SMPS in a computer provides', 'DC power to components', 'internet', 'cooling', 'display'],
  ['POST is performed by the', 'BIOS during boot', 'operating system after login', 'browser', 'antivirus'],
  // ---- Web ----
  ['HTML stands for', 'HyperText Markup Language', 'HighText Machine Language', 'Hyperlink Tool Markup Language', 'Home Tool Markup Language'],
  ['CSS is used for', 'styling web pages', 'database queries', 'server logic', 'networking'],
  ['HTML tag for a hyperlink', '<a>', '<link>', '<href>', '<url>'],
  ['HTML tag to insert an image', '<img>', '<image>', '<pic>', '<src>'],
  ['HTML tag for an unordered list', '<ul>', '<ol>', '<li>', '<list>'],
  ['CSS property to change text colour', 'color', 'font-color', 'text-color', 'fgcolor'],
  ['CSS property for background colour', 'background-color', 'bgcolor', 'color-bg', 'back-color'],
  ['Which is a JavaScript framework/library for UIs?', 'React', 'Django', 'Laravel', 'Flask'],
  ['JavaScript keyword to declare a block-scoped variable', 'let', 'var', 'dim', 'int'],
  ['Which method prints to the browser console?', 'console.log()', 'print()', 'echo()', 'System.out.println()'],
  ['HTTP status code 404 means', 'Not Found', 'OK', 'Server Error', 'Forbidden'],
  ['HTTP status code 200 means', 'OK', 'Not Found', 'Redirect', 'Unauthorized'],
  ['HTTP status code 500 means', 'Internal Server Error', 'Not Found', 'OK', 'Bad Request'],
  ['JSON stands for', 'JavaScript Object Notation', 'Java Standard Output Network', 'JavaScript Online Node', 'Joined String Object Name'],
  ['Which HTTP method is normally used to submit form data?', 'POST', 'GET only', 'PUT only', 'TRACE'],
  ['Git command to save changes to the local repository', 'git commit', 'git push', 'git save', 'git add only'],
  ['Git command to copy a remote repository', 'git clone', 'git copy', 'git pull only', 'git init'],
  ['Which is a version control system?', 'Git', 'Excel', 'Photoshop', 'Chrome'],
  // ---- Security / misc ----
  ['Phishing is', 'tricking users to reveal sensitive information', 'a type of hardware', 'a sorting method', 'a network cable'],
  ['A strong password should have', 'mix of letters, numbers and symbols', 'only your name', 'only digits', 'your birth date'],
  ['Malware that demands money to unlock files', 'Ransomware', 'Adware', 'Spyware', 'Firmware'],
  ['HTTPS uses which protocol for encryption?', 'TLS/SSL', 'FTP', 'SMTP', 'ARP'],
  ['Full form of URL', 'Uniform Resource Locator', 'Universal Routing Link', 'Uniform Remote Login', 'Unique Resource Location'],
  ['Cloud service model where you get ready software over the internet', 'SaaS', 'IaaS', 'PaaS', 'DaaS'],
  ['MS Excel formula to add a range A1 to A10', '=SUM(A1:A10)', '=ADD(A1:A10)', '=TOTAL(A1-A10)', 'SUM A1 to A10'],
  ['Shortcut to copy in Windows', 'Ctrl + C', 'Ctrl + V', 'Ctrl + X', 'Ctrl + Z'],
  ['Shortcut to undo in Windows', 'Ctrl + Z', 'Ctrl + Y', 'Ctrl + U', 'Ctrl + A'],
];

const toBase = (n: number, b: number) => n.toString(b).toUpperCase();

export const CSE_QUESTIONS: PlacementMcq[] = [
  ...fromRows('cse-t', 401, C, ROWS),
  ...generate('cse-d2b', 402, 108, (r, id) => {
    const n = r.int(5, 255);
    const ans = toBase(n, 2);
    return mcq(r, id, C, `Binary equivalent of decimal ${n}?`, ans, [toBase(n + 1, 2), toBase(n - 1, 2), toBase(n ^ 2, 2)], `Divide by 2 repeatedly and read remainders upward: ${n} = ${ans} (base 2)`);
  }),
  ...generate('cse-b2d', 403, 108, (r, id) => {
    const n = r.int(5, 255);
    return mcq(r, id, C, `Decimal value of binary ${toBase(n, 2)}?`, String(n), [String(n + 1), String(n - 1), String(n + 2)], `Sum of place values (powers of 2) = ${n}`);
  }),
  ...generate('cse-d2h', 404, 90, (r, id) => {
    const n = r.int(16, 4095);
    const ans = toBase(n, 16);
    return mcq(r, id, C, `Hexadecimal equivalent of decimal ${n}?`, ans, [toBase(n + 1, 16), toBase(n + 16, 16), toBase(n - 1, 16)], `Divide by 16 repeatedly: ${n} = ${ans} (hex)`);
  }),
  ...generate('cse-h2d', 405, 72, (r, id) => {
    const n = r.int(16, 4095);
    return mcq(r, id, C, `Decimal value of hexadecimal ${toBase(n, 16)}?`, String(n), [String(n + 1), String(n + 16), String(n - 1)], `Sum of digit x 16^position = ${n}`);
  }),
  ...generate('cse-d2o', 406, 72, (r, id) => {
    const n = r.int(8, 511);
    const ans = toBase(n, 8);
    return mcq(r, id, C, `Octal equivalent of decimal ${n}?`, ans, [toBase(n + 1, 8), toBase(n - 1, 8), toBase(n + 8, 8)], `Divide by 8 repeatedly: ${n} = ${ans} (octal)`);
  }),
  ...generate('cse-mem', 407, 64, (r, id) => {
    const units = [['KB', 'bytes', 1024], ['MB', 'KB', 1024], ['GB', 'MB', 1024], ['byte', 'bits', 8]] as const;
    const [big, small, f] = r.pick(units);
    const n = r.int(2, 64);
    return mcq(r, id, C, `${n} ${big} = how many ${small}?`, String(n * f), [String(n * 1000), String(n * f + f), String(n * (f / 2))], `1 ${big} = ${f} ${small}; ${n} x ${f} = ${n * f}`);
  }),
];
