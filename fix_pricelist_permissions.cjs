const fs = require('fs');
let code = fs.readFileSync('src/pages/PriceList.tsx', 'utf8');

// Hide the "Edit" button if not admin
const oldEditButton = `<button 
                            onClick={() => handleEdit(item)}
                            className="p-1.5 text-gray-500 hover:text-[#0F5132] hover:bg-green-50 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>`;
const newEditButton = `{isAdmin && (<button 
                            onClick={() => handleEdit(item)}
                            className="p-1.5 text-gray-500 hover:text-[#0F5132] hover:bg-green-50 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>)}`;
code = code.replace(oldEditButton, newEditButton);

// Hide the entire form side column if not admin
const oldFormCol = `<div className="lg:col-span-1">
          <form onSubmit={saveItem} className="bg-white p-6 rounded-md border border-gray-200 shadow-sm sticky top-6">`;
const newFormCol = `{isAdmin && (<div className="lg:col-span-1">
          <form onSubmit={saveItem} className="bg-white p-6 rounded-md border border-gray-200 shadow-sm sticky top-6">`;

const oldFormEnd = `</form>
        </div>
        <div className="lg:col-span-2">`;
const newFormEnd = `</form>
        </div>)}
        <div className={isAdmin ? "lg:col-span-2" : "lg:col-span-3"}>`;

code = code.replace(oldFormCol, newFormCol);
code = code.replace(oldFormEnd, newFormEnd);

fs.writeFileSync('src/pages/PriceList.tsx', code);
console.log("Updated PriceList.tsx with permissions");
