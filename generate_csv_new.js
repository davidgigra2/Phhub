const xlsx = require('xlsx');
const fs = require('fs');

try {
    const workbook = xlsx.readFile('/Users/Themis/Downloads/PROPIETARIOS Y ADMINISTRADORES FLORESTA 2026.xlsx');
    const sheetName = 'segundo listado de propietarios';

    if (!workbook.Sheets[sheetName]) {
        console.error(`Error: La hoja '${sheetName}' no existe.`);
        process.exit(1);
    }

    const sheet = workbook.Sheets[sheetName];
    // Read the sheet as a 2D array:
    // A=0(email), B=1(nombres), C=2(apellidos), E=4(documento), G=6(number), H=7(telefono), I=8(coeficiente)
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    const csvRows = ['number,coefficient,owner_name,document_number,email,owner_phone'];

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;

        const emailRaw = row[0] || '';
        const namePart1 = row[1] || '';
        const namePart2 = row[2] || '';
        const docFormatRaw = row[4] || '';
        const unitNumberRaw = row[6] || '';
        const phoneRaw = row[7] || '';
        const coefRaw = row[8];

        // 1. Skip rows without coefficient
        if (coefRaw === undefined || coefRaw === null || coefRaw === '') {
            continue;
        }

        const number = String(unitNumberRaw).trim() || ' ';
        const coefficient = String(coefRaw).replace(',', '.').trim() || ' ';

        let ownerName = `${String(namePart1).trim()} ${String(namePart2).trim()}`.trim();
        if (!ownerName) ownerName = ' ';

        let document_numberStr = String(docFormatRaw).replace(/\D/g, '');
        if (!document_numberStr) document_numberStr = ' ';

        const email = String(emailRaw).trim() || ' ';

        let owner_phoneStr = String(phoneRaw).replace(/\s/g, '');
        if (!owner_phoneStr) owner_phoneStr = ' ';

        const formatField = (str) => {
            const s = String(str);
            if (s.includes(',') || s.includes('"')) {
                return `"${s.replace(/"/g, '""')}"`;
            }
            return s;
        };

        const finalRow = [
            formatField(number),
            formatField(coefficient),
            formatField(ownerName),
            formatField(document_numberStr),
            formatField(email),
            formatField(owner_phoneStr)
        ].join(',');

        csvRows.push(finalRow);
    }

    const outputFilename = 'unidades_prueba_new.csv';
    fs.writeFileSync(outputFilename, csvRows.join('\n'), 'utf8');
    console.log(`CSV generado exitosamente: ${outputFilename}`);
    console.log(`Total registros: ${csvRows.length - 1}`);

} catch (error) {
    console.error("Error:", error.message);
}
