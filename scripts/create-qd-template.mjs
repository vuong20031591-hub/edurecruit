// Script chạy 1 lần để tạo file template QĐ tuyển dụng
// node scripts/create-qd-template.mjs

import JSZip from 'jszip';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

function xml(strings, ...vals) {
  return strings.reduce((acc, s, i) => acc + s + (vals[i] ?? ''), '');
}

const TNR = `<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>`;

// paragraph helper: indent = twips (1cm=567), size = half-points, bold, align, content (raw runs)
function p({ indent = 0, size = 26, bold = false, align = '', firstLine = 0 } = {}, ...runs) {
  const pPr = `<w:pPr>
    ${align ? `<w:jc w:val="${align}"/>` : ''}
    ${indent || firstLine ? `<w:ind ${indent ? `w:left="${indent}"` : ''} ${firstLine ? `w:firstLine="${firstLine}"` : ''}/>` : ''}
    <w:spacing w:line="360" w:lineRule="auto"/>
    <w:rPr>${TNR}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>${bold ? '<w:b/>' : ''}</w:rPr>
  </w:pPr>`;
  return `<w:p>${pPr}${runs.join('')}</w:p>`;
}

// run helper
function r(text, { size = 26, bold = false, color = '' } = {}) {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<w:r><w:rPr>${TNR}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>${bold ? '<w:b/>' : ''}${color ? `<w:color w:val="${color}"/>` : ''}</w:rPr><w:t xml:space="preserve">${escaped}</w:t></w:r>`;
}

// blank line
function blank(size = 26) {
  return `<w:p><w:pPr><w:spacing w:line="360" w:lineRule="auto"/><w:rPr>${TNR}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr></w:pPr></w:p>`;
}

// page break
function pageBreak() {
  return `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
}

// Một trang QĐ — dùng {ho_ten} và {mon} làm placeholder cho docx-templates
// Các chỗ --- đen để nguyên
function qdPage() {
  const dash = '---------------';
  const dashShort = '-------';
  const dashLong = '--------------------------';

  return [
    // Header bảng 2 cột (UBND | CỘNG HÒA)
    `<w:tbl>
      <w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/></w:tblBorders></w:tblPr>
      <w:tblGrid><w:gridCol w:w="4680"/><w:gridCol w:w="4680"/></w:tblGrid>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="4680" w:type="dxa"/></w:tcPr>
          ${p({ align: 'center', size: 22 }, r('UBND TỈNH LẠNG SƠN', { size: 22 }))}
          ${p({ align: 'center', size: 22, bold: true }, r('SỞ GIÁO DỤC VÀ ĐÀO TẠO', { size: 22, bold: true }))}
        </w:tc>
        <w:tc><w:tcPr><w:tcW w:w="4680" w:type="dxa"/></w:tcPr>
          ${p({ align: 'center', size: 22, bold: true }, r('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', { size: 22, bold: true }))}
          ${p({ align: 'center', size: 22, bold: true }, r('Độc lập - Tự do - Hạnh phúc', { size: 22, bold: true }))}
        </w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="4680" w:type="dxa"/></w:tcPr>
          ${p({ align: 'center', size: 22 }, r(`Số:    ${dash}    /QĐ-SGDĐT`, { size: 22 }))}
        </w:tc>
        <w:tc><w:tcPr><w:tcW w:w="4680" w:type="dxa"/></w:tcPr>
          ${p({ align: 'center', size: 22 }, r(`Lạng Sơn, ngày ${dash} tháng ${dashShort} năm ${dashShort}`, { size: 22 }))}
        </w:tc>
      </w:tr>
    </w:tbl>`,

    blank(),

    // Tiêu đề
    p({ align: 'center', size: 28, bold: true }, r('QUYẾT ĐỊNH', { size: 28, bold: true })),
    p({ align: 'center', size: 26, bold: true }, r('Về việc tuyển dụng viên chức', { size: 26, bold: true })),
    p({ align: 'center', size: 26, bold: true }, r('─────────────────────────', { size: 26, bold: true })),

    blank(),

    // Người ký
    p({ align: 'center', size: 26, bold: true }, r('GIÁM ĐỐC SỞ GIÁO DỤC VÀ ĐÀO TẠO', { size: 26, bold: true })),

    blank(),

    // Căn cứ
    p({ indent: 720, size: 26 },
      r('Căn cứ Nghị định số 115/2020/NĐ-CP ngày 25/9/2020 của Chính phủ quy định về tuyển dụng, sử dụng và quản lý viên chức; Nghị định số 85/2023/NĐ-CP ngày 07/12/2023 của Chính phủ sửa đổi, bổ sung một số điều của Nghị định số 115/2020/NĐ-CP;', { size: 26 })),
    p({ indent: 720, size: 26 },
      r(`Căn cứ Quyết định số ${dash} ngày ${dash} của Ủy ban nhân dân tỉnh Lạng Sơn ban hành Quy định về phân cấp quản lý tổ chức bộ máy, biên chế và cán bộ, công chức, viên chức;`, { size: 26 })),
    p({ indent: 720, size: 26 },
      r(`Căn cứ Quyết định số ${dash} của Giám đốc Sở Giáo dục và Đào tạo về việc công nhận kết quả tuyển dụng và danh sách thí sinh trúng tuyển kỳ tuyển dụng viên chức các đơn vị sự nghiệp trực thuộc Sở Giáo dục và Đào tạo năm ${dashShort};`, { size: 26 })),
    p({ indent: 720, size: 26 },
      r('Theo đề nghị của Trưởng phòng Tổ chức cán bộ.', { size: 26 })),

    blank(),

    p({ align: 'center', size: 26, bold: true }, r('QUYẾT ĐỊNH:', { size: 26, bold: true })),

    blank(),

    // Điều 1
    p({ indent: 720, size: 26 },
      r('Điều 1. Tuyển dụng ông ', { size: 26, bold: true }),
      r('{ho_ten}', { size: 26, bold: true }),
      r(`, sinh ngày ${dash}/${dash}/${dashShort}, trình độ đào tạo: ${dash}, làm viên chức giảng dạy môn `, { size: 26 }),
      r('{mon}', { size: 26 }),
      r(` tại ${dashLong}, trực thuộc ${dashLong}, kể từ ngày ${dashShort}/${dashShort}/${dashShort}.`, { size: 26 })),
    p({ indent: 720, size: 26 },
      r('Ông/Bà ', { size: 26 }),
      r('{ho_ten}', { size: 26 }),
      r(` phải đến ký hợp đồng làm việc tại ${dashLong} trước ngày ${dash} và thực hiện chế độ tập sự 12 tháng theo quy định.`, { size: 26 })),

    blank(),

    // Điều 2
    p({ indent: 720, size: 26 },
      r('Điều 2. Trong thời gian tập sự, ông/bà ', { size: 26, bold: true }),
      r('{ho_ten}', { size: 26, bold: true }),
      r(` được hưởng ${dashShort} mức lương bậc 1; hệ số: ${dashShort} của chức danh nghề nghiệp: Giáo viên ${dash} hạng ${dashShort}; mã số: ${dash} và hưởng phụ cấp theo chế độ quy định hiện hành.`, { size: 26 })),

    blank(),

    // Điều 3
    p({ indent: 720, size: 26 },
      r('Điều 3. Trưởng phòng Tổ chức cán bộ, ', { size: 26, bold: true }),
      r(`${dashLong} và ông/bà `, { size: 26 }),
      r('{ho_ten}', { size: 26 }),
      r(' chịu trách nhiệm thi hành Quyết định này./.', { size: 26 })),

    blank(),
    blank(),

    // Footer bảng Nơi nhận | Giám đốc
    `<w:tbl>
      <w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/></w:tblBorders></w:tblPr>
      <w:tblGrid><w:gridCol w:w="4680"/><w:gridCol w:w="4680"/></w:tblGrid>
      <w:tr>
        <w:tc><w:tcPr><w:tcW w:w="4680" w:type="dxa"/></w:tcPr>
          ${p({ size: 22, bold: true }, r('Nơi nhận:', { size: 22, bold: true }))}
          ${p({ indent: 200, size: 22 }, r('- Như Điều 3;', { size: 22 }))}
          ${p({ indent: 200, size: 22 }, r('- Lãnh đạo Sở GDĐT;', { size: 22 }))}
          ${p({ indent: 200, size: 22 }, r('- Lưu: VT, TCCB.', { size: 22 }))}
        </w:tc>
        <w:tc><w:tcPr><w:tcW w:w="4680" w:type="dxa"/></w:tcPr>
          ${p({ align: 'center', size: 26, bold: true }, r('GIÁM ĐỐC', { size: 26, bold: true }))}
          ${blank(22)}
          ${blank(22)}
          ${blank(22)}
          ${blank(22)}
          ${p({ align: 'center', size: 26, bold: true }, r('{giam_doc}', { size: 26, bold: true }))}
        </w:tc>
      </w:tr>
    </w:tbl>`,
  ].join('\n');
}

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const wordRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
      <w:sz w:val="26"/><w:szCs w:val="26"/>
    </w:rPr></w:rPrDefault>
  </w:docDefaults>
</w:styles>`;

// Document body — ONE page template (docx-templates sẽ loop qua mảng candidates bên ngoài)
const body = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
            xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body>
${qdPage()}
<w:sectPr>
  <w:pgSz w:w="12240" w:h="15840"/>
  <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1701" w:header="709" w:footer="709" w:gutter="0"/>
</w:sectPr>
</w:body>
</w:document>`;

const zip = new JSZip();
zip.file('[Content_Types].xml', contentTypes);
zip.file('_rels/.rels', rels);
zip.file('word/_rels/document.xml.rels', wordRels);
zip.file('word/document.xml', body);
zip.file('word/styles.xml', styles);

const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
const outPath = resolve('public/templates/qd-tuyen-dung.docx');
writeFileSync(outPath, buf);
console.log('Written:', outPath, buf.length, 'bytes');
