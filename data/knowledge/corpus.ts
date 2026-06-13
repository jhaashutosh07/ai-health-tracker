// Curated medical reference corpus for retrieval-augmented generation.
//
// IMPORTANT: these are concise, curated summaries written to align with public
// guidance from the cited sources (NHS, MedlinePlus, WHO, ICMR). They are NOT
// verbatim quotes and have NOT been clinically reviewed. Before any real-world
// use, each entry should be verified/expanded by a qualified clinician and the
// citations checked. The `url` points to the source's topic page as a pointer.
//
// Keep each entry short (a single retrievable chunk, ~80-160 words).

export interface KnowledgeDoc {
  id: string
  title: string
  source: string // e.g. "NHS", "MedlinePlus", "WHO", "ICMR"
  url: string
  tags: string[]
  text: string
}

export const CORPUS: KnowledgeDoc[] = [
  {
    id: 'common-cold',
    title: 'Common cold',
    source: 'NHS',
    url: 'https://www.nhs.uk/conditions/common-cold/',
    tags: ['cold', 'runny nose', 'sore throat', 'cough', 'sneezing'],
    text: 'The common cold is a mild viral infection of the nose and throat. Typical symptoms include a blocked or runny nose, sneezing, sore throat, cough and mild tiredness, usually settling within 1–2 weeks. It is self-limiting; antibiotics do not help because it is viral. Self-care includes rest, fluids, and paracetamol or ibuprofen for aches or fever. Seek medical advice if symptoms last beyond three weeks, breathing becomes difficult, or a high fever does not improve.',
  },
  {
    id: 'influenza',
    title: 'Influenza (flu)',
    source: 'NHS',
    url: 'https://www.nhs.uk/conditions/flu/',
    tags: ['flu', 'fever', 'body ache', 'influenza'],
    text: 'Flu comes on suddenly with high fever, body aches, fatigue, dry cough and sore throat, and tends to be more severe than a cold. Most people recover with rest and fluids in about a week. Paracetamol can ease fever and aches. People at higher risk (elderly, pregnant, chronic illness) should seek advice early. Urgent care is needed for difficulty breathing, chest pain, or sudden confusion.',
  },
  {
    id: 'migraine',
    title: 'Migraine',
    source: 'NHS',
    url: 'https://www.nhs.uk/conditions/migraine/',
    tags: ['migraine', 'headache', 'one-sided', 'nausea', 'light sensitivity'],
    text: 'A migraine is usually a moderate to severe throbbing headache, often on one side, that can come with nausea and sensitivity to light or sound. Attacks last hours to a few days. Triggers include stress, certain foods, dehydration and poor sleep. Treatment includes resting in a dark quiet room and pain relief such as paracetamol or ibuprofen; frequent attacks may need preventive treatment from a doctor. Sudden "worst-ever" headache, weakness, or speech problems are red flags needing emergency care.',
  },
  {
    id: 'tension-headache',
    title: 'Tension-type headache',
    source: 'MedlinePlus',
    url: 'https://medlineplus.gov/headache.html',
    tags: ['tension headache', 'headache', 'stress'],
    text: 'Tension-type headache is the most common headache, felt as a dull, pressing, band-like tightness around the head, often linked to stress, screen time or poor posture. It is not usually associated with nausea or light sensitivity. It typically responds to rest, hydration, stress reduction and occasional simple painkillers. Frequent need for painkillers can cause medication-overuse headache, so persistent or worsening headaches should be reviewed by a doctor.',
  },
  {
    id: 'gastroenteritis',
    title: 'Gastroenteritis (stomach bug)',
    source: 'NHS',
    url: 'https://www.nhs.uk/conditions/diarrhoea-and-vomiting/',
    tags: ['gastroenteritis', 'diarrhea', 'vomiting', 'stomach', 'food poisoning'],
    text: 'Gastroenteritis causes diarrhoea and/or vomiting, usually from a viral or bacterial infection, and most cases improve within a week without specific treatment. The main risk is dehydration, so frequent sips of fluid and oral rehydration solution (ORS) are important. Seek medical care for blood in stool, persistent high fever, signs of dehydration (very little urine, dizziness), or symptoms lasting more than a few days. Antibiotics are only needed for specific bacterial causes.',
  },
  {
    id: 'oral-rehydration',
    title: 'Dehydration and oral rehydration (ORS)',
    source: 'WHO',
    url: 'https://www.who.int/health-topics/diarrhoea',
    tags: ['dehydration', 'ors', 'fluids', 'diarrhea'],
    text: 'Dehydration from diarrhoea or vomiting is treated by replacing lost fluids and salts. Oral rehydration solution (ORS) is the first-line treatment and can be lifesaving, especially in children. Give frequent small amounts even if vomiting. Warning signs of significant dehydration include sunken eyes, very little or dark urine, lethargy, and in children no tears when crying — these need prompt medical attention. Plain water alone does not replace lost salts as effectively as ORS.',
  },
  {
    id: 'dengue',
    title: 'Dengue fever',
    source: 'WHO',
    url: 'https://www.who.int/news-room/fact-sheets/detail/dengue-and-severe-dengue',
    tags: ['dengue', 'fever', 'mosquito', 'platelets'],
    text: 'Dengue is a mosquito-borne viral infection causing high fever, severe headache, pain behind the eyes, muscle and joint pain, and sometimes a rash. Most people recover with rest, fluids and paracetamol. Avoid ibuprofen and aspirin, which increase bleeding risk. Warning signs of severe dengue — severe abdominal pain, persistent vomiting, bleeding gums, blood in vomit, restlessness — typically appear as the fever falls and require urgent hospital care.',
  },
  {
    id: 'hypertension',
    title: 'High blood pressure (hypertension)',
    source: 'NHS',
    url: 'https://www.nhs.uk/conditions/high-blood-pressure-hypertension/',
    tags: ['hypertension', 'blood pressure', 'bp'],
    text: 'High blood pressure often has no symptoms but raises the long-term risk of heart attack and stroke. A normal reading is below 120/80 mmHg; readings consistently at or above 140/90 mmHg suggest hypertension. It is managed with reduced salt, regular physical activity, healthy weight, limiting alcohol, not smoking, and medication when needed. Readings of 180/120 mmHg or higher, especially with chest pain, breathlessness or visual changes, need emergency assessment.',
  },
  {
    id: 'type2-diabetes',
    title: 'Type 2 diabetes',
    source: 'NHS',
    url: 'https://www.nhs.uk/conditions/type-2-diabetes/',
    tags: ['diabetes', 'blood sugar', 'glucose'],
    text: 'Type 2 diabetes means blood glucose is too high because the body cannot use insulin properly. Symptoms can include increased thirst, frequent urination, tiredness and blurred vision. Management focuses on a balanced diet, physical activity, weight control, and medication such as metformin when needed. Fasting glucose is generally kept around 80–130 mg/dL. Very high glucose with vomiting, rapid breathing and drowsiness can indicate a diabetic emergency requiring immediate care.',
  },
  {
    id: 'uti',
    title: 'Urinary tract infection (UTI)',
    source: 'NHS',
    url: 'https://www.nhs.uk/conditions/urinary-tract-infections-utis/',
    tags: ['uti', 'urine', 'burning', 'cystitis'],
    text: 'A urinary tract infection commonly causes burning on urination, needing to urinate more often and urgently, cloudy or strong-smelling urine, and lower abdominal discomfort. Many cases need antibiotics from a doctor; drinking plenty of fluids helps. Seek prompt care if there is fever, back/flank pain, blood in urine, or symptoms in pregnancy, as the infection may have reached the kidneys.',
  },
  {
    id: 'asthma',
    title: 'Asthma',
    source: 'NHS',
    url: 'https://www.nhs.uk/conditions/asthma/',
    tags: ['asthma', 'wheeze', 'breathless', 'inhaler'],
    text: 'Asthma is a long-term condition causing wheezing, breathlessness, chest tightness and cough due to narrowed airways. It is managed with reliever inhalers for symptoms and preventer inhalers to reduce inflammation. A flare-up that does not improve with the reliever inhaler, difficulty speaking in full sentences, or lips turning blue is a medical emergency requiring immediate help.',
  },
  {
    id: 'paracetamol-safety',
    title: 'Paracetamol (acetaminophen) safe use',
    source: 'NHS',
    url: 'https://www.nhs.uk/medicines/paracetamol-for-adults/',
    tags: ['paracetamol', 'acetaminophen', 'dolo', 'crocin', 'dosage', 'fever', 'pain'],
    text: 'Paracetamol relieves mild to moderate pain and fever. A typical adult dose is 500–1000 mg every 4–6 hours, not exceeding 4000 mg (4 g) in 24 hours. Exceeding this can cause serious liver damage. Check other combination medicines (cold and flu remedies) as they may also contain paracetamol, to avoid accidental overdose. People with liver disease or who drink alcohol heavily should seek advice before use.',
  },
  {
    id: 'nsaid-caution',
    title: 'Ibuprofen and NSAID caution',
    source: 'NHS',
    url: 'https://www.nhs.uk/medicines/ibuprofen-for-adults/',
    tags: ['ibuprofen', 'nsaid', 'painkiller', 'stomach', 'combiflam'],
    text: 'Ibuprofen is an anti-inflammatory painkiller useful for pain, fever and inflammation. Take it with or after food to reduce stomach irritation. It should be used with caution or avoided in people with stomach ulcers, kidney disease, heart failure, uncontrolled high blood pressure, or in dengue (bleeding risk). Long-term or high-dose use raises the risk of stomach bleeding and kidney problems, so use the lowest effective dose for the shortest time.',
  },
  {
    id: 'antibiotic-use',
    title: 'Appropriate antibiotic use',
    source: 'WHO',
    url: 'https://www.who.int/news-room/fact-sheets/detail/antimicrobial-resistance',
    tags: ['antibiotics', 'antibiotic resistance', 'infection'],
    text: 'Antibiotics treat bacterial infections and do not work against viruses such as colds and most sore throats or flu. Taking antibiotics when they are not needed, or not completing a prescribed course, drives antibiotic resistance, making future infections harder to treat. Antibiotics should only be taken when prescribed by a qualified healthcare professional, and the full course should be completed as directed.',
  },
  {
    id: 'allergic-rhinitis',
    title: 'Allergic rhinitis (hay fever)',
    source: 'MedlinePlus',
    url: 'https://medlineplus.gov/hayfever.html',
    tags: ['allergy', 'hay fever', 'sneezing', 'itchy eyes', 'rhinitis'],
    text: 'Allergic rhinitis is an allergic reaction causing sneezing, a runny or blocked nose, and itchy, watery eyes, often triggered by pollen, dust mites or pet dander. It is not an infection. It can be managed by avoiding triggers and using antihistamines or steroid nasal sprays. See a doctor if symptoms are severe, persistent, or interfere with sleep and daily activities despite treatment.',
  },
  {
    id: 'gerd',
    title: 'Acid reflux and heartburn (GERD)',
    source: 'NHS',
    url: 'https://www.nhs.uk/conditions/heartburn-and-acid-reflux/',
    tags: ['acidity', 'heartburn', 'reflux', 'gerd', 'indigestion'],
    text: 'Acid reflux causes a burning feeling in the chest (heartburn), an acidic taste, and discomfort that is often worse after eating or when lying down. Helpful measures include smaller meals, not eating late at night, raising the head of the bed, and avoiding triggers like spicy or fatty food. Antacids and acid-reducing medicines can help. Because chest pain can also be cardiac, sudden or severe chest pain with sweating or breathlessness should be treated as an emergency.',
  },
  {
    id: 'back-pain',
    title: 'Low back pain',
    source: 'NHS',
    url: 'https://www.nhs.uk/conditions/back-pain/',
    tags: ['back pain', 'lumbar', 'muscle strain'],
    text: 'Most low back pain is mechanical and improves within a few weeks. Staying active, gentle stretching, and short-term pain relief usually help more than bed rest. Seek urgent care for "red flag" features: numbness around the genitals or buttocks, loss of bladder or bowel control, leg weakness, fever, or pain after a serious injury, which can indicate a more serious problem.',
  },
  {
    id: 'emergency-red-flags',
    title: 'When to seek emergency care',
    source: 'NHS',
    url: 'https://www.nhs.uk/nhs-services/urgent-and-emergency-care-services/when-to-call-999/',
    tags: ['emergency', 'red flags', '112', 'chest pain', 'stroke'],
    text: 'Call emergency services (112 in India) immediately for: chest pain or pressure, especially spreading to the arm or jaw; sudden difficulty breathing; signs of stroke (face drooping, arm weakness, slurred speech); severe or uncontrolled bleeding; sudden "worst-ever" headache; loss of consciousness; a seizure; or a severe allergic reaction with swelling of the lips, tongue or throat. Do not drive yourself if you have these symptoms.',
  },
]
