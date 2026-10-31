/* Browser-only XLSX export. No database writes, network requests or external dependency. */
const enc=new TextEncoder();
const xml=v=>String(v??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const col=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s};
const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
export const excelDate=key=>key?{v:(Date.UTC(...key.split('-').map((v,i)=>Number(v)-(i===1?1:0)))-Date.UTC(1899,11,30))/86400000,s:2}:null;
export const excelTime=value=>/^\d{2}:\d{2}$/.test(value||'')?{v:(Number(value.slice(0,2))*60+Number(value.slice(3)))/1440,s:3}:null;
export const excelRate=value=>value==null?null:{v:value/100,s:4};
const crcTable=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0});
function crc(bytes){let n=0xffffffff;for(const b of bytes)n=crcTable[(n^b)&255]^(n>>>8);return(n^0xffffffff)>>>0}
function zip(files){
 const parts=[],central=[];let offset=0,centralSize=0;
 for(const [name,value]of files){const n=enc.encode(name),b=enc.encode(value),c=crc(b);const h=new Uint8Array(30+n.length),d=new DataView(h.buffer);
 d.setUint32(0,0x04034b50,true);d.setUint16(4,20,true);d.setUint16(6,0x800,true);d.setUint16(12,33,true);d.setUint32(14,c,true);d.setUint32(18,b.length,true);d.setUint32(22,b.length,true);d.setUint16(26,n.length,true);h.set(n,30);parts.push(h,b);
 const q=new Uint8Array(46+n.length),v=new DataView(q.buffer);v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x800,true);v.setUint16(14,33,true);v.setUint32(16,c,true);v.setUint32(20,b.length,true);v.setUint32(24,b.length,true);v.setUint16(28,n.length,true);v.setUint32(42,offset,true);q.set(n,46);central.push(q);centralSize+=q.length;offset+=h.length+b.length;
 }
 const end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);v.setUint32(12,centralSize,true);v.setUint32(16,offset,true);
 return new Blob([...parts,...central,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
export function makeXlsx(sheets){
 const files=[];const pre='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
 const rel='http://schemas.openxmlformats.org/package/2006/relationships';
 files.push(['[Content_Types].xml',pre+`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`]);
 files.push(['_rels/.rels',pre+`<Relationships xmlns="${rel}"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`]);
 files.push(['xl/workbook.xml',pre+`<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s,i)=>`<sheet name="${xml(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`]);
 files.push(['xl/_rels/workbook.xml.rels',pre+`<Relationships xmlns="${rel}">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="styles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`]);
 files.push(['xl/styles.xml',pre+`<styleSheet xmlns="${ns}"><numFmts count="3"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/><numFmt numFmtId="165" formatCode="hh:mm"/><numFmt numFmtId="166" formatCode="0.0%"/></numFmts><fonts count="2"><font><sz val="11"/><name val="맑은 고딕"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="맑은 고딕"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF176B50"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5">${[0,0,164,165,166].map((n,i)=>`<xf numFmtId="${n}" fontId="${i===1?1:0}" fillId="${i===1?2:0}" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>`).join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`]);
 sheets.forEach((s,i)=>{
 const width=Math.max(...s.rows.map(r=>r.length),1),last=`${col(width-1)}${s.rows.length}`;
 const rows=s.rows.map((row,r)=>`<row r="${r+1}"${r===0?' ht="36" customHeight="1"':''}>${row.map((raw,c)=>{if(raw==null||raw==='')return '';const value=typeof raw==='object'?raw.v:raw,style=r===0?1:typeof raw==='object'?raw.s||0:0;const attrs=`r="${col(c)}${r+1}" s="${style}"`;return typeof value==='number'&&Number.isFinite(value)?`<c ${attrs}><v>${value}</v></c>`:`<c ${attrs} t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`}).join('')}</row>`).join('');
 files.push([`xl/worksheets/sheet${i+1}.xml`,pre+`<worksheet xmlns="${ns}"><dimension ref="A1:${last}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="32"/><cols>${Array.from({length:width},(_,c)=>`<col min="${c+1}" max="${c+1}" width="${s.widths?.[c]||20}" customWidth="1"/>`).join('')}</cols><sheetData>${rows}</sheetData>${s.filter===false?'':`<autoFilter ref="A1:${last}"/>`}</worksheet>`]);
 });return zip(files);
}
