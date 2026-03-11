// Massachusetts 248 CMR Plumbing Code Question Bank
// 60+ questions accurate to MA code

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
  }
];

// Export for use in other modules
window.QUESTIONS = QUESTIONS;
window.CATEGORIES = CATEGORIES;
