const fs = require('fs');

let css = fs.readFileSync('src/index.css', 'utf8');

css = css.replace(
  /\/\* Reset layout constraints for print \*\/[\s\S]*?margin: 0 !important;\n  \}/,
  `/* Reset layout constraints for print */
  #invoice-preview, #receipt-preview {
    box-shadow: none !important;
    border: none !important;
  }`
);

fs.writeFileSync('src/index.css', css);
