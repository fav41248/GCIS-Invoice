const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// Replace chartData logic
const oldChartData = `  // Process data for the chart (Admins only)
  const chartData = useMemo(() => {
    if (!isAdmin || !invoices.length) return [];

    const monthlyData: Record<string, any> = {};
    
    invoices.forEach(inv => {
      if (!inv.issueDate || !inv.profitTotal) return;
      
      const date = new Date(inv.issueDate);
      if (isNaN(date.getTime())) return;
      
      const monthYear = date.toLocaleString('default', { month: 'short', year: '2-digit' }); // e.g., "Sep 26"
      const sortKey = \`\${date.getFullYear()}-\${String(date.getMonth() + 1).padStart(2, '0')}\`; // e.g. "2026-09"
      const rep = inv.createdBy || 'Unknown';
      
      if (!monthlyData[sortKey]) {
        monthlyData[sortKey] = { name: monthYear, sortKey };
      }
      monthlyData[sortKey][rep] = (monthlyData[sortKey][rep] || 0) + inv.profitTotal;
    });

    return Object.values(monthlyData).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [invoices, isAdmin]);`;

const newChartData = `  // Process data for the chart (Admins only) - Group by Rep
  const chartData = useMemo(() => {
    if (!isAdmin || !invoices.length) return [];

    const repData: Record<string, any> = {};
    
    invoices.forEach(inv => {
      if (!inv.profitTotal) return;
      
      const rep = inv.createdBy || 'Unknown';
      
      if (!repData[rep]) {
        repData[rep] = { name: rep, Profit: 0 };
      }
      repData[rep].Profit += inv.profitTotal;
    });

    return Object.values(repData).sort((a, b) => b.Profit - a.Profit);
  }, [invoices, isAdmin]);`;

code = code.replace(oldChartData, newChartData);

// Replace JSX
const oldJsx = `              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                <YAxis 
                  tickFormatter={(val) => \`₦\${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}\`} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#6B7280', fontSize: 12}}
                  dx={-10}
                />
                <Tooltip 
                  formatter={(value: number) => [\`₦\${value.toLocaleString()}\`, 'Profit']}
                  cursor={{fill: '#F3F4F6'}}
                  contentStyle={{borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                {uniqueReps.map((rep, index) => (
                  <Bar key={rep} dataKey={rep} name={rep} fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>`;

const newJsx = `              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                <YAxis 
                  tickFormatter={(val) => \`₦\${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}\`} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#6B7280', fontSize: 12}}
                  dx={-10}
                />
                <Tooltip 
                  formatter={(value: number) => [\`₦\${value.toLocaleString()}\`, 'Profit']}
                  cursor={{fill: '#F3F4F6'}}
                  contentStyle={{borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar maxBarSize={60} dataKey="Profit" fill="#0F5132" radius={[4, 4, 0, 0]} />
              </BarChart>`;

code = code.replace(oldJsx, newJsx);

// Update title
code = code.replace(`<h2 className="text-lg font-bold mb-4">Monthly Profit Performance by Rep</h2>`, `<h2 className="text-lg font-bold mb-4">Total Profit Performance by Rep</h2>`);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
console.log('Fixed Dashboard chart');
