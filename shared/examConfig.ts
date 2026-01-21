import type { ExamSystemConfig } from "./schema";

export const examSystemsConfig: ExamSystemConfig[] = [
  {
    name: "general",
    displayName: "General & Vital Signs",
    displayOrder: 1,
    defaultNormalText: "Patient is bright, alert, and responsive. Body condition score is appropriate. Vital signs within normal limits. No evidence of pain or distress. Adequately hydrated.",
    fields: [
      { name: "attitude", label: "Attitude", type: "select", options: ["Bright, alert, responsive", "Quiet", "Depressed", "Anxious", "Aggressive"] },
      { name: "bcs", label: "Body Condition Score", type: "select", options: ["1/9 - Emaciated", "2/9", "3/9 - Thin", "4/9", "5/9 - Ideal", "6/9", "7/9 - Overweight", "8/9", "9/9 - Obese"] },
      { name: "temperature", label: "Temperature", type: "numeric", unit: "°F" },
      { name: "heartRate", label: "Heart Rate", type: "numeric", unit: "bpm" },
      { name: "respiratoryRate", label: "Respiratory Rate", type: "numeric", unit: "breaths/min" },
      { name: "hydration", label: "Hydration Status", type: "select", options: ["Normal", "Mildly dehydrated (5%)", "Moderately dehydrated (7-8%)", "Severely dehydrated (10%+)"] },
      { name: "painScore", label: "Pain Score", type: "select", options: ["0 - No pain", "1 - Mild", "2 - Moderate", "3 - Severe", "4 - Excruciating"] },
      { name: "mmColor", label: "Mucous Membrane Color", type: "select", options: ["Pink", "Pale", "Icteric", "Cyanotic", "Injected", "Muddy"] },
      { name: "crt", label: "Capillary Refill Time", type: "select", options: ["< 2 seconds (normal)", "2-3 seconds (prolonged)", "> 3 seconds (severely prolonged)"] },
    ]
  },
  {
    name: "skin",
    displayName: "Skin & Coat",
    displayOrder: 2,
    defaultNormalText: "Skin is supple with no evidence of masses, lesions, or parasites. Coat is clean, well-groomed, and appropriate for breed.",
    fields: [
      { name: "coatCondition", label: "Coat Condition", type: "select", options: ["Normal", "Dry", "Oily", "Matted", "Thin/Alopecic"] },
      { name: "skinTurgor", label: "Skin Turgor", type: "select", options: ["Normal", "Reduced"] },
      { name: "lesions", label: "Lesions Present", type: "checkbox" },
      { name: "lesionType", label: "Lesion Type", type: "multiselect", options: ["Papules", "Pustules", "Crusts", "Erosions", "Ulcers", "Nodules", "Masses"] },
      { name: "parasites", label: "External Parasites", type: "multiselect", options: ["None observed", "Fleas", "Ticks", "Mites (suspected)", "Lice"] },
      { name: "pruritus", label: "Pruritus", type: "select", options: ["None", "Mild", "Moderate", "Severe"] },
    ]
  },
  {
    name: "musculoskeletal",
    displayName: "Musculoskeletal",
    displayOrder: 3,
    defaultNormalText: "Gait is normal and symmetric. No lameness observed. All joints have full range of motion without pain or crepitus. Muscles are symmetric and well-developed.",
    fields: [
      { name: "gait", label: "Gait", type: "select", options: ["Normal", "Lameness - Mild", "Lameness - Moderate", "Lameness - Severe", "Non-weight bearing"] },
      { name: "lamenesLocation", label: "Lameness Location", type: "multiselect", options: ["Left forelimb", "Right forelimb", "Left hindlimb", "Right hindlimb", "Multiple limbs"] },
      { name: "muscleSymmetry", label: "Muscle Symmetry", type: "select", options: ["Symmetric", "Atrophy present"] },
      { name: "jointPain", label: "Joint Pain", type: "checkbox" },
      { name: "crepitus", label: "Crepitus", type: "checkbox" },
      { name: "affectedJoints", label: "Affected Joints", type: "multiselect", options: ["Shoulder", "Elbow", "Carpus", "Hip", "Stifle", "Tarsus", "Spine"] },
    ]
  },
  {
    name: "neurologic",
    displayName: "Neurologic",
    displayOrder: 4,
    defaultNormalText: "Mentation is normal. Cranial nerve examination unremarkable. Proprioception intact in all four limbs. Spinal reflexes normal. No evidence of ataxia or paresis.",
    fields: [
      { name: "mentation", label: "Mentation", type: "select", options: ["Normal", "Obtunded", "Stuporous", "Comatose"] },
      { name: "cranialNerves", label: "Cranial Nerve Exam", type: "select", options: ["Normal", "Abnormalities detected"] },
      { name: "proprioception", label: "Proprioception", type: "select", options: ["Normal all limbs", "Delayed", "Absent"] },
      { name: "ataxia", label: "Ataxia", type: "select", options: ["None", "Vestibular", "Cerebellar", "Proprioceptive"] },
      { name: "paresis", label: "Paresis/Paralysis", type: "select", options: ["None", "Monoparesis", "Paraparesis", "Tetraparesis", "Hemiparesis"] },
      { name: "seizures", label: "Seizure History", type: "checkbox" },
    ]
  },
  {
    name: "eyes",
    displayName: "Eyes",
    displayOrder: 5,
    defaultNormalText: "Both eyes are clear and bright. Pupils are equal and responsive to light. No evidence of discharge, redness, or opacity. Menace response and PLR intact bilaterally.",
    fields: [
      { name: "discharge", label: "Ocular Discharge", type: "select", options: ["None", "Serous", "Mucoid", "Mucopurulent"] },
      { name: "redness", label: "Conjunctival Redness", type: "select", options: ["None", "Mild", "Moderate", "Severe"] },
      { name: "cornealClarity", label: "Corneal Clarity", type: "select", options: ["Clear", "Edema present", "Ulcer suspected", "Pigmentation", "Scarring"] },
      { name: "plr", label: "PLR", type: "select", options: ["Normal bilateral", "Sluggish", "Absent"] },
      { name: "menaceResponse", label: "Menace Response", type: "select", options: ["Intact bilateral", "Reduced", "Absent"] },
      { name: "lensOpacity", label: "Lens Opacity", type: "select", options: ["Clear", "Nuclear sclerosis", "Cataract - incipient", "Cataract - mature"] },
    ]
  },
  {
    name: "ears",
    displayName: "Ears",
    displayOrder: 6,
    defaultNormalText: "Pinnae are healthy with no lesions. External ear canals are clean with minimal cerumen. Tympanic membranes intact bilaterally. No evidence of otitis.",
    fields: [
      { name: "pinnaCondition", label: "Pinna Condition", type: "select", options: ["Normal", "Erythema", "Thickening", "Lesions present", "Aural hematoma"] },
      { name: "canalCondition", label: "Canal Condition", type: "select", options: ["Clean/Normal", "Mild debris", "Moderate debris", "Stenotic", "Occluded"] },
      { name: "discharge", label: "Otic Discharge", type: "select", options: ["None", "Ceruminous", "Purulent", "Hemorrhagic"] },
      { name: "odor", label: "Odor", type: "select", options: ["None", "Present"] },
      { name: "pain", label: "Pain on Manipulation", type: "checkbox" },
      { name: "affectedEar", label: "Affected Ear", type: "multiselect", options: ["Left", "Right", "Bilateral"] },
    ]
  },
  {
    name: "oral",
    displayName: "Oral Cavity & Teeth",
    displayOrder: 7,
    defaultNormalText: "Oral examination reveals healthy gingiva and mucous membranes. Teeth are clean with no evidence of calculus, fractures, or periodontal disease. No oral masses detected.",
    fields: [
      { name: "dentalCalculus", label: "Dental Calculus", type: "select", options: ["None", "Grade 1 - Mild", "Grade 2 - Moderate", "Grade 3 - Severe"] },
      { name: "gingivitis", label: "Gingivitis", type: "select", options: ["None", "Mild", "Moderate", "Severe"] },
      { name: "periodontalDisease", label: "Periodontal Disease", type: "checkbox" },
      { name: "fracturedTeeth", label: "Fractured Teeth", type: "checkbox" },
      { name: "missingTeeth", label: "Missing Teeth", type: "checkbox" },
      { name: "oralMasses", label: "Oral Masses", type: "checkbox" },
      { name: "tongueNormal", label: "Tongue Normal", type: "checkbox", defaultValue: true },
    ]
  },
  {
    name: "cardiovascular",
    displayName: "Cardiovascular",
    displayOrder: 8,
    defaultNormalText: "Heart rate and rhythm are normal. No murmurs, gallops, or arrhythmias detected on auscultation. Peripheral pulses are strong and synchronous. No jugular distension.",
    fields: [
      { name: "heartRhythm", label: "Heart Rhythm", type: "select", options: ["Regular", "Regularly irregular", "Irregularly irregular", "Bradycardia", "Tachycardia"] },
      { name: "murmur", label: "Heart Murmur", type: "checkbox" },
      { name: "murmurGrade", label: "Murmur Grade", type: "select", options: ["I/VI", "II/VI", "III/VI", "IV/VI", "V/VI", "VI/VI"] },
      { name: "murmurLocation", label: "Murmur PMI", type: "select", options: ["Left apex", "Left base", "Right side", "Both sides"] },
      { name: "pulseQuality", label: "Pulse Quality", type: "select", options: ["Strong/synchronous", "Weak", "Bounding", "Pulse deficits"] },
      { name: "jugularDistension", label: "Jugular Distension", type: "checkbox" },
      { name: "gallop", label: "Gallop Rhythm", type: "checkbox" },
    ]
  },
  {
    name: "respiratory",
    displayName: "Respiratory",
    displayOrder: 9,
    defaultNormalText: "Respiratory rate and effort are normal. Lung sounds are clear bilaterally. No nasal discharge, coughing, or evidence of respiratory distress.",
    fields: [
      { name: "effort", label: "Respiratory Effort", type: "select", options: ["Normal", "Increased", "Labored", "Dyspneic"] },
      { name: "lungSounds", label: "Lung Sounds", type: "select", options: ["Clear bilaterally", "Harsh/Increased", "Crackles", "Wheezes", "Decreased/Absent"] },
      { name: "nasalDischarge", label: "Nasal Discharge", type: "select", options: ["None", "Serous", "Mucoid", "Mucopurulent", "Hemorrhagic"] },
      { name: "coughing", label: "Cough", type: "select", options: ["None", "Dry/non-productive", "Productive", "Paroxysmal"] },
      { name: "tracheaPalpation", label: "Tracheal Sensitivity", type: "select", options: ["Normal", "Cough induced"] },
      { name: "stertor", label: "Stertor/Stridor", type: "checkbox" },
    ]
  },
  {
    name: "gastrointestinal",
    displayName: "Gastrointestinal",
    displayOrder: 10,
    defaultNormalText: "Abdomen is soft, non-painful, and without organomegaly or palpable masses. No vomiting or diarrhea reported. Anal region is clean and normal.",
    fields: [
      { name: "abdominalPalpation", label: "Abdominal Palpation", type: "select", options: ["Soft, non-painful", "Tense", "Painful", "Distended"] },
      { name: "organomegaly", label: "Organomegaly", type: "multiselect", options: ["None", "Hepatomegaly", "Splenomegaly", "Renomegaly"] },
      { name: "masses", label: "Abdominal Masses", type: "checkbox" },
      { name: "fluidWave", label: "Fluid Wave", type: "checkbox" },
      { name: "vomiting", label: "Vomiting History", type: "select", options: ["None", "Occasional", "Frequent", "Projectile"] },
      { name: "stoolConsistency", label: "Stool Consistency", type: "select", options: ["Normal", "Soft", "Diarrhea", "Bloody", "Mucoid", "Constipated"] },
      { name: "analRegion", label: "Anal/Perineal Region", type: "select", options: ["Normal", "Distended anal sacs", "Perineal hernia", "Masses"] },
    ]
  },
  {
    name: "urogenital",
    displayName: "Urogenital",
    displayOrder: 11,
    defaultNormalText: "Bladder is normal size and easily expressible. Kidneys are symmetric and non-painful. External genitalia are normal. No abnormal discharge.",
    fields: [
      { name: "bladder", label: "Bladder", type: "select", options: ["Normal/small", "Distended", "Thickened wall", "Not palpable"] },
      { name: "kidneys", label: "Kidneys", type: "select", options: ["Normal size and shape", "Enlarged", "Small", "Irregular", "Painful"] },
      { name: "prostate", label: "Prostate (Males)", type: "select", options: ["Normal", "Enlarged", "Painful", "Asymmetric", "N/A"] },
      { name: "vulva", label: "Vulva (Females)", type: "select", options: ["Normal", "Discharge present", "Swollen", "N/A"] },
      { name: "mammaryGlands", label: "Mammary Glands", type: "select", options: ["Normal", "Masses present", "Galactorrhea", "N/A"] },
      { name: "testicles", label: "Testicles (Intact Males)", type: "select", options: ["Both descended, normal", "Cryptorchid", "Masses", "Asymmetric", "N/A"] },
      { name: "urinarySymptoms", label: "Urinary Symptoms", type: "multiselect", options: ["None", "Polyuria", "Pollakiuria", "Stranguria", "Hematuria"] },
    ]
  },
  {
    name: "lymphnodes",
    displayName: "Lymph Nodes",
    displayOrder: 12,
    defaultNormalText: "All peripheral lymph nodes are normal in size and consistency. No lymphadenopathy detected.",
    fields: [
      { name: "submandibular", label: "Submandibular", type: "select", options: ["Normal", "Enlarged", "Painful"] },
      { name: "prescapular", label: "Prescapular", type: "select", options: ["Normal", "Enlarged", "Painful"] },
      { name: "axillary", label: "Axillary", type: "select", options: ["Normal", "Enlarged", "Painful", "Not palpable"] },
      { name: "inguinal", label: "Inguinal", type: "select", options: ["Normal", "Enlarged", "Painful", "Not palpable"] },
      { name: "popliteal", label: "Popliteal", type: "select", options: ["Normal", "Enlarged", "Painful"] },
      { name: "generalizedLymphadenopathy", label: "Generalized Lymphadenopathy", type: "checkbox" },
    ]
  },
  {
    name: "endocrine",
    displayName: "Endocrine/Metabolic",
    displayOrder: 13,
    defaultNormalText: "No clinical signs suggestive of endocrine disease. No polyuria, polydipsia, or unexplained weight changes reported.",
    fields: [
      { name: "pupd", label: "PU/PD", type: "checkbox" },
      { name: "polyphagia", label: "Polyphagia", type: "checkbox" },
      { name: "weightChange", label: "Weight Change", type: "select", options: ["Stable", "Weight loss", "Weight gain"] },
      { name: "hairCoatChanges", label: "Hair Coat Changes", type: "select", options: ["None", "Bilaterally symmetric alopecia", "Thin coat", "Poor regrowth"] },
      { name: "thyroid", label: "Thyroid Palpation (Cats)", type: "select", options: ["Not palpable", "Palpable/Nodule", "N/A"] },
      { name: "potBelly", label: "Pot-bellied Appearance", type: "checkbox" },
      { name: "muscleWasting", label: "Muscle Wasting", type: "checkbox" },
    ]
  }
];

export const speciesOptions = [
  { value: "canine", label: "Dog (Canine)" },
  { value: "feline", label: "Cat (Feline)" },
];

export const sexOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

export const neuterStatusOptions = [
  { value: "intact", label: "Intact" },
  { value: "neutered", label: "Neutered/Spayed" },
  { value: "unknown", label: "Unknown" },
];
