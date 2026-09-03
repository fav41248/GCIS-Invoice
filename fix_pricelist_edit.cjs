const fs = require('fs');
let code = fs.readFileSync('src/pages/PriceList.tsx', 'utf8');

const oldEdit = `  const handleEdit = (item: any) => {
    setEditId(item.id);
    setName(item.name);
    setDescription(item.description || '');
    setPrice(item.price.toString());
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditId('');
    setName('');
    setDescription('');
    setPrice('');
    setIsEditing(false);
  };`;

const newEdit = `  const handleEdit = (item: any) => {
    setEditId(item.id);
    setName(item.name);
    setDescription(item.description || '');
    setPrice(item.price.toString());
    setWholesalePrice(item.wholesalePrice?.toString() || '');
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditId('');
    setName('');
    setDescription('');
    setPrice('');
    setWholesalePrice('');
    setIsEditing(false);
  };`;

code = code.replace(oldEdit, newEdit);
fs.writeFileSync('src/pages/PriceList.tsx', code);
console.log('Fixed handleEdit in PriceList.tsx');
