import type { OldAnswerKey } from '../../pdf';

// Model answers for the board papers of Programming in C (CSE III Sem) in programming-in-c-board-papers.pdf.
// Answers that repeat in a later paper point back to the first full answer.
type Parts = OldAnswerKey['parts'];

const C1: Parts = [
  { title: 'Paper 1 (Examination 2019-20 Winter, code 3014, 80 marks, pages 1–2) – Section A  (any ten True/False, 1 mark each)', items: [
    ['1. Prototypes of getch() and scanf() belong to the same header file.', 'False (getch – conio.h, scanf – stdio.h)'],
    ['2. Prototype of sqrt() is defined in <stdlib.h>.', 'False (it is in <math.h>)'],
    ['3. A two-dimensional array is a collection of one-dimensional arrays.', 'True'],
    ['4. C is a low-level language because a compiler is required to compile its program.', 'False (C is a middle-level / high-level language; every high-level language needs a compiler or interpreter)'],
    ['5. if-else statements cannot be nested because they are control statements.', 'False (nested if-else is allowed)'],
    ['6. In C, struct is a keyword but union is not.', 'False (both are keywords)'],
    ['7. Scope of the auto storage class is only within the function (block).', 'True'],
    ['8. do-while loop executes at least once.', 'True'],
    ['9. FILE is a macro defined in <stdio.h>.', 'False – FILE is a structure type (typedef) declared in <stdio.h>, not a macro'],
    ['10. Loop while (1) { ; } will be executed only once.', 'False (it is an infinite loop)'],
    ['11. A variable defined within a function as static preserves its value until the next function call.', 'True'],
    ['12. fopen() returns −1 when the specified file is not found.', 'False (it returns NULL)'],
  ] },
  { title: 'Paper 1 – Section B  (any five, 6 marks each)', items: [
    ['13. Define control statements. Write the syntax of any four control statements.', 'Statements that change the normal sequential flow of a program (decision, loop, jump).\nif (cond) { … } else { … }\nswitch (expr) { case c1: …; break; default: …; }\nfor (init; cond; update) { … }\nwhile (cond) { … }\ndo { … } while (cond);\nbreak; continue; goto label;'],
    ['14. Define array. Write the advantages of an array.', 'An array is a collection of a fixed number of elements of the same data type stored in contiguous memory under one name and accessed by index: int a[10];\nAdvantages: stores many values with one name, random access by index (a[i]), easy traversal with loops, easy sorting/searching, matrices with 2-D arrays, less code.\n(Limitation: fixed size, same type only.)'],
    ['15. Program to verify that a given integer is non-negative.', '#include <stdio.h>\nint main() {\n  int n;\n  printf("Enter an integer: ");\n  scanf("%d", &n);\n  if (n >= 0) printf("%d is non-negative", n);\n  else printf("%d is negative", n);\n  return 0;\n}'],
    ['16. Define structure. Two advantages and disadvantages of structure over array.', 'A structure is a user-defined type grouping variables of different types: struct student { int roll; char name[20]; float marks; };\nAdvantages: can hold different data types together (a complete record); members accessed by meaningful names; can be passed/assigned as a whole.\nDisadvantages: members cannot be accessed by index in a loop; more memory per item (padding); no direct arithmetic on the whole structure; slower to process many similar items than an array.'],
    ['17. Define loop. Write its types and the syntax of the for loop.', 'A loop repeats a block of statements while a condition is true.\nTypes: entry-controlled (for, while) and exit-controlled (do-while); also counter-controlled and sentinel-controlled; nested loops.\nfor (initialisation; condition; increment/decrement) { statements; }\nExample: for (i = 1; i <= 10; i++) printf("%d ", i);'],
    ['18. Program to find the value of 3x² + 5x + 7 where x is an integer.', '#include <stdio.h>\nint main() {\n  int x, y;\n  printf("Enter x: ");\n  scanf("%d", &x);\n  y = 3 * x * x + 5 * x + 7;\n  printf("Value = %d", y);\n  return 0;\n}\nExample: x = 2 → 12 + 10 + 7 = 29'],
    ['19. Define function. Write a function to find the sum of two positive integers.', 'A function is a named, self-contained block of code that does a specific task and can be called many times.\nint sum(int a, int b) { return a + b; }\nint main() { int x, y; scanf("%d %d", &x, &y); if (x > 0 && y > 0) printf("Sum = %d", sum(x, y)); else printf("Enter positive numbers"); return 0; }'],
  ] },
  { title: 'Paper 1 – Section C  (any five, 8 marks each)', items: [
    ['20. Define keywords. Write any 8 keywords of C.', 'Keywords are reserved words with a fixed meaning for the compiler; they cannot be used as identifiers. C has 32 keywords.\nauto, break, case, char, const, continue, default, do, double, else, enum, extern, float, for, goto, if, int, long, register, return, short, signed, sizeof, static, struct, switch, typedef, union, unsigned, void, volatile, while.'],
    ['21. Define main() function. Program to find the sum of any 10 successive natural numbers.', 'main() is the function from which execution of every C program starts; it is called by the operating system; it returns int (0 = success) and may take command-line arguments (argc, argv).\n#include <stdio.h>\nint main() {\n  int start, i, sum = 0;\n  printf("Enter the first number: ");\n  scanf("%d", &start);\n  for (i = start; i < start + 10; i++) sum += i;\n  printf("Sum = %d", sum);\n  return 0;\n}\nFrom 1: sum = 55.'],
    ['22. Define data types. Write any 5 data types of C with their format specifiers and sizes.', 'A data type tells the compiler what kind of value a variable holds, how much memory it needs and which operations are allowed.\nchar – %c – 1 byte;  int – %d – 2 or 4 bytes;  float – %f – 4 bytes;  double – %lf – 8 bytes;  long int – %ld – 4/8 bytes;  short int – %hd – 2 bytes;  unsigned int – %u – 2/4 bytes;  long double – %Lf – 10/16 bytes.\nAlso derived (array, pointer, function), user-defined (struct, union, enum) and void.'],
    ['23. Define file. Program to read the contents of a given text file.', 'A file is a named collection of data stored permanently on secondary storage; in C it is handled through a FILE pointer.\n#include <stdio.h>\nint main() {\n  FILE *fp; char ch;\n  fp = fopen("data.txt", "r");\n  if (fp == NULL) { printf("File not found"); return 1; }\n  while ((ch = fgetc(fp)) != EOF) putchar(ch);\n  fclose(fp);\n  return 0;\n}'],
    ['24. Define nested loop. Program to print the elements of a 2-D integer array using a while loop.', 'A loop inside another loop; the inner loop completes all its iterations for each iteration of the outer loop.\nint a[2][3] = {{1, 2, 3}, {4, 5, 6}}, i = 0, j;\nwhile (i < 2) {\n  j = 0;\n  while (j < 3) { printf("%d ", a[i][j]); j++; }\n  printf("\\n");\n  i++;\n}'],
    ['25. Define pointer. Advantages and disadvantages of pointers. Why is the size of a pointer the same for every data type?', 'A pointer is a variable that stores the address of another variable: int x = 5, *p = &x;\nAdvantages: call by reference, dynamic memory allocation (malloc), efficient arrays and strings, linked data structures (lists, trees), returning many values, faster access.\nDisadvantages: hard to understand, uninitialised/dangling pointers cause crashes, memory leaks, security bugs.\nSize is the same because every pointer only stores a memory address, and the size of an address depends on the machine (2 bytes on 16-bit, 4 on 32-bit, 8 on 64-bit), not on the type pointed to.'],
    ['26. Program in C to swap two characters using pointers.', '#include <stdio.h>\nvoid swap(char *a, char *b) { char t = *a; *a = *b; *b = t; }\nint main() {\n  char x = \'A\', y = \'B\';\n  swap(&x, &y);\n  printf("x = %c, y = %c", x, y);   /* x = B, y = A */\n  return 0;\n}'],
  ] },
];

const C2: Parts = [
  { title: 'Paper 2 (code 053006/2, 70 marks, pages 3–4) – Section A  (any ten, 1 mark each)', items: [
    ['1. Who is the father of C language?', 'Dennis Ritchie (Bell Laboratories, 1972)'],
    ['2. Variable names cannot start with a digit.', 'True'],
    ['3. int $my-num = 1000; is a valid C expression.', 'False (a hyphen is not allowed in an identifier; $ is not standard C)'],
    ['4. volatile can be used as a variable name in C.', 'False (volatile is a keyword)'],
    ['5. What is the result of a logical or relational expression in C?', 'An int: 1 if true, 0 if false'],
    ['6. Functions can return enumeration constants in C.', 'True'],
    ['7. static static int a; is a correct statement in C.', 'False (duplicate storage-class specifier – compile error)'],
    ['8. #include <stdio.h> is a ........ directive.', 'preprocessor (file-inclusion)'],
    ['9. The C preprocessor directives are specified with the ........ symbol.', '# (hash)'],
    ['10. scanf() is a predefined function in the ........ header file.', 'stdio.h'],
    ['11. A char variable takes ........ byte of memory in C.', '1'],
    ['12. A float variable occupies 2 bytes of memory in C.', 'False (4 bytes)'],
  ] },
  { title: 'Paper 2 – Section B  (any five, 5 marks each)', items: [
    ['13. Design a flowchart to calculate the area of a circle.', 'Oval START → parallelogram "Read r" → rectangle "area = 3.14 × r × r" → parallelogram "Print area" → oval STOP, joined by arrows.\n(Credit: correct symbols – terminal, input/output, process – and flow lines.)'],
    ['14. Difference between a compiler and an interpreter.', 'Compiler: translates the whole program at once into machine code (object/executable file); lists all errors after compilation; program runs fast; needs more memory; C, C++.\nInterpreter: translates and executes line by line; stops at the first error; no object file, slower execution; easier debugging; Python, BASIC.'],
    ['15. Explain the different types of operators in C.', 'Arithmetic + − * / %;  relational < > <= >= == !=;  logical && || !;  assignment = += −= *= /=;  increment/decrement ++ −−;  bitwise & | ^ ~ << >>;  conditional (ternary) ?:;  special – sizeof, comma (,), address &, pointer *, member . and ->.\nExample: c = (a > b) ? a : b;'],
    ['16. What do you understand by formatted input/output?', 'Reading and printing data in a required format using format specifiers.\nprintf("format string", list) – e.g. printf("%5d %8.2f %s", n, x, name);  width and precision control the layout.\nscanf("format string", &list) – e.g. scanf("%d %f", &a, &b);\nSpecifiers: %d, %f, %c, %s, %ld, %lf, %x, %o, %u; escape sequences \\n, \\t.\nUnformatted I/O: getchar(), putchar(), gets(), puts().'],
    ['17. Output of: int x = 10; if (x > 5) { printf("x is greater than 5"); } else { printf("x is less than or equal to 5"); }', 'x is greater than 5\n(because 10 > 5 is true, the if block runs).'],
    ['18. What do you understand by array?', 'See Paper 1, Q.14: a fixed-size collection of same-type elements in contiguous memory accessed by an index starting at 0; declaration int marks[5]; initialisation int a[3] = {1, 2, 3}; 1-D, 2-D (int m[3][3]) and multi-dimensional arrays.'],
    ['19. What do you understand by function?', 'See Paper 1, Q.19: a named block of code doing one task; parts – prototype (int add(int, int);), definition, call (s = add(2, 3);), return value; library functions (printf, sqrt) and user-defined functions; benefits – reuse, modular programs, easy debugging.'],
  ] },
  { title: 'Paper 2 – Section C  (any five, 7 marks each)', items: [
    ['20. Difference between union and structure.', 'Keyword: struct / union.\nMemory: a structure gives separate memory to every member (size ≥ sum of members); a union shares one memory location among all members (size = largest member).\nAccess: all structure members can hold values at the same time; only one union member is valid at a time.\nUse: structure – records (student details); union – saving memory, variant data (e.g. one of int/float/char).\nExample: struct s { int a; char b; }; → about 8 bytes; union u { int a; char b; }; → 4 bytes.'],
    ['21. Difference between call by value and call by reference.', 'Call by value: a copy of the actual argument is passed; changes inside the function do not affect the caller; safer; e.g. void f(int x).\nCall by reference: the address of the argument is passed using pointers; the function can change the caller\'s variable; used to return many values, for large data; e.g. void swap(int *a, int *b) { int t = *a; *a = *b; *b = t; } called as swap(&x, &y).'],
    ['22. C program to create a file and write data into it.', '#include <stdio.h>\nint main() {\n  FILE *fp; char text[100];\n  fp = fopen("student.txt", "w");\n  if (fp == NULL) { printf("Cannot create file"); return 1; }\n  printf("Enter text: ");\n  fgets(text, sizeof text, stdin);\n  fprintf(fp, "%s", text);     /* or fputs(text, fp); */\n  fclose(fp);\n  printf("Data written to file");\n  return 0;\n}'],
    ['23. Difference between while and do-while loops.', 'while: entry-controlled – condition is checked first; body may run zero times; syntax while (cond) { … }\ndo-while: exit-controlled – body runs first and then the condition is checked; runs at least once; syntax do { … } while (cond);  (semicolon at the end).\nExample: i = 10; while (i < 5) {…} runs 0 times, do {…} while (i < 5); runs once.'],
    ['24. Write any 7 string manipulation functions.', 'From <string.h>:\nstrlen(s) – length;  strcpy(d, s) – copy;  strncpy(d, s, n);  strcat(d, s) – join;  strcmp(a, b) – compare (0 if equal);  strchr(s, c) – find a character;  strstr(s, t) – find a substring;  strrev(s) – reverse;  strupr(s) / strlwr(s) – change case (Turbo C).'],
    ['25. Write any 7 keywords used in C language.', 'int, float, char, if, else, for, while, do, switch, case, break, return, struct, void (any seven). See Paper 1, Q.20.'],
    ['26. Explain the storage classes in C.', 'auto – default for local variables; stored in memory (stack); garbage initial value; scope: block; life: till the block ends.\nregister – stored in CPU register if possible (fast); scope: block; cannot take its address.\nstatic – keeps its value between function calls; initial value 0; local static – scope block, life whole program; global static – visible only in that file.\nextern – declares a global variable defined in another file/place; initial value 0; scope: whole program.'],
  ] },
];

const C3: Parts = [
  { title: 'Paper 3 (code DSE/053006/4, 70 marks, pages 5–8) – Section A  (any ten True/False, 1 mark each)', items: [
    ['1. Spaces and commas are allowed in a variable name in C.', 'False'],
    ['2. C programs are converted into machine language with the help of a C compiler.', 'True'],
    ['3. #define is known as a preprocessor compiler directive.', 'True (macro-definition directive)'],
    ['4. The ++ operator decrements the operand by 1.', 'False (it increments by 1; −− decrements)'],
    ['5. == is used for assignment of two quantities.', 'False (== compares; = assigns)'],
    ['6. The keywords of C can be used as variable names.', 'False'],
    ['7. Structure is a collection of dissimilar data types.', 'True'],
    ['8. A while loop ensures that the statements within the loop are executed at least once.', 'False (that is the do-while loop)'],
    ['9. &x gives the memory location of variable x.', 'True'],
    ['10. Algorithm is the graphical representation of logic.', 'False (a flowchart is the graphical representation; an algorithm is written in steps)'],
    ['11. The continue keyword skips one iteration of a loop.', 'True'],
    ['12. A switch statement can have any number of case instances.', 'True'],
  ] },
  { title: 'Paper 3 – Section B  (any five, 5 marks each)', items: [
    ['13. Explain the role of global, static, register and local variables.', 'Local: declared inside a function/block; visible and alive only there; garbage initial value.\nGlobal: declared outside all functions; visible to every function after its declaration; alive for the whole program; initial value 0; used for shared data.\nStatic: keeps its value between calls (local static) or limits a global to its file; initialised once, default 0.\nRegister: local variable kept in a CPU register for fast access (loop counters); its address cannot be taken.\nSee also Paper 2, Q.26.'],
    ['14. Define loop. Explain the for statement with an example.', 'See Paper 1, Q.17.\nfor (i = 1; i <= 5; i++) printf("%d ", i * i);  → 1 4 9 16 25\nAll three parts are optional: for (;;) is an infinite loop.'],
    ['15. Describe array and string.', 'Array: see Paper 1, Q.14.\nString: a character array ending with the null character \'\\0\': char name[10] = "Ravi"; read with scanf("%s", name) or fgets; printed with printf("%s") or puts; handled with string.h functions (see Paper 2, Q.24).'],
    ['16. What is a function? Explain call by value and call by reference.', 'See Paper 1, Q.19 and Paper 2, Q.21.'],
    ['17. Explain a pointer-type variable with an example.', 'A pointer holds the address of another variable of a given type.\nint x = 10;  int *p;  p = &x;\nprintf("%d", *p);   /* 10 – value at address */\n*p = 20;            /* now x = 20 */\n& gives the address, * (dereference) gives the value at that address; pointers are used with arrays (p = a; *(p + i) is a[i]), strings, functions and dynamic memory. See also Paper 1, Q.25.'],
    ['18. What do you understand by user-defined data types?', 'Types created by the programmer from basic types:\nstruct – groups different types (struct book { char t[30]; float price; };)\nunion – members share memory\nenum – named integer constants (enum day { MON, TUE };)\ntypedef – new name for an existing type (typedef unsigned int uint;).'],
    ['19. C program for adding two numbers and printing the result.', '#include <stdio.h>\nint main() {\n  int a, b, sum;\n  printf("Enter two numbers: ");\n  scanf("%d %d", &a, &b);\n  sum = a + b;\n  printf("Sum = %d", sum);\n  return 0;\n}'],
  ] },
  { title: 'Paper 3 – Section C  (any five, 7 marks each)', items: [
    ['20. What is an operator? Describe all types of C operators.', 'An operator is a symbol that tells the compiler to perform an operation on operands. Types: see Paper 2, Q.15 (arithmetic, relational, logical, assignment, increment/decrement, bitwise, conditional, special) with one example each and the idea of precedence (* / % before + −) and associativity.'],
    ['21. How is a two-dimensional array defined? Explain with an example.', 'Syntax: type name[rows][columns];  int m[3][3];\nInitialisation: int m[2][3] = { {1, 2, 3}, {4, 5, 6} };  stored row by row (row-major).\nAccess: m[i][j] with nested loops:\nfor (i = 0; i < 2; i++) { for (j = 0; j < 3; j++) printf("%d ", m[i][j]); printf("\\n"); }\nUses: matrices, tables (e.g. adding two matrices c[i][j] = a[i][j] + b[i][j]).'],
    ['22. Define structure. Rules for declaring a structure and accessing its members, with a program.', 'Structure: see Paper 1, Q.16.\nRules: keyword struct, a tag name, members in { } ending with ; after the closing brace; members may be of any type; declaring the structure does not reserve memory – variables do; access members with the dot operator (s.roll), or -> with a pointer (p->roll).\n#include <stdio.h>\nstruct student { int roll; char name[20]; float marks; };\nint main() {\n  struct student s;\n  scanf("%d %s %f", &s.roll, s.name, &s.marks);\n  printf("%d %s %.2f", s.roll, s.name, s.marks);\n  return 0;\n}'],
    ['23. C program to generate the table of any given number.', '#include <stdio.h>\nint main() {\n  int n, i;\n  printf("Enter a number: ");\n  scanf("%d", &n);\n  for (i = 1; i <= 10; i++) printf("%d x %d = %d\\n", n, i, n * i);\n  return 0;\n}'],
    ['24. Formatted input and output statements with examples.', 'See Paper 2, Q.16.\nExample: printf("Roll: %4d  Marks: %6.2f\\n", roll, marks);  scanf("%d %f", &roll, &marks);  %-10s left-justifies a string in 10 columns.'],
    ['25. Differentiate between array and structure.', 'Array: elements of the same type; accessed by index a[i]; declared int a[10]; contiguous memory of n × size; cannot hold a mixed record.\nStructure: members of different types; accessed by name s.member; declared with struct; size ≥ sum of members (padding); holds a complete record; an array of structures combines both.'],
    ['26. Short notes on any two: (i) files in C (ii) data types (iii) recursion (iv) conditional statements', '(i) Files: FILE *fp = fopen("a.txt", "r" / "w" / "a"); functions fprintf, fscanf, fgetc, fputc, fgets, fputs, fread, fwrite, fseek, fclose; check fp == NULL. (See Paper 1, Q.23.)\n(ii) Data types: see Paper 1, Q.22.\n(iii) Recursion: a function calling itself with a smaller problem and a base case; long fact(int n) { return n <= 1 ? 1 : n * fact(n − 1); } – uses the stack; used for factorial, Fibonacci, Tower of Hanoi.\n(iv) Conditional statements: if, if-else, nested if, else-if ladder and switch – they choose which statements run depending on a condition; e.g. if (m >= 33) printf("Pass"); else printf("Fail");'],
  ] },
];

const C4: Parts = [
  { title: 'Paper 4 (code DSE/053006/4, 70 marks, pages 9–12) – Section A  (any ten, 1 mark each)', items: [
    ['1. Size of double in bytes is ........ .', '8'],
    ['2. A ........ is a pictorial representation of a sequence of instructions required to solve a problem.', 'flowchart'],
    ['3. The equality checking operator in C is ........ .', '=='],
    ['4. The conditional operator is also called the ........ operator as it operates on three operands.', 'ternary (?:)'],
    ['5. Which header file is required for file I/O operations?', '<stdio.h>'],
    ['6. What is the base data type of a pointer variable by which memory would be allocated to it?', 'The data type of the variable it points to (int *p points to int); the pointer itself only stores an address. A void * pointer has no base type.'],
    ['7. A function which calls itself is called a ........ function.', 'recursive'],
    ['8. An array of characters is called ........ .', 'a string'],
    ['9. Syntax for a two-dimensional array ........ .', 'data_type array_name[rows][columns];  e.g. int a[3][4];'],
    ['10. An array is a collection of similar data types.', 'True'],
    ['11. The type of a variable determines what kind of values it may take on.', 'True'],
    ['12. The standard C functions are grouped into header files.', 'True'],
  ] },
  { title: 'Paper 4 – Section B  (any five, 5 marks each)', items: [
    ['13. What is an algorithm? Write an algorithm to convert degree Celsius to Fahrenheit.', 'An algorithm is a finite sequence of clear, step-by-step instructions to solve a problem; it has input, output, definiteness, finiteness and effectiveness.\nStep 1: Start.  Step 2: Read C.  Step 3: F = (9 × C / 5) + 32.  Step 4: Print F.  Step 5: Stop.\nExample: C = 100 → F = 212.'],
    ['14. Differentiate between high-level and low-level languages.', 'High-level (C, Java, Python): English-like, easy to write and debug, machine independent (portable), needs a compiler/interpreter, slower and less direct hardware control.\nLow-level (machine language, assembly): close to hardware (binary or mnemonics), hard to write, machine dependent, very fast, direct hardware control; assembly needs an assembler.'],
    ['15. Define implicit type casting with an example.', 'Automatic conversion of one data type into another by the compiler, usually from a smaller to a larger type, when different types are mixed in an expression (type promotion).\nint i = 5; float f = 2.5; float r = i + f;   /* i is converted to 5.0, r = 7.5 */\nchar c = \'A\'; int n = c + 1;               /* c becomes 65, n = 66 */\n(Explicit casting: (float) a / b.)'],
    ['16. Program in C to find the factorial of a number.', '#include <stdio.h>\nint main() {\n  int n, i; long fact = 1;\n  printf("Enter a number: ");\n  scanf("%d", &n);\n  for (i = 1; i <= n; i++) fact = fact * i;\n  printf("Factorial = %ld", fact);\n  return 0;\n}\nn = 5 → 120'],
    ['17. Why do we need file handling in C?', 'Data in variables is lost when the program ends; files store data permanently on disk. File handling lets a program save and read large amounts of data, reuse input without typing it again, share data between programs, keep records (students, accounts), and create reports/logs. Done with FILE *, fopen, fprintf/fscanf, fread/fwrite, fclose.'],
    ['18. Differences between structures and arrays.', 'See Paper 3, Q.25.'],
    ['19. Short note on (a) compiler (b) interpreter.', 'See Paper 2, Q.14.'],
  ] },
  { title: 'Paper 4 – Section C  (any five, 7 marks each)', items: [
    ['20. Program to enter marks of five subjects and find their sum, average and percentage.', '#include <stdio.h>\nint main() {\n  float m[5], sum = 0, avg, per;\n  int i;\n  for (i = 0; i < 5; i++) { printf("Marks of subject %d: ", i + 1); scanf("%f", &m[i]); sum += m[i]; }\n  avg = sum / 5;\n  per = (sum / 500) * 100;      /* each subject out of 100 */\n  printf("Sum = %.2f  Average = %.2f  Percentage = %.2f%%", sum, avg, per);\n  return 0;\n}'],
    ['21. Short notes: (a) operator precedence and associativity (b) formatted input and output', '(a) Precedence decides which operator is evaluated first when an expression has several operators; associativity decides the order for operators of equal precedence.\nHigh to low: () [] -> .  →  unary ! ~ ++ −− (type) sizeof (right to left)  →  * / %  →  + −  →  << >>  →  < <= > >=  →  == !=  →  &  →  ^  →  |  →  &&  →  ||  →  ?: (right to left)  →  = += −= … (right to left)  →  , (comma).\nExample: 2 + 3 * 4 = 14;  a = b = 5 assigns right to left.\n(b) See Paper 2, Q.16.'],
    ['22. Program in C to read from a file.', 'See Paper 1, Q.23 (fopen in "r" mode, read with fgetc until EOF – or fgets line by line – then fclose).'],
    ['23. What is a function? Explain user-defined functions in C.', 'See Paper 1, Q.19.\nUser-defined function elements: prototype (return_type name(parameter types);), definition (header + body), call, return statement.\nCategories: no arguments and no return value; arguments but no return value; no arguments but a return value; arguments and a return value – one small example of each, e.g. int square(int x) { return x * x; }.'],
    ['24. Explain character arrays. Program to compare whether two strings are equal or not.', 'A character array stores a string – a sequence of characters ending with \'\\0\'; char s[20] = "hello"; size must allow one extra place for \'\\0\'.\n#include <stdio.h>\n#include <string.h>\nint main() {\n  char a[50], b[50];\n  printf("Enter two strings: ");\n  scanf("%s %s", a, b);\n  if (strcmp(a, b) == 0) printf("Strings are equal");\n  else printf("Strings are not equal");\n  return 0;\n}'],
    ['25. Explain switch case with a program.', 'switch tests one integer/char expression against many constant case labels; break ends each case; default runs when no case matches; fall-through happens without break.\n#include <stdio.h>\nint main() {\n  int day;\n  scanf("%d", &day);\n  switch (day) {\n    case 1: printf("Monday"); break;\n    case 2: printf("Tuesday"); break;\n    case 3: printf("Wednesday"); break;\n    default: printf("Other day");\n  }\n  return 0;\n}'],
    ['26. Program to create a Fibonacci series with n terms.', '#include <stdio.h>\nint main() {\n  int n, i, a = 0, b = 1, c;\n  printf("Enter number of terms: ");\n  scanf("%d", &n);\n  for (i = 1; i <= n; i++) { printf("%d ", a); c = a + b; a = b; b = c; }\n  return 0;\n}\nn = 7 → 0 1 1 2 3 5 8'],
  ] },
];

const C5: Parts = [
  { title: 'Paper 5 (code DSE/3014/2017(S)/4, 80 marks, pages 13–16) – Section A  (any ten, 1 mark each)', items: [
    ['1. An algorithm must be terminated in ........ time.', 'finite'],
    ['2. printf() function returns ........ value.', 'an integer (the number of characters printed)'],
    ['3. Header files contain ........ definitions and ........ of functions.', 'macro (and constant/type) definitions and prototypes (declarations) of functions'],
    ['4. do-while loop executes ........ once.', 'at least'],
    ['5. A recursive function terminates in its ........ condition.', 'base (terminating)'],
    ['6. In the case of a 1-D array, a[2] and 2[a] are ........ .', 'the same (both mean *(a + 2))'],
    ['7. float *ptr = NULL; size of ptr will be ........ bytes.', 'the size of an address: 2 bytes in 16-bit Turbo C, 4 bytes on 32-bit, 8 bytes on 64-bit (not the size of float)'],
    ['8. char Ch[n] and char *str, with Ch[n − 1] = \'\\0\'. Both Ch and str represent a ........ .', 'string'],
    ['9. Maximum and minimum values of an int variable are ........ and ........ .', '32767 and −32768 for a 2-byte int (2147483647 and −2147483648 for a 4-byte int)'],
    ['10. A static local variable preserves its value till the next ........ .', 'function call'],
    ['11. gets() function is used to input a ........ .', 'string (a line of text with spaces)'],
    ['12. malloc() is a ........ allocation function.', 'dynamic memory'],
  ] },
  { title: 'Paper 5 – Section B  (any five, 6 marks each)', items: [
    ['13. Define header file. Write the names of any five header files used in C.', 'A header file (.h) contains function prototypes, macro definitions, constants and type declarations that can be included in a program with #include.\n<stdio.h> – input/output;  <conio.h> – console I/O (clrscr, getch);  <math.h> – maths (sqrt, pow);  <string.h> – strings;  <stdlib.h> – malloc, exit, atoi;  <ctype.h> – character tests;  <time.h> – date and time.'],
    ['14. Define decision-making statements. Advantages and syntax of if-else.', 'Statements that select which block of code runs depending on a condition (if, if-else, nested if, else-if ladder, switch).\nif (condition) { statements if true; } else { statements if false; }\nAdvantages: program can take decisions, handles two alternatives clearly, can be nested for many conditions, makes programs flexible (e.g. pass/fail, even/odd).'],
    ['15. Define algorithm. Algorithm to add two natural numbers.', 'See Paper 4, Q.13 for the definition.\nStep 1: Start.  Step 2: Read a, b.  Step 3: If a ≤ 0 or b ≤ 0, print "not natural numbers" and go to Step 6.  Step 4: sum = a + b.  Step 5: Print sum.  Step 6: Stop.'],
    ['16. Define function. Advantages of call by reference over call by value.', 'Function: see Paper 1, Q.19.\nAdvantages of call by reference: the function can change the caller\'s variables (swap); more than one value can be returned; large data (arrays, structures) is not copied – saves time and memory; arrays are always passed this way.'],
    ['17. Define array. Its types with examples; declaration statements for 2-D and 3-D arrays.', 'See Paper 1, Q.14.\nTypes: one-dimensional int a[10];  two-dimensional int m[3][4];  multi-dimensional (3-D) int t[2][3][4];\nExample: float marks[5] = {70, 65, 80, 75, 90};  int box[2][2][2];'],
    ['18. Define pointer. Function in C to swap two integers.', 'See Paper 3, Q.17.\nvoid swap(int *a, int *b) { int t = *a; *a = *b; *b = t; }\nCall: swap(&x, &y);'],
    ['19. Define structure. Syntax for structure and union definitions.', 'See Paper 1, Q.16.\nstruct tag { type member1; type member2; … };  struct tag var;\nunion tag { type member1; type member2; … };  union tag var;\nExample: struct emp { int id; float sal; };  union val { int i; float f; };  (difference: see Paper 2, Q.20)'],
  ] },
  { title: 'Paper 5 – Section C  (any five, 8 marks each)', items: [
    ['20. Define flowchart. Draw a flowchart to find the greatest of three numbers.', 'A flowchart is a diagram of the steps of an algorithm using standard symbols: oval (start/stop), parallelogram (input/output), rectangle (process), diamond (decision), arrows (flow).\nStart → Read a, b, c → diamond "a > b?" – Yes → diamond "a > c?" (Yes → print a; No → print c); No → diamond "b > c?" (Yes → print b; No → print c) → Stop.'],
    ['21. Define recursive function. Program to add the elements of an array using a recursive function.', 'A function that calls itself, with a base condition that stops the calls.\n#include <stdio.h>\nint sum(int a[], int n) { if (n == 0) return 0; return a[n − 1] + sum(a, n − 1); }\nint main() {\n  int a[5] = {2, 4, 6, 8, 10};\n  printf("Sum = %d", sum(a, 5));   /* 30 */\n  return 0;\n}'],
    ['22. Define storage classes and explain them with examples.', 'A storage class tells where a variable is stored, its default value, scope and lifetime. auto, register, static, extern – see Paper 2, Q.26.\nExamples: auto int i; register int c; static int count = 0; (in a function, counts calls); extern int total; (declared in another file).'],
    ['23. What do these declarations stand for: (a) int (*p)[10] (b) int *(p[10]) (c) int (*p)(void) (d) float *(*ptr)(int *)', '(a) p is a pointer to an array of 10 integers.\n(b) p is an array of 10 pointers to int.\n(c) p is a pointer to a function that takes no arguments and returns an int.\n(d) ptr is a pointer to a function that takes a pointer to int as argument and returns a pointer to float.'],
    ['24. Output of the program with #define print(x) printf("%d", x), global int x = 10, fun(int t) { t = t + x; print(t); }, and main() { int x = 20; fun(x); }', 'Output: 30\nmain passes its local x (20) to fun; inside fun the x refers to the global x (10), so t = 20 + 10 = 30 and print(t) expands to printf("%d", t).'],
    ['25. G(n) = 1 + G(n − 1) + G(n − 2), G(0) = 0, G(1) = 1. Write a function in C to find G(n).', 'int G(int n) {\n  if (n == 0) return 0;\n  if (n == 1) return 1;\n  return 1 + G(n − 1) + G(n − 2);\n}\nValues: G(2) = 2, G(3) = 4, G(4) = 7, G(5) = 12.\n(An iterative version with two variables avoids repeated calls.)'],
    ['26. Program in C to read the contents of a text file using fread().', '#include <stdio.h>\nint main() {\n  FILE *fp; char buf[100]; size_t n;\n  fp = fopen("data.txt", "rb");\n  if (fp == NULL) { printf("File not found"); return 1; }\n  while ((n = fread(buf, 1, sizeof buf, fp)) > 0) fwrite(buf, 1, n, stdout);\n  fclose(fp);\n  return 0;\n}\nfread(ptr, size, count, fp) returns the number of items read.'],
    ['27. Define library function. Prototypes of printf(), clrscr(), getch(), gets(), malloc(), getche().', 'Library functions are ready-made functions supplied with the compiler, declared in header files.\nint printf(const char *format, …);   /* stdio.h */\nvoid clrscr(void);                   /* conio.h */\nint getch(void);                     /* conio.h */\nchar *gets(char *s);                 /* stdio.h (unsafe – fgets is preferred) */\nvoid *malloc(size_t size);           /* stdlib.h */\nint getche(void);                    /* conio.h – echoes the key */'],
  ] },
];

export const C_PAPERS: OldAnswerKey = { parts: [...C1, ...C2, ...C3, ...C4, ...C5] };
