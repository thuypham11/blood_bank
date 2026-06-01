import bcrypt from 'bcryptjs';

const password = 'lab123456';
const salt = await bcrypt.genSalt(12);
const hash = await bcrypt.hash(password, salt);
console.log('Hash:', hash);