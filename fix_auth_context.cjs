const fs = require('fs');
let code = fs.readFileSync('src/AuthContext.tsx', 'utf8');

code = code.replace(
  `export interface CustomUser {
  username: string;
  name: string;
  role: 'admin' | 'sales';
}`,
  `export interface CustomUser {
  username: string;
  name: string;
  role: 'admin' | 'sales';
  phone?: string;
}`
);

fs.writeFileSync('src/AuthContext.tsx', code);
console.log('Fixed AuthContext.tsx');
