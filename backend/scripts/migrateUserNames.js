const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('../config/db');
const User = require('../models/User');
const { normalizeWhitespace, splitFullName, composeFullName } = require('../utils/nameUtils');

const isMissing = (value) => !normalizeWhitespace(value);

const migrateUserNames = async () => {
  await connectDB();

  let scanned = 0;
  let updated = 0;
  let skipped = 0;

  try {
    const cursor = User.find().cursor();

    for await (const user of cursor) {
      scanned += 1;

      const currentFirstName = normalizeWhitespace(user.firstName);
      const currentMiddleName = normalizeWhitespace(user.middleName);
      const currentLastName = normalizeWhitespace(user.lastName);
      const currentName = normalizeWhitespace(user.name);

      const parsed = splitFullName(currentName);

      const nextFirstName = isMissing(currentFirstName)
        ? parsed.firstName
        : currentFirstName;

      const nextMiddleName = isMissing(currentMiddleName)
        ? parsed.middleName
        : currentMiddleName;

      const nextLastName = isMissing(currentLastName)
        ? parsed.lastName
        : currentLastName;

      const nextName = composeFullName({
        firstName: nextFirstName,
        middleName: nextMiddleName,
        lastName: nextLastName
      }) || currentName;

      const shouldUpdate =
        nextFirstName !== currentFirstName ||
        nextMiddleName !== currentMiddleName ||
        nextLastName !== currentLastName ||
        nextName !== currentName;

      if (!shouldUpdate) {
        skipped += 1;
        continue;
      }

      user.firstName = nextFirstName;
      user.middleName = nextMiddleName;
      user.lastName = nextLastName;
      user.name = nextName;
      await user.save();
      updated += 1;
    }

    console.log('User name migration completed');
    console.log(`Scanned: ${scanned}`);
    console.log(`Updated: ${updated}`);
    console.log(`Unchanged: ${skipped}`);
  } finally {
    await mongoose.connection.close();
  }
};

migrateUserNames()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
