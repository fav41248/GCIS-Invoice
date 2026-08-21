const fs = require('fs');

function count(str, tag) {
  let cnt = 0;
  let idx = 0;
  while ((idx = str.indexOf(tag, idx)) !== -1) {
    cnt++;
    idx++;
  }
  return cnt;
}

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  let open = count(content, '<div');
  let close = count(content, '</div');
  console.log(file, 'open', open, 'close', close);

  while(close > open) {
     const idx = content.lastIndexOf('</div>');
     content = content.substring(0, idx) + content.substring(idx + 6);
     close--;
  }
  while(open > close) {
     const idx = content.lastIndexOf(');');
     content = content.substring(0, idx) + '</div>\n  ' + content.substring(idx);
     open--;
  }

  fs.writeFileSync(file, content);
}

fixFile('src/pages/InvoiceView.tsx');
fixFile('src/pages/ReceiptView.tsx');
