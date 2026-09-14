/* eslint-env node */
const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../i18n/locales');

const tabsTranslations = {
  ar: { home: "\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629", shop: "\u0627\u0644\u0645\u062a\u062c\u0631", play: "\u0627\u0644\u0639\u0628", lab: "\u0627\u0644\u0645\u062e\u062a\u0628\u0631", social: "\u0627\u0644\u0631\u062a\u0628" },
  de: { home: "Start", shop: "Laden", play: "Spielen", lab: "Labor", social: "R\u00e4nge" },
  el: { home: "\u0391\u03c1\u03c7\u03b9\u03ba\u03ae", shop: "\u039a\u03b1\u03c4\u03ac\u03c3\u03c4\u03b7\u03bc\u03b1", play: "\u03a0\u03b1\u03af\u03be\u03b5", lab: "\u0395\u03c1\u03b3\u03b1\u03c3\u03c4\u03ae\u03c1\u03b9\u03bf", social: "\u039a\u03b1\u03c4\u03ac\u03c4\u03b1\u03be\u03b7" },
  en: { home: "Home", shop: "Shop", play: "Play", lab: "Lab", social: "Ranks" },
  es: { home: "Inicio", shop: "Tienda", play: "Jugar", lab: "Lab", social: "Rangos" },
  fr: { home: "Accueil", shop: "Boutique", play: "Jouer", lab: "Labo", social: "Classement" },
  hi: { home: "\u0939\u094b\u092e", shop: "\u0926\u0941\u0915\u093e\u0928", play: "\u0916\u0947\u0932\u0947\u0902", lab: "\u0932\u0948\u092c", social: "\u0930\u0948\u0902\u0915" },
  id: { home: "Beranda", shop: "Toko", play: "Main", lab: "Lab", social: "Peringkat" },
  it: { home: "Home", shop: "Negozio", play: "Gioca", lab: "Lab", social: "Classifiche" },
  ja: { home: "\u30db\u30fc\u30e0", shop: "\u30b7\u30e7\u30c3\u30d7", play: "\u30d7\u30ec\u30a4", lab: "\u30e9\u30dc", social: "\u30e9\u30f3\u30af" },
  ko: { home: "\ud648", shop: "\uc0c1\uc810", play: "\ud50c\ub808\uc774", lab: "\uc5f0\uad6c\uc18c", social: "\ub791\ud0b9" },
  ms: { home: "Utama", shop: "Kedai", play: "Main", lab: "Lab", social: "Kedudukan" },
  nl: { home: "Home", shop: "Winkel", play: "Spelen", lab: "Lab", social: "Rangen" },
  pl: { home: "G\u0142\u00f3wna", shop: "Sklep", play: "Graj", lab: "Lab", social: "Rangi" },
  pt: { home: "In\u00edcio", shop: "Loja", play: "Jogar", lab: "Lab", social: "Classifica\u00e7\u00e3o" },
  ru: { home: "\u0413\u043b\u0430\u0432\u043d\u0430\u044f", shop: "\u041c\u0430\u0433\u0430\u0437\u0438\u043d", play: "\u0418\u0433\u0440\u0430\u0442\u044c", lab: "\u041b\u0430\u0431", social: "\u0420\u0435\u0439\u0442\u0438\u043d\u0433" },
  th: { home: "\u0e2b\u0e19\u0e49\u0e32\u0e2b\u0e25\u0e31\u0e01", shop: "\u0e23\u0e49\u0e32\u0e19\u0e04\u0e49\u0e32", play: "\u0e40\u0e25\u0e48\u0e19", lab: "\u0e41\u0e25\u0e47\u0e1a", social: "\u0e2d\u0e31\u0e19\u0e14\u0e31\u0e1a" },
  tr: { home: "Ana Sayfa", shop: "Ma\u011faza", play: "Oyna", lab: "Lab", social: "S\u0131ralama" },
  vi: { home: "Trang ch\u1ee7", shop: "C\u1eeda h\u00e0ng", play: "Ch\u01a1i", lab: "Lab", social: "X\u1ebfp h\u1ea1ng" },
  zh: { home: "\u4e3b\u9875", shop: "\u5546\u5e97", play: "\u6e38\u620f", lab: "\u5b9e\u9a8c\u5ba4", social: "\u6392\u540d" },
};

const homeExtras = {
  ar: { rejoinMatch: "\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645", rejoin: "\u0627\u0646\u0636\u0645", vs: "\u0636\u062f", league: "\u0627\u0644\u062f\u0648\u0631\u064a", peak: "\u0627\u0644\u0630\u0631\u0648\u0629:" },
  de: { rejoinMatch: "Match fortsetzen", rejoin: "Weitermachen", vs: "vs", league: "Liga", peak: "H\u00f6chstwert:" },
  el: { rejoinMatch: "\u0395\u03c0\u03b1\u03bd\u03ad\u03bd\u03c4\u03b1\u03be\u03b7", rejoin: "\u0395\u03c0\u03b1\u03bd\u03ad\u03bd\u03c4\u03b1\u03be\u03b7", vs: "\u03b5\u03bd\u03b1\u03bd\u03c4\u03af\u03bf\u03bd", league: "\u039b\u03af\u03b3\u03ba\u03b1", peak: "\u039a\u03bf\u03c1\u03c5\u03c6\u03ae:" },
  en: { rejoinMatch: "Rejoin Match", rejoin: "Rejoin", vs: "vs", league: "League", peak: "Peak:" },
  es: { rejoinMatch: "Reincorporarse", rejoin: "Reincorporarse", vs: "vs", league: "Liga", peak: "M\u00e1ximo:" },
  fr: { rejoinMatch: "Rejoindre", rejoin: "Rejoindre", vs: "vs", league: "Ligue", peak: "Sommet :" },
  hi: { rejoinMatch: "\u092e\u0948\u091a \u092e\u0947\u0902 \u0935\u093e\u092a\u0938", rejoin: "\u0935\u093e\u092a\u0938 \u091c\u093e\u090f\u0902", vs: "\u092c\u0928\u093e\u092e", league: "\u0932\u0940\u0917", peak: "\u0936\u093f\u0916\u0930:" },
  id: { rejoinMatch: "Bergabung Kembali", rejoin: "Bergabung", vs: "vs", league: "Liga", peak: "Puncak:" },
  it: { rejoinMatch: "Rientra", rejoin: "Rientra", vs: "vs", league: "Lega", peak: "Massimo:" },
  ja: { rejoinMatch: "\u8a66\u5408\u306b\u623b\u308b", rejoin: "\u623b\u308b", vs: "vs", league: "\u30ea\u30fc\u30b0", peak: "\u6700\u9ad8:" },
  ko: { rejoinMatch: "\uac8c\uc784 \ubcf5\uadc0", rejoin: "\ubcf5\uadc0", vs: "vs", league: "\ub9ac\uadf8", peak: "\ucd5c\uace0:" },
  ms: { rejoinMatch: "Sertai Semula", rejoin: "Sertai", vs: "vs", league: "Liga", peak: "Puncak:" },
  nl: { rejoinMatch: "Hervatten", rejoin: "Hervatten", vs: "vs", league: "Liga", peak: "Piek:" },
  pl: { rejoinMatch: "Wr\u00f3\u0107 do meczu", rejoin: "Wr\u00f3\u0107", vs: "vs", league: "Liga", peak: "Szczyt:" },
  pt: { rejoinMatch: "Voltar ao jogo", rejoin: "Voltar", vs: "vs", league: "Liga", peak: "M\u00e1ximo:" },
  ru: { rejoinMatch: "\u0412\u0435\u0440\u043d\u0443\u0442\u044c\u0441\u044f \u0432 \u043c\u0430\u0442\u0447", rejoin: "\u0412\u0435\u0440\u043d\u0443\u0442\u044c\u0441\u044f", vs: "vs", league: "\u041b\u0438\u0433\u0430", peak: "\u041f\u0438\u043a:" },
  th: { rejoinMatch: "\u0e01\u0e25\u0e31\u0e1a\u0e40\u0e02\u0e49\u0e32\u0e40\u0e01\u0e21", rejoin: "\u0e01\u0e25\u0e31\u0e1a", vs: "vs", league: "\u0e25\u0e35\u0e01", peak: "\u0e2a\u0e39\u0e07\u0e2a\u0e38\u0e14:" },
  tr: { rejoinMatch: "Ma\u00e7a D\u00f6n", rejoin: "D\u00f6n", vs: "vs", league: "Lig", peak: "Zirve:" },
  vi: { rejoinMatch: "Quay l\u1ea1i tr\u1eadn", rejoin: "Quay l\u1ea1i", vs: "vs", league: "Gi\u1ea3i \u0111\u1ea5u", peak: "\u0110\u1ec9nh:" },
  zh: { rejoinMatch: "\u91cd\u65b0\u52a0\u5165", rejoin: "\u91cd\u65b0\u52a0\u5165", vs: "vs", league: "\u8054\u8d5b", peak: "\u5cf0\u5024\uff1a" },
};

const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

files.forEach(file => {
  const locale = file.replace('.json', '');
  const filePath = path.join(localesDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (!data.tabs) {
    data.tabs = tabsTranslations[locale] || tabsTranslations.en;
  }

  const extras = homeExtras[locale] || homeExtras.en;
  if (!data.home.rejoinMatch) data.home.rejoinMatch = extras.rejoinMatch;
  if (!data.home.rejoin) data.home.rejoin = extras.rejoin;
  if (!data.home.vs) data.home.vs = extras.vs;
  if (!data.home.league) data.home.league = extras.league;
  if (!data.home.peak) data.home.peak = extras.peak;

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log('Updated', file);
});

console.log('Done!');
