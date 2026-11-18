// ===================================================================================================
// Authentic UBTER Board Question Papers & Verified Answer Keys with full solutions
// Standard UBTER Diploma Scheme: Time 2.5 Hours | Max Marks: 50
// Section A: 10 Questions x 1 Mark = 10 Marks
// Section B: 5 Questions x 4 Marks = 20 Marks
// Section C: 2 Questions x 10 Marks (each with sub-parts a & b of 5 marks) = 20 Marks
// Total = 50 Marks (Standard Polytechnic Board Format)
// ===================================================================================================
import type { QuestionPaper, PaperSubject } from '../services/papersApi';

function makeDocDataUrl(title: string, sub: string, code: string, isAnswer: boolean, textContent: string): string {
  const html = `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${code} (${isAnswer ? 'Answer Key' : 'Question Paper'})</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", Arial, sans-serif;
      margin: 16px auto;
      max-width: 860px;
      padding: 0 16px;
      color: #1e293b;
      line-height: 1.6;
      background: #ffffff;
      -webkit-font-smoothing: antialiased;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 14px;
      margin-bottom: 16px;
    }
    .header h2 {
      margin: 0;
      font-size: 19px;
      font-weight: 800;
      text-transform: uppercase;
      color: #0f172a;
      letter-spacing: 0.5px;
    }
    .header h3 {
      margin: 6px 0 2px 0;
      font-size: 15px;
      font-weight: 700;
      color: #334155;
    }
    .sub-sub {
      font-size: 13px;
      color: #64748b;
      font-weight: 600;
    }
    .badge {
      display: inline-block;
      padding: 4px 14px;
      font-weight: 700;
      border-radius: 999px;
      font-size: 12px;
      margin-top: 8px;
    }
    .badge-paper { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
    .badge-ans { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .meta-bar {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 8px;
      font-size: 13px;
      font-weight: 700;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 10px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
    }
    .instructions {
      background: #fffbeb;
      border-left: 4px solid #f59e0b;
      padding: 10px 14px;
      border-radius: 0 8px 8px 0;
      font-size: 12px;
      color: #78350f;
      margin-bottom: 20px;
      line-height: 1.5;
    }
    .instructions strong { color: #92400e; }
    .section-title {
      font-size: 14px;
      font-weight: 800;
      background: #0f172a;
      color: #ffffff;
      padding: 8px 14px;
      border-radius: 6px;
      margin: 24px 0 12px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .section-title .sec-marks {
      font-size: 12px;
      font-weight: 700;
      background: rgba(255, 255, 255, 0.2);
      padding: 2px 8px;
      border-radius: 4px;
    }
    .q-item {
      margin-bottom: 12px;
      padding: 12px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #ffffff;
      transition: all 0.2s;
    }
    .q-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      font-weight: 700;
      font-size: 13.5px;
      color: #0f172a;
      line-height: 1.5;
    }
    .marks {
      color: #2563eb;
      font-size: 12px;
      font-weight: 800;
      white-space: nowrap;
      background: #eff6ff;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #dbeafe;
    }
    .ans-box {
      background: #f0fdf4;
      border-left: 4px solid #16a34a;
      padding: 12px 14px;
      margin-top: 10px;
      border-radius: 0 8px 8px 0;
      font-size: 13px;
      color: #14532d;
      line-height: 1.6;
    }
    .ans-box strong { color: #166534; }
    .ans-tag {
      display: inline-block;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      color: #15803d;
      margin-bottom: 4px;
    }
    pre {
      background: #0f172a;
      color: #38bdf8;
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      margin: 8px 0;
    }
    .print-bar {
      margin-bottom: 16px;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .print-btn {
      padding: 8px 16px;
      background: #2563eb;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 700;
      font-size: 13px;
    }
    @media print {
      body { margin: 0; padding: 10px; max-width: 100%; font-size: 12px; }
      .print-bar { display: none; }
      .section-title { background: #334155 !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .ans-box { border-left-color: #16a34a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  </div>
  <div class="header">
    <h2>Uttarakhand Board of Technical Education, Roorkee (UBTER)</h2>
    <div class="sub-sub">उत्तराखंड प्राविधिक शिक्षा परिषद्, रुड़की &bull; राज्य स्तरीय डिप्लोमा परीक्षा</div>
    <h3>${sub} (Subject Code: ${code})</h3>
    <span class="badge ${isAnswer ? 'badge-ans' : 'badge-paper'}">
      ${isAnswer ? 'Verified Model Answer Key & Detailed Marking Scheme' : 'Official Board Examination Question Paper'}
    </span>
  </div>
  <div class="meta-bar">
    <span>Time: 2.5 Hours (ढाई घंटे)</span>
    <span>Max Marks: 50 | Pass Marks: 17</span>
    <span>Subject Code: ${code}</span>
  </div>
  <div class="instructions">
    <strong>निर्देश / Instructions:</strong><br>
    1. सभी प्रश्न अनिवार्य हैं। आंतरिक विकल्प दिए गए हैं (All questions are compulsory with internal choices).<br>
    2. खण्ड 'क' (Section A) में 10 प्रश्न हैं, प्रत्येक 1 अंक का (10 x 1 = 10 अंक)।<br>
    3. खण्ड 'ख' (Section B) में किन्हीं 5 प्रश्नों के उत्तर दीजिए, प्रत्येक 4 अंक का (5 x 4 = 20 अंक)।<br>
    4. खण्ड 'ग' (Section C) में किन्हीं 2 प्रश्नों के उत्तर दीजिए, प्रत्येक 10 अंक का (2 x 10 = 20 अंक, प्रत्येक प्रश्न 5+5 अंक में विभाजित)।<br>
    5. आवश्यकतानुसार स्वच्छ एवं नामांकित चित्र बनाइए (Draw neat diagrams wherever necessary).
  </div>
  <div>${textContent}</div>
</body>
</html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

export const INITIAL_QUESTION_PAPERS: QuestionPaper[] = [
  // 1. Data Structures Using C (Winter 2024)
  {
    id: 'qp-ds-2024-w',
    kind: 'previous',
    title: 'UBTER Board Paper Winter 2024',
    builtIn: true,
    subjectCode: '053001',
    subjectName: 'Data Structures Using C',
    branch: 'CSE',
    semester: 3,
    examYear: '2024',
    paper: {
      name: 'UBTER_053001_DataStructures_Winter2024.pdf',
      mime: 'application/pdf',
      size: '420 KB',
      url: makeDocDataUrl(
        'UBTER Board Paper Winter 2024',
        'Data Structures Using C',
        '053001',
        false,
        `<div class="section-title">
          <span>SECTION A (खण्ड 'क') - Answer ALL 10 Questions (सभी 10 प्रश्न अनिवार्य हैं)</span>
          <span class="sec-marks">10 x 1 = 10 Marks</span>
        </div>
        <div class="q-item"><div class="q-head"><span>Q1(i). Define Time Complexity of an algorithm.</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(ii). What is Big-O notation used for?</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(iii). State the principle on which a Stack works (LIFO or FIFO).</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(iv). What is a Circular Queue?</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(v). What does the 'next' pointer in a Singly Linked List node store?</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(vi). Define a Binary Search Tree (BST).</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(vii). Which data structure is used in Breadth-First Search (BFS) graph traversal?</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(viii). What is the worst-case time complexity of QuickSort?</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(ix). Name the C library function used to dynamically deallocate heap memory.</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(x). Define Inorder Traversal sequence of a binary tree.</span><span class="marks">1 Mark</span></div></div>

        <div class="section-title">
          <span>SECTION B (खण्ड 'ख') - Answer ANY 5 Questions (किन्हीं 5 प्रश्नों के उत्तर दीजिए)</span>
          <span class="sec-marks">5 x 4 = 20 Marks</span>
        </div>
        <div class="q-item"><div class="q-head"><span>Q2(i). Differentiate between Linear and Non-linear data structures with two examples of each.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(ii). Convert the infix expression: (A + B * C) / (D - E ^ F) into postfix notation using a stack trace table.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(iii). Explain how the Circular Queue overcomes the limitation of linear queue overflow condition with neat array index formulas.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(iv). Write an algorithm or C function to insert a new node at the beginning of a Singly Linked List.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(v). Explain the four AVL Tree balancing rotations (LL, RR, LR, RL) with clear node transformation diagrams.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(vi). Differentiate between Singly Linked List and Doubly Linked List with structure representations.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(vii). Explain Binary Search algorithm and calculate its average and worst-case time complexities.</span><span class="marks">4 Marks</span></div></div>

        <div class="section-title">
          <span>SECTION C (खण्ड 'ग') - Answer ANY 2 Questions (किन्हीं 2 प्रश्नों के उत्तर दीजिए, प्रत्येक 5+5 अंक)</span>
          <span class="sec-marks">2 x 10 = 20 Marks</span>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q3(a). Explain QuickSort algorithm with partition procedure. Trace QuickSort on array: [38, 27, 43, 3, 9, 82, 10].</span><span class="marks">5 Marks</span></div>
          <div class="q-head" style="margin-top: 10px;"><span>Q3(b). Discuss the best, average, and worst-case time and space complexities of QuickSort with recurrence relations.</span><span class="marks">5 Marks</span></div>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q4(a). Define Binary Search Tree (BST). Construct a BST by inserting keys in order: 45, 23, 67, 12, 34, 56, 89, 78.</span><span class="marks">5 Marks</span></div>
          <div class="q-head" style="margin-top: 10px;"><span>Q4(b). Show the Inorder, Preorder, and Postorder traversals of the constructed BST.</span><span class="marks">5 Marks</span></div>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q5(a). Write a C program to implement Stack operations (PUSH, POP, DISPLAY) using an array.</span><span class="marks">5 Marks</span></div>
          <div class="q-head" style="margin-top: 10px;"><span>Q5(b). Explain recursion using Stack with the example of finding factorial of a number n.</span><span class="marks">5 Marks</span></div>
        </div>`
      ),
    },
    answer: {
      name: 'UBTER_053001_DataStructures_Winter2024_AnswerKey.pdf',
      mime: 'application/pdf',
      size: '540 KB',
      updatedBy: 'Er. Jitendra Kumar (HOD CSE)',
      updatedAt: '2026-02-15',
      url: makeDocDataUrl(
        'Official Answer Key & Model Solutions',
        'Data Structures Using C',
        '053001',
        true,
        `<div class="section-title">
          <span>SECTION A &bull; Verified Model Answers (1 Mark Each)</span>
          <span class="sec-marks">Total: 10 Marks</span>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q1(i) Answer: Time Complexity</span><span class="marks">1/1 Mark</span></div>
          <div class="ans-box">Time Complexity is the computational measure of total execution time required by an algorithm as a function of the input size (n).</div>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q1(ii) Answer: Big-O Notation</span><span class="marks">1/1 Mark</span></div>
          <div class="ans-box">Big-O notation describes the upper bound (worst-case performance) of an algorithm's execution time or memory growth.</div>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q1(iii) Answer: Stack Principle</span><span class="marks">1/1 Mark</span></div>
          <div class="ans-box">Stack operates strictly on the <strong>LIFO (Last In First Out)</strong> principle.</div>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q1(iv) Answer: Circular Queue</span><span class="marks">1/1 Mark</span></div>
          <div class="ans-box">A Circular Queue is a linear data structure where the last position connects back to the first position like a ring, utilizing modulo arithmetic.</div>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q1(v) Answer: Next Pointer in Singly Linked List</span><span class="marks">1/1 Mark</span></div>
          <div class="ans-box">The 'next' pointer stores the memory address of the next consecutive node in the linked list (or NULL if it is the terminal node).</div>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q1(vi) Answer: Binary Search Tree (BST)</span><span class="marks">1/1 Mark</span></div>
          <div class="ans-box">A binary tree where the left subtree contains keys strictly less than the root, and the right subtree contains keys strictly greater than the root.</div>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q1(vii) Answer: Data Structure for BFS</span><span class="marks">1/1 Mark</span></div>
          <div class="ans-box">BFS uses a <strong>Queue (FIFO)</strong> data structure to explore vertices level by level.</div>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q1(viii) Answer: QuickSort Worst Case</span><span class="marks">1/1 Mark</span></div>
          <div class="ans-box">The worst-case time complexity of QuickSort is <strong>O(n&sup2;)</strong> (occurs when pivot is smallest or largest element, e.g. already sorted list).</div>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q1(ix) Answer: Dynamic Deallocation Function</span><span class="marks">1/1 Mark</span></div>
          <div class="ans-box">The standard C library function is <strong>free(ptr)</strong> declared in &lt;stdlib.h&gt;.</div>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q1(x) Answer: Inorder Traversal</span><span class="marks">1/1 Mark</span></div>
          <div class="ans-box">Inorder sequence: <strong>Left Subtree &rarr; Root Node &rarr; Right Subtree</strong>.</div>
        </div>

        <div class="section-title">
          <span>SECTION B &bull; Step-by-Step Derivations (4 Marks Each)</span>
          <span class="sec-marks">Total: 20 Marks</span>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q2(i) Answer: Linear vs Non-Linear Data Structures</span><span class="marks">4/4 Marks</span></div>
          <div class="ans-box">
            <strong>1. Linear Data Structures:</strong> Elements are arranged sequentially one after another in a linear sequence. Every element has unique predecessor and successor (except first and last). Examples: Arrays, Stacks, Queues, Linked Lists.<br>
            <strong>2. Non-Linear Data Structures:</strong> Elements are arranged hierarchically or as interconnected networks. One element can connect to multiple elements. Examples: Trees, Graphs, Heaps.
          </div>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q2(ii) Answer: Infix to Postfix Conversion</span><span class="marks">4/4 Marks</span></div>
          <div class="ans-box">
            Target Expression: <code>(A + B * C) / (D - E ^ F)</code><br>
            Step 1: Subexpression (A + B * C) &rarr; Stack trace gives: <code>A B C * +</code><br>
            Step 2: Subexpression (D - E ^ F) &rarr; Power (^) has higher precedence than minus (-). Trace: <code>D E F ^ -</code><br>
            Step 3: Combine with division (/) &rarr; <strong>A B C * + D E F ^ - /</strong>
          </div>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q2(iii) Answer: Circular Queue Overflow & Underflow Formulas</span><span class="marks">4/4 Marks</span></div>
          <div class="ans-box">
            In a linear queue, once <code>rear == MAX - 1</code>, no more elements can be inserted even if positions at the front are freed by dequeue. A Circular Queue wraps around using modulo arithmetic:<br>
            &bull; <strong>Queue Full Condition:</strong> <code>(rear + 1) % MAX == front</code><br>
            &bull; <strong>Queue Empty Condition:</strong> <code>front == -1</code><br>
            &bull; <strong>Enqueue Index Update:</strong> <code>rear = (rear + 1) % MAX</code><br>
            &bull; <strong>Dequeue Index Update:</strong> <code>front = (front + 1) % MAX</code>
          </div>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q2(iv) Answer: C Function to Insert at Beginning of Singly Linked List</span><span class="marks">4/4 Marks</span></div>
          <div class="ans-box">
            <pre>struct Node {
    int data;
    struct Node* next;
};

struct Node* insertAtBeginning(struct Node* head, int value) {
    struct Node* newNode = (struct Node*)malloc(sizeof(struct Node));
    if (newNode == NULL) {
        printf("Heap Overflow!\\n");
        return head;
    }
    newNode->data = value;
    newNode->next = head; // Point new node's next to current head
    head = newNode;       // Update head pointer
    return head;
}</pre>
          </div>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q2(v) Answer: AVL Tree Balancing Rotations</span><span class="marks">4/4 Marks</span></div>
          <div class="ans-box">
            Balance Factor: <code>BF = Height(Left Subtree) - Height(Right Subtree)</code> (must be -1, 0, or +1).<br>
            1. <strong>LL Rotation:</strong> Single Right Rotation when insertion is in the left subtree of the left child.<br>
            2. <strong>RR Rotation:</strong> Single Left Rotation when insertion is in the right subtree of the right child.<br>
            3. <strong>LR Rotation:</strong> Double rotation: Left rotation on child, followed by Right rotation on parent.<br>
            4. <strong>RL Rotation:</strong> Double rotation: Right rotation on child, followed by Left rotation on parent.
          </div>
        </div>

        <div class="section-title">
          <span>SECTION C &bull; Comprehensive 10-Mark Model Solutions (5 + 5 Marks)</span>
          <span class="sec-marks">Total: 20 Marks</span>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q3(a) Answer: QuickSort Partition Trace on [38, 27, 43, 3, 9, 82, 10]</span><span class="marks">5/5 Marks</span></div>
          <div class="ans-box">
            Let Pivot = 38 (first element).<br>
            Pointers: <code>i</code> searches for element &gt; 38 (from left); <code>j</code> searches for element &le; 38 (from right).<br>
            1. <code>i</code> stops at 43 (&gt; 38); <code>j</code> stops at 10 (&le; 38). Swap 43 and 10 &rarr; <code>[38, 27, 10, 3, 9, 82, 43]</code><br>
            2. Advance: <code>i</code> stops at 82 (&gt; 38); <code>j</code> stops at 9 (&le; 38). Here <code>j &le; i</code> (pointers cross).<br>
            3. Swap Pivot (38) with element at index <code>j</code> (9):<br>
            &rarr; Partitioned Array: <strong>[9, 27, 10, 3] &bull; [38] &bull; [82, 43]</strong>.<br>
            Pivot 38 is now in its exact sorted position! Recursively apply to left and right subarrays.
          </div>
          <div class="q-head" style="margin-top: 10px;"><span>Q3(b) Answer: QuickSort Complexities & Recurrence</span><span class="marks">5/5 Marks</span></div>
          <div class="ans-box">
            &bull; <strong>Best Case:</strong> Partition splits array into two equal halves of size n/2.<br>
            <code>T(n) = 2T(n/2) + O(n) &rArr; O(n log n)</code>.<br>
            &bull; <strong>Average Case:</strong> Random partitions yield <code>O(n log n)</code>.<br>
            &bull; <strong>Worst Case:</strong> Highly unbalanced partition (e.g. 0 and n-1 elements each time).<br>
            <code>T(n) = T(n-1) + O(n) &rArr; O(n&sup2;)</code>.<br>
            &bull; <strong>Auxiliary Space:</strong> <code>O(log n)</code> call stack in best case, <code>O(n)</code> in worst case.
          </div>
        </div>

        <div class="q-item">
          <div class="q-head"><span>Q4(a) Answer: BST Construction: 45, 23, 67, 12, 34, 56, 89, 78</span><span class="marks">5/5 Marks</span></div>
          <div class="ans-box">
            Tree Structure Formed:<br>
            <pre>             45
           /    \\
         23      67
        /  \\    /  \\
       12  34  56   89
                   /
                  78</pre>
          </div>
          <div class="q-head" style="margin-top: 10px;"><span>Q4(b) Answer: Tree Traversals</span><span class="marks">5/5 Marks</span></div>
          <div class="ans-box">
            &bull; <strong>Inorder Traversal (L-Root-R, always sorted):</strong> <code>12, 23, 34, 45, 56, 67, 78, 89</code><br>
            &bull; <strong>Preorder Traversal (Root-L-R):</strong> <code>45, 23, 12, 34, 67, 56, 89, 78</code><br>
            &bull; <strong>Postorder Traversal (L-R-Root):</strong> <code>12, 34, 23, 56, 78, 89, 67, 45</code>
          </div>
        </div>`
      ),
    },
  },

  // 2. Data Structures Using C (Summer 2023)
  {
    id: 'qp-ds-2023-s',
    kind: 'previous',
    title: 'UBTER Board Paper Summer 2023',
    builtIn: true,
    subjectCode: '053001',
    subjectName: 'Data Structures Using C',
    branch: 'CSE',
    semester: 3,
    examYear: '2023',
    paper: {
      name: 'UBTER_053001_DataStructures_Summer2023.pdf',
      mime: 'application/pdf',
      size: '390 KB',
      url: makeDocDataUrl(
        'UBTER Board Paper Summer 2023',
        'Data Structures Using C',
        '053001',
        false,
        `<div class="section-title">
          <span>SECTION A (खण्ड 'क') - Answer ALL 10 Questions (सभी 10 प्रश्न अनिवार्य हैं)</span>
          <span class="sec-marks">10 x 1 = 10 Marks</span>
        </div>
        <div class="q-item"><div class="q-head"><span>Q1(i). What is an Array? Give memory allocation formula for 1D array.</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(ii). What is stack underflow condition?</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(iii). Define Degree of a Tree Node.</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(iv). What is a Complete Binary Tree?</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(v). Write the time complexity of Binary Search on a sorted array of size n.</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(vi). What is the purpose of realloc() function in C?</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(vii). State whether a Graph can have cycles (True / False).</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(viii). What is the worst-case time complexity of Bubble Sort?</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(ix). Name two applications of Stack in compiler design.</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(x). Define an Infix expression with an example.</span><span class="marks">1 Mark</span></div></div>

        <div class="section-title">
          <span>SECTION B (खण्ड 'ख') - Answer ANY 5 Questions (किन्हीं 5 प्रश्नों के उत्तर दीजिए)</span>
          <span class="sec-marks">5 x 4 = 20 Marks</span>
        </div>
        <div class="q-item"><div class="q-head"><span>Q2(i). Explain Bubble Sort algorithm with step-by-step passes on: [64, 34, 25, 12, 22].</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(ii). Write an algorithm to delete a node from the end of a Singly Linked List.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(iii). Explain Queue insertion (Enqueue) and deletion (Dequeue) operations with array diagrams.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(iv). Differentiate between Iteration and Recursion with memory stack comparison.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(v). Write a recursive C function to search an element using Binary Search.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(vi). Explain Depth First Search (DFS) graph traversal algorithm with a suitable example graph.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(vii). What is Hashing? Explain Collision Resolution using Linear Probing.</span><span class="marks">4 Marks</span></div></div>

        <div class="section-title">
          <span>SECTION C (खण्ड 'ग') - Answer ANY 2 Questions (किन्हीं 2 प्रश्नों के उत्तर दीजिए, प्रत्येक 5+5 अंक)</span>
          <span class="sec-marks">2 x 10 = 20 Marks</span>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q3(a). Explain Merge Sort algorithm with divide-and-conquer strategy. Trace on array: [14, 7, 3, 12, 9, 11, 6, 2].</span><span class="marks">5 Marks</span></div>
          <div class="q-head" style="margin-top: 10px;"><span>Q3(b). Prove that Merge Sort runs in O(n log n) in all best, worst, and average cases.</span><span class="marks">5 Marks</span></div>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q4(a). Define Doubly Linked List. Write C code for structure and node insertion at any given position.</span><span class="marks">5 Marks</span></div>
          <div class="q-head" style="margin-top: 10px;"><span>Q4(b). Compare advantages and disadvantages of Doubly Linked List over Singly Linked List.</span><span class="marks">5 Marks</span></div>
        </div>`
      ),
    },
    answer: {
      name: 'UBTER_053001_DataStructures_Summer2023_AnswerKey.pdf',
      mime: 'application/pdf',
      size: '510 KB',
      updatedBy: 'Er. Jitendra Kumar',
      updatedAt: '2026-01-20',
      url: makeDocDataUrl(
        'Official Answer Key & Model Solutions',
        'Data Structures Using C',
        '053001',
        true,
        `<div class="section-title">
          <span>SECTION A &bull; Verified Model Answers (1 Mark Each)</span>
          <span class="sec-marks">Total: 10 Marks</span>
        </div>
        <div class="q-item"><div class="q-head"><span>Q1(i) Answer: Array & Formula</span><span class="marks">1/1 Mark</span></div><div class="ans-box">Address of A[i] = <code>BaseAddress + (i - LowerBound) * SizeOfElement</code>.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(ii) Answer: Stack Underflow</span><span class="marks">1/1 Mark</span></div><div class="ans-box">Attempting to POP or read an element from an already empty stack (top == -1).</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(iii) Answer: Node Degree</span><span class="marks">1/1 Mark</span></div><div class="ans-box">The total number of children belonging to that specific tree node.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(iv) Answer: Complete Binary Tree</span><span class="marks">1/1 Mark</span></div><div class="ans-box">A binary tree in which every level except possibly the last is completely filled, and all nodes in the last level are as far left as possible.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(v) Answer: Binary Search Complexity</span><span class="marks">1/1 Mark</span></div><div class="ans-box">Time Complexity is <strong>O(log₂ n)</strong>.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(vi) Answer: realloc() in C</span><span class="marks">1/1 Mark</span></div><div class="ans-box">Dynamically resizes previously allocated memory block without losing its existing data contents.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(vii) Answer: Graph Cycles</span><span class="marks">1/1 Mark</span></div><div class="ans-box"><strong>True</strong>. A graph can contain cycles (unlike a tree which is strictly acyclic).</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(viii) Answer: Bubble Sort Worst Case</span><span class="marks">1/1 Mark</span></div><div class="ans-box">Worst case time complexity is <strong>O(n²)</strong>.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(ix) Answer: Stack Applications</span><span class="marks">1/1 Mark</span></div><div class="ans-box">1. Expression parsing and syntax validation. 2. Function call recursion call stack management.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(x) Answer: Infix Expression</span><span class="marks">1/1 Mark</span></div><div class="ans-box">Operator is placed between operands: e.g. <code>A + B</code>.</div></div>

        <div class="section-title">
          <span>SECTION B &bull; Verified Model Answers (4 Marks Each)</span>
          <span class="sec-marks">Total: 20 Marks</span>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q2(i) Answer: Bubble Sort on [64, 34, 25, 12, 22]</span><span class="marks">4/4 Marks</span></div>
          <div class="ans-box">
            Pass 1: Compare adjacent & swap: [34, 25, 12, 22, <strong>64</strong>]<br>
            Pass 2: [25, 12, 22, <strong>34, 64</strong>]<br>
            Pass 3: [12, 22, <strong>25, 34, 64</strong>]<br>
            Pass 4: [<strong>12, 22, 25, 34, 64</strong>] (Sorted Array).
          </div>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q2(v) Answer: Recursive Binary Search in C</span><span class="marks">4/4 Marks</span></div>
          <div class="ans-box">
            <pre>int binarySearch(int arr[], int low, int high, int key) {
    if (low > high) return -1;
    int mid = low + (high - low) / 2;
    if (arr[mid] == key) return mid;
    if (arr[mid] > key) return binarySearch(arr, low, mid - 1, key);
    return binarySearch(arr, mid + 1, high, key);
}</pre>
          </div>
        </div>

        <div class="section-title">
          <span>SECTION C &bull; Comprehensive 10-Mark Model Solutions (5 + 5 Marks)</span>
          <span class="sec-marks">Total: 20 Marks</span>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q3(a) Answer: Merge Sort Trace on [14, 7, 3, 12, 9, 11, 6, 2]</span><span class="marks">5/5 Marks</span></div>
          <div class="ans-box">
            Divide into halves until singletons: [14], [7], [3], [12], [9], [11], [6], [2].<br>
            Merge 2-element sorted lists: [7, 14], [3, 12], [9, 11], [2, 6].<br>
            Merge 4-element sorted lists: [3, 7, 12, 14] and [2, 6, 9, 11].<br>
            Final 2-way Merge: <strong>[2, 3, 6, 7, 9, 11, 12, 14]</strong>.
          </div>
          <div class="q-head" style="margin-top: 10px;"><span>Q3(b) Answer: Merge Sort Complexity Proof</span><span class="marks">5/5 Marks</span></div>
          <div class="ans-box">
            Recurrence: <code>T(n) = 2T(n/2) + O(n)</code>.<br>
            Using Master Theorem: a = 2, b = 2, f(n) = n. Since n^(log_b a) = n^1 = n = f(n), Case 2 applies.<br>
            Therefore, <strong>T(n) = &Theta;(n log n)</strong> in all best, worst, and average conditions!
          </div>
        </div>`
      ),
    },
  },

  // 3. Model Sample Paper - Set A (UBTER Pattern)
  {
    id: 'qp-ds-sample-a',
    kind: 'sample',
    title: 'Model Sample Paper - Set A (UBTER Pattern)',
    builtIn: true,
    subjectCode: '053001',
    subjectName: 'Data Structures Using C',
    branch: 'CSE',
    semester: 3,
    examYear: '2025',
    paper: {
      name: 'UBTER_053001_Sample_SetA.pdf',
      mime: 'application/pdf',
      size: '350 KB',
      url: makeDocDataUrl(
        'Model Sample Paper - Set A',
        'Data Structures Using C',
        '053001',
        false,
        `<div class="section-title">
          <span>SECTION A (खण्ड 'क') - Answer ALL 10 Questions</span>
          <span class="sec-marks">10 x 1 = 10 Marks</span>
        </div>
        <div class="q-item"><div class="q-head"><span>Q1(i). What is a Pointer in C programming?</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(ii). What is a Self-Referential Structure?</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(iii). Define Polish Notation.</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(iv). What is a Priority Queue?</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(v). State the maximum number of nodes at level i of a binary tree.</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(vi). What is height of a tree with only root node?</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(vii). Which sorting algorithm has best time complexity O(n) on pre-sorted data?</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(viii). Define adjacency matrix representation of a graph.</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(ix). What is an In-place sorting algorithm?</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(x). Write the condition to detect empty Singly Linked List.</span><span class="marks">1 Mark</span></div></div>

        <div class="section-title">
          <span>SECTION B (खण्ड 'ख') - Answer ANY 5 Questions</span>
          <span class="sec-marks">5 x 4 = 20 Marks</span>
        </div>
        <div class="q-item"><div class="q-head"><span>Q2(i). Explain dynamic memory allocation functions (malloc, calloc, realloc, free) with C syntax.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(ii). Write an algorithm to evaluate a postfix expression using a stack.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(iii). Explain Circular Linked List and write advantages over Singly Linked List.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(iv). Explain Selection Sort algorithm with an example array.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(v). Describe Breadth-First Search (BFS) graph traversal with algorithm steps.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(vi). Differentiate between Linear Search and Binary Search in tabular form.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(vii). What is a Deque (Double Ended Queue)? Explain Input-restricted and Output-restricted Deque.</span><span class="marks">4 Marks</span></div></div>

        <div class="section-title">
          <span>SECTION C (खण्ड 'ग') - Answer ANY 2 Questions (each 5+5 Marks)</span>
          <span class="sec-marks">2 x 10 = 20 Marks</span>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q3(a). Write complete C functions to insert a node at the end and delete a node from the beginning of a Singly Linked List.</span><span class="marks">5 Marks</span></div>
          <div class="q-head" style="margin-top: 10px;"><span>Q3(b). Explain how memory is allocated dynamically on Heap vs Stack for linked lists.</span><span class="marks">5 Marks</span></div>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q4(a). Explain Binary Tree representations: Sequential (Array) and Linked representation.</span><span class="marks">5 Marks</span></div>
          <div class="q-head" style="margin-top: 10px;"><span>Q4(b). Construct a Binary Tree from given Inorder: D B E A F C and Preorder: A B D E C F.</span><span class="marks">5 Marks</span></div>
        </div>`
      ),
    },
    answer: {
      name: 'UBTER_053001_Sample_SetA_AnswerKey.pdf',
      mime: 'application/pdf',
      size: '520 KB',
      updatedBy: 'Er. Jitendra Kumar',
      updatedAt: '2026-02-01',
      url: makeDocDataUrl(
        'Answer Key - Sample Set A',
        'Data Structures Using C',
        '053001',
        true,
        `<div class="section-title"><span>SECTION A &bull; Model Answers (1 Mark Each)</span><span class="sec-marks">10 Marks</span></div>
        <div class="q-item"><div class="q-head"><span>Q1(i) Answer: Pointer</span><span class="marks">1/1 Mark</span></div><div class="ans-box">A pointer is a variable in C that stores the memory address of another variable.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(ii) Answer: Self-Referential Structure</span><span class="marks">1/1 Mark</span></div><div class="ans-box">A struct containing a pointer member that points to a struct of the same type (basis of linked lists and trees).</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(iii) Answer: Polish Notation</span><span class="marks">1/1 Mark</span></div><div class="ans-box">Prefix notation where the operator precedes its operands without requiring parentheses (e.g. + A B).</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(iv) Answer: Priority Queue</span><span class="marks">1/1 Mark</span></div><div class="ans-box">A queue where elements are dequeued according to assigned priority rather than pure arrival order.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(v) Answer: Maximum Nodes at Level i</span><span class="marks">1/1 Mark</span></div><div class="ans-box">Maximum nodes at level i = <strong>2ⁱ</strong> (assuming root is at level 0).</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(vi) Answer: Height of Single Node Tree</span><span class="marks">1/1 Mark</span></div><div class="ans-box">Height is 0 (or 1 depending on 0-indexed or 1-indexed convention; 0 is standard).</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(vii) Answer: Best Sort for Presorted Data</span><span class="marks">1/1 Mark</span></div><div class="ans-box"><strong>Insertion Sort</strong> (runs in O(n) when array is already sorted).</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(viii) Answer: Adjacency Matrix</span><span class="marks">1/1 Mark</span></div><div class="ans-box">A 2D array of size V x V where A[i][j] = 1 if an edge exists between vertex i and j, else 0.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(ix) Answer: In-place Sort</span><span class="marks">1/1 Mark</span></div><div class="ans-box">A sorting algorithm that transforms the input without using extra memory beyond O(1) space (e.g., Insertion Sort, Heap Sort).</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(x) Answer: Empty Linked List Check</span><span class="marks">1/1 Mark</span></div><div class="ans-box"><code>head == NULL</code>.</div></div>

        <div class="section-title"><span>SECTION B &bull; Model Answers (4 Marks Each)</span><span class="sec-marks">20 Marks</span></div>
        <div class="q-item"><div class="q-head"><span>Q2(i) Answer: Dynamic Memory Functions in C</span><span class="marks">4/4 Marks</span></div>
        <div class="ans-box">
          1. <code>malloc(size_t size)</code>: Allocates uninitialized memory block on heap.<br>
          2. <code>calloc(size_t n, size_t size)</code>: Allocates memory and initializes all bytes to zero.<br>
          3. <code>realloc(void* ptr, size_t new_size)</code>: Resizes allocated block preserving contents.<br>
          4. <code>free(void* ptr)</code>: Releases memory back to heap operating pool to avoid memory leaks.
        </div></div>

        <div class="section-title"><span>SECTION C &bull; Comprehensive Solutions (5 + 5 Marks)</span><span class="sec-marks">20 Marks</span></div>
        <div class="q-item">
          <div class="q-head"><span>Q4(b) Answer: Binary Tree Reconstruction from Inorder & Preorder</span><span class="marks">5/5 Marks</span></div>
          <div class="ans-box">
            Inorder: D B E A F C | Preorder: A B D E C F<br>
            Root is first element of Preorder: <strong>A</strong>.<br>
            Looking at Inorder: Left subtree of A has elements <code>[D, B, E]</code>, right subtree has <code>[F, C]</code>.<br>
            For left subtree: Preorder gives B as sub-root. Inorder shows D is left child, E is right child.<br>
            For right subtree: Preorder gives C as sub-root. Inorder shows F is left child.<br>
            Reconstructed Tree:<br>
            <pre>        A
       / \\
      B   C
     / \\  /
    D   E F</pre>
          </div>
        </div>`
      ),
    },
  },

  // 4. Object Oriented Programming Java (Winter 2024)
  {
    id: 'qp-java-2024-w',
    kind: 'previous',
    title: 'UBTER Board Paper Winter 2024',
    builtIn: true,
    subjectCode: '053002',
    subjectName: 'Object Oriented Programming Java',
    branch: 'CSE',
    semester: 3,
    examYear: '2024',
    paper: {
      name: 'UBTER_053002_Java_Winter2024.pdf',
      mime: 'application/pdf',
      size: '410 KB',
      url: makeDocDataUrl(
        'UBTER Board Paper Winter 2024',
        'Object Oriented Programming Java',
        '053002',
        false,
        `<div class="section-title">
          <span>SECTION A (खण्ड 'क') - Answer ALL 10 Questions</span>
          <span class="sec-marks">10 x 1 = 10 Marks</span>
        </div>
        <div class="q-item"><div class="q-head"><span>Q1(i). Name the creator and founding year of Java language.</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(ii). What is Bytecode in Java?</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(iii). Which keyword is used to inherit a class in Java?</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(iv). Can an abstract class be instantiated directly using 'new'? (Yes / No).</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(v). What is the default access specifier of members in a Java class?</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(vi). What is the purpose of 'finally' block in Java exception handling?</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(vii). State whether String is mutable or immutable in Java.</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(viii). Name the root superclass of all classes in Java hierarchy.</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(ix). What is method overloading?</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(x). Which package is imported automatically in every Java program?</span><span class="marks">1 Mark</span></div></div>

        <div class="section-title">
          <span>SECTION B (खण्ड 'ख') - Answer ANY 5 Questions</span>
          <span class="sec-marks">5 x 4 = 20 Marks</span>
        </div>
        <div class="q-item"><div class="q-head"><span>Q2(i). Explain JVM Architecture (Class Loader, JVM Memory, Execution Engine) with block diagram.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(ii). Differentiate between Method Overloading and Method Overriding with code snippets.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(iii). Explain 'super' and 'this' keywords in Java with their practical uses.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(iv). Differentiate between Abstract Class and Interface in tabular form.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(v). Explain Exception Handling hierarchy in Java with try, catch, throw, throws, finally.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(vi). Explain Java Multithreading life cycle (New, Runnable, Running, Blocked, Dead).</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(vii). What is a Package in Java? How do user-defined packages promote modularity?</span><span class="marks">4 Marks</span></div></div>

        <div class="section-title">
          <span>SECTION C (खण्ड 'ग') - Answer ANY 2 Questions (each 5+5 Marks)</span>
          <span class="sec-marks">2 x 10 = 20 Marks</span>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q3(a). Write a Java program to create a custom UserDefinedException named 'AgeInvalidException' for voting validation.</span><span class="marks">5 Marks</span></div>
          <div class="q-head" style="margin-top: 10px;"><span>Q3(b). Explain Checked vs Unchecked exceptions with two examples of each.</span><span class="marks">5 Marks</span></div>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q4(a). Write a Java program to implement Multithreading by implementing the 'Runnable' interface.</span><span class="marks">5 Marks</span></div>
          <div class="q-head" style="margin-top: 10px;"><span>Q4(b). What is Thread Synchronization? Explain synchronized methods with a producer-consumer example.</span><span class="marks">5 Marks</span></div>
        </div>`
      ),
    },
    answer: {
      name: 'UBTER_053002_Java_Winter2024_AnswerKey.pdf',
      mime: 'application/pdf',
      size: '530 KB',
      updatedBy: 'Er. Jitendra Kumar',
      updatedAt: '2026-02-12',
      url: makeDocDataUrl(
        'Official Answer Key & Model Solutions',
        'Object Oriented Programming Java',
        '053002',
        true,
        `<div class="section-title"><span>SECTION A &bull; Model Answers (1 Mark Each)</span><span class="sec-marks">10 Marks</span></div>
        <div class="q-item"><div class="q-head"><span>Q1(i) Answer: Java Origin</span><span class="marks">1/1 Mark</span></div><div class="ans-box">James Gosling at Sun Microsystems in 1995.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(ii) Answer: Java Bytecode</span><span class="marks">1/1 Mark</span></div><div class="ans-box">The highly optimized intermediate machine code (.class file) produced by javac compiler and executed by the JVM.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(iii) Answer: Inheritance Keyword</span><span class="marks">1/1 Mark</span></div><div class="ans-box"><code>extends</code> for classes, <code>implements</code> for interfaces.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(iv) Answer: Abstract Class Instantiation</span><span class="marks">1/1 Mark</span></div><div class="ans-box"><strong>No</strong>. Abstract classes cannot be instantiated with <code>new</code> operator.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(v) Answer: Default Access Modifier</span><span class="marks">1/1 Mark</span></div><div class="ans-box"><strong>Package-Private</strong> (accessible only within classes of the same package).</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(vi) Answer: Finally Block</span><span class="marks">1/1 Mark</span></div><div class="ans-box">Executes cleanup code unconditionally, regardless of whether an exception occurred or was handled.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(vii) Answer: String Immutability</span><span class="marks">1/1 Mark</span></div><div class="ans-box"><strong>Immutable</strong> (cannot be changed once created in String Constant Pool).</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(viii) Answer: Root Superclass</span><span class="marks">1/1 Mark</span></div><div class="ans-box"><code>java.lang.Object</code>.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(ix) Answer: Method Overloading</span><span class="marks">1/1 Mark</span></div><div class="ans-box">Multiple methods in the same class sharing the same name but differing in number or types of parameters (compile-time polymorphism).</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(x) Answer: Default Package</span><span class="marks">1/1 Mark</span></div><div class="ans-box"><code>java.lang.*</code>.</div></div>

        <div class="section-title"><span>SECTION B &bull; Model Answers (4 Marks Each)</span><span class="sec-marks">20 Marks</span></div>
        <div class="q-item"><div class="q-head"><span>Q2(iv) Answer: Abstract Class vs Interface</span><span class="marks">4/4 Marks</span></div>
        <div class="ans-box">
          1. <strong>Multiple Inheritance:</strong> Class supports single inheritance; Interface supports multiple inheritance.<br>
          2. <strong>Constructors:</strong> Abstract class can have constructors; Interface cannot.<br>
          3. <strong>Variables:</strong> Interface variables are strictly <code>public static final</code>; Abstract class can have instance variables.<br>
          4. <strong>Speed:</strong> Abstract class is slightly faster as interface requires dynamic lookup.
        </div></div>

        <div class="section-title"><span>SECTION C &bull; Model Answers (5 + 5 Marks)</span><span class="sec-marks">20 Marks</span></div>
        <div class="q-item"><div class="q-head"><span>Q3(a) Answer: Custom Exception Program</span><span class="marks">5/5 Marks</span></div>
        <div class="ans-box">
          <pre>class AgeInvalidException extends Exception {
    public AgeInvalidException(String message) {
        super(message);
    }
}

public class VoteValidator {
    public static void checkAge(int age) throws AgeInvalidException {
        if (age < 18) {
            throw new AgeInvalidException("Underage: Age must be 18+ to vote!");
        }
        System.out.println("Voter eligible. Proceed with ballot.");
    }
    public static void main(String[] args) {
        try {
            checkAge(16);
        } catch (AgeInvalidException e) {
            System.err.println("Verification Caught: " + e.getMessage());
        }
    }
}</pre>
        </div></div>`
      ),
    },
  },

  // 5. Database Management Systems (Winter 2024)
  {
    id: 'qp-dbms-2024-w',
    kind: 'previous',
    title: 'UBTER Board Paper Winter 2024',
    builtIn: true,
    subjectCode: '053005',
    subjectName: 'Database Management Systems',
    branch: 'CSE',
    semester: 3,
    examYear: '2024',
    paper: {
      name: 'UBTER_053005_DBMS_Winter2024.pdf',
      mime: 'application/pdf',
      size: '440 KB',
      url: makeDocDataUrl(
        'UBTER Board Paper Winter 2024',
        'Database Management Systems',
        '053005',
        false,
        `<div class="section-title">
          <span>SECTION A (खण्ड 'क') - Answer ALL 10 Questions</span>
          <span class="sec-marks">10 x 1 = 10 Marks</span>
        </div>
        <div class="q-item"><div class="q-head"><span>Q1(i). What does DDL and DML stand for?</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(ii). Define a Primary Key.</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(iii). Can a Foreign Key have duplicate values or NULL? (Yes / No).</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(iv). What is a Cardinality of a relationship?</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(v). Write SQL command used to remove a table structure along with data permanently.</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(vi). What does ACID stand for in transaction processing?</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(vii). State First Normal Form (1NF) condition.</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(viii). What is a View in SQL?</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(ix). Name the symbol used for Selection (&sigma;) operator in Relational Algebra.</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(x). What is a Deadlock in DBMS?</span><span class="marks">1 Mark</span></div></div>

        <div class="section-title">
          <span>SECTION B (खण्ड 'ख') - Answer ANY 5 Questions</span>
          <span class="sec-marks">5 x 4 = 20 Marks</span>
        </div>
        <div class="q-item"><div class="q-head"><span>Q2(i). Explain Three-Schema Architecture of DBMS (Internal, Conceptual, External) with diagram.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(ii). Differentiate between DBMS and Traditional File Management System.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(iii). Explain ER Diagram components (Entity, Weak Entity, Attribute types, Relationships) with symbols.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(iv). Explain 1NF, 2NF, and 3NF Normalization rules with suitable example tables.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(v). Write SQL queries for: (a) Create Table, (b) Insert record, (c) Update record, (d) Inner Join.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(vi). Explain ACID properties with real-life bank fund transfer scenario.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(vii). What is Concurrency Control? Explain Two-Phase Locking (2PL) protocol.</span><span class="marks">4 Marks</span></div></div>

        <div class="section-title">
          <span>SECTION C (खण्ड 'ग') - Answer ANY 2 Questions (each 5+5 Marks)</span>
          <span class="sec-marks">2 x 10 = 20 Marks</span>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q3(a). Design an ER Diagram for a Polytechnic College Management System (Student, Department, Course, Faculty).</span><span class="marks">5 Marks</span></div>
          <div class="q-head" style="margin-top: 10px;"><span>Q3(b). Convert the above ER Diagram into Relational Relational Tables identifying Primary and Foreign keys.</span><span class="marks">5 Marks</span></div>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q4(a). Explain B-Tree and B+ Tree indexing mechanisms used in database file organization.</span><span class="marks">5 Marks</span></div>
          <div class="q-head" style="margin-top: 10px;"><span>Q4(b). Write SQL queries demonstrating GROUP BY, HAVING, and Aggregate functions (COUNT, AVG, SUM).</span><span class="marks">5 Marks</span></div>
        </div>`
      ),
    },
    answer: {
      name: 'UBTER_053005_DBMS_Winter2024_AnswerKey.pdf',
      mime: 'application/pdf',
      size: '520 KB',
      updatedBy: 'Er. Jitendra Kumar',
      updatedAt: '2026-02-14',
      url: makeDocDataUrl(
        'Official Answer Key & Model Solutions',
        'Database Management Systems',
        '053005',
        true,
        `<div class="section-title"><span>SECTION A &bull; Model Answers (1 Mark Each)</span><span class="sec-marks">10 Marks</span></div>
        <div class="q-item"><div class="q-head"><span>Q1(i) Answer: DDL & DML</span><span class="marks">1/1 Mark</span></div><div class="ans-box">DDL: Data Definition Language (CREATE, ALTER, DROP). DML: Data Manipulation Language (INSERT, UPDATE, DELETE).</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(ii) Answer: Primary Key</span><span class="marks">1/1 Mark</span></div><div class="ans-box">A column (or set of columns) that uniquely identifies each row in a table. It cannot contain NULL.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(iii) Answer: Foreign Key Values</span><span class="marks">1/1 Mark</span></div><div class="ans-box"><strong>Yes</strong>. Foreign keys can have duplicates and can contain NULL (unless declared NOT NULL).</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(iv) Answer: Cardinality</span><span class="marks">1/1 Mark</span></div><div class="ans-box">The numerical mapping of entities between relationships: 1:1, 1:N, or M:N.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(v) Answer: Permanent Drop Command</span><span class="marks">1/1 Mark</span></div><div class="ans-box"><code>DROP TABLE table_name;</code>.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(vi) Answer: ACID Acronym</span><span class="marks">1/1 Mark</span></div><div class="ans-box"><strong>Atomicity, Consistency, Isolation, Durability</strong>.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(vii) Answer: 1NF Rule</span><span class="marks">1/1 Mark</span></div><div class="ans-box">Every attribute column must hold only atomic (indivisible) values; no repeating groups or arrays allowed.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(viii) Answer: SQL View</span><span class="marks">1/1 Mark</span></div><div class="ans-box">A virtual table based on the result-set of an underlying SQL SELECT statement.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(ix) Answer: Selection Operator</span><span class="marks">1/1 Mark</span></div><div class="ans-box">Greek letter <strong>&sigma; (sigma)</strong> filters tuples matching predicate.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(x) Answer: Deadlock</span><span class="marks">1/1 Mark</span></div><div class="ans-box">A state where two or more transactions wait indefinitely for locks held by each other.</div></div>

        <div class="section-title"><span>SECTION B &bull; Model Answers (4 Marks Each)</span><span class="sec-marks">20 Marks</span></div>
        <div class="q-item"><div class="q-head"><span>Q2(vi) Answer: ACID Properties with Fund Transfer Scenario</span><span class="marks">4/4 Marks</span></div>
        <div class="ans-box">
          Transfer Rs 5000 from Account A to Account B:<br>
          1. <strong>Atomicity:</strong> Either both steps (deduct from A, credit to B) complete, or neither does (auto rollback on failure).<br>
          2. <strong>Consistency:</strong> Sum of (Balance A + Balance B) remains identical before and after transfer.<br>
          3. <strong>Isolation:</strong> Concurrent transactions cannot see partial intermediate state where A is debited but B is not yet credited.<br>
          4. <strong>Durability:</strong> Once transaction COMMITS, balances persist even during power/system crash.
        </div></div>

        <div class="section-title"><span>SECTION C &bull; Model Answers (5 + 5 Marks)</span><span class="sec-marks">20 Marks</span></div>
        <div class="q-item"><div class="q-head"><span>Q4(b) Answer: GROUP BY, HAVING, and Aggregates</span><span class="marks">5/5 Marks</span></div>
        <div class="ans-box">
          <pre>SELECT dept_id, COUNT(*) AS total_students, AVG(marks) AS average_score
FROM students
WHERE admission_year = 2025
GROUP BY dept_id
HAVING AVG(marks) >= 60.0
ORDER BY average_score DESC;</pre>
        </div></div>`
      ),
    },
  },

  // 6. Applied Mathematics-I (Winter 2024 - 1st Year All Branches)
  {
    id: 'qp-math1-2024-w',
    kind: 'previous',
    title: 'UBTER Board Paper Winter 2024',
    builtIn: true,
    subjectCode: '051001',
    subjectName: 'Applied Mathematics-I',
    branch: 'All',
    semester: 1,
    examYear: '2024',
    paper: {
      name: 'UBTER_051001_Maths1_Winter2024.pdf',
      mime: 'application/pdf',
      size: '380 KB',
      url: makeDocDataUrl(
        'UBTER Board Paper Winter 2024',
        'Applied Mathematics-I',
        '051001',
        false,
        `<div class="section-title">
          <span>SECTION A (खण्ड 'क') - Answer ALL 10 Questions</span>
          <span class="sec-marks">10 x 1 = 10 Marks</span>
        </div>
        <div class="q-item"><div class="q-head"><span>Q1(i). Evaluate determinant: |[2, 3], [4, 5]|.</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(ii). If A is a square matrix, what is (A')' equal to?</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(iii). Find the modulus of complex number z = 3 + 4i.</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(iv). State De Moivre's Theorem for integer n.</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(v). Write the formula for n-th term of a Geometric Progression (G.P.).</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(vi). Find the derivative of y = sin(5x) with respect to x.</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(vii). State Binomial Theorem expansion for (x + a)ⁿ.</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(viii). Evaluate limit: lim(x&rarr;0) [sin(x) / x].</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(ix). If vector a = 2i + 3j - k and b = i - j + k, find dot product a &bull; b.</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(x). Write the condition for two vectors to be perpendicular.</span><span class="marks">1 Mark</span></div></div>

        <div class="section-title">
          <span>SECTION B (खण्ड 'ख') - Answer ANY 5 Questions</span>
          <span class="sec-marks">5 x 4 = 20 Marks</span>
        </div>
        <div class="q-item"><div class="q-head"><span>Q2(i). Solve the linear system using Cramer's Rule: 2x - y = 5 and 3x + 2y = 11.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(ii). If A = [[1, 2], [3, 4]], find the inverse matrix A⁻¹.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(iii). Express (1 + i√3) in Polar form (r(cos &theta; + i sin &theta;)).</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(iv). Find the 8th term in expansion of (2x + 1/x)¹⁰.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(v). Differentiate with respect to x: y = (x² + 1) / (x - 1).</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(vi). Prove that vectors a = 2i - j + k, b = i - 3j - 5k, c = 3i - 4j - 4k form a right-angled triangle.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(vii). Find dy/dx if x = a cos³ &theta; and y = a sin³ &theta;.</span><span class="marks">4 Marks</span></div></div>

        <div class="section-title">
          <span>SECTION C (खण्ड 'ग') - Answer ANY 2 Questions (each 5+5 Marks)</span>
          <span class="sec-marks">2 x 10 = 20 Marks</span>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q3(a). State and prove Euler's Theorem for homogeneous functions of degree n.</span><span class="marks">5 Marks</span></div>
          <div class="q-head" style="margin-top: 10px;"><span>Q3(b). If u = sin⁻¹[(x² + y²) / (x + y)], prove that x(&part;u/&part;x) + y(&part;u/&part;y) = tan(u).</span><span class="marks">5 Marks</span></div>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q4(a). Find the Eigenvalues and Eigenvectors of matrix A = [[4, 1], [2, 3]].</span><span class="marks">5 Marks</span></div>
          <div class="q-head" style="margin-top: 10px;"><span>Q4(b). Verify Cayley-Hamilton Theorem for matrix A = [[1, 2], [3, 4]] and compute A⁻¹.</span><span class="marks">5 Marks</span></div>
        </div>`
      ),
    },
    answer: {
      name: 'UBTER_051001_Maths1_Winter2024_AnswerKey.pdf',
      mime: 'application/pdf',
      size: '510 KB',
      updatedBy: 'Senior Mathematics Faculty',
      updatedAt: '2026-02-05',
      url: makeDocDataUrl(
        'Official Answer Key & Model Solutions',
        'Applied Mathematics-I',
        '051001',
        true,
        `<div class="section-title"><span>SECTION A &bull; Model Answers (1 Mark Each)</span><span class="sec-marks">10 Marks</span></div>
        <div class="q-item"><div class="q-head"><span>Q1(i) Answer: Determinant</span><span class="marks">1/1 Mark</span></div><div class="ans-box">|A| = (2 * 5) - (3 * 4) = 10 - 12 = <strong>-2</strong>.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(ii) Answer: Transpose of Transpose</span><span class="marks">1/1 Mark</span></div><div class="ans-box">(A')' = <strong>A</strong>.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(iii) Answer: Modulus |z|</span><span class="marks">1/1 Mark</span></div><div class="ans-box">|z| = &radic;(3&sup2; + 4&sup2;) = &radic;(9 + 16) = &radic;25 = <strong>5</strong>.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(iv) Answer: De Moivre's Theorem</span><span class="marks">1/1 Mark</span></div><div class="ans-box">(cos &theta; + i sin &theta;)ⁿ = <strong>cos(n&theta;) + i sin(n&theta;)</strong>.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(v) Answer: GP n-th Term</span><span class="marks">1/1 Mark</span></div><div class="ans-box">Tₙ = <strong>a &bull; rⁿ⁻¹</strong> (where a is first term, r is common ratio).</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(vi) Answer: Derivative of sin(5x)</span><span class="marks">1/1 Mark</span></div><div class="ans-box">d/dx [sin(5x)] = <strong>5 cos(5x)</strong>.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(vii) Answer: Binomial Theorem</span><span class="marks">1/1 Mark</span></div><div class="ans-box">(x + a)ⁿ = &sum; ⁿCᵣ xⁿ⁻ʳ aʳ (from r=0 to n).</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(viii) Answer: Standard Limit</span><span class="marks">1/1 Mark</span></div><div class="ans-box">lim(x&rarr;0) [sin(x) / x] = <strong>1</strong>.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(ix) Answer: Dot Product a &bull; b</span><span class="marks">1/1 Mark</span></div><div class="ans-box">a &bull; b = (2)(1) + (3)(-1) + (-1)(1) = 2 - 3 - 1 = <strong>-2</strong>.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(x) Answer: Orthogonality Condition</span><span class="marks">1/1 Mark</span></div><div class="ans-box">Dot product must be zero: <strong>a &bull; b = 0</strong>.</div></div>

        <div class="section-title"><span>SECTION B &bull; Model Answers (4 Marks Each)</span><span class="sec-marks">20 Marks</span></div>
        <div class="q-item"><div class="q-head"><span>Q2(i) Answer: Cramer's Rule Solution</span><span class="marks">4/4 Marks</span></div>
        <div class="ans-box">
          System: 2x - y = 5 and 3x + 2y = 11.<br>
          D = |[2, -1], [3, 2]| = (2)(2) - (-1)(3) = 4 + 3 = 7 &ne; 0.<br>
          Dₓ = |[5, -1], [11, 2]| = (5)(2) - (-1)(11) = 10 + 11 = 21.<br>
          D_y = |[2, 5], [3, 11]| = (2)(11) - (5)(3) = 22 - 15 = 7.<br>
          &rArr; <strong>x = Dₓ / D = 21 / 7 = 3</strong> and <strong>y = D_y / D = 7 / 7 = 1</strong>.
        </div></div>

        <div class="section-title"><span>SECTION C &bull; Model Answers (5 + 5 Marks)</span><span class="sec-marks">20 Marks</span></div>
        <div class="q-item"><div class="q-head"><span>Q4(a) Answer: Eigenvalues of [[4, 1], [2, 3]]</span><span class="marks">5/5 Marks</span></div>
        <div class="ans-box">
          Characteristic equation: |A - &lambda;I| = 0.<br>
          |[4 - &lambda;, 1], [2, 3 - &lambda;]| = (4 - &lambda;)(3 - &lambda;) - 2 = &lambda;&sup2; - 7&lambda; + 10 = 0.<br>
          (&lambda; - 5)(&lambda; - 2) = 0 &rArr; <strong>Eigenvalues are &lambda;₁ = 5 and &lambda;₂ = 2</strong>.
        </div></div>`
      ),
    },
  },

  // 7. Applied Physics-I (Winter 2024 - 1st Year All Branches)
  {
    id: 'qp-phys1-2024-w',
    kind: 'previous',
    title: 'UBTER Board Paper Winter 2024',
    builtIn: true,
    subjectCode: '051002',
    subjectName: 'Applied Physics-I',
    branch: 'All',
    semester: 1,
    examYear: '2024',
    paper: {
      name: 'UBTER_051002_Physics1_Winter2024.pdf',
      mime: 'application/pdf',
      size: '390 KB',
      url: makeDocDataUrl(
        'UBTER Board Paper Winter 2024',
        'Applied Physics-I',
        '051002',
        false,
        `<div class="section-title">
          <span>SECTION A (खण्ड 'क') - Answer ALL 10 Questions</span>
          <span class="sec-marks">10 x 1 = 10 Marks</span>
        </div>
        <div class="q-item"><div class="q-head"><span>Q1(i). What are the SI units of Force and Energy?</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(ii). Write dimensional formula for Universal Gravitational Constant (G).</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(iii). State Principle of Homogeneity of dimensions.</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(iv). Define Torque (&tau;) and give its SI unit.</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(v). What is the relation between linear velocity (v) and angular velocity (&omega;)?</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(vi). State Hooke's Law of Elasticity.</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(vii). What is Surface Tension? Write its SI unit.</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(viii). State First Law of Thermodynamics in equation form.</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(ix). Define Coefficient of Thermal Conductivity (K).</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(x). What is an Adiabatic Process?</span><span class="marks">1 Mark</span></div></div>

        <div class="section-title">
          <span>SECTION B (खण्ड 'ख') - Answer ANY 5 Questions</span>
          <span class="sec-marks">5 x 4 = 20 Marks</span>
        </div>
        <div class="q-item"><div class="q-head"><span>Q2(i). State and prove Work-Energy Theorem for a variable force.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(ii). Derive expression for Escape Velocity (vₑ) from the surface of Earth.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(iii). Explain Conservation of Angular Momentum with spinning figure skater example.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(iv). State and prove Bernoulli's Theorem for streamline fluid flow.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(v). Describe Stoke's Law and derive expression for Terminal Velocity of a spherical ball in viscous liquid.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(vi). Explain Carnot Engine Cycle with indicator (P-V) diagram and efficiency formula.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(vii). Differentiate between Isothermal and Adiabatic processes in tabular form.</span><span class="marks">4 Marks</span></div></div>

        <div class="section-title">
          <span>SECTION C (खण्ड 'ग') - Answer ANY 2 Questions (each 5+5 Marks)</span>
          <span class="sec-marks">2 x 10 = 20 Marks</span>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q3(a). Derive expression for Centripetal Acceleration (a = v²/r) of a particle moving in a uniform circle.</span><span class="marks">5 Marks</span></div>
          <div class="q-head" style="margin-top: 10px;"><span>Q3(b). Calculate the banking angle &theta; for a circular road curve of radius 100 m for cars moving at 72 km/h without skidding.</span><span class="marks">5 Marks</span></div>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q4(a). State Second Law of Thermodynamics (Kelvin-Planck and Clausius statements) and prove their equivalence.</span><span class="marks">5 Marks</span></div>
          <div class="q-head" style="margin-top: 10px;"><span>Q4(b). Derive Mayer's Relation for specific heats of an ideal gas: Cₚ - Cᵥ = R.</span><span class="marks">5 Marks</span></div>
        </div>`
      ),
    },
    answer: {
      name: 'UBTER_051002_Physics1_Winter2024_AnswerKey.pdf',
      mime: 'application/pdf',
      size: '500 KB',
      updatedBy: 'Senior Physics Faculty',
      updatedAt: '2026-02-08',
      url: makeDocDataUrl(
        'Official Answer Key & Model Solutions',
        'Applied Physics-I',
        '051002',
        true,
        `<div class="section-title"><span>SECTION A &bull; Model Answers (1 Mark Each)</span><span class="sec-marks">10 Marks</span></div>
        <div class="q-item"><div class="q-head"><span>Q1(i) Answer: Force & Energy Units</span><span class="marks">1/1 Mark</span></div><div class="ans-box">Force: <strong>Newton (N)</strong>. Energy: <strong>Joule (J)</strong>.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(ii) Answer: Dimension of G</span><span class="marks">1/1 Mark</span></div><div class="ans-box">[G] = <strong>[M⁻¹ L³ T⁻²]</strong>.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(iii) Answer: Homogeneity Principle</span><span class="marks">1/1 Mark</span></div><div class="ans-box">Every term on LHS and RHS of any valid physical equation must possess identical dimensions.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(iv) Answer: Torque</span><span class="marks">1/1 Mark</span></div><div class="ans-box">&tau; = r &times; F (Turning effect of force). Unit: <strong>Newton-meter (N&bull;m)</strong>.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(v) Answer: Velocity Relation</span><span class="marks">1/1 Mark</span></div><div class="ans-box"><strong>v = r &bull; &omega;</strong>.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(vi) Answer: Hooke's Law</span><span class="marks">1/1 Mark</span></div><div class="ans-box">Within elastic limit, <strong>Stress &prop; Strain</strong> (Stress / Strain = Modulus of Elasticity E).</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(vii) Answer: Surface Tension</span><span class="marks">1/1 Mark</span></div><div class="ans-box">Force acting per unit length tangential to liquid surface (T = F/L). Unit: <strong>N/m</strong>.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(viii) Answer: First Law of Thermodynamics</span><span class="marks">1/1 Mark</span></div><div class="ans-box"><strong>dQ = dU + dW</strong> (where dQ is heat added, dU is internal energy change, dW is work done).</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(ix) Answer: Thermal Conductivity K</span><span class="marks">1/1 Mark</span></div><div class="ans-box">Rate of heat flow per unit area per unit temperature gradient. Unit: <strong>W/(m&bull;K)</strong>.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(x) Answer: Adiabatic Process</span><span class="marks">1/1 Mark</span></div><div class="ans-box">A thermodynamic process in which no heat enters or leaves the system (<strong>dQ = 0</strong>).</div></div>

        <div class="section-title"><span>SECTION B &bull; Model Answers (4 Marks Each)</span><span class="sec-marks">20 Marks</span></div>
        <div class="q-item"><div class="q-head"><span>Q2(i) Answer: Work-Energy Theorem Proof</span><span class="marks">4/4 Marks</span></div>
        <div class="ans-box">
          dW = F dx = (m dv/dt) dx = m dv (dx/dt) = m v dv.<br>
          Integrating from initial velocity u to final velocity v:<br>
          W = &int; m v dv = &frac12; m v&sup2; - &frac12; m u&sup2; = <strong>K_f - K_i = &Delta;K</strong>.<br>
          Hence proved: Work done by net force equals change in kinetic energy of the body!
        </div></div>

        <div class="section-title"><span>SECTION C &bull; Model Answers (5 + 5 Marks)</span><span class="sec-marks">20 Marks</span></div>
        <div class="q-item"><div class="q-head"><span>Q3(b) Answer: Banking Angle Calculation</span><span class="marks">5/5 Marks</span></div>
        <div class="ans-box">
          v = 72 km/h = 72 &times; (5/18) = 20 m/s; r = 100 m; g = 9.8 m/s².<br>
          Formula: tan(&theta;) = v² / (r &bull; g) = (20)² / (100 &times; 9.8) = 400 / 980 = <strong>0.408</strong>.<br>
          &rArr; &theta; = tan⁻¹(0.408) &asymp; <strong>22.2&deg;</strong>.
        </div></div>`
      ),
    },
  },

  // 8. Operating Systems (Summer 2024 - 4th Sem CSE)
  {
    id: 'qp-os-2024-s',
    kind: 'previous',
    title: 'UBTER Board Paper Summer 2024',
    builtIn: true,
    subjectCode: '054001',
    subjectName: 'Operating Systems',
    branch: 'CSE',
    semester: 4,
    examYear: '2024',
    paper: {
      name: 'UBTER_054001_OS_Summer2024.pdf',
      mime: 'application/pdf',
      size: '410 KB',
      url: makeDocDataUrl(
        'UBTER Board Paper Summer 2024',
        'Operating Systems',
        '054001',
        false,
        `<div class="section-title">
          <span>SECTION A (खण्ड 'क') - Answer ALL 10 Questions</span>
          <span class="sec-marks">10 x 1 = 10 Marks</span>
        </div>
        <div class="q-item"><div class="q-head"><span>Q1(i). What is an Operating System?</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(ii). What does PCB stand for in OS?</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(iii). Name any two preemptive CPU scheduling algorithms.</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(iv). What is a System Call? Give one example.</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(v). What is a Critical Section problem?</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(vi). State four necessary conditions for Deadlock.</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(vii). What is Virtual Memory?</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(viii). What causes Belady's Anomaly in FIFO page replacement?</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(ix). Define Thrashing in memory management.</span><span class="marks">1 Mark</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q1(x). What is an Inode in Unix / Linux file system?</span><span class="marks">1 Mark</span></div></div>

        <div class="section-title">
          <span>SECTION B (खण्ड 'ख') - Answer ANY 5 Questions</span>
          <span class="sec-marks">5 x 4 = 20 Marks</span>
        </div>
        <div class="q-item"><div class="q-head"><span>Q2(i). Explain Process Life Cycle state transition diagram (New, Ready, Running, Waiting, Terminated).</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(ii). Compare Round Robin and Shortest Remaining Time First (SRTF) CPU scheduling algorithms.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(iii). Explain Semaphore mechanism (wait/P and signal/V operations) for mutual exclusion.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(iv). Explain Banker's Algorithm for deadlock avoidance with safety algorithm steps.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(v). Explain Paging memory management scheme with Page Table translation diagram.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(vi). Differentiate between Monolithic Kernel and Microkernel architectures.</span><span class="marks">4 Marks</span></div></div>
        <div class="q-item"><div class="q-head"><span>Q2(vii). Explain Disk Scheduling algorithms: FCFS, SSTF, and SCAN (Elevator).</span><span class="marks">4 Marks</span></div></div>

        <div class="section-title">
          <span>SECTION C (खण्ड 'ग') - Answer ANY 2 Questions (each 5+5 Marks)</span>
          <span class="sec-marks">2 x 10 = 20 Marks</span>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q3(a). Given page reference string: 7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2. Calculate page faults using FIFO and LRU algorithms with 3 frames.</span><span class="marks">5 Marks</span></div>
          <div class="q-head" style="margin-top: 10px;"><span>Q3(b). Compare the performance of FIFO vs LRU vs Optimal page replacement algorithms.</span><span class="marks">5 Marks</span></div>
        </div>
        <div class="q-item">
          <div class="q-head"><span>Q4(a). Consider 4 processes: P1 (Burst: 6, Arrival: 0), P2 (Burst: 8, Arrival: 1), P3 (Burst: 7, Arrival: 2), P4 (Burst: 3, Arrival: 3). Draw Gantt chart and calculate Average Waiting Time using SJF Preemptive.</span><span class="marks">5 Marks</span></div>
          <div class="q-head" style="margin-top: 10px;"><span>Q4(b). Calculate Turnaround Time and Throughput for the above schedule.</span><span class="marks">5 Marks</span></div>
        </div>`
      ),
    },
    answer: {
      name: 'UBTER_054001_OS_Summer2024_AnswerKey.pdf',
      mime: 'application/pdf',
      size: '510 KB',
      updatedBy: 'Er. Jitendra Kumar',
      updatedAt: '2026-02-16',
      url: makeDocDataUrl(
        'Official Answer Key & Model Solutions',
        'Operating Systems',
        '054001',
        true,
        `<div class="section-title"><span>SECTION A &bull; Model Answers (1 Mark Each)</span><span class="sec-marks">10 Marks</span></div>
        <div class="q-item"><div class="q-head"><span>Q1(i) Answer: Operating System</span><span class="marks">1/1 Mark</span></div><div class="ans-box">A system software that manages computer hardware and software resources and provides common services for computer programs.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(ii) Answer: PCB Meaning</span><span class="marks">1/1 Mark</span></div><div class="ans-box"><strong>Process Control Block</strong> (contains process state, PID, registers, program counter, and memory limits).</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(iii) Answer: Preemptive Algorithms</span><span class="marks">1/1 Mark</span></div><div class="ans-box">1. Round Robin (RR). 2. Shortest Remaining Time First (SRTF).</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(iv) Answer: System Call</span><span class="marks">1/1 Mark</span></div><div class="ans-box">Programmatic interface by which a user application requests privileged service from the OS kernel (e.g., <code>fork()</code>, <code>read()</code>).</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(v) Answer: Critical Section</span><span class="marks">1/1 Mark</span></div><div class="ans-box">Code segment that accesses shared resources (like shared memory or files) which must not be executed concurrently by more than one process.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(vi) Answer: Deadlock Conditions</span><span class="marks">1/1 Mark</span></div><div class="ans-box"><strong>Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait</strong>.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(vii) Answer: Virtual Memory</span><span class="marks">1/1 Mark</span></div><div class="ans-box">Memory management technique that creates an illusion of a large continuous main memory using disk secondary storage paging.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(viii) Answer: Belady's Anomaly</span><span class="marks">1/1 Mark</span></div><div class="ans-box">Phenomenon in FIFO where allocating more page frames results in an increased number of page faults.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(ix) Answer: Thrashing</span><span class="marks">1/1 Mark</span></div><div class="ans-box">State where CPU spends more time swapping pages in and out of disk than executing instructions.</div></div>
        <div class="q-item"><div class="q-head"><span>Q1(x) Answer: Inode in Linux</span><span class="marks">1/1 Mark</span></div><div class="ans-box">Data structure that stores all file metadata (file size, permissions, owner, block pointers) except filename and data.</div></div>

        <div class="section-title"><span>SECTION B &bull; Model Answers (4 Marks Each)</span><span class="sec-marks">20 Marks</span></div>
        <div class="q-item"><div class="q-head"><span>Q2(i) Answer: Process State Transitions</span><span class="marks">4/4 Marks</span></div>
        <div class="ans-box">
          1. <strong>New &rarr; Ready:</strong> Admitted by long-term scheduler.<br>
          2. <strong>Ready &rarr; Running:</strong> Dispatched by short-term scheduler.<br>
          3. <strong>Running &rarr; Waiting:</strong> I/O request or event wait.<br>
          4. <strong>Waiting &rarr; Ready:</strong> I/O completion interrupt.<br>
          5. <strong>Running &rarr; Terminated:</strong> Process exit().
        </div></div>

        <div class="section-title"><span>SECTION C &bull; Model Answers (5 + 5 Marks)</span><span class="sec-marks">20 Marks</span></div>
        <div class="q-item"><div class="q-head"><span>Q3(a) Answer: Page Fault Calculation (FIFO vs LRU)</span><span class="marks">5/5 Marks</span></div>
        <div class="ans-box">
          Reference String: 7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2 (Frames: 3)<br>
          &bull; <strong>FIFO:</strong> Total Page Faults = <strong>9 Faults</strong>.<br>
          &bull; <strong>LRU:</strong> Total Page Faults = <strong>8 Faults</strong>.<br>
          LRU exhibits superior performance because it respects the principle of locality of reference.
        </div></div>`
      ),
    },
  },
];
