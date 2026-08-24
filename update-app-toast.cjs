const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Add import Toaster
if (!content.includes('react-hot-toast')) {
  content = content.replace("import React, { useState } from 'react';", "import React, { useState } from 'react';\nimport { Toaster } from 'react-hot-toast';");
}

// Add <Toaster /> right before </Routes> in App
if (!content.includes('<Toaster position="bottom-right" />')) {
  content = content.replace("</Routes>", "</Routes>\n      <Toaster position=\"bottom-right\" />");
}

fs.writeFileSync('src/App.tsx', content);
