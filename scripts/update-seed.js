const fs = require('fs');
const path = require('path');

// Read the Google doctors data
const doctorsData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'doctors-google-data.json'), 'utf-8')
);

// Read current seed file
const seedPath = path.join(__dirname, '..', 'prisma', 'seed.ts');
const seedContent = fs.readFileSync(seedPath, 'utf-8');

// Find where the doctors array starts and ends
const doctorsArrayStart = seedContent.indexOf('const doctors = [');
const doctorsArrayEnd = seedContent.indexOf(']', doctorsArrayStart) + 1;

// Generate the new doctors array
const doctorsArray = doctorsData.map(doctor => {
  return `    {
      name: '${doctor.name.replace(/'/g, "\\'")}',
      email: '${doctor.email}',
      phone: '${doctor.phone}',
      specialization: '${doctor.specialization}',
      experience: ${doctor.experience},
      location: '${doctor.location}',
      address: '${doctor.address.replace(/'/g, "\\'")}',
      latitude: ${doctor.latitude},
      longitude: ${doctor.longitude},
      city: '${doctor.city}',
      state: '${doctor.state}',
      zipCode: '${doctor.zipCode}',
      rating: ${doctor.rating.toFixed(1)},
      reviewCount: ${doctor.reviewCount},
      consultationFee: ${doctor.consultationFee},
    }`;
}).join(',\n');

const newDoctorsSection = `const doctors = [\n${doctorsArray}\n  ]`;

// Replace the doctors array in the seed file
const before = seedContent.substring(0, doctorsArrayStart);
const after = seedContent.substring(doctorsArrayEnd);
const newSeedContent = before + newDoctorsSection + after;

// Write the updated seed file
fs.writeFileSync(seedPath, newSeedContent, 'utf-8');

console.log(`✅ Updated seed.ts with ${doctorsData.length} real doctors from Google Maps!`);
console.log('📍 Locations covered:', [...new Set(doctorsData.map(d => d.city))].join(', '));
console.log('🏥 Specializations:', [...new Set(doctorsData.map(d => d.specialization))].join(', '));
console.log('\n💡 Next step: Run "npm run db:seed" to populate the database');
