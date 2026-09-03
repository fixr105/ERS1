const EMPLOYEE_CODES_BY_NAME: Record<string, string> = {
  'govind pandey': 'EMPGOV',
  'anya singh': 'EMPANY',
  'syed ayan': 'EMPSYE',
  'basavaraj m': 'EMPBAS',
  'rishikesh sheelvant': 'EMPRIS',
  'sharan kris': 'EMPSHA',
  'ankitha h': 'EMPANK',
  ajay: 'EMPAJA',
  priyanka: 'EMPPRI',
  rahul: 'EMP001',
  abhiveer: 'EMPABH',
  'sagar k': 'EMPSAG',
};

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function employeeCodeForName(name: string): string {
  const key = normalizeName(name);
  if (!key) return name.trim();
  if (EMPLOYEE_CODES_BY_NAME[key]) return EMPLOYEE_CODES_BY_NAME[key];

  const match = Object.entries(EMPLOYEE_CODES_BY_NAME).find(
    ([known]) => key === known || key.startsWith(`${known} `) || known.startsWith(`${key} `),
  );
  return match?.[1] || name.trim();
}
