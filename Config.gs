/* ==================================================
   GROW SOUVENIR SYSTEM - CONFIGURATION
   ================================================== */

const CONFIG = {
  // SYSTEM SETUP
  SS_ID: SpreadsheetApp.getActiveSpreadsheet().getId(), // Or hardcode ID if preferred
  TIMEZONE: "Asia/Jakarta",
  CACHE_KEY: "GROW_DATA_CACHE_V28", 
  
  // SHEET NAMES
  SHEET_MASTER: "MasterProduk",
  SHEET_EXPENSE: "DataPengeluaran",
  SHEET_USER: "DataUser",
  SHEET_SETOR: "SetorModal",
  SHEET_LOG: "ActivityLogs",


  // STORE IDENTITY (For PDF Headers)
  STORE: {
    NAME: "Grow Souvenir and Advertising",
    ADDR: "Jl. Vetpur Raya III, Gg. Amat Salim, Kec. Percut Sei Tuan",
    CONTACT: "0815 8899 407 / 0877 1126 4841"
  },

  // PDF STYLING
  STYLE: `
    @page { size: A4; margin: 10mm; }
    body { font-family: 'Helvetica', sans-serif; padding: 0; color: #334155; font-size: 9px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    
    /* HEADER DOKUMEN */
    .page-header { background-color: #ffffff; padding: 10px 20px 0 20px; }
    .header-table { width: 100%; border-bottom: 3px solid #1e3a8a; padding-bottom: 15px; margin-bottom: 20px; }
    
    .brand-name { font-size: 20px; font-weight: 800; color: #1e40af; text-transform: uppercase; margin-bottom: 2px; }
    .brand-nib { font-size: 10px; color: #475569; font-weight: bold; margin-bottom: 4px; }
    .brand-info { font-size: 8px; color: #64748b; line-height: 1.4; }
    .doc-title { font-size: 24px; font-weight: 900; color: #f1f5f9; text-align: right; letter-spacing: 3px; text-transform: uppercase; }
    .doc-meta { font-size: 10px; color: #1e293b; text-align: right; margin-top: 6px; font-weight: 800; }

    /* UTILS */
    .text-blue { color: #2563eb; } 
    .text-red { color: #dc2626; } 
    .text-green { color: #16a34a; } 
    .text-orange { color: #ea580c; }
    
    /* KPI CARDS (PREMIUM ROUNDING) */
    .summary-grid { width: 100%; border-collapse: separate; border-spacing: 12px 0; margin-bottom: 30px; table-layout: fixed; }
    .card { 
        padding: 16px; 
        border: 1px solid #f1f5f9; 
        border-radius: 16px; 
        vertical-align: top; 
        background-color: #f8fafc;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .card-lbl { font-size: 8px; font-weight: 800; text-transform: uppercase; margin-bottom: 6px; color: #64748b; letter-spacing: 1px; }
    .card-val { font-size: 14px; font-weight: 800; }
    
    .bg-blue { background-color: #eff6ff; border: 1px solid #dbeafe; }
    .bg-red { background-color: #fef2f2; border: 1px solid #fee2e2; }
    .bg-green { background-color: #f0fdf4; border: 1px solid #dcfce7; }
    .bg-orange { background-color: #fffbeb; border: 1px solid #fef3c7; }

    /* TABEL DATA */
    .data-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; table-layout: fixed; }
    
    .data-table th { 
        background-color: #1e3a8a !important; 
        color: #ffffff !important; 
        padding: 12px 8px; 
        font-size: 9px; 
        text-transform: uppercase; 
        font-weight: 800; 
        text-align: center; 
        vertical-align: middle; 
        border: none;
        letter-spacing: 0.5px;
    }
    
    .data-table td { padding: 10px 8px; border-bottom: 1px solid #f1f5f9; color: #334155; font-size: 9px; vertical-align: middle; word-wrap: break-word; }
    .data-table tr:nth-child(even) td { background-color: #f8fafc; }
    .total-row td { border-top: 3px solid #1e3a8a !important; border-bottom: none !important; font-weight: 800; background-color: #fff !important; padding-top: 15px; font-size: 10px; }

    /* ALIGNMENT */
    .al-left { text-align: left; } .al-center { text-align: center; } .al-right { text-align: right; }
    .font-bold { font-weight: 800; }
    .sub-text { font-size: 8px; color: #94a3b8; display: block; margin-top: 3px; font-weight: normal; }

    /* STEMPEL */
    .stamp-container { text-align: center; padding-top: 30px; }
    .stamp-box { display: inline-block; padding: 10px 30px; border-radius: 12px; font-weight: 900; font-size: 20px; text-transform: uppercase; transform: rotate(-3deg); letter-spacing: 4px; opacity: 0.8; }
    .stamp-lunas { border: 4px solid #16a34a; color: #16a34a; } 
    .stamp-belum { border: 4px solid #dc2626; color: #dc2626; }
    
    .section-head { font-size: 11px; font-weight: 800; color: #1e3a8a; margin-top: 30px; border-bottom: 2px solid #f1f5f9; padding-bottom: 6px; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 1.5px; }
    
    /* FOOTER */
    .footer { margin-top: 60px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; line-height: 1.5; }
  `
};
