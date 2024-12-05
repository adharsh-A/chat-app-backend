import bcrypt from 'bcryptjs';
// Replace these with your actual values
const rawPassword = 'Adharsh@princexf';
const saltRounds = 10;
const hashedPassword = bcrypt.hashSync(rawPassword, saltRounds);
console.log('Hashed Password:', hashedPassword);
//verify
const verifyPassword = bcrypt.compareSync(rawPassword, "$2a$10$Ojf2rhgUSS6S0SWQs6c9JeqwomN5CyAbYXxDqMUeKibmYpEwA6NqO");
console.log('Password Verification Result:', verifyPassword);