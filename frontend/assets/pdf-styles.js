function getPdfCSS(docType) {
    const isInvoice = docType === 'invoice';
    return `
        @page { size: A4; margin: ${isInvoice ? '0' : '10mm'}; }
        * { box-sizing: border-box; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; margin: 0; padding: 60px 0 0; color: #111827; font-size: ${isInvoice ? '11px' : '12px'}; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #f3f4f6; }
        ${isInvoice ? '.sheet { width: 210mm; min-height: 297mm; background: white; margin: 30px auto; padding: 15mm 20mm; box-shadow: 0 10px 30px rgba(0,0,0,0.08); position: relative; border-radius: 4px; }' : ''}

        /* PRINT BAR */
        .noprint { padding: 15px 20px; background: #1F2937; color: white; position: fixed; top: 0; left: 0; width: 100%; z-index: 999; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .btn-print { background: #2563EB; border: none; color: white; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 14px; font-family: 'Plus Jakarta Sans', sans-serif; transition: all 0.2s; box-shadow: 0 2px 4px rgba(37,99,235,0.3); }
        .btn-print:hover { background: #1D4ED8; box-shadow: 0 4px 8px rgba(37,99,235,0.4); transform: translateY(-1px); }
        .close-hint { font-size: 13px; color: #9CA3AF; font-weight: 500; }

        @media print {
            body { background: white; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            ${isInvoice ? '.sheet { margin: 0; box-shadow: none; width: 100%; border-radius: 0; }' : ''}
            .noprint { display: none; }
            th { background: #1E3A8A !important; color: #FFFFFF !important; }
        }

        /* HEADER */
        .header { display: flex; justify-content: space-between; margin-bottom: ${isInvoice ? '50px' : '30px'}; align-items: flex-start; }
        .brand-name { font-size: ${isInvoice ? '26px' : '20px'}; font-weight: 800; color: #1E3A8A; text-transform: uppercase; margin-bottom: 6px; letter-spacing: -0.5px; line-height: 1.1; }
        .brand-prop { font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 6px; letter-spacing: 0.5px; }
        .brand-addr { font-size: 11px; color: #6B7280; line-height: 1.5; max-width: 320px; font-weight: 500; }
        .doc-title { font-size: ${isInvoice ? '36px' : '24px'}; font-weight: 800; color: #E5E7EB; text-align: right; letter-spacing: 1px; margin-bottom: 8px; line-height: 1; }
        .doc-meta { font-size: ${isInvoice ? '13px' : '12px'}; font-weight: 700; color: #111827; }
        .doc-meta-lbl { font-size: 10px; font-weight: 600; color: #9CA3AF; text-transform: uppercase; margin-top: 4px; letter-spacing: 0.5px; }

        /* CLIENT BOX (Invoice) */
        .client-box { display: flex; justify-content: space-between; margin-bottom: 40px; padding: 25px 0; border-top: 1px solid #E5E7EB; border-bottom: 1px solid #E5E7EB; }
        .client-label { font-size: 10px; font-weight: 700; color: #6B7280; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 1px; }
        .client-val { font-size: 15px; font-weight: 700; color: #111827; }
        .deadline-val { color: #DC2626; }

        /* TABLE */
        table { width: 100%; border-collapse: ${isInvoice ? 'separate' : 'collapse'}; border-spacing: 0; margin-bottom: ${isInvoice ? '30px' : '20px'}; }
        th { padding: ${isInvoice ? '12px 10px' : '10px 8px'}; text-align: left; font-weight: 700; color: #FFFFFF; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; background: #1E3A8A; }
        td { padding: ${isInvoice ? '16px 10px' : '10px 8px'}; vertical-align: top; border-bottom: 1px solid #D1D5DB; color: #374151; font-weight: 500; font-size: ${isInvoice ? '11px' : '12px'}; }
        .al-right { text-align: right; }
        .al-center { text-align: center; }
        .font-bold { font-weight: 800; }
        .t-item { font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 2px; }
        .t-desc { font-size: 11px; color: #6B7280; font-weight: 500; }

        /* TOTALS (Invoice) */
        .total-box { width: 45%; margin-left: auto; background: #F9FAFB; border-radius: 12px; padding: 20px; }
        .total-row td { border: none; padding: 6px 0; font-size: 12px; }
        .grand-total { font-size: 18px; color: #1E3A8A; border-top: 1px solid #E5E7EB; padding-top: 15px; margin-top: 10px; }
        .lbl { color: #6B7280; font-weight: 600; }
        .val { color: #111827; font-weight: 700; }
        .stamp-wrapper { margin-top: 50px; text-align: center; height: 100px; }

        /* KPI CARDS (Reports) */
        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 25px; page-break-inside: avoid; }
        .card { padding: 14px; border-radius: 12px; border: 1px solid #E5E7EB; background: #F9FAFB; }
        .card-lbl { font-size: 9px; font-weight: 800; text-transform: uppercase; margin-bottom: 6px; color: #6B7280; letter-spacing: 1px; }
        .card-val { font-size: 14px; font-weight: 800; }
        .text-blue { color: #2563EB; }
        .text-red { color: #DC2626; }
        .text-green { color: #16A34A; }
        .text-orange { color: #F59E0B; }

        /* SECTION HEAD */
        .section-head { font-size: 12px; font-weight: 800; color: #1E3A8A; margin-top: 30px; border-bottom: 2px solid #E5E7EB; padding-bottom: 8px; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 1.5px; }

        /* FOOTER */
        .footer { text-align: center; font-size: 10px; color: #9CA3AF; margin-top: 60px; font-weight: 500; letter-spacing: 0.5px; }
    `;
}
