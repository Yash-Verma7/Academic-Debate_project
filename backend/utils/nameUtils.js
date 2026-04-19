const normalizeWhitespace = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const splitFullName = (fullName) => {
  const normalized = normalizeWhitespace(fullName);
  if (!normalized) {
    return { firstName: '', middleName: '', lastName: '' };
  }

  const parts = normalized.split(' ');

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      middleName: '',
      lastName: ''
    };
  }

  if (parts.length === 2) {
    return {
      firstName: parts[0],
      middleName: '',
      lastName: parts[1]
    };
  }

  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts[parts.length - 1]
  };
};

const composeFullName = ({ firstName, middleName, lastName }) =>
  [firstName, middleName, lastName]
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)
    .join(' ')
    .trim();

module.exports = {
  normalizeWhitespace,
  splitFullName,
  composeFullName
};
