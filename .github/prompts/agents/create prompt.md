You are an expert frontend engineer.

I have an existing VS Code project. I want you to create a complete working prototype inside this project using ONLY:

* HTML
* CSS
* Vanilla JavaScript

DO NOT use React or any frameworks.

---

## 🎯 OBJECTIVE

Build a "Design Flow Generator" prototype that demonstrates:

CSV Upload → Parse → Structure → Markdown → Visual Output → Download

---

## 📁 REQUIREMENTS

Create or update these files in the root:

* index.html
* style.css
* script.js

Keep everything simple and clean.

---

## 🖥️ UI REQUIREMENTS (index.html)

Create a clean UI with:

### 1. Header

* Title: "Design Flow Generator"

---

### 2. Input Section

* File upload input: <input type="file" id="fileInput" accept=".csv" />
* Button:
  "Upload & Generate"

---

### 3. Output Section

* Div with id="output"

---

### 4. Download Button

* "Download Design"

---

### 5. Include:

* style.css
* script.js
* marked.js CDN

---

## 🎨 STYLING (style.css)

* Center layout
* Card-based UI
* Clean spacing
* Highlight domain sections
* Scrollable output
* Modern but simple look

---

## ⚙️ FUNCTIONAL REQUIREMENTS (script.js)

Implement the following:

---

### 1. handleFile()

* Read uploaded CSV file
* Use FileReader
* Convert file to text
* Call:

  * parseCSV()
  * groupByDomain()
  * generateSummary()
  * generateMarkdown()
* Render output using marked.js
* Store markdown globally for download

---

### 2. parseCSV(csv)

* Convert CSV string into JSON array
* Structure:
  {
  domain,
  event,
  description
  }

---

### 3. groupByDomain(data)

* Group events by domain

---

### 4. generateMarkdown(groupedData)

* Convert grouped data into markdown:

## Domain: Billing

* Event: Invoice Created
  Description: When invoice is generated

---

### 5. generateSummary(data)

* Return:
  "This system contains X domains and Y events."

---

### 6. downloadDesign()

* Convert markdown into file
* Use Blob
* Download as:
  design.md

---

## ✨ OUTPUT FORMAT

Display:

1. Summary at top
2. Structured domains below
3. Clean readable UI

---

## 🚀 BONUS (IMPORTANT)

* Add basic validation (no file selected)
* Add simple loading message
* Improve readability (spacing, sections)

---

## ❗ CONSTRAINTS

* No backend
* No frameworks
* Keep it lightweight
* Prototype only

---

## 🎯 FINAL RESULT

User should be able to:

1. Upload CSV file
2. Click button
3. See structured design output
4. Download design as file

---

Generate ALL required files with complete working code.
