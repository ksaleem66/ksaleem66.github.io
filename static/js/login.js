// document.getElementById('loginForm').addEventListener('submit', async (e) => {
//     e.preventDefault();
    
//     const username = document.getElementById('username').value;
//     const password = document.getElementById('password').value;
//     const errorDiv = document.getElementById('error');
    
//     // Create base64 encoded credentials
//     // Source: https://www.digitalocean.com/community/tutorials/how-to-encode-and-decode-strings-with-base64-in-javascript
//     //         https://www.freecodecamp.org/news/encode-decode-html-base64-using-javascript/
    
//     const credentials = btoa(`${username}:${password}`);
//     console.log("Credentials after converting:", credentials)
//     try {
//         const response = await fetch('https://learn.reboot01.com/api/auth/signin', {
//             method: 'POST',
//             headers: {
//                 'Authorization': `Basic ${credentials}`
//             }
//         });
        
//         if (!response.ok) {
//             throw new Error('Invalid credentials');
//         }
        
//         const data = await response.json();
//         // Store the JWT token
//         //localStorage.setItem('jwt', data.token);
//         localStorage.setItem('jwt', data);
//         // Redirect to profile page
//         window.location.href = 'profile.html';
        
//     } catch (error) {
//         errorDiv.style.display = 'block';
//         errorDiv.textContent = error.message;
//     }
// });

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('error');
    
    // Create base64 encoded credentials
    const credentials = btoa(`${username}:${password}`);
    console.log("Credentials after converting:", credentials);

    try {
        const response = await fetch('https://learn.reboot01.com/api/auth/signin', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Invalid credentials');
        }
        
        const data = await response.json();
        
        // Store the JWT token in localStorage
        localStorage.setItem('jwt', data.token || data); // Ensure the correct token is stored
        
        // Redirect to profile page
        window.location.href = 'profile.html';
        
        // Replace the history state to remove the login page from the history stack
        window.history.replaceState(null, '', 'profile.html');
        
    } catch (error) {
        errorDiv.style.display = 'block';
        errorDiv.textContent = 'Invalid username or password'; // Display a user-friendly error message
    }
});
