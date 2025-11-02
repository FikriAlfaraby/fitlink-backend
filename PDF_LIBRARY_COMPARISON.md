# PDF Library Comparison

## Why We Use html-pdf-node Instead of jsPDF

### The Problem with jsPDF

**jsPDF alone cannot render HTML with CSS styling.** It only supports:
- Basic text positioning with `pdf.text()`
- Manual drawing of shapes, lines, and rectangles
- No automatic HTML layout or CSS styling

### Example of jsPDF Limitation

```typescript
// ❌ This DOES NOT work - jsPDF cannot render HTML
const pdf = new jsPDF();
pdf.text(htmlTemplate, 10, 10); // Just dumps raw HTML as text!
pdf.save('invoice.pdf');
// Result: PDF with raw HTML code as text, no styling
```

### What You Would Need with jsPDF

To use jsPDF with HTML, you would need:

1. **jsPDF** - Base PDF generation
2. **html2canvas** - Convert HTML to canvas/image
3. **Manual implementation** - Convert canvas to PDF

```typescript
// Complex approach with jsPDF + html2canvas
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// 1. Create a temporary DOM element
const tempDiv = document.createElement('div');
tempDiv.innerHTML = htmlTemplate;
document.body.appendChild(tempDiv);

// 2. Convert to canvas
const canvas = await html2canvas(tempDiv);

// 3. Convert canvas to image
const imgData = canvas.toDataURL('image/png');

// 4. Add image to PDF
const pdf = new jsPDF();
pdf.addImage(imgData, 'PNG', 0, 0);

// 5. Cleanup
document.body.removeChild(tempDiv);
```

**Problems:**
- ❌ Requires DOM (doesn't work in Node.js backend)
- ❌ Complex multi-step process
- ❌ Quality issues with image-based PDFs
- ❌ Large file sizes
- ❌ Text is not selectable in PDF

## Why html-pdf-node is Better

### Advantages

✅ **Direct HTML to PDF** - One simple function call
✅ **Full CSS support** - All your styles work perfectly
✅ **Works in Node.js** - No DOM required
✅ **Better quality** - True PDF with selectable text
✅ **Smaller file sizes** - Optimized PDF output
✅ **WSL compatible** - Works in your environment

### Simple Implementation

```typescript
import * as htmlPdf from 'html-pdf-node';

const options = {
    format: 'A4',
    printBackground: true,
    margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
};

const file = { content: htmlTemplate };
const pdfBuffer = await htmlPdf.generatePdf(file, options);
```

That's it! One function call, and you get a perfect PDF with all your HTML and CSS rendered correctly.

## Comparison Table

| Feature | jsPDF | html-pdf-node |
|---------|-------|---------------|
| HTML Support | ❌ No (text only) | ✅ Full HTML5 |
| CSS Support | ❌ No | ✅ Full CSS3 |
| Backend Compatible | ✅ Yes | ✅ Yes |
| Complexity | ⚠️ High (with html2canvas) | ✅ Low |
| PDF Quality | ⚠️ Image-based | ✅ True PDF |
| Text Selectable | ❌ No (if using images) | ✅ Yes |
| File Size | ⚠️ Large | ✅ Optimized |
| WSL Compatible | ⚠️ Depends | ✅ Yes |

## Current Implementation

We're using **html-pdf-node** because:

1. Your invoice template has complex HTML and CSS
2. You need it to work in a Node.js backend (NestJS)
3. You're running on WSL (html-pdf-node works better here)
4. You want professional-quality PDFs with selectable text
5. You want simple, maintainable code

## When to Use jsPDF

jsPDF is great for:
- ✅ Programmatically creating PDFs (charts, reports)
- ✅ Simple documents with basic text and shapes
- ✅ When you need fine-grained control over PDF structure
- ✅ Client-side PDF generation in browsers

But for **HTML templates with styling**, html-pdf-node is the better choice.

## Installed Dependencies

Your project has:
- ✅ `html-pdf-node` - Currently used for PDF generation
- ✅ `jspdf` - Installed but not needed for this use case
- ✅ `puppeteer` - Installed but causes issues in WSL
- ✅ `pdf-lib` - For PDF manipulation (not generation from HTML)

## Recommendation

**Keep using html-pdf-node** - it's the right tool for your invoice generation needs.
