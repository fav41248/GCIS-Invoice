const fs = require('fs');
let code = fs.readFileSync('src/pages/KnowledgeBank.tsx', 'utf8');

// Update processData to capture description
const oldProcessData = `              batch.set(docRef, {
                name: name.toString(),
                price: price,
                category: row['Category'] || row['category'] || 'General',
                updatedAt: new Date().toISOString()
              }, { merge: true });`;

const newProcessData = `              const productData: any = {
                name: name.toString(),
                price: price,
                updatedAt: new Date().toISOString()
              };
              
              const category = row['Category'] || row['category'];
              if (category) productData.category = category;
              else productData.category = 'General';

              const desc = row['Description'] || row['description'] || row['Desc'] || row['desc'];
              if (desc) productData.description = desc;
              
              // Only overwrite with new description if it is provided and detailed
              // Actually let's capture all extra fields dynamically
              Object.keys(row).forEach(k => {
                const lowerK = k.toLowerCase();
                if (!lowerK.includes('name') && !lowerK.includes('price') && !lowerK.includes('category') && !lowerK.includes('desc') && row[k]) {
                   productData[k] = row[k];
                }
              });

              batch.set(docRef, productData, { merge: true });`;

code = code.replace(oldProcessData, newProcessData);

// Update table to show description
const oldTableName = `<td className="px-6 py-4">
                          <div className="font-medium text-[#212529] flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            {product.name}
                          </div>
                        </td>`;
const newTableName = `<td className="px-6 py-4">
                          <div className="font-medium text-[#212529] flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                            <div>
                               <p>{product.name}</p>
                               {product.description && <p className="text-gray-500 text-xs mt-1 max-w-sm font-normal">{product.description}</p>}
                            </div>
                          </div>
                        </td>`;
code = code.replace(oldTableName, newTableName);

// Update edit form to include description
const oldEditState = `const [editForm, setEditForm] = useState({ name: '', price: 0, category: '' });`;
const newEditState = `const [editForm, setEditForm] = useState({ name: '', price: 0, category: '', description: '' });`;
code = code.replace(oldEditState, newEditState);

const oldHandleEdit = `setEditForm({ name: product.name, price: product.price, category: product.category || 'General' });`;
const newHandleEdit = `setEditForm({ name: product.name, price: product.price, category: product.category || 'General', description: product.description || '' });`;
code = code.replace(oldHandleEdit, newHandleEdit);

const oldHandleSave = `        name: editForm.name,
        price: editForm.price,
        category: editForm.category,
        updatedAt: new Date().toISOString()
      }, { merge: true });`;
const newHandleSave = `        name: editForm.name,
        price: editForm.price,
        category: editForm.category,
        description: editForm.description,
        updatedAt: new Date().toISOString()
      }, { merge: true });`;
code = code.replace(oldHandleSave, newHandleSave);


fs.writeFileSync('src/pages/KnowledgeBank.tsx', code);
console.log("Updated KnowledgeBank.tsx");
