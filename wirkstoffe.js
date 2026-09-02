/* Tagebuch – Wirkstoffe fuer das Thema Medikamente.

   Bewusst Wirkstoffe (INN), keine Handelsnamen: "Ibuprofen" gilt fuer
   Nurofen, Dolormin und zwanzig Generika gleichzeitig. Handelsnamen waeren
   Zehntausende Eintraege, aendern sich staendig und sagen weniger aus.

   Diese Liste ist NICHT vollstaendig - vollstaendig gibt es nur in
   lizenzierten Datenbanken (Rote Liste, ABDA). Sie deckt ab, was in
   Deutschland ueblicherweise verordnet und gekauft wird. Alles andere kann
   frei eingetippt werden und steht danach unter "Zuletzt". */
window.TagebuchWirkstoffe = [
  // Schmerz, Fieber, Entzuendung
  'Paracetamol', 'Ibuprofen', 'Diclofenac', 'Naproxen', 'Acetylsalicylsäure', 'ASS',
  'Metamizol', 'Novaminsulfon', 'Indometacin', 'Etoricoxib', 'Celecoxib', 'Piroxicam',
  'Ketoprofen', 'Dexketoprofen', 'Meloxicam', 'Flurbiprofen', 'Mefenaminsäure',

  // Opioide und Substitution
  'Tramadol', 'Tilidin', 'Codein', 'Dihydrocodein', 'Morphin', 'Oxycodon',
  'Hydromorphon', 'Fentanyl', 'Buprenorphin', 'Tapentadol', 'Piritramid',
  'Pethidin', 'Methadon', 'Levomethadon', 'Naloxon', 'Naltrexon', 'Nalmefen',

  // Benzodiazepine und Z-Substanzen
  'Diazepam', 'Lorazepam', 'Oxazepam', 'Alprazolam', 'Bromazepam', 'Clonazepam',
  'Temazepam', 'Lormetazepam', 'Nitrazepam', 'Flunitrazepam', 'Midazolam',
  'Clobazam', 'Chlordiazepoxid', 'Triazolam', 'Prazepam', 'Clorazepat',
  'Medazepam', 'Brotizolam', 'Flurazepam', 'Zopiclon', 'Zolpidem', 'Zaleplon',

  // Schlaf und Beruhigung ohne Benzo
  'Melatonin', 'Doxylamin', 'Diphenhydramin', 'Promethazin', 'Chloralhydrat',
  'Baldrian', 'Hopfen', 'Passionsblume', 'Lavendelöl', 'Hydroxyzin', 'Opipramol',

  // Antidepressiva
  'Citalopram', 'Escitalopram', 'Sertralin', 'Fluoxetin', 'Paroxetin',
  'Fluvoxamin', 'Venlafaxin', 'Duloxetin', 'Milnacipran', 'Mirtazapin',
  'Bupropion', 'Agomelatin', 'Vortioxetin', 'Trazodon', 'Tianeptin',
  'Amitriptylin', 'Nortriptylin', 'Doxepin', 'Imipramin', 'Clomipramin',
  'Trimipramin', 'Maprotilin', 'Johanniskraut', 'Moclobemid', 'Tranylcypromin',
  'Reboxetin', 'Esketamin', 'Lithium',

  // Antipsychotika
  'Quetiapin', 'Olanzapin', 'Risperidon', 'Aripiprazol', 'Amisulprid',
  'Paliperidon', 'Clozapin', 'Haloperidol', 'Melperon', 'Pipamperon', 'Promazin',
  'Levomepromazin', 'Flupentixol', 'Zuclopenthixol', 'Fluphenazin', 'Perazin',
  'Sulpirid', 'Tiaprid', 'Ziprasidon', 'Lurasidon', 'Cariprazin', 'Brexpiprazol',
  'Chlorprothixen',

  // Antiepileptika
  'Valproat', 'Valproinsäure', 'Lamotrigin', 'Levetiracetam', 'Brivaracetam',
  'Carbamazepin', 'Oxcarbazepin', 'Eslicarbazepin', 'Topiramat', 'Zonisamid',
  'Lacosamid', 'Phenytoin', 'Phenobarbital', 'Primidon', 'Gabapentin',
  'Pregabalin', 'Perampanel', 'Ethosuximid', 'Sultiam', 'Cenobamat',

  // ADHS und Stimulanzien
  'Methylphenidat', 'Lisdexamfetamin', 'Dexamfetamin', 'Atomoxetin', 'Guanfacin',
  'Modafinil', 'Koffein',

  // Parkinson, Demenz, MS, Muskel
  'Levodopa', 'Carbidopa', 'Benserazid', 'Pramipexol', 'Ropinirol', 'Rotigotin',
  'Amantadin', 'Entacapon', 'Rasagilin', 'Selegilin', 'Safinamid', 'Biperiden',
  'Donepezil', 'Rivastigmin', 'Galantamin', 'Memantin', 'Ginkgo',
  'Interferon beta', 'Glatirameracetat', 'Fingolimod', 'Dimethylfumarat',
  'Teriflunomid', 'Natalizumab', 'Ocrelizumab', 'Baclofen', 'Tizanidin',
  'Tolperison', 'Methocarbamol', 'Riluzol',

  // Migräne
  'Sumatriptan', 'Rizatriptan', 'Zolmitriptan', 'Naratriptan', 'Eletriptan',
  'Almotriptan', 'Frovatriptan', 'Flunarizin', 'Erenumab', 'Galcanezumab',
  'Fremanezumab', 'Rimegepant',

  // Herz und Kreislauf
  'Metoprolol', 'Bisoprolol', 'Nebivolol', 'Carvedilol', 'Propranolol',
  'Atenolol', 'Sotalol', 'Ramipril', 'Enalapril', 'Lisinopril', 'Captopril',
  'Perindopril', 'Candesartan', 'Valsartan', 'Losartan', 'Irbesartan',
  'Olmesartan', 'Telmisartan', 'Sacubitril', 'Amlodipin', 'Lercanidipin',
  'Nitrendipin', 'Nifedipin', 'Verapamil', 'Diltiazem', 'Doxazosin', 'Urapidil',
  'Moxonidin', 'Clonidin', 'Ivabradin', 'Digitoxin', 'Digoxin', 'Amiodaron',
  'Flecainid', 'Propafenon', 'Dronedaron', 'Ranolazin', 'Molsidomin',
  'Isosorbidmononitrat', 'Glyceroltrinitrat',

  // Diuretika
  'Hydrochlorothiazid', 'Furosemid', 'Torasemid', 'Spironolacton', 'Eplerenon',
  'Xipamid', 'Indapamid', 'Chlortalidon', 'Amilorid', 'Triamteren',

  // Blut, Gerinnung, Fette
  'Apixaban', 'Rivaroxaban', 'Edoxaban', 'Dabigatran', 'Phenprocoumon',
  'Warfarin', 'Heparin', 'Enoxaparin', 'Tinzaparin', 'Fondaparinux',
  'Clopidogrel', 'Ticagrelor', 'Prasugrel', 'Dipyridamol', 'Simvastatin',
  'Atorvastatin', 'Rosuvastatin', 'Pravastatin', 'Fluvastatin', 'Ezetimib',
  'Fenofibrat', 'Bezafibrat', 'Evolocumab', 'Alirocumab', 'Bempedoinsäure',
  'Eisen', 'Eisensulfat', 'Folsäure',

  // Diabetes
  'Metformin', 'Empagliflozin', 'Dapagliflozin', 'Sitagliptin', 'Linagliptin',
  'Saxagliptin', 'Semaglutid', 'Liraglutid', 'Dulaglutid', 'Tirzepatid',
  'Glimepirid', 'Gliclazid', 'Glibenclamid', 'Pioglitazon', 'Acarbose',
  'Repaglinid', 'Insulin glargin', 'Insulin detemir', 'Insulin degludec',
  'Insulin aspart', 'Insulin lispro', 'Insulin glulisin', 'Humaninsulin',
  'NPH-Insulin',

  // Magen und Darm
  'Pantoprazol', 'Omeprazol', 'Esomeprazol', 'Lansoprazol', 'Rabeprazol',
  'Ranitidin', 'Famotidin', 'Sucralfat', 'Domperidon', 'Metoclopramid', 'MCP',
  'Ondansetron', 'Granisetron', 'Dimenhydrinat', 'Simeticon', 'Butylscopolamin',
  'Mebeverin', 'Loperamid', 'Macrogol', 'Lactulose', 'Bisacodyl',
  'Natriumpicosulfat', 'Mesalazin', 'Sulfasalazin', 'Budesonid', 'Colestyramin',
  'Ursodesoxycholsäure', 'Pankreatin', 'Rifaximin', 'Linaclotid', 'Prucaloprid',

  // Atemwege und Allergie
  'Salbutamol', 'Formoterol', 'Salmeterol', 'Indacaterol', 'Vilanterol',
  'Ipratropium', 'Tiotropium', 'Glycopyrronium', 'Aclidinium', 'Beclometason',
  'Fluticason', 'Mometason', 'Ciclesonid', 'Montelukast', 'Theophyllin',
  'Roflumilast', 'Acetylcystein', 'Ambroxol', 'Bromhexin', 'Dextromethorphan',
  'Noscapin', 'Cetirizin', 'Levocetirizin', 'Loratadin', 'Desloratadin',
  'Fexofenadin', 'Bilastin', 'Rupatadin', 'Dimetinden', 'Azelastin',
  'Xylometazolin', 'Oxymetazolin', 'Omalizumab', 'Dupilumab', 'Mepolizumab',
  'Benralizumab',

  // Antibiotika
  'Amoxicillin', 'Amoxicillin und Clavulansäure', 'Penicillin V',
  'Flucloxacillin', 'Ampicillin', 'Piperacillin', 'Cefuroxim', 'Cefaclor',
  'Cefpodoxim', 'Ceftriaxon', 'Cefixim', 'Doxycyclin', 'Minocyclin',
  'Tetracyclin', 'Azithromycin', 'Clarithromycin', 'Erythromycin',
  'Roxithromycin', 'Clindamycin', 'Ciprofloxacin', 'Levofloxacin',
  'Moxifloxacin', 'Ofloxacin', 'Norfloxacin', 'Cotrimoxazol', 'Trimethoprim',
  'Sulfamethoxazol', 'Nitrofurantoin', 'Fosfomycin', 'Metronidazol',
  'Vancomycin', 'Linezolid', 'Rifampicin', 'Isoniazid', 'Ethambutol',
  'Pyrazinamid', 'Gentamicin', 'Meropenem', 'Mupirocin',

  // Viren und Pilze
  'Aciclovir', 'Valaciclovir', 'Famciclovir', 'Brivudin', 'Oseltamivir',
  'Nirmatrelvir', 'Ritonavir', 'Remdesivir', 'Tenofovir', 'Emtricitabin',
  'Dolutegravir', 'Bictegravir', 'Sofosbuvir', 'Fluconazol', 'Itraconazol',
  'Terbinafin', 'Clotrimazol', 'Nystatin', 'Ciclopirox', 'Miconazol',
  'Voriconazol',

  // Schilddrüse, Kortison, Hormone
  'Levothyroxin', 'L-Thyroxin', 'Carbimazol', 'Thiamazol', 'Propylthiouracil',
  'Jodid', 'Prednisolon', 'Prednison', 'Methylprednisolon', 'Dexamethason',
  'Hydrocortison', 'Fludrocortison', 'Estradiol', 'Estriol', 'Ethinylestradiol',
  'Levonorgestrel', 'Desogestrel', 'Drospirenon', 'Dienogest', 'Norethisteron',
  'Progesteron', 'Testosteron', 'Cyproteron', 'Tibolon', 'Ulipristal',
  'Cabergolin', 'Bromocriptin', 'Desmopressin', 'Somatropin',

  // Urologie
  'Tamsulosin', 'Alfuzosin', 'Silodosin', 'Finasterid', 'Dutasterid',
  'Solifenacin', 'Tolterodin', 'Darifenacin', 'Trospiumchlorid', 'Mirabegron',
  'Oxybutynin', 'Sildenafil', 'Tadalafil', 'Vardenafil', 'Clomifen',

  // Rheuma, Gicht, Knochen, Immunsystem
  'Methotrexat', 'Leflunomid', 'Hydroxychloroquin', 'Azathioprin', 'Ciclosporin',
  'Mycophenolat', 'Tacrolimus', 'Adalimumab', 'Etanercept', 'Infliximab',
  'Tocilizumab', 'Rituximab', 'Secukinumab', 'Ustekinumab', 'Upadacitinib',
  'Baricitinib', 'Tofacitinib', 'Apremilast', 'Allopurinol', 'Febuxostat',
  'Colchicin', 'Alendronsäure', 'Risedronsäure', 'Zoledronsäure', 'Denosumab',
  'Teriparatid', 'Calcium', 'Vitamin D', 'Colecalciferol', 'Calcitriol',

  // Haut und Augen
  'Isotretinoin', 'Adapalen', 'Benzoylperoxid', 'Tretinoin', 'Betamethason',
  'Mometasonfuroat', 'Hydrocortisonacetat', 'Pimecrolimus', 'Harnstoff',
  'Dexpanthenol', 'Zinkoxid', 'Latanoprost', 'Timolol', 'Brimonidin',
  'Dorzolamid', 'Brinzolamid', 'Bimatoprost', 'Künstliche Tränen',

  // Vitamine, Mineralstoffe, Sonstiges
  'Vitamin B12', 'Cyanocobalamin', 'Vitamin B1', 'Thiamin', 'Vitamin B6',
  'Pyridoxin', 'Vitamin C', 'Vitamin E', 'Vitamin K', 'Magnesium', 'Kalium',
  'Zink', 'Selen', 'Omega-3', 'Biotin', 'Kochsalzlösung',
  'Nikotinersatz', 'Nikotinpflaster', 'Vareniclin', 'Cytisin',
  'Cannabidiol', 'Dronabinol', 'Medizinalcannabis'
];

/* Handelsnamen -> Wirkstoff.

   Leute kennen ihre Packung, nicht den Wirkstoff. Wer "Ozempic" tippt,
   soll Semaglutid finden. Gespeichert wird trotzdem der Wirkstoff, sonst
   stehen im Tagebuch fuenf Namen fuer dasselbe Mittel.

   Auch das ist eine Auswahl, keine Vollstaendigkeit - die gaengigsten
   Praeparate in Deutschland. */
window.TagebuchHandelsnamen = {
  'Nurofen':'Ibuprofen','Dolormin':'Ibuprofen','Aktren':'Ibuprofen','Ibuflam':'Ibuprofen',
  'ben-u-ron':'Paracetamol','Grippostad':'Paracetamol','Thomapyrin':'Acetylsalicylsäure',
  'Aspirin':'Acetylsalicylsäure','ASS ratiopharm':'Acetylsalicylsäure',
  'Novalgin':'Metamizol','Berlosin':'Metamizol','Voltaren':'Diclofenac','Diclac':'Diclofenac',
  'Arthotec':'Diclofenac','Dolobene':'Diclofenac','Aleve':'Naproxen','Arcoxia':'Etoricoxib',
  'Celebrex':'Celecoxib',
  'Tramal':'Tramadol','Tramundin':'Tramadol','Valoron':'Tilidin','Targin':'Oxycodon',
  'Oxygesic':'Oxycodon','Palladon':'Hydromorphon','Jurnista':'Hydromorphon',
  'Durogesic':'Fentanyl','Temgesic':'Buprenorphin','Subutex':'Buprenorphin',
  'Suboxone':'Buprenorphin','Palexia':'Tapentadol','MST':'Morphin','Sevredol':'Morphin',
  'Polamidon':'Levomethadon','Nalorex':'Naltrexon','Selincro':'Nalmefen',
  'Valium':'Diazepam','Faustan':'Diazepam','Diazep':'Diazepam','Tavor':'Lorazepam',
  'Tafil':'Alprazolam','Xanax':'Alprazolam','Rivotril':'Clonazepam','Lexotanil':'Bromazepam',
  'Adumbran':'Oxazepam','Praxiten':'Oxazepam','Noctamid':'Lormetazepam','Radedorm':'Nitrazepam',
  'Rohypnol':'Flunitrazepam','Dormicum':'Midazolam','Frisium':'Clobazam','Halcion':'Triazolam',
  'Ximovan':'Zopiclon','Bikalm':'Zolpidem','Stilnox':'Zolpidem','Sonata':'Zaleplon',
  'Vivinox':'Doxylamin','Hoggar':'Doxylamin','Atosil':'Promethazin','Circadin':'Melatonin',
  'Cipralex':'Escitalopram','Zoloft':'Sertralin','Fluctin':'Fluoxetin','Seroxat':'Paroxetin',
  'Trevilor':'Venlafaxin','Cymbalta':'Duloxetin','Remergil':'Mirtazapin','Elontril':'Bupropion',
  'Zyban':'Bupropion','Valdoxan':'Agomelatin','Brintellix':'Vortioxetin','Trittico':'Trazodon',
  'Saroten':'Amitriptylin','Anafranil':'Clomipramin','Aponal':'Doxepin','Stangyl':'Trimipramin',
  'Laif':'Johanniskraut','Jarsin':'Johanniskraut','Quilonum':'Lithium','Spravato':'Esketamin',
  'Seroquel':'Quetiapin','Zyprexa':'Olanzapin','Risperdal':'Risperidon','Abilify':'Aripiprazol',
  'Solian':'Amisulprid','Xeplion':'Paliperidon','Leponex':'Clozapin','Haldol':'Haloperidol',
  'Dipiperon':'Pipamperon','Neurocil':'Levomepromazin','Fluanxol':'Flupentixol','Truxal':'Chlorprothixen',
  'Ergenyl':'Valproat','Orfiril':'Valproat','Lamictal':'Lamotrigin','Keppra':'Levetiracetam',
  'Briviact':'Brivaracetam','Tegretal':'Carbamazepin','Timonil':'Carbamazepin','Trileptal':'Oxcarbazepin',
  'Topamax':'Topiramat','Vimpat':'Lacosamid','Neurontin':'Gabapentin','Lyrica':'Pregabalin',
  'Ritalin':'Methylphenidat','Medikinet':'Methylphenidat','Concerta':'Methylphenidat',
  'Equasym':'Methylphenidat','Elvanse':'Lisdexamfetamin','Attentin':'Dexamfetamin',
  'Strattera':'Atomoxetin','Intuniv':'Guanfacin','Vigil':'Modafinil',
  'Madopar':'Levodopa','Stalevo':'Levodopa','Sifrol':'Pramipexol','Requip':'Ropinirol',
  'Neupro':'Rotigotin','Azilect':'Rasagilin','Aricept':'Donepezil','Exelon':'Rivastigmin',
  'Axura':'Memantin','Ebixa':'Memantin','Lioresal':'Baclofen','Sirdalud':'Tizanidin',
  'Ortoton':'Methocarbamol','Copaxone':'Glatirameracetat','Gilenya':'Fingolimod',
  'Tecfidera':'Dimethylfumarat','Tysabri':'Natalizumab','Ocrevus':'Ocrelizumab',
  'Imigran':'Sumatriptan','Maxalt':'Rizatriptan','AscoTop':'Zolmitriptan','Relpax':'Eletriptan',
  'Aimovig':'Erenumab','Emgality':'Galcanezumab','Ajovy':'Fremanezumab','Sibelium':'Flunarizin',
  'Beloc':'Metoprolol','Concor':'Bisoprolol','Nebilet':'Nebivolol','Dilatrend':'Carvedilol',
  'Dociton':'Propranolol','Delix':'Ramipril','Xanef':'Enalapril','Blopress':'Candesartan',
  'Diovan':'Valsartan','Lorzaar':'Losartan','Micardis':'Telmisartan','Entresto':'Sacubitril',
  'Norvasc':'Amlodipin','Isoptin':'Verapamil','Adalat':'Nifedipin','Ebrantil':'Urapidil',
  'Catapresan':'Clonidin','Procoralan':'Ivabradin','Cordarex':'Amiodaron',
  'Lasix':'Furosemid','Torem':'Torasemid','Unat':'Torasemid','Aldactone':'Spironolacton',
  'Inspra':'Eplerenon','Esidrix':'Hydrochlorothiazid',
  'Eliquis':'Apixaban','Xarelto':'Rivaroxaban','Lixiana':'Edoxaban','Pradaxa':'Dabigatran',
  'Marcumar':'Phenprocoumon','Falithrom':'Phenprocoumon','Clexane':'Enoxaparin',
  'Plavix':'Clopidogrel','Iscover':'Clopidogrel','Brilique':'Ticagrelor','Efient':'Prasugrel',
  'Zocor':'Simvastatin','Sortis':'Atorvastatin','Crestor':'Rosuvastatin','Ezetrol':'Ezetimib',
  'Repatha':'Evolocumab','Praluent':'Alirocumab',
  'Glucophage':'Metformin','Siofor':'Metformin','Jardiance':'Empagliflozin','Forxiga':'Dapagliflozin',
  'Januvia':'Sitagliptin','Trajenta':'Linagliptin','Ozempic':'Semaglutid','Wegovy':'Semaglutid',
  'Rybelsus':'Semaglutid','Victoza':'Liraglutid','Saxenda':'Liraglutid','Trulicity':'Dulaglutid',
  'Mounjaro':'Tirzepatid','Amaryl':'Glimepirid','Lantus':'Insulin glargin','Toujeo':'Insulin glargin',
  'Levemir':'Insulin detemir','Tresiba':'Insulin degludec','NovoRapid':'Insulin aspart',
  'Humalog':'Insulin lispro','Apidra':'Insulin glulisin',
  'Pantozol':'Pantoprazol','Antra':'Omeprazol','Nexium':'Esomeprazol','Zantic':'Ranitidin',
  'Motilium':'Domperidon','Paspertin':'Metoclopramid','Zofran':'Ondansetron','Vomex':'Dimenhydrinat',
  'Lefax':'Simeticon','Buscopan':'Butylscopolamin','Duspatal':'Mebeverin','Imodium':'Loperamid',
  'Movicol':'Macrogol','Laxoberal':'Natriumpicosulfat','Dulcolax':'Bisacodyl','Salofalk':'Mesalazin',
  'Pentasa':'Mesalazin','Entocort':'Budesonid','Kreon':'Pankreatin','Ursofalk':'Ursodesoxycholsäure',
  'Sultanol':'Salbutamol','Salbutamol Ratio':'Salbutamol','Foradil':'Formoterol','Serevent':'Salmeterol',
  'Symbicort':'Formoterol','Viani':'Fluticason','Flutide':'Fluticason','Atrovent':'Ipratropium',
  'Spiriva':'Tiotropium','Singulair':'Montelukast','Bronchoretard':'Theophyllin',
  'ACC':'Acetylcystein','Mucosolvan':'Ambroxol','Wick MediNait':'Doxylamin',
  'Zyrtec':'Cetirizin','Xusal':'Levocetirizin','Lorano':'Loratadin','Aerius':'Desloratadin',
  'Telfast':'Fexofenadin','Fenistil':'Dimetinden','Otriven':'Xylometazolin','Nasic':'Xylometazolin',
  'Xolair':'Omalizumab','Dupixent':'Dupilumab','Nucala':'Mepolizumab',
  'Amoxi':'Amoxicillin','Augmentan':'Amoxicillin und Clavulansäure','Isocillin':'Penicillin V',
  'Elobact':'Cefuroxim','Rocephin':'Ceftriaxon','Doxyhexal':'Doxycyclin','Zithromax':'Azithromycin',
  'Klacid':'Clarithromycin','Sobelin':'Clindamycin','Ciprobay':'Ciprofloxacin','Tavanic':'Levofloxacin',
  'Avalox':'Moxifloxacin','Cotrim':'Cotrimoxazol','Furadantin':'Nitrofurantoin','Monuril':'Fosfomycin',
  'Clont':'Metronidazol','Zyvoxid':'Linezolid',
  'Zovirax':'Aciclovir','Valtrex':'Valaciclovir','Tamiflu':'Oseltamivir','Paxlovid':'Nirmatrelvir',
  'Diflucan':'Fluconazol','Lamisil':'Terbinafin','Canesten':'Clotrimazol','Batrafen':'Ciclopirox',
  'Euthyrox':'Levothyroxin','L-Thyrox':'Levothyroxin','Eferox':'Levothyroxin','Carbimazol Henning':'Carbimazol',
  'Thyrozol':'Thiamazol','Decortin':'Prednison','Decortin H':'Prednisolon','Urbason':'Methylprednisolon',
  'Fortecortin':'Dexamethason','Hydrocortison Hoechst':'Hydrocortison','Estrifam':'Estradiol',
  'Maxim':'Dienogest','Valette':'Dienogest','Yasmin':'Drospirenon','Yaz':'Drospirenon',
  'Cerazette':'Desogestrel','Utrogest':'Progesteron','Nebido':'Testosteron','Androgel':'Testosteron',
  'ellaOne':'Ulipristal','Dostinex':'Cabergolin','Minirin':'Desmopressin',
  'Omnic':'Tamsulosin','Alna':'Tamsulosin','Propecia':'Finasterid','Proscar':'Finasterid',
  'Avodart':'Dutasterid','Vesikur':'Solifenacin','Detrusitol':'Tolterodin','Betmiga':'Mirabegron',
  'Viagra':'Sildenafil','Cialis':'Tadalafil','Levitra':'Vardenafil',
  'Lantarel':'Methotrexat','Arava':'Leflunomid','Quensyl':'Hydroxychloroquin','Imurek':'Azathioprin',
  'Sandimmun':'Ciclosporin','CellCept':'Mycophenolat','Prograf':'Tacrolimus','Humira':'Adalimumab',
  'Enbrel':'Etanercept','Remicade':'Infliximab','RoActemra':'Tocilizumab','MabThera':'Rituximab',
  'Cosentyx':'Secukinumab','Stelara':'Ustekinumab','Rinvoq':'Upadacitinib','Olumiant':'Baricitinib',
  'Xeljanz':'Tofacitinib','Otezla':'Apremilast','Zyloric':'Allopurinol','Adenuric':'Febuxostat',
  'Fosamax':'Alendronsäure','Aclasta':'Zoledronsäure','Prolia':'Denosumab','Forsteo':'Teriparatid',
  'Vigantol':'Colecalciferol','Dekristol':'Colecalciferol','Rocaltrol':'Calcitriol',
  'Aknenormin':'Isotretinoin','Isoderm':'Isotretinoin','Differin':'Adapalen','Cordes BPO':'Benzoylperoxid',
  'Advantan':'Mometasonfuroat','Elidel':'Pimecrolimus','Protopic':'Tacrolimus','Bepanthen':'Dexpanthenol',
  'Xalatan':'Latanoprost','Timo-Comod':'Timolol','Alphagan':'Brimonidin','Trusopt':'Dorzolamid',
  'Nicorette':'Nikotinersatz','Nikofrenon':'Nikotinpflaster','Champix':'Vareniclin','Asmoken':'Cytisin',
  'Epidyolex':'Cannabidiol','Sativex':'Cannabidiol','Canemes':'Dronabinol'
};
