import type { OldAnswerKey } from '../../pdf';

// Model answers for the two 2025 board papers of 054004 Internet and Web Technology (CSE IV Sem).
const PAPER_1: OldAnswerKey['parts'] = [
  { title: 'Paper 1 (Examination 2025) – Section A  (any ten, 1 mark each)', items: [
    ['1. ISP stands for ........ .', 'Internet Service Provider'],
    ['2. FTP stands for ........ .', 'File Transfer Protocol'],
    ['3. HTML stands for ........ .', 'HyperText Markup Language'],
    ['4. World Wide Web is a huge collection of ........ on the internet.', 'web pages (hypertext documents) linked by hyperlinks'],
    ['5. URL stands for ........ .', 'Uniform Resource Locator'],
    ['6. Excite is an example of ........ .', 'a search engine (web portal)'],
    ['7. CSS stands for ........ .', 'Cascading Style Sheets'],
    ['8. To insert an image in HTML we use the ........ tag.', '<img src="…" alt="…">'],
    ['9. A CSS declaration always ends with a ........ .', 'semicolon (;)'],
    ['10. An HTML table has two kinds of cells, header cells and ........ .', 'data cells (<td>)'],
    ['11. ISDN stands for ........ .', 'Integrated Services Digital Network'],
    ['12. PHP stands for ........ .', 'PHP: Hypertext Preprocessor (earlier "Personal Home Page")'],
  ] },
  { title: 'Paper 1 – Section B  (any five, 5 marks each)', items: [
    ['13. What do you mean by the Internet? Write its uses.', 'A worldwide network of networks that connects millions of computers using TCP/IP.\nUses: e-mail and chat, WWW and information search, online education, e-commerce and banking, social media, video conferencing, cloud storage, e-governance, entertainment.'],
    ['14. Write five tags of HTML with syntax.', '<p>Paragraph</p>;  <a href="page.html">Link</a>;  <img src="pic.jpg" alt="text">;  <table><tr><td>cell</td></tr></table>;  <ul><li>item</li></ul>;  also <h1>…</h1>, <br>, <form>…</form>.'],
    ['15. What is a web server? Explain different types of web servers.', 'Software (and the computer running it) that stores websites and sends pages to browsers over HTTP/HTTPS on request.\nTypes/examples: Apache HTTP Server (open source, most used), Nginx (fast, reverse proxy), Microsoft IIS (Windows, ASP.NET), Apache Tomcat (Java servlets/JSP), LiteSpeed. Also static vs dynamic servers.'],
    ['16. Discuss the TCP/IP protocol.', 'Suite of protocols on which the internet works, in four layers:\nApplication (HTTP, FTP, SMTP, DNS) → Transport (TCP – reliable, connection-oriented, sequencing and acknowledgement; UDP – fast, connectionless) → Internet (IP – addressing and routing of packets) → Network access (Ethernet, Wi-Fi).\nData is divided into packets; IP delivers them, TCP rebuilds them in order.'],
    ['17. What is CSS? Write the features of CSS.', 'Style-sheet language that describes the look of HTML pages (colours, fonts, layout).\nFeatures: separates content and design, one file styles many pages, faster loading, consistent look, easy maintenance, many selectors, responsive design with media queries, cascading priority rules.'],
    ['18. Differentiate HTTP versus FTP.', 'HTTP: transfers web pages from server to browser; port 80 (443 HTTPS); stateless; one connection; used by browsers.\nFTP: transfers files (upload/download) between computers; ports 20/21 (separate control and data connections); needs login (or anonymous); used by FTP clients.'],
    ['19. How can you set a background image in HTML?', 'With CSS (recommended): <body style="background-image: url(\'bg.jpg\'); background-size: cover; background-repeat: no-repeat;">\nor in a <style> block: body { background-image: url(bg.jpg); }\nOld attribute: <body background="bg.jpg"> (not supported in HTML5).'],
  ] },
  { title: 'Paper 1 – Section C  (any five, 7 marks each)', items: [
    ['20. What is HTML5? Explain the features of HTML5.', 'The latest version of HTML (W3C/WHATWG).\nFeatures: semantic tags (<header>, <nav>, <section>, <article>, <footer>); <audio> and <video> without plug-ins; <canvas> and SVG graphics; new form input types (email, date, number, range) and validation; local storage / session storage; geolocation; offline web apps; drag and drop; simple <!DOCTYPE html>.'],
    ['21. What is JavaScript? Explain operators used in JavaScript.', 'Client-side scripting language that makes web pages interactive (validation, events, DOM changes).\nOperators: arithmetic (+ − * / % ** ++ −−), assignment (= += −= *=), comparison (== === != !== > < >= <=), logical (&& || !), string concatenation (+), conditional (c ? a : b), typeof, bitwise (& | ^ ~ << >>). Example: let x = 5; x += 2; (x > 6 && x < 10) → true.'],
    ['22. What is JSP? Explain JSP architecture.', 'JavaServer Pages – server-side technology to create dynamic pages by putting Java code inside HTML (<% %>, <%= %>).\nArchitecture: browser sends request → web server/container (Tomcat) → JSP page is translated into a servlet → compiled → executed (can use JavaBeans/JDBC for database) → HTML response sent back. Model 1 (JSP handles everything) and Model 2/MVC (servlet controller, JSP view, beans model).'],
    ['23. Differentiate client-side scripting and server-side scripting.', 'Client-side (JavaScript): runs in the browser; fast response, form validation and effects; code visible to the user; cannot access the server database.\nServer-side (PHP, JSP, ASP.NET, Node.js): runs on the web server; database access, login, sessions; code hidden; only HTML output sent; more secure but needs a server round-trip.'],
    ['24. What is ASP.NET? Compare ASP vs JSP.', 'ASP.NET: Microsoft\'s server-side framework (C#/VB.NET) for dynamic websites and web services, compiled, runs on IIS/.NET.\nASP (classic): Microsoft, VBScript, interpreted, Windows/IIS only.\nJSP: Sun/Oracle, Java, compiled to servlets, platform independent (any OS with Tomcat etc.), uses JavaBeans and tag libraries.'],
    ['25. What are the technologies used in web design?', 'HTML (structure), CSS (presentation), JavaScript (behaviour), front-end frameworks (Bootstrap, React), server-side languages (PHP, JSP, ASP.NET, Python), databases (MySQL), web servers (Apache), design tools (Dreamweaver, Figma), CMS (WordPress), XML/JSON for data.'],
    ['26. Short notes: (a) Search engine (b) ISDN', '(a) A web tool that finds information on the WWW: a crawler (spider) visits pages, an indexer stores keywords, and the query processor ranks results for the user\'s search – Google, Bing, Yahoo, DuckDuckGo.\n(b) Integrated Services Digital Network: digital telephone network that carries voice, data and video together over copper lines; BRI = 2B + D (2 × 64 kbps + 16 kbps); PRI = 23B/30B + D; faster than dial-up, used before broadband.'],
  ] },
];

const PAPER_2: OldAnswerKey['parts'] = [
  { title: 'Paper 2 (DSE/054004) – Section A  (any ten, 1 mark each)', items: [
    ['1. Internet is a network of networks.', 'True'],
    ['2. FTP helps users to transfer files.', 'True'],
    ['3. Yahoo is not a search engine.', 'False (Yahoo is a search engine / web portal)'],
    ['4. <BR> stands for Break Reading.', 'False (<br> means line break)'],
    ['5. The <input> tag is used to create form elements.', 'True'],
    ['6. PHP is a server-side scripting language.', 'True'],
    ['7. JRE stands for ........ .', 'Java Runtime Environment'],
    ['8. ADSL stands for ........ .', 'Asymmetric Digital Subscriber Line'],
    ['9. CSS stands for ........ .', 'Cascading Style Sheets'],
    ['10. GPRS stands for ........ .', 'General Packet Radio Service'],
    ['11. An unordered list is also known as ........ .', 'a bulleted list'],
    ['12. The value for all attributes is a text string of up to ........ characters.', '1024'],
  ] },
  { title: 'Paper 2 – Section B  (any five, 5 marks each)', items: [
    ['13. Define the term "Padding".', 'In CSS, padding is the space between the content of an element and its border (inside the box model). Set with padding, padding-top/right/bottom/left, e.g. p { padding: 10px 20px; }. It takes the element’s background colour; margin is the space outside the border.'],
    ['14. What do you mean by the Internet? Write its uses.', 'See Paper 1, Q.13: worldwide network of networks using TCP/IP; uses – e-mail, WWW, education, e-commerce, banking, social media, video conferencing, cloud, e-governance.'],
    ['15. Explain HTML. Write 5 tags of HTML.', 'HTML is the standard markup language for web pages; tags in angle brackets describe structure; the browser reads them and shows the page. Basic structure: <html><head><title>…</title></head><body>…</body></html>.\nTags: <h1>, <p>, <a href>, <img src>, <table>, <ul>/<li>, <form>, <br>.'],
    ['16. Write the features of CSS.', 'See Paper 1, Q.17: separates content and design, reuse of one style sheet, consistent look, faster pages, easy maintenance, selectors, box model, responsive design with media queries, cascading priority.'],
    ['17. Describe the META tag in HTML.', 'An empty tag in <head> that gives information (metadata) about the page to browsers and search engines; not shown on the page.\n<meta charset="UTF-8">\n<meta name="description" content="College portal">\n<meta name="keywords" content="UBTER, polytechnic">\n<meta name="author" content="…">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<meta http-equiv="refresh" content="30">'],
    ['18. Difference between client-side and server-side scripting.', 'See Paper 1, Q.23: client-side runs in the browser (JavaScript – validation, effects, code visible); server-side runs on the server (PHP, JSP, ASP.NET – database, login, code hidden, only HTML output sent).'],
    ['19. Common uses of server-side scripting.', 'Processing form data, user login and sessions, reading/writing databases, generating dynamic pages (results, product lists), file uploads, sending e-mail, shopping carts and online payments, content management systems, access control and security checks.'],
  ] },
  { title: 'Paper 2 – Section C  (any five, 7 marks each)', items: [
    ['20. Develop a web page for a student admission form in HTML.', '<html><head><title>Admission Form</title></head><body>\n<h2>Student Admission Form</h2>\n<form action="admit.php" method="post">\nName: <input type="text" name="name" required><br>\nFather’s name: <input type="text" name="father"><br>\nDate of birth: <input type="date" name="dob"><br>\nGender: <input type="radio" name="g" value="M"> Male <input type="radio" name="g" value="F"> Female<br>\nBranch: <select name="branch"><option>CSE</option><option>Civil</option></select><br>\nE-mail: <input type="email" name="email"> Mobile: <input type="tel" name="mob"><br>\nAddress: <textarea name="addr" rows="3" cols="30"></textarea><br>\nHobbies: <input type="checkbox" name="h" value="sports"> Sports <input type="checkbox" name="h" value="music"> Music<br>\nPhoto: <input type="file" name="photo"><br>\n<input type="submit" value="Submit"> <input type="reset">\n</form></body></html>'],
    ['21. Discuss TCP/IP protocols.', 'See Paper 1, Q.16: four layers – application (HTTP, FTP, SMTP, DNS), transport (TCP reliable / UDP fast), internet (IP addressing and routing; ICMP, ARP), network access (Ethernet, Wi-Fi); packets, IP addresses, ports, three-way handshake (SYN, SYN-ACK, ACK).'],
    ['22. What is JavaScript? Explain operators in JavaScript.', 'See Paper 1, Q.21: client-side scripting language; operators – arithmetic, assignment, comparison (== vs ===), logical, string +, ternary, typeof, bitwise, with examples.'],
    ['23. What are the technologies used in web design?', 'See Paper 1, Q.25: HTML, CSS, JavaScript, frameworks (Bootstrap, React), server-side languages (PHP, JSP, ASP.NET), databases (MySQL), web servers (Apache), CMS (WordPress), design tools (Dreamweaver, Figma).'],
    ['24. What is the meaning of cascading? How do style sheets cascade?', 'Cascading is the set of rules that decides which style is applied when several rules target the same element.\nOrder: !important declarations → inline style (style="…") → internal <style> → external .css file → browser default. Within the same level the more specific selector wins (id > class > element), and for equal specificity the rule written later wins. Child elements also inherit some properties (colour, font) from parents.'],
    ['25. What is ASP.NET? Compare ASP vs JSP.', 'See Paper 1, Q.24: ASP.NET – Microsoft compiled server-side framework (C#/VB.NET, IIS). ASP – Microsoft, VBScript, interpreted, Windows only. JSP – Java, compiled to servlets, platform independent.'],
    ['26. Short notes: (i) Search engine (ii) HTML table tag (iii) Event handlers', '(i) See Paper 1, Q.26(a): crawler, index, ranking – Google, Bing.\n(ii) <table border="1"> with <caption>, <tr> rows, <th> header cells, <td> data cells; attributes colspan, rowspan, cellpadding, cellspacing; <thead>, <tbody>, <tfoot>.\n(iii) JavaScript attributes/functions that run code when an event occurs: onclick, onload, onmouseover, onchange, onsubmit, onkeyup, e.g. <button onclick="alert(1)">; or element.addEventListener("click", fn).'],
  ] },
];

export const WEB_TECH_2025: OldAnswerKey = { parts: [...PAPER_1, ...PAPER_2] };
