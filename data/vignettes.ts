import type { Vignette } from '@/lib/evaluation'

// Standardized patient vignettes with physician-style gold-standard diagnosis
// and triage, used to benchmark the symptom checker (the approach used in
// published symptom-checker audits, e.g. Semigran et al., BMJ 2015).
//
// goldConditions = acceptable correct diagnosis terms (substring match).
// goldTriage     = correct urgency level.
//
// The set deliberately weights toward emergencies so the under-triage rate —
// the safety-critical metric — is meaningfully measured.
export const VIGNETTES: Vignette[] = [
  // ── self-care ──────────────────────────────────────────────
  {
    id: 'common-cold',
    title: 'Common cold',
    presentation: 'I have a runny nose, mild sore throat and sneezing for 2 days. No fever, eating and drinking normally, no breathing trouble. I am 28 and otherwise healthy.',
    goldConditions: ['common cold', 'cold', 'upper respiratory', 'viral', 'rhinitis'],
    goldTriage: 'self-care',
  },
  {
    id: 'tension-headache',
    title: 'Tension headache',
    presentation: 'I have a dull band-like headache across my forehead since this afternoon after a long day staring at my laptop. Mild, no nausea, no vision changes, no fever. 32, no medical history.',
    goldConditions: ['tension headache', 'tension-type', 'headache', 'stress headache'],
    goldTriage: 'self-care',
  },
  {
    id: 'mild-gastroenteritis',
    title: 'Mild gastroenteritis',
    presentation: 'Loose motions 3 times today and a slightly upset stomach after eating street food. No blood, no high fever, drinking fluids and passing urine normally. 25 years old.',
    goldConditions: ['gastroenteritis', 'food poisoning', 'diarrhea', 'stomach bug', 'viral'],
    goldTriage: 'self-care',
  },
  {
    id: 'allergic-rhinitis',
    title: 'Seasonal allergy',
    presentation: 'Every morning I get itchy watery eyes, sneezing and a blocked nose, worse outdoors. No fever, no breathing difficulty. This happens every spring.',
    goldConditions: ['allergic rhinitis', 'allergy', 'hay fever', 'seasonal'],
    goldTriage: 'self-care',
  },
  {
    id: 'minor-skin-cut',
    title: 'Minor abrasion',
    presentation: 'I scraped my knee falling off my bicycle. Small graze, bleeding has already stopped, I can move the leg fine. No deep wound.',
    goldConditions: ['abrasion', 'graze', 'minor wound', 'cut', 'laceration'],
    goldTriage: 'self-care',
  },

  // ── see a doctor soon (routine) ────────────────────────────
  {
    id: 'migraine',
    title: 'Migraine',
    presentation: 'For the last few months I get throbbing pain on one side of my head with nausea and sensitivity to light, lasting hours. It comes a few times a month. No weakness or speech problems.',
    goldConditions: ['migraine', 'headache'],
    goldTriage: 'see-doctor-soon',
  },
  {
    id: 'uti',
    title: 'Urinary tract infection',
    presentation: 'Burning when I urinate, needing to go very often, and slight lower belly discomfort for 2 days. No fever or back pain. I am a 30 year old woman.',
    goldConditions: ['urinary tract infection', 'uti', 'cystitis', 'bladder infection'],
    goldTriage: 'see-doctor-soon',
  },
  {
    id: 'strep-throat',
    title: 'Bacterial sore throat',
    presentation: 'Very sore throat for 3 days, painful to swallow, white patches on my tonsils and a mild fever. No cough. 19 years old.',
    goldConditions: ['strep', 'tonsillitis', 'pharyngitis', 'throat infection', 'bacterial'],
    goldTriage: 'see-doctor-soon',
  },
  {
    id: 'ankle-sprain',
    title: 'Ankle sprain',
    presentation: 'I twisted my ankle playing football yesterday. It is swollen and painful to walk on but I can move my toes and bear a little weight. No bone poking out.',
    goldConditions: ['sprain', 'ankle sprain', 'ligament', 'soft tissue'],
    goldTriage: 'see-doctor-soon',
  },
  {
    id: 'conjunctivitis',
    title: 'Conjunctivitis',
    presentation: 'My right eye is red, watery and sticky with discharge since this morning, a bit gritty. Vision is normal, no severe pain, no light sensitivity.',
    goldConditions: ['conjunctivitis', 'pink eye', 'eye infection'],
    goldTriage: 'see-doctor-soon',
  },
  {
    id: 'lower-back-pain',
    title: 'Mechanical back pain',
    presentation: 'My lower back has been aching for a week after lifting heavy boxes. Worse when bending. No leg weakness, no numbness, no problems controlling urine or bowels.',
    goldConditions: ['back pain', 'muscle strain', 'mechanical', 'lumbar'],
    goldTriage: 'see-doctor-soon',
  },

  // ── urgent care ────────────────────────────────────────────
  {
    id: 'dengue-warning',
    title: 'Dengue with warning signs',
    presentation: 'High fever for 4 days with severe body ache, headache behind the eyes, and now some bleeding from my gums and a few red spots on my skin. Feeling very weak. It is dengue season here.',
    goldConditions: ['dengue', 'hemorrhagic', 'viral hemorrhagic'],
    goldTriage: 'urgent-care',
  },
  {
    id: 'pneumonia',
    title: 'Pneumonia',
    presentation: 'Cough with green phlegm for 4 days, fever, and now pain in the right side of my chest when I breathe in. Feeling breathless walking around. 58 years old.',
    goldConditions: ['pneumonia', 'chest infection', 'lower respiratory'],
    goldTriage: 'urgent-care',
  },
  {
    id: 'asthma-exacerbation',
    title: 'Asthma flare-up',
    presentation: 'I am asthmatic and have been wheezing and using my inhaler much more than usual today. I can still speak in sentences but it is harder to breathe than normal.',
    goldConditions: ['asthma', 'asthma exacerbation', 'bronchospasm', 'wheeze'],
    goldTriage: 'urgent-care',
  },
  {
    id: 'kidney-stone',
    title: 'Renal colic',
    presentation: 'Sudden severe cramping pain in my left side and back coming in waves, with some blood in my urine and nausea. The pain makes me unable to sit still. 40 years old.',
    goldConditions: ['kidney stone', 'renal colic', 'ureteric', 'urolithiasis', 'nephrolithiasis'],
    goldTriage: 'urgent-care',
  },
  {
    id: 'cellulitis',
    title: 'Cellulitis',
    presentation: 'A patch of skin on my lower leg is red, hot, swollen and spreading since yesterday, and I now have a fever. It is tender to touch.',
    goldConditions: ['cellulitis', 'skin infection', 'soft tissue infection'],
    goldTriage: 'urgent-care',
  },

  // ── emergency (under-triage here is the dangerous failure) ──
  {
    id: 'mi',
    title: 'Heart attack',
    presentation: 'I am 60 and have crushing chest pain for the last 30 minutes that spreads to my left arm and jaw. I am sweating, short of breath and feel nauseous. It is not going away.',
    goldConditions: ['heart attack', 'myocardial infarction', 'mi', 'acute coronary', 'angina', 'cardiac'],
    goldTriage: 'emergency',
  },
  {
    id: 'stroke',
    title: 'Stroke',
    presentation: 'Suddenly 20 minutes ago the right side of my face drooped, my speech became slurred and my right arm feels weak and numb. I am 67.',
    goldConditions: ['stroke', 'cva', 'cerebrovascular', 'tia', 'brain attack'],
    goldTriage: 'emergency',
  },
  {
    id: 'anaphylaxis',
    title: 'Anaphylaxis',
    presentation: 'I ate peanuts 10 minutes ago and now my lips and tongue are swelling, my throat feels tight and I am starting to wheeze and feel dizzy.',
    goldConditions: ['anaphylaxis', 'severe allergic reaction', 'allergic reaction'],
    goldTriage: 'emergency',
  },
  {
    id: 'meningitis',
    title: 'Meningitis',
    presentation: 'High fever, a pounding headache, a stiff neck I cannot bend, and bright light hurts my eyes. I am also feeling confused. Started a few hours ago.',
    goldConditions: ['meningitis', 'meningococcal', 'cns infection'],
    goldTriage: 'emergency',
  },
  {
    id: 'dka',
    title: 'Diabetic ketoacidosis',
    presentation: 'I am a type 1 diabetic. For the last day I have been very thirsty, urinating a lot, vomiting, breathing fast and feeling drowsy. My sugar meter reads HIGH.',
    goldConditions: ['ketoacidosis', 'dka', 'diabetic emergency', 'hyperglycemic'],
    goldTriage: 'emergency',
  },
  {
    id: 'gi-bleed',
    title: 'Upper GI bleed',
    presentation: 'I just vomited a large amount of blood and feel very lightheaded and weak, my heart is racing. This has never happened before.',
    goldConditions: ['gastrointestinal bleed', 'gi bleed', 'hematemesis', 'upper gi', 'bleeding'],
    goldTriage: 'emergency',
  },
  {
    id: 'sah',
    title: 'Subarachnoid hemorrhage',
    presentation: 'About an hour ago I suddenly got the worst headache of my life, like being hit on the back of the head, with vomiting and a stiff neck. Nothing has ever hurt like this.',
    goldConditions: ['subarachnoid', 'brain bleed', 'hemorrhage', 'aneurysm', 'intracranial'],
    goldTriage: 'emergency',
  },
  {
    id: 'appendicitis',
    title: 'Appendicitis',
    presentation: 'Pain that started around my belly button yesterday has moved to the lower right side and is now severe. I have a fever, no appetite and it hurts more when I press and let go.',
    goldConditions: ['appendicitis', 'acute abdomen', 'appendix'],
    goldTriage: 'emergency',
  },
]
