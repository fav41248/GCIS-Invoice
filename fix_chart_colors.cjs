const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// Add Cell to import
if (!code.includes('Cell, ')) {
  code = code.replace('import { BarChart, Bar, ', 'import { BarChart, Bar, Cell, ');
}

const oldBar = `<Bar maxBarSize={60} dataKey="Profit" fill="#0F5132" radius={[4, 4, 0, 0]} />`;
const newBar = `<Bar maxBarSize={60} dataKey="Profit" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={\`cell-\${index}\`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>`;

code = code.replace(oldBar, newBar);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
console.log('Fixed Dashboard chart colors');
