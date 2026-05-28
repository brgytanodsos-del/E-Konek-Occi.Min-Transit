import admin from './server/firebaseAdmin';

async function check() {
  const email = 'brgytanodsos@gmail.com';
  try {
    const user = await admin.auth().getUserByEmail(email);
    console.log('User found:', user.email);
    console.log('Custom claims:', user.customClaims);
  } catch (e) {
    console.error('Error fetching user:', e);
  }
}

check();
