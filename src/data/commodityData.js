/**
 * Commodity & Sector Emiten Data (IDX)
 * Source: Emiten_Per_Komoditas1.csv — curated & corrected
 *
 * Company names are used as FALLBACK only.
 * CategoryPage fetches the real official name from Yahoo Finance
 * and overrides these static names automatically.
 */

export const EMITEN_DATA = [
    // ── COPPER & GOLD ──────────────────────────────────────────────
    { sector: 'COPPER & GOLD', ticker: 'AMMN', name: 'Amman Mineral Internasional Tbk' },
    { sector: 'COPPER & GOLD', ticker: 'MDKA', name: 'Merdeka Copper Gold Tbk' },
    { sector: 'COPPER & GOLD', ticker: 'BRMS', name: 'Bumi Resources Minerals Tbk' },
    { sector: 'COPPER & GOLD', ticker: 'PSAB', name: 'J Resources Asia Pasifik Tbk' },
    { sector: 'COPPER & GOLD', ticker: 'SOMI', name: 'Wilton Makmur Indonesia Tbk' },
    { sector: 'COPPER & GOLD', ticker: 'INDY', name: 'Indika Energy Tbk' },

    // ── GOLD & SILVER ──────────────────────────────────────────────
    { sector: 'GOLD & SILVER', ticker: 'ARCI', name: 'Archi Indonesia Tbk' },

    // ── GOLD ───────────────────────────────────────────────────────
    { sector: 'GOLD', ticker: 'HRTA', name: 'Hartadinata Abadi Tbk' },

    // ── COPPER ─────────────────────────────────────────────────────
    { sector: 'COPPER', ticker: 'SCCO', name: 'Supreme Cable Manufacturing & Commerce Tbk' },
    { sector: 'COPPER', ticker: 'KBLI', name: 'KMI Wire and Cable Tbk' },
    { sector: 'COPPER', ticker: 'TBMS', name: 'Tembaga Mulia Semanan Tbk' },
    { sector: 'COPPER', ticker: 'JECC', name: 'Jembo Cable Company Tbk' },

    // ── COAL ───────────────────────────────────────────────────────
    { sector: 'COAL', ticker: 'ADRO', name: 'Adaro Energy Indonesia Tbk' },
    { sector: 'COAL', ticker: 'PTBA', name: 'Bukit Asam (Persero) Tbk' },
    { sector: 'COAL', ticker: 'ITMG', name: 'Indo Tambangraya Megah Tbk' },
    { sector: 'COAL', ticker: 'HRUM', name: 'Harum Energy Tbk' },
    { sector: 'COAL', ticker: 'BUMI', name: 'Bumi Resources Tbk' },
    { sector: 'COAL', ticker: 'INDY', name: 'Indika Energy Tbk' },
    { sector: 'COAL', ticker: 'ADMR', name: 'Adaro Minerals Indonesia Tbk' },
    { sector: 'COAL', ticker: 'PTRO', name: 'Petrosea Tbk' },
    { sector: 'COAL', ticker: 'BSSR', name: 'Baramulti Suksessarana Tbk' },
    { sector: 'COAL', ticker: 'DOID', name: 'BUMA Internasional Grup Tbk' },
    { sector: 'COAL', ticker: 'CUAN', name: 'Petrindo Jaya Kreasi Tbk' },
    { sector: 'COAL', ticker: 'BYAN', name: 'Bayan Resources Tbk' },
    { sector: 'COAL', ticker: 'ABMM', name: 'ABM Investama Tbk' },
    { sector: 'COAL', ticker: 'MBAP', name: 'Mitrabara Adiperdana Tbk' },
    { sector: 'COAL', ticker: 'GEMS', name: 'Golden Energy Mines Tbk' },
    { sector: 'COAL', ticker: 'TOBA', name: 'TBS Energi Utama Tbk' },
    { sector: 'COAL', ticker: 'FIRE', name: 'Alfa Energi Investama Tbk' },
    { sector: 'COAL', ticker: 'TPMA', name: 'Trans Power Marine Tbk' },
    { sector: 'COAL', ticker: 'SGER', name: 'Sumber Global Energy Tbk' },
    { sector: 'COAL', ticker: 'DEWA', name: 'Darma Henwa Tbk' },
    { sector: 'COAL', ticker: 'KKGI', name: 'Resource Alam Indonesia Tbk' },
    { sector: 'COAL', ticker: 'SMMT', name: 'Golden Eagle Energy Tbk' },
    { sector: 'COAL', ticker: 'MBSS', name: 'Mitrabahtera Segara Sejati Tbk' },
    { sector: 'COAL', ticker: 'BIPI', name: 'Astrindo Nusantara Infrastruktur Tbk' },
    { sector: 'COAL', ticker: 'BOSS', name: 'Borneo Olah Sarana Sukses Tbk' },
    { sector: 'COAL', ticker: 'MYOH', name: 'Samindo Resources Tbk' },
    { sector: 'COAL', ticker: 'DSSA', name: 'Dian Swastatika Sentosa Tbk' },
    { sector: 'COAL', ticker: 'MCOL', name: 'Prima Andalan Mandiri Tbk' },
    { sector: 'COAL', ticker: 'TEBE', name: 'Dana Brata Luhur Tbk' },
    { sector: 'COAL', ticker: 'RMKE', name: 'RMK Energy Tbk' },

    // ── OIL & GAS ──────────────────────────────────────────────────
    { sector: 'OIL & GAS', ticker: 'PGAS', name: 'Perusahaan Gas Negara Tbk' },
    { sector: 'OIL & GAS', ticker: 'MEDC', name: 'Medco Energi Internasional Tbk' },
    { sector: 'OIL & GAS', ticker: 'ELSA', name: 'Elnusa Tbk' },
    { sector: 'OIL & GAS', ticker: 'AKRA', name: 'AKR Corporindo Tbk' },
    { sector: 'OIL & GAS', ticker: 'ENRG', name: 'Energi Mega Persada Tbk' },
    { sector: 'OIL & GAS', ticker: 'RAJA', name: 'Rukun Raharja Tbk' },
    { sector: 'OIL & GAS', ticker: 'SOCI', name: 'Soechi Lines Tbk' },
    { sector: 'OIL & GAS', ticker: 'BULL', name: 'Buana Lintas Lautan Tbk' },
    { sector: 'OIL & GAS', ticker: 'WINS', name: 'Wintermar Offshore Marine Tbk' },
    { sector: 'OIL & GAS', ticker: 'HUMI', name: 'Humpuss Maritim Internasional Tbk' },
    { sector: 'OIL & GAS', ticker: 'RUIS', name: 'Radiant Utama Interinsco Tbk' },

    // ── NICKEL ─────────────────────────────────────────────────────
    { sector: 'NICKEL', ticker: 'NCKL', name: 'Trimegah Bangun Persada Tbk' },
    { sector: 'NICKEL', ticker: 'MBMA', name: 'Merdeka Battery Materials Tbk' },
    { sector: 'NICKEL', ticker: 'INCO', name: 'Vale Indonesia Tbk' },
    { sector: 'NICKEL', ticker: 'HRUM', name: 'Harum Energy Tbk' },
    { sector: 'NICKEL', ticker: 'ANTM', name: 'Aneka Tambang Tbk' },
    { sector: 'NICKEL', ticker: 'UNTR', name: 'United Tractors Tbk' },
    { sector: 'NICKEL', ticker: 'DKFT', name: 'Central Omega Resources Tbk' },
    { sector: 'NICKEL', ticker: 'NICE', name: 'Adhi Kartiko Pratama Tbk' },

    // ── TIN ────────────────────────────────────────────────────────
    { sector: 'TIN', ticker: 'TINS', name: 'Timah Tbk' },
    { sector: 'TIN', ticker: 'NIKL', name: 'Pelat Timah Nusantara Tbk' },

    // ── STEEL ──────────────────────────────────────────────────────
    { sector: 'STEEL', ticker: 'KRAS', name: 'Krakatau Steel (Persero) Tbk' },
    { sector: 'STEEL', ticker: 'GGRP', name: 'Gunung Raja Paksi Tbk' },
    { sector: 'STEEL', ticker: 'ISSP', name: 'Steel Pipe Industry of Indonesia Tbk' },
    { sector: 'STEEL', ticker: 'CTBN', name: 'Citra Tubindo Tbk' },
    { sector: 'STEEL', ticker: 'GDST', name: 'Gunawan Dianjaya Steel Tbk' },
    { sector: 'STEEL', ticker: 'BAJA', name: 'Saranacentral Bajatama Tbk' },
    { sector: 'STEEL', ticker: 'LMSH', name: 'Lionmesh Prima Tbk' },

    // ── ALUMINIUM ──────────────────────────────────────────────────
    { sector: 'ALUMINIUM', ticker: 'CITA', name: 'Cita Mineral Investindo Tbk' },
    { sector: 'ALUMINIUM', ticker: 'ALMI', name: 'Alumindo Light Metal Industry Tbk' },
    { sector: 'ALUMINIUM', ticker: 'ALKA', name: 'Alakasa Industrindo Tbk' },
    { sector: 'ALUMINIUM', ticker: 'INAI', name: 'Indal Aluminium Industry Tbk' },
    { sector: 'ALUMINIUM', ticker: 'ANTM', name: 'Aneka Tambang Tbk' },

    // ── CPO ────────────────────────────────────────────────────────
    { sector: 'CPO', ticker: 'AALI', name: 'Astra Agro Lestari Tbk' },
    { sector: 'CPO', ticker: 'FAPA', name: 'FAP Agri Tbk' },
    { sector: 'CPO', ticker: 'TAPG', name: 'Triputra Agro Persada Tbk' },
    { sector: 'CPO', ticker: 'SMAR', name: 'Sinar Mas Agro Resources and Technology Tbk' },
    { sector: 'CPO', ticker: 'SSMS', name: 'Sawit Sumbermas Sarana Tbk' },
    { sector: 'CPO', ticker: 'DSNG', name: 'Dharma Satya Nusantara Tbk' },
    { sector: 'CPO', ticker: 'LSIP', name: 'PP London Sumatra Indonesia Tbk' },
    { sector: 'CPO', ticker: 'SIMP', name: 'Salim Ivomas Pratama Tbk' },
    { sector: 'CPO', ticker: 'TLDN', name: 'Teladan Prima Agro Tbk' },
    { sector: 'CPO', ticker: 'ANJT', name: 'Austindo Nusantara Jaya Tbk' },
    { sector: 'CPO', ticker: 'BWPT', name: 'Eagle High Plantations Tbk' },
    { sector: 'CPO', ticker: 'SGRO', name: 'Sampoerna Agro Tbk' },
    { sector: 'CPO', ticker: 'PALM', name: 'Provident Investasi Bersama Tbk' },
    { sector: 'CPO', ticker: 'TBLA', name: 'Tunas Baru Lampung Tbk' },
    { sector: 'CPO', ticker: 'STAA', name: 'Sumber Tani Agung Resources Tbk' },
    { sector: 'CPO', ticker: 'BTEK', name: 'Bumi Teknokultura Unggul Tbk' },

    // ── AMMONIA ────────────────────────────────────────────────────
    { sector: 'AMMONIA', ticker: 'ESSA', name: 'ESSA Industries Indonesia Tbk' },

    // ── PULP & PAPER ───────────────────────────────────────────────
    { sector: 'PULP & PAPER', ticker: 'INKP', name: 'Indah Kiat Pulp & Paper Tbk' },
    { sector: 'PULP & PAPER', ticker: 'TKIM', name: 'Pabrik Kertas Tjiwi Kimia Tbk' },
    { sector: 'PULP & PAPER', ticker: 'SPMA', name: 'Suparma Tbk' },

    // ── RICE ───────────────────────────────────────────────────────
    { sector: 'RICE', ticker: 'AISA', name: 'FKS Food Sejahtera Tbk' },
    { sector: 'RICE', ticker: 'BISI', name: 'BISI International Tbk' },
    { sector: 'RICE', ticker: 'HOKI', name: 'Buyung Poetra Sembada Tbk' },

    // ── CORN ───────────────────────────────────────────────────────
    { sector: 'CORN', ticker: 'BISI', name: 'BISI International Tbk' },

    // ── PORTLAND CEMENT ────────────────────────────────────────────
    { sector: 'PORTLAND CEMENT', ticker: 'SMGR', name: 'Semen Indonesia (Persero) Tbk' },
    { sector: 'PORTLAND CEMENT', ticker: 'SMCB', name: 'Solusi Bangun Indonesia Tbk' },
    { sector: 'PORTLAND CEMENT', ticker: 'INTP', name: 'Indocement Tunggal Prakarsa Tbk' },
    { sector: 'PORTLAND CEMENT', ticker: 'CMNT', name: 'Cemindo Gemilang Tbk' },
    { sector: 'PORTLAND CEMENT', ticker: 'SMBR', name: 'Semen Baturaja Tbk' },

    // ── NAFTA & PET ────────────────────────────────────────────────
    { sector: 'NAFTA & PET', ticker: 'TPIA', name: 'Chandra Asri Pacific Tbk' },
    { sector: 'NAFTA & PET', ticker: 'BRPT', name: 'Barito Pacific Tbk' },
    { sector: 'NAFTA & PET', ticker: 'PBID', name: 'Panca Budi Idaman Tbk' },

    // ── GULA (SUGAR) ───────────────────────────────────────────────
    { sector: 'GULA (SUGAR)', ticker: 'TBLA', name: 'Tunas Baru Lampung Tbk' },
    { sector: 'GULA (SUGAR)', ticker: 'BUDI', name: 'Budi Starch & Sweetener Tbk' },
    { sector: 'GULA (SUGAR)', ticker: 'ICBP', name: 'Indofood CBP Sukses Makmur Tbk' },

    // ── RENEWABLE ENERGY (RE) ──────────────────────────────────────
    { sector: 'RENEWABLE ENERGY', ticker: 'BREN', name: 'Barito Renewables Energy Tbk' },
    { sector: 'RENEWABLE ENERGY', ticker: 'PGEO', name: 'Pertamina Geothermal Energy Tbk' },
    { sector: 'RENEWABLE ENERGY', ticker: 'KEEN', name: 'Kencana Energi Lestari Tbk' },
    { sector: 'RENEWABLE ENERGY', ticker: 'ARKO', name: 'Arkora Hydro Tbk' },
    { sector: 'RENEWABLE ENERGY', ticker: 'DSSA', name: 'Dian Swastatika Sentosa Tbk' },
    { sector: 'RENEWABLE ENERGY', ticker: 'TOBA', name: 'TBS Energi Utama Tbk' },
    { sector: 'RENEWABLE ENERGY', ticker: 'INDY', name: 'Indika Energy Tbk' },
    { sector: 'RENEWABLE ENERGY', ticker: 'UNTR', name: 'United Tractors Tbk' },
    { sector: 'RENEWABLE ENERGY', ticker: 'ADRO', name: 'Adaro Energy Indonesia Tbk' },
    { sector: 'RENEWABLE ENERGY', ticker: 'MEDC', name: 'Medco Energi Internasional Tbk' },

    // ── LUMBER ─────────────────────────────────────────────────────
    { sector: 'LUMBER', ticker: 'FWCT', name: 'Wijaya Cahaya Timber Tbk' },
    { sector: 'LUMBER', ticker: 'WOOD', name: 'Integra Indocabinet Tbk' },
    { sector: 'LUMBER', ticker: 'SULI', name: 'SLJ Global Tbk' },

    // ── POULTRY & MEAT ─────────────────────────────────────────────
    { sector: 'POULTRY & MEAT', ticker: 'JPFA', name: 'Japfa Comfeed Indonesia Tbk' },
    { sector: 'POULTRY & MEAT', ticker: 'MAIN', name: 'Malindo Feedmill Tbk' },
    { sector: 'POULTRY & MEAT', ticker: 'CPIN', name: 'Charoen Pokphand Indonesia Tbk' },
    { sector: 'POULTRY & MEAT', ticker: 'CPRO', name: 'Central Proteina Prima Tbk' },
    { sector: 'POULTRY & MEAT', ticker: 'WMUU', name: 'Widodo Makmur Unggas Tbk' },
    { sector: 'POULTRY & MEAT', ticker: 'SIPD', name: 'Sreeya Sewu Indonesia Tbk' },
    { sector: 'POULTRY & MEAT', ticker: 'BEEF', name: 'Estika Tata Tiara Tbk' },
];

// Unique sectors in display order
export const SECTORS = [...new Set(EMITEN_DATA.map(e => e.sector))];

/**
 * Get unique emitens for a sector (deduplicated by ticker)
 */
export function getTickersBySector(sector) {
    const seen = new Set();
    return EMITEN_DATA
        .filter(e => e.sector === sector)
        .filter(e => { if (seen.has(e.ticker)) return false; seen.add(e.ticker); return true; });
}

/**
 * Visual metadata per sector — icon, accent color, dim color
 */
export const SECTOR_META = {
    'COPPER & GOLD': { icon: '🪙', color: '#F59E0B', dim: 'rgba(245,158,11,0.12)' },
    'GOLD & SILVER': { icon: '🥇', color: '#F59E0B', dim: 'rgba(245,158,11,0.12)' },
    'GOLD': { icon: '🏅', color: '#F59E0B', dim: 'rgba(245,158,11,0.12)' },
    'COPPER': { icon: '🔶', color: '#CD7F32', dim: 'rgba(205,127,50,0.12)' },
    'COAL': { icon: '⚫', color: '#94A3B8', dim: 'rgba(148,163,184,0.12)' },
    'OIL & GAS': { icon: '🛢️', color: '#6366F1', dim: 'rgba(99,102,241,0.12)' },
    'NICKEL': { icon: '🔩', color: '#3B82F6', dim: 'rgba(59,130,246,0.12)' },
    'TIN': { icon: '🪣', color: '#64748B', dim: 'rgba(100,116,139,0.15)' },
    'STEEL': { icon: '🏗️', color: '#64748B', dim: 'rgba(100,116,139,0.15)' },
    'ALUMINIUM': { icon: '💿', color: '#94A3B8', dim: 'rgba(148,163,184,0.12)' },
    'CPO': { icon: '🌴', color: '#10B981', dim: 'rgba(16,185,129,0.12)' },
    'AMMONIA': { icon: '⚗️', color: '#8B5CF6', dim: 'rgba(139,92,246,0.12)' },
    'PULP & PAPER': { icon: '📄', color: '#3B82F6', dim: 'rgba(59,130,246,0.12)' },
    'RICE': { icon: '🌾', color: '#10B981', dim: 'rgba(16,185,129,0.12)' },
    'CORN': { icon: '🌽', color: '#F59E0B', dim: 'rgba(245,158,11,0.12)' },
    'PORTLAND CEMENT': { icon: '🏢', color: '#94A3B8', dim: 'rgba(148,163,184,0.12)' },
    'NAFTA & PET': { icon: '⛽', color: '#6366F1', dim: 'rgba(99,102,241,0.12)' },
    'GULA (SUGAR)': { icon: '🍬', color: '#F59E0B', dim: 'rgba(245,158,11,0.12)' },
    'RENEWABLE ENERGY': { icon: '⚡', color: '#10B981', dim: 'rgba(16,185,129,0.12)' },
    'LUMBER': { icon: '🌲', color: '#10B981', dim: 'rgba(16,185,129,0.12)' },
    'POULTRY & MEAT': { icon: '🐔', color: '#EF4444', dim: 'rgba(239,68,68,0.12)' },
};
