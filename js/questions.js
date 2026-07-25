// Massachusetts 248 CMR Plumbing Code Question Bank
// 165 questions accurate to MA code (batch 2: ids 66-115, batch 3: ids 116-165)

const CATEGORIES = {
  DWV: { name: 'DWV', icon: '🔧', color: '#3b82f6', fullName: 'Drain, Waste & Vent' },
  WATER: { name: 'Water Distribution', icon: '💧', color: '#06b6d4', fullName: 'Water Distribution' },
  GAS: { name: 'Gas Piping', icon: '🔥', color: '#f59e0b', fullName: 'Gas Piping' },
  MEDICAL: { name: 'Medical Gas', icon: '⚕️', color: '#10b981', fullName: 'Medical Gas' },
  BACKFLOW: { name: 'Backflow Prevention', icon: '🔄', color: '#8b5cf6', fullName: 'Backflow Prevention' },
  FIXTURES: { name: 'Fixtures', icon: '🚿', color: '#ec4899', fullName: 'Fixtures' },
  GENERAL: { name: 'General Regulations', icon: '📋', color: '#6366f1', fullName: 'General Regulations & Definitions' },
  VENTING: { name: 'Venting', icon: '🌬️', color: '#14b8a6', fullName: 'Venting' },
  MATERIALS: { name: 'Materials', icon: '🧱', color: '#f97316', fullName: 'Materials & Standards' },
  SIZING: { name: 'Sizing', icon: '📐', color: '#ef4444', fullName: 'Sizing' },
  PERMITS: { name: 'Permits', icon: '📝', color: '#a855f7', fullName: 'Permits & Inspections' }
};

const QUESTIONS = [
  // === DWV ===
  {
    id: 1, category: 'DWV', difficulty: 1,
    question: 'What is the minimum size of a building drain that receives discharge from a water closet?',
    options: ['2 inch', '3 inch', '4 inch', '6 inch'],
    correct: 1,
    explanation: 'Per 248 CMR 10.10, the minimum size of a building drain receiving discharge from a water closet is 3 inches.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 2, category: 'DWV', difficulty: 2,
    question: 'What is the minimum slope for a 4-inch horizontal drain pipe?',
    options: ['1/16 inch per foot', '1/8 inch per foot', '1/4 inch per foot', '1/2 inch per foot'],
    correct: 1,
    explanation: 'Per 248 CMR 10.10, horizontal drainage pipes 4 inches and larger shall have a minimum slope of 1/8 inch per foot.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 3, category: 'DWV', difficulty: 1,
    question: 'What is the minimum slope for a 3-inch or smaller horizontal drain pipe?',
    options: ['1/16 inch per foot', '1/8 inch per foot', '1/4 inch per foot', '1/2 inch per foot'],
    correct: 2,
    explanation: 'Per 248 CMR 10.10, horizontal drainage pipes 3 inches or smaller shall have a minimum slope of 1/4 inch per foot.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 4, category: 'DWV', difficulty: 2,
    question: 'What is the maximum number of fixture units (DFU) allowed on a 2-inch horizontal branch?',
    options: ['3 DFU', '6 DFU', '12 DFU', '20 DFU'],
    correct: 1,
    explanation: 'Per 248 CMR 10.10 Table 1, a 2-inch horizontal branch can handle a maximum of 6 DFU.',
    codeRef: '248 CMR 10.10 Table 1'
  },
  {
    id: 5, category: 'DWV', difficulty: 3,
    question: 'A combination wye and 1/8 bend is equivalent to what fitting?',
    options: ['Sanitary tee', 'Long sweep 90', 'Double wye', 'Short sweep 90'],
    correct: 0,
    explanation: 'A combination wye and 1/8 bend may be used in place of a sanitary tee in horizontal to vertical drainage connections.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 6, category: 'DWV', difficulty: 2,
    question: 'What type of fitting is prohibited for changing direction from horizontal to horizontal in drainage piping?',
    options: ['Long sweep 90', 'Combination wye and 1/8 bend', 'Sanitary tee', 'Double wye'],
    correct: 2,
    explanation: 'A sanitary tee shall not be used to change direction of flow from horizontal to horizontal in drainage piping.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 7, category: 'DWV', difficulty: 1,
    question: 'What is the DFU value of a lavatory?',
    options: ['1 DFU', '2 DFU', '3 DFU', '4 DFU'],
    correct: 0,
    explanation: 'Per 248 CMR 10.10 Table 1, a lavatory has a drainage fixture unit value of 1.',
    codeRef: '248 CMR 10.10 Table 1'
  },
  {
    id: 8, category: 'DWV', difficulty: 1,
    question: 'What is the DFU value of a water closet (1.6 GPF or less)?',
    options: ['2 DFU', '3 DFU', '4 DFU', '6 DFU'],
    correct: 1,
    explanation: 'Per 248 CMR, a water closet (1.6 GPF or less) has a drainage fixture unit value of 3.',
    codeRef: '248 CMR 10.10 Table 1'
  },

  // === WATER DISTRIBUTION ===
  {
    id: 9, category: 'WATER', difficulty: 1,
    question: 'What is the minimum size of a water service pipe to a building?',
    options: ['1/2 inch', '3/4 inch', '1 inch', '1-1/4 inch'],
    correct: 1,
    explanation: 'Per 248 CMR 10.10, the minimum size of a water service pipe is 3/4 inch.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 10, category: 'WATER', difficulty: 2,
    question: 'What is the maximum water pressure allowed at any fixture in a building?',
    options: ['60 psi', '70 psi', '80 psi', '100 psi'],
    correct: 2,
    explanation: 'Per 248 CMR 10.10, the maximum static water pressure at any fixture shall not exceed 80 psi. A pressure reducing valve is required when pressure exceeds 80 psi.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 11, category: 'WATER', difficulty: 2,
    question: 'What is the minimum hot water temperature required at fixtures in a residential dwelling?',
    options: ['100°F', '110°F', '120°F', '140°F'],
    correct: 1,
    explanation: 'Per 248 CMR, hot water at fixtures in residential dwellings shall be maintained at a minimum of 110°F.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 12, category: 'WATER', difficulty: 1,
    question: 'What type of valve is required at the water service entrance to a building?',
    options: ['Check valve', 'Gate valve or ball valve (full port)', 'Globe valve', 'Butterfly valve'],
    correct: 1,
    explanation: 'A full-port shutoff valve (gate or ball valve) is required at the water service entrance to the building.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 13, category: 'WATER', difficulty: 3,
    question: 'What is the minimum size of a cold water supply pipe to a bathtub?',
    options: ['3/8 inch', '1/2 inch', '3/4 inch', '1 inch'],
    correct: 1,
    explanation: 'Per 248 CMR 10.10 Table, the minimum cold water supply to a bathtub is 1/2 inch.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 14, category: 'WATER', difficulty: 2,
    question: 'Water hammer arrestors are required when:',
    options: ['Water pressure exceeds 60 psi', 'Quick-closing valves are installed', 'The building is over 3 stories', 'Hot water temperature exceeds 140°F'],
    correct: 1,
    explanation: 'Water hammer arrestors shall be installed when quick-closing valves are used (dishwashers, washing machines, etc.) to prevent hydraulic shock.',
    codeRef: '248 CMR 10.10'
  },

  // === GAS PIPING ===
  {
    id: 15, category: 'GAS', difficulty: 1,
    question: 'What is the minimum size of gas piping from the meter to an appliance?',
    options: ['1/4 inch', '3/8 inch', '1/2 inch', '3/4 inch'],
    correct: 2,
    explanation: 'Per 248 CMR 4.00, the minimum size of gas piping from the meter to any appliance is 1/2 inch.',
    codeRef: '248 CMR 4.00'
  },
  {
    id: 16, category: 'GAS', difficulty: 2,
    question: 'What is the maximum allowable pressure drop in a low-pressure gas piping system?',
    options: ['0.3 inch WC', '0.5 inch WC', '1.0 inch WC', '2.0 inch WC'],
    correct: 1,
    explanation: 'Per 248 CMR 4.00, the maximum pressure drop in a low-pressure gas system (under 2 psi) shall not exceed 0.5 inch water column.',
    codeRef: '248 CMR 4.00'
  },
  {
    id: 17, category: 'GAS', difficulty: 1,
    question: 'A drip leg (sediment trap) is required at the inlet of:',
    options: ['Only furnaces', 'Only water heaters', 'Every gas appliance', 'Only appliances over 100,000 BTU'],
    correct: 2,
    explanation: 'Per 248 CMR 4.00, a sediment trap (drip leg) is required at the inlet of every gas appliance to catch debris.',
    codeRef: '248 CMR 4.00'
  },
  {
    id: 18, category: 'GAS', difficulty: 2,
    question: 'What type of joint compound can be used on gas piping threads?',
    options: ['Any pipe dope', 'Only Teflon tape', 'Compounds approved for gas service', 'No compound needed'],
    correct: 2,
    explanation: 'Only thread compounds specifically listed/approved for gas service shall be used on gas piping joints.',
    codeRef: '248 CMR 4.00'
  },
  {
    id: 19, category: 'GAS', difficulty: 3,
    question: 'What is the required test pressure for a new gas piping system?',
    options: ['10 psi for 10 minutes', '15 psi for 15 minutes', '3 psi for 10 minutes', '25 psi for 30 minutes'],
    correct: 2,
    explanation: 'Per 248 CMR 4.00, new gas piping shall be tested at no less than 3 psi gauge pressure for a minimum of 10 minutes with no perceptible drop.',
    codeRef: '248 CMR 4.00'
  },
  {
    id: 20, category: 'GAS', difficulty: 2,
    question: 'A gas shutoff valve is required:',
    options: ['Only at the meter', 'At the meter and each appliance', 'Only at appliances over 50,000 BTU', 'Only for commercial buildings'],
    correct: 1,
    explanation: 'Per 248 CMR 4.00, an accessible shutoff valve is required at the meter and within 6 feet of each gas appliance.',
    codeRef: '248 CMR 4.00'
  },

  // === BACKFLOW PREVENTION ===
  {
    id: 21, category: 'BACKFLOW', difficulty: 1,
    question: 'What is the minimum air gap for a lavatory faucet?',
    options: ['1/2 inch', '1 inch or two times the diameter of the outlet, whichever is greater', '2 inches', '3 inches'],
    correct: 1,
    explanation: 'The minimum air gap is generally 1 inch or twice the effective opening (diameter) of the supply outlet, whichever is greater.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 22, category: 'BACKFLOW', difficulty: 2,
    question: 'Which backflow prevention device is required for a boiler makeup water connection?',
    options: ['Atmospheric vacuum breaker', 'Reduced pressure zone (RPZ) assembly', 'Dual check valve', 'Air gap only'],
    correct: 1,
    explanation: 'A reduced pressure zone (RPZ) backflow preventer is required for boiler makeup water connections as the boiler chemicals create a high-hazard cross-connection.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 23, category: 'BACKFLOW', difficulty: 2,
    question: 'An atmospheric vacuum breaker (AVB) must be installed at least how far above the highest downstream outlet?',
    options: ['1 inch', '6 inches', '12 inches', '24 inches'],
    correct: 1,
    explanation: 'Per 248 CMR, an atmospheric vacuum breaker must be installed at least 6 inches above the highest downstream point of use.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 24, category: 'BACKFLOW', difficulty: 3,
    question: 'Which of the following is considered a HIGH hazard cross-connection?',
    options: ['Residential lawn irrigation', 'Residential hose bibb', 'Chemical feed system connected to potable water', 'Kitchen dishwasher'],
    correct: 2,
    explanation: 'A chemical feed system is a high-hazard cross-connection because it can introduce toxic substances into the potable water supply.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 25, category: 'BACKFLOW', difficulty: 1,
    question: 'What is the simplest and most reliable form of backflow prevention?',
    options: ['RPZ assembly', 'Double check valve', 'Air gap', 'Vacuum breaker'],
    correct: 2,
    explanation: 'An air gap is the simplest and most reliable form of backflow prevention — a physical separation between the water outlet and the flood level rim.',
    codeRef: '248 CMR 10.10'
  },

  // === FIXTURES ===
  {
    id: 26, category: 'FIXTURES', difficulty: 1,
    question: 'What is the minimum trap size for a shower drain?',
    options: ['1-1/4 inch', '1-1/2 inch', '2 inch', '3 inch'],
    correct: 2,
    explanation: 'Per 248 CMR, the minimum trap size for a shower drain is 2 inches.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 27, category: 'FIXTURES', difficulty: 1,
    question: 'What is the minimum trap size for a lavatory?',
    options: ['1 inch', '1-1/4 inch', '1-1/2 inch', '2 inch'],
    correct: 1,
    explanation: 'Per 248 CMR 10.10, the minimum trap size for a lavatory is 1-1/4 inches.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 28, category: 'FIXTURES', difficulty: 2,
    question: 'What is the maximum distance from a fixture trap to its vent (for a 1-1/2 inch trap arm)?',
    options: ['2 feet 6 inches', '3 feet 6 inches', '5 feet', '6 feet'],
    correct: 2,
    explanation: 'Per 248 CMR 10.10 Table, the maximum trap arm distance for a 1-1/2 inch trap is 5 feet (60 inches).',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 29, category: 'FIXTURES', difficulty: 2,
    question: 'How many water closets are required for a restaurant with 1-50 seats?',
    options: ['1 per sex', '2 per sex', '3 per sex', '4 per sex'],
    correct: 0,
    explanation: 'Per 248 CMR 10.10 Table, a restaurant with 1-50 seats requires a minimum of 1 water closet per sex.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 30, category: 'FIXTURES', difficulty: 1,
    question: 'Every fixture trap must have a water seal of at least:',
    options: ['1 inch', '2 inches', '3 inches', '4 inches'],
    correct: 1,
    explanation: 'Per 248 CMR, each fixture trap shall have a water seal of not less than 2 inches and not more than 4 inches.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 31, category: 'FIXTURES', difficulty: 2,
    question: 'The maximum water seal depth allowed in a fixture trap is:',
    options: ['2 inches', '3 inches', '4 inches', '6 inches'],
    correct: 2,
    explanation: 'Per 248 CMR, the maximum water seal depth is 4 inches. Deeper seals can cause self-siphoning.',
    codeRef: '248 CMR 10.10'
  },

  // === VENTING ===
  {
    id: 32, category: 'VENTING', difficulty: 1,
    question: 'What is the minimum size of a vent for a water closet?',
    options: ['1-1/4 inch', '1-1/2 inch', '2 inch', '3 inch'],
    correct: 2,
    explanation: 'Per 248 CMR 10.10, the minimum vent size for a water closet is 2 inches.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 33, category: 'VENTING', difficulty: 2,
    question: 'A vent pipe must extend through the roof to a minimum height of:',
    options: ['6 inches', '8 inches', '12 inches', '24 inches'],
    correct: 2,
    explanation: 'Per 248 CMR 10.10, a vent pipe extending through the roof must extend at least 12 inches above the roof surface.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 34, category: 'VENTING', difficulty: 2,
    question: 'The minimum size of a vent stack serving a building drain is:',
    options: ['1-1/4 inch', '1-1/2 inch', '2 inch', 'Half the size of the drain it serves'],
    correct: 2,
    explanation: 'Per 248 CMR 10.10, the minimum vent stack size is 2 inches, regardless of the building drain size.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 35, category: 'VENTING', difficulty: 3,
    question: 'An island vent (loop vent) is permitted for which fixture?',
    options: ['Water closet', 'Urinal', 'Kitchen sink', 'Floor drain'],
    correct: 2,
    explanation: 'An island vent (loop vent) is typically used for kitchen sinks on islands where conventional venting is not practical.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 36, category: 'VENTING', difficulty: 1,
    question: 'What is the primary purpose of a plumbing vent system?',
    options: ['To drain excess water', 'To equalize pressure and prevent trap siphonage', 'To provide hot water recirculation', 'To connect to the storm drain'],
    correct: 1,
    explanation: 'The vent system allows air into the drainage system to equalize pressure and prevent trap siphonage and back-pressure.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 37, category: 'VENTING', difficulty: 2,
    question: 'A wet vent is defined as:',
    options: ['A vent exposed to weather', 'A vent that also serves as a drain for another fixture', 'A vent connected to a water heater', 'A vent below the flood level rim'],
    correct: 1,
    explanation: 'A wet vent is a pipe that serves as both a vent for one fixture and a drain for another. It must be sized for the total drainage load.',
    codeRef: '248 CMR 10.10'
  },

  // === MATERIALS ===
  {
    id: 38, category: 'MATERIALS', difficulty: 1,
    question: 'Which material is NOT approved for underground drainage piping in Massachusetts?',
    options: ['Cast iron', 'PVC (Schedule 40)', 'ABS', 'Galvanized steel'],
    correct: 3,
    explanation: 'Galvanized steel is not approved for underground drainage use due to corrosion. Cast iron, PVC, and ABS are commonly approved.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 39, category: 'MATERIALS', difficulty: 2,
    question: 'What type of solder is required for potable water supply joints?',
    options: ['50/50 lead-tin solder', 'Lead-free solder (95/5 or similar)', 'Silver solder only', 'Any solder rated for plumbing'],
    correct: 1,
    explanation: 'Per 248 CMR and federal Safe Drinking Water Act, only lead-free solder (containing no more than 0.2% lead) shall be used on potable water systems.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 40, category: 'MATERIALS', difficulty: 2,
    question: 'PVC piping used for drain, waste, and vent shall conform to what standard?',
    options: ['ASTM D1785 (Schedule 40)', 'ASTM A74', 'ASTM B88', 'ASTM D2729'],
    correct: 0,
    explanation: 'PVC DWV piping must conform to ASTM D1785 (Schedule 40) or ASTM D2665 (DWV pattern).',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 41, category: 'MATERIALS', difficulty: 1,
    question: 'Copper water tube Type L is identified by what color marking?',
    options: ['Red', 'Blue', 'Green', 'Yellow'],
    correct: 1,
    explanation: 'Type L copper is marked with blue lettering/stripe. Type M is red, Type K is green, and DWV is yellow.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 42, category: 'MATERIALS', difficulty: 3,
    question: 'What is the heaviest type of copper tubing used for underground water service?',
    options: ['Type M', 'Type L', 'Type K', 'DWV'],
    correct: 2,
    explanation: 'Type K is the heaviest copper tubing and is required for underground water service due to its superior wall thickness and corrosion resistance.',
    codeRef: '248 CMR 10.10'
  },

  // === GENERAL REGULATIONS ===
  {
    id: 43, category: 'GENERAL', difficulty: 1,
    question: 'In Massachusetts, the plumbing code is found in:',
    options: ['780 CMR', '248 CMR', '527 CMR', '105 CMR'],
    correct: 1,
    explanation: '248 CMR is the Massachusetts State Plumbing Code, administered by the Board of State Examiners of Plumbers and Gas Fitters.',
    codeRef: '248 CMR'
  },
  {
    id: 44, category: 'GENERAL', difficulty: 1,
    question: 'Who administers the Massachusetts plumbing code?',
    options: ['Department of Public Safety', 'Board of State Examiners of Plumbers and Gas Fitters', 'Department of Environmental Protection', 'Board of Building Regulations'],
    correct: 1,
    explanation: 'The Board of State Examiners of Plumbers and Gas Fitters administers 248 CMR, the Massachusetts plumbing and gas fitting code.',
    codeRef: '248 CMR 2.00'
  },
  {
    id: 45, category: 'GENERAL', difficulty: 2,
    question: 'A journeyman plumber may work under the supervision of:',
    options: ['Any licensed plumber', 'A master plumber only', 'Another journeyman plumber', 'No supervision required'],
    correct: 1,
    explanation: 'Per 248 CMR, a journeyman plumber must work under the general supervision of a master plumber who holds the license for the business.',
    codeRef: '248 CMR 2.00'
  },
  {
    id: 46, category: 'GENERAL', difficulty: 2,
    question: 'How many years of practical experience under a master plumber are required to sit for the journeyman exam in MA?',
    options: ['1 year', '2 years', '3 years', '5 years'],
    correct: 2,
    explanation: 'Per 248 CMR 2.00, an applicant must have at least 3 years of practical experience working under a licensed master plumber to qualify for the journeyman exam.',
    codeRef: '248 CMR 2.00'
  },
  {
    id: 47, category: 'GENERAL', difficulty: 1,
    question: 'A plumbing permit is required for:',
    options: ['Replacing a faucet washer', 'Installing a new water heater', 'Clearing a drain stoppage', 'Replacing a toilet flapper'],
    correct: 1,
    explanation: 'Installing a new water heater requires a plumbing permit. Minor repairs like washer or flapper replacement and clearing stoppages do not.',
    codeRef: '248 CMR 2.00'
  },

  // === SIZING ===
  {
    id: 48, category: 'SIZING', difficulty: 2,
    question: 'What is the minimum size of a building sewer?',
    options: ['3 inch', '4 inch', '6 inch', '2 inch'],
    correct: 1,
    explanation: 'Per 248 CMR 10.10, the minimum size of a building sewer is 4 inches.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 49, category: 'SIZING', difficulty: 2,
    question: 'What size trap is required for a kitchen sink?',
    options: ['1-1/4 inch', '1-1/2 inch', '2 inch', '3 inch'],
    correct: 1,
    explanation: 'Per 248 CMR, a kitchen sink requires a minimum 1-1/2 inch trap.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 50, category: 'SIZING', difficulty: 3,
    question: 'What is the maximum trap arm distance for a 2-inch trap?',
    options: ['3 feet 6 inches', '5 feet', '8 feet', '10 feet'],
    correct: 2,
    explanation: 'Per 248 CMR 10.10 Table, the maximum developed length of a 2-inch trap arm is 8 feet.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 51, category: 'SIZING', difficulty: 1,
    question: 'The fixture unit value of a bathtub is:',
    options: ['1 DFU', '2 DFU', '3 DFU', '4 DFU'],
    correct: 1,
    explanation: 'Per 248 CMR 10.10 Table 1, a bathtub (with or without shower) has a drainage fixture unit value of 2.',
    codeRef: '248 CMR 10.10 Table 1'
  },

  // === MEDICAL GAS ===
  {
    id: 52, category: 'MEDICAL', difficulty: 2,
    question: 'Medical gas piping must be installed by a:',
    options: ['Any licensed plumber', 'Certified medical gas installer (ASSE 6010)', 'Master plumber only', 'Mechanical contractor'],
    correct: 1,
    explanation: 'Medical gas piping systems shall only be installed by personnel certified under ASSE 6010 (Medical Gas Systems Installer).',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 53, category: 'MEDICAL', difficulty: 3,
    question: 'What type of copper tubing is required for medical gas piping?',
    options: ['Type M', 'Type L, cleaned for oxygen service', 'Type K', 'Any type, cleaned and capped'],
    correct: 1,
    explanation: 'Medical gas piping requires Type L (or K) copper tubing that has been cleaned and capped for oxygen service per ASTM B819.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 54, category: 'MEDICAL', difficulty: 2,
    question: 'Medical gas piping joints must be:',
    options: ['Soldered with lead-free solder', 'Brazed with BCuP alloy (silver brazing) in a nitrogen purge', 'Threaded and sealed', 'Compression fitted'],
    correct: 1,
    explanation: 'Medical gas piping joints must be brazed using BCuP series alloys under a continuous nitrogen purge to prevent internal oxidation.',
    codeRef: '248 CMR 10.10'
  },

  // === PERMITS & INSPECTIONS ===
  {
    id: 55, category: 'PERMITS', difficulty: 1,
    question: 'A rough-in inspection must be completed:',
    options: ['After the walls are closed up', 'Before concealment of piping', 'Only if requested by the homeowner', 'Within 30 days of permit issuance'],
    correct: 1,
    explanation: 'Per 248 CMR, rough-in plumbing must be inspected and approved before any piping is concealed (covered by walls, ceilings, etc.).',
    codeRef: '248 CMR 2.00'
  },
  {
    id: 56, category: 'PERMITS', difficulty: 2,
    question: 'A plumbing permit in Massachusetts is valid for how long?',
    options: ['30 days', '90 days', '1 year', '2 years'],
    correct: 2,
    explanation: 'Per 248 CMR, a plumbing permit is valid for 1 year from the date of issuance. Extensions may be granted.',
    codeRef: '248 CMR 2.00'
  },
  {
    id: 57, category: 'PERMITS', difficulty: 1,
    question: 'Who can pull a plumbing permit in Massachusetts?',
    options: ['Any licensed plumber', 'Only a master plumber', 'The homeowner', 'The general contractor'],
    correct: 1,
    explanation: 'Per 248 CMR 2.00, only a licensed master plumber can obtain a plumbing permit in Massachusetts.',
    codeRef: '248 CMR 2.00'
  },

  // === MORE DWV ===
  {
    id: 58, category: 'DWV', difficulty: 3,
    question: 'A cleanout is required at every change of direction greater than:',
    options: ['22.5 degrees', '45 degrees', '90 degrees', '135 degrees'],
    correct: 1,
    explanation: 'Per 248 CMR 10.10, a cleanout is required at each change of direction greater than 45 degrees in the building drain or sewer.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 59, category: 'DWV', difficulty: 2,
    question: 'What is the maximum distance between cleanouts on a horizontal drain?',
    options: ['25 feet', '50 feet', '75 feet', '100 feet'],
    correct: 2,
    explanation: 'Per 248 CMR 10.10, cleanouts shall be installed at intervals not exceeding 75 feet on horizontal drains.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 60, category: 'DWV', difficulty: 1,
    question: 'The minimum size of a cleanout shall be:',
    options: ['Same size as the pipe it serves', 'One size smaller than the pipe', 'Always 4 inches', 'Always 2 inches'],
    correct: 0,
    explanation: 'Per 248 CMR 10.10, cleanouts shall be the same nominal size as the pipe they serve, up to 4 inches. For pipes larger than 4 inches, a 4-inch cleanout is acceptable.',
    codeRef: '248 CMR 10.10'
  },

  // === MORE GENERAL ===
  {
    id: 61, category: 'GENERAL', difficulty: 2,
    question: 'What is the definition of "potable water"?',
    options: ['Any water from a municipal supply', 'Water that is safe for drinking, cooking, and bathing', 'Hot water above 110°F', 'Filtered water from any source'],
    correct: 1,
    explanation: 'Potable water is water that is safe and satisfactory for drinking, cooking, and bathing — free from impurities in amounts sufficient to cause disease.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 62, category: 'GENERAL', difficulty: 3,
    question: 'What is the minimum cover depth for a water service pipe in Massachusetts?',
    options: ['12 inches', '24 inches', '48 inches (4 feet)', '60 inches (5 feet)'],
    correct: 2,
    explanation: 'Per Massachusetts code, water service pipes must be buried at least 48 inches (4 feet) deep to protect against freezing.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 63, category: 'WATER', difficulty: 3,
    question: 'A thermal expansion tank is required when:',
    options: ['Water pressure exceeds 60 psi', 'A closed system exists (backflow preventer on service)', 'Hot water temperature exceeds 140°F', 'The building is over 3 stories'],
    correct: 1,
    explanation: 'When a backflow preventer creates a closed system, thermal expansion from the water heater has nowhere to go. A thermal expansion tank absorbs this pressure.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 64, category: 'GAS', difficulty: 1,
    question: 'Black iron (steel) pipe used for gas piping is joined by:',
    options: ['Solvent cement', 'Soldering', 'Threaded fittings or welding', 'Compression fittings only'],
    correct: 2,
    explanation: 'Black iron (steel) gas pipe is joined using threaded connections with approved joint compound, or by welding for larger sizes.',
    codeRef: '248 CMR 4.00'
  },
  {
    id: 65, category: 'BACKFLOW', difficulty: 2,
    question: 'How often must an RPZ (reduced pressure zone) assembly be tested?',
    options: ['Every 6 months', 'Annually', 'Every 2 years', 'Every 5 years'],
    correct: 1,
    explanation: 'RPZ assemblies must be tested annually by a certified backflow tester to ensure proper operation of the check valves and relief valve.',
    codeRef: '248 CMR 10.10'
  },

  // === BATCH 2 (ids 66–115) ===
  // === DWV ===
  {
    id: 66, category: 'DWV', difficulty: 1,
    question: 'What is the DFU value of a residential kitchen sink?',
    options: ['1 DFU', '2 DFU', '3 DFU', '4 DFU'],
    correct: 1,
    explanation: 'Per 248 CMR 10.15, a residential kitchen sink has a drainage fixture unit value of 2.',
    codeRef: '248 CMR 10.15'
  },
  {
    id: 67, category: 'DWV', difficulty: 1,
    question: 'What is the minimum size of a soil stack that receives discharge from a water closet?',
    options: ['2 inch', '3 inch', '4 inch', '6 inch'],
    correct: 1,
    explanation: 'A stack receiving discharge from a water closet must be at least 3 inches — the same minimum as any drain serving a water closet.',
    codeRef: '248 CMR 10.15'
  },
  {
    id: 68, category: 'DWV', difficulty: 2,
    question: 'A sanitary tee IS permitted when changing direction of flow from:',
    options: ['Horizontal to horizontal', 'Vertical to horizontal', 'Horizontal to vertical', 'None of these'],
    correct: 2,
    explanation: 'A sanitary tee may be used to change direction from horizontal to vertical. It is prohibited for horizontal-to-horizontal and vertical-to-horizontal changes.',
    codeRef: '248 CMR 10.15'
  },
  {
    id: 69, category: 'DWV', difficulty: 2,
    question: 'Waste from commercial food-handling equipment (e.g., a prep sink) must discharge to the drainage system:',
    options: ['Directly, with a trap', 'Indirectly, through an air gap or air break', 'Through a garbage grinder', 'Directly to the building sewer'],
    correct: 1,
    explanation: 'Commercial food-handling fixtures must discharge indirectly — through an air gap or air break to a properly trapped receptor — to protect food and equipment from sewage backup.',
    codeRef: '248 CMR 10.12'
  },
  {
    id: 70, category: 'DWV', difficulty: 2,
    question: 'A cleanout is required at what location on every drainage stack?',
    options: ['The top of the stack', 'The base of the stack', 'Every branch interval', 'Only at the roof'],
    correct: 1,
    explanation: 'A cleanout is required at or near the base of each drainage stack to allow rodding of the horizontal drain.',
    codeRef: '248 CMR 10.08'
  },
  {
    id: 71, category: 'DWV', difficulty: 2,
    question: 'A floor drain trap subject to evaporation (infrequent use) must be protected by:',
    options: ['A deeper trap seal', 'A trap seal primer or equivalent means', 'A backwater valve', 'A cleanout'],
    correct: 1,
    explanation: 'Traps subject to loss of seal by evaporation must be protected — typically with a trap seal primer valve that periodically replenishes the water seal.',
    codeRef: '248 CMR 10.08'
  },
  {
    id: 72, category: 'DWV', difficulty: 2,
    question: 'The discharge pipe from a sewage ejector (sump pump) must be equipped with:',
    options: ['A union only', 'A check valve and a full-open shutoff valve', 'A trap', 'A vacuum breaker'],
    correct: 1,
    explanation: 'Sewage ejector discharge piping requires a check valve to prevent backflow into the basin and an accessible full-open valve for service.',
    codeRef: '248 CMR 10.15'
  },
  {
    id: 73, category: 'DWV', difficulty: 3,
    question: 'A commercial food waste grinder must discharge:',
    options: ['Through the grease interceptor', 'Directly to the drainage system, bypassing the grease interceptor', 'To a septic tank only', 'Through a sand interceptor'],
    correct: 1,
    explanation: 'Food waste grinders shall NOT discharge through a grease interceptor — ground solids would quickly clog it. They connect separately to the drainage system.',
    codeRef: '248 CMR 10.09'
  },
  {
    id: 74, category: 'DWV', difficulty: 3,
    question: 'Which fitting is appropriate for joining a fixture drain to a horizontal branch (horizontal-to-horizontal)?',
    options: ['Sanitary tee', 'Wye or combination wye and 1/8 bend', 'Double sanitary tee', 'Vent tee'],
    correct: 1,
    explanation: 'Horizontal-to-horizontal drainage connections require long-pattern, flow-directing fittings such as a wye or a combination wye and 1/8 bend. Sanitary tees are prohibited in that orientation.',
    codeRef: '248 CMR 10.15'
  },

  // === VENTING ===
  {
    id: 75, category: 'VENTING', difficulty: 2,
    question: 'A vent terminal located within 10 feet horizontally of a window that opens must terminate at least:',
    options: ['1 foot above the window', '2 feet above the window', '4 feet above the window', 'At roof level'],
    correct: 1,
    explanation: 'A vent terminal within 10 feet horizontally of any door, window, or air intake must extend at least 2 feet above the top of that opening to keep sewer gas out of the building.',
    codeRef: '248 CMR 10.16'
  },
  {
    id: 76, category: 'VENTING', difficulty: 2,
    question: 'To prevent frost closure in Massachusetts, a vent extending through the roof must be at least:',
    options: ['1-1/2 inches', '2 inches', '3 inches', '4 inches'],
    correct: 2,
    explanation: 'In cold climates like Massachusetts, roof vent terminals must be at least 3 inches in diameter; any size increase must be made at least 1 foot below the roof.',
    codeRef: '248 CMR 10.16'
  },
  {
    id: 77, category: 'VENTING', difficulty: 1,
    question: 'Two fixtures on the same floor level connecting at the same stack fitting may share a single vent. This is called a:',
    options: ['Wet vent', 'Common vent', 'Circuit vent', 'Relief vent'],
    correct: 1,
    explanation: 'A common vent serves two fixtures that connect at the same level — for example, back-to-back lavatories venting through one pipe.',
    codeRef: '248 CMR 10.16'
  },
  {
    id: 78, category: 'VENTING', difficulty: 3,
    question: 'A relief vent is required on soil/waste stacks having more than how many branch intervals?',
    options: ['5', '10', '15', '20'],
    correct: 1,
    explanation: 'Stacks of more than 10 branch intervals require a relief vent at each tenth interval, installed from the top down, to relieve pressure fluctuations.',
    codeRef: '248 CMR 10.16'
  },
  {
    id: 79, category: 'VENTING', difficulty: 2,
    question: 'A dry vent must take off from a horizontal drain:',
    options: ['Horizontally from the side', 'From the bottom', 'Vertically from above the drain centerline', 'At any orientation'],
    correct: 2,
    explanation: 'Dry vents must rise vertically from above the centerline of the horizontal drain so they cannot be blocked by waste flow.',
    codeRef: '248 CMR 10.16'
  },
  {
    id: 80, category: 'VENTING', difficulty: 1,
    question: 'All vent piping must be graded so that:',
    options: ['It holds water for a seal', 'It drains back to the drainage pipe by gravity', 'It slopes toward the roof', 'Grade does not matter for vents'],
    correct: 1,
    explanation: 'Vent piping must be installed without sags and graded to drain condensation back to the drainage system by gravity.',
    codeRef: '248 CMR 10.16'
  },
  {
    id: 81, category: 'VENTING', difficulty: 3,
    question: 'A circuit vent may serve a maximum of how many fixtures on a horizontal branch?',
    options: ['2', '4', '8', '12'],
    correct: 2,
    explanation: 'A circuit vent may serve up to 8 fixtures connected in battery on a horizontal branch, with the vent connecting between the two most upstream fixtures.',
    codeRef: '248 CMR 10.16'
  },

  // === WATER DISTRIBUTION ===
  {
    id: 82, category: 'WATER', difficulty: 2,
    question: 'What is the minimum horizontal separation between a water service pipe and a building sewer in the same trench area?',
    options: ['2 feet', '5 feet', '10 feet', '25 feet'],
    correct: 2,
    explanation: 'Water service and building sewer generally require 10 feet of horizontal separation, unless the water service is installed on a shelf above the sewer as permitted.',
    codeRef: '248 CMR 10.14'
  },
  {
    id: 83, category: 'WATER', difficulty: 1,
    question: 'Water supply fixture units (WSFU) are used to determine:',
    options: ['Drain pipe slope', 'Water distribution pipe sizing', 'Vent stack height', 'Trap seal depth'],
    correct: 1,
    explanation: 'WSFU values assign a demand load to each fixture; the total is used with sizing tables to size the water service and distribution piping.',
    codeRef: '248 CMR 10.14'
  },
  {
    id: 84, category: 'WATER', difficulty: 1,
    question: 'A shutoff valve is required on the cold water supply:',
    options: ['Only at the meter', 'At or near the inlet to each water heater', 'Only for gas water heaters', 'Nowhere — valves are optional'],
    correct: 1,
    explanation: 'An accessible full-open shutoff valve is required on the cold water supply at or near each water heater so it can be serviced without shutting down the building.',
    codeRef: '248 CMR 10.14'
  },
  {
    id: 85, category: 'WATER', difficulty: 2,
    question: 'The discharge pipe from a water heater T&P relief valve must:',
    options: ['Be reduced to 1/2 inch', 'Terminate with a threaded end', 'Be full size and terminate without threads near the floor', 'Connect directly to the drain'],
    correct: 2,
    explanation: 'The T&P discharge must be full size of the valve outlet, run to a safe point of discharge near the floor, and must not be threaded, capped, or directly connected to the drainage system.',
    codeRef: '248 CMR 10.14'
  },
  {
    id: 86, category: 'WATER', difficulty: 2,
    question: 'A temperature and pressure (T&P) relief valve is set to open at:',
    options: ['120°F / 80 psi', '180°F / 100 psi', '210°F / 150 psi', '250°F / 200 psi'],
    correct: 2,
    explanation: 'Standard T&P relief valves open at 210°F or 150 psi, whichever occurs first, to protect the tank from explosion.',
    codeRef: '248 CMR 10.14'
  },
  {
    id: 87, category: 'WATER', difficulty: 2,
    question: 'Individual shower control valves must be pressure-balancing or thermostatic type with a maximum setting of:',
    options: ['102°F', '112°F', '120°F', '140°F'],
    correct: 1,
    explanation: 'Shower valves must be pressure-balance or thermostatic mixing type, limited to a maximum outlet temperature of 112°F to prevent scalding.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 88, category: 'WATER', difficulty: 1,
    question: 'An exterior hose bibb (sillcock) must be protected against backflow by:',
    options: ['A check valve', 'A vacuum breaker', 'An RPZ assembly', 'Nothing is required'],
    correct: 1,
    explanation: 'Hose connections require an approved vacuum breaker (integral or attached) because a submerged hose is a direct cross-connection.',
    codeRef: '248 CMR 10.14'
  },

  // === FIXTURES ===
  {
    id: 89, category: 'FIXTURES', difficulty: 1,
    question: 'Which trap type is prohibited?',
    options: ['P-trap', 'Deep seal P-trap', 'S-trap', 'Integral water closet trap'],
    correct: 2,
    explanation: 'S-traps are prohibited because they are prone to self-siphoning, which destroys the trap seal.',
    codeRef: '248 CMR 10.08'
  },
  {
    id: 90, category: 'FIXTURES', difficulty: 2,
    question: 'The minimum clearance from the centerline of a water closet to any side wall or partition is:',
    options: ['12 inches', '15 inches', '18 inches', '21 inches'],
    correct: 1,
    explanation: 'A water closet must be set at least 15 inches from its centerline to any side wall, partition, or adjacent fixture.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 91, category: 'FIXTURES', difficulty: 2,
    question: 'A fixture overflow (such as on a lavatory) must connect to the drainage system:',
    options: ['On the sewer side of the trap', 'On the inlet (fixture) side of the trap', 'To a separate drain', 'To the vent'],
    correct: 1,
    explanation: 'Overflows must discharge on the inlet side of the fixture trap so the overflow passage is protected by the same trap seal.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 92, category: 'FIXTURES', difficulty: 1,
    question: 'What is the minimum trap and drain size for a clothes washer standpipe?',
    options: ['1-1/4 inch', '1-1/2 inch', '2 inch', '3 inch'],
    correct: 2,
    explanation: 'A clothes washer standpipe requires a minimum 2-inch trap and drain to handle the pump discharge rate.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 93, category: 'FIXTURES', difficulty: 2,
    question: 'What is the DFU value of a drinking fountain?',
    options: ['1/2 DFU', '1 DFU', '2 DFU', '3 DFU'],
    correct: 0,
    explanation: 'Per 248 CMR 10.15, a drinking fountain has a drainage fixture unit value of 1/2 — the lowest of any common fixture.',
    codeRef: '248 CMR 10.15'
  },
  {
    id: 94, category: 'FIXTURES', difficulty: 2,
    question: 'Fixtures with concealed slip-joint connections require:',
    options: ['No special provision', 'An access panel or utility space for inspection', 'Soldered joints instead', 'A cleanout at the fixture'],
    correct: 1,
    explanation: 'Slip joints in concealed locations must be accessible — an access panel or utility space is required so the connections can be inspected and repaired.',
    codeRef: '248 CMR 10.07'
  },

  // === SIZING ===
  {
    id: 95, category: 'SIZING', difficulty: 2,
    question: 'An individual vent must be at least one-half the diameter of the drain served, but never smaller than:',
    options: ['1 inch', '1-1/4 inches', '1-1/2 inches', '2 inches'],
    correct: 1,
    explanation: 'Vents must be at least half the diameter of the drain they serve and in no case smaller than 1-1/4 inches.',
    codeRef: '248 CMR 10.16'
  },
  {
    id: 96, category: 'SIZING', difficulty: 2,
    question: 'What is the maximum trap arm length for a 1-1/4 inch trap?',
    options: ['2 feet 6 inches', '3 feet 6 inches', '5 feet', '6 feet'],
    correct: 1,
    explanation: 'Per the trap-to-vent distance table, a 1-1/4 inch trap arm may not exceed 3 feet 6 inches in developed length.',
    codeRef: '248 CMR 10.16'
  },
  {
    id: 97, category: 'SIZING', difficulty: 3,
    question: 'What is the maximum trap arm length for a 3-inch trap?',
    options: ['6 feet', '8 feet', '10 feet', '12 feet'],
    correct: 3,
    explanation: 'Per the trap-to-vent distance table, a 3-inch trap arm may extend up to 12 feet — following the progression 1-1/2" = 5 ft, 2" = 8 ft, 3" = 12 ft.',
    codeRef: '248 CMR 10.16'
  },
  {
    id: 98, category: 'SIZING', difficulty: 1,
    question: 'A building drain is sized based on:',
    options: ['Number of stories', 'Total DFU load and pipe slope', 'Number of vents', 'Water pressure'],
    correct: 1,
    explanation: 'Building drains are sized from the total drainage fixture unit load and the slope of the pipe, using the sizing tables.',
    codeRef: '248 CMR 10.15'
  },
  {
    id: 99, category: 'SIZING', difficulty: 3,
    question: 'What is the maximum number of water closets permitted on a 3-inch horizontal fixture branch?',
    options: ['1', '2', '3', '4'],
    correct: 1,
    explanation: 'A 3-inch horizontal branch is limited to 2 water closets; more than that requires a 4-inch branch.',
    codeRef: '248 CMR 10.15'
  },
  {
    id: 100, category: 'SIZING', difficulty: 3,
    question: 'When the developed length of a vent exceeds 40 feet, the vent must be:',
    options: ['Insulated', 'Increased one pipe size for its entire length', 'Replaced with a wet vent', 'Fitted with a cleanout'],
    correct: 1,
    explanation: 'Vents whose developed length exceeds 40 feet must be increased one nominal size for their entire developed length.',
    codeRef: '248 CMR 10.16'
  },

  // === GAS PIPING ===
  {
    id: 101, category: 'GAS', difficulty: 1,
    question: 'Gas pipe sizing is based on all of the following EXCEPT:',
    options: ['Total BTU demand', 'Length of piping run', 'Allowable pressure drop', 'Color of the pipe'],
    correct: 3,
    explanation: 'Gas piping is sized from the connected BTU load, the longest run length, the allowable pressure drop, and the specific gravity of the gas.',
    codeRef: '248 CMR 4.00'
  },
  {
    id: 102, category: 'GAS', difficulty: 2,
    question: 'CSST (corrugated stainless steel tubing) gas piping systems must be:',
    options: ['Painted yellow', 'Electrically bonded to the grounding system', 'Sleeved in PVC', 'Limited to outdoor use'],
    correct: 1,
    explanation: 'CSST systems must be bonded to the electrical grounding system to reduce the risk of damage from lightning-induced arcing.',
    codeRef: '248 CMR 4.00'
  },
  {
    id: 103, category: 'GAS', difficulty: 2,
    question: 'Gas piping passing through a masonry foundation wall must be:',
    options: ['Wrapped in tape', 'Installed in a protective sleeve', 'Welded at the wall', 'Painted with primer'],
    correct: 1,
    explanation: 'Piping through foundation or masonry walls must pass through a protective sleeve to prevent damage from settlement and corrosion.',
    codeRef: '248 CMR 4.00'
  },
  {
    id: 104, category: 'GAS', difficulty: 2,
    question: 'Gas piping is prohibited from being installed in:',
    options: ['Attics', 'Air ducts, chimneys, and elevator shafts', 'Basements', 'Exterior walls'],
    correct: 1,
    explanation: 'Gas piping may never run through air ducts, chimneys, gas vents, elevator shafts, or similar spaces where a leak would spread gas through the building.',
    codeRef: '248 CMR 4.00'
  },
  {
    id: 105, category: 'GAS', difficulty: 2,
    question: 'A listed flexible appliance connector for a gas range may not exceed:',
    options: ['3 feet', '6 feet', '10 feet', '15 feet'],
    correct: 1,
    explanation: 'Flexible gas connectors for ranges and dryers are limited to 6 feet in length and may not pass through walls, floors, or partitions.',
    codeRef: '248 CMR 4.00'
  },
  {
    id: 106, category: 'GAS', difficulty: 1,
    question: 'LP (propane) gas differs from natural gas in that LP gas is:',
    options: ['Lighter than air', 'Heavier than air', 'Odorless and left unodorized', 'Lower in BTU content'],
    correct: 1,
    explanation: 'LP gas is heavier than air and pools in low areas — a key safety difference from natural gas, which rises. LP also has a higher BTU content per cubic foot.',
    codeRef: '248 CMR 4.00'
  },

  // === BACKFLOW ===
  {
    id: 107, category: 'BACKFLOW', difficulty: 2,
    question: 'A frost-proof hose bibb vacuum breaker must be:',
    options: ['Removable for winter', 'Permanently attached (non-removable) once installed', 'Tested annually', 'Installed indoors only'],
    correct: 1,
    explanation: 'Hose connection vacuum breakers are designed to become non-removable once installed (breakaway set screw) so the protection cannot be defeated.',
    codeRef: '248 CMR 10.14'
  },
  {
    id: 108, category: 'BACKFLOW', difficulty: 2,
    question: 'A double check valve assembly (DCVA) provides protection against:',
    options: ['High-hazard cross-connections', 'Low-hazard (pollutant) cross-connections only', 'Thermal expansion', 'Water hammer'],
    correct: 1,
    explanation: 'A DCVA is approved only for low-hazard (pollutant) connections. High-hazard (contaminant) connections require an RPZ or air gap.',
    codeRef: '248 CMR 10.14'
  },
  {
    id: 109, category: 'BACKFLOW', difficulty: 2,
    question: 'A lawn irrigation system connected to potable water requires, at minimum:',
    options: ['No protection', 'An approved backflow preventer (e.g., pressure vacuum breaker)', 'A check valve only', 'A water meter'],
    correct: 1,
    explanation: 'Irrigation systems are cross-connections and require an approved backflow assembly — commonly a pressure vacuum breaker, or an RPZ where chemicals are injected.',
    codeRef: '248 CMR 10.14'
  },

  // === MATERIALS ===
  {
    id: 110, category: 'MATERIALS', difficulty: 2,
    question: 'Before solvent-cementing PVC pipe and fittings, you must apply:',
    options: ['Nothing — cement only', 'An approved primer', 'Pipe dope', 'Flux'],
    correct: 1,
    explanation: 'PVC joints require an approved primer before solvent cement to soften the surfaces for proper fusion. (ABS, by contrast, is cemented without primer.)',
    codeRef: '248 CMR 10.07'
  },
  {
    id: 111, category: 'MATERIALS', difficulty: 1,
    question: 'When joining copper tubing to galvanized steel pipe, you must use:',
    options: ['A standard coupling', 'A dielectric union or dielectric fitting', 'A soldered joint', 'A compression fitting'],
    correct: 1,
    explanation: 'Dissimilar metals like copper and galvanized steel must be joined with a dielectric fitting to prevent galvanic corrosion.',
    codeRef: '248 CMR 10.07'
  },
  {
    id: 112, category: 'MATERIALS', difficulty: 1,
    question: 'No-hub cast iron pipe is joined using:',
    options: ['Lead and oakum', 'Shielded (no-hub) couplings', 'Solvent cement', 'Threaded fittings'],
    correct: 1,
    explanation: 'No-hub cast iron is joined with shielded couplings — a neoprene sleeve with a stainless steel shield and clamps. Lead and oakum is used on hub-and-spigot pipe.',
    codeRef: '248 CMR 10.07'
  },

  // === GENERAL ===
  {
    id: 113, category: 'GENERAL', difficulty: 1,
    question: 'The maximum flush volume for a new water closet is:',
    options: ['1.0 gallon', '1.6 gallons', '3.5 gallons', '5.0 gallons'],
    correct: 1,
    explanation: 'Federal and state water-conservation standards limit new water closets to a maximum of 1.6 gallons per flush.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 114, category: 'GENERAL', difficulty: 2,
    question: 'Used (secondhand) plumbing fixtures and materials may be reinstalled:',
    options: ['Freely, with no restrictions', 'Only if approved and in good, sanitary working condition', 'Never under any circumstance', 'Only in the same building'],
    correct: 1,
    explanation: 'Reused materials and fixtures must be approved and restored to good, sanitary working condition before reinstallation.',
    codeRef: '248 CMR 10.05'
  },

  // === PERMITS & INSPECTIONS ===
  {
    id: 115, category: 'PERMITS', difficulty: 1,
    question: 'Before a new plumbing system may be put into use, it must:',
    options: ['Sit idle for 24 hours', 'Pass a final inspection by the inspector of plumbing', 'Be photographed for records', 'Be disinfected twice'],
    correct: 1,
    explanation: 'A final inspection and approval by the local inspector of plumbing is required before the system is placed in service.',
    codeRef: '248 CMR 2.00'
  },

  // === BATCH 3 (ids 116–165) ===
  // === DWV ===
  {
    id: 116, category: 'DWV', difficulty: 2,
    question: 'What is the difference between an air gap and an air break in indirect waste piping?',
    options: ['They are the same thing', 'An air gap terminates above the flood rim; an air break terminates below the rim but above the trap seal', 'An air break is only for water supply', 'An air gap is only for gas piping'],
    correct: 1,
    explanation: 'An air gap ends above the receptor flood level rim (full physical separation). An air break ends below the rim but above the trap weir — protecting against backflow but not rim flooding.',
    codeRef: '248 CMR 10.12'
  },
  {
    id: 117, category: 'DWV', difficulty: 2,
    question: 'A backwater valve is required when:',
    options: ['Every building connects to a public sewer', 'Fixtures are located below the elevation of the next upstream manhole cover', 'The building has a basement', 'A sump pump is installed'],
    correct: 1,
    explanation: 'Fixtures with flood rims below the next upstream manhole cover elevation must be protected by a backwater valve, since the public sewer can back up into them.',
    codeRef: '248 CMR 10.15'
  },
  {
    id: 118, category: 'DWV', difficulty: 1,
    question: 'What is the minimum size of a floor drain?',
    options: ['1-1/2 inch', '2 inch', '3 inch', '4 inch'],
    correct: 1,
    explanation: 'Floor drains must be at least 2 inches, with a minimum 2-inch trap.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 119, category: 'DWV', difficulty: 3,
    question: 'An offset in a drainage stack is still considered vertical when the angle from vertical does not exceed:',
    options: ['22.5 degrees', '45 degrees', '60 degrees', '90 degrees'],
    correct: 1,
    explanation: 'Piping at 45 degrees or less from vertical is treated as vertical; beyond 45 degrees it is treated as horizontal and must be sized and sloped accordingly.',
    codeRef: '248 CMR 10.15'
  },
  {
    id: 120, category: 'DWV', difficulty: 1,
    question: 'A grease interceptor (grease trap) is required for:',
    options: ['Residential kitchen sinks', 'Commercial kitchen fixtures that discharge grease-laden waste', 'All floor drains', 'Laundry fixtures'],
    correct: 1,
    explanation: 'Commercial kitchen fixtures (pot sinks, pre-rinse sinks, etc.) that discharge grease-laden waste must drain through a properly sized grease interceptor.',
    codeRef: '248 CMR 10.09'
  },
  {
    id: 121, category: 'DWV', difficulty: 2,
    question: 'Corrosive chemical or laboratory waste must be:',
    options: ['Discharged to the sanitary system directly', 'Piped in an approved corrosion-resistant system and neutralized before discharge', 'Poured into a floor drain', 'Stored on site permanently'],
    correct: 1,
    explanation: 'Chemical/laboratory waste requires approved acid-resistant piping and treatment (dilution/neutralization) before it may enter the sanitary drainage system.',
    codeRef: '248 CMR 10.13'
  },
  {
    id: 122, category: 'DWV', difficulty: 2,
    question: 'What is the maximum DFU load on a 1-1/2 inch fixture branch?',
    options: ['1 DFU', '3 DFU', '6 DFU', '12 DFU'],
    correct: 1,
    explanation: 'A 1-1/2 inch branch is limited to 3 drainage fixture units.',
    codeRef: '248 CMR 10.15'
  },

  // === WATER DISTRIBUTION ===
  {
    id: 123, category: 'WATER', difficulty: 2,
    question: 'Horizontal copper water tubing (1 inch and smaller) must be supported at intervals not exceeding:',
    options: ['4 feet', '6 feet', '10 feet', '12 feet'],
    correct: 1,
    explanation: 'Horizontal copper tube in smaller sizes is supported at maximum 6-foot intervals to prevent sagging.',
    codeRef: '248 CMR 10.11'
  },
  {
    id: 124, category: 'WATER', difficulty: 1,
    question: 'When facing a faucet or combination fitting, the hot water supply must be on the:',
    options: ['Right side', 'Left side', 'Top', 'Either side'],
    correct: 1,
    explanation: 'Hot water must always be supplied to the left side of a fitting as the user faces it — a fundamental anti-scald convention.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 125, category: 'WATER', difficulty: 3,
    question: 'A bottom-fed storage water heater must be equipped with:',
    options: ['A second T&P valve', 'A vacuum relief valve', 'A pressure reducing valve', 'A backwater valve'],
    correct: 1,
    explanation: 'Bottom-fed water heaters require a vacuum relief valve so a supply-side siphon cannot drain the tank and burn out the heater (or collapse the tank).',
    codeRef: '248 CMR 10.14'
  },
  {
    id: 126, category: 'WATER', difficulty: 2,
    question: 'Tempered water delivered to public handwashing lavatories must not exceed:',
    options: ['85°F', '110°F', '120°F', '140°F'],
    correct: 1,
    explanation: 'Public handwashing facilities are limited to tempered water at a maximum of 110°F, typically through a limiting device or mixing valve.',
    codeRef: '248 CMR 10.14'
  },
  {
    id: 127, category: 'WATER', difficulty: 1,
    question: 'An individual shutoff (stop) valve is required:',
    options: ['Only on hot water lines', 'At each fixture supply', 'Only at the water heater', 'Only outside the building'],
    correct: 1,
    explanation: 'Each fixture supply requires an accessible stop valve so the fixture can be serviced without shutting off water to other fixtures.',
    codeRef: '248 CMR 10.14'
  },
  {
    id: 128, category: 'WATER', difficulty: 2,
    question: 'Water distribution piping must be protected from freezing. Piping in an exterior wall must be:',
    options: ['Type K copper only', 'Insulated or otherwise protected on the heated side of the insulation', 'Wrapped in tape', 'Made of PEX only'],
    correct: 1,
    explanation: 'Water piping in exterior walls must be placed on the heated side of the wall insulation or otherwise protected against freezing.',
    codeRef: '248 CMR 10.14'
  },

  // === VENTING ===
  {
    id: 129, category: 'VENTING', difficulty: 1,
    question: 'A stack vent is defined as:',
    options: ['Any vertical vent', 'The extension of a soil or waste stack above the highest horizontal drain connection', 'A vent that serves two stacks', 'The vent for a sump pit'],
    correct: 1,
    explanation: 'The stack vent is the dry extension of a soil/waste stack above the highest horizontal branch connected to that stack.',
    codeRef: '248 CMR 10.16'
  },
  {
    id: 130, category: 'VENTING', difficulty: 3,
    question: 'A vent connection must be at least how far from the trap weir (to avoid crown venting)?',
    options: ['One pipe diameter', 'Two pipe diameters', 'Four pipe diameters', 'Six pipe diameters'],
    correct: 1,
    explanation: 'The vent may not connect within two pipe diameters of the trap weir — a crown vent clogs with waste and fails.',
    codeRef: '248 CMR 10.16'
  },
  {
    id: 131, category: 'VENTING', difficulty: 2,
    question: 'Air admittance valves (AAVs) in Massachusetts are:',
    options: ['Permitted anywhere a vent is required', 'Generally prohibited except where specifically approved by the Board', 'Required on island sinks', 'Only allowed outdoors'],
    correct: 1,
    explanation: 'Massachusetts generally does not permit AAVs in place of conventional venting except with specific Board approval — a notable difference from the IPC.',
    codeRef: '248 CMR 10.16'
  },
  {
    id: 132, category: 'VENTING', difficulty: 3,
    question: 'A branch interval on a stack is a length of stack:',
    options: ['Exactly one story high', 'At least 8 feet, within which horizontal branches connect', 'Between two cleanouts', 'Between the base and the roof'],
    correct: 1,
    explanation: 'A branch interval is a stack section at least 8 feet high within which the horizontal branches of one story connect — used for relief-vent and sizing rules.',
    codeRef: '248 CMR 10.16'
  },
  {
    id: 133, category: 'VENTING', difficulty: 2,
    question: 'When two or more vents are combined before extending through the roof, the combined vent is sized based on:',
    options: ['The largest single vent only', 'The total fixture units served by all connected vents', 'Always 4 inches', 'The number of stories'],
    correct: 1,
    explanation: 'A combined vent header must be sized for the total drainage fixture unit load of all the vents it serves.',
    codeRef: '248 CMR 10.16'
  },

  // === SIZING ===
  {
    id: 134, category: 'SIZING', difficulty: 2,
    question: 'What is the DFU value of a complete bathroom group (WC 1.6 gpf, lavatory, and tub/shower)?',
    options: ['4 DFU', '6 DFU', '8 DFU', '10 DFU'],
    correct: 1,
    explanation: 'A bathroom group with a 1.6 gpf water closet is assigned 6 DFU when sized as a group.',
    codeRef: '248 CMR 10.15'
  },
  {
    id: 135, category: 'SIZING', difficulty: 2,
    question: 'Storm (roof) drainage piping is sized based on:',
    options: ['DFU load', 'Roof area and local rainfall rate', 'Number of downspouts', 'Building height'],
    correct: 1,
    explanation: 'Storm drains are sized from the horizontal projected roof area and the design rainfall rate — never with DFU values, which are for sanitary loads.',
    codeRef: '248 CMR 10.17'
  },
  {
    id: 136, category: 'SIZING', difficulty: 3,
    question: 'A vent stack (parallel dry vent) is required for drainage stacks of:',
    options: ['2 or more branch intervals', '5 or more branch intervals', '10 or more branch intervals', 'Any height'],
    correct: 1,
    explanation: 'Drainage stacks of 5 or more branch intervals require a parallel vent stack to relieve pressure at the base.',
    codeRef: '248 CMR 10.16'
  },
  {
    id: 137, category: 'SIZING', difficulty: 1,
    question: 'What is the minimum drain size for a fixture with a 1-1/2 inch trap?',
    options: ['1-1/4 inch', '1-1/2 inch', '2 inch', 'Any size'],
    correct: 1,
    explanation: 'The fixture drain may never be smaller than the trap it serves — a 1-1/2 inch trap requires at least a 1-1/2 inch drain.',
    codeRef: '248 CMR 10.15'
  },
  {
    id: 138, category: 'SIZING', difficulty: 2,
    question: 'What is the minimum slope for a 4-inch building sewer?',
    options: ['1/16 inch per foot', '1/8 inch per foot', '1/4 inch per foot', '1/2 inch per foot'],
    correct: 1,
    explanation: 'Building sewers 4 inches and larger require a minimum slope of 1/8 inch per foot, matching the rule for building drains of that size.',
    codeRef: '248 CMR 10.15'
  },

  // === FIXTURES ===
  {
    id: 139, category: 'FIXTURES', difficulty: 2,
    question: 'What is the minimum trap size for a wall-hung urinal?',
    options: ['1-1/4 inch', '1-1/2 inch', '2 inch', '3 inch'],
    correct: 2,
    explanation: 'Urinals require a minimum 2-inch trap (integral or external).',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 140, category: 'FIXTURES', difficulty: 2,
    question: 'In Massachusetts, a domestic dishwasher drain connection requires:',
    options: ['A high loop only', 'A listed air gap fitting mounted above the sink flood rim', 'Direct connection to the disposal', 'No special protection'],
    correct: 1,
    explanation: 'Massachusetts requires a listed air gap fitting (mounted at the sink deck, above the flood rim) on dishwasher drains — a high loop alone is not acceptable.',
    codeRef: '248 CMR 10.12'
  },
  {
    id: 141, category: 'FIXTURES', difficulty: 1,
    question: 'Where a fixture meets a wall or floor, the joint must be:',
    options: ['Left open for ventilation', 'Sealed watertight (caulked/gasketed)', 'Covered with trim only', 'Grouted with concrete'],
    correct: 1,
    explanation: 'Fixture connections at walls and floors must be sealed watertight to prevent water damage and harborage of vermin.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 142, category: 'FIXTURES', difficulty: 1,
    question: 'What is the DFU value of a laundry tray (laundry sink)?',
    options: ['1 DFU', '2 DFU', '3 DFU', '4 DFU'],
    correct: 1,
    explanation: 'A laundry tray is assigned 2 drainage fixture units.',
    codeRef: '248 CMR 10.15'
  },
  {
    id: 143, category: 'FIXTURES', difficulty: 2,
    question: 'Water closets for public use must have seats that are:',
    options: ['Round and closed-front', 'Elongated with open-front seats', 'Padded', 'Any style'],
    correct: 1,
    explanation: 'Public-use water closets require elongated bowls with open-front seats for sanitation.',
    codeRef: '248 CMR 10.10'
  },
  {
    id: 144, category: 'FIXTURES', difficulty: 3,
    question: 'A trap may serve more than one fixture only when:',
    options: ['Never — one trap per fixture, no exceptions', 'Specifically permitted, such as a two- or three-compartment sink within allowed spacing', 'The fixtures are on different floors', 'A larger trap is used'],
    correct: 1,
    explanation: 'One trap per fixture is the rule, with narrow exceptions — e.g., a multi-compartment sink may share one trap when the compartments are adjacent and within the allowed distance.',
    codeRef: '248 CMR 10.08'
  },

  // === GAS PIPING ===
  {
    id: 145, category: 'GAS', difficulty: 2,
    question: 'A gas-fired appliance installed in a bedroom or bathroom must be:',
    options: ['Any type', 'Direct-vent (sealed combustion) type', 'Under 50,000 BTU', 'Pilot-free'],
    correct: 1,
    explanation: 'Fuel-fired appliances in sleeping rooms and bathrooms must be direct-vent/sealed-combustion so combustion air and flue gases never mix with room air.',
    codeRef: '248 CMR 4.00'
  },
  {
    id: 146, category: 'GAS', difficulty: 2,
    question: 'A confined space containing gas appliances requires combustion air openings:',
    options: ['One opening at the floor', 'Two openings — one near the top and one near the bottom of the space', 'No openings if the door has a louver', 'One opening at the ceiling only'],
    correct: 1,
    explanation: 'Confined spaces need two permanent combustion-air openings, one within 12 inches of the top and one within 12 inches of the bottom, sized to the appliance input.',
    codeRef: '248 CMR 4.00'
  },
  {
    id: 147, category: 'GAS', difficulty: 2,
    question: 'The vent (breather) from a gas line pressure regulator must terminate:',
    options: ['Inside the mechanical room', 'Outdoors, protected from blockage and away from openings', 'Into the flue', 'It does not need a vent'],
    correct: 1,
    explanation: 'Line regulator vents must run independently to the outdoors, terminate away from building openings, and be protected against insects and blockage.',
    codeRef: '248 CMR 4.00'
  },
  {
    id: 148, category: 'GAS', difficulty: 2,
    question: 'What is the minimum burial depth for underground gas piping?',
    options: ['6 inches', '12 inches', '24 inches', '36 inches'],
    correct: 1,
    explanation: 'Underground gas piping requires at least 12 inches of cover (deeper where subject to vehicular traffic).',
    codeRef: '248 CMR 4.00'
  },
  {
    id: 149, category: 'GAS', difficulty: 2,
    question: 'Polyethylene (PE) plastic gas piping may be installed:',
    options: ['Anywhere inside the building', 'Only underground outside the building, with tracer wire', 'In attics only', 'Above ground if painted'],
    correct: 1,
    explanation: 'PE gas pipe is for underground exterior use only, installed with a tracer wire (or other approved locating means), transitioning to metal with an approved riser before entering the building.',
    codeRef: '248 CMR 4.00'
  },
  {
    id: 150, category: 'GAS', difficulty: 1,
    question: 'The proper way to check a gas joint for leaks is:',
    options: ['A lit match', 'Soap/leak-detection solution or a gauge test', 'Listening for hissing only', 'Smelling for odorant only'],
    correct: 1,
    explanation: 'Leak checks are done with approved leak-detection solution or pressure-gauge testing — never with an open flame.',
    codeRef: '248 CMR 4.00'
  },

  // === BACKFLOW ===
  {
    id: 151, category: 'BACKFLOW', difficulty: 1,
    question: 'The two conditions that cause backflow are:',
    options: ['Heat and cold', 'Backpressure and backsiphonage', 'Corrosion and scale', 'High and low DFU'],
    correct: 1,
    explanation: 'Backflow occurs by backpressure (downstream pressure exceeds supply) or backsiphonage (negative supply pressure siphons contaminants in).',
    codeRef: '248 CMR 10.14'
  },
  {
    id: 152, category: 'BACKFLOW', difficulty: 2,
    question: 'An RPZ assembly must be installed with a minimum clearance above the floor of:',
    options: ['6 inches', '12 inches', '24 inches', '48 inches'],
    correct: 1,
    explanation: 'RPZ assemblies need at least 12 inches of clearance below the relief port so discharge is visible and the assembly is serviceable — and they may never be installed in a pit.',
    codeRef: '248 CMR 10.14'
  },
  {
    id: 153, category: 'BACKFLOW', difficulty: 1,
    question: 'A required air gap at a fixture is measured from the:',
    options: ['Faucet handle to the drain', 'Supply outlet (spout) to the flood level rim', 'Trap to the floor', 'Spout to the bottom of the basin'],
    correct: 1,
    explanation: 'The air gap is the vertical distance between the supply outlet and the flood level rim of the fixture or receptor.',
    codeRef: '248 CMR 10.14'
  },

  // === MATERIALS ===
  {
    id: 154, category: 'MATERIALS', difficulty: 2,
    question: 'Type M copper tube is:',
    options: ['Prohibited everywhere', 'The thinnest-wall standard type, generally limited to above-ground use inside buildings', 'Required underground', 'Only for gas'],
    correct: 1,
    explanation: 'Type M (red) has the thinnest wall of the standard types and is generally restricted to above-ground water distribution inside buildings.',
    codeRef: '248 CMR 10.06'
  },
  {
    id: 155, category: 'MATERIALS', difficulty: 2,
    question: 'PEX tubing connected to a water heater must:',
    options: ['Connect directly to the tank', 'Be kept at least 18 inches away, using metallic piping for the first connection', 'Be Type A only', 'Be sleeved in copper'],
    correct: 1,
    explanation: 'PEX may not connect directly to a water heater — the first 18 inches from the heater must be metallic piping per manufacturer listing.',
    codeRef: '248 CMR 10.06'
  },
  {
    id: 156, category: 'MATERIALS', difficulty: 3,
    question: 'When installing hub-and-spigot cast iron drainage pipe, the hubs face:',
    options: ['Downstream, with the flow', 'Upstream, against the flow', 'Either direction', 'Sideways at branches'],
    correct: 1,
    explanation: 'Hubs are laid facing upstream so the spigot ends point downstream with the flow, keeping the smooth interior path in the direction of drainage.',
    codeRef: '248 CMR 10.07'
  },
  {
    id: 157, category: 'MATERIALS', difficulty: 1,
    question: 'Threaded pipe joints for water piping use what thread standard?',
    options: ['Straight machine threads', 'NPT tapered pipe threads with approved sealant', 'Metric threads', 'Any thread with enough tape'],
    correct: 1,
    explanation: 'Pipe joints use tapered NPT threads made up with an approved thread sealant appropriate for the service.',
    codeRef: '248 CMR 10.07'
  },

  // === GENERAL ===
  {
    id: 158, category: 'GENERAL', difficulty: 1,
    question: 'A plumbing apprentice in Massachusetts must be:',
    options: ['At least 21 years old', 'Registered with the Board and working under licensed supervision', 'A high school graduate', 'Employed for 5 years first'],
    correct: 1,
    explanation: 'Apprentices must be registered with the Board of State Examiners of Plumbers and Gas Fitters and work under the direct supervision of a licensed plumber.',
    codeRef: '248 CMR 2.00'
  },
  {
    id: 159, category: 'GENERAL', difficulty: 2,
    question: 'Massachusetts plumbing licenses are renewed:',
    options: ['Annually with no requirements', 'Every 2 years with required continuing education', 'Every 5 years', 'Once — licenses never expire'],
    correct: 1,
    explanation: 'Licenses renew on a 2-year cycle, and licensees must complete Board-required continuing education for renewal.',
    codeRef: '248 CMR 2.00'
  },
  {
    id: 160, category: 'GENERAL', difficulty: 1,
    question: 'The scope of 248 CMR covers:',
    options: ['Electrical and plumbing work', 'Plumbing and fuel gas fitting work in Massachusetts', 'HVAC ductwork', 'Fire sprinklers only'],
    correct: 1,
    explanation: '248 CMR governs plumbing and gas fitting in the Commonwealth — installation, alteration, repair, and the licensing of those who perform the work.',
    codeRef: '248 CMR 2.00'
  },
  {
    id: 161, category: 'GENERAL', difficulty: 1,
    question: 'Which license class may operate a plumbing business and obtain permits in Massachusetts?',
    options: ['Apprentice', 'Journeyman', 'Master plumber', 'Any of these'],
    correct: 2,
    explanation: 'Only a master plumber may operate a plumbing business and pull permits; journeymen work under a master, and apprentices under direct supervision.',
    codeRef: '248 CMR 2.00'
  },

  // === MEDICAL GAS ===
  {
    id: 162, category: 'MEDICAL', difficulty: 1,
    question: 'In the U.S. color code for medical gases, oxygen outlets and piping are identified by:',
    options: ['Blue', 'Green', 'Yellow', 'Black'],
    correct: 1,
    explanation: 'Oxygen is identified by green in the U.S. medical gas color code (white is used internationally).',
    codeRef: '248 CMR 10.18'
  },
  {
    id: 163, category: 'MEDICAL', difficulty: 3,
    question: 'After installation, a medical gas system must be verified by:',
    options: ['The installing plumber', 'An independent ASSE 6030-certified verifier', 'The building owner', 'The gas supplier'],
    correct: 1,
    explanation: 'Medical gas systems require verification (cross-connection, purity, and outlet testing) by an independent ASSE 6030 verifier before use.',
    codeRef: '248 CMR 10.18'
  },

  // === PERMITS & INSPECTIONS ===
  {
    id: 164, category: 'PERMITS', difficulty: 1,
    question: 'Permitted plumbing work may be performed by:',
    options: ['Anyone the master hires', 'Licensed plumbers, and registered apprentices under supervision', 'General contractors', 'The homeowner in all cases'],
    correct: 1,
    explanation: 'Work under a plumbing permit must be performed by licensed plumbers (or registered apprentices under required supervision).',
    codeRef: '248 CMR 2.00'
  },
  {
    id: 165, category: 'PERMITS', difficulty: 2,
    question: 'A common rough-in test of the DWV system before inspection is:',
    options: ['A smoke test only', 'A water test with a minimum 10-foot head of water', 'Filling only the traps', 'No test is required'],
    correct: 1,
    explanation: 'The DWV rough-in is typically tested by filling the system with water to a minimum 10-foot head (or an approved equivalent air test) and holding without loss.',
    codeRef: '248 CMR 10.04'
  }
];

// Export for use in other modules
window.QUESTIONS = QUESTIONS;
window.CATEGORIES = CATEGORIES;
