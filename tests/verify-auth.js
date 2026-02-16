// using native fetch


const BASE_URL = 'http://localhost:3000/api/auth';

const runVerification = async () => {
    try {
        const testUser = {
            username: `testuser_${Date.now()}`,
            email: `test_${Date.now()}@example.com`,
            password: 'password123'
        };

        console.log('1. Registering user...');
        const registerRes = await fetch(`${BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testUser)
        });
        const registerData = await registerRes.json();
        console.log('Registration Status:', registerRes.status);
        console.log('Registration Response:', registerData);

        if (registerRes.status !== 201) return;

        console.log('\n2. Logging in...');
        const loginRes = await fetch(`${BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testUser.email, password: testUser.password })
        });
        const loginData = await loginRes.json();
        console.log('Login Status:', loginRes.status);

        if (loginRes.status !== 200) return;

        const token = loginData.token;
        console.log('Token received:', token ? 'Yes' : 'No');

        console.log('\n3. Accessing protected route...');
        const profileRes = await fetch(`${BASE_URL}/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }); // Changed from Content-Type to Authorization header
        const profileData = await profileRes.json();
        console.log('Profile Status:', profileRes.status);
        console.log('Profile Response:', profileData);

    } catch (error) {
        console.error('Verification failed:', error);
    }
};

// Check if fetch is available (Node 18+)
if (!globalThis.fetch) {
    console.log('Native fetch not found. Please run with Node 18+ or install node-fetch.');
} else {
    runVerification();
}
