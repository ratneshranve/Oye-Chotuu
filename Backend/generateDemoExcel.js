import xlsx from 'xlsx';
import path from 'path';

// Data for the demo Excel file
const data = [
    {
        Category: 'Main Course',
        'Item Name': 'Paneer Butter Masala',
        Description: 'Rich and creamy paneer curry',
        Price: 250,
        Type: 'Veg',
        Time: '15-20 mins',
        Image: 'https://example.com/paneer.jpg',
        Variants: 'Half: 150, Full: 250'
    },
    {
        Category: 'Main Course',
        'Item Name': 'Dal Makhani',
        Description: 'Slow cooked black lentils',
        Price: 200,
        Type: 'Veg',
        Time: '20-25 mins',
        Image: '',
        Variants: 'Half: 120, Full: 200'
    },
    {
        Category: 'Breads',
        'Item Name': 'Butter Naan',
        Description: 'Soft and buttery flatbread',
        Price: 40,
        Type: 'Veg',
        Time: '5-10 mins',
        Image: '',
        Variants: ''
    },
    {
        Category: 'Non Veg Specials',
        'Item Name': 'Chicken Tikka',
        Description: 'Juicy roasted chicken chunks',
        Price: 300,
        Type: 'Non-Veg',
        Time: '15-20 mins',
        Image: '',
        Variants: 'Half: 180, Full: 300'
    }
];

const worksheet = xlsx.utils.json_to_sheet(data);
const workbook = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(workbook, worksheet, "Menu Template");

// Adjust column widths for better readability
worksheet['!cols'] = [
    { wch: 15 }, // Category
    { wch: 25 }, // Item Name
    { wch: 35 }, // Description
    { wch: 10 }, // Price
    { wch: 10 }, // Type
    { wch: 15 }, // Time
    { wch: 25 }, // Image
    { wch: 30 }  // Variants
];

const outputPath = 'C:\\Users\\Abcom\\Desktop\\demo_menu_format_v2.xlsx';
xlsx.writeFile(workbook, outputPath);

console.log(`Successfully generated demo Excel file at: ${outputPath}`);
